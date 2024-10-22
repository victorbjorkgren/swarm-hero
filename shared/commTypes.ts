import {Character, Controls, EntityTypes, Team} from "../frontend/src/types/types";
import {Vector2D} from "../frontend/src/GameComps/Utility";
import {SpellPack} from "../frontend/src/types/spellTypes";
import {Units} from "../frontend/src/types/unitTypes";
import {WebSocket} from "ws";
import Peer from "simple-peer";

export type EntityID = string;
export type ClientID = EntityID;
export type CastleID = EntityID;
export type ParticleID = EntityID;

export interface Client {
    id: ClientID;
    peer: Peer.Instance;
    character?: Character;
}

export interface ServerMessage<T extends ServerMessageType> {
    type: T;
    payload: ServerPayloads[T];
}

export enum ServerMessageType {
    InitialData = "InitialData",
    TriggerNewDay = "TriggerNewDay",
    GameUpdate = "GameUpdate",
    Pause = "Pause",
    Resume = "Resume",
    Winner = "Winner",
    SpellCast = "SpellCast",
    // ExplosionNotice = "ExplosionNotice",
    CastleTakeOver = "CastleTakeOver",
    DroneBought = "DroneBought",
}

export type ServerPayloads = {
    [ServerMessageType.InitialData]: InitialDataMessage;
    [ServerMessageType.TriggerNewDay]: null;
    [ServerMessageType.GameUpdate]: GameUpdateMessage;
    [ServerMessageType.Pause]: null;
    [ServerMessageType.Resume]: null;
    [ServerMessageType.Winner]: string;
    // [ServerMessageType.ExplosionNotice]: ExplosionNoticeMessage;
    [ServerMessageType.SpellCast]: SpellCastMessage;
    [ServerMessageType.CastleTakeOver]: null;
    [ServerMessageType.DroneBought]: DroneBoughtMessage;
}

export type DroneBoughtMessage = {
    buyer: ClientID,
    unit: Units,
    n: number,
    castleId: CastleID,
    droneId: ParticleID,
}

export type InitialDataMessage = {
    yourId: ClientID,
    package: InitialDataPackage,
}

export type InitialDataPackage = {
    teams: Team[],
    players: PlayerInitData[],
    castles: CastleInitData[]
}

export type PlayerInitData = {
    id: ClientID,
    pos: Vector2D,
    character: Character,
    teamIdx: number,
}

export type CastleInitData = {
    id: CastleID,
    teamIdx: number,
    pos: Vector2D,
    owner: ClientID
}

export type ParticleInitData = {
    id: ParticleID,
    teamIdx: number,
    pos: Vector2D,
    owner: EntityID
    ownerType: EntityTypes,
    leader: EntityID,
    leaderType: EntityTypes
}

export type GameUpdateMessage = {
    playerUpdate?: PlayerUpdateData[],
    castleUpdate?: CastleUpdateData[],
    particleUpdate?: ParticleUpdateData[],
    dayTime: number
}

export type ExplosionNoticeMessage = {
    position: Vector2D,
    radius: number
}

export type PlayerUpdateData = {
    clientId: ClientID,
    pos: Vector2D | null,
    vel: Vector2D | null,
    acc: Vector2D | null,
    health: number | null,
    mana: number | null,
    gold: number | null,
}

export type CastleUpdateData = {
    castleId: CastleID,
    owner: ClientID,
    health: number | null,
}

export type ParticleUpdateData = {
    particleId: ParticleID,
    alive: boolean
    pos?: Vector2D,
    vel?: Vector2D,
    acc?: Vector2D,
    health?: number,
    owner?: EntityID
    ownerType?: EntityTypes,
    leader?: EntityID,
    leaderType?: EntityTypes
}


export interface ClientMessage<T extends ClientMessageType> {
    type: T;
    payload: ClientPayloads[T];
}

export enum ClientMessageType {
    ReadyToJoin = "ReadyToJoin",
    RequestSpellCast = "RequestSpellCast",
    KeyDown = "KeyDown",
    KeyUp = "KeyUp",
    RequestBuyDrone = "RequestBuyDrone",
    RequestBuySpell = "RequestBuySpell",
    RequestGarrison = "RequestGarrison",
}

export type ClientPayloads = {
    [ClientMessageType.ReadyToJoin]: Character;
    [ClientMessageType.RequestSpellCast]: SpellCastMessage;
    [ClientMessageType.KeyDown]: Controls;
    [ClientMessageType.KeyUp]: Controls;
    [ClientMessageType.RequestBuyDrone]: BuyDroneMessage;
    [ClientMessageType.RequestBuySpell]: BuySpellMessage;
    [ClientMessageType.RequestGarrison]: GarrisonMessage;
}

export type BuyDroneMessage = {
    buyer: ClientID,
    unit: Units,
    n: number,
    castle: CastleID,
}

export type BuySpellMessage = {
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
    safeTeam: Team[],
}



// SIGNAL SERVER

