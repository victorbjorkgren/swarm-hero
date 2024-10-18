import {massToRadius, randomUnitVector, Vector2D} from "../Utility";
import {EntityBase, Team} from "../../types/types";
import {Graphics} from "pixi.js";
import HeroGameLoopServer, {EntityID, ParticleID} from "../HeroGameLoopServer";
import {UnitPack} from "../../types/unitTypes";
import {UnitManager} from "../UnitManager";
import {HeroGameLoopBase} from "../HeroGameLoopBase";

export class ParticleBase implements EntityBase {
    vel: Vector2D;
    acc: Vector2D = Vector2D.zeros();
    leaderPosition: Vector2D | undefined;
    radius: number;
    isBoiding: boolean = true;
    isEngaging: boolean = false;
    sqFireRadius: number = 50 ** 2;
    sqEngageRadius: number = 100 ** 2;
    maxTargets: number = 1;
    engaging: EntityBase[] = [];
    firingLaserAt: FiringLaserAt[] = [];
    desiredPos: Vector2D | undefined = undefined;
    desiredSpeed: number = .75;
    desiredLeaderDist: { min: number, max: number } = {min: 50, max: 60};
    maxAcc: number = .05;
    givesIncome: number = 0;

    targetedBy: EntityID[] = [];

    particleSprite: Graphics | null = null;
    attackSprite: Graphics | null = null;
    healthSprite: Graphics | null = null;
    debugSprite: Graphics | null = null;

    protected maxHealth: number = 100;
    protected _health: number = this.maxHealth;

    static price: number = 100;

    constructor(
        public pos: Vector2D,
        public mass: number,
        public team: Team,
        public maxVel: number = 1,
        public color: number,
        protected scene: HeroGameLoopBase,
        public groupID: number,
        public unitInfo: UnitPack,
        public owner: EntityBase,
        protected unitManager: UnitManager,
        public id: ParticleID,
    ) {
        this.vel = randomUnitVector().scale(this.maxVel);
        this.radius = massToRadius(mass);
    }

    receiveDamage(damage: number): void {
        this._health -= damage;
        if (this._health <= 0) {
            this.onDeath();
        }
    }

    get health(): number {
        return this._health;
    }

    set health(value: number) {
        this._health = value;
        if (this._health <= 0) {
            this.onDeath();
        }
    }

    setGroupID(groupID: number): void {
        this.groupID = groupID;
    }


    onDeath() {
        this.unitManager.remove(this);
    }

    setLeaderPosition(position: Vector2D) {
        this.leaderPosition = position;
    }

    getLeaderPosition() {
        if (this.leaderPosition === undefined) return undefined
        return Vector2D.add(this.leaderPosition, Vector2D.ones().scale(20));
    }

    calcDesiredPos() {
        if (this.engaging.length > 0) {
            // if (this.engaging[0].health <= this.health) {
                // BRAVADO
            this.desiredPos = this.engaging[0].getFiringPos(this.pos);
            // } else {
                // FEAR
            //    this.desiredPos = Vector2D.subtract(this.engaging[0].pos, this.pos).scale(-1);
            // }
        } else {
            const leaderPosition = this.getLeaderPosition();
            if (leaderPosition !== undefined) {
                const leaderDelta = Vector2D.subtract(leaderPosition, this.pos);
                const leaderDist = leaderDelta.magnitude();
                if (leaderDist < this.desiredLeaderDist.min) {
                    this.desiredPos = Vector2D.add(this.pos, leaderDelta.scale(-1));
                } else if (leaderDist > this.desiredLeaderDist.max) {
                    this.desiredPos = Vector2D.add(this.pos, leaderDelta.scale(1));
                } else {
                    this.desiredPos = undefined;
                }
            } else {
                this.desiredPos = undefined;
            }
        }
    }

    getFiringPos(from: Vector2D): Vector2D {
        return this.pos;
    }

    approachDesiredVel() {
        this.vel.scale(1 + this.desiredSpeed - this.vel.magnitude());
    }

    initFrame() {
        this.acc = Vector2D.zeros();
        if (this.engaging.length > 0) {
            this.isEngaging = true;
            this.isBoiding = false
        } else {
            this.isEngaging = false;
            this.isBoiding = true
        }

    }

    approachDesiredPos() {
        if (this.desiredPos) {
            const desiredV = Vector2D.subtract(this.desiredPos, this.pos);
            this.acc.add(Vector2D.subtract(desiredV, this.vel));
        }
    }

    isAlive(): boolean {
        return this._health > 0;
    }
}

interface FiringLaserAt {
    target: EntityBase;
    intensity: number;
    firingPos: Vector2D;
}