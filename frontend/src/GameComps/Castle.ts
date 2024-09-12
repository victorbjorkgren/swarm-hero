import {Entity, Team, Vector2D} from "./Utility";

export class Castle implements Entity {
    public pos: Vector2D;
    health: number = 10;
    mass: number = 100000;
    radius: number = 20;
    vel: Vector2D = Vector2D.zeros();
    private castleSprite: Phaser.GameObjects.Image | null = null;

    constructor(
        private team: Team,
        private scene: Phaser.Scene,
        private texture: string
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

    render(): void {
        if (this.isAlive()) {
            if (!this.castleSprite) {
                this.castleSprite = this.scene.add.image(this.pos.x, this.pos.y, 'castle');
                this.castleSprite.scale = .1;
            }
            this.castleSprite.setPosition(this.pos.x, this.pos.y);  // Update the position if necessary
        } else if (this.castleSprite) {
            this.castleSprite.destroy();
            this.castleSprite = null;
        }
    }

}