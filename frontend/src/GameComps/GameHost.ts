import {v4 as uuidv4} from 'uuid';

import {getMedian, Vector2D} from "./Utility";
import {Character, Factions} from "../types/types";
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
    InitialDataPackage, LatencyReport, ParticleInitData,
    ParticleUpdateData,
    PlayerInitData,
    PlayerUpdateData,
    RequestBuySpellMessage,
    ServerMessage,
    ServerMessageType,
    ServerPayloads,
    SpellCastMessage
} from "@shared/commTypes";
import {PeerMap} from "../UI-Comps/Lobby/CharacterCreation/MainCharacterCreation";
import {Game} from "./Game";
import {Units} from "../types/unitTypes";
import {SpellPack} from "../types/spellTypes";
import {CastleInterface} from "./Entities/Castle";
import {PlayerInterface} from "./Entities/Player";
import {EntityTypes} from "../types/EntityTypes";


export default class GameHost {
    public players: Map<string, PlayerInterface> = new Map();
    // public navMesh: NavMesh;

    private latencies: Map<ClientID, Map<ClientID, number>> = new Map();

    private initialData: InitialDataPackage | null = null;
    private readyForCreation: Map<ClientID, Character> = new Map();

    private updateInterval: number | NodeJS.Timeout | null = null;
    private nextUpdateMessage: GameUpdateMessage | null = null;

    constructor(
        private clients: PeerMap,
        private localClientScene: Game,
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
            case ClientMessageType.Ping:
                // Not handled here
                break;
            case ClientMessageType.Pong:
                // Not handled here
                break;
            default:
                console.warn('Unhandled message type:', message.type);
        }
    }

    handleLatencyReport(reportingId: ClientID, report: LatencyReport) {
        const reportMap = new Map(report);
        report.forEach(([evaluatedId, latency]) => {
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

    resolvePlayerBuysSpell(player: PlayerInterface, castle: CastleInterface, spell: SpellPack) {
        this.broadcast(ServerMessageType.SpellBought, {
            buyer: player.state.id,
            castle: castle.state.id,
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

    checkPlayerCanBuyDrone(playerId: ClientID, unit: Units, n: number): {player: PlayerInterface, castle: CastleInterface} | null {
        const buyer = this.localClientScene.players.get(playerId);
        if (!buyer || !buyer.state.isAlive()) return null;
        const castle = buyer.findNearbyCastle();
        if (!castle || !castle.state.isAlive()) return null;

        if (buyer.state.gold < (UnitPacks[unit].buyCost * n)) return null;

        return {player: buyer, castle: castle};
    }

    checkPlayerCanBuySpell(clientId: ClientID, castleId: CastleID, spell: SpellPack) {
        const buyer = this.localClientScene.players.get(clientId);
        if (!buyer || !buyer.state.isAlive()) return null;
        const castle = this.localClientScene.castles.get(castleId)
        if (!castle || !castle.state.isAlive()) return null;
        if (!castle.playerWithinRange(buyer.state.id)) return null
        if (buyer.state.gold < spell.buyCost) return null;

        return {player: buyer, castle: castle};
    }

    resolvePlayerBuysDrone(buyer: PlayerInterface, castle: CastleInterface, unit: Units, n: number) {
        const newDroneIds = Array.from({length: n}, ()=>uuidv4());
        // this.localClientScene.idTypes.set(newDroneId, EntityTypes.Particle);
        // this.particleSystem?.getNewParticle(buyer, castle, 0, UnitPacks[unit], buyer, newDroneId);
        this.broadcast(
            ServerMessageType.DroneBought,
            {
                buyer: buyer.state.id,
                unit: unit,
                n: n,
                castleId: castle.state.id,
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
        const teams = this.localClientScene.teams;
        console.log(`Remaining teams map:`, teams);

        const remainingTeams = Array.from(teams.entries()).filter(team => team[1].playerIds.length > 0 && team[0] !== "Neutral");

        console.log(`Remaining teams:`, remainingTeams);
        if (remainingTeams.length > 1) return;
        const winner = remainingTeams.length === 1 ? remainingTeams[0][0] : "Tie";
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
        const particleInitData: ParticleInitData[] = []

        this.localClientScene.level.neutralSwarms.concat().forEach((swarm) => {
            const emptyOwner = uuidv4();
            for (let i = 0; i<swarm.n; i++) {
                particleInitData.push({
                    particleId: uuidv4(),
                    pos: swarm.position.copy(),
                    unitData: UnitPacks[Units.LaserDrone],
                    wayPoints: swarm.wayPoints,
                    ownerId: emptyOwner,
                    teamName: 'Neutral'
                })

            }
        })

        let teamNames = Array.from(this.localClientScene.teams.keys());
        teamNames = teamNames.filter(teamName => teamName !== "Neutral");

        let index = 0;
        this.readyForCreation.forEach((character, clientId) => {
            if (!character) throw new Error(`Client ${clientId} has no character at creation`);
            const teamName = teamNames[index % teamNames.length];
            const castleId = uuidv4();
            const castleSpawn = this.localClientScene.level.playerStart[index];
            const playerSpawn = Vector2D.add(castleSpawn, gameConfig.playerStartOffset);

            playerInitData.push({id: clientId, pos: playerSpawn, character: character, teamName: teamName})
            castleInitData.push({id: castleId, pos: castleSpawn, owner: clientId, teamName: teamName})

            index++;
        })

        this.initialData = {players: playerInitData, castles: castleInitData, neutralParticles: particleInitData};
        this.sendInitialData();
    };

    update() {
        const hostPriority = this.getHostPriority();
        const playerUpdate: PlayerUpdateData[] = []
        const castleUpdate: CastleUpdateData[] = []
        const particleUpdate: ParticleUpdateData[] = []
        this.localClientScene.players.forEach((player) => {
            playerUpdate.push({
                clientId: player.state.id,
                alive: player.state.isAlive(),
                pos: player.state.pos,
                vel: player.state.vel,
                acc: player.state.acc,
                health: player.state.health,
                mana: player.state.mana,
                gold: player.state.gold,
            })

            player.state.myCastles.forEach(castleId => {
                const castle = this.localClientScene.getEntityById(castleId, EntityTypes.Castle) as CastleInterface | undefined;
                if (!castle) return;
                castleUpdate.push({
                    castleId: castle.state.id,
                    alive: castle.state.isAlive(),
                    owner: castle.state.owner,
                    health: castle.state.health,
                })
            })
        })
        this.localClientScene.particleSystem?.getParticles().deepForEach(particle => {
            // const ownerType = this.localClientScene.idTypes.get(particle.state.owner)
            // if (!ownerType) throw new Error(`Unknown owner type for "${particle.state.owner}"`);

            particleUpdate.push({
                particleId: particle.state.id,
                alive: particle.state.isAlive(),
                pos: particle.state.pos,
                vel: particle.state.vel,
                acc: particle.state.acc,
                health: particle.state.health,
                owner: particle.state.owner,
                // ownerType: ownerType,
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

