import {ParticleSystem, Team} from "./ParticleSystem";
import {Vector2D, Polygon} from "./Utility";
import {Player} from "./Player";

let particleSystem: ParticleSystem;
let cursors: Phaser.Types.Input.Keyboard.CursorKeys;
let teams: Team[];
let players: Player[] = [];

export const preload = function(this: Phaser.Scene) {};

export const create = function(this: Phaser.Scene) {
    (this as any).graphics = this.add.graphics();
    cursors = (this as any).input.keyboard.createCursorKeys();

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
        {id: 0, color: 0xff0000, centroid: new Vector2D(.25 * this.scale.width, .5 * this.scale.height)},
        {id: 1, color: 0xffffff, centroid: new Vector2D(.75 * this.scale.width, .5 * this.scale.height)}
    ]

    players.push(new Player(teams[0], this, cursors, true));
    players.push(new Player(teams[1], this, cursors, false));

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

        players.forEach(player => {player.render()})
        particleSystem.update();
        particleSystem.render();
    }
};