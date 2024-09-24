import {ParticleSystem} from "./ParticleSystem";
import {Vector2D} from "./Utility";
import {Player} from "./Player";
import {Castle} from "./Castle";
import {ControllerMapping, Polygon, PolygonalCollider, popUpEvent, Team, TexturePack} from "../types/types";
import React from "react";
import {Application, Assets, Graphics, Sprite} from "pixi.js";

export interface ReactVars {
    setPlayerPopOpen: React.Dispatch<React.SetStateAction<popUpEvent | undefined>>;
    winner: string | undefined;
    setWinner: React.Dispatch<React.SetStateAction<string | undefined>>;
    playersRef: React.MutableRefObject<Player[]>;
}

export default class HeroGameLoop {
    public players: Player[] = [];
    public teams: Team[] = [];
    public castles: Castle[] = [];
    public graphics:  Graphics | undefined
    public particleSystem: ParticleSystem | undefined = undefined;
    public startTime: number | undefined
    public castleTexturePack: TexturePack | null = null;

    private dayLength: number = 10; // seconds

    private gameOn: boolean = true;
    private readonly sceneWidth: number;
    private readonly sceneHeight: number;

    constructor(
        public pixiRef: Application,
        private setWinner: React.Dispatch<React.SetStateAction<string | undefined>>,
        private winner: string | undefined,
        public setPlayerPopOpen: React.Dispatch<React.SetStateAction<popUpEvent | undefined>>,
        private playersRef: React.MutableRefObject<Player[]>,
        private setDayTime: React.Dispatch<React.SetStateAction<number>>,
    ) {
        this.sceneWidth = pixiRef.canvas.width;
        this.sceneHeight = pixiRef.canvas.height;
    }

    stopGame() {
        this.gameOn = false;
        this.pixiRef.ticker.stop();
    }

    resumeGame() {
        this.gameOn = true;
        this.pixiRef.ticker.start();
    }

    onDeath(id: string) {
        if (this.setWinner === undefined) return
        this.setWinner(id);
        this.stopGame();
    }

    start() {
        this.stopGame();
        this.preload().then(() => {
            this.create();
            this.pixiRef.ticker.add(this.update, this);
            this.resumeGame();
        });
    }

    async preload() {
        const castle = await Assets.load('castle-sprite.png');
        const castleHighlight = await Assets.load('castle-sprite-highlight.png');
        this.castleTexturePack = {
            'normal': castle,
            'highlight': castleHighlight,
        }
        this.players = [];
        this.teams = [];
        this.castles = [];
    };

    create() {
        this.graphics = new Graphics();
        this.players = [];
        this.castles = [];

        const player1Keys: ControllerMapping = {
            up: "KeyW",
            left: "KeyA",
            down: "KeyS",
            right: "KeyD",
            buy: "KeyE",
            special: "KeyO"
        };
        const player2Keys: ControllerMapping = {
            up: "ArrowUp",
            left: "ArrowLeft",
            down: "ArrowDown",
            right: "ArrowRight",
            buy: "Period",
            special: "KeyP",
        };

        const boundPoly: Polygon = {
            verts: [
                new Vector2D(0, 0),
                new Vector2D(this.sceneWidth, 0),
                new Vector2D(this.sceneWidth, this.sceneHeight),
                new Vector2D(0, this.sceneHeight)
            ],
            attackable: false,
            isInside: true,
        }

        this.teams = [
            {
                id: 0,
                color: 0xff0000,
                playerCentroid: new Vector2D(.25 * this.sceneWidth, .5 * this.sceneHeight),
                castleCentroid: new Vector2D(this.sceneWidth/8, this.sceneHeight/2),
                controllerMapping: player1Keys,
                players: [],
                castles: []
            },
            {
                id: 1,
                color: 0xffffff,
                playerCentroid: new Vector2D(.75 * this.sceneWidth, .5 * this.sceneHeight),
                castleCentroid: new Vector2D(this.sceneWidth*7/8, this.sceneHeight/2),
                controllerMapping: player2Keys,
                players: [],
                castles: []
            }
        ]

        this.players.push(new Player(this.teams[0], this));
        this.players.push(new Player(this.teams[1], this));
        this.castles.push(new Castle(this.teams[0], this));
        this.castles.push(new Castle(this.teams[1], this))
        this.players[0].gainCastleControl(this.castles[0]);
        this.players[1].gainCastleControl(this.castles[1]);
        // const colliders: PolygonalCollider[] = [players[0], players[1], {collider: boundPoly}];
        const colliders: PolygonalCollider[] = [{collider: boundPoly, vel: Vector2D.zeros()}];

        this.particleSystem = new ParticleSystem(10, this.teams, this, colliders);
        for (const player of this.players) {
            player.setParticleSystem(this.particleSystem);
        }
        this.playersRef.current = this.players;
    };

    updateDayTime() {
        if (this.startTime === undefined)
            this.startTime = Date.now();
        const elapsedTime = (Date.now() - this.startTime) / 1000;
        if (elapsedTime > this.dayLength) {
            this.startTime = Date.now();
            this.triggerNewDay();
        }
        if (this.setDayTime !== undefined)
            this.setDayTime(elapsedTime / this.dayLength);
    }

    triggerNewDay() {
        this.players.forEach(player => {
            player.newDay();
        })
    }

    update() {
        if (!this.gameOn) return

        this.updateDayTime();

        this.teams.forEach(team => {
            team.players.forEach(player => {
                player.movement();
                player.renderSelf();
                player.renderAttack();
            });
            team.castles.forEach(castle => {
                castle.renderSelf();
                castle.renderAttack();
            })
        });

        if (this.particleSystem === undefined) return
        this.particleSystem.update();
        this.particleSystem.render();
    };
}

