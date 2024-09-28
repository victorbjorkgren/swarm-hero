import {Player} from "../Player";
import {Particle} from "../Particle";
import {Vector2D} from "../Utility";
import {Castle} from "../Castle";
import {Entity} from "../../types/types";
import HeroGameLoop from "../HeroGameLoop";

enum State {
    Flee,
    AttackPlayer,
    AttackCastle,
    ReinforceCastle,
    RaiseArmy
}

export class AIBehavior {
    private visibleDistance: number;
    private safeSeparationDistancePlayer: number;
    private safeSeparationDistanceCastle: number;
    public readonly framesBetweenConditionCalls: number = 40;
    public readonly framesBetweenBehaviorCalls: number = 10;
    private state: State = State.RaiseArmy;
    private engaging: Entity | null = null;
    private fleeDir: Vector2D;

    private frameCounter: number = 0;

    public targetDir: Vector2D
    public doBuy: boolean = false;
    public doSpecial: boolean = false;

    constructor(private player: Player, private otherPlayer: Player, scene: HeroGameLoop) {
        this.targetDir = Vector2D.zeros();
        this.fleeDir = Vector2D.zeros();
        this.visibleDistance = Math.max(scene.sceneWidth, scene.sceneHeight);
        this.safeSeparationDistancePlayer = scene.sceneWidth / 2;
        this.safeSeparationDistanceCastle = scene.sceneWidth / 3;
    }

    update() {
        if (this.frameCounter % this.framesBetweenConditionCalls === 0) {
            this.setState()
        }
        if (this.frameCounter % this.framesBetweenBehaviorCalls === 0) {
            this.executeState();
        }
    }

    executeState() {
        console.log(this.state);
        switch (this.state) {
            case State.RaiseArmy:
                this.raiseArmyBehavior();
                break;
            case State.Flee:
                this.fleeBehavior();
                break;
            case State.ReinforceCastle:
                this.reinforceCastleBehavior();
                break;
            case State.AttackCastle:
                this.fightCastleBehavior();
                break;
            case State.AttackPlayer:
                this.fightPlayerBehavior();
                break;
            default:
                throw Error(`AI Tried executing unknown state ${this.state}`)

        }
    }

    setState() {
        if (this.fleeCondition()) {
            this.state = State.Flee
        }
        else if (this.fightCastleCondition()) {
            this.state = State.AttackCastle;
        }
        else if (this.fightPlayerCondition()) {
            this.state = State.AttackPlayer;
        }
        else if (this.reinforceCastleCondition()) {
            this.state = State.ReinforceCastle;
        }
        else {
            this.state = State.RaiseArmy
        }
    }

    fleeBehavior() {
        const nearestCastle = this.nearestFriendlyCastle();
        if (nearestCastle === null) {
            this.targetDir = this.fleeDir.scale(this.framesBetweenConditionCalls);
        } else {
            this.targetDir = Vector2D.subtract(nearestCastle.pos, this.player.pos);
            // this.targetDir = Vector2D.add(this.fleeDir.scale(.1), castleDir).toUnit().scale(this.framesBetweenConditionCalls);
            this.doBuy = true;
        }
    }

    fleeCondition(): boolean {
        let difficulty = 0;
        const dir = Vector2D.zeros();
        const targetedByDrones = this.player.targetedBy.filter(drone => drone.isAlive());
        if (targetedByDrones.length > 0) {
            for (const drone of targetedByDrones) {
                dir.add(Vector2D.subtract(drone.pos, this.player.pos).scale(-1))
            }
            this.fleeDir = dir;
            return true;
        }
        const foes = this.nearbyFoes(this.safeSeparationDistancePlayer);
        const castles = this.nearbyFoeCastles(this.safeSeparationDistanceCastle);
        for (const castle of castles) {
            const d = this.estimateFoeStrength(castle, this.player);
            dir.add(Vector2D.subtract(castle.pos, this.player.pos).scale(-d));
            difficulty += d;
        }
        for (const foe of foes) {
            const d = this.estimateFoeStrength(foe, this.player);
            dir.add(Vector2D.subtract(foe.pos, this.player.pos).scale(-d));
            difficulty += d;
        }
        this.fleeDir = dir;
        return difficulty > 1;
    }

    fightPlayerBehavior() {
        if (this.engaging && this.engaging.isAlive()) {
            this.targetDir = Vector2D.subtract(this.engaging.pos.copy(), this.player.pos);
        }
    }

    fightPlayerCondition(): boolean {
        const foes = this.nearbyFoes(this.visibleDistance);
        if (foes.length === 0) return false;
        let minDifficulty = 1;
        for (const foe of foes) {
            const difficulty = this.reinforcedStrength(foe, this.nearbyFoeCastles(this.visibleDistance), this.player);
            if (difficulty < minDifficulty) {
                this.engaging = foe;
                minDifficulty = difficulty;
            }
        }
        return minDifficulty < 1;
    }

    fightCastleBehavior() {
        if (this.engaging && this.engaging.isAlive()) {
            this.targetDir = Vector2D.subtract(this.engaging.pos, this.player.pos);
        }
    }

    fightCastleCondition(): boolean {
        const castles = this.nearbyFoeCastles(this.visibleDistance);
        castles.filter(castle => castle && castle.isAlive());
        if (castles.length === 0) return false;
        let minDifficulty = 1;
        for (const castle of castles) {
            const difficulty = this.reinforcedStrength(castle, this.nearbyFoes(this.visibleDistance), this.player);
            if (difficulty < minDifficulty) {
                this.engaging = castle;
                minDifficulty = difficulty;
            }
        }
        return minDifficulty < 1;
    }

    reinforceCastleBehavior() {
        if (this.engaging && this.engaging.isAlive()) {
            this.targetDir = Vector2D.subtract(this.engaging.pos.copy(), this.player.pos);
        }
        this.doBuy = true;
    }

    reinforceCastleCondition(): boolean {
        const castles = this.player.team.castles;
        if (castles.length === 0) return false;
        let minVul = 1;
        for (const castle of castles) {
            for (const foe of this.nearbyFoes(this.visibleDistance)) {
                const vulnerability = this.reinforcedStrength(castle, this.player.team.players, foe);
                if (vulnerability < minVul) {
                    minVul = vulnerability;
                    this.engaging = castle;
                }
            }
        }
        return minVul < 1;
    }

    raiseArmyBehavior() {
        const castle = this.nearestFriendlyCastle();
        if (castle && castle.isAlive() && castle.pos.sqDistanceTo(this.player.pos) > castle.sqActivationDist) {
            this.targetDir = Vector2D.subtract(castle.pos, this.player.pos);
        } else {
            this.targetDir = Vector2D.zeros();
        }
        this.doBuy = true;
    }

    estimateFoeStrength(foe: Entity, target: Entity): number {
        if (target.myDrones.length === 0) return 1000;
        return foe.myDrones.length / target.myDrones.length;
    }

    nearbyFoes(dist: number): Player[] {
        const nearbyPlayers = [];
        const sqDist = Vector2D.subtract(this.player.pos, this.otherPlayer.pos).sqMagnitude();
        if (sqDist <= (dist*dist)) nearbyPlayers.push(this.otherPlayer);
        return nearbyPlayers;
    }

    nearbyFoeCastles(dist: number): Castle[] {
        const nearbyFoeCastles = [];
        for (const castle of this.otherPlayer.team.castles) {
            if (castle && castle.isAlive()) {
                const sqDist = Vector2D.subtract(this.player.pos, castle.pos).sqMagnitude();
                if (sqDist <= (dist*dist)) nearbyFoeCastles.push(castle);
            }
        }
        return nearbyFoeCastles;
    }

    reinforcedStrength(defendent: Entity, protection: Entity[], attacker: Entity): number {
        let difficulty = this.estimateFoeStrength(defendent, attacker);
        for (const protector of protection) {
            if (defendent.pos.sqDistanceTo(protector.pos) < defendent.pos.sqDistanceTo(attacker.pos)) {
                difficulty += this.estimateFoeStrength(protector, attacker);
            }
        }
        return difficulty;
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