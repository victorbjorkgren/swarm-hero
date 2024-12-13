import {Team} from "../../types/types";
import {ClientID, EmptyID, ParticleID} from "@shared/commTypes";
import {Vector2D} from "../Utility";
import {Game} from "../Game";
import {gameConfig} from "@shared/config";
import {estimateFoeStrength} from "../AI/AIBehavior";
import {EntityInterface, EntityLogic, EntityRenderer, EntityState, EntityTypes} from "../../types/EntityTypes";

enum NeutralTypes {
    EMPTY,
    ROVING,
    GOLDMINE
}

export class NeutralInterface extends EntityInterface{
    public state: NeutralState;
    protected logic: NeutralLogic;
    protected renderer: NeutralRenderer;

    constructor(
        id: EmptyID,
        pos: Vector2D,
        wayPoints: Vector2D[],
        neutralType: NeutralTypes,
        scene: Game
    ) {
        super();
        this.state = new NeutralState(id, pos, wayPoints, neutralType, scene);
        this.logic = new NeutralLogic(this.state);
        this.renderer = new NeutralRenderer(this.state);
    }

    onDeath(): void {
        throw new Error("Not implemented");
    }

    receiveDamage(damage: number): void {
        throw new Error("Not implemented");
    }

    update(delta: number): void {
        this.logic.update(delta);
        if (this.state.yieldingTo !== null) {
            this.signalYield(this.state.yieldingTo);
            this.state.yieldingTo = null;
        }
    }

    signalYield(yieldingTo: ClientID): void {
        this.state.scene.broadcastYield(this.state.id, yieldingTo);
    }
}

class NeutralState implements EntityState {
    entityType: EntityTypes = EntityTypes.Null;
    givesIncome: number = 0;
    health: number = 1;
    mass: number = Infinity;
    radius: number = 1;
    targetedBy: ParticleID[] = [];
    vel: Vector2D = Vector2D.zeros();

    yieldDistance: number;
    yieldLimit: number;

    maxVel: number = gameConfig.rovingSwarmVel;

    team: Team | null = null;
    attackable: boolean = false;
    currentWaypointIndex: number = 0;
    wayPointInter: number = 0;

    yieldingTo: ClientID | null = null;

    constructor(
        public id: EmptyID,
        public pos: Vector2D,
        public wayPoints: Vector2D[],
        public neutralType: NeutralTypes,
        public scene: Game
    ) {
        this.yieldDistance = (neutralType === NeutralTypes.GOLDMINE) ? gameConfig.mineYieldCheckSqDist : gameConfig.swarmYieldCheckSqDist;
        this.yieldLimit = (neutralType === NeutralTypes.GOLDMINE) ? gameConfig.mineYieldLimit : gameConfig.swarmYieldLimit;
    }

    getFiringPos(from: Vector2D): Vector2D {
        throw new Error("Not implemented");
    }

    isAlive(): boolean {
        return true;
    }
}

class NeutralLogic extends EntityLogic{
    constructor(
        protected state: NeutralState,
    ) {
        super();
    }

    public update(deltaScale: number): void {
        this.checkYield();
        this.rove(deltaScale);
    }

    private rove(deltaScale: number): void {
        if (this.state.wayPoints.length === 0) return;

        const currentWaypoint = this.state.wayPoints[this.state.currentWaypointIndex]
        const pos = this.state.pos;

        if (pos.sqDistanceTo(currentWaypoint) < 1) {
            this.state.currentWaypointIndex = (this.state.currentWaypointIndex + 1) % this.state.wayPoints.length;
            const nextWaypoint = this.state.wayPoints[this.state.currentWaypointIndex];
            this.state.vel = Vector2D.subtract(nextWaypoint, pos).limit(this.state.maxVel);
        } else if (this.state.vel.isZero()) {
            this.state.vel = Vector2D.subtract(currentWaypoint, pos).limit(this.state.maxVel);
        }
        this.state.pos.add(this.state.vel.copy().scale(deltaScale));
    }

    private checkYield() {
        for (const player of this.state.scene.players.values()) {
            if (this.state.pos.sqDistanceTo(player.state.pos) < this.state.yieldDistance) {
                const playerStrength = estimateFoeStrength(player.state.id, this.state.id, this.state.scene.particleSystem?.getParticles())
                console.log("playerStrength", playerStrength, player.state.id);
                if (playerStrength > this.state.yieldLimit) {
                    this.state.yieldingTo = player.state.id;
                    return;
                }
            }
        }
    }
}

class NeutralRenderer extends EntityRenderer {
    constructor(protected state: EntityState) {
        super();
    }

    protected renderSelf(): void {
        throw new Error("Method not implemented.");
    }
    protected renderAttack(): void {
        throw new Error("Method not implemented.");
    }
    protected renderStatsBar(): void {
        throw new Error("Method not implemented.");
    }
    public update(): void {
        throw new Error("Method not implemented.");
    }
    public cleanUp(): void {
        throw new Error("Method not implemented.");
    }

}