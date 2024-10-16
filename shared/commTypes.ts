import {Controls, Team} from "../frontend/src/types/types";
import {Character} from "../frontend/src/UI-Comps/CharacterCreation/MainCharacterCreation";
import {Vector2D} from "../frontend/src/GameComps/Utility";
import {SpellPack} from "../frontend/src/types/spellTypes";
import {Keyboard} from "../frontend/src/GameComps/Keyboard";
import {CastleID, Client, ClientID, ParticleID} from "../frontend/src/GameComps/HeroGameLoopServer";

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
    ExplosionNotice = "ExplosionNotice"
}

export type ServerPayloads = {
    [ServerMessageType.InitialData]: InitialDataMessage;
    [ServerMessageType.TriggerNewDay]: null;
    [ServerMessageType.GameUpdate]: GameUpdateMessage;
    [ServerMessageType.Pause]: null;
    [ServerMessageType.Resume]: null;
    [ServerMessageType.Winner]: string;
    [ServerMessageType.ExplosionNotice]: ExplosionNoticeMessage;
}

export type InitialDataMessage = {
    yourId: ClientID,
    package: InitialDataPackage,
}

export type InitialDataPackage = {
    teams: Team[],
    players: PlayerInitData[],
}

export type PlayerInitData = {
    id: ClientID,
    character: Character,
    teamIdx: number,
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
    RequestAreaDamage = "RequestAreaDamage",
    KeyDown = "KeyDown",
    KeyUp = "KeyUp",
}

export type ClientPayloads = {
    [ClientMessageType.ReadyToJoin]: Character;
    [ClientMessageType.RequestAreaDamage]: AreaDamageMessage;
    [ClientMessageType.KeyDown]: Controls;
    [ClientMessageType.KeyUp]: Controls;
}

export type AreaDamageMessage = {
    position: Vector2D,
    spell: SpellPack,
    safeTeam: Team[],
}