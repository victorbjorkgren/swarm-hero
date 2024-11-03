import {EntityInterface, EntityLogic, EntityRenderer, EntityState, EntityTypes, Team} from "../../types/types";
import {massToRadius, randomUnitVector, Vector2D} from "../Utility";
import {UnitPack} from "../../types/unitTypes";
import {UnitManager} from "../UnitManager";
import {Game} from "../Game";
import {Graphics} from "pixi.js";
import {EntityID, ParticleID, ParticleUpdateData} from "@shared/commTypes";

interface FiringLaserAt {
    target: EntityID;
    intensity: number;
    firingPos: Vector2D;
}

export class ParticleInterface extends EntityInterface {
    public state: ParticleState;
    protected logic: ParticleLogic;
    protected renderer: ParticleRenderer;

    constructor(
        pos: Vector2D,
        mass: number,
        team: Team,
        maxVel: number = 1,
        color: number,
        scene: Game,
        groupID: number,
        unitInfo: UnitPack,
        owner: EntityID,
        unitManager: UnitManager<ParticleInterface>,
        id: ParticleID)
    {
        super();
        this.state = new ParticleState(pos, mass, team, maxVel, color, scene, groupID, unitInfo, owner, unitManager, id)
        this.logic = new ParticleLogic(this.state);
        this.renderer = new ParticleRenderer(this.state);
    }

    update() {
        this.logic.update()
        this.renderer.update()
    }

    updateFromHost(particleUpdate: ParticleUpdateData) {
        if (particleUpdate.pos !== null)
            this.state.pos = Vector2D.cast(particleUpdate.pos);
        if (particleUpdate.vel !== null)
            this.state.vel = Vector2D.cast(particleUpdate.vel);
        if (particleUpdate.acc !== null)
            this.state.acc = Vector2D.cast(particleUpdate.acc);
        if (particleUpdate.health !== null)
            this.state.health = particleUpdate.health
        if (particleUpdate.owner !== null) {
            if (this.state.owner !== particleUpdate.owner) {
                const newOwnerEntity = this.state.scene.getEntityById(particleUpdate.owner, particleUpdate.ownerType);
                if (!newOwnerEntity) return;
                this.state.unitManager.switchOwner(this, newOwnerEntity.state.id);
            }
        }
        if (particleUpdate.leader !== null) {
            if (!this.state.leader || this.state.leader.id !== particleUpdate.leader) {
                const newOwnerEntity = this.state.scene.getEntityById(particleUpdate.owner, particleUpdate.ownerType);
                if (!newOwnerEntity) return;
                this.state.unitManager.switchOwner(this, newOwnerEntity.state.id);
            }
        }
    }

    receiveDamage(damage: number): void {
        this.state.health -= damage;
        if (!this.state.isAlive()) {
            this.state.scene.broadcastDeath(this.state.id, EntityTypes.Particle);
        }
    }

    onDeath() {
        this.state.unitManager.remove(this);
        this.renderer.cleanUp();
    }

    setGroupID(groupID: number): void {
        this.state.groupID = groupID;
    }

    setLeader(leader: EntityState) {
        // Should the leader really be state and not EntityID? Leaving it for now though.
        this.state.leader = leader;
    }
}

class ParticleState implements EntityState {
    vel: Vector2D;
    acc: Vector2D = Vector2D.zeros();
    leader: EntityState | null = null;
    radius: number;
    isBoiding: boolean = true;
    isEngaging: boolean = false;
    sqFireRadius: number = 50 ** 2;
    sqEngageRadius: number = 100 ** 2;
    maxTargets: number = 1;
    engaging: EntityID[] = [];
    firingLaserAt: FiringLaserAt[] = [];
    desiredPos: Vector2D | null = null;
    desiredSpeed: number = .75;
    desiredLeaderDist: { min: number, max: number } = {min: 50, max: 60};
    maxAcc: number = .05;
    givesIncome: number = 0;

    targetedBy: ParticleID[] = [];

    public entityType: EntityTypes = EntityTypes.Particle;

    maxHealth: number = 100;
    public health: number = this.maxHealth;

    public damageQueue: Map<EntityID, number> = new Map();

    static price: number = 100;

    constructor(
        public pos: Vector2D,
        public mass: number,
        public team: Team,
        public maxVel: number = 1,
        public color: number,
        public scene: Game,
        public groupID: number,
        public unitInfo: UnitPack,
        public owner: EntityID,
        public unitManager: UnitManager<ParticleInterface>,
        public id: ParticleID,
    ) {
        this.vel = randomUnitVector().scale(this.maxVel);
        this.radius = massToRadius(mass);
    }

    getLeaderPosition() {
        if (this.leader === null) return null
        return this.leader.pos;
    }

    getFiringPos(from: Vector2D): Vector2D {
        return this.pos;
    }

    isAlive(): boolean {
        return this.health > 0;
    }

}

class ParticleLogic extends EntityLogic {
    private sqCohedeDist: number = 250 ** 2;
    private sqSeparateDistance: number = 75 ** 2;
    private cohesionFactor: number = .1;
    private separationFactor: number = 2;
    private alignFactor: number = 40;

    constructor(protected state: ParticleState) {super();}

    update(): void {
        this.cleanEngagingTargets();
        this.cleanFiringAtTargets();
        this.engageFights();
        this.fightFights();
        this.initFrame();
        this.approachDesiredVel();
        this.calcDesiredPos();
        this.approachDesiredPos();
        this.updateBoid();
        this.updatePos();
    }

    updatePos(): void {
        this.state.acc.limit(this.state.maxAcc);
        this.state.vel.add(this.state.acc);
        this.state.vel.limit(this.state.maxVel);
        this.state.pos.add(this.state.vel);
    }

    updateBoid(): void {
        const cohedePoint = Vector2D.zeros();
        const sepPoint = Vector2D.zeros();
        const alignV = Vector2D.zeros();
        let nCoh = 0;
        this.state.unitManager.ownerForEach(this.state.owner, (p2: ParticleInterface) => {
            if (this.state.id === p2.state.id) return;

            const sqDist = Vector2D.sqDist(this.state.pos, p2.state.pos);
            // Separate
            if (sqDist < this.sqSeparateDistance) {
                sepPoint.x += 0.03 * this.sqSeparateDistance * (this.state.pos.x - p2.state.pos.x) / sqDist;
                sepPoint.y += 0.03 * this.sqSeparateDistance * (this.state.pos.y - p2.state.pos.y) / sqDist;
            }
            // Cohede & Align if boiding
            if (this.state.isBoiding && sqDist < this.sqCohedeDist && sqDist > this.sqSeparateDistance) {
                cohedePoint.add(p2.state.pos);
                alignV.add(p2.state.vel);
                nCoh += 1
            }

        })
        if (nCoh > 0) {
            cohedePoint.scale(1 / nCoh).sub(this.state.pos).scale(this.cohesionFactor);
            alignV.scale(1 / nCoh).sub(this.state.vel).scale(this.alignFactor);
        }
        sepPoint.scale(this.separationFactor);
        const desiredV = new Vector2D(
            cohedePoint.x + sepPoint.x + alignV.x,
            cohedePoint.y + sepPoint.y + alignV.y
        );
        this.state.acc.add(Vector2D.subtract(desiredV, this.state.vel));
    }

    private approachDesiredVel() {
        this.state.vel.scale(1 + this.state.desiredSpeed - this.state.vel.magnitude());
    }

    private calcDesiredPos() {
        if (this.state.engaging.length === 0) return this.setDesiredPosToLeader();
        const foe = this.getFoeEntity(this.state.engaging[0]);
        if (!foe) return this.setDesiredPosToLeader();

        this.state.desiredPos = foe.state.getFiringPos(this.state.pos);
    }

    private setDesiredPosToLeader() {
        const leaderPosition = this.state.getLeaderPosition();
        if (leaderPosition !== null) {
            const leaderDelta = Vector2D.subtract(leaderPosition, this.state.pos);
            const leaderDist = leaderDelta.magnitude();
            if (leaderDist < this.state.desiredLeaderDist.min) {
                this.state.desiredPos = Vector2D.add(this.state.pos, leaderDelta.scale(-1));
            } else if (leaderDist > this.state.desiredLeaderDist.max) {
                this.state.desiredPos = Vector2D.add(this.state.pos, leaderDelta.scale(1));
            } else {
                this.state.desiredPos = null;
            }
        } else {
            this.state.desiredPos = null;
        }
    }

    private initFrame() {
        this.state.acc = Vector2D.zeros();
        if (this.state.engaging.length > 0) {
            this.state.isEngaging = true;
            this.state.isBoiding = false
        } else {
            this.state.isEngaging = false;
            this.state.isBoiding = true
        }
    }

    private approachDesiredPos() {
        if (this.state.desiredPos) {
            const desiredV = Vector2D.subtract(this.state.desiredPos, this.state.pos);
            this.state.acc.add(Vector2D.subtract(desiredV, this.state.vel));
        }
    }

    private cleanEngagingTargets(): void {
        for (let i = this.state.engaging.length - 1; i >= 0; i--) {
            const foeId = this.state.engaging[i];
            const foe = this.state.scene.getEntityById(foeId, EntityTypes.Any);
            if (!foe || !foe.state.isAlive() || this.sqFiringDistance(foe.state) > this.state.sqEngageRadius) {
                this.state.engaging.splice(i, 1);
                this.removeTargetingReference(foe!.state);
            }
        }
    }

    private cleanFiringAtTargets(): void {
        for (let i = this.state.firingLaserAt.length - 1; i >= 0; i--) {
            const foeItem = this.state.firingLaserAt[i];
            const foe = this.state.scene.getEntityById(foeItem.target, EntityTypes.Any);
            if (!foe || !foe.state.isAlive() || this.sqFiringDistance(foe.state) > this.state.sqFireRadius) {
                this.state.firingLaserAt.splice(i, 1);
            }
        }
    }

    private removeTargetingReference(foe: EntityState): void {
        const targetIndex = foe.targetedBy.findIndex(targetId => targetId === this.state.id);
        if (targetIndex !== -1) {
            foe.targetedBy.splice(targetIndex, 1);
        }
    }

    private engageTeamEntities(entityIds: string[], entities: Map<string, any>): void {
        for (const entityId of entityIds) {
            const entity = entities.get(entityId);
            if (!entity || this.state.engaging.length >= this.state.maxTargets) return;

            this.engageIfClose(entity);

            if (this.state.engaging.length < this.state.maxTargets) {
                this.state.unitManager.ownerForEach(entity.id, (other) => {
                    if (this.state.engaging.length >= this.state.maxTargets) return;
                    this.engageIfClose(other);
                });
            }
        }
    }

    engageFights(): void {
        if (this.state.engaging.length >= this.state.maxTargets) return;
        this.state.scene.teams.forEach((team) => {
            if (team === this.state.team) return;
            this.engageTeamEntities(team.playerIds, this.state.scene.players);
            this.engageTeamEntities(team.castleIds, this.state.scene.castles);
        });
    }

    fightFights(): void {
        for (const foeId of this.state.engaging) {
            const foeEntity = this.getFoeEntity(foeId);
            if (!foeEntity) continue;

            const firingAt = this.getFiringAtTarget(foeId);
            const firingPos = foeEntity.state.getFiringPos(this.state.pos);

            if (firingAt) {
                this.updateFiring(firingAt, foeId, firingPos);
            } else if (this.isWithinFireRadius(firingPos)) {
                this.startFiringAt(foeId, firingPos);
            }
        }
    }

    private getFoeEntity(foeId: string): EntityInterface | undefined {
        return this.state.scene.getEntityById(foeId, EntityTypes.Any);
    }

    private getFiringAtTarget(foeId: string): FiringLaserAt | undefined {
        return this.state.firingLaserAt.find(foeItem => foeItem.target === foeId);
    }

    private updateFiring(firingAt: FiringLaserAt, foeId: string, firingPos: Vector2D): void {
        firingAt.intensity = Math.min(firingAt.intensity + 0.01, 1);
        this.state.damageQueue.set(foeId, firingAt.intensity);
        firingAt.firingPos = firingPos;
    }

    private isWithinFireRadius(firingPos: Vector2D): boolean {
        return Vector2D.sqDist(this.state.pos, firingPos) < this.state.sqFireRadius;
    }

    private startFiringAt(foeId: string, firingPos: Vector2D): void {
        this.state.firingLaserAt.push({
            target: foeId,
            intensity: 0,
            firingPos: firingPos
        });
    }

    engageIfClose(other: EntityInterface) {
        if (!other.state.isAlive()) return;
        if (this.state === other.state) return
        if (this.state.team === other.state.team) return
        if (this.sqFiringDistance(other.state) > this.state.sqEngageRadius) return;
        this.state.engaging.push(other.state.id)
        other.state.targetedBy.push(this.state.id);
    }

    sqFiringDistance(other: EntityState): number {
        return Vector2D.sqDist(this.state.pos, other.getFiringPos(this.state.pos));
    }
}

class ParticleRenderer extends EntityRenderer {
    particleSprite: Graphics | null = null;
    attackSprite: Graphics | null = null;
    healthSprite: Graphics | null = null;
    debugSprite: Graphics | null = null;

    constructor(protected state: ParticleState) {super()}

    update() {
        if (this.state.isAlive()) {
            this.renderSelf();
            this.renderAttack();
            this.renderStatsBar();
        }
    }

    cleanUp() {
        if (this.particleSprite) {
            this.state.scene.pixiRef.stage.removeChild(this.particleSprite);
            this.particleSprite.destroy();
        }
        if (this.attackSprite) {
            this.state.scene.pixiRef.stage.removeChild(this.attackSprite);
            this.attackSprite.destroy();
        }
        if (this.healthSprite) {
            this.state.scene.pixiRef.stage.removeChild(this.healthSprite);
            this.healthSprite.destroy();
        }
    }

    protected renderSelf() {
        if (this.particleSprite === null) {
            this.particleSprite = new Graphics()
                .circle(0, 0, this.state.radius)
                .fill({color: this.state.color, alpha: 1});
            this.particleSprite.zIndex = Game.zIndex.flyers;
            this.state.scene.pixiRef.stage.addChild(this.particleSprite);
        }
        this.particleSprite.x = this.state.pos.x * this.state.scene.renderScale;
        this.particleSprite.y = this.state.pos.y * this.state.scene.renderScale;
        this.particleSprite.scale.set(this.state.scene.renderScale);
    }

    protected renderAttack() {
        if (this.attackSprite === null) {
            this.attackSprite = new Graphics();
            this.state.scene.pixiRef.stage.addChild(this.attackSprite);
        }
        this.attackSprite.clear();
        for (const foePack of this.state.firingLaserAt) {
            this.attackSprite
                .moveTo(this.state.pos.x * this.state.scene.renderScale, this.state.pos.y * this.state.scene.renderScale)
                .lineTo(foePack.firingPos.x * this.state.scene.renderScale, foePack.firingPos.y * this.state.scene.renderScale)
                .stroke({
                    color: 0xFFFFFF,
                    alpha: foePack.intensity,
                    width: 1
                });
        }
    }

    protected renderStatsBar(): void {
        if (this.healthSprite === null) {
            this.healthSprite = new Graphics();
            this.healthSprite.zIndex = Game.zIndex.flyers;
            this.state.scene.pixiRef.stage.addChild(this.healthSprite);
        }
        this.healthSprite.clear();
        if (!this.state.isAlive()) return;

        const pxZero = this.state.pos.x * this.state.scene.renderScale - this.state.radius - 3;
        const lenX = 2 * this.state.radius + 6
        const healthRatio = this.state.health / this.state.maxHealth;
        this.healthSprite
            .moveTo(pxZero, this.state.pos.y * this.state.scene.renderScale - this.state.radius - 2)
            .lineTo(pxZero + lenX * healthRatio, this.state.pos.y * this.state.scene.renderScale - this.state.radius - 2)
            .stroke({
                color: this.state.color,
                alpha: .8,
                width: 1
            })
    }
}