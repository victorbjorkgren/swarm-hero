import {Team, TexturePack} from "../../types/types";
import {HeroGameLoopClient} from "../HeroGameLoopClient";
import HeroGameLoopServer from "../HeroGameLoopServer";
import {Vector2D} from "../Utility";
import {CastleBase} from "./CastleBase";
import {PlayerClient} from "./PlayerClient";
import {Graphics, Sprite} from "pixi.js";
import {CastleID, ClientID} from "@shared/commTypes";

export class CastleClient extends CastleBase {
    private castleSprite: Sprite | null = null;
    private healthSprite: Graphics | null = null;
    private texture: TexturePack;

    constructor(
        public id: CastleID,
        public pos: Vector2D,
        public team: Team,
        public owner: ClientID,
        protected scene: HeroGameLoopClient
    ) {
        super(id, team, pos, owner, scene);
        if (!scene.castleTexturePack) throw new Error("Could not find a castleTexturePack");
        this.texture = scene.castleTexturePack
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

    onDeath(): void {
    }

}