import {WebSocket, WebSocketServer} from 'ws';
import {v4 as uuidv4} from 'uuid';

import {ParticleSystemBase} from "./ParticleSystemBase";
import {spriteToAABBCollider, Vector2D} from "./Utility";
import {PlayerServer} from "./Entities/PlayerServer";
import {CastleServer} from "./Entities/CastleServer";
import {AABBCollider, Controls, Team} from "../types/types";
import {Assets, Sprite, Spritesheet, Texture} from "pixi.js";
import {NavMesh} from "./NavMesh";
import {Factions} from "../UI-Comps/CharacterCreation/FactionSelection";
import {gameConfig} from "../config";
import {
    SpellCastMessage, CastleInitData,
    ClientMessage,
    ClientMessageType,
    GameUpdateMessage,
    InitialDataMessage,
    InitialDataPackage,
    PlayerInitData,
    ServerMessage,
    ServerMessageType,
    ServerPayloads
} from "@shared/commTypes";
import {Character} from "../UI-Comps/CharacterCreation/MainCharacterCreation";
import {HeroGameLoopBase} from "./HeroGameLoopBase";

export type EntityID = string;
export type ClientID = EntityID;
export type CastleID = EntityID;
export type ParticleID = EntityID;

export interface Client {
    id: ClientID;
    ws: WebSocket;
    character?: Character;
}


export default class HeroGameLoopServer extends HeroGameLoopBase{
    // static zIndex = {
    //     'environment': 0,
    //     'ground': 1,
    //     'flyers': 2,
    //     'hud': 3,
    // }
    public players: Map<string, PlayerServer> = new Map();
    // public localPlayer: PlayerServer | null = null;
    public teams: Team[] = [];
    public castles: Map<string, CastleServer> = new Map();
    // public graphics:  Graphics | undefined
    public particleSystem: ParticleSystemBase | null = null;
    public startTime: number | null = null;
    private dayTime: number = 0;
    // private controllers:  Map<string, Controller> = new Map();
    public navMesh: NavMesh;
    // private cameraPivot: Vector2D = Vector2D.zeros();

    // public castleTexturePack: TexturePack | null = null;
    // private explosionSprite: AnimatedSpriteFrames | null = null;

    private dayLength: number = gameConfig.dayLength; // seconds

    private gameOn: boolean = true;
    public readonly sceneWidth: number;
    public readonly sceneHeight: number;
    colliders: AABBCollider[] = [];
    // public defaultCursorTexture: Texture | null = null;
    // public renderScale: number = 1;

    private initialData: InitialDataPackage | null = null;
    private readyForCreation: Client[] = [];

    private clients: Map<ClientID, Client> = new Map();
    private wss = new WebSocketServer({ port: 8080 });

    private updateInterval: number | NodeJS.Timeout | null = null;
    private nextUpdateMessage: GameUpdateMessage | null = null;

    constructor(
        // public pixiRef: Application,
        // private setWinner: React.Dispatch<React.SetStateAction<string | undefined>>,
        // public setPlayerPopOpen: React.Dispatch<React.SetStateAction<popUpEvent | undefined>>,
        // private playersRef: React.MutableRefObject<Player[]>,
        // private setDayTime: React.Dispatch<React.SetStateAction<number>>,
        // private character: Character,
    ) {
        super();
        this.sceneWidth = gameConfig.mapWidth;
        this.sceneHeight = gameConfig.mapHeight;
        this.navMesh = new NavMesh(this);

        this.wss.on('connection', (ws: WebSocket) => {
            const clientId = uuidv4();
            const client: Client = {id: clientId, ws: ws};
            this.clients.set(clientId, client);

            console.log(`New client connected with id ${client.id}`);
            ws.on('message', (message: string) => {
                const parsedMessage = JSON.parse(message);
                this.handleClientMessage(clientId, parsedMessage);
            });

            // Handle client disconnect
            ws.on('close', () => {
                this.clients.delete(clientId);
                console.log(`Client disconnected: ${clientId}`);
            });
        })
    }

    broadcast<T extends ServerMessageType>(type: T, payload: ServerPayloads[T]) {
        const message: ServerMessage<T> = {
            type: type,
            payload: payload
        }
        const data = JSON.stringify(message)
        this.clients.forEach(client => {
            client.ws.send(data);
        });
    }

    handleClientMessage(clientId: string, message: ClientMessage<any>) {
        switch (message.type) {
            case ClientMessageType.ReadyToJoin:
                this.handleInitialDataRequest(clientId, message.payload);
                break;
            case ClientMessageType.RequestSpellCast:
                this.handleSpellCastRequest(clientId, message.payload);
                break;
            case ClientMessageType.KeyDown:
                this.handleKey(clientId, message.payload, true);
                break;
            case ClientMessageType.KeyUp:
                this.handleKey(clientId, message.payload, false);
                break;
            default:
                console.warn('Unhandled message type:', message.type);
        }
    }

    handleKey(clientId: string, key: Controls, down: boolean) {
        const controller = this.players.get(clientId)?.controller;
        if (!controller) {
            console.error(`Client ${clientId} has no controller`);
            return;
        }
        if (down) {
            controller.remoteKeyDown(key);
        } else {
            controller.remoteKeyUp(key);
        }
    }

    handleSpellCastRequest(clientId: string, castData: SpellCastMessage) {
        const instigator = this.players.get(clientId);
        if (!instigator) return;
        const success = instigator.castSpell(castData.position, castData.spell);

    }

    handleInitialDataRequest(clientId: string, character: Character) {
        const client = this.clients.get(clientId);
        if (!client) {
            console.error(`Client ${clientId} not found`);
            return;
        }
        client.character = character;
        this.readyForCreation.push(client);
        console.log(`Client ${clientId} is waiting for initial data`);
    }

    sendInitialData() {
        if (this.initialData === null) return;
        this.readyForCreation.forEach(client => {
            const message: InitialDataMessage = {yourId: client.id, package: this.initialData!}
            client.ws.send(JSON.stringify(message));
        })
        this.readyForCreation.length = 0;
    }

    stopGame() {
        this.gameOn = false;
        this.tickerDown();
        this.broadcast(ServerMessageType.Pause, null);
    }

    resumeGame() {
        this.gameOn = true;
        this.tickerUp();
        this.broadcast(ServerMessageType.Resume, null);
    }

    onDeath(id: string) {
        this.broadcast(ServerMessageType.Winner, id)
        this.stopGame();
    }

    // setLocalPlayer(player: Player) {
    //     this.localPlayer = player;
    //     player.isLocal = true;
        // this.cameraPivot = player.pos.copy();
        //
        // this.pixiRef.stage.on('pointermove', (event) => {
        //     const mousePosition = event.global;
        //     const worldPosition = this.pixiRef.stage.toLocal(mousePosition);
        //     player.aimPos.x = worldPosition.x / this.renderScale;
        //     player.aimPos.y = worldPosition.y / this.renderScale;
        // });
        // this.pixiRef.stage.on('click', () => {player.castSpell()})
    // }

    tickerUp() {
        if (this.updateInterval === null)
            this.updateInterval = setInterval(()=> this.update(), 100);
    }

    tickerDown() {
        if (this.updateInterval !== null) {
            clearInterval(this.updateInterval)
            this.updateInterval = null;
        }
    }

    start() {
        this.stopGame();
        this.preload().then(() => {
            this.create();
            this.tickerUp()
            this.resumeGame();
        });
    }

    async preload() {
        // this.players.clear();
        // this.teams = [];
        // this.castles = [];
        this.colliders = [];

        const walls = Assets.load('/sprites/PixelArtTopDownTextures/Walls/wall-sheet.json');
        await this.setupBlockers(walls);
        // const explosion = Assets.load('/sprites/explosion_toon.json');

        // const castle: Promise<Texture> = Assets.load('/sprites/castle-sprite.png');
        // const castleHighlight: Promise<Texture> = Assets.load('/sprites/castle-sprite-highlight.png');
        // const cat = Assets.load('/sprites/black_cat_run.json');

        // const defaultCursor: Promise<Texture> = Assets.load('/sprites/kenney_cursor-pack/Vector/Basic/Double/pointer_c.svg');

        // const backgroundReady = setupBackground(this.pixiRef, this.sceneWidth, this.sceneHeight);
        // const explosionReady = this.setupExplosion(explosion)

        // this.castleTexturePack = {
        //     'normal': await castle,
        //     'highlight': await castleHighlight,
        // }
        // this.defaultCursorTexture= await defaultCursor;
        // await cat;
        // await explosionReady;
        // await backgroundReady;
        // await blockersReady;
    };

    // async setupExplosion(explosionSheet: Promise<Spritesheet>) {
    //     const sheet = await explosionSheet;
    //     await sheet.parse();
    //     this.explosionSprite = sheet.animations.animation0;
    // }

    // renderExplosion(position: Vector2D, radius: number) {
    //     if (this.explosionSprite === null) return
    //     const explosion = new AnimatedSprite(this.explosionSprite);
    //     explosion.zIndex = HeroGameLoopServer.zIndex.hud;
    //     explosion.loop = false;
    //     explosion.animationSpeed = .5;
    //     explosion.anchor.set(0.5);
    //     explosion.scale = this.renderScale * .15 * radius / 100;
    //     explosion.x = position.x * this.renderScale;
    //     explosion.y = position.y * this.renderScale;
    //     explosion.visible = true;
    //     this.pixiRef.stage.addChild(explosion);
    //     explosion.gotoAndPlay(0);
    //     explosion.onComplete = () => {
    //         this.pixiRef.stage.removeChild(explosion);
    //         explosion.destroy();
    //     }
    // }

    async setupBlockers(wallSpriteSheet: Promise<Spritesheet>) {
        const sheet = await wallSpriteSheet;
        const texture: Texture = sheet.textures['TX Tileset Wall-0.png'];
        const blockerSprite: Sprite = new Sprite(texture);
        blockerSprite.x = this.sceneWidth / 2 - blockerSprite.width / 2;
        blockerSprite.y = this.sceneHeight / 2 - blockerSprite.height / 2;

        // blockerSprite.zIndex = HeroGameLoopServer.zIndex.ground;
        // this.pixiRef.stage.addChild(blockerSprite);
        this.colliders.push(spriteToAABBCollider(blockerSprite));
    }

    resetControllers() {
        this.players.forEach(player => {
            player.controller.cleanup()
        })
    }

    create() {
        this.players.clear();
        this.castles.clear();
        this.resetControllers();

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
                // playerCentroid: Vector2D.add(gameConfig.castlePositions[0], gameConfig.playerStartOffset),
                // castleCentroid: gameConfig.castlePositions[0],
                // controllerMapping: player1Keys,
                playerIds: [],
                castleIds: []
            },
            {
                id: 1,
                name: 'White',
                color: 0xffffff,
                // playerCentroid: Vector2D.add(gameConfig.castlePositions[1], gameConfig.playerStartOffset),
                // castleCentroid: gameConfig.castlePositions[1],
                // controllerMapping: null,
                playerIds: [],
                castleIds: []
            }
        ]
        // console.log('castleCentroid', this.teams[0].castleCentroid);
        const aiCharacter = {
            playerName: "Kitty",
            faction: Factions.Wild,
            stats: {health: 3, speed: 3, magicPower: 3, magicStamina: 3}
        }

        const playerInitData: PlayerInitData[] = []
        const castleInitData: CastleInitData[] = []

        this.readyForCreation.forEach((client, index) => {
            if (!client.character) throw new Error(`Client ${client.id} has no character at creation`);
            const teamIdx = index % this.teams.length;
            const castleId = uuidv4();
            const castleSpawn = gameConfig.castlePositions[index];
            const playerSpawn = Vector2D.add(castleSpawn, gameConfig.playerStartOffset);
            const newCastle = new CastleServer(castleId, this.teams[teamIdx], castleSpawn, this);
            const newPlayer = new PlayerServer(playerSpawn, this.teams[teamIdx], client, this);
            newPlayer.gainCastleControl(newCastle);
            this.players.set(client.id, newPlayer);
            this.castles.set(castleId, newCastle);

            playerInitData.push({id: client.id, pos: playerSpawn, character: client.character, teamIdx: teamIdx})
            castleInitData.push({id: castleId, pos: castleSpawn, owner: client.id, teamIdx: teamIdx})
        })

        this.initialData = {teams: this.teams, players: playerInitData, castles: castleInitData};
        this.sendInitialData();

        this.particleSystem = new ParticleSystemBase(this.teams, this);
        // for (const player of this.players) {
        //     player.setParticleSystem(this.particleSystem);
        // }
        // this.playersRef.current = this.players;
    };

    updateDayTime() {
        if (this.startTime === null)
            this.startTime = Date.now();
        const elapsedTime = (Date.now() - this.startTime) / 1000;
        if (elapsedTime > this.dayLength) {
            this.startTime = Date.now();
            this.triggerNewDay();
        }
        this.dayTime = elapsedTime / this.dayLength;
    }

    triggerNewDay() {
        this.broadcast(ServerMessageType.TriggerNewDay, null);
        this.players.forEach(player => {
            player.newDay();
        })
    }

    // updateCamera() {
    //     if (this.localPlayer) {
    //         const alpha = gameConfig.cameraElasticAlpha;
    //         const margin = gameConfig.cameraElasticMargin;
    //         this.cameraPivot.x = alpha * this.localPlayer.pos.x * this.renderScale + (1-alpha) * this.cameraPivot.x
    //         this.cameraPivot.y = alpha * this.localPlayer.pos.y * this.renderScale + (1-alpha) * this.cameraPivot.y
    //         this.cameraPivot.x = Math.max(this.cameraPivot.x, this.sceneWidth * margin)
    //         this.cameraPivot.x = Math.min(this.cameraPivot.x, this.sceneWidth * (1 - margin))
    //         this.cameraPivot.y = Math.max(this.cameraPivot.y, this.sceneHeight * margin)
    //         this.cameraPivot.y = Math.min(this.cameraPivot.y, this.sceneHeight * (1 - margin))
    //         this.pixiRef.stage.pivot.x = this.cameraPivot.x;
    //         this.pixiRef.stage.pivot.y = this.cameraPivot.y;
    //         this.pixiRef.stage.position.x = this.pixiRef.canvas.width / 2;
    //         this.pixiRef.stage.position.y = this.pixiRef.canvas.height / 2;
    //     }
    // }

    update() {
        if (!this.gameOn) return
        if (this.particleSystem === undefined) return

        this.updateDayTime();

        // Updates
        this.particleSystem?.update();
        this.players.forEach(player => {
            player.controller.movement();
            player.updateMovement();
            // player.render();
        })
    };
}
