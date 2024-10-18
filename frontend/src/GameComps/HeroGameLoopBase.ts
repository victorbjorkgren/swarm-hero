import {Vector2D} from "./Utility";
import {Team} from "../types/types";
import {PlayerServer} from "./Entities/PlayerServer";
import {PlayerBase} from "./Entities/PlayerBase";
import {ParticleSystemBase} from "./ParticleSystemBase";
import {CastleBase} from "./Entities/CastleBase";
import {CastleID, ClientID} from "./HeroGameLoopServer";

export abstract class HeroGameLoopBase {
    abstract players: Map<ClientID, PlayerBase>;
    abstract castles: Map<CastleID, CastleBase>;
    abstract particleSystem: ParticleSystemBase | null;

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
 }