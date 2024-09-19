import {ParticleSystem} from "./ParticleSystem";
import {Vector2D} from "./Utility";
import {Player} from "./Player";
import {Castle} from "./Castle";
import {Entity, Polygon, PolygonalCollider, popUpEvent, Team} from "../types/types";
import React from "react";

export interface ReactVars {
    setPlayerPopOpen: React.Dispatch<React.SetStateAction<popUpEvent | undefined>>;
    winner: string | undefined;
    setWinner: React.Dispatch<React.SetStateAction<string | undefined>>;
    playersRef: React.MutableRefObject<Player[]>;
}

export class HeroScene extends Phaser.Scene {
    players: Player[] = [];
    teams: Team[] = [];
    castles: Castle[] = [];
    graphics:  Phaser.GameObjects.Graphics | undefined
    particleSystem: ParticleSystem | undefined = undefined;
    gameOn: boolean = true;
    setPlayerPopOpen: React.Dispatch<React.SetStateAction<popUpEvent | undefined>> | undefined = undefined;
    winner: string | undefined
    setWinner: React.Dispatch<React.SetStateAction<string | undefined>> | undefined = undefined;
    startTime: number | undefined

    constructor() {
        super({ key: 'HeroScene' });
    }

    registerReactVars(vars: ReactVars) {
        this.setPlayerPopOpen = vars.setPlayerPopOpen;
        this.setWinner = vars.setWinner;
        this.winner = vars.winner;
        vars.playersRef.current = this.players;
    }

    endGame() {
        this.gameOn = false;
    }

    resumeGame() {
        this.gameOn = true;
    }

    onDeath(id: string) {
        if (this.setWinner === undefined) return
        this.setWinner(id);
        this.endGame();
    }

    preload() {
        this.load.image('castle', 'castle-sprite.png')
        this.load.image('castle-highlight', 'castle-sprite-highlight.png')
        this.players = [];
        this.teams = [];
        this.castles = [];
    };

    create() {
        this.graphics = this.add.graphics();
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
                castleCentroid: new Vector2D(this.scale.width/8, this.scale.height/2),
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

        this.players.push(new Player(this.teams[0], this));
        this.players.push(new Player(this.teams[1], this));
        this.castles.push(new Castle(this.teams[0], this, castleTextures));
        this.castles.push(new Castle(this.teams[1], this, castleTextures))
        // const colliders: PolygonalCollider[] = [players[0], players[1], {collider: boundPoly}];
        const colliders: PolygonalCollider[] = [{collider: boundPoly, vel: Vector2D.zeros()}];

        this.particleSystem = new ParticleSystem(10, this.teams, this, colliders);
        for (const player of this.players) {
            player.setParticleSystem(this.particleSystem);
        }

        this.events.emit('sceneReady');
    };

    update() {
        if (!this.gameOn) return

        if (this.startTime === undefined)
            this.startTime = this.time.now;
        const elapsedTime = (this.time.now - this.startTime) / 1000;

        const graphics = this.graphics;

        if (!graphics) return
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

        if (this.particleSystem === undefined) return
        this.particleSystem.update();
        this.particleSystem.render();
    };
}


