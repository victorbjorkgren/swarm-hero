import {
    AnimatedSprite,
    AnimatedSpriteFrames,
    Application,
    Assets,
    Graphics,
    Sprite,
    Spritesheet,
    Texture
} from "pixi.js";
import React from "react";
import {WebSocket} from "ws";
import {PlayerServer} from "./Entities/PlayerServer";
import {setupBackground} from "./Graphics/TileBackground";
import {AABBCollider, Controller, ControllerMapping, popUpEvent, Team, TexturePack} from "../types/types";
import {CastleServer} from "./Entities/CastleServer";
import {spriteToAABBCollider, Vector2D} from "./Utility";
import DebugDrawer from "../DebugTools/DebugDrawer";
import {gameConfig, player1Keys, UnitPacks} from "../config";
import {Factions} from "../UI-Comps/CharacterCreation/FactionSelection";
import {LocalPlayerController} from "./Controllers/LocalPlayerController";
import {AIController} from "./Controllers/AIController";
import {ParticleSystemBase} from "./ParticleSystemBase";
import {
    InitialDataMessage,
    ClientMessageType,
    ServerMessageType,
    SpellCastMessage,
    GameUpdateMessage, PlayerUpdateData, ClientMessage, ServerMessage, DroneBoughtMessage
} from "@shared/commTypes";
import {PlayerClient} from "./Entities/PlayerClient";
import {CastleClient} from "./Entities/CastleClient";
import {ParticleSystemClient} from "./ParticleSystemClient";
import {SpellPack} from "../types/spellTypes";
import {CastleID, ClientID} from "./HeroGameLoopServer";
import {HeroGameLoopBase} from "./HeroGameLoopBase";


export class HeroGameLoopClient extends HeroGameLoopBase {
    static zIndex = {
        'environment': 0,
        'ground': 1,
        'flyers': 2,
        'hud': 3,
    }
    private gameOn: boolean = true;

    public players: Map<ClientID, PlayerClient> = new Map();
    private teams: Team[] = [];
    public castles: Map<CastleID, CastleClient> = new Map();
    public colliders: AABBCollider[] = [];
    private localcontroller: LocalPlayerController | null = null;

    private cameraPivot: Vector2D = Vector2D.zeros();
    public castleTexturePack: TexturePack | null = null;
    explosionSprite: AnimatedSpriteFrames | null = null;

    public renderScale: number = 1
    private readonly sceneWidth: number = gameConfig.mapWidth;
    private readonly sceneHeight: number = gameConfig.mapHeight;

    private resolveInitialData: (data: any)=>void = ()=>{};
    private initialDataPromise: Promise<InitialDataMessage> | null = null;
    private localPlayer: PlayerClient | null = null;
    private localId: ClientID | null = null;
    public particleSystem: ParticleSystemClient | null = null;
    private startTime: number | null = null;

    constructor(
        public pixiRef: Application,
        private setWinner: React.Dispatch<React.SetStateAction<string | undefined>>,
        public setPlayerPopOpen: React.Dispatch<React.SetStateAction<popUpEvent | undefined>>,
        private playersRef: React.MutableRefObject<Map<ClientID, PlayerClient>>,
        private setDayTime: React.Dispatch<React.SetStateAction<number>>,
        public socket: WebSocket,
    ) {
        super();
        this.socket.on('message', (message: string)=>{
            const parsedMessage = JSON.parse(message);
            this.handleServerMessage(parsedMessage)
        })
    }

    handleServerMessage(message: ServerMessage<any>) {
        switch (message.type) {
            case ServerMessageType.InitialData:
                this.resolveInitialData(message.payload as InitialDataMessage);
                break;
            case ServerMessageType.TriggerNewDay:
                this.triggerNewDay();
                break;
            case ServerMessageType.GameUpdate:
                this.handleGameUpdate(message.payload as GameUpdateMessage);
                break;
            case ServerMessageType.SpellCast:
                this.handleSpellCast(message.payload as SpellCastMessage);
                break;
            case ServerMessageType.DroneBought:
                this.handleDroneBought(message.payload as DroneBoughtMessage);
                break;
            default:
                console.warn('Unhandled message type:', message.type);
        }
    }

    handleDroneBought(message: DroneBoughtMessage) {
        const player = this.players.get(message.buyer);
        const castle = this.castles.get(message.castleId);
        if (!player || !castle) return;
        for (let i = 0; i < message.n; i++) {
            this.particleSystem?.getNewParticle(player, castle, 0, UnitPacks[message.unit], player, message.droneId)
        }
    }

    handleSpellCast(message: SpellCastMessage) {
        const instigator = this.players.get(message.instigator)
        instigator?.resolveSpell(message)
    }

    handleGameUpdate(data: GameUpdateMessage) {
        data.playerUpdate?.forEach((playerUpdate: PlayerUpdateData)=>{
            const player = this.players.get(playerUpdate.clientId);
            if (!player) return;
            if (playerUpdate.pos !== null)
                player.pos = playerUpdate.pos.copy();
            if (playerUpdate.vel !== null)
                player.vel = playerUpdate.vel.copy();
            if (playerUpdate.acc !== null)
                player.acc = playerUpdate.acc.copy();

            if (playerUpdate.health !== null)
                player.health = playerUpdate.health;
            if (playerUpdate.mana !== null)
                player.mana = playerUpdate.mana;
            if (playerUpdate.gold !== null)
                player.gold = playerUpdate.gold;
        })
    }

    requestInitialData(): Promise<InitialDataMessage> {
        if (!this.localPlayer) throw new Error("No local player!");
        const message: ClientMessage<ClientMessageType.ReadyToJoin> = { type: ClientMessageType.ReadyToJoin, payload: this.localPlayer.character }
        this.socket.send(JSON.stringify(message));
        return new Promise<InitialDataMessage>((resolve, reject) => {
            const timeout = setTimeout(
                () => reject('Timeout waiting for initial data'),
                10*1000
            );
            this.resolveInitialData = (data: InitialDataMessage) => {
                clearTimeout(timeout);
                resolve(data);
            };
        });
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

    triggerNewDay(): void {
        this.localPlayer?.newDay();
    }

    setLocalPlayer(localId: ClientID) {
        const player = this.players.get(localId);
        if (!player) return;

        this.localId = localId
        this.localPlayer = player;
        player.isLocal = true;
        this.cameraPivot = player.pos.copy();
        this.localcontroller = new LocalPlayerController(player, player1Keys, this.socket);

        this.pixiRef.stage.on('pointermove', (event) => {
            const mousePosition = event.global;
            const worldPosition = this.pixiRef.stage.toLocal(mousePosition);
            player.aimPos.x = worldPosition.x / this.renderScale;
            player.aimPos.y = worldPosition.y / this.renderScale;
        });
        this.pixiRef.stage.on('click', () => {player.castSpell()})
    }

    resetControllers() {
        this.localcontroller?.cleanup()
        this.localcontroller = null;
    }

    async setupExplosion(explosionSheet: Promise<Spritesheet>) {
        const sheet = await explosionSheet;
        await sheet.parse();
        this.explosionSprite = sheet.animations.animation0;
    }

    async setupBlockers(wallSpriteSheet: Promise<Spritesheet>) {
        const sheet = await wallSpriteSheet;
        const texture: Texture = sheet.textures['TX Tileset Wall-0.png'];
        const blockerSprite: Sprite = new Sprite(texture);
        blockerSprite.x = this.sceneWidth / 2 - blockerSprite.width / 2;
        blockerSprite.y = this.sceneHeight / 2 - blockerSprite.height / 2;

        blockerSprite.zIndex = HeroGameLoopClient.zIndex.ground;
        this.pixiRef.stage.addChild(blockerSprite);
        this.colliders.push(spriteToAABBCollider(blockerSprite));
    }

    async preload() {
        this.players.clear();
        this.teams = [];
        this.castles.clear();
        this.colliders = [];

        this.initialDataPromise = this.requestInitialData();

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
        await cat;
        await explosionReady;
        await backgroundReady;
        await blockersReady;
    };

    start() {
        this.stopGame();
        this.preload().then(() => {
            this.create().then(()=>{
                this.pixiRef.ticker.add(this.update, this);
                this.resumeGame();
            });
        });
    }

    async create() {
        DebugDrawer.setPixi(this.pixiRef);
        if (this.initialDataPromise === null) throw new Error("Inital Data not requested on creation")
        this.resetControllers();


        const boundaryCollider: AABBCollider = {
            minX: 0,
            minY: 0,
            maxX: this.sceneWidth,
            maxY: this.sceneHeight,
            inverted: true,
        }
        this.colliders.push(boundaryCollider);


        const initData = await this.initialDataPromise;

        this.teams = initData.package.teams;

        initData.package.players.forEach(pInit => {
            this.players.set(
                pInit.id,
                new PlayerClient(pInit.id, pInit.pos, this.teams[pInit.teamIdx], pInit.character, this));
        });
        initData.package.castles.forEach(cInit => {
            const castle = new CastleClient(cInit.id, cInit.pos, this.teams[cInit.teamIdx], cInit.owner, this);
            this.castles.set(cInit.id, castle)
            const owner = this.players.get(cInit.owner);
            owner?.gainCastleControl(castle);
        })

        this.setLocalPlayer(initData.yourId);

        this.particleSystem = new ParticleSystemClient(this.teams, this);
        this.playersRef.current = this.players;
    };

    update() {
        DebugDrawer.reset();
        if (!this.gameOn) return

        this.renderScale = this.pixiRef.renderer.width / gameConfig.baseRenderScale;

        this.updateDayTime();

        // Updates
        this.particleSystem?.update();
        this.localcontroller?.movement()

        this.players.forEach(player => {
            player.updateMovement();
            player.render();
        })
        this.castles.forEach(castle => {
            castle.render();
        })
        this.particleSystem?.render();

        this.updateCamera();
    };

    updateCamera() {
        if (this.localPlayer === null) return;

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

    updateDayTime() {
        // TODO: Sync with server?
        if (this.startTime === null)
            this.startTime = Date.now();
        const elapsedTime = (Date.now() - this.startTime) / 1000;
        if (elapsedTime > gameConfig.dayLength) {
            this.startTime = Date.now();
        }
        if (this.setDayTime !== undefined)
            this.setDayTime(elapsedTime / gameConfig.dayLength);
    }
}