import {Player} from "../Player";
import {Particle} from "../Particle";
import {Vector2D} from "../Utility";
import {Castle} from "../Castle";
import {Entity} from "../../types/types";

export class AIBehavior {
    private detectionRange: number = 800;
    private sqDetectionRange: number = this.detectionRange ** 2;
    private safeSeparationDistancePlayer: number = 400;
    private sqSafeSeparationDistancePlayer: number = this.safeSeparationDistancePlayer ** 2;
    private safeSeparationDistanceCastle: number = 400;
    private sqSafeSeparationDistanceCastle: number = this.safeSeparationDistanceCastle ** 2;
    public readonly framesBetweenCalls: number = 10;

    constructor(private player: Player, private otherPlayer: Player) {}

    getTarget(): Vector2D {
        const combatDir = this.fightOrFlight();
        if (!combatDir.isZero()) {
            return combatDir
        };
        if (this.wantsDrone() > 0) {
            const castlePos = this.nearestFriendlyCastle()!.pos
            return Vector2D.subtract(castlePos, this.player.pos)
        }
        return Vector2D.zeros();
    }

    wantsDrone(): number {
        const castleD = this.distanceToNearestFriendlyCastle();
        if (castleD === null) return 0;
        const canBuyN = this.player.gold / Particle.price;
        const distancePenalty = .01 * castleD;
        return canBuyN / distancePenalty;
    }

    fightOrFlight() {
        const flightFromPos: Vector2D[] = [];
        const fightAtPos: Vector2D[] = [];
        const flee: Entity[] = [];
        const fight: Entity[] = [];
        this.nearbyFoes().forEach((foe) => {
            const difficulty = this.estimateFoeStrength(foe);
            if (difficulty > 1) {
                flightFromPos.push(foe.pos.copy());
                flee.push(foe);
            } else if (difficulty < 1) {
                fightAtPos.push(foe.pos.copy());
                fight.push(foe);
            }
        })
        this.nearbyFoeCastles().forEach((castle)=>{
            const difficulty = this.estimateFoeStrength(castle);
            if (difficulty > 1) {
                flightFromPos.push(castle.pos.copy())
                flee.push(castle);
            } else if (difficulty < 1) {
                fightAtPos.push(castle.pos.copy())
                fight.push(castle)
            }
        })
        this.player.targetedBy.forEach(attacker => {
            flightFromPos.push(attacker.pos.copy())
            flee.push(attacker);
        })
        if (flightFromPos.length === 0 && fightAtPos.length ===0) {
            return Vector2D.zeros();
        }

        // Flee if need be
        const dir = Vector2D.zeros()
        flightFromPos.forEach((scaryEntity) => {
            const d = Vector2D.subtract(scaryEntity, this.player.pos).scale(-1);
            d.toUnit();
            dir.add(d);
        })
        if (!dir.isZero()) {
            dir.toUnit();
            const nearestCastle = this.nearestFriendlyCastle();
            if (nearestCastle !== null) {
                const castleDir = Vector2D.subtract(nearestCastle.pos, this.player.pos).toUnit();
                dir.add(castleDir);
                dir.scale(.5);
            }
            return dir;
        }

        // Get nearest fightable position
        let minSqD: number = 1000000000;
        let fightPoint: Vector2D | undefined;
        fightAtPos.forEach((strikePosition) => {
            const strikeVector = Vector2D.subtract(strikePosition, this.player.pos)
            const sqD = strikeVector.sqMagnitude();
            if (sqD < minSqD) {
                minSqD = sqD;
                fightPoint = strikeVector.copy();
            }
        })
        if (fightPoint !== undefined) {
            dir.add(fightPoint);
            return dir;
        }
        throw Error('Unreachable flight or fight state');
    }

    estimateFoeStrength(foe: Entity): number {
        if (this.player.myDrones.length === 0) return 1000;
        return foe.myDrones.length / this.player.myDrones.length;
    }

    nearbyFoes(): Player[] {
        const nearbyPlayers = [];
        const sqDist = Vector2D.subtract(this.player.pos, this.otherPlayer.pos).sqMagnitude();
        if (sqDist <= (this.sqDetectionRange)) nearbyPlayers.push(this.otherPlayer);
        return nearbyPlayers;
    }

    nearbyFoeCastles(): Castle[] {
        const nearbyFoeCastles = [];
        for (const castle of this.otherPlayer.team.castles) {
            const sqDist = Vector2D.subtract(this.player.pos, castle.pos).sqMagnitude();
            if (sqDist <= (this.sqDetectionRange)) nearbyFoeCastles.push(castle);
        }
        return nearbyFoeCastles;
    }

    nearestFriendlyCastle(): Castle | null {
        if (this.player.team.castles.length === 0) return null;
        let nearestFriendlyCastle: Castle | null = null;
        let minSqD: number = 1000000000;
        for (const castle of this.player.team.castles) {
            const sqDist = Vector2D.subtract(this.player.pos, castle.pos).sqMagnitude();
            if (sqDist <= minSqD) {
                nearestFriendlyCastle = castle;
                minSqD = sqDist;
            }
        }
        return nearestFriendlyCastle;
    }

    distanceToNearestFriendlyCastle(): number | null {
        const nearestCastle = this.nearestFriendlyCastle();
        if (nearestCastle === null) return null;
        return Vector2D.subtract(this.player.pos, nearestCastle.pos).magnitude();
    }
}