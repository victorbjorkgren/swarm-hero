import {Vector2D} from "../Utility";
import {PlayerServer} from "./PlayerServer";
import {Team, TexturePack} from "../../types/types";
import HeroGameLoopServer, {CastleID, ClientID, EntityID} from "../HeroGameLoopServer";
import {Application, Graphics, Sprite} from "pixi.js";
import {Spells, SpellPack} from "../../types/spellTypes";
import {gameConfig, SpellPacks} from "../../config";
import {CastleBase} from "./CastleBase";

export class CastleServer extends CastleBase {
    public owner: ClientID | null = null;

    private castleSprite: Sprite | null = null;
    private healthSprite: Graphics | null = null;

    public sqActivationDist: number = gameConfig.castleActivationDist ** 2;
    public nearbyPlayers: PlayerServer[] = [];
    // private pixiRef: Application;
    // private texture: TexturePack

    public targetedBy: EntityID[] = [];

    constructor(
        public id: CastleID,
        public team: Team,
        public pos: Vector2D,
        private scene: HeroGameLoopServer,
    ) {
        super();
        this.team.castleIds.push(id);
        // this.pos = team.castleCentroid;
        // this.team.castles.push(this);
        // this.pixiRef = scene.pixiRef;
        // this.texture = scene.castleTexturePack!;
    }

    receiveDamage(damage: number): void {
        this.health = this.health - damage;
    }

    getFiringPos(from: Vector2D): Vector2D {
        return this.pos;
    }

    isAlive(): boolean {
        return this.health > 0;
    }

    checkPlayers() {
        this.nearbyPlayers = this.nearbyPlayers.filter(player => Vector2D.sqDist(player.pos, this.pos) < this.sqActivationDist);
        for (const playerIds of this.team.playerIds) {
            if (Vector2D.sqDist(player.pos, this.pos) < this.sqActivationDist) {
                if (!player.isLocal) {
                    player.popUpCastle = this;
                }
                this.nearbyPlayers.push(player);
            } else {
                if (!player.isLocal) {
                    player.popUpCastle = null;
                }
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
                this.castleSprite.zIndex = HeroGameLoopServer.zIndex.ground;
                this.pixiRef.stage.addChild(this.castleSprite);
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
            this.healthSprite.zIndex = HeroGameLoopServer.zIndex.ground;
            this.scene.pixiRef.stage.addChild(this.healthSprite);
        }
        if (!this.castleSprite) {
            this.castleSprite = new Sprite(this.texture.normal);
            this.castleSprite.anchor.set(0.5);
            this.castleSprite.zIndex = HeroGameLoopServer.zIndex.ground;
            this.pixiRef.stage.addChild(this.castleSprite);
        }
        this.healthSprite.clear();
        if (!this.isAlive()) return;

        const healthRatio = this.health / this.maxHealth;

        this.healthSprite
            .moveTo(this.pos.x * this.scene.renderScale - this.castleSprite.width / 2, this.pos.y * this.scene.renderScale  - this.castleSprite.height / 2 - 5)
            .lineTo(this.pos.x * this.scene.renderScale - this.castleSprite.width / 2 + (this.castleSprite.width * healthRatio), this.pos.y * this.scene.renderScale - this.castleSprite.height / 2 - 5)
            .stroke({
                color: this.team.color,
                alpha: .8,
                width: 2
            })
    }

    renderAttack() {

    }
}