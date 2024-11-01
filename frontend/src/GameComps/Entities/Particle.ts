import {EntityBase, EntityClient, EntityTypes, Team} from "../../types/types";
import {massToRadius, randomUnitVector, Vector2D} from "../Utility";
import {UnitPack} from "../../types/unitTypes";
import {UnitManager} from "../UnitManager";
import {Game} from "../Game";
import {Graphics} from "pixi.js";
import {EntityID, ParticleID, ServerMessageType} from "@shared/commTypes";

interface FiringLaserAt {
    target: EntityBase;
    intensity: number;
    firingPos: Vector2D;
}

export class Particle implements EntityClient {
    vel: Vector2D;
    acc: Vector2D = Vector2D.zeros();
    leader: EntityBase | null = null;
    radius: number;
    isBoiding: boolean = true;
    isEngaging: boolean = false;
    sqFireRadius: number = 50 ** 2;
    sqEngageRadius: number = 100 ** 2;
    maxTargets: number = 1;
    engaging: EntityBase[] = [];
    firingLaserAt: FiringLaserAt[] = [];
    desiredPos: Vector2D | null = null;
    desiredSpeed: number = .75;
    desiredLeaderDist: { min: number, max: number } = {min: 50, max: 60};
    maxAcc: number = .05;
    givesIncome: number = 0;

    targetedBy: Particle[] = [];

    public entityType: EntityTypes = EntityTypes.Particle;

    particleSprite: Graphics | null = null;
    attackSprite: Graphics | null = null;
    healthSprite: Graphics | null = null;
    debugSprite: Graphics | null = null;

    protected maxHealth: number = 100;
    public health: number = this.maxHealth;

    static price: number = 100;

    constructor(
        public pos: Vector2D,
        public mass: number,
        public team: Team,
        public maxVel: number = 1,
        public color: number,
        protected scene: Game,
        public groupID: number,
        public unitInfo: UnitPack,
        public owner: EntityID,
        protected unitManager: UnitManager<Particle>,
        public id: ParticleID,
    ) {
        this.vel = randomUnitVector().scale(this.maxVel);
        this.radius = massToRadius(mass);
    }

    killSprites() {
        if (this.particleSprite) {
            this.scene.pixiRef.stage.removeChild(this.particleSprite);
            this.particleSprite.destroy();
        }
        if (this.attackSprite) {
            this.scene.pixiRef.stage.removeChild(this.attackSprite);
            this.attackSprite.destroy();
        }
        if (this.healthSprite) {
            this.scene.pixiRef.stage.removeChild(this.healthSprite);
            this.healthSprite.destroy();
        }
    }

    receiveDamage(damage: number): void {
        this.health -= damage;
        if (!this.isAlive()) {
            this.scene.broadcastDeath(this.id, EntityTypes.Particle);
        }
    }

    setGroupID(groupID: number): void {
        this.groupID = groupID;
    }

    onDeath() {
        this.unitManager.remove(this);
        this.killSprites();
    }

    setLeader(leader: EntityBase) {
        this.leader = leader;
    }

    getLeaderPosition() {
        if (this.leader === null) return null
        // return Vector2D.add(this.leader, Vector2D.ones().scale(20));
        return this.leader.pos;
    }

    calcDesiredPos() {
        if (this.engaging.length > 0) {
            // if (this.engaging[0].health <= this.health) {
            // BRAVADO
            this.desiredPos = this.engaging[0].getFiringPos(this.pos);
            // } else {
            // FEAR
            //    this.desiredPos = Vector2D.subtract(this.engaging[0].pos, this.pos).scale(-1);
            // }
        } else {
            const leaderPosition = this.getLeaderPosition();
            if (leaderPosition !== null) {
                const leaderDelta = Vector2D.subtract(leaderPosition, this.pos);
                const leaderDist = leaderDelta.magnitude();
                if (leaderDist < this.desiredLeaderDist.min) {
                    this.desiredPos = Vector2D.add(this.pos, leaderDelta.scale(-1));
                } else if (leaderDist > this.desiredLeaderDist.max) {
                    this.desiredPos = Vector2D.add(this.pos, leaderDelta.scale(1));
                } else {
                    this.desiredPos = null;
                }
            } else {
                this.desiredPos = null;
            }
        }
    }

    getFiringPos(from: Vector2D): Vector2D {
        return this.pos;
    }

    approachDesiredVel() {
        this.vel.scale(1 + this.desiredSpeed - this.vel.magnitude());
    }

    initFrame() {
        this.acc = Vector2D.zeros();
        if (this.engaging.length > 0) {
            this.isEngaging = true;
            this.isBoiding = false
        } else {
            this.isEngaging = false;
            this.isBoiding = true
        }

    }

    approachDesiredPos() {
        if (this.desiredPos) {
            const desiredV = Vector2D.subtract(this.desiredPos, this.pos);
            this.acc.add(Vector2D.subtract(desiredV, this.vel));
        }
    }

    isAlive(): boolean {
        return this.health > 0;
    }

    render() {
        if (this.isAlive()) {
            this.renderSelf();
            this.renderAttack();
            this.renderStatsBar();
        }
    }

    renderSelf() {
        if (this.particleSprite === null) {
            this.particleSprite = new Graphics()
                .circle(0, 0, this.radius)
                .fill({color: this.color, alpha: 1});
            this.particleSprite.zIndex = Game.zIndex.flyers;
            this.scene.pixiRef.stage.addChild(this.particleSprite);
        }
        this.particleSprite.x = this.pos.x * this.scene.renderScale;
        this.particleSprite.y = this.pos.y * this.scene.renderScale;
        this.particleSprite.scale.set(this.scene.renderScale);
    }

    renderAttack() {
        if (this.attackSprite === null) {
            this.attackSprite = new Graphics();
            this.scene.pixiRef.stage.addChild(this.attackSprite);
        }
        this.attackSprite.clear();
        for (const foePack of this.firingLaserAt) {
            if (foePack.target.isAlive()) {
                this.attackSprite
                    .moveTo(this.pos.x * this.scene.renderScale, this.pos.y * this.scene.renderScale)
                    .lineTo(foePack.firingPos.x * this.scene.renderScale, foePack.firingPos.y * this.scene.renderScale)
                    .stroke({
                        color: 0xFFFFFF,
                        alpha: foePack.intensity,
                        width: 1
                    });
            }
        }
    }

    renderStatsBar(): void {
        if (this.healthSprite === null) {
            this.healthSprite = new Graphics();
            this.healthSprite.zIndex = Game.zIndex.flyers;
            this.scene.pixiRef.stage.addChild(this.healthSprite);
        }
        this.healthSprite.clear();
        if (!this.isAlive()) return;

        const pxZero = this.pos.x * this.scene.renderScale - this.radius - 3;
        const lenX = 2 * this.radius + 6
        const healthRatio = this.health / this.maxHealth;
        this.healthSprite
            .moveTo(pxZero, this.pos.y * this.scene.renderScale - this.radius - 2)
            .lineTo(pxZero + lenX * healthRatio, this.pos.y * this.scene.renderScale - this.radius - 2)
            .stroke({
                color: this.color,
                alpha: .8,
                width: 1
            })
    }
}