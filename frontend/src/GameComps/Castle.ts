import {Vector2D} from "./Utility";
import {Player} from "./Player";
import {Entity, Spells, Team, TexturePack} from "../types/types";
import {Particle} from "./Particle";
import HeroGameLoop from "./HeroGameLoop";
import {Application, Graphics, Sprite} from "pixi.js";
import {SpellPack, SpellPacks} from "../UI-Comps/SpellPicker";

export class Castle implements Entity {
    public pos: Vector2D;
    public mass: number = 100000;
    public radius: number = 20;
    public vel: Vector2D = Vector2D.zeros();
    public givesIncome: number = 1000;
    private maxHealth: number = 400;
    public health: number = this.maxHealth;

    private castleSprite: Sprite | null = null;
    private healthSprite: Graphics | null = null;

    public sqActivationDist: number = 70 ** 2;
    public nearbyPlayers: Player[] = [];
    private pixiRef: Application;
    private texture: TexturePack

    public garrison: Particle[] = [];
    public myDrones: Particle[] = [];
    public targetedBy: Entity[] = [];

    public availableSpells: SpellPack[] = [
        SpellPacks[Spells.Explosion],
        SpellPacks[Spells.LaserBurst]
    ];

    constructor(
        public team: Team,
        private scene: HeroGameLoop,
    ) {
        this.pos = team.castleCentroid;
        this.team.castles.push(this);
        this.pixiRef = scene.pixiRef;
        this.texture = scene.castleTexturePack!;
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
        this.nearbyPlayers = [];
        for (const player of this.team.players) {
            if (Vector2D.sqDist(player.pos, this.pos) < this.sqActivationDist) {
                this.nearbyPlayers.push(player);
            }
        }
        return this.nearbyPlayers.length > 0;
    }

    render() {
        this.renderSelf();
        this.renderAttack();
        this.renderHealthBar();
    }

    renderSelf(): void {
        if (this.isAlive()) {
            if (!this.castleSprite) {
                this.castleSprite = new Sprite(this.texture.normal);
                this.castleSprite.scale = .1;
                this.castleSprite.zIndex = HeroGameLoop.zIndex.ground;
                this.pixiRef.stage.addChild(this.castleSprite);
            }
            this.castleSprite.x = this.pos.x;
            this.castleSprite.y = this.pos.y;
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

    renderHealthBar(): void {
        if (this.healthSprite === null) {
            this.healthSprite = new Graphics();
            this.healthSprite.zIndex = HeroGameLoop.zIndex.ground;
            this.scene.pixiRef.stage.addChild(this.healthSprite);
        }
        if (!this.castleSprite) {
            this.castleSprite = new Sprite(this.texture.normal);
            this.castleSprite.scale = .1;
            this.castleSprite.zIndex = HeroGameLoop.zIndex.ground;
            this.pixiRef.stage.addChild(this.castleSprite);
        }
        this.healthSprite.clear();
        if (!this.isAlive()) return;

        const healthRatio = this.health / this.maxHealth;

        this.healthSprite
            .moveTo(this.pos.x, this.pos.y - 5)
            .lineTo(this.pos.x + (this.castleSprite.width * healthRatio), this.pos.y - 5)
            .stroke({
                color: this.team.color,
                alpha: .8,
                width: 2
            })
    }

    renderAttack() {

    }
}