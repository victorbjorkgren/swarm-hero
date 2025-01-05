import {Vector2D} from "../GameComps/Utility";
import {AnimatedSprite, Texture} from "pixi.js";
import {CastleInterface} from "../GameComps/Entities/Castle";
import {CastleID, ClientID, TeamName} from "@shared/commTypes";
import {CharacterStats} from "../UI-Comps/Lobby/CharacterCreation/StatSelection";

export interface Polygon {
    verts: Vector2D[];
    attackable: boolean;
    isInside: boolean;
}

export interface PolygonalCollider {
    collider: Polygon;
    vel: Vector2D;
}

export interface AABBCollider {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    inverted: boolean;
}

export interface Team {
    name: TeamName,
    color: number,
    playerIds: ClientID[],
    castleIds: CastleID[],
}

export interface HighlightTexturePack {
    normal: Texture;
    highlight: Texture;
}

export enum Controls {
    up='up',
    down='down',
    left='left',
    right='right',
    buy='buy',
    special='special',
    cancel='cancel',
}

export interface ControllerMapping {
    [Controls.up]: string;
    [Controls.down]: string;
    [Controls.left]: string;
    [Controls.right]: string;
    [Controls.buy]: string;
    [Controls.special]: string;
    [Controls.cancel]: string;
}

export interface popUpEvent{
    playerID: ClientID;
    castle: CastleInterface;
}

export interface DirectionalSpriteSheet {
    'u': AnimatedSprite,
    'ur': AnimatedSprite,
    'r': AnimatedSprite,
    'dr': AnimatedSprite,
    'd': AnimatedSprite,
    'dl': AnimatedSprite,
    'l': AnimatedSprite,
    'ul': AnimatedSprite,
}

export interface Controller {
    movement(): void;
    buy(): void;
    special(): void;
    cleanup(): void;
    remoteKeyDown(key: Controls): void
    remoteKeyUp(key: Controls): void
}

export interface CollisionResult {
    collides: boolean;
    normal1?: Vector2D;
    normal2?: Vector2D;
}

export enum Factions {
    Mech,
    Wild,
    Mage,
    Spirit
}

export interface Character {
    playerName?: string;
    faction?: Factions;
    stats?: CharacterStats
}