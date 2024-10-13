import {Player} from "../GameComps/Player";
import {Castle} from "../GameComps/Castle";
import {Vector2D} from "../GameComps/Utility";
import {AnimatedSprite, Texture} from "pixi.js";

export interface Polygon {
    verts: Vector2D[];
    attackable: boolean;
    isInside: boolean;
}

export interface Entity {
    pos: Vector2D;
    vel: Vector2D;
    radius: number;
    mass: number;
    health: number;
    givesIncome: number;
    team: Team;

    targetedBy: Entity[];

    isAlive(): boolean;
    receiveDamage(damage: number): void

    getFiringPos(from: Vector2D): Vector2D;

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
    playerCentroid: Vector2D,
    castleCentroid: Vector2D,
    controllerMapping: ControllerMapping | null,
    players: Player[],
    castles: Castle[]
}

export interface TexturePack {
    normal: Texture;
    highlight: Texture;
}

export interface ControllerMapping {
    'up': string;
    'down': string;
    'left': string;
    'right': string;
    'buy': string;
    'special': string;
    'cancel': string;
}

export interface popUpEvent{
    playerID: number;
    castle: Castle;
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
}

export interface CollisionResult {
    collides: boolean;
    normal1?: Vector2D;
    normal2?: Vector2D;
}
