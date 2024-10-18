import {EntityBase, Team} from "../../types/types";
import {Vector2D} from "../Utility";
import {gameConfig, SpellPacks} from "../../config";
import {PlayerBase} from "./PlayerBase";
import {ClientID} from "../HeroGameLoopServer";
import {SpellPack, Spells} from "../../types/spellTypes";

export abstract class CastleBase implements EntityBase {
    vel: Vector2D = Vector2D.zeros();
    radius: number = 20;
    mass: number = Infinity;
    maxHealth: number = gameConfig.castleHealth;
    health: number = gameConfig.castleHealth;
    givesIncome: number = gameConfig.castleIncome;
    targetedBy: string[] = [];
    owner: ClientID | null = null;

    public availableSpells: SpellPack[] = [
        SpellPacks[Spells.Explosion],
    ];

    abstract nearbyPlayers: PlayerBase[];
    abstract id: string;
    abstract pos: Vector2D;
    abstract team: Team;
    abstract isAlive(): boolean
    abstract receiveDamage(damage: number): void
    abstract getFiringPos(from: Vector2D): Vector2D
}