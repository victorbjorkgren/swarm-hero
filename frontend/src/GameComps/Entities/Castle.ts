import {EntityBase, EntityTypes, Team, TexturePack} from "../../types/types";
import {Game} from "../Game";
import {Vector2D} from "../Utility";
import {Graphics, Sprite} from "pixi.js";
import {CastleID, ClientID} from "@shared/commTypes";
import {gameConfig, SpellPacks} from "@shared/config";
import {Particle} from "./Particle";
import {SpellPack, Spells} from "../../types/spellTypes";

export class CastleState implements EntityBase {
    private renderer: CastleRenderer;
    private logic: CastleLogic;
    public interface: CastleInterface;

    vel: Vector2D = Vector2D.zeros();
    radius: number = 20;
    mass: number = Infinity;
    maxHealth: number = gameConfig.castleHealth;
    health: number = gameConfig.castleHealth;
    givesIncome: number = gameConfig.castleIncome;
    targetedBy: Particle[] = [];

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
        this.team!.castleIds.push(id);

        this.renderer = new CastleRenderer(this);
        this.logic = new CastleLogic(this);
        this.interface = new CastleInterface(this);
    }

    isAlive(): boolean {
        return this.health > 0;
    }

    getFiringPos(from: Vector2D): Vector2D {
        return this.pos;
    }

    playerWithinRange(playerId: ClientID): boolean {
        const player = this.scene.players.get(playerId);
        if (!player || !player.isAlive()) return false;
        if (!this.isAlive()) return false;
        return Vector2D.sqDist(player.pos, this.pos) < this.sqActivationDist
    }

    hasNearbyPlayers() {
        return this.nearbyPlayers.length > 0
    }

    update() {
        this.logic.update();
        this.renderer.update();
    }

    onDeath(): void {
        this.renderer.cleanUp();
    }
}

class CastleInterface {
    constructor(private state: CastleState) {}

    receiveDamage(damage: number): void {
        this.state.health = this.state.health - damage;
        if (!this.state.isAlive()) {
            this.state.scene.broadcastDeath(this.state.id, EntityTypes.Castle);
        }
    }
}

class CastleLogic {
    constructor(private state: CastleState) {}

    update() {
        this.checkPlayers();
    }

    private checkPlayers() {
        this.state.nearbyPlayers = this.state.nearbyPlayers.filter(playerId => this.state.playerWithinRange(playerId));
        for (const playerId of this.state.team!.playerIds) {
            const player = this.state.scene.players.get(playerId);
            if (!player) continue;
            if (Vector2D.sqDist(player.pos, this.state.pos) < this.state.sqActivationDist) {
                this.state.nearbyPlayers.push(player.id);
            }
        }
    }
}

class CastleRenderer {
    private castleSprite: Sprite | null = null;
    private healthSprite: Graphics | null = null;
    private texture: TexturePack;

    constructor(
        private parent: CastleState
    ) {
        if (!parent.scene.castleTexturePack) throw new Error("Could not find a castleTexturePack");
        this.texture = parent.scene.castleTexturePack
    }

    update() {
        this.renderSelf();
        this.renderAttack();
        this.renderStatsBar();
    }

    cleanUp(): void {
        if (this.castleSprite) {
            this.parent.scene.pixiRef.stage.removeChild(this.castleSprite);
            this.castleSprite.destroy();
        }
    }

    private initCastleSprite() {
        this.castleSprite = new Sprite(this.texture.normal);
        this.castleSprite.anchor.set(0.5);
        this.castleSprite.zIndex = Game.zIndex.ground;
        this.parent.scene.pixiRef.stage.addChild(this.castleSprite);
    }

    private renderSelf(): void {
        if (this.parent.isAlive()) {
            if (!this.castleSprite) {
                this.initCastleSprite()
            }
            this.castleSprite!.x = this.parent.pos.x * this.parent.scene.renderScale;
            this.castleSprite!.y = this.parent.pos.y * this.parent.scene.renderScale;
            this.castleSprite!.scale.set(.1 * this.parent.scene.renderScale);
            if (this.parent.hasNearbyPlayers()) {
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

    private renderStatsBar(): void {
        if (this.healthSprite === null) {
            this.healthSprite = new Graphics();
            this.healthSprite.zIndex = Game.zIndex.ground;
            this.parent.scene.pixiRef.stage.addChild(this.healthSprite);
        }
        if (!this.castleSprite) {
            this.castleSprite = new Sprite(this.texture.normal);
            this.castleSprite.anchor.set(0.5);
            this.castleSprite.zIndex = Game.zIndex.ground;
            this.parent.scene.pixiRef.stage.addChild(this.castleSprite);
        }
        this.healthSprite.clear();
        if (!this.parent.isAlive()) return;

        const healthRatio = this.parent.health / this.parent.maxHealth;

        this.healthSprite
            .moveTo(
                this.parent.pos.x * this.parent.scene.renderScale - this.castleSprite.width / 2,
                this.parent.pos.y * this.parent.scene.renderScale  - this.castleSprite.height / 2 - 5)
            .lineTo(
                this.parent.pos.x * this.parent.scene.renderScale - this.castleSprite.width / 2 + (this.castleSprite.width * healthRatio),
                this.parent.pos.y * this.parent.scene.renderScale - this.castleSprite.height / 2 - 5)
            .stroke({
                color: this.parent.team!.color,
                alpha: .8,
                width: 2
            })
    }

    private renderAttack() {

    }
}