import {Controls, Team} from "../frontend/src/types/types";
import {Character} from "../frontend/src/UI-Comps/CharacterCreation/MainCharacterCreation";
import {Vector2D} from "../frontend/src/GameComps/Utility";
import {SpellPack} from "../frontend/src/types/spellTypes";
import {Keyboard} from "../frontend/src/GameComps/Keyboard";
import {CastleID, Client, ClientID, ParticleID} from "../frontend/src/GameComps/HeroGameLoopServer";
import {Units} from "../frontend/src/types/unitTypes";

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
    [ServerMessageType.SpellCast]: null;
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

export type GameUpdateMessage = {
    playerUpdate?: PlayerUpdateData[],
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
    pos: Vector2D | null,
    vel: Vector2D | null,
    acc: Vector2D | null,
    health: number | null,
    mana: number | null,
    gold: number | null,
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
}

export type ClientPayloads = {
    [ClientMessageType.ReadyToJoin]: Character;
    [ClientMessageType.RequestSpellCast]: SpellCastMessage;
    [ClientMessageType.KeyDown]: Controls;
    [ClientMessageType.KeyUp]: Controls;
    [ClientMessageType.RequestBuyDrone]: BuyDroneMessage;
}

export type BuyDroneMessage = {
    buyer: ClientID,
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