import {ParticleSystem, Team} from "./ParticleSystem";
import {Vector2D, Polygon} from "./Utility";
import {Player} from "./Player";

let particleSystem: ParticleSystem;
// let cursors: Phaser.Types.Input.Keyboard.CursorKeys;
let teams: Team[];
let players: Player[] = [];

export const preload = function(this: Phaser.Scene) {};

export const create = function(this: Phaser.Scene) {
    (this as any).graphics = this.add.graphics();
    // cursors = (this as any).input.keyboard.createCursorKeys();

    const player1Keys = (this as any).input.keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        down: Phaser.Input.Keyboard.KeyCodes.S,
        right: Phaser.Input.Keyboard.KeyCodes.D
    });

    const player2Keys = (this as any).input.keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.UP,
        left: Phaser.Input.Keyboard.KeyCodes.LEFT,
        down: Phaser.Input.Keyboard.KeyCodes.DOWN,
        right: Phaser.Input.Keyboard.KeyCodes.RIGHT
    });

    const boundPoly: Polygon = {
        verts: [
            new Vector2D(0, 0),
            new Vector2D(this.scale.width, 0),
            new Vector2D(this.scale.width, this.scale.height),
            new Vector2D(0, this.scale.height)
        ],
        isInside: true
    }



    teams = [
        {
            id: 0,
            color: 0xff0000,
            centroid: new Vector2D(.25 * this.scale.width, .5 * this.scale.height),
            controllerMapping: player1Keys
        },
        {
            id: 1,
            color: 0xffffff,
            centroid: new Vector2D(.75 * this.scale.width, .5 * this.scale.height),
            controllerMapping: player2Keys
        }
    ]

    players.push(new Player(teams[0], this));
    players.push(new Player(teams[1], this));

    const colliders: Polygon[] = [players[0].collider, players[1].collider, boundPoly];

    particleSystem = new ParticleSystem(10, teams, this, colliders);

};

export const update = function(this: Phaser.Scene) {
    // Access the graphics object stored on the scene
    const graphics = (this as any).graphics;

    if (graphics) {
        // Clear the previous drawings
        graphics.clear();
        graphics.fillStyle(0x000000, 1);
        graphics.fillRect(0, 0, this.scale.width, this.scale.height);

        players.forEach(player => {
            player.render();
            player.movement();
        })
        particleSystem.update();
        particleSystem.render();
    }
};