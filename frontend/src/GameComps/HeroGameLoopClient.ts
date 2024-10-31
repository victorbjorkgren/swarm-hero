import {AnimatedSpriteFrames, Application, Assets, Sprite, Spritesheet, Texture} from "pixi.js";
import React from "react";
import {setupBackground} from "./Graphics/TileBackground";
import {
    AABBCollider,
    Character,
    Controls,
    EntityBase,
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
    ParticleUpdateData,
    PlayerUpdateData,
    ServerMessage,
    ServerMessageType,
    SpellBoughtMessage,
    SpellCastID,
    SpellCastMessage
} from "@shared/commTypes";
import {PlayerClient} from "./Entities/PlayerClient";
import {CastleClient} from "./Entities/CastleClient";
import {ParticleSystemClient} from "./ParticleSystemClient";
import {PeerMap} from "../UI-Comps/CharacterCreation/MainCharacterCreation";
import GameHost from "./GameHost";


export class HeroGameLoopClient {
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

    public players: Map<ClientID, PlayerClient> = new Map();
    public teams: Team[] = [];
    public castles: Map<CastleID, CastleClient> = new Map();
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
    public localPlayer: PlayerClient | null = null;

    public hostchannel: RTCDataChannel | null = null;
    public server: GameHost | null = null;
    public isHost: boolean = false;

    public particleSystem: ParticleSystemClient;
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

        if (localId === hostId) {
            this.isHost = true;
            this.server = new GameHost(clients, this);
            this.sendToHost = this._hostLoopBack;
        } else {
            this.hostchannel = clients.get(hostId)!.datachannel
            this.sendToHost = this._hostRemote;
        }

        this.particleSystem = new ParticleSystemClient(this.teams, this);

        this.clients.forEach(client => {
            if (client.id !== localId) {
                client.datachannel.onmessage = (event: MessageEvent) => {
                    const parsedMessage = JSON.parse(event.data);
                    // console.log('incoming message', parsedMessage);
                    if (client.id === this.hostId && 'serverFlag' in parsedMessage) {
                        this.handleServerMessage(parsedMessage)
                    } else {
                        this.handlePeerMessage(parsedMessage, client);
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
        if (this.observedSpellCasts.has(castData.castId)) return;
        this.observedSpellCasts.add(castData.castId);
        if (clientId !== castData.instigator) return;
        const instigator = this.players.get(clientId);
        if (!instigator || !instigator.isAlive()) return;
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
            default:
                console.warn('Unhandled message type:', message.type);
        }
    }

    handleEntityDeath(message: EntityDeathMessage) {
        console.log("Eulogy received", message);
        const departed = this.getEntityById(message.departed, message.departedType);
        departed?.onDeath();
    }

    handleSpellBought(message: SpellBoughtMessage) {
        console.log(`${message.buyer} buys spell ${message.spell.element}`)
        const player = this.players.get(message.buyer);
        const castle = this.castles.get(message.castle);
        if (!player || !castle) return;
        player.gold -= message.spell.buyCost;
        player.availableSpells.push(message.spell);
    }

    handleDroneBought(message: DroneBoughtMessage) {
        const player = this.players.get(message.buyer);
        const castle = this.castles.get(message.castleId);
        if (!player || !castle) return;
        player.gold -= UnitPacks[message.unit].buyCost * message.n;
        for (let i = 0; i < message.n; i++) {
            console.log('Creating drone')
            this.particleSystem.getNewParticle(player, castle, 0, UnitPacks[message.unit], player, message.droneId[i])
            this.idTypes.set(message.droneId[i], EntityTypes.Particle)
        }
    }

    handleGameUpdate(data: GameUpdateMessage) {
        this.dayTime = data.dayTime;
        data.playerUpdate?.forEach((playerUpdate: PlayerUpdateData)=>{
            const player = this.players.get(playerUpdate.clientId);
            if (!player) return;
            if (playerUpdate.pos !== null)
                player.pos = Vector2D.cast(playerUpdate.pos);
            if (playerUpdate.vel !== null)
                player.vel = Vector2D.cast(playerUpdate.vel);
            if (playerUpdate.acc !== null)
                player.acc = Vector2D.cast(playerUpdate.acc);

            if (playerUpdate.health !== null)
                player.health = playerUpdate.health;
            if (playerUpdate.mana !== null)
                player.mana = playerUpdate.mana;
            if (playerUpdate.gold !== null)
                player.gold = playerUpdate.gold;
        })
        data.castleUpdate?.forEach((castleUpdate: CastleUpdateData) => {
            const castle = this.castles.get(castleUpdate.castleId);
            if (!castle) return;
            if (castleUpdate.health !== null)
                castle.health = castleUpdate.health
            if (castleUpdate.owner !== null)
                castle.owner = castleUpdate.owner; // TODO: Switch for player as well
        })
        data.particleUpdate?.forEach((particleUpdate: ParticleUpdateData) => {
            const uMgr = this.particleSystem?.getParticles();
            if (!uMgr) return;
            const particle = uMgr.getById(particleUpdate.particleId);
            if (!particle) return;
            if (particleUpdate.pos !== null)
                particle.pos = Vector2D.cast(particleUpdate.pos);
            if (particleUpdate.vel !== null)
                particle.vel = Vector2D.cast(particleUpdate.vel);
            if (particleUpdate.acc !== null)
                particle.acc = Vector2D.cast(particleUpdate.acc);
            if (particleUpdate.health !== null)
                particle.health = particleUpdate.health
            if (particleUpdate.owner !== null) {
                if (particle.owner !== particleUpdate.owner) {
                    const newOwnerEntity = this.getEntityById(particleUpdate.owner, particleUpdate.ownerType);
                    if (!newOwnerEntity) return;
                    uMgr.switchOwner(particle, newOwnerEntity.id);
                }
            }
            if (particleUpdate.leader !== null) {
                if (!particle.leader || particle.leader.id !== particleUpdate.leader) {
                    const newOwnerEntity = this.getEntityById(particleUpdate.owner, particleUpdate.ownerType);
                    if (!newOwnerEntity) return;
                    uMgr.switchOwner(particle, newOwnerEntity.id);
                }
            }

        })
    }

    getEntityById(id: EntityID, type: EntityTypes): EntityBase | undefined {
        switch (type) {
            case EntityTypes.Castle:
                return this.castles.get(id);
            case EntityTypes.Player:
                return this.players.get(id);
            case EntityTypes.Particle:
                return this.particleSystem?.getParticles().getById(id);
            default:
                throw new Error(`Unsupported Entity type: ${type}`);
        }
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

    areaDamage(position: Vector2D, sqRange: number, damage: number, safeTeam: Team[] = []) {
        for (const [playerId, player] of this.players) {
            if (safeTeam.includes(player.team!)) continue;
            if (Vector2D.sqDist(position, player.pos) > sqRange) continue;
            player.receiveDamage(damage);
        }
        for (const [castleId, castle] of this.castles) {
            if (safeTeam.includes(castle.team!)) continue;
            if (Vector2D.sqDist(position, castle.pos) > sqRange) continue;
            castle.receiveDamage(damage);
        }
        if (this.particleSystem) {
            this.particleSystem.getParticles().deepForEach((particle) => {
                if (safeTeam.includes(particle.team!)) return;
                if (Vector2D.sqDist(position, particle.pos) > sqRange) return;
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

    onDeath(id: string) {
        if (this.setWinner === undefined) return
        this.setWinner(id);
        this.stopGame();
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
            console.log(pInit);
            const player = this.players.get(pInit.id)!
            const pos = new Vector2D(pInit.pos.x, pInit.pos.y);
            player.gameInit(pos, this.teams[pInit.teamIdx], pInit.character)
            this.teams[pInit.teamIdx].playerIds.push(player.id);
            this.idTypes.set(pInit.id, EntityTypes.Player);
        });
        initData.package.castles.forEach(cInit => {
            const castle = new CastleClient(cInit.id, cInit.pos, this.teams[cInit.teamIdx], cInit.owner, this);
            this.castles.set(cInit.id, castle)
            const owner = this.players.get(cInit.owner);
            owner?.gainCastleControl(castle);
            this.teams[cInit.teamIdx].castleIds.push(castle.id);
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
            player.controller.movement();
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