import {v4 as uuidv4} from 'uuid';

import {AnimatedSpriteFrames, Application, Assets, Sprite, Spritesheet, Texture} from "pixi.js";
import React from "react";
import {setupBackground} from "./Graphics/TileBackground";
import {
    AABBCollider,
    Character,
    Controls, EntityInterface,
    EntityTypes,
    popUpEvent,
    Team,
    TexturePack
} from "../types/types";
import {spriteToAABBCollider, Vector2D} from "./Utility";
import DebugDrawer from "../DebugTools/DebugDrawer";
import {gameConfig, UnitPacks} from "@shared/config";
import {LocalPlayerController} from "./Controllers/LocalPlayerController";
import {
    CastleID,
    CastleUpdateData,
    Client,
    ClientID,
    ClientMessage,
    ClientMessageType,
    ClientPayloads,
    DroneBoughtMessage,
    EntityDeathMessage,
    EntityID,
    GameUpdateMessage,
    InitialDataMessage,
    LatencyReport,
    ParticleUpdateData,
    PingCode,
    PlayerUpdateData,
    ServerMessage,
    ServerMessageType,
    SpellBoughtMessage,
    SpellCastID,
    SpellCastMessage
} from "@shared/commTypes";
import {PlayerInterface} from "./Entities/Player";
import {CastleInterface} from "./Entities/Castle";
import {ParticleSystem} from "./ParticleSystem";
import {PeerMap} from "../UI-Comps/CharacterCreation/MainCharacterCreation";
import GameHost from "./GameHost";

type LatencyObject = {pingStart: number, pingCode: string, latency: number};

export class Game {
    static zIndex = {
        'environment': 0,
        'ground': 1,
        'flyers': 2,
        'hud': 3,
    }

    dayTime: number = 0;
    dayLength: number = gameConfig.dayLength; // seconds

    gameOn: boolean = true;
    public readonly sceneWidth: number = gameConfig.mapWidth;
    public readonly sceneHeight: number = gameConfig.mapHeight;

    public players: Map<ClientID, PlayerInterface> = new Map();
    public remainingPlayers: Set<PlayerInterface> = new Set();
    public teams: Team[] = [];
    public castles: Map<CastleID, CastleInterface> = new Map();
    public idTypes: Map<EntityID, EntityTypes> = new Map();
    public colliders: AABBCollider[] = [];
    private localcontroller: LocalPlayerController | null = null;

    private cameraPivot: Vector2D = Vector2D.zeros();
    public castleTexturePack: TexturePack | null = null;
    explosionSprite: AnimatedSpriteFrames | null = null;
    public observedSpellCasts: Set<SpellCastID> = new Set();

    public renderScale: number = 1

    private resolveInitialData: (data: any)=>void = ()=>{};
    private initialDataPromise: Promise<InitialDataMessage> | null = null;
    public localPlayer: PlayerInterface | null = null;

    public hostchannel: RTCDataChannel | null = null;
    public server: GameHost | null = null;
    public isHost: boolean = false;

    private latencyMap: Map<ClientID, LatencyObject> = new Map();
    private hostPriorities: ClientID[] = [];

    public particleSystem: ParticleSystem;
    public startTime: number | null = null;

    public sendToHost: <T extends ClientMessageType>(type: T, payload: ClientPayloads[T])=>void = ()=>{};

    constructor(
        public pixiRef: Application,
        private setWinner: React.Dispatch<React.SetStateAction<string | undefined>>,
        public setPlayerPopOpen: React.Dispatch<React.SetStateAction<popUpEvent | undefined>>,
        private playersRef: React.MutableRefObject<Map<ClientID, PlayerInterface>>,
        private setDayTime: React.Dispatch<React.SetStateAction<number>>,
        public localId: ClientID,
        public hostId: ClientID,
        character: Character,
        public clients: PeerMap,
    ) {
        this.setHost(hostId, true);
        this.particleSystem = new ParticleSystem(this);

        this.clients.forEach(client => {
            if (client.id === localId) return;
            client.datachannel.addEventListener("message", (event: MessageEvent) => {
                const parsedMessage = JSON.parse(event.data);
                if (!('serverFlag' in parsedMessage))
                    this.handlePeerMessage(parsedMessage, client);
            });
            client.peer.oniceconnectionstatechange = () => {
                const state = client.peer.iceConnectionState;
                console.log(`IceConnectionStateChange: "${state}" for client ${client.id}`);
                if (state === "disconnected" || state === "failed") {
                    this.disconnectPlayer(client.id);
                }
            };
            client.datachannel.onclose = () => this.disconnectPlayer(client.id);


        })

        this.clients.forEach(client => {
            this.players.set(client.id, new PlayerInterface(client.id, this))
        })
        this.players.set(localId, new PlayerInterface(localId, this))

        this.players.forEach(playerInstance => {this.remainingPlayers.add(playerInstance)})

        this.setLocalPlayer(character)
    }

    disconnectPlayer(clientId: ClientID): void {
            console.log(`Client disconnect from ${clientId}`);
            if (!this.clients.has(clientId)) {
                console.log(`Client already disconnected ${clientId}`);
                return;
            }
            this.clients.delete(clientId);
            if (clientId === this.hostId) {
                console.log('Host has disconnected');
                const nextHost = this.hostPriorities[0];
                this.setHost(nextHost, false);
            }
            this.broadcastDeath(clientId, EntityTypes.Player)
    }

    setHost(hostId: ClientID, isStartOfGame: boolean) {
        this.hostId = hostId;
        if (this.localId === hostId) {
            console.log('Setting local host')
            this.isHost = true;
            this.server = new GameHost(this.clients, this, isStartOfGame);
            this.sendToHost = this._hostLoopBack;
        } else {
            console.log(`Setting remote host ${hostId}`)
            this.hostchannel = this.clients.get(hostId)!.datachannel;
            this.hostchannel.addEventListener("message", (event: MessageEvent) => {
                const parsedMessage = JSON.parse(event.data);
                if ('serverFlag' in parsedMessage) {
                    this.handleServerMessage(parsedMessage)
                }
            })
            this.sendToHost = this._hostRemote;
        }
    }

    _hostLoopBack<T extends ClientMessageType>(type: T, payload: ClientPayloads[T]) {
        const message: ClientMessage<T> = {type: type, payload: payload};
        this.server?.handleClientMessage(this.localId, message)
    }

    _hostRemote<T extends ClientMessageType>(type: T, payload: ClientPayloads[T]) {
        const message: ClientMessage<T> = {type: type, payload: payload};
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

    broadcastDeath(entityId: EntityID, entityType: EntityTypes) {
        // Host Event
        if (this.server) {
            this.server.broadcast(
                ServerMessageType.EntityDeath,
                {
                    departed: entityId,
                    departedType: entityType,
                }
            )
        }
    }

    handlePeerMessage(message: ClientMessage<any>, sender: Client) {
        if (this.server) {
            this.server.handleClientMessage(sender.id, message);
        }
        switch (message.type) {
            case ClientMessageType.Ping:
                this.handlePing(sender, message.payload as PingCode);
                break;
            case ClientMessageType.Pong:
                this.handlePong(sender.id, message.payload as PingCode);
                break;
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

    handlePing(sender: Client, pingCode: PingCode) {
        const message: ClientMessage<ClientMessageType.Pong> = {
            type: ClientMessageType.Pong, payload: pingCode
        };
        sender.datachannel.send(JSON.stringify(message));
    }

    public measureLatenciesAndReportToHost() {
        this.clients.forEach((client) => {
            const pingCode: PingCode = uuidv4();
            this.latencyMap.set(client.id, {
                pingStart: Date.now(),
                pingCode: pingCode,
                latency: gameConfig.latencyTimeout,
            })
            const message: ClientMessage<ClientMessageType.Ping> = {
                type: ClientMessageType.Ping,
                payload: pingCode
            }
            client.datachannel.send(JSON.stringify(message));
        });

        setTimeout(() => {
            const latencyReport: LatencyReport = new Map();
            this.latencyMap.forEach((obj, clientId) => {
                latencyReport.set(clientId, obj.latency);
            })
            this.sendToHost(ClientMessageType.LatencyReport, latencyReport);
            this.latencyMap.clear();
        }, gameConfig.latencyTimeout);
    }

    handlePong(senderId: ClientID, pingCode: PingCode) {
        const latencyObj = this.latencyMap.get(senderId);
        if (!latencyObj) return;
        if (pingCode !== latencyObj.pingCode) return;
        latencyObj.latency = Date.now() - latencyObj.pingStart;
        this.latencyMap.set(senderId, latencyObj);
    }

    handleSpellCastRequest(clientId: ClientID, castData: SpellCastMessage) {
        if (this.observedSpellCasts.has(castData.castId)) return;
        this.observedSpellCasts.add(castData.castId);
        if (clientId !== castData.instigator) return;
        const instigator = this.players.get(clientId);
        if (!instigator || !instigator.state.isAlive()) return;
        instigator.castSpell(castData.position, castData.spell);
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
                const castData = message.payload as SpellCastMessage;
                this.handleSpellCastRequest(castData.instigator, castData);
                break;
            case ServerMessageType.DroneBought:
                this.handleDroneBought(message.payload as DroneBoughtMessage);
                break;
            case ServerMessageType.SpellBought:
                this.handleSpellBought(message.payload as SpellBoughtMessage);
                break;
            case ServerMessageType.EntityDeath:
                this.handleEntityDeath(message.payload as EntityDeathMessage);
                break;
            case ServerMessageType.Winner:
                this.handleWinner(message.payload as string);
                break;
            case ServerMessageType.Pause:
                this.stopGame();
                break;
            case ServerMessageType.Resume:
                this.resumeGame();
                break;
            default:
                console.warn('Unhandled message type:', message.type);
        }
    }

    handleWinner(winnerName: string) {
        if (this.setWinner === undefined) return
        this.setWinner(winnerName);
        this.stopGame();
    }

    handleEntityDeath(message: EntityDeathMessage) {
        const departed = this.getEntityById(message.departed, message.departedType);
        departed?.onDeath();
    }

    handleSpellBought(message: SpellBoughtMessage) {
        console.log(`${message.buyer} buys spell ${message.spell.element}`)
        const player = this.players.get(message.buyer);
        const castle = this.castles.get(message.castle);
        if (!player || !castle) return;
        player.payGold(message.spell.buyCost)
        player.getSpell(message.spell);
    }

    handleDroneBought(message: DroneBoughtMessage) {
        const player = this.players.get(message.buyer);
        const castle = this.castles.get(message.castleId);
        if (!player || !castle) return;
        player.payGold(UnitPacks[message.unit].buyCost * message.n)
        for (let i = 0; i < message.n; i++) {
            console.log('Creating drone')
            this.particleSystem.getNewParticle(player, castle, 0, UnitPacks[message.unit], player, message.droneId[i])
            this.idTypes.set(message.droneId[i], EntityTypes.Particle)
        }
    }

    handleGameUpdate(data: GameUpdateMessage) {
        this.dayTime = data.dayTime;
        this.hostPriorities = data.hostPriorities;
        data.playerUpdate?.forEach((playerUpdate: PlayerUpdateData)=>{
            const player = this.players.get(playerUpdate.clientId);
            player?.updateFromHost(playerUpdate)
        })
        data.castleUpdate?.forEach((castleUpdate: CastleUpdateData) => {
            const castle = this.castles.get(castleUpdate.castleId);
            castle?.updateFromHost(castleUpdate);
        })
        data.particleUpdate?.forEach((particleUpdate: ParticleUpdateData) => {
            const uMgr = this.particleSystem?.getParticles();
            const particle = uMgr?.getById(particleUpdate.particleId);
            particle?.updateFromHost(particleUpdate);
        })
    }

    getEntityById(id: EntityID, type: EntityTypes): EntityInterface | undefined {
        switch (type) {
            case EntityTypes.Castle:
                return this.castles.get(id);
            case EntityTypes.Player:
                return this.players.get(id);
            case EntityTypes.Particle:
                return this.particleSystem?.getParticles().getById(id);
            case EntityTypes.Any:
                return this.castles.get(id) ?? this.players.get(id) ?? this.particleSystem?.getParticles().getById(id);
            default:
                throw new Error(`Unsupported Entity type: ${type}`);
        }
    }

    requestInitialData(): void {
        if (!this.localPlayer) throw new Error("No local player!");
        if (!this.localPlayer.state.character) throw new Error("No local character!");

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

        this.sendToHost(ClientMessageType.ReadyToJoin, this.localPlayer.state.character);

    }

    stopGame() {
        this.gameOn = false;
        this.pixiRef?.ticker.stop();
    }

    resumeGame() {
        this.gameOn = true;
        this.pixiRef.ticker.start();
    }

    areaDamage(position: Vector2D, sqRange: number, damage: number, safeTeam: Team[] = []) {
        // TODO: To logic buffer
        for (const [playerId, player] of this.players) {
            if (safeTeam.includes(player.state.team!)) continue;
            if (Vector2D.sqDist(position, player.state.pos) > sqRange) continue;
            player.receiveDamage(damage);
        }
        for (const [castleId, castle] of this.castles) {
            if (safeTeam.includes(castle.state.team!)) continue;
            if (Vector2D.sqDist(position, castle.state.pos) > sqRange) continue;
            castle.receiveDamage(damage);
        }
        if (this.particleSystem) {
            this.particleSystem.getParticles().deepForEach((particle) => {
                if (safeTeam.includes(particle.state.team!)) return;
                if (Vector2D.sqDist(position, particle.state.pos) > sqRange) return;
                particle.receiveDamage(damage);
            })
        }
    }

    updateDayTime() {
        if (this.startTime === null)
            this.startTime = Date.now();
        const elapsedTime = (Date.now() - this.startTime) / 1000;
        if (elapsedTime > gameConfig.dayLength) {
            this.startTime = Date.now();
            this.triggerNewDay()
        }
        this.dayTime = elapsedTime / this.dayLength;

    }

    triggerNewDay() {
        this.players.forEach(player => {
            player.newDay();
        })
    }

    onPlayerDeath(player: PlayerInterface) {
        console.log("onDeath", player);
        if (!player.state.team) return;
        const p = player.state.team.playerIds.indexOf(player.state.id)
        if (p !== -1) {
            player.state.team.playerIds.splice(p, 1)
        }
        this.server?.checkWinner();
    }

    setLocalPlayer(localCharacter: Character) {
        const player = this.players.get(this.localId);
        if (!player) throw new Error("No player at localID!");

        this.localPlayer = player;
        player.setLocal(localCharacter)
        this.cameraPivot = player.state.pos.copy();

        this.pixiRef.stage.on('pointermove', (event) => {
            const mousePosition = event.global;
            const worldPosition = this.pixiRef.stage.toLocal(mousePosition);
            player.setAimPos(
                worldPosition.x / this.renderScale,
                worldPosition.y / this.renderScale
            );
        });
        this.pixiRef.stage.on('click', () => {player.attemptSpellCast()})
    }

    resetControllers() {
        this.players.forEach(player => {
            player.controller.cleanup()
            // player.controller = null;
        })
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

        blockerSprite.zIndex = Game.zIndex.ground;
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
                // setInterval(()=>this.update(), 1000/60);
                this.resumeGame();
            });
        });
    }

    async create() {
        DebugDrawer.setPixi(this.pixiRef);
        if (this.initialDataPromise === null) throw new Error("Inital Data not requested on creation")

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

        const boundaryCollider: AABBCollider = {
            minX: 0,
            minY: 0,
            maxX: this.sceneWidth,
            maxY: this.sceneHeight,
            inverted: true,
        }
        this.colliders.push(boundaryCollider);

        const initData: InitialDataMessage = await this.initialDataPromise;

        // initData.package.teams.forEach(team => this.teams.push(team));

        initData.package.players.forEach(pInit => {
            const player = this.players.get(pInit.id)!
            const pos = new Vector2D(pInit.pos.x, pInit.pos.y);
            player.gameInit(pos, this.teams[pInit.teamIdx], pInit.character)
            this.teams[pInit.teamIdx].playerIds.push(player.state.id);
            this.idTypes.set(pInit.id, EntityTypes.Player);
        });
        initData.package.castles.forEach(cInit => {
            const castle = new CastleInterface(cInit.id, cInit.pos, this.teams[cInit.teamIdx], cInit.owner, this);
            this.castles.set(cInit.id, castle)
            const owner = this.players.get(cInit.owner);
            owner?.gainCastleControl(castle);
            this.teams[cInit.teamIdx].castleIds.push(castle.state.id);
            this.idTypes.set(cInit.id, EntityTypes.Castle);
        })

        this.playersRef.current = this.players;
    };

    update() {
        DebugDrawer.reset();
        if (!this.gameOn) return
        this.renderScale = this.pixiRef.renderer.width / gameConfig.baseRenderScale;

        this.updateDayTime();

        // Updates
        this.particleSystem?.update();

        this.players.forEach(player => {
            player.update();
        })
        this.castles.forEach(castle => {
            castle.update();
        })
        this.particleSystem?.update();

        this.updateCamera();

        if (this.setDayTime !== undefined)
            this.setDayTime(this.dayTime / gameConfig.dayLength);
    };

    updateCamera() {
        if (this.localPlayer === null) return;

        const alpha = gameConfig.cameraElasticAlpha;
        const margin = gameConfig.cameraElasticMargin;
        this.cameraPivot.x = alpha * this.localPlayer.state.pos.x * this.renderScale + (1-alpha) * this.cameraPivot.x
        this.cameraPivot.y = alpha * this.localPlayer.state.pos.y * this.renderScale + (1-alpha) * this.cameraPivot.y
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