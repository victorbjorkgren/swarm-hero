import {Team} from "../../types/types";
import {directionToLine, massToRadius, randomUnitVector, Vector2D} from "../Utility";
import {UnitPack} from "../../types/unitTypes";
import {UnitManager} from "../UnitManager";
import {Game} from "../Game";
import {Graphics} from "pixi.js";
import {EntityID, ParticleID, ParticleUpdateData} from "@shared/commTypes";
import {ParticleSystem} from "../ParticleSystem";
import {EntityInterface, EntityLogic, EntityRenderer, EntityState, EntityTypes} from "../../types/EntityTypes";
import { COMBAT_CONFIG, MOVEMENT_CONFIG, PARTICLE_STATS, BOID_CONFIG } from "@shared/config";

export enum DefensiveFormations {
    Line,
    Circle
}

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
        particleSystem: ParticleSystem,
        unitInfo: UnitPack,
        owner: EntityID,
        id: ParticleID)
    {
        super();
        this.state = new ParticleState(pos, mass, team, particleSystem.scene, unitInfo, owner, particleSystem.unitManager, id)
        this.logic = new ParticleLogic(this.state);
        this.renderer = new ParticleRenderer(this.state);
    }

    update(delta: number): void {
        this.logic.update(delta)
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
                const newOwnerEntity = this.state.scene.getEntityById(particleUpdate.owner, EntityTypes.Any);
                if (!newOwnerEntity) return;
                this.state.unitManager.switchOwner(this, newOwnerEntity.state.id, newOwnerEntity.state.team!);
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

    // setLeaderPos(leaderPos: Vector2D | null) {
    //     this.state.leaderPos = leaderPos;
    // }
}

class ParticleState implements EntityState {
    vel: Vector2D;
    acc: Vector2D = Vector2D.zeros();
    radius: number;
    isBoiding: boolean = true;
    isEngaging: boolean = false;
    sqFireRadius: number = COMBAT_CONFIG.FIRE_RANGE ** 2;
    sqEngageRadius: number = COMBAT_CONFIG.ENGAGE_RANGE ** 2;
    maxTargets: number = COMBAT_CONFIG.MAX_TARGETS;
    public maxVel: number = MOVEMENT_CONFIG.MAX_VELOCITY;
    engaging: EntityID[] = [];
    firingLaserAt: FiringLaserAt[] = [];
    desiredPos: Vector2D | null = null;
    desiredSpeed: number = MOVEMENT_CONFIG.DESIRED_SPEED;
    desiredOwnerDist: { min: number, max: number } = {
        min: MOVEMENT_CONFIG.OWNER_DISTANCE.MIN, 
        max: MOVEMENT_CONFIG.OWNER_DISTANCE.MAX
    };
    defensiveFormation: DefensiveFormations = DefensiveFormations.Circle;
    maxAcc: number = MOVEMENT_CONFIG.MAX_ACCELERATION;
    givesIncome: number = 0;

    targetedBy: ParticleID[] = [];
    attackable: boolean = true;

    public entityType: EntityTypes = EntityTypes.Particle;

    maxHealth: number = PARTICLE_STATS.MAX_HEALTH;
    public health: number = this.maxHealth;
    public color: number;

    static price: number = PARTICLE_STATS.PRICE;

    constructor(
        public pos: Vector2D,
        public mass: number,
        public team: Team,
        public scene: Game,
        public unitInfo: UnitPack,
        public owner: EntityID,
        public unitManager: UnitManager<ParticleInterface>,
        public id: ParticleID,
    ) {
        this.color = team.color;
        this.vel = randomUnitVector().scale(this.maxVel);
        this.radius = massToRadius(mass);
    }

    getOwnerInterface() {
        if (this.owner === null) return null
        const ownerInterface = this.scene.getEntityById(this.owner, EntityTypes.Player);
        return ownerInterface;
    }

    getOwnerPosition() {
        if (this.owner === null) return null
        const ownerInterface = this.scene.getEntityById(this.owner, EntityTypes.Any);
        if (!ownerInterface) return null;
        return ownerInterface.state.pos;
    }

    getDefensiveLine() {
        const ownerInterface = this.getOwnerInterface();
        if (!ownerInterface) return null;
        return ownerInterface.state.defensiveLine;
    }

    getFiringPos(): Vector2D {
        return this.pos;
    }

    isAlive(): boolean {
        return this.health > 0;
    }

}

class ParticleLogic extends EntityLogic {
    // Boid parameters
    private readonly sqCohedeDist: number = BOID_CONFIG.COHESION.RANGE ** 2;
    private readonly sqSeparateDistance: number = BOID_CONFIG.SEPARATION.RANGE ** 2;
    private readonly cohesionFactor: number = BOID_CONFIG.COHESION.FACTOR;
    private readonly separationFactor: number = BOID_CONFIG.SEPARATION.FACTOR;
    private readonly alignFactor: number = BOID_CONFIG.ALIGNMENT.FACTOR;

    // Rally parameters
    private readonly rallyFactor: number = MOVEMENT_CONFIG.LINE_FORMATION.FACTOR;
    private readonly velDesireFactor: number = MOVEMENT_CONFIG.VELOCITY_ADJUSTMENT;

    constructor(protected state: ParticleState) {super();}

    update(delta: number): void {
        this.cleanEngagingTargets();
        this.cleanFiringAtTargets();
        this.engageFights();
        this.fightFights();
        this.initFrame();
        this.approachDesiredVel();
        this.calcDesiredPos();
        this.approachDesiredPos();
        this.updateBoid();
        this.updatePos(delta);
    }

    private updatePos(deltaScale: number): void {
        const state = this.state;
        const acc = state.acc;
        const vel = state.vel;

        acc.limit(state.maxAcc);
        vel.add(acc.copy().scale(deltaScale));

        vel.limit(state.maxVel);
        state.pos.add(vel.copy().scale(deltaScale));
    }

    private updateBoid(): void {
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
        const state = this.state;
        const vel = state.vel;
        const scale = 1 + state.desiredSpeed - vel.magnitude();

        const delta = vel.copy().scale(this.velDesireFactor*scale);

        state.acc.add(delta)
    }

    private calcDesiredPos() {
        if (this.state.engaging.length === 0) return this.desireDefensiveFormation();
        const foe = this.getFoeEntity(this.state.engaging[0]);
        if (!foe) return this.desireDefensiveFormation();

        this.state.desiredPos = foe.state.getFiringPos(this.state.pos);
    }

    private desireDefensiveFormation() {
        switch (this.state.defensiveFormation) {
            case DefensiveFormations.Circle:
                this.setDesiredPosToOwner();
                break;
            case DefensiveFormations.Line:
                this.setDesiredPosToLine();
                break;
            default:
                throw new Error(`Unknown defensiveFormation: ${this.state.defensiveFormation}`);
        }
    }

    private setDesiredPosToOwner() {
        const ownerPosition = this.state.getOwnerPosition();
        if (ownerPosition) {
            const ownerDelta = Vector2D.subtract(ownerPosition, this.state.pos);
            const ownerDist = ownerDelta.magnitude();
            if (ownerDist < this.state.desiredOwnerDist.min) {
                this.state.desiredPos = Vector2D.subtract(this.state.pos, ownerDelta);
            } else if (ownerDist > this.state.desiredOwnerDist.max) {
                this.state.desiredPos = Vector2D.add(this.state.pos, ownerDelta);
            } else {
                this.state.desiredPos = null;
            }
        } else {
            this.state.desiredPos = null;
        }
    }

    private setDesiredPosToLine() {
        const ownerInterface = this.state.getOwnerInterface();
        if (!ownerInterface) return;
        const line = ownerInterface.state.defensiveLine;
        if (line) {
            // Apply formation vector
            this.state.desiredPos = Vector2D.add(this.state.pos, directionToLine(this.state.pos, line.p, line.n));
            // Apply rally vector
            const rallyVector = ownerInterface.state.droneRallyVector.copy()//.scale(this.rallyFactor);
            this.state.desiredPos.add(rallyVector);
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
            if (!foe || !foe.state.isAlive() || foe.state.team === this.state.team || this.sqFiringDistance(foe.state) > this.state.sqEngageRadius) {
                this.state.engaging.splice(i, 1);
                foe && this.removeTargetingReference(foe.state);
            }
        }
    }

    private cleanFiringAtTargets(): void {
        for (let i = this.state.firingLaserAt.length - 1; i >= 0; i--) {
            const foeItem = this.state.firingLaserAt[i];
            const foe = this.state.scene.getEntityById(foeItem.target, EntityTypes.Any);
            if (!foe || !foe.state.isAlive() || foe.state.team === this.state.team || this.sqFiringDistance(foe.state) > this.state.sqFireRadius) {
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

    private engageEntityCollection(entityIds: EntityID[], entityMap: Map<EntityID, EntityInterface>): void {
        for (const entityId of entityIds) {
            const entity = entityMap.get(entityId);
            if (!entity || this.state.engaging.length >= this.state.maxTargets) return;

            this.engageIfClose(entity);

            if (this.state.engaging.length < this.state.maxTargets) {
                this.state.unitManager.ownerForEach(entity.state.id, (other) => {
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
            this.engageEntityCollection(team.playerIds, this.state.scene.players);
            this.engageEntityCollection(team.castleIds, this.state.scene.castles);
        });
        const emptyIds = Array.from(this.state.scene.neutralEntities.keys());
        this.engageEntityCollection(emptyIds, this.state.scene.neutralEntities);
    }

    fightFights(): void {
        for (const foeId of this.state.engaging) {
            const foeEntity = this.getFoeEntity(foeId);
            if (!foeEntity) continue;

            const firingAt = this.getFiringAtTarget(foeId);
            const firingPos = foeEntity.state.getFiringPos(this.state.pos);

            if (firingAt) {
                this.updateFiring(firingAt, foeEntity, firingPos);
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

    private updateFiring(firingAt: FiringLaserAt, foe: EntityInterface, firingPos: Vector2D): void {
        firingAt.intensity = Math.min(firingAt.intensity + 0.01, 1);
        foe.receiveDamage(firingAt.intensity)
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
        if (!other.state.attackable) return;
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

    constructor(protected state: ParticleState) {super()}

    update() {
        if (this.state.isAlive()) {
            this.updateAnimationSprites();
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