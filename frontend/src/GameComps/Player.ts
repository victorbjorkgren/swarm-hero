import {closestPointOnPolygon, ControllerMapping, Entity, Polygon, Team, Vector2D} from "./Utility";

export class Player implements Entity {
    public collider: Polygon;
    public pos: Vector2D;
    public vel: Vector2D = Vector2D.zeros();
    public acc: Vector2D = Vector2D.zeros();
    private maxAcc: number = 0.1;
    private maxVel: number = 1.0;
    // private keyBindings: { [key: string]: Phaser.Input.Keyboard.Key };
    private keyBindings: ControllerMapping | undefined;
    public health: number = 1000;

    constructor(
        private team: Team,
        private scene: Phaser.Scene,
    ) {
        this.pos = team.centroid;
        this.collider = this.calcCollider();
        this.keyBindings = team.controllerMapping;
        this.team.players.push(this);
    }

    calcCollider(): Polygon {
        return {
            verts: [
                new Vector2D(this.pos.x-20, this.pos.y-20),
                new Vector2D(this.pos.x-20, this.pos.y+20),
                new Vector2D(this.pos.x+20, this.pos.y+20),
                new Vector2D(this.pos.x+20, this.pos.y-20),
            ],
            attackable: true,
        }
    }

    isAlive(): boolean {
        return this.health > 0;
    }

    getFiringPos(from: Vector2D): Vector2D {
        return closestPointOnPolygon(this.collider.verts, from);
    }

    render() {
        const graphics = (this.scene as any).graphics;

        if (graphics) {
            graphics.fillStyle(this.team.color, 1);
            graphics.fillRect(
                this.pos.x-20,
                this.pos.y-20,
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
        this.pos.add(this.vel);
        this.collider = this.calcCollider();
    }

}