import {EntityBase, EntityTypes, Team, TexturePack} from "../../types/types";
import {HeroGameLoopClient} from "../HeroGameLoopClient";
import {Vector2D} from "../Utility";
import {Graphics, Sprite} from "pixi.js";
import {CastleID, ClientID, ServerMessageType} from "@shared/commTypes";
import {gameConfig, SpellPacks} from "@shared/config";
import {ParticleClient} from "./ParticleClient";
import {SpellPack, Spells} from "../../types/spellTypes";

export class CastleClient implements EntityBase {
    private castleSprite: Sprite | null = null;
    private healthSprite: Graphics | null = null;
    private texture: TexturePack;

    vel: Vector2D = Vector2D.zeros();
    radius: number = 20;
    mass: number = Infinity;
    maxHealth: number = gameConfig.castleHealth;
    health: number = gameConfig.castleHealth;
    givesIncome: number = gameConfig.castleIncome;
    targetedBy: ParticleClient[] = [];

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
        protected scene: HeroGameLoopClient
    ) {
        this.team!.castleIds.push(id);
        if (!scene.castleTexturePack) throw new Error("Could not find a castleTexturePack");
        this.texture = scene.castleTexturePack
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

    checkPlayers() {
        this.nearbyPlayers = this.nearbyPlayers.filter(playerId => this.playerWithinRange(playerId));
        for (const playerId of this.team!.playerIds) {
            const player = this.scene.players.get(playerId);
            if (!player) continue;
            if (Vector2D.sqDist(player.pos, this.pos) < this.sqActivationDist) {
                // if (!player.isLocal) {
                //     player.popUpCastle = this;
                // }
                this.nearbyPlayers.push(player.id);
                // } else {
                //     if (!player.isLocal) {
                //         player.popUpCastle = null;
                //     }
            }
        }
        return this.nearbyPlayers.length > 0;
    }

    render() {
        this.renderSelf();
        this.renderAttack();
        this.renderStatsBar();
    }

    renderSelf(): void {
        if (this.isAlive()) {
            if (!this.castleSprite) {
                this.castleSprite = new Sprite(this.texture.normal);
                this.castleSprite.anchor.set(0.5);
                this.castleSprite.zIndex = HeroGameLoopClient.zIndex.ground;
                this.scene.pixiRef.stage.addChild(this.castleSprite);
            }
            this.castleSprite.x = this.pos.x * this.scene.renderScale;
            this.castleSprite.y = this.pos.y * this.scene.renderScale;
            this.castleSprite.scale.set(.1 * this.scene.renderScale);
            if (this.checkPlayers()) {
                this.castleSprite.texture = this.texture.highlight;
            } else {
                this.castleSprite.texture = this.texture.normal;
            }
        } else {
            if (this.castleSprite !== null) {
                this.castleSprite.visible = false;
            }
        }
    }

    renderStatsBar(): void {
        if (this.healthSprite === null) {
            this.healthSprite = new Graphics();
            this.healthSprite.zIndex = HeroGameLoopClient.zIndex.ground;
            this.scene.pixiRef.stage.addChild(this.healthSprite);
        }
        if (!this.castleSprite) {
            this.castleSprite = new Sprite(this.texture.normal);
            this.castleSprite.anchor.set(0.5);
            this.castleSprite.zIndex = HeroGameLoopClient.zIndex.ground;
            this.scene.pixiRef.stage.addChild(this.castleSprite);
        }
        this.healthSprite.clear();
        if (!this.isAlive()) return;

        const healthRatio = this.health / this.maxHealth;

        this.healthSprite
            .moveTo(this.pos.x * this.scene.renderScale - this.castleSprite.width / 2, this.pos.y * this.scene.renderScale  - this.castleSprite.height / 2 - 5)
            .lineTo(this.pos.x * this.scene.renderScale - this.castleSprite.width / 2 + (this.castleSprite.width * healthRatio), this.pos.y * this.scene.renderScale - this.castleSprite.height / 2 - 5)
            .stroke({
                color: this.team!.color,
                alpha: .8,
                width: 2
            })
    }

    renderAttack() {

    }

    receiveDamage(damage: number): void {
        this.health = this.health - damage;
        if (!this.isAlive()) {
            this.broadcastDeath();
        }
    }

    onDeath(): void {
        if (this.castleSprite) {
            this.scene.pixiRef.stage.removeChild(this.castleSprite);
            this.castleSprite.destroy();
        }
    }

    broadcastDeath(): void {
        // Host Event
        if (this.scene.server) {
            this.scene.server.broadcast(
                ServerMessageType.EntityDeath,
                {
                    departed: this.id,
                    departedType: EntityTypes.Castle,
                }
            )
        }
    }

}