import {massToRadius, randomUnitVector, Vector2D} from "./Utility";
import {Entity, Team} from "../types/types";
import {Graphics} from "pixi.js";
import HeroGameLoop from "./HeroGameLoop";
import {UnitPack} from "../types/unitTypes";
import {UnitManager} from "./UnitManager";

export class Particle implements Entity {
    vel: Vector2D;
    acc: Vector2D = Vector2D.zeros();
    leaderPosition: Vector2D | undefined;
    radius: number;
    isBoiding: boolean = true;
    isEngaging: boolean = false;
    sqFireRadius: number = 50 ** 2;
    sqEngageRadius: number = 100 ** 2;
    maxTargets: number = 1;
    engaging: Entity[] = [];
    firingLaserAt: FiringLaserAt[] = [];
    desiredPos: Vector2D | undefined = undefined;
    desiredSpeed: number = .75;
    desiredLeaderDist: { min: number, max: number } = {min: 50, max: 60};
    maxAcc: number = .05;
    givesIncome: number = 0;

    targetedBy: Entity[] = [];

    particleSprite: Graphics | null = null;
    attackSprite: Graphics | null = null;
    healthSprite: Graphics | null = null;
    debugSprite: Graphics | null = null;

    private maxHealth: number = 100;
    private _health: number = this.maxHealth;

    static price: number = 100;

    constructor(
        public pos: Vector2D,
        public mass: number,
        public team: Team,
        public maxVel: number = 1,
        public color: number,
        private scene: HeroGameLoop,
        public groupID: number,
        public unitInfo: UnitPack,
        public owner: Entity,
        private unitManager: UnitManager,
    ) {
        this.vel = randomUnitVector().scale(this.maxVel);
        this.radius = massToRadius(mass);
    }

    receiveDamage(damage: number): void {
        this._health -= damage;
        if (this._health <= 0) {
            this.onDeath();
        }
    }

    get health(): number {
        return this._health;
    }

    set health(value: number) {
        this._health = value;
        if (this._health <= 0) {
            this.onDeath();
        }
    }

    setGroupID(groupID: number): void {
        this.groupID = groupID;
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

    render() {
        if (this.isAlive()) {
            this.renderSelf();
            this.renderAttack();
            this.renderStatsBar();
        } else {
            this.killSprites();
        }
    }

    renderSelf() {
        if (this.particleSprite === null) {
            this.particleSprite = new Graphics()
                .circle(0, 0, this.radius)
                .fill({color: this.color, alpha: 1});
            this.particleSprite.zIndex = HeroGameLoop.zIndex.flyers;
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
                        width: 1});
            }
        }
    }

    renderStatsBar(): void {
        if (this.healthSprite === null) {
            this.healthSprite = new Graphics();
            this.healthSprite.zIndex = HeroGameLoop.zIndex.flyers;
            this.scene.pixiRef.stage.addChild(this.healthSprite);
        }
        this.healthSprite.clear();
        if (!this.isAlive()) return;

        const pxZero = this.pos.x * this.scene.renderScale - this.radius - 3;
        const lenX = 2 * this.radius + 6
        const healthRatio = this._health / this.maxHealth;
        this.healthSprite
            .moveTo(pxZero, this.pos.y * this.scene.renderScale - this.radius - 2)
            .lineTo(pxZero + lenX * healthRatio, this.pos.y * this.scene.renderScale - this.radius - 2)
            .stroke({
                color: this.color,
                alpha: .8,
                width: 1
            })
    }

    onDeath() {
        this.unitManager.remove(this);
        this.killSprites();
    }

    setLeaderPosition(position: Vector2D) {
        this.leaderPosition = position;
    }

    getLeaderPosition() {
        if (this.leaderPosition === undefined) return undefined
        return Vector2D.add(this.leaderPosition, Vector2D.ones().scale(20));
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
            if (leaderPosition !== undefined) {
                const leaderDelta = Vector2D.subtract(leaderPosition, this.pos);
                const leaderDist = leaderDelta.magnitude();
                if (leaderDist < this.desiredLeaderDist.min) {
                    this.desiredPos = Vector2D.add(this.pos, leaderDelta.scale(-1));
                } else if (leaderDist > this.desiredLeaderDist.max) {
                    this.desiredPos = Vector2D.add(this.pos, leaderDelta.scale(1));
                } else {
                    this.desiredPos = undefined;
                }
            } else {
                this.desiredPos = undefined;
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
        return this._health > 0;
    }
}

interface FiringLaserAt {
    target: Entity;
    intensity: number;
    firingPos: Vector2D;
}