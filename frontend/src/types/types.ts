import {Vector2D} from "../GameComps/Utility";
import {AnimatedSprite, Texture} from "pixi.js";
import {CastleInterface} from "../GameComps/Entities/Castle";
import {CastleID, ClientID, EntityID, ParticleID} from "@shared/commTypes";
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
    Any,
}

export abstract class EntityInterface {
    public abstract state: EntityState;
    protected abstract renderer: EntityRenderer;
    protected abstract logic: EntityLogic;

    public abstract update(): void;
    public abstract receiveDamage(damage: number): void;
    public abstract onDeath(): void;
}

export abstract class EntityState {
    abstract id: EntityID;
    abstract pos: Vector2D;
    abstract vel: Vector2D;
    abstract radius: number;
    abstract mass: number;
    abstract health: number;
    abstract givesIncome: number;
    abstract team: Team | null;

    abstract entityType: EntityTypes;

    abstract targetedBy: ParticleID[];

    abstract isAlive(): boolean;
    abstract getFiringPos(from: Vector2D): Vector2D;
}

export abstract class EntityLogic {
    protected abstract state: EntityState;

    public abstract update(): void;
}

export abstract class EntityRenderer {
    protected abstract state: EntityState;

    protected abstract renderSelf(): void;
    protected abstract renderAttack(): void;
    protected abstract renderStatsBar(): void;

    public abstract update(): void;
    public abstract cleanUp(): void;
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
    playerName: string;
    faction: Factions;
    stats: CharacterStats
}