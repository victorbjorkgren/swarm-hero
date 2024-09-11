import {Polygon, Vector2D} from "./Utility";
import {ControllerMapping, Team} from "./ParticleSystem";

export class Player {
    public collider: Polygon;
    public vel: Vector2D = Vector2D.zeros();
    public acc: Vector2D = Vector2D.zeros();
    private maxAcc: number = 0.1;
    private maxVel: number = 1.0;
    // private keyBindings: { [key: string]: Phaser.Input.Keyboard.Key };
    private keyBindings: ControllerMapping | undefined;

    constructor(
        private team: Team,
        private scene: Phaser.Scene,
    ) {
        this.collider = this.calcCollider()
        this.keyBindings = team.controllerMapping;
    }

    calcCollider(): Polygon {
        return {
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

    movement() {
        if (!this.keyBindings) return;
        let controlling = false;
        this.acc = Vector2D.zeros();
        if (this.keyBindings.left.isDown) {
            this.acc.x -= this.maxAcc;
            controlling = true;
        }
        if (this.keyBindings.right.isDown) {
            this.acc.x += this.maxAcc;
            controlling = true;
        }
        if (this.keyBindings.up.isDown) {
            this.acc.y -= this.maxAcc;
            controlling = true;
        }
        if (this.keyBindings.down.isDown) {
            this.acc.y += this.maxAcc;
            controlling = true;
        }
        if (!controlling) {
            this.vel.scale(.9);
        } else {
            this.acc.limit(this.maxAcc);
            this.vel.add(this.acc);
            this.vel.limit(this.maxVel);
        }
        this.team.centroid.add(this.vel);
        this.collider = this.calcCollider();
    }

}