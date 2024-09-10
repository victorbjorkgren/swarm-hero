import {Polygon, Vector2D} from "./Utility";
import {Team} from "./ParticleSystem";

export class Player {
    public collider: Polygon;

    constructor(
        private team: Team,
        private scene: Phaser.Scene,
        private cursorKeys: Phaser.Types.Input.Keyboard.CursorKeys,
        private controllable: boolean
    ) {
        this.collider = {
            verts: [
                new Vector2D(this.team.centroid.x-20, this.team.centroid.y-20),
                new Vector2D(this.team.centroid.x-20, this.team.centroid.y+20),
                new Vector2D(this.team.centroid.x+20, this.team.centroid.y+20),
                new Vector2D(this.team.centroid.x+20, this.team.centroid.y-20),
            ],
            isInside: false
        }
    }

    render() {
        const graphics = (this.scene as any).graphics;

        if (graphics) {
            graphics.fillStyle(this.team.color, 1);
            graphics.fillRect(
                this.team.centroid.x-20,
                this.team.centroid.y-20,
                40, 40
            );
        }
        else {
            console.log('Player has no scene graphics!')
        }
    }

}