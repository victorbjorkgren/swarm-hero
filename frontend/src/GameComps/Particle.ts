import {Entity, massToRadius, randomUnitVector, Vector2D} from "./Utility";

export class Particle implements Entity {
    vel: Vector2D;
    acc: Vector2D = Vector2D.zeros();
    leaderPosition: Vector2D | undefined;
    radius: number;
    isBoiding: boolean = true;
    isEngaging: boolean = false;
    sqFireRadius: number = 50 ** 2;
    sqEngageRadius: number = 100 ** 2;
    maxTargets: number = 1;
    engaging: Entity[] = [];
    firingLaserAt: FiringLaserAt[] = [];
    desiredPos: Vector2D | undefined = undefined;
    desiredSpeed: number = .75;
    desiredLeaderDist: { min: number, max: number } = {min: 50, max: 60};
    maxAcc: number = .05;
    health: number = 100;

    constructor(
        public pos: Vector2D,
        public mass: number,
        public teamID: number,
        public maxVel: number = 1,
        public color: number
    ) {
        this.vel = randomUnitVector().scale(this.maxVel);
        this.radius = massToRadius(mass);
    }

    setLeaderPosition(position: Vector2D) {
        this.leaderPosition = position;
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
            if (this.leaderPosition) {
                const leaderDelta = Vector2D.subtract(this.leaderPosition, this.pos);
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
        return this.health > 0;
    }
}

interface FiringLaserAt {
    target: Entity;
    intensity: number;
    firingPos: Vector2D;
}