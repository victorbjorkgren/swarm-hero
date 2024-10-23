import {EntityBase, EntityTypes, Team} from "../../types/types";
import {Vector2D} from "../Utility";
import {gameConfig, SpellPacks} from "@shared/config";
import {PlayerBase} from "./PlayerBase";
import HeroGameLoopServer from "../HeroGameLoopServer";
import {SpellPack, Spells} from "../../types/spellTypes";
import {ParticleBase} from "./ParticleBase";
import {HeroGameLoopBase} from "../HeroGameLoopBase";
import {CastleID, ClientID} from "@shared/commTypes";

export abstract class CastleBase implements EntityBase {
    vel: Vector2D = Vector2D.zeros();
    radius: number = 20;
    mass: number = Infinity;
    maxHealth: number = gameConfig.castleHealth;
    health: number = gameConfig.castleHealth;
    givesIncome: number = gameConfig.castleIncome;
    targetedBy: ParticleBase[] = [];

    public entityType: EntityTypes = EntityTypes.Castle;

    public sqActivationDist: number = gameConfig.castleActivationDist ** 2;
    public nearbyPlayers: PlayerBase[] = [];

    public availableSpells: SpellPack[] = [
        SpellPacks[Spells.Explosion],
    ];

    constructor(
        public id: CastleID,
        public team: Team,
        public pos: Vector2D,
        public owner: ClientID,
        protected scene: HeroGameLoopBase,
    ) {
        this.team!.castleIds.push(id);
        // this.pos = team.castleCentroid;
        // this.team.castles.push(this);
        // this.pixiRef = scene.pixiRef;
        // this.texture = scene.castleTexturePack!;
    }

    isAlive(): boolean {
        return this.health > 0;
    }

    receiveDamage(damage: number): void {
        this.health = this.health - damage;
        if (!this.isAlive()) {
            this.onDeath();
        }
    }

    abstract onDeath(): void;

    getFiringPos(from: Vector2D): Vector2D {
        return this.pos;
    }

    checkPlayers() {
        this.nearbyPlayers = this.nearbyPlayers.filter(player => Vector2D.sqDist(player.pos, this.pos) < this.sqActivationDist);
        for (const playerId of this.team!.playerIds) {
            const player = this.scene.players.get(playerId);
            if (!player) continue;
            if (Vector2D.sqDist(player.pos, this.pos) < this.sqActivationDist) {
                // if (!player.isLocal) {
                //     player.popUpCastle = this;
                // }
                this.nearbyPlayers.push(player);
            // } else {
            //     if (!player.isLocal) {
            //         player.popUpCastle = null;
            //     }
            }
        }
        return this.nearbyPlayers.length > 0;
    }
}