import {ParticleBase} from "./ParticleBase";
import {EntityBase, EntityClient, Team} from "../../types/types";
import {massToRadius, randomUnitVector, Vector2D} from "../Utility";
import {HeroGameLoopBase} from "../HeroGameLoopBase";
import {UnitPack} from "../../types/unitTypes";
import {UnitManager} from "../UnitManager";
import HeroGameLoopServer, {ParticleID} from "../HeroGameLoopServer";
import {HeroGameLoopClient} from "../HeroGameLoopClient";
import {Graphics} from "pixi.js";

export class ParticleClient extends ParticleBase implements EntityClient {
    constructor(
        public pos: Vector2D,
        public mass: number,
        public team: Team,
        public maxVel: number = 1,
        public color: number,
        protected scene: HeroGameLoopClient,
        public groupID: number,
        public unitInfo: UnitPack,
        public owner: EntityBase,
        protected unitManager: UnitManager,
        public id: ParticleID,
    ) {
        super(pos,mass,team,maxVel,color,scene,groupID,unitInfo,owner,unitManager,id)
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

    override onDeath() {
        this.unitManager.remove(this);
        this.killSprites();
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
            this.particleSprite.zIndex = HeroGameLoopClient.zIndex.flyers;
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
            this.healthSprite.zIndex = HeroGameLoopClient.zIndex.flyers;
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
}