import {v4 as uuidv4} from 'uuid';

import {ParticleSystemBase} from "./ParticleSystemBase";
import {spriteToAABBCollider, Vector2D} from "./Utility";
import {PlayerServer} from "./Entities/PlayerServer";
import {CastleServer} from "./Entities/CastleServer";
import {AABBCollider, Character, EntityTypes, Factions} from "../types/types";
import {Assets, Sprite, Spritesheet, Texture} from "pixi.js";
import {gameConfig, UnitPacks} from "@shared/config";
import {
    BuyDroneMessage,
    CastleID,
    CastleInitData,
    CastleUpdateData,
    ClientID,
    ClientMessage,
    ClientMessageType,
    GameUpdateMessage,
    InitialDataPackage,
    ParticleUpdateData,
    PlayerInitData,
    PlayerUpdateData,
    RequestBuySpellMessage,
    ServerMessage,
    ServerMessageType,
    ServerPayloads,
    SpellCastMessage
} from "@shared/commTypes";
import {HeroGameLoopBase} from "./HeroGameLoopBase";
import {PeerMap} from "../UI-Comps/CharacterCreation/MainCharacterCreation";
import {HeroGameLoopClient} from "./HeroGameLoopClient";
import {Units} from "../types/unitTypes";
import {PlayerBase} from "./Entities/PlayerBase";
import {CastleBase} from "./Entities/CastleBase";
import {SpellPack} from "../types/spellTypes";


export default class HeroGameLoopServer extends HeroGameLoopBase {
    public override players: Map<string, PlayerServer> = new Map();
    // public navMesh: NavMesh;

    private initialData: InitialDataPackage | null = null;
    private readyForCreation: Map<ClientID, Character> = new Map();


    // private wss = new WebSocketServer({ port: 8080 });

    private updateInterval: number | NodeJS.Timeout | null = null;
    private nextUpdateMessage: GameUpdateMessage | null = null;

    constructor(
        private clients: PeerMap,
        private localClientScene: HeroGameLoopClient
    ) {
        super();

        // this.navMesh = new NavMesh(this);

        // this.wss.on('connection', (ws: WebSocket) => {
        //     const clientId = uuidv4();
        //     const client: Client = {id: clientId, ws: ws};
        //     this.clients.set(clientId, client);
        //
        //     console.log(`New client connected with id ${client.id}`);
        //     ws.on('message', (message: string) => {
        //         const parsedMessage = JSON.parse(message);
        //         this.handleClientMessage(clientId, parsedMessage);
        //     });
        //
        //     // Handle client disconnect
        //     ws.on('close', () => {
        //         this.clients.delete(clientId);
        //         console.log(`Client disconnected: ${clientId}`);
        //     });
        // })
    }

    broadcast<T extends ServerMessageType>(type: T, payload: ServerPayloads[T]) {
        const message: ServerMessage<T> = {
            type: type,
            payload: payload,
            serverFlag: null
        }
        const data = JSON.stringify(message)
        this.clients.forEach(client => {
            client.datachannel.send(data);
        });
        this.localClientScene.handleServerMessage(message);
    }

    handleClientMessage(clientId: ClientID, message: ClientMessage<any>) {
        switch (message.type) {
            case ClientMessageType.ReadyToJoin:
                this.handleInitialDataRequest(clientId, message.payload);
                break;
            case ClientMessageType.RequestSpellCast:
                this.handleSpellCastRequest(clientId, message.payload);
                break;
            case ClientMessageType.KeyDown:
                // this.handleKeyboardPress(clientId, message.payload, true);
                break;
            case ClientMessageType.KeyUp:
                // this.handleKeyboardPress(clientId, message.payload, false);
                break;
            case ClientMessageType.RequestBuyDrone:
                this.handleBuyDroneRequest(clientId, message.payload);
                break;
            case ClientMessageType.RequestBuySpell:
                this.handleBuySpellRequest(clientId, message.payload);
                break;
            default:
                console.warn('Unhandled message type:', message.type);
        }
    }

    handleBuySpellRequest(clientId: ClientID, spellRequest: RequestBuySpellMessage) {
        if (clientId !== spellRequest.buyer) return;
        const buyCheck = this.checkPlayerCanBuySpell(clientId, spellRequest.castle, spellRequest.spell);
        if (!buyCheck) return;
        this.resolvePlayerBuysSpell(buyCheck.player, buyCheck.castle, spellRequest.spell);
    }

    resolvePlayerBuysSpell(player: PlayerBase, castle: CastleBase, spell: SpellPack) {
        // player.gold -= spell.buyCost;
        // player.availableSpells.push(spell);
        this.broadcast(ServerMessageType.SpellBought, {
            buyer: player.id,
            castle: castle.id,
            spell: spell,
        })
    }

    handleSpellCastRequest(clientId: ClientID, castData: SpellCastMessage) {
        const instigator = this.players.get(clientId);
        if (!instigator) return;
        const success = instigator.castSpell(castData.position, castData.spell);
        if (success) {
            this.broadcast(ServerMessageType.SpellCast, castData)
        }
    }

    handleBuyDroneRequest(clientId: ClientID, message: BuyDroneMessage) {
        if (clientId !== message.buyer) return null;
        const buyCheck = this.checkPlayerCanBuyDrone(message.buyer, message.unit, message.n);
        if (!buyCheck) return;
        this.resolvePlayerBuysDrone(buyCheck.player, buyCheck.castle, message.unit, message.n);
    }

    handleInitialDataRequest(clientId: ClientID, character: Character) {
        console.log(`Init data request from ${clientId}`);
        this.readyForCreation.set(clientId, character);
        console.log(`Client ${clientId} is waiting for initial data`);
        this.tryStart();
    }

    tryStart() {
        console.log(`Attempting to start the game with ${this.readyForCreation.size} players`);
        if (this.readyForCreation.size === gameConfig.nPlayerGame) {
            this.start()
        }
    }

    checkPlayerCanBuyDrone(playerId: ClientID, unit: Units, n: number): {player: PlayerBase, castle: CastleBase} | null {
        const buyer = this.localClientScene.players.get(playerId);
        if (!buyer || !buyer.isAlive()) return null;
        const castle = buyer.findNearbyCastle();
        if (!castle || !castle.isAlive()) return null;

        if (buyer.gold < (UnitPacks[unit].buyCost * n)) return null;

        return {player: buyer, castle: castle};
    }

    checkPlayerCanBuySpell(clientId: ClientID, castleId: CastleID, spell: SpellPack) {
        const buyer = this.localClientScene.players.get(clientId);
        if (!buyer || !buyer.isAlive()) return null;
        const castle = this.localClientScene.castles.get(castleId)
        if (!castle || !castle.isAlive()) return null;
        if (!castle.playerWithinRange(buyer.id)) return null
        if (buyer.gold < spell.buyCost) return null;

        return {player: buyer, castle: castle};
    }

    resolvePlayerBuysDrone(buyer: PlayerBase, castle: CastleBase, unit: Units, n: number) {
        const newDroneId = uuidv4();
        this.localClientScene.idTypes.set(newDroneId, EntityTypes.Particle);
        // this.particleSystem?.getNewParticle(buyer, castle, 0, UnitPacks[unit], buyer, newDroneId);
        this.broadcast(
            ServerMessageType.DroneBought,
            {
                buyer: buyer.id,
                unit: unit,
                n: n,
                castleId: castle.id,
                droneId: newDroneId,
            })
    }

    sendInitialData() {
        if (this.initialData === null) return;
        this.broadcast(ServerMessageType.InitialData, {package: this.initialData!})
        this.readyForCreation.clear();
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
        // this.stopGame();
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

    // resetControllers() {
    //     this.players.forEach(player => {
    //         player.controller.cleanup()
    //     })
    // }

    create() {
        this.players.clear();
        this.castles.clear();
        // this.resetControllers();

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

        let index = 0;
        this.readyForCreation.forEach((character, clientId) => {
            if (!character) throw new Error(`Client ${clientId} has no character at creation`);
            const teamIdx = index % this.teams.length;
            const castleId = uuidv4();
            const castleSpawn = gameConfig.castlePositions[index];
            const playerSpawn = Vector2D.add(castleSpawn, gameConfig.playerStartOffset);
            const newCastle = new CastleServer(castleId, this.teams[teamIdx], castleSpawn, clientId, this);
            const newPlayer = new PlayerServer(playerSpawn, this.teams[teamIdx], clientId, character, this);
            newPlayer.gainCastleControl(newCastle);
            this.players.set(clientId, newPlayer);
            this.castles.set(castleId, newCastle);

            playerInitData.push({id: clientId, pos: playerSpawn, character: character, teamIdx: teamIdx})
            castleInitData.push({id: castleId, pos: castleSpawn, owner: clientId, teamIdx: teamIdx})

            index++;
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

    update() {
        // TODO: Just bring the changed values instead of all.
        const playerUpdate: PlayerUpdateData[] = []
        const castleUpdate: CastleUpdateData[] = []
        const particleUpdate: ParticleUpdateData[] = []
        this.localClientScene.players.forEach((player) => {
            playerUpdate.push({
                clientId: player.id,
                alive: player.isAlive(),
                pos: player.pos,
                vel: player.vel,
                acc: player.acc,
                health: player.health,
                mana: player.mana,
                gold: player.gold,
            })

            player.myCastles.forEach(castle => {
                castleUpdate.push({
                    castleId: castle.id,
                    alive: castle.isAlive(),
                    owner: castle.owner,
                    health: castle.health,
                })
            })
        })
        this.localClientScene.particleSystem?.getParticles().deepForEach(particle => {
            const leaderId = particle.leader?.id ?? null;
            let leaderType: EntityTypes | null = null;
            if (leaderId) {
                leaderType = this.localClientScene.idTypes.get(leaderId) ?? null;
            }
            particleUpdate.push({
                particleId: particle.id,
                alive: particle.isAlive(),
                pos: particle.pos,
                vel: particle.vel,
                acc: particle.acc,
                health: particle.health,
                owner: particle.owner,
                ownerType: this.localClientScene.idTypes.get(particle.owner)!,
                leader: leaderId,
                leaderType: leaderType,
            })
        })

        this.broadcast(ServerMessageType.GameUpdate, {
            playerUpdate: playerUpdate,
            castleUpdate: castleUpdate,
            particleUpdate: particleUpdate,
            dayTime: this.localClientScene.dayTime,
        })
    };
}

