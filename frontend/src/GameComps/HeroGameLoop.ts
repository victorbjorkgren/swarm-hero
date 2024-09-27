import {ParticleSystem} from "./ParticleSystem";
import {Vector2D} from "./Utility";
import {Player} from "./Player";
import {Castle} from "./Castle";
import {
    AABBCollider,
    Controller,
    ControllerMapping,
    DirectionalSpriteSheet,
    Polygon,
    PolygonalCollider,
    popUpEvent,
    Team,
    TexturePack
} from "../types/types";
import React from "react";
import {AnimatedSprite, Application, Assets, Graphics, Sprite} from "pixi.js";
import {LocalPlayerController} from "./Controllers/LocalPlayerController";
import {AIController} from "./Controllers/AIController";

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
    private controllers: Controller[] = [];

    public castleTexturePack: TexturePack | null = null;
    public catSprite: DirectionalSpriteSheet | null = null;

    private dayLength: number = 10; // seconds

    private gameOn: boolean = true;
    public readonly sceneWidth: number;
    public readonly sceneHeight: number;
    colliders: AABBCollider[] = [];

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
        this.pixiRef?.ticker.stop();
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
        const castle = Assets.load('/sprites/castle-sprite.png');
        const castleHighlight = Assets.load('/sprites/castle-sprite-highlight.png');
        const cat = Assets.load('/sprites/black_cat_run.json');

        this.castleTexturePack = {
            'normal': await castle,
            'highlight': await castleHighlight,
        }
        await cat;

        this.players = [];
        this.teams = [];
        this.castles = [];
    };

    resetControllers() {
        this.controllers.forEach(controller => {
            controller.cleanup()
        })
        this.controllers = [];
    }

    create() {
        this.graphics = new Graphics();
        this.players = [];
        this.castles = [];
        this.resetControllers();

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

        const boundaryCollider: AABBCollider = {
            minX: 0,
            minY: 0,
            maxX: this.sceneWidth,
            maxY: this.sceneHeight,
            inverted: true,
        }
        this.colliders = [boundaryCollider];

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
        this.controllers.push(new LocalPlayerController(this.players[0], player1Keys));
        this.controllers.push(new AIController(this.players[1], this.players[0], this));

        this.particleSystem = new ParticleSystem(10, this.teams, this);
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
        if (this.particleSystem === undefined) return

        this.updateDayTime();

        // Updates
        this.particleSystem.update();
        this.controllers.forEach(controller => {
            controller.movement();
        })

        // Renders
        this.players.forEach(player => {
            player.updateMovement();
            player.render();
        })
        this.castles.forEach(castle => {
            castle.render();
        })
        this.particleSystem.render();
    };
}

