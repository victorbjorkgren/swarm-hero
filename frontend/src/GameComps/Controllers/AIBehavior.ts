import {PlayerServer} from "../Entities/PlayerServer";
import {Vector2D} from "../Utility";
import {CastleServer} from "../Entities/CastleServer";
import {EntityBase, EntityTypes} from "../../types/types";
import HeroGameLoopServer from "../HeroGameLoopServer";
import {NavMesh} from "../NavMesh";
import {UnitManager} from "../UnitManager";
import {ParticleBase} from "../Entities/ParticleBase";
import {CastleBase} from "../Entities/CastleBase";
import {PlayerClient} from "../Entities/PlayerClient";
import {HeroGameLoopClient} from "../HeroGameLoopClient";
import {CastleID, ClientID} from "@shared/commTypes";

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
    public readonly framesBetweenNavmeshCalls: number = 60;
    private state: State = State.RaiseArmy;
    private engaging: EntityBase | null = null;
    private fleeDir: Vector2D;
    private navMesh: NavMesh;

    private frameCounter: number = 0;

    public targetDir: Vector2D;
    public targetPath: Vector2D[] = [];
    public pathTarget: Vector2D;
    public doBuy: boolean = false;
    public doSpecial: boolean = false;

    constructor(private player: PlayerClient, private otherPlayer: PlayerClient, private scene: HeroGameLoopClient) {
        this.targetDir = Vector2D.zeros();
        this.fleeDir = Vector2D.zeros();
        this.pathTarget = player.pos.copy();
        this.visibleDistance = Math.max(scene.sceneWidth, scene.sceneHeight);
        this.safeSeparationDistancePlayer = scene.sceneWidth / 2;
        this.safeSeparationDistanceCastle = scene.sceneWidth / 3;

        this.navMesh = new NavMesh(scene);
        this.navMesh.updateNavMesh(scene.colliders);
    }

    getUnitManager(): UnitManager<ParticleBase> | undefined {
        return this.scene.particleSystem?.getParticles();
    }

    update() {
        // DebugDrawer.addPath(this.targetPath, 0xFF0000)
        if (this.frameCounter % this.framesBetweenConditionCalls === 0) {
            this.setState()
        }
        if (this.frameCounter % this.framesBetweenBehaviorCalls === 0) {
            this.executeState();
        }
    }

    executeState() {
        // console.log(this.state);
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

    updateTargetPath(target: Vector2D) {
        if (this.targetPath.length > 0) {
            if (Vector2D.sqDist(this.targetPath[0], this.player.pos) <= ((NavMesh.scale / 2) ** 2)) {
                this.targetPath.shift();
            }
        }
        if ((this.frameCounter % this.framesBetweenNavmeshCalls === 0) || this.targetPath.length === 0) {
            if (!Vector2D.isEqual(target, this.pathTarget)) {
                this.targetPath = this.navMesh.aStar(this.player.pos, target);
            }
        }
        if (this.targetPath.length === 0) {
            this.targetDir = Vector2D.subtract(target, this.player.pos);
        } else {
            this.targetDir = Vector2D.subtract(this.targetPath[0], this.player.pos);
        }
        this.pathTarget = target.copy();
    }

    fleeBehavior() {
        const nearestCastle = this.nearestFriendlyCastle();
        if (nearestCastle === null) {
            this.targetDir = this.fleeDir.scale(this.framesBetweenConditionCalls);
        } else {
            this.updateTargetPath(nearestCastle.pos.copy());
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
        for (const castleId of castles) {
            const castle = this.scene.castles.get(castleId);
            if (!castle) continue;
            const d = this.estimateFoeStrength(castle, this.player);
            dir.add(Vector2D.subtract(castle.pos, this.player.pos).scale(-d));
            difficulty += d;
        }
        for (const foeId of foes) {
            const foe = this.scene.players.get(foeId);
            if (!foe) continue;
            const d = this.estimateFoeStrength(foe, this.player);
            dir.add(Vector2D.subtract(foe.pos, this.player.pos).scale(-d));
            difficulty += d;
        }
        this.fleeDir = dir;
        return difficulty > 1;
    }

    fightPlayerBehavior() {
        if (this.engaging && this.engaging.isAlive()) {
            this.updateTargetPath(this.engaging.pos.copy());
            // this.targetDir = Vector2D.subtract(this.engaging.pos.copy(), this.player.pos);
        }
    }

    fightPlayerCondition(): boolean {
        const foes = this.nearbyFoes(this.visibleDistance);
        if (foes.length === 0) return false;
        let minDifficulty = 1;
        for (const foeId of foes) {
            const foe = this.scene.players.get(foeId);
            if (!foe) continue;
            const difficulty = this.reinforcedStrength(foe, this.nearbyFoeCastles(this.visibleDistance), EntityTypes.Castle, this.player);
            if (difficulty < minDifficulty) {
                this.engaging = foe;
                minDifficulty = difficulty;
            }
        }
        return minDifficulty < 1;
    }

    fightCastleBehavior() {
        if (this.engaging && this.engaging.isAlive()) {
            this.updateTargetPath(this.engaging.pos.copy());
            // this.targetDir = Vector2D.subtract(this.engaging.pos, this.player.pos);
        }
    }

    fightCastleCondition(): boolean {
        const castleIds = this.nearbyFoeCastles(this.visibleDistance);
        // castles.filter(castle => castle && castle.isAlive());
        if (castleIds.length === 0) return false;
        let minDifficulty = 1;
        for (const castleId of castleIds) {
            const castle = this.scene.castles.get(castleId);
            if (!castle) continue;
            const difficulty = this.reinforcedStrength(castle, this.nearbyFoes(this.visibleDistance), EntityTypes.Player, this.player);
            if (difficulty < minDifficulty) {
                this.engaging = castle;
                minDifficulty = difficulty;
            }
        }
        return minDifficulty < 1;
    }

    reinforceCastleBehavior() {
        if (this.engaging && this.engaging.isAlive()) {
            this.updateTargetPath(this.engaging.pos.copy());
            // this.targetDir = Vector2D.subtract(this.engaging.pos.copy(), this.player.pos);
        }
        this.doBuy = true;
    }

    reinforceCastleCondition(): boolean {
        const castleIds = this.player.team!.castleIds;
        if (castleIds.length === 0) return false;
        let minVul = 1;
        for (const castleId of castleIds) {
            const castle = this.scene.castles.get(castleId);
            if (!castle) continue;
            for (const foeId of this.nearbyFoes(this.visibleDistance)) {
                const foe = this.scene.players.get(foeId);
                if (!foe) continue;
                const vulnerability = this.reinforcedStrength(castle, this.player.team!.playerIds, EntityTypes.Player, foe);
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
            this.updateTargetPath(castle.pos.copy());
            // this.targetDir = Vector2D.subtract(castle.pos, this.player.pos);
        } else {
            this.targetDir = Vector2D.zeros();
        }
        this.doBuy = true;
    }

    estimateFoeStrength(foe: EntityBase, attacker: EntityBase): number {
        const foeDrones = this.getUnitManager()?.flatOwnerCount(foe.id) || 0
        const attackerDrones = this.getUnitManager()?.flatOwnerCount(attacker.id) || 0
        if (attackerDrones === 0) return 1000;
        return foeDrones / attackerDrones;
    }

    nearbyFoes(dist: number): ClientID[] {
        const nearbyPlayers = [];
        const sqDist = Vector2D.subtract(this.player.pos, this.otherPlayer.pos).sqMagnitude();
        if (sqDist <= (dist*dist)) nearbyPlayers.push(this.otherPlayer.id);
        return nearbyPlayers;
    }

    nearbyFoeCastles(dist: number): CastleID[] {
        const nearbyFoeCastles = [];
        for (const castleId of this.otherPlayer.team!.castleIds) {
            const castle = this.scene.castles.get(castleId);
            if (castle && castle.isAlive()) {
                const sqDist = Vector2D.subtract(this.player.pos, castle.pos).sqMagnitude();
                if (sqDist <= (dist*dist)) nearbyFoeCastles.push(castle.id);
            }
        }
        return nearbyFoeCastles;
    }

    getProtectorMap(type: EntityTypes) {
        switch (type) {
            case EntityTypes.Player:
                return this.scene.players
            case EntityTypes.Castle:
                return this.scene.castles
            default:
                throw new Error(`Unsupported protector: ${type}`);
        }
    }

    reinforcedStrength(defendent: EntityBase, protection: ClientID[], protectionType: EntityTypes, attacker: EntityBase): number {
        let difficulty = this.estimateFoeStrength(defendent, attacker);
        const protectorMap = this.getProtectorMap(protectionType);
        for (const protectorId of protection) {
            const protector = protectorMap.get(protectorId);
            if (!protector) continue;
            if (defendent.pos.sqDistanceTo(protector.pos) < defendent.pos.sqDistanceTo(attacker.pos)) {
                difficulty += this.estimateFoeStrength(protector, attacker);
            }
        }
        return difficulty;
    }

    nearestFriendlyCastle(): CastleBase | null {
        if (this.player.team!.castleIds.length === 0) return null;
        let nearestFriendlyCastle: CastleServer | null = null;
        let minSqD: number = 1000000000;
        for (const castleId of this.player.team!.castleIds) {
            const castle = this.scene.castles.get(castleId);
            if (!castle) continue;
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