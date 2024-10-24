import {ParticleSystem} from "./ParticleSystem";
import {spriteToAABBCollider, Vector2D} from "./Utility";
import {Player} from "./Player";
import {Castle} from "./Castle";
import {
    AABBCollider,
    Controller,
    ControllerMapping,
    popUpEvent,
    Team,
    TexturePack
} from "../types/types";
import React from "react";
import {
    AnimatedSprite, AnimatedSpriteFrames,
    Application,
    Assets,
    Graphics,
    Sprite,
    Spritesheet,
    Texture
} from "pixi.js";
import {LocalPlayerController} from "./Controllers/LocalPlayerController";
import {AIController} from "./Controllers/AIController";
import {NavMesh} from "./NavMesh";
import DebugDrawer from "../DebugTools/DebugDrawer";
import {setupBackground} from "./Graphics/TileBackground";
import {Character} from "../UI-Comps/CharacterCreation/MainCharacterCreation";
import {Factions} from "../UI-Comps/CharacterCreation/FactionSelection";
import {gameConfig} from "../config";

export interface ReactVars {
    setPlayerPopOpen: React.Dispatch<React.SetStateAction<popUpEvent | undefined>>;
    winner: string | undefined;
    setWinner: React.Dispatch<React.SetStateAction<string | undefined>>;
    playersRef: React.MutableRefObject<Player[]>;
}

export default class HeroGameLoop {
    static zIndex = {
        'environment': 0,
        'ground': 1,
        'flyers': 2,
        'hud': 3,
    }
    public players: Player[] = [];
    public localPlayer: Player | null = null;
    public teams: Team[] = [];
    public castles: Castle[] = [];
    public graphics:  Graphics | undefined
    public particleSystem: ParticleSystem | undefined = undefined;
    public startTime: number | undefined
    private controllers: Controller[] = [];
    public navMesh: NavMesh;
    private cameraPivot: Vector2D = Vector2D.zeros();

    public castleTexturePack: TexturePack | null = null;
    private explosionSprite: AnimatedSpriteFrames | null = null;

    private dayLength: number = gameConfig.dayLength; // seconds

    private gameOn: boolean = true;
    public readonly sceneWidth: number;
    public readonly sceneHeight: number;
    colliders: AABBCollider[] = [];
    public defaultCursorTexture: Texture | null = null;
    public renderScale: number = 1;

    constructor(
        public pixiRef: Application,
        private setWinner: React.Dispatch<React.SetStateAction<string | undefined>>,
        public setPlayerPopOpen: React.Dispatch<React.SetStateAction<popUpEvent | undefined>>,
        private playersRef: React.MutableRefObject<Player[]>,
        private setDayTime: React.Dispatch<React.SetStateAction<number>>,
        private character: Character,
    ) {
        this.sceneWidth = gameConfig.mapWidth;
        this.sceneHeight = gameConfig.mapHeight;
        this.navMesh = new NavMesh(this);
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

    setLocalPlayer(player: Player) {
        this.localPlayer = player;
        player.isLocal = true;
        this.cameraPivot = player.pos.copy();

        this.pixiRef.stage.on('pointermove', (event) => {
            const mousePosition = event.global;
            const worldPosition = this.pixiRef.stage.toLocal(mousePosition);
            player.aimPos.x = worldPosition.x / this.renderScale;
            player.aimPos.y = worldPosition.y / this.renderScale;
        });
        this.pixiRef.stage.on('click', () => {player.castSpell()})
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
        this.players = [];
        this.teams = [];
        this.castles = [];
        this.colliders = [];

        const walls = Assets.load('/sprites/PixelArtTopDownTextures/Walls/wall-sheet.json');
        const explosion = Assets.load('/sprites/explosion_toon.json');

        const castle: Promise<Texture> = Assets.load('/sprites/castle-sprite.png');
        const castleHighlight: Promise<Texture> = Assets.load('/sprites/castle-sprite-highlight.png');
        const cat = Assets.load('/sprites/black_cat_run.json');

        // const defaultCursor: Promise<Texture> = Assets.load('/sprites/kenney_cursor-pack/Vector/Basic/Double/pointer_c.svg');

        const backgroundReady = setupBackground(this.pixiRef, this.sceneWidth, this.sceneHeight);
        const blockersReady = this.setupBlockers(walls);
        const explosionReady = this.setupExplosion(explosion)

        this.castleTexturePack = {
            'normal': await castle,
            'highlight': await castleHighlight,
        }
        // this.defaultCursorTexture= await defaultCursor;
        await cat;
        await explosionReady;
        await backgroundReady;
        await blockersReady;
    };

    async setupExplosion(explosionSheet: Promise<Spritesheet>) {
        const sheet = await explosionSheet;
        await sheet.parse();
        this.explosionSprite = sheet.animations.animation0;
    }

    renderExplosion(position: Vector2D, radius: number) {
        if (this.explosionSprite === null) return
        const explosion = new AnimatedSprite(this.explosionSprite);
        explosion.zIndex = HeroGameLoop.zIndex.hud;
        explosion.loop = false;
        explosion.animationSpeed = .5;
        explosion.anchor.set(0.5);
        explosion.scale = this.renderScale * .15 * radius / 100;
        explosion.x = position.x * this.renderScale;
        explosion.y = position.y * this.renderScale;
        explosion.visible = true;
        this.pixiRef.stage.addChild(explosion);
        explosion.gotoAndPlay(0);
        explosion.onComplete = () => {
            this.pixiRef.stage.removeChild(explosion);
            explosion.destroy();
        }
    }

    async setupBlockers(wallSpriteSheet: Promise<Spritesheet>) {
        const sheet = await wallSpriteSheet;
        const texture: Texture = sheet.textures['TX Tileset Wall-0.png'];
        const blockerSprite: Sprite = new Sprite(texture);
        blockerSprite.x = this.sceneWidth / 2 - blockerSprite.width / 2;
        blockerSprite.y = this.sceneHeight / 2 - blockerSprite.height / 2;

        blockerSprite.zIndex = HeroGameLoop.zIndex.ground;
        this.pixiRef.stage.addChild(blockerSprite);
        this.colliders.push(spriteToAABBCollider(blockerSprite));
    }

    resetControllers() {
        this.controllers.forEach(controller => {
            controller.cleanup()
        })
        this.controllers = [];
    }

    create() {
        DebugDrawer.setPixi(this.pixiRef);
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
            special: "KeyO",
            cancel: "Escape"
        };

        const boundaryCollider: AABBCollider = {
            minX: 0,
            minY: 0,
            maxX: this.sceneWidth,
            maxY: this.sceneHeight,
            inverted: true,
        }

        this.colliders.push(boundaryCollider);

        this.teams = [
            {
                id: 0,
                name: 'Yellow',
                color: 0xffff00,
                playerCentroid: Vector2D.add(gameConfig.castlePositions[0], gameConfig.playerStartOffset),
                castleCentroid: gameConfig.castlePositions[0],
                controllerMapping: player1Keys,
                players: [],
                castles: []
            },
            {
                id: 1,
                name: 'White',
                color: 0xffffff,
                playerCentroid: Vector2D.add(gameConfig.castlePositions[1], gameConfig.playerStartOffset),
                castleCentroid: gameConfig.castlePositions[1],
                controllerMapping: null,
                players: [],
                castles: []
            }
        ]
        console.log('castleCentroid', this.teams[0].castleCentroid);
        const aiCharacter = {
            playerName: "Kitty",
            faction: Factions.Wild,
            stats: {health: 3, speed: 3, magicPower: 3, magicStamina: 3}
        }

        this.players.push(new Player(this.teams[0], this, this.character));
        this.players.push(new Player(this.teams[1], this, aiCharacter));
        this.castles.push(new Castle(this.teams[0], this));
        this.castles.push(new Castle(this.teams[1], this))
        this.players[0].gainCastleControl(this.castles[0]);
        this.players[1].gainCastleControl(this.castles[1]);
        this.setLocalPlayer(this.players[0]);
        this.controllers.push(new LocalPlayerController(this.players[0], player1Keys));
        this.controllers.push(new AIController(this.players[1], this.players[0], this));

        this.particleSystem = new ParticleSystem(this.teams, this);
        for (const player of this.players) {
            player.setParticleSystem(this.particleSystem);
        }
        this.playersRef.current = this.players;
    };

    areaDamage(position: Vector2D, sqRange: number, damage: number, safeTeam: Team[] = []) {
        for (const player of this.players) {
            if (safeTeam.includes(player.team)) continue;
            if (Vector2D.sqDist(position, player.pos) > sqRange) continue;
            player.receiveDamage(damage);
        }
        for (const castle of this.castles) {
            if (safeTeam.includes(castle.team)) continue;
            if (Vector2D.sqDist(position, castle.pos) > sqRange) continue;
            castle.receiveDamage(damage);
        }
        if (this.particleSystem) {
            this.particleSystem.getParticles().deepForEach((particle) => {
                if (safeTeam.includes(particle.team)) return;
                if (Vector2D.sqDist(position, particle.pos) > sqRange) return;
                particle.receiveDamage(damage);
            })
        }
    }

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

    updateCamera() {
        if (this.localPlayer) {
            const alpha = gameConfig.cameraElasticAlpha;
            const margin = gameConfig.cameraElasticMargin;
            this.cameraPivot.x = alpha * this.localPlayer.pos.x * this.renderScale + (1-alpha) * this.cameraPivot.x
            this.cameraPivot.y = alpha * this.localPlayer.pos.y * this.renderScale + (1-alpha) * this.cameraPivot.y
            this.cameraPivot.x = Math.max(this.cameraPivot.x, this.sceneWidth * margin)
            this.cameraPivot.x = Math.min(this.cameraPivot.x, this.sceneWidth * (1 - margin))
            this.cameraPivot.y = Math.max(this.cameraPivot.y, this.sceneHeight * margin)
            this.cameraPivot.y = Math.min(this.cameraPivot.y, this.sceneHeight * (1 - margin))
            this.pixiRef.stage.pivot.x = this.cameraPivot.x;
            this.pixiRef.stage.pivot.y = this.cameraPivot.y;
            this.pixiRef.stage.position.x = this.pixiRef.canvas.width / 2;
            this.pixiRef.stage.position.y = this.pixiRef.canvas.height / 2;
        }
    }

    update() {
        DebugDrawer.reset();
        if (!this.gameOn) return
        if (this.particleSystem === undefined) return

        this.renderScale = this.pixiRef.renderer.width / gameConfig.baseRenderScale;

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

        this.updateCamera();
    };
}

