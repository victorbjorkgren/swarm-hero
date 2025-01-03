import {Team} from "../../types/types";
import {ClientID, NeutralID, ParticleID} from "@shared/commTypes";
import {Vector2D} from "../Utility";
import {Game} from "../Game";
import {gameConfig} from "@shared/config";
import {estimateFoeStrength} from "../AI/AIBehavior";
import {EntityInterface, EntityLogic, EntityRenderer, EntityState, EntityTypes} from "../../types/EntityTypes";
import {Container, Sprite, Texture} from "pixi.js";
import {PlayerInterface} from "./Player";

export enum NeutralTypes {
    SWARM,
    GOLDMINE
}

export class NeutralInterface extends EntityInterface{
    public state: NeutralState;
    protected logic: NeutralLogic;
    protected renderer: NeutralRenderer;

    constructor(
        id: NeutralID,
        pos: Vector2D,
        wayPoints: Vector2D[],
        income: number,
        neutralType: NeutralTypes,
        scene: Game
    ) {
        super();
        this.state = new NeutralState(id, pos, wayPoints, income, neutralType, scene);
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
        this.tryYield();
        this.renderer.update();
    }

    tryYield() {
        if (this.state.yieldingTo === null) return;
        console.log(`Yielding to ${this.state.yieldingTo}`)
        this.signalYield(this.state.yieldingTo);
        // const yieldingToInterface = this.state.scene.getEntityById(this.state.yieldingTo, EntityTypes.Any);
        // if (yieldingToInterface === undefined) throw new Error("Tried yielding to non player entity");
        // this.state.team = yieldingToInterface.state.team
        // this.state.yieldingTo = null;
    }

    signalYield(yieldingTo: ClientID): void {
        this.state.scene.broadcastYield(this.state.id, this.state.neutralType, yieldingTo);
    }

    switchAllegiance(newOwner: ClientID): void {
        if (this.state.owner) {
            const ownerInterface: PlayerInterface | undefined = this.state.scene.getEntityById(this.state.owner, EntityTypes.Player);
            if (!ownerInterface) throw new Error("Has owner but interface not found");
            ownerInterface.loseMineControl(this.state.id)
        }
        const newOwnerInterface = this.state.scene.getEntityById(newOwner, EntityTypes.Player);
        if (newOwnerInterface === undefined) throw new Error("Tried yielding to non player entity");

        newOwnerInterface.gainMineControl(this.state.id);
        this.state.owner = newOwner;
        this.state.team = newOwnerInterface.state.team;

        this.state.yieldingTo = null;
    }
}

class NeutralState implements EntityState {
    entityType: EntityTypes = EntityTypes.Neutral;
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
    owner: ClientID | null = null;

    constructor(
        public id: NeutralID,
        public pos: Vector2D,
        public wayPoints: Vector2D[],
        public givesIncome: number,
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
                // console.log("playerStrength", playerStrength, player.state.id);
                if (playerStrength > this.state.yieldLimit) {
                    this.state.yieldingTo = player.state.id;
                    return;
                }
            }
        }
    }
}

class NeutralRenderer extends EntityRenderer {
    private neutralSprite: Container | null = null;
    private neutralTexture: Texture[] | null = null;
    private flags: {red: Sprite, blue: Sprite} | null = null;

    constructor(protected state: NeutralState) {
        super();
        if (this.state.neutralType === NeutralTypes.GOLDMINE) {
            if (!state.scene.mineTexturePack) throw new Error("Could not find a mineTexturePack");
            if (!state.scene.flagSprites) throw new Error("Could not find a Flag Sprites");
            this.neutralTexture = state.scene.mineTexturePack;
            this.flags = {
                red: new Sprite(state.scene.flagSprites.red),
                blue: new Sprite(state.scene.flagSprites.blue)
            };
            this.initSprite();
        }
    }

    update() {
        this.renderSelf();
        this.renderAttack();
        this.renderStatsBar();
    }
    
    protected renderSelf(): void {
        if (!this.neutralSprite) return;
        if (!this.flags) return;
        this.neutralSprite!.x = this.state.pos.x * this.state.scene.renderScale;
        this.neutralSprite!.y = this.state.pos.y * this.state.scene.renderScale;
        this.neutralSprite!.scale.set(.1 * this.state.scene.renderScale);
        if (!this.state.team) return;
        switch (this.state.team.name) {
            case 'Red':
                this.flags.red.visible = true;
                this.flags.blue.visible = false;
                break;
            case 'Blue':
                this.flags.red.visible = false;
                this.flags.blue.visible = true;
                break;
            case 'Neutral':
                this.flags.red.visible = false;
                this.flags.blue.visible = false;
                break;
            default:
                throw new Error(`Unknown team: ${this.state.team?.name}`);
        }
    }

    protected renderAttack(): void {

    }

    protected renderStatsBar(): void {

    }

    private initSprite() {
        if (this.neutralTexture === null) return;
        if (this.flags === null) return;

        this.flags.red.visible = false;
        this.flags.blue.visible = false;
        this.flags.red.anchor.set(-.6, .7);
        this.flags.blue.anchor.set(-.6, .7);
        this.flags.red.zIndex = Game.zIndex.ground;
        this.flags.blue.zIndex = Game.zIndex.ground;

        const rnd: number = Math.floor(Math.random() * this.neutralTexture.length)
        const baseSprite: Sprite = new Sprite(this.neutralTexture[rnd]);
        baseSprite.anchor.set(0.5);
        baseSprite.zIndex = Game.zIndex.ground;

        this.neutralSprite = new Container();
        this.neutralSprite.addChild(this.flags.blue);
        this.neutralSprite.addChild(this.flags.red);
        this.neutralSprite.addChild(baseSprite);
        this.state.scene.pixiRef.stage.addChild(this.neutralSprite);
    }

    public cleanUp(): void {
        if (this.neutralSprite) {
            this.state.scene.pixiRef.stage.removeChild(this.neutralSprite);
            this.neutralSprite.destroy();
        }
    }

}