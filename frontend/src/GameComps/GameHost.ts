import {v4 as uuidv4} from 'uuid';

import {getMedian, Vector2D} from "./Utility";
import {Character, EntityTypes, Factions} from "../types/types";
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
    InitialDataPackage, LatencyReport,
    ParticleUpdateData,
    PlayerInitData,
    PlayerUpdateData,
    RequestBuySpellMessage,
    ServerMessage,
    ServerMessageType,
    ServerPayloads,
    SpellCastMessage
} from "@shared/commTypes";
import {PeerMap} from "../UI-Comps/CharacterCreation/MainCharacterCreation";
import {HeroGameLoopClient} from "./HeroGameLoopClient";
import {Units} from "../types/unitTypes";
import {SpellPack} from "../types/spellTypes";
import {CastleClient} from "./Entities/CastleClient";
import {PlayerClient} from "./Entities/PlayerClient";


export default class GameHost {
    public players: Map<string, PlayerClient> = new Map();
    // public navMesh: NavMesh;

    private latencies: Map<ClientID, Map<ClientID, number>> = new Map();

    private initialData: InitialDataPackage | null = null;
    private readyForCreation: Map<ClientID, Character> = new Map();


    // private wss = new WebSocketServer({ port: 8080 });

    private updateInterval: number | NodeJS.Timeout | null = null;
    private nextUpdateMessage: GameUpdateMessage | null = null;

    constructor(
        private clients: PeerMap,
        private localClientScene: HeroGameLoopClient,
        isStartOfGame: boolean,
    ) {
        if (!isStartOfGame) {
            this.tickerUp();
        }
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
            case ClientMessageType.LatencyReport:
                this.handleLatencyReport(clientId, message.payload as LatencyReport);
                break;
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

    handleLatencyReport(reportingId: ClientID, report: LatencyReport) {
        report.forEach((latency, evaluatedId) => {
            let subMap = this.latencies.get(evaluatedId)
            if (!subMap) {
                subMap = new Map();
            }
            subMap.set(reportingId, latency);
            this.latencies.set(evaluatedId, subMap);
        })
    }

    getHostPriority(): ClientID[] {
        const prioMap: Map<ClientID, number> = new Map();
        // Set defaults
        this.clients.forEach(client => prioMap.set(client.id, gameConfig.latencyTimeout))
        // Calculate from reports
        this.latencies.forEach((latencyMap, clientId) => {
            const latencies: number[] = [];
            latencyMap.forEach((latency) => {
                latencies.push(latency)
            })
            let median = getMedian(latencies) || gameConfig.latencyTimeout;
            prioMap.set(clientId, median)
        })
        // Return client ids sorted by median latency
        return Array.from(prioMap.entries())
            .sort(([, a], [, b]) => a - b)
            .map(([key]) => key);
    }

    handleBuySpellRequest(clientId: ClientID, spellRequest: RequestBuySpellMessage) {
        console.log('buying')
        if (clientId !== spellRequest.buyer) return;
        const buyCheck = this.checkPlayerCanBuySpell(clientId, spellRequest.castle, spellRequest.spell);
        if (!buyCheck) return;
        this.resolvePlayerBuysSpell(buyCheck.player, buyCheck.castle, spellRequest.spell);
    }

    resolvePlayerBuysSpell(player: PlayerClient, castle: CastleClient, spell: SpellPack) {
        // player.gold -= spell.buyCost;
        // player.availableSpells.push(spell);
        this.broadcast(ServerMessageType.SpellBought, {
            buyer: player.id,
            castle: castle.id,
            spell: spell,
        })
    }

    handleSpellCastRequest(clientId: ClientID, castData: SpellCastMessage) {
        // Broadcast Direct Peer message
        console.log('Relaying cast event!')
        this.broadcast(ServerMessageType.SpellCast, castData)
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

    checkPlayerCanBuyDrone(playerId: ClientID, unit: Units, n: number): {player: PlayerClient, castle: CastleClient} | null {
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

    resolvePlayerBuysDrone(buyer: PlayerClient, castle: CastleClient, unit: Units, n: number) {
        const newDroneIds = Array.from({length: n}, ()=>uuidv4());
        // this.localClientScene.idTypes.set(newDroneId, EntityTypes.Particle);
        // this.particleSystem?.getNewParticle(buyer, castle, 0, UnitPacks[unit], buyer, newDroneId);
        this.broadcast(
            ServerMessageType.DroneBought,
            {
                buyer: buyer.id,
                unit: unit,
                n: n,
                castleId: castle.id,
                droneId: newDroneIds,
            })
    }

    sendInitialData() {
        if (this.initialData === null) return;
        this.broadcast(ServerMessageType.InitialData, {package: this.initialData!})
        this.readyForCreation.clear();
    }

    stopGame() {
        this.localClientScene.gameOn = false;
        this.tickerDown();
        this.broadcast(ServerMessageType.Pause, null);
    }

    resumeGame() {
        this.tickerUp();
        this.broadcast(ServerMessageType.Resume, null);
    }

    checkWinner() {
        const remainingTeams = this.localClientScene.teams.filter(team => team.playerIds.length > 0)
        if (remainingTeams.length > 1) return;
        const winner = remainingTeams.length === 1 ? remainingTeams[0].name : "Tie"
        this.broadcast(ServerMessageType.Winner, winner);
        this.stopGame();
    }

    tickerUp() {
        if (this.updateInterval === null)
            this.updateInterval = setInterval(()=> this.update(), 1000);
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

    };


    create() {
        this.players.clear();
        this.localClientScene.castles.clear();

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
            const teamIdx = index % gameConfig.nTeamGame;
            const castleId = uuidv4();
            const castleSpawn = gameConfig.castlePositions[index];
            const playerSpawn = Vector2D.add(castleSpawn, gameConfig.playerStartOffset);

            playerInitData.push({id: clientId, pos: playerSpawn, character: character, teamIdx: teamIdx})
            castleInitData.push({id: castleId, pos: castleSpawn, owner: clientId, teamIdx: teamIdx})

            index++;
        })

        this.initialData = {players: playerInitData, castles: castleInitData};
        this.sendInitialData();
    };

    update() {
        const hostPriority = this.getHostPriority();
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
            hostPriorities: hostPriority,
        })
    };
}

