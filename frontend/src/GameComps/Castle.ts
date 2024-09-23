import {Vector2D} from "./Utility";
import {Player} from "./Player";
import {Entity, Team, TexturePack} from "../types/types";
import {Particle} from "./Particle";
import HeroGameLoop from "./HeroGameLoop";
import {Application, Sprite} from "pixi.js";

export class Castle implements Entity {
    public pos: Vector2D;
    public health: number = 10;
    public mass: number = 100000;
    public radius: number = 20;
    public vel: Vector2D = Vector2D.zeros();
    public givesIncome: number = 1000;
    private castleSprite: Sprite | null = null;
    private isActive: boolean = false;
    private sqActivationDist: number = 70 ** 2;
    public nearbyPlayers: Player[] = [];
    public garrison: Particle[] = [];
    private pixiRef: Application;
    private texture: TexturePack

    constructor(
        private team: Team,
        private gameScene: HeroGameLoop,
    ) {
        this.pos = team.castleCentroid;
        this.team.castles.push(this);
        this.pixiRef = gameScene.pixiRef;
        this.texture = gameScene.castleTexturePack!;
    }

    getFiringPos(from: Vector2D): Vector2D {
        return this.pos;
    }

    isAlive(): boolean {
        return this.health > 0;
    }

    checkPlayers() {
        this.nearbyPlayers = [];
        for (const player of this.team.players) {
            if (Vector2D.sqDist(player.pos, this.pos) < this.sqActivationDist) {
                this.nearbyPlayers.push(player);
            }
        }
        return this.nearbyPlayers.length > 0;
    }

    renderSelf(): void {
        if (this.isAlive()) {
            if (!this.castleSprite) {
                this.castleSprite = new Sprite(this.texture.normal);
                this.castleSprite.scale = .1;
            }
            this.castleSprite.x = this.pos.x;
            this.castleSprite.y = this.pos.y;
            this.pixiRef.stage.addChild(this.castleSprite);
            if (this.checkPlayers()) {
                this.castleSprite.texture = this.texture.highlight;
            } else {
                this.castleSprite.texture = this.texture.normal;
            }
        } else if (this.castleSprite) {
            this.castleSprite.destroy();
            this.castleSprite = null;
        }
    }

    renderAttack() {

    }

}