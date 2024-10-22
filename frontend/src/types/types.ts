import {Vector2D} from "../GameComps/Utility";
import {AnimatedSprite, Texture} from "pixi.js";
import {CastleClient} from "../GameComps/Entities/CastleClient";
import {ParticleBase} from "../GameComps/Entities/ParticleBase";
import {CastleID, ClientID, EntityID} from "@shared/commTypes";
import {Factions} from "../UI-Comps/CharacterCreation/FactionSelection";
import {CharacterStats} from "../UI-Comps/CharacterCreation/StatSelection";

export interface Polygon {
    verts: Vector2D[];
    attackable: boolean;
    isInside: boolean;
}

export enum EntityTypes {
    Player,
    Castle,
    Particle,
}

export interface EntityServer extends EntityBase {

}

export interface EntityBase {
    id: EntityID;
    pos: Vector2D;
    vel: Vector2D;
    radius: number;
    mass: number;
    health: number;
    givesIncome: number;
    team: Team | null;

    targetedBy: ParticleBase[];

    isAlive(): boolean;
    receiveDamage(damage: number): void

    getFiringPos(from: Vector2D): Vector2D;
}

export interface EntityClient extends EntityBase {
    renderSelf(): void;
    renderAttack(): void;
    renderStatsBar(): void;
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
    color: number,
    id: number,
    name: string,
    // playerCentroid: Vector2D,
    // castleCentroid: Vector2D,
    // controllerMapping: ControllerMapping | null,
    playerIds: ClientID[],
    castleIds: CastleID[]
}

export interface TexturePack {
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
    playerID: number;
    castle: CastleClient;
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

export interface Character {
    playerName: string;
    faction: Factions;
    stats: CharacterStats
}