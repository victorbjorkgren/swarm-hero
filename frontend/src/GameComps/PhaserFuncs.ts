import {ParticleSystem} from "./ParticleSystem";
import {Vector2D} from "./Utility";
import {Player} from "./Player";
import {Castle} from "./Castle";
import {Entity, Polygon, PolygonalCollider, Team} from "../types/types";

let particleSystem: ParticleSystem;
// let teams: Team[];
// let players: Player[] = [];
// let castles: Castle[] = []

const endGame = () => {
    gameOn = false;
}

export const resumeGame = () => {
    gameOn = true;
}

let gameOn = true;

export const preload = function(this: Phaser.Scene) {
    this.load.image('castle', 'castle-sprite.png')
    this.load.image('castle-highlight', 'castle-sprite-highlight.png')
    this.players = [];
    this.teams = [];
    this.castles = [];
};

export const create = function(this: Phaser.Scene) {
    (this as any).graphics = this.add.graphics();
    this.players = [];
    this.castles = [];

    const castleTextures = {
        normal: 'castle',
        highlight: 'castle-highlight',
    }

    const player1Keys = (this as any).input.keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        down: Phaser.Input.Keyboard.KeyCodes.S,
        right: Phaser.Input.Keyboard.KeyCodes.D,
        buy: Phaser.Input.Keyboard.KeyCodes.E,
    });
    const player2Keys = (this as any).input.keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.UP,
        left: Phaser.Input.Keyboard.KeyCodes.LEFT,
        down: Phaser.Input.Keyboard.KeyCodes.DOWN,
        right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
        buy: Phaser.Input.Keyboard.KeyCodes.PERIOD,
    });

    const boundPoly: Polygon = {
        verts: [
            new Vector2D(0, 0),
            new Vector2D(this.scale.width, 0),
            new Vector2D(this.scale.width, this.scale.height),
            new Vector2D(0, this.scale.height)
        ],
        attackable: false,
        isInside: true,
    }

    this.teams = [
        {
            id: 0,
            color: 0xff0000,
            playerCentroid: new Vector2D(.25 * this.scale.width, .5 * this.scale.height),
            castleCentroid: new Vector2D(this.scale.width/8, (this as any).scale.height/2),
            controllerMapping: player1Keys,
            players: [],
            castles: []
        },
        {
            id: 1,
            color: 0xffffff,
            playerCentroid: new Vector2D(.75 * this.scale.width, .5 * this.scale.height),
            castleCentroid: new Vector2D(this.scale.width*7/8, this.scale.height/2),
            controllerMapping: player2Keys,
            players: [],
            castles: []
        }
    ]

    const onDeath = (id: string, scene: Phaser.Scene) => {
        (scene as any).setWinner(id);
        endGame();
    }

    this.players.push(new Player(this.teams[0], this, onDeath));
    this.players.push(new Player(this.teams[1], this, onDeath));
    this.castles.push(new Castle(this.teams[0], this, castleTextures));
    this.castles.push(new Castle(this.teams[1], this, castleTextures))
    // const colliders: PolygonalCollider[] = [players[0], players[1], {collider: boundPoly}];
    const colliders: PolygonalCollider[] = [{collider: boundPoly, vel: Vector2D.zeros()}];

    particleSystem = new ParticleSystem(10, this.teams, this, colliders);
    for (const player of this.players) {
        player.setParticleSystem(particleSystem);
    }

};

export const update = function(this: Phaser.Scene) {
    if (!gameOn) return

    // Access the graphics object stored on the scene
    const graphics = (this as any).graphics;

    if (!graphics) return
    // Clear the previous drawings
    graphics.clear();

    graphics.fillStyle(0x000000, 1);
    graphics.fillRect(0, 0, this.scale.width, this.scale.height);

    this.teams.forEach(team => {
        team.players.forEach(player => {
            player.movement();
            player.render();
        });
        team.castles.forEach(castle => {
            castle.render();
        })
    });

    particleSystem.update();
    particleSystem.render();
};