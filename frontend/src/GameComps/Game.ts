import {v4 as uuidv4} from 'uuid';

import {AnimatedSpriteFrames, Application, Assets, Spritesheet, Texture, Ticker} from "pixi.js";
import React from "react";
import {AABBCollider, Character, Controls, HighlightTexturePack, popUpEvent, Team} from "../types/types";
import {Vector2D} from "./Utility";
import DebugDrawer from "../DebugTools/DebugDrawer";
import {gameConfig, UnitPacks} from "@shared/config";
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
    EntityYieldMessage,
    GameUpdateMessage,
    InitialDataMessage,
    NeutralID,
    ParticleUpdateData,
    PingCode,
    PlayerUpdateData,
    ServerMessage,
    ServerMessageType,
    SpellBoughtMessage,
    SpellCastID,
    SpellCastMessage,
    TeamName
} from "@shared/commTypes";
import {PlayerInterface} from "./Entities/Player";
import {CastleInterface} from "./Entities/Castle";
import {ParticleSystem} from "./ParticleSystem";
import {PeerMap} from "../UI-Comps/Lobby/CharacterCreation/MainCharacterCreation";
import GameHost from "./GameHost";
import {Level} from "./Levels/Level";
import {NavMesh} from "./AI/NavMesh";
import {NeutralInterface, NeutralTypes} from "./Entities/Neutral";
import {EntityMap, EntityTypes} from "../types/EntityTypes";

type LatencyObject = { pingStart: number, pingCode: string, latency: number };

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

    public players: Map<ClientID, PlayerInterface> = new Map();
    public remainingPlayers: Set<PlayerInterface> = new Set();
    public teams: Map<TeamName, Team> = new Map();
    public castles: Map<CastleID, CastleInterface> = new Map();
    public neutralEntities: Map<NeutralID, NeutralInterface> = new Map();
    public idTypes: Map<EntityID, EntityTypes> = new Map();
    public colliders: AABBCollider[] = [];

    private cameraPivot: Vector2D = Vector2D.zeros();
    public castleTexturePack: HighlightTexturePack | null = null;
    public mineTexturePack: Texture[] | null = null;
    public flagSprites: {red: Texture, blue: Texture} | null = null;
    public  explosionSprite: AnimatedSpriteFrames | null = null;
    public  greenSummonSprite: AnimatedSpriteFrames | null = null;
    public  greenIdleSprite: AnimatedSpriteFrames | null = null;
    public  blueSummonSprite: AnimatedSpriteFrames | null = null;
    public  blueIdleSprite: AnimatedSpriteFrames | null = null;
    public observedSpellCasts: Set<SpellCastID> = new Set();

    public renderScale: number = 1

    private resolveInitialData: (data: any) => void = () => {
    };
    private initialDataPromise: Promise<InitialDataMessage> | null = null;
    public localPlayer: PlayerInterface | null = null;

    public hostchannel: RTCDataChannel | null = null;
    public server: GameHost | null = null;
    public isHost: boolean = false;

    private latencyMap: Map<ClientID, LatencyObject> = new Map();
    private hostPriorities: ClientID[] = [];

    public particleSystem: ParticleSystem;
    public startTime: number | null = null;
    navMesh: NavMesh | null = null;

    public sendToHost: <T extends ClientMessageType>(type: T, payload: ClientPayloads[T]) => void = () => {
    };
    private readonly pingInterval: number | NodeJS.Timeout | null = null;

    constructor(
        public pixiRef: Application,
        private setWinner: React.Dispatch<React.SetStateAction<string | undefined>>,
        public setPlayerPopOpen: React.Dispatch<React.SetStateAction<popUpEvent | undefined>>,
        private playersRef: React.MutableRefObject<Map<ClientID, PlayerInterface>>,
        private setDayTime: React.Dispatch<React.SetStateAction<number>>,
        public localId: ClientID,
        public hostId: ClientID,
        character: Character,
        public level: Level,
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

        this.players.forEach(playerInstance => {
            this.remainingPlayers.add(playerInstance)
        })

        this.pingInterval = setInterval(() => this.measureLatenciesAndReportToHost(), 5000);

        this.setLocalPlayer(character);

        this.teams.set('Neutral', {
            name: 'Neutral',
            color: 0xeed9c4,
            playerIds: [],
            castleIds: [],
        })
        this.teams.set('Red', {
            name: 'Red',
            color: 0xff0000,
            playerIds: [],
            castleIds: [],
        })
        this.teams.set('Blue', {
            name: 'Blue',
            color: 0x0000ff,
            playerIds: [],
            castleIds: [],
        })
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
        if (!this.server) throw new Error("Tried loop back without host instance");
        this.server.handleClientMessage(this.localId, message)
    }

    _hostRemote<T extends ClientMessageType>(type: T, payload: ClientPayloads[T]) {
        const message: ClientMessage<T> = {type: type, payload: payload};
        if (!this.hostchannel) throw new Error(`No host channel found!`);
        this.hostchannel.send(JSON.stringify(message));
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

    broadcastYield(yielding: NeutralID, yieldingType: NeutralTypes, yieldingTo: ClientID) {
        // Host Event
        if (this.server) {
            this.server.broadcast(
                ServerMessageType.Yield,
                {
                    yielding: yielding,
                    yieldingType: yieldingType,
                    yieldingTo: yieldingTo,
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
            case ClientMessageType.LatencyReport:
                // Not handled here:
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

    measureLatenciesAndReportToHost() {
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
            const latencyReport = new Map();
            this.latencyMap.forEach((obj, clientId) => {
                latencyReport.set(clientId, obj.latency);
            })
            this.sendToHost(ClientMessageType.LatencyReport, Array.from(latencyReport.entries()));
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
            case ServerMessageType.Yield:
                this.handleEntityYield(message.payload as EntityYieldMessage);
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

    handleEntityYield(message: EntityYieldMessage) {
        const swarmMembers = this.particleSystem.unitManager.getOwnerUnits(message.yielding).values()
        const yieldingToInterface = this.getEntityById(message.yieldingTo, EntityTypes.Player);
        if (!yieldingToInterface) throw new Error(`${message.yieldingTo} has no player interface`);
        const newTeam = yieldingToInterface.state.team!

        // Switch allegiance for any drones
        for (const memberGroup of swarmMembers) {
            for (const member of memberGroup) {
                this.particleSystem.unitManager.switchOwner(member, message.yieldingTo, newTeam);
            }
        }

        // Switch allegiance for any drones
        if (message.yieldingType === NeutralTypes.GOLDMINE) {
            const mineInterface = this.getEntityById(message.yielding, EntityTypes.Neutral);
            if (!mineInterface) throw new Error(`Mine ${message.yieldingTo} has no interface`);
            mineInterface.switchAllegiance(message.yieldingTo);
        }
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
            console.log('Creating drone');
            this.particleSystem.getNewParticle(
                player.state.team!,
                castle.state.pos.copy(),
                UnitPacks[message.unit],
                player.state.id,
                message.droneId[i])
            this.idTypes.set(message.droneId[i], EntityTypes.Particle)
        }
    }

    handleGameUpdate(data: GameUpdateMessage) {
        this.dayTime = data.dayTime;
        this.hostPriorities = data.hostPriorities;
        data.playerUpdate?.forEach((playerUpdate: PlayerUpdateData) => {
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

    getEntityById<T extends EntityTypes>(id: EntityID, type: T): EntityMap[T] | undefined {
        switch (type) {
            case EntityTypes.Castle:
                return this.castles.get(id) as EntityMap[T];
            case EntityTypes.Player:
                return this.players.get(id) as EntityMap[T];
            case EntityTypes.Particle:
                return this.particleSystem?.getParticles().getById(id) as EntityMap[T];
            case EntityTypes.Neutral:
                return this.neutralEntities?.get(id) as EntityMap[T];
            case EntityTypes.Any:
                const entityInterface = this.castles.get(id) ?? this.players.get(id) ?? this.neutralEntities.get(id) ?? this.particleSystem?.getParticles().getById(id);
                return entityInterface as EntityMap[T];
            default:
                throw new Error(`Unsupported Entity type: ${type}`);
        }
    }

    requestInitialData(): void {
        console.log('Requesting Initial data from host');
        if (!this.localPlayer) throw new Error("No local player!");
        if (!this.localPlayer.state.character) throw new Error("No local character!");

        this.initialDataPromise = new Promise<InitialDataMessage>((resolve, reject) => {
            const timeout = setTimeout(
                () => reject('Timeout waiting for initial data'),
                70 * 1000
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
        this.pixiRef && this.pixiRef.ticker.stop();
    }

    resumeGame() {
        this.gameOn = true;
        this.pixiRef.ticker && this.pixiRef.ticker.start();
    }

    explosionFallOff(dist: number, maxDist: number) {
        return (2 * maxDist - dist) / (2 * maxDist)
    }

    areaDamage(position: Vector2D, sqRange: number, damage: number, safeTeam: Team[] = []) {
        // TODO: To logic buffer
        for (const [playerId, player] of this.players) {
            if (safeTeam.includes(player.state.team!)) continue;
            const sqDist = (Vector2D.sqDist(position, player.state.pos));
            if (sqDist > sqRange) continue;
            const falloffModifier = this.explosionFallOff(sqDist, sqRange)
            player.receiveDamage(damage * falloffModifier);
        }
        for (const [castleId, castle] of this.castles) {
            if (safeTeam.includes(castle.state.team!)) continue;
            const sqDist = (Vector2D.sqDist(position, castle.state.pos));
            if (sqDist > sqRange) continue;
            const falloffModifier = this.explosionFallOff(sqDist, sqRange)
            castle.receiveDamage(damage * falloffModifier);
        }
        if (this.particleSystem) {
            this.particleSystem.getParticles().deepForEach((particle) => {
                if (safeTeam.includes(particle.state.team!)) return;
                const sqDist = Vector2D.sqDist(position, particle.state.pos);
                if (sqDist > sqRange) return;
                const falloffModifier = this.explosionFallOff(sqDist, sqRange)
                particle.receiveDamage(damage * falloffModifier);
            })
        }
    }

    areaSpeedBuff(position: Vector2D, sqRange: number, multiplier: number, duration: number, safeTeam: Team[] = []) {
        for (const [playerId, player] of this.players) {
            if (safeTeam.includes(player.state.team!)) continue;
            if (Vector2D.sqDist(position, player.state.pos) > sqRange) continue;
            player.buffSpeed(multiplier, duration);
        }
        if (this.particleSystem) {
            this.particleSystem.getParticles().deepForEach((particle) => {
                if (safeTeam.includes(particle.state.team!)) return;
                if (Vector2D.sqDist(position, particle.state.pos) > sqRange) return;
                particle.buffSpeed(multiplier, duration);
            })
        }
    }

    areaTeleport(position: Vector2D, sqRange: number, newPosition: Vector2D, safeTeam: Team[] = []) {
        const delta = Vector2D.subtract(newPosition, position);
        for (const [playerId, player] of this.players) {
            if (safeTeam.includes(player.state.team!)) continue;
            if (Vector2D.sqDist(position, player.state.pos) > sqRange) continue;
            player.snapMove(delta);
        }
        if (this.particleSystem) {
            console.log('has particle sys');
            this.particleSystem.getParticles().deepForEach((particle) => {
                if (safeTeam.includes(particle.state.team!)) return;
                if (particle.state.team.color === 16711680) console.log('check', Vector2D.sqDist(position, particle.state.pos), sqRange, delta);
                if (Vector2D.sqDist(position, particle.state.pos) > sqRange) return;
                console.log('delta', delta);
                particle.snapMove(delta);
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
        this.pixiRef.stage.on('click', () => {
            player.attemptSpellCast()
        })
    }

    resetControllers() {
        this.players.forEach(player => {
            player.controller.cleanup()
        })
    }

    cleanUp() {
        this.resetControllers()
        this.pingInterval && clearInterval(this.pingInterval);
    }

    async setupExplosion(explosionSheet: Promise<Spritesheet>) {
        const sheet = await explosionSheet;
        await sheet.parse();
        this.explosionSprite = sheet.animations.animation0;
    }

    async setupGreen(greenSheet: Promise<Spritesheet>, greenSheetIdle: Promise<Spritesheet>) {
        const sheet = await greenSheet;
        const sheetIdle = await greenSheetIdle;
        await sheet.parse();
        await sheetIdle.parse();
        this.greenSummonSprite = sheet.animations.animation0;
        this.greenIdleSprite = sheetIdle.animations.animation0;
    }

    async setupBlue(blueSheet: Promise<Spritesheet>, blueSheetIdle: Promise<Spritesheet>) {
        const sheet = await blueSheet;
        const sheetIdle = await blueSheetIdle;
        await sheet.parse();
        await sheetIdle.parse();
        this.blueSummonSprite = sheet.animations.animation0;
        this.blueIdleSprite = sheetIdle.animations.animation0;
    }

    async preload() {
        console.log("Preload");
        const levelReady = this.level.load();
        this.navMesh = new NavMesh(this.level);

        const cat: Promise<Spritesheet> = Assets.cache.get('/sprites/black_cat_run.json');

        const explosionReady: Promise<void> = this.setupExplosion(
            Assets.cache.get('/sprites/explosion_toon.json')
        );
        const greenMagicReady: Promise<void> = this.setupGreen(
            Assets.cache.get('/sprites/magic/tree-of-glory.json'),
            Assets.cache.get('/sprites/magic/tree-of-glory-idle.json')
        );
        const blueMagicReady: Promise<void> = this.setupBlue(
            Assets.cache.get('/sprites/magic/blue_doom.json'),
            Assets.cache.get('/sprites/magic/blue_doom_idle.json')
        );
        const mine1Ready: Promise<Texture> = Assets.cache.get('/sprites/gold_mine.png');
        const mine2Ready: Promise<Texture> = Assets.cache.get('/sprites/gold_mine_2.png');
        const redFlag: Promise<Texture> = Assets.cache.get('/sprites/red_flag.png');
        const blueFlag: Promise<Texture> = Assets.cache.get('/sprites/blue_flag.png');
        this.castleTexturePack = {
            'normal': await Assets.cache.get('/sprites/castle-sprite.png'),
            'highlight': await Assets.cache.get('/sprites/castle-sprite-highlight.png'),
        }
        this.mineTexturePack = [
            await mine1Ready,
            await mine2Ready
        ];
        this.flagSprites = {
            red: await redFlag,
            blue: await blueFlag,
        }
        await cat;
        await explosionReady;
        await greenMagicReady;
        await blueMagicReady;
        await levelReady;
        console.log('Preload done')
    };

    start() {
        this.stopGame();
        this.preload().then(() => {
            this.create().then(() => {
                this.pixiRef.ticker.add((ticker) => this.update(ticker));
                this.resumeGame();
            });
        });
    }

    async create() {
        // DebugDrawer.setPixi(this.pixiRef);
        // DebugDrawer.setScene(this);
        this.requestInitialData();
        if (this.initialDataPromise === null) throw new Error("Inital Data not requested on creation")

        const initData: InitialDataMessage = await this.initialDataPromise;

        initData.package.players.forEach(pInit => {
            const team = this.teams.get(pInit.teamName)
            if (!team) throw new Error(`Unknown team: ${pInit.teamName}`)
            const player = this.players.get(pInit.id)!
            const pos = Vector2D.cast(pInit.pos);
            player.gameInit(pos, team, pInit.character)
            team.playerIds.push(player.state.id);
            this.idTypes.set(pInit.id, EntityTypes.Player);
        });

        initData.package.castles.forEach(cInit => {
            const team = this.teams.get(cInit.teamName)
            if (!team) throw new Error(`Unknown team: ${cInit.teamName}`)
            const castle = new CastleInterface(cInit.id, Vector2D.cast(cInit.pos), team, cInit.owner, this);
            this.castles.set(cInit.id, castle)
            const owner = this.players.get(cInit.owner);
            owner?.gainCastleControl(castle);
            team.castleIds.push(castle.state.id);
            this.idTypes.set(cInit.id, EntityTypes.Castle);
        })

        initData.package.neutralBuildings.forEach(nInit => {
            const pos = Vector2D.cast(nInit.pos);
            this.neutralEntities.set(nInit.id, new NeutralInterface(nInit.id, pos, [], nInit.income, NeutralTypes.GOLDMINE, this));
        })

        initData.package.neutralParticles.forEach(pInit => {
            const pos = Vector2D.cast(pInit.pos);
            const wayPoints = pInit.wayPoints.map(p => Vector2D.cast(p));
            if (pInit.ownerId && !this.neutralEntities.has(pInit.ownerId)) {
                this.neutralEntities.set(pInit.ownerId, new NeutralInterface(pInit.ownerId, pos, wayPoints, 0, NeutralTypes.SWARM, this));
                this.idTypes.set(pInit.ownerId, EntityTypes.Neutral);
            }
            const team = this.teams.get(pInit.teamName);
            if (!team) throw new Error(`Unknown team: ${pInit.teamName}`);
            this.particleSystem.getNewParticle(
                team,
                pos.copy(),
                pInit.unitData,
                pInit.ownerId,
                pInit.particleId
            )
            this.idTypes.set(pInit.particleId, EntityTypes.Particle)
        })

        this.playersRef.current = this.players;
    };

    update(ticker: Ticker) {
        const delta = ticker.deltaTime;
        DebugDrawer.reset();

        if (!this.gameOn) return
        this.renderScale = this.pixiRef.renderer.width / gameConfig.baseRenderScale;
        this.level.setScale(this.renderScale);

        this.updateDayTime();

        // Updates
        this.particleSystem?.update(delta);
        this.players.forEach(player => {
            player.update(delta);
        })
        this.castles.forEach(castle => {
            castle.update(delta);
        })
        this.neutralEntities.forEach(empty => {
            empty.update(delta);
        })

        this.updateCamera();

        if (this.setDayTime !== undefined)
            this.setDayTime(this.dayTime / gameConfig.dayLength);
    };

    updateCamera() {
        if (this.localPlayer === null) return;

        const alpha = gameConfig.cameraElasticAlpha;
        const margin = gameConfig.cameraElasticMargin;
        this.cameraPivot.x = alpha * this.localPlayer.state.pos.x * this.renderScale + (1 - alpha) * this.cameraPivot.x
        this.cameraPivot.y = alpha * this.localPlayer.state.pos.y * this.renderScale + (1 - alpha) * this.cameraPivot.y
        this.cameraPivot.x = Math.max(this.cameraPivot.x, this.level.mapWidth * margin)
        this.cameraPivot.x = Math.min(this.cameraPivot.x, this.level.mapWidth * (1 - margin))
        this.cameraPivot.y = Math.max(this.cameraPivot.y, this.level.mapHeight * margin)
        this.cameraPivot.y = Math.min(this.cameraPivot.y, this.level.mapHeight * (1 - margin))
        this.pixiRef.stage.pivot.x = this.cameraPivot.x;
        this.pixiRef.stage.pivot.y = this.cameraPivot.y;
        this.pixiRef.stage.position.x = this.pixiRef.canvas.width / 2;
        this.pixiRef.stage.position.y = this.pixiRef.canvas.height / 2;
    }
}