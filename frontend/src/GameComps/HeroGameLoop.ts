import {ParticleSystem} from "./ParticleSystem";
import {spriteToAABBCollider, Vector2D} from "./Utility";
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
import {
    AnimatedSprite, AnimatedSpriteFrames,
    Application,
    Assets,
    Container,
    Graphics,
    Rectangle,
    Sprite,
    Spritesheet, SpritesheetData,
    Texture
} from "pixi.js";
import {LocalPlayerController} from "./Controllers/LocalPlayerController";
import {AIController} from "./Controllers/AIController";
import {NavMesh} from "./NavMesh";
import DebugDrawer from "../DebugTools/DebugDrawer";
import {SpellPack} from "../UI-Comps/SpellPicker";

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


    public castleTexturePack: TexturePack | null = null;
    private explosionSprite: AnimatedSpriteFrames | null = null;

    private dayLength: number = 10; // seconds

    private gameOn: boolean = true;
    public readonly sceneWidth: number;
    public readonly sceneHeight: number;
    colliders: AABBCollider[] = [];
    public defaultCursorTexture: Texture | null = null;

    constructor(
        public pixiRef: Application,
        private setWinner: React.Dispatch<React.SetStateAction<string | undefined>>,
        private winner: string | undefined,
        public setPlayerPopOpen: React.Dispatch<React.SetStateAction<popUpEvent | undefined>>,
        private playersRef: React.MutableRefObject<Player[]>,
        private setDayTime: React.Dispatch<React.SetStateAction<number>>,
        public setSpellSlots: React.Dispatch<React.SetStateAction<SpellPack[]>>,
    ) {
        this.sceneWidth = pixiRef.canvas.width;
        this.sceneHeight = pixiRef.canvas.height;
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

        const backgroundSheetTexture:Promise<Texture> = Assets.load('/sprites/PixelArtTopDownTextures/TX Tileset Grass.png');
        const walls = Assets.load('/sprites/PixelArtTopDownTextures/Walls/wall-sheet.json');
        const explosion = Assets.load('/sprites/explosion_toon.json');

        const castle: Promise<Texture> = Assets.load('/sprites/castle-sprite.png');
        const castleHighlight: Promise<Texture> = Assets.load('/sprites/castle-sprite-highlight.png');
        const cat = Assets.load('/sprites/black_cat_run.json');

        // const defaultCursor: Promise<Texture> = Assets.load('/sprites/kenney_cursor-pack/Vector/Basic/Double/pointer_c.svg');

        const backgroundReady = this.setupBackground(backgroundSheetTexture);
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
        explosion.scale = .15 * radius / 100;
        explosion.x = position.x;
        explosion.y = position.y;
        explosion.visible = true;
        this.pixiRef.stage.addChild(explosion);
        explosion.gotoAndPlay(0);
        explosion.onComplete = () => {
            this.pixiRef.stage.removeChild(explosion);
            explosion.destroy();
        }
    }

    async setupBackground(texture_: Promise<Texture>) {
        const texture = await texture_;

        const tileSize: number = 64;
        const columns = Math.floor(texture.width / tileSize);
        const rows = Math.floor(texture.height / tileSize);
        const screenCols = Math.ceil(this.sceneWidth / tileSize);
        const screenRows = Math.ceil(this.sceneHeight / tileSize);

        const atlasData: SpritesheetData = {
            frames: {},
            meta: {
                scale: 1,
            }
        };

        // const frameNames: string[] = [];
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < columns; x++) {
                const frameName = `tile_${x}_${y}`;
                // frameNames.push(frameName);
                atlasData.frames[frameName] = {
                    frame: { x: x * tileSize, y: y * tileSize, w: tileSize, h: tileSize }
                };
            }
        }

        const spritesheet = new Spritesheet(texture, atlasData);

        await spritesheet.parse();

        for (let y = 0; y < screenRows; y++) {
            for (let x = 0; x < screenCols; x++) {
                const tX = Math.floor(Math.random() * columns);
                const tY = Math.floor(Math.random() * rows);
                const frameName = `tile_${tX}_${tY}`
                const sprite = new Sprite(spritesheet.textures[frameName]);
                sprite.x = x * tileSize;
                sprite.y = y * tileSize;
                sprite.zIndex = HeroGameLoop.zIndex.environment
                this.pixiRef.stage.addChild(sprite);
            }
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
        this.colliders.push(boundaryCollider);

        this.teams = [
            {
                id: 0,
                name: 'Yellow',
                color: 0xffff00,
                playerCentroid: new Vector2D(.25 * this.sceneWidth, .5 * this.sceneHeight),
                castleCentroid: new Vector2D(this.sceneWidth/8, this.sceneHeight/2),
                controllerMapping: player1Keys,
                players: [],
                castles: []
            },
            {
                id: 1,
                name: 'White',
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
        this.setLocalPlayer(this.players[0]);
        this.controllers.push(new LocalPlayerController(this.players[0], player1Keys));
        this.controllers.push(new AIController(this.players[1], this.players[0], this));

        this.particleSystem = new ParticleSystem(10, this.teams, this);
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
            for (const particle of this.particleSystem.getParticles()) {
                if (safeTeam.includes(particle.team)) continue;
                if (Vector2D.sqDist(position, particle.pos) > sqRange) continue;
                particle.receiveDamage(damage);
            }
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

    update() {
        DebugDrawer.reset();
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

