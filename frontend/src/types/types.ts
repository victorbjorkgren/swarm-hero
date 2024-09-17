import {Player} from "../GameComps/Player";
import {Castle} from "../GameComps/Castle";
import {Vector2D} from "../GameComps/Utility";

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

    isAlive(): boolean;

    getFiringPos(from: Vector2D): Vector2D;
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
    normal: string;
    highlight: string;
}

export interface ControllerMapping {
    'up': Phaser.Input.Keyboard.Key;
    'down': Phaser.Input.Keyboard.Key;
    'left': Phaser.Input.Keyboard.Key;
    'right': Phaser.Input.Keyboard.Key;
    'buy': Phaser.Input.Keyboard.Key;
}

export interface popUpEvent{
    playerID: number;
    point: Vector2D;
}

export enum Units {
    'laser'
}