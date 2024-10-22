import {AnimatedSpriteFrames, Application, Assets, Sprite, Spritesheet, Texture} from "pixi.js";
import React from "react";
import {setupBackground} from "./Graphics/TileBackground";
import {AABBCollider, Character, Controls, popUpEvent, Team, TexturePack} from "../types/types";
import {spriteToAABBCollider, Vector2D} from "./Utility";
import DebugDrawer from "../DebugTools/DebugDrawer";
import {gameConfig, UnitPacks} from "../config";
import {LocalPlayerController} from "./Controllers/LocalPlayerController";
import {
    CastleID,
    Client,
    ClientID,
    ClientMessage,
    ClientMessageType,
    ClientPayloads,
    DroneBoughtMessage,
    GameUpdateMessage,
    InitialDataMessage,
    PlayerUpdateData,
    ServerMessage,
    ServerMessageType,
    SpellCastMessage
} from "@shared/commTypes";
import {PlayerClient} from "./Entities/PlayerClient";
import {CastleClient} from "./Entities/CastleClient";
import {ParticleSystemClient} from "./ParticleSystemClient";
import {HeroGameLoopBase} from "./HeroGameLoopBase";
import {PeerMap} from "../UI-Comps/CharacterCreation/MainCharacterCreation";
import HeroGameLoopServer from "./HeroGameLoopServer";


export class HeroGameLoopClient extends HeroGameLoopBase {
    static zIndex = {
        'environment': 0,
        'ground': 1,
        'flyers': 2,
        'hud': 3,
    }

    public players: Map<ClientID, PlayerClient> = new Map();
    public teams: Team[] = [];
    public castles: Map<CastleID, CastleClient> = new Map();
    public colliders: AABBCollider[] = [];
    private localcontroller: LocalPlayerController | null = null;

    private cameraPivot: Vector2D = Vector2D.zeros();
    public castleTexturePack: TexturePack | null = null;
    explosionSprite: AnimatedSpriteFrames | null = null;

    public renderScale: number = 1

    private resolveInitialData: (data: any)=>void = ()=>{};
    private initialDataPromise: Promise<InitialDataMessage> | null = null;
    public localPlayer: PlayerClient | null = null;

    public hostchannel: RTCDataChannel | null = null;
    public server: HeroGameLoopServer | null = null;
    public isHost: boolean = false;

    public particleSystem: ParticleSystemClient | null = null;
    public startTime: number | null = null;

    public sendToHost: <T extends ClientMessageType>(type: T, payload: ClientPayloads[T])=>void

    constructor(
        public pixiRef: Application,
        private setWinner: React.Dispatch<React.SetStateAction<string | undefined>>,
        public setPlayerPopOpen: React.Dispatch<React.SetStateAction<popUpEvent | undefined>>,
        private playersRef: React.MutableRefObject<Map<ClientID, PlayerClient>>,
        private setDayTime: React.Dispatch<React.SetStateAction<number>>,
        public localId: ClientID,
        public hostId: ClientID,
        character: Character,
        public clients: PeerMap,
    ) {
        super();

        if (localId === hostId) {
            this.isHost = true;
            this.server = new HeroGameLoopServer(clients, this);
            this.sendToHost = this._hostLoopBack;
        } else {
            this.hostchannel = clients.get(hostId)!.datachannel
            this.sendToHost = this._hostRemote;
        }

        this.clients.forEach(client => {
            if (client.id !== localId) {
                client.datachannel.onmessage = (event: MessageEvent) => {
                    console.log('incoming message', event.data);
                    const parsedMessage = JSON.parse(event.data);
                    this.handlePeerMessage(parsedMessage, client);
                    if (client.id === this.hostId && 'serverFlag' in parsedMessage) {
                        this.handleServerMessage(parsedMessage)
                    }
                }
            }
        })

        this.clients.forEach(client => {
            this.players.set(client.id, new PlayerClient(client.id, this))
        })
        this.players.set(localId, new PlayerClient(localId, this))

        this.setLocalPlayer(character)
    }

    _hostLoopBack<T extends ClientMessageType>(type: T, payload: ClientPayloads[T]) {
        const message: ClientMessage<any> = {type: type, payload: payload};
        this.server?.handleClientMessage(this.localId, message)
    }

    _hostRemote<T extends ClientMessageType>(type: T, payload: ClientPayloads[T]) {
        const message: ClientMessage<any> = {type: type, payload: payload};
        this.hostchannel!.send(JSON.stringify(message));
    }

    broadcast<T extends ClientMessageType>(type: T, payload: ClientPayloads[T]) {
        const message: ClientMessage<T> = {
            type: type,
            payload: payload
        }
        const data = JSON.stringify(message)
        this.clients.forEach(client => {
            if (client.id === this.localId) return;
            client.datachannel.send(data);
        })
    }

    handlePeerMessage(message: ClientMessage<any>, sender: Client) {
        if (this.server) {
            this.server.handleClientMessage(sender.id, message);
        }
        switch (message.type) {
            case ClientMessageType.ReadyToJoin:
                break;
            case ClientMessageType.RequestSpellCast:
                this.handleSpellCastRequest(sender.id, message.payload);
                break;
            case ClientMessageType.KeyDown:
                this.handleKeyboardPress(sender.id, message.payload, true);
                break;
            case ClientMessageType.KeyUp:
                this.handleKeyboardPress(sender.id, message.payload, false);
                break;
            case ClientMessageType.RequestBuyDrone:
                // this.handleBuyDroneRequest(clientId, message.payload);
                break;
            default:
                console.warn('Unhandled message type:', message.type);
        }
    }

    handleSpellCastRequest(clientId: ClientID, castData: SpellCastMessage) {
        const instigator = this.players.get(clientId);
        if (!instigator) return;
        const success = instigator.castSpell(castData.position, castData.spell);
    }

    handleKeyboardPress(clientId: ClientID, key: Controls, down: boolean) {
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

    requestInitialData(): void {
        if (!this.localPlayer) throw new Error("No local player!");
        if (!this.localPlayer.character) throw new Error("No local character!");

        console.log("promise")

        this.initialDataPromise = new Promise<InitialDataMessage>((resolve, reject) => {
            const timeout = setTimeout(
                () => reject('Timeout waiting for initial data'),
                10*1000
            );
            this.resolveInitialData = (data: InitialDataMessage) => {
                clearTimeout(timeout);
                resolve(data);
            };
        });

        console.log("promise done")

        this.sendToHost(ClientMessageType.ReadyToJoin, this.localPlayer.character);

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

    setLocalPlayer(localCharacter: Character) {
        const player = this.players.get(this.localId);
        if (!player) throw new Error("No player at localID!");

        this.localPlayer = player;
        player.isLocal = true;
        player.character = localCharacter;
        this.cameraPivot = player.pos.copy();

        this.pixiRef.stage.on('pointermove', (event) => {
            const mousePosition = event.global;
            const worldPosition = this.pixiRef.stage.toLocal(mousePosition);
            player.aimPos.x = worldPosition.x / this.renderScale;
            player.aimPos.y = worldPosition.y / this.renderScale;
        });
        this.pixiRef.stage.on('click', () => {player.attemptSpellCast()})
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
        this.requestInitialData();

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
            const player = this.players.get(pInit.id)!
            player.gameInit(pInit.pos, this.teams[pInit.teamIdx], pInit.character)
        });
        initData.package.castles.forEach(cInit => {
            const castle = new CastleClient(cInit.id, cInit.pos, this.teams[cInit.teamIdx], cInit.owner, this);
            this.castles.set(cInit.id, castle)
            const owner = this.players.get(cInit.owner);
            owner?.gainCastleControl(castle);
        })

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

        if (this.setDayTime !== undefined)
            this.setDayTime(this.dayTime / gameConfig.dayLength);
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


}