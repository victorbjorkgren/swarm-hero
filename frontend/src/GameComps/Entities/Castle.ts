import {
    EntityInterface,
    EntityLogic,
    EntityRenderer,
    EntityState,
    EntityTypes,
    Team,
    TexturePack
} from "../../types/types";
import {Game} from "../Game";
import {Vector2D} from "../Utility";
import {Graphics, Sprite} from "pixi.js";
import {CastleID, CastleUpdateData, ClientID, ParticleID} from "@shared/commTypes";
import {gameConfig, SpellPacks} from "@shared/config";
import {SpellPack, Spells} from "../../types/spellTypes";

const playerWithinRange = (playerId: ClientID, state: CastleState): boolean => {
    const player = state.scene.players.get(playerId);
    if (!player || !player.state.isAlive()) return false;
    if (!state.isAlive()) return false;
    return Vector2D.sqDist(player.state.pos, state.pos) < state.sqActivationDist
}

export class CastleInterface extends EntityInterface{
    public state: CastleState;
    protected logic: CastleLogic;
    protected renderer: CastleRenderer;

    constructor(
        id: CastleID,
        pos: Vector2D,
        team: Team,
        owner: ClientID,
        scene: Game
    ) {
        super();
        team!.castleIds.push(id);

        this.state = new CastleState(id, pos, team, owner, scene);
        this.renderer = new CastleRenderer(this.state);
        this.logic = new CastleLogic(this.state);
    }

    update(delta: number) {
        this.logic.update(delta);
        this.renderer.update();
    }

    updateFromHost(castleUpdate: CastleUpdateData) {
        if (castleUpdate.health !== null)
            this.state.health = castleUpdate.health
        if (castleUpdate.owner !== null)
            this.state.owner = castleUpdate.owner; // TODO: Switch for player as well
    }

    receiveDamage(damage: number): void {
        this.state.health = this.state.health - damage;
        if (!this.state.isAlive()) {
            this.state.scene.broadcastDeath(this.state.id, EntityTypes.Castle);
        }
    }

    onDeath(): void {
        this.renderer.cleanUp();
    }

    playerWithinRange(playerId: ClientID): boolean {
        return playerWithinRange(playerId, this.state);
    }
}

class CastleState implements EntityState {
    vel: Vector2D = Vector2D.zeros();
    radius: number = 20;
    mass: number = Infinity;
    maxHealth: number = gameConfig.castleHealth;
    health: number = gameConfig.castleHealth;
    givesIncome: number = gameConfig.castleIncome;
    targetedBy: ParticleID[] = [];

    public entityType: EntityTypes = EntityTypes.Castle;

    public sqActivationDist: number = gameConfig.castleActivationDist ** 2;
    public nearbyPlayers: ClientID[] = [];

    public availableSpells: SpellPack[] = [
        SpellPacks[Spells.Explosion],
    ];

    constructor(
        public id: CastleID,
        public pos: Vector2D,
        public team: Team,
        public owner: ClientID,
        public scene: Game
    ) {
    }

    isAlive(): boolean {
        return this.health > 0;
    }

    getFiringPos(from: Vector2D): Vector2D {
        return this.pos;
    }

    hasNearbyPlayers() {
        return this.nearbyPlayers.length > 0
    }

}

class CastleLogic extends EntityLogic{
    constructor(protected state: CastleState) {super();}

    update(deltaScale: number) {
        this.checkPlayers();
    }

    private checkPlayers() {
        this.state.nearbyPlayers = this.state.nearbyPlayers.filter(playerId => playerWithinRange(playerId, this.state));
        for (const playerId of this.state.team!.playerIds) {
            const player = this.state.scene.players.get(playerId);
            if (!player) continue;
            if (Vector2D.sqDist(player.state.pos, this.state.pos) < this.state.sqActivationDist) {
                this.state.nearbyPlayers.push(player.state.id);
            }
        }
    }
}

class CastleRenderer extends EntityRenderer {
    private castleSprite: Sprite | null = null;
    private healthSprite: Graphics | null = null;
    private texture: TexturePack;

    constructor(
        protected state: CastleState
    ) {
        super();
        if (!state.scene.castleTexturePack) throw new Error("Could not find a castleTexturePack");
        this.texture = state.scene.castleTexturePack
    }

    update() {
        this.renderSelf();
        this.renderAttack();
        this.renderStatsBar();
    }

    cleanUp(): void {
        if (this.castleSprite) {
            this.state.scene.pixiRef.stage.removeChild(this.castleSprite);
            this.castleSprite.destroy();
        }
    }

    private initCastleSprite() {
        this.castleSprite = new Sprite(this.texture.normal);
        this.castleSprite.anchor.set(0.5);
        this.castleSprite.zIndex = Game.zIndex.ground;
        this.state.scene.pixiRef.stage.addChild(this.castleSprite);
    }

    protected renderSelf(): void {
        if (this.state.isAlive()) {
            if (!this.castleSprite) {
                this.initCastleSprite()
            }
            this.castleSprite!.x = this.state.pos.x * this.state.scene.renderScale;
            this.castleSprite!.y = this.state.pos.y * this.state.scene.renderScale;
            this.castleSprite!.scale.set(.1 * this.state.scene.renderScale);
            if (this.state.hasNearbyPlayers()) {
                this.castleSprite!.texture = this.texture.highlight;
            } else {
                this.castleSprite!.texture = this.texture.normal;
            }
        } else {
            if (this.castleSprite !== null) {
                this.castleSprite.visible = false;
            }
        }
    }

    protected renderStatsBar(): void {
        if (this.healthSprite === null) {
            this.healthSprite = new Graphics();
            this.healthSprite.zIndex = Game.zIndex.ground;
            this.state.scene.pixiRef.stage.addChild(this.healthSprite);
        }
        if (!this.castleSprite) {
            this.castleSprite = new Sprite(this.texture.normal);
            this.castleSprite.anchor.set(0.5);
            this.castleSprite.zIndex = Game.zIndex.ground;
            this.state.scene.pixiRef.stage.addChild(this.castleSprite);
        }
        this.healthSprite.clear();
        if (!this.state.isAlive()) return;

        const healthRatio = this.state.health / this.state.maxHealth;

        this.healthSprite
            .moveTo(
                this.state.pos.x * this.state.scene.renderScale - this.castleSprite.width / 2,
                this.state.pos.y * this.state.scene.renderScale  - this.castleSprite.height / 2 - 5)
            .lineTo(
                this.state.pos.x * this.state.scene.renderScale - this.castleSprite.width / 2 + (this.castleSprite.width * healthRatio),
                this.state.pos.y * this.state.scene.renderScale - this.castleSprite.height / 2 - 5)
            .stroke({
                color: this.state.team!.color,
                alpha: .8,
                width: 2
            })
    }

    protected renderAttack() {

    }
}