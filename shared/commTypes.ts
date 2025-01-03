import {Character, Controls, Team} from "../frontend/src/types/types";
import {Vector2D} from "../frontend/src/GameComps/Utility";
import {SpellPack} from "../frontend/src/types/spellTypes";
import {UnitPack, Units} from "../frontend/src/types/unitTypes";
import {EntityTypes} from "../frontend/src/types/EntityTypes";
import {NeutralTypes} from "../frontend/src/GameComps/Entities/Neutral";

export type EntityID = string;
export type ClientID = EntityID;
export type CastleID = EntityID;
export type ParticleID = EntityID;
export type NeutralID = EntityID;

export type TeamName = 'Neutral' | 'Red' | 'Blue';

export type EventID = string
export type SpellCastID = EventID;

export interface Client {
    id: ClientID;
    peer: RTCPeerConnection;
    datachannel: RTCDataChannel
    character?: Character;
}

export interface ServerMessage<T extends ServerMessageType> {
    type: T;
    payload: ServerPayloads[T];
    serverFlag: null;
}

export enum ServerMessageType {
    InitialData = "InitialData",
    TriggerNewDay = "TriggerNewDay",
    GameUpdate = "GameUpdate",
    Pause = "Pause",
    Resume = "Resume",
    Winner = "Winner",
    SpellCast = "SpellCast",
    CastleTakeOver = "CastleTakeOver",
    DroneBought = "DroneBought",
    SpellBought = "SpellBought",
    EntityDeath = "EntityDeath",
    Yield = "Yield",
}

export type ServerPayloads = {
    [ServerMessageType.InitialData]: InitialDataMessage;
    [ServerMessageType.TriggerNewDay]: null;
    [ServerMessageType.GameUpdate]: GameUpdateMessage;
    [ServerMessageType.Pause]: null;
    [ServerMessageType.Resume]: null;
    [ServerMessageType.Winner]: string;
    [ServerMessageType.SpellCast]: SpellCastMessage;
    [ServerMessageType.CastleTakeOver]: null;
    [ServerMessageType.DroneBought]: DroneBoughtMessage;
    [ServerMessageType.SpellBought]: SpellBoughtMessage;
    [ServerMessageType.EntityDeath]: EntityDeathMessage;
    [ServerMessageType.Yield]: EntityYieldMessage;
}

export type EntityDeathMessage = {
    departed: EntityID,
    departedType:EntityTypes
}

export type EntityYieldMessage = {
    yielding: NeutralID,
    yieldingType: NeutralTypes,
    yieldingTo: ClientID
}

export type SpellBoughtMessage = {
    buyer: ClientID,
    castle: CastleID,
    spell: SpellPack,
}

export type DroneBoughtMessage = {
    buyer: ClientID,
    unit: Units,
    n: number,
    castleId: CastleID,
    droneId: ParticleID[],
}

export type InitialDataMessage = {
    package: InitialDataPackage,
}

export type InitialDataPackage = {
    players: PlayerInitData[],
    castles: CastleInitData[],
    neutralBuildings: NeutralInitData[],
    neutralParticles: ParticleInitData[],
}

export type NeutralInitData = {
    id: NeutralID,
    type: NeutralTypes,
    pos: Vector2D
    income: number
}

export type PlayerInitData = {
    id: ClientID,
    pos: Vector2D,
    character: Character,
    teamName: TeamName,
}

export type CastleInitData = {
    id: CastleID,
    pos: Vector2D,
    owner: ClientID
    teamName: TeamName,
}

export type ParticleInitData = {
    particleId: ParticleID,
    pos: Vector2D,
    wayPoints: Vector2D[],
    unitData: UnitPack,
    ownerId: EntityID,
    teamName: TeamName,
}

export type GameUpdateMessage = {
    playerUpdate?: PlayerUpdateData[],
    castleUpdate?: CastleUpdateData[],
    particleUpdate?: ParticleUpdateData[],
    dayTime: number,
    hostPriorities: ClientID[]
}

export type ExplosionNoticeMessage = {
    position: Vector2D,
    radius: number
}

export type PlayerUpdateData = {
    clientId: ClientID,
    alive: boolean,
    pos: Vector2D | null,
    vel: Vector2D | null,
    acc: Vector2D | null,
    health: number | null,
    mana: number | null,
    gold: number | null,
}

export type CastleUpdateData = {
    castleId: CastleID,
    alive: boolean,
    owner: ClientID,
    health: number | null,
}

export type ParticleUpdateData = {
    particleId: ParticleID,
    alive: boolean
    pos: Vector2D,
    vel: Vector2D,
    acc: Vector2D,
    health: number,
    owner: EntityID
}


export interface ClientMessage<T extends ClientMessageType> {
    type: T;
    payload: ClientPayloads[T];
}

export enum ClientMessageType {
    Ping = "Ping",
    Pong = "Pong",
    LatencyReport = "LatencyReport",
    ReadyToJoin = "ReadyToJoin",
    KeyUp = "KeyUp",
    KeyDown = "KeyDown",
    RequestSpellCast = "RequestSpellCast",
    RequestBuyDrone = "RequestBuyDrone",
    RequestBuySpell = "RequestBuySpell",
    RequestGarrison = "RequestGarrison",
}

export type ClientPayloads = {
    [ClientMessageType.Ping]: PingCode;
    [ClientMessageType.Pong]: PingCode;
    [ClientMessageType.LatencyReport]: LatencyReport;
    [ClientMessageType.ReadyToJoin]: Character;
    [ClientMessageType.KeyUp]: Controls;
    [ClientMessageType.KeyDown]: Controls;
    [ClientMessageType.RequestSpellCast]: SpellCastMessage;
    [ClientMessageType.RequestBuyDrone]: BuyDroneMessage;
    [ClientMessageType.RequestBuySpell]: RequestBuySpellMessage;
    [ClientMessageType.RequestGarrison]: GarrisonMessage;
}

export type LatencyReport = [ClientID, number][];

export type PingCode = string;

export type BuyDroneMessage = {
    buyer: ClientID,
    unit: Units,
    n: number,
    castle: CastleID,
}

export type RequestBuySpellMessage = {
    buyer: ClientID,
    spell: SpellPack,
    castle: CastleID,
}

export type GarrisonMessage = {
    instigator: ClientID,
    isBringing: boolean,
    unit: Units,
    n: number,
    castle: CastleID,
}

export type SpellCastMessage = {
    instigator: ClientID;
    position: Vector2D,
    spell: SpellPack,
    castId: SpellCastID;
    safeTeam: Team[],
}


// SIGNAL SERVER

