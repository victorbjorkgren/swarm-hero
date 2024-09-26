import {Player} from "../GameComps/Player";
import {Castle} from "../GameComps/Castle";
import {Vector2D} from "../GameComps/Utility";
import {AnimatedSprite, Sprite, Texture} from "pixi.js";

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

    isAlive(): boolean;

    getFiringPos(from: Vector2D): Vector2D;

    renderSelf(): void;
    renderAttack(): void;
    renderHealthBar(): void;
}

export interface PolygonalCollider {
    collider: Polygon;
    vel: Vector2D;
}

export interface Team {
    color: number,
    id: number,
    playerCentroid: Vector2D,
    castleCentroid: Vector2D,
    controllerMapping: ControllerMapping,
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
    'special': string
}

export interface popUpEvent{
    playerID: number;
    point: Vector2D;
}

export enum Units {
    'laser'
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
