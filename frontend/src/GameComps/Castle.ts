import {Vector2D} from "./Utility";
import {Player} from "./Player";
import {Entity, Team, TexturePack} from "../types/types";
import {Particle} from "./Particle";

export class Castle implements Entity {
    public pos: Vector2D;
    health: number = 10;
    mass: number = 100000;
    radius: number = 20;
    vel: Vector2D = Vector2D.zeros();
    private castleSprite: Phaser.GameObjects.Image | null = null;
    private isActive: boolean = false;
    private sqActivationDist: number = 70 ** 2;
    public nearbyPlayers: Player[] = [];
    public garrison: Particle[] = []

    constructor(
        private team: Team,
        private scene: Phaser.Scene,
        private texture: TexturePack
    ) {
        this.pos = team.castleCentroid;
        this.team.castles.push(this);
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

    render(): void {
        if (this.isAlive()) {
            if (!this.castleSprite) {
                this.castleSprite = this.scene.add.image(this.pos.x, this.pos.y, this.texture.normal);
                this.castleSprite.scale = .1;
            }
            this.castleSprite.setPosition(this.pos.x, this.pos.y);  // Update the position if necessary
            if (this.checkPlayers()) {
                this.castleSprite.setTexture(this.texture.highlight);
            } else {
                this.castleSprite.setTexture(this.texture.normal);
            }
        } else if (this.castleSprite) {
            this.castleSprite.destroy();
            this.castleSprite = null;
        }
    }

}