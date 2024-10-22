import {Vector2D} from "./Utility";
import {AABBCollider, Team} from "../types/types";
import {PlayerServer} from "./Entities/PlayerServer";
import {PlayerBase} from "./Entities/PlayerBase";
import {ParticleSystemBase} from "./ParticleSystemBase";
import {CastleBase} from "./Entities/CastleBase";
import {gameConfig} from "../config";
import {CastleServer} from "./Entities/CastleServer";
import {CastleID, ClientID, ServerMessageType} from "@shared/commTypes";

export abstract class HeroGameLoopBase {
    public players: Map<string, PlayerBase> = new Map();
    public teams: Team[] = [];
    public castles: Map<string, CastleBase> = new Map();
    public particleSystem: ParticleSystemBase | null = null;

    public startTime: number | null = null;
    protected dayTime: number = 0;
    protected dayLength: number = gameConfig.dayLength; // seconds

    protected gameOn: boolean = true;
    public readonly sceneWidth: number = gameConfig.mapWidth;
    public readonly sceneHeight: number = gameConfig.mapHeight;
    colliders: AABBCollider[] = [];

    abstract stopGame(): void;
    abstract resumeGame(): void;
    abstract start(): void;
    abstract create(): void;
    abstract preload(): void;
    abstract update(): void;
    abstract onDeath(winner: string): void;


    areaDamage(position: Vector2D, sqRange: number, damage: number, safeTeam: Team[] = []) {
        for (const [playerId, player] of this.players) {
            if (safeTeam.includes(player.team)) continue;
            if (Vector2D.sqDist(position, player.pos) > sqRange) continue;
            player.receiveDamage(damage);
        }
        for (const [castleId, castle] of this.castles) {
            if (safeTeam.includes(castle.team)) continue;
            if (Vector2D.sqDist(position, castle.pos) > sqRange) continue;
            castle.receiveDamage(damage);
        }
        if (this.particleSystem) {
            this.particleSystem.getParticles().deepForEach((particle) => {
                if (safeTeam.includes(particle.team)) return;
                if (Vector2D.sqDist(position, particle.pos) > sqRange) return;
                particle.receiveDamage(damage);
            })
        }
    }

    updateDayTime() {
        if (this.startTime === null)
            this.startTime = Date.now();
        const elapsedTime = (Date.now() - this.startTime) / 1000;
        if (elapsedTime > gameConfig.dayLength) {
            this.startTime = Date.now();
            this.triggerNewDay()
        }
        this.dayTime = elapsedTime / this.dayLength;

    }

    triggerNewDay() {
        this.players.forEach(player => {
            player.newDay();
        })
    }
 }