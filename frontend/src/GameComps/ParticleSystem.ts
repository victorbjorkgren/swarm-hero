import {closestPointOnPolygon, Polygon, randomUnitVector, Vector2D} from "./Utility";

export class ParticleSystem {
    private particles: Particle[] = [];
    private teamParticles: Particle[][];
    private sqCohedeDist: number = 250 ** 2;
    private sqSeparateDistance: number = 75 ** 2;
    private cohesionFactor: number = 1;
    private separationFactor: number = 1;
    private alignFactor: number = 1;

    constructor(
        private particleN: number,
        private teams: Team[],
        private scene: Phaser.Scene,
        private polygonColliders: Polygon[] = [])
    {
        this.teamParticles = Array.from({ length: this.teams.length }, () => []);
    }

    render() {
        const graphics = (this.scene as any).graphics;

        if (graphics) {
            for (const particle of this.particles) {
                graphics.fillStyle(particle.color, 1);
                graphics.fillCircle(
                    particle.pos.x,
                    particle.pos.y,
                    particle.radius
                );
                for (const foePack of particle.firingLaserAt) {
                    if (foePack.target.isAlive()) {
                        graphics.lineStyle(1, 0xffffff, foePack.intensity);

                        // Draw the line (startX, startY, endX, endY)
                        graphics.beginPath();
                        graphics.moveTo(particle.pos.x, particle.pos.y); // Starting point of the line
                        graphics.lineTo(foePack.target.pos.x, foePack.target.pos.y); // Ending point of the line
                        graphics.strokePath(); // Apply the stroke to draw the line}
                    }
                }
            }
        }
        else {
            console.log('Particle system as no scene!')
        }
    }

    createParticle(origin: Vector2D, mass: number, maxVel: number, teamID: number, color: number): void {
        const p = new Particle( origin , mass, teamID, maxVel, color);
        p.setLeaderPosition(this.teams[teamID].centroid)
        this.particles.push(p);
        this.teamParticles[p.teamID].push(p)
    }

    update(): void {
        this.refillTeams();
        this.engageFights();
        this.fightFights();
        this.bringOutYourDead();
        this.checkCollisions();
        this.particleBehavior();
        this.updateBoid();
        this.updatePos()
    }

    updatePos(): void {
        for (const particle of this.particles) {
            particle.acc.limit(particle.maxAcc);
            particle.vel.add(particle.acc);
            particle.vel.limit(particle.maxVel);
            particle.pos.add(particle.vel);
        }
    }

    particleBehavior(): void {
        for (const particle of this.particles) {
            particle.initFrame();
            particle.approachDesiredVel();
            particle.calcDesiredPos();
            particle.approachDesiredPos();
        }
    }

    checkCollisions(): void {
        for (let i=0; i < this.particles.length; ++i) {
            for (const polygon of this.polygonColliders)
                ParticleSystem.handleBallPolygonCollision(this.particles[i], polygon)
            for (let j = i + 1; j < this.particles.length; j++) {
                ParticleSystem.handleParticleCollision(this.particles[i], this.particles[j]);
            }
        }
    }

    bringOutYourDead() {
        this.particles = this.particles.filter(particle => particle.isAlive());
        for (let i=0; i < this.teamParticles.length; ++i) {
            this.teamParticles[i] = this.teamParticles[i].filter(particle => particle.isAlive());
        }
    }

    refillTeams(){
        for (let i=0; i < this.teamParticles.length; ++i) {
            if (this.teamParticles[i].length < this.particleN) {
                this.createParticle(
                    randomUnitVector(35, 50).add(this.teams[i].centroid),
                    10,
                    1,
                    i,
                    this.teams[i].color
                )
            }
        }
    }

    engageFights(): void {
        for (const me of this.particles) {
            me.engaging = me.engaging.filter(foe => foe && foe.isAlive());
            me.engaging = me.engaging.filter(foe => Vector2D.sqDist(me.pos, foe.pos) < me.sqEngageRadius);
            if (me.engaging.length < me.maxTargets) {
                for (const other of this.particles) {
                    if (me.teamID !== other.teamID) {
                        if (Vector2D.sqDist(me.pos, other.pos) < me.sqEngageRadius)
                            me.engaging.push(other);
                    }
                }
            }
        }
    }

    fightFights(): void {
        for (const me of this.particles) {
            me.firingLaserAt = me.firingLaserAt.filter(foe => foe.target && foe.target.isAlive());
            me.firingLaserAt = me.firingLaserAt.filter(foe => Vector2D.sqDist(me.pos, foe.target.pos) < me.sqFireRadius);
            for (const foe of me.engaging) {
                const existingFoe = me.firingLaserAt.find(foeItem => foeItem.target === foe);
                if (existingFoe) {
                    existingFoe.intensity = Math.min(existingFoe.intensity + .01, 1);
                    existingFoe.target.health -= existingFoe.intensity;
                } else {
                    if (Vector2D.sqDist(me.pos, foe.pos) < me.sqFireRadius) {
                        me.firingLaserAt.push({target: foe, intensity: 0})
                    }
                }
            }
        }
    }

    updateBoid(): void {
        for (let i=0; i < this.particles.length; ++i) {
            if (this.particles[i].isBoiding) {
                const cohedePoint = Vector2D.zeros();
                const sepPoint = Vector2D.zeros();
                const alignV = Vector2D.zeros();
                let nCoh = 0;
                for (let j = 0; j < this.particles.length; j++) {
                    if (this.particles[i] === this.particles[j]) continue;
                    if (this.particles[j].isBoiding && (this.particles[i].teamID === this.particles[j].teamID)) {
                        const sqDist = Vector2D.sqDist(this.particles[i].pos, this.particles[j].pos);
                        // Cohede & Align
                        if (sqDist < this.sqCohedeDist && sqDist > this.sqSeparateDistance) {
                            cohedePoint.add(this.particles[j].pos);
                            alignV.add(this.particles[j].vel);
                            nCoh += 1
                        }
                        // Separate
                        if (sqDist < this.sqSeparateDistance) {
                            sepPoint.sub(this.particles[j].pos).add(this.particles[i].pos);
                        }
                    }
                }
                if (nCoh > 0)
                    cohedePoint.scale(1 / nCoh).sub(this.particles[i].pos).scale(this.cohesionFactor);
                    alignV.scale(1 / nCoh).sub(this.particles[i].vel).scale(this.alignFactor);
                sepPoint.scale(this.separationFactor);
                const desiredV = Vector2D.add(cohedePoint, sepPoint);
                this.particles[i].acc.add(Vector2D.subtract(desiredV, this.particles[i].vel));
            }
        }
    }

    static handleParticleCollision(
        p1: Particle,
        p2: Particle,
    ): void {
        // Difference in positions and velocities
        const dx = p2.pos.x - p1.pos.x;
        const dy = p2.pos.y - p1.pos.y;
        const dvx = p2.vel.x - p1.vel.x;
        const dvy = p2.vel.y - p1.vel.y;

        const distSq = dx * dx + dy * dy;
        if (distSq === 0 || distSq > ((p1.radius + p2.radius) ** 2)) return;

        const dotProduct = dvx * dx + dvy * dy;
        if (dotProduct >= 0) return; // Already moving apart, no need to adjust velocities
        const factor = (2 * dotProduct) / ((p1.mass + p2.mass) * distSq);

        // Update velocities in place
        p1.vel.x += factor * p2.mass * dx;
        p1.vel.y += factor * p2.mass * dy;
        p2.vel.x -= factor * p1.mass * dx;
        p2.vel.y -= factor * p1.mass * dy;
    }


    static handleBallPolygonCollision(
        particle: Particle,
        polygon: Polygon,
    ): void {
        const closestPoint = closestPointOnPolygon(polygon.verts, particle.pos);

        const dx = closestPoint.x - particle.pos.x;
        const dy = closestPoint.y - particle.pos.y;

        const distSq = dx * dx + dy * dy;

        const dist = Math.sqrt(distSq);

        if (dist >= particle.radius) return; // No collision if the ball is not intersecting

        // Normal vector at the point of collision
        const normal = new Vector2D(dx / dist, dy / dist);

        // return if particle has already collided and is moving away
        if (Vector2D.dotProduct(particle.vel, normal) <= 0) return;

        const velocityAlongNormal = Vector2D.dotProduct(particle.vel, normal);

        // Reflect the ball's velocity along the normal (elastic collision)
        particle.vel.x -= 2 * velocityAlongNormal * normal.x;
        particle.vel.y -= 2 * velocityAlongNormal * normal.y;
    }
}


class Particle {
    vel: Vector2D;
    acc: Vector2D = Vector2D.zeros();
    leaderPosition: Vector2D | undefined;
    radius: number;
    isBoiding: boolean = true;
    isEngaging: boolean = false;
    sqFireRadius: number = 50**2;
    sqEngageRadius: number = 100**2;
    maxTargets: number = 1;
    engaging: Particle[] = [];
    firingLaserAt: FiringLaserAt[] = [];
    desiredPos: Vector2D | undefined = undefined;
    desiredSpeed: number = .75;
    desiredLeaderDist: {min: number, max: number} = {min: 50, max: 60};
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
        this.radius = mass ** (1/3);
    }

    setLeaderPosition(position: Vector2D) {
        this.leaderPosition = position;
    }

    calcDesiredPos() {
        if (this.engaging.length > 0) {
            if (this.engaging[0].health <= this.health) {
                // BRAVADO
                this.desiredPos = this.engaging[0].pos
            } else {
                // FEAR
                Vector2D.subtract(this.engaging[0].pos, this.pos).scale(-1);
            }
        } else {
            if (this.leaderPosition) {
                const leaderDelta = Vector2D.subtract(this.leaderPosition, this.pos);
                const leaderDist = leaderDelta.magnitude();
                if (leaderDist < this.desiredLeaderDist.min) {
                    this.desiredPos = Vector2D.add(this.pos, leaderDelta.scale(-1));
                }
                else if (leaderDist > this.desiredLeaderDist.max) {
                    this.desiredPos = Vector2D.add(this.pos, leaderDelta.scale(1));
                }
                else {
                    this.desiredPos = undefined;
                }
                console.log(this.desiredPos);
            } else {
                this.desiredPos = undefined;
            }
        }
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
    target: Particle;
    intensity: number;
}


export interface Team {
    color: number,
    id: number,
    centroid: Vector2D
}
