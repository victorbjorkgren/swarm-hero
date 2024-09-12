import {
    closestPointOnPolygon,
    Entity,
    isInsidePolygon,
    PolygonalCollider,
    randomUnitVector,
    Team,
    Vector2D
} from "./Utility";
import {Particle} from "./Particle";

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
        private polygonColliderEntities: PolygonalCollider[] = [])
    {
        this.teamParticles = Array.from({ length: this.teams.length }, () => []);
    }

    render() {
        const graphics = (this.scene as any).graphics;

        if (graphics) {
            // graphics.fillStyle(0x00ff00, 1);
            // for (const team of this.teams) {
            //     for (const player of team.players) {
            //         for (const v of player.collider.verts) {
            //             graphics.fillCircle(v.x, v.y, 2);
            //         }
            //     }
            // }

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
                        graphics.lineTo(foePack.firingPos.x, foePack.firingPos.y); // Ending point of the line
                        graphics.strokePath(); // Apply the stroke to draw the line
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
        p.setLeaderPosition(this.teams[teamID].playerCentroid)
        this.particles.push(p);
        this.teamParticles[p.teamID].push(p)
    }

    update(): void {
        this.refillTeams();
        this.engageFights();
        this.fightFights();
        this.bringOutYourDead();
        // this.checkCollisions();
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
            for (const polygonHolder of this.polygonColliderEntities)
                ParticleSystem.handleBallPolygonCollision(this.particles[i], polygonHolder);
            for (const team of this.teams) {
                for (const player of team.players) {
                    ParticleSystem.handleBallPolygonCollision(this.particles[i], player);
                }
            }
            for (let j = i + 1; j < this.particles.length; j++) {
                ParticleSystem.handleCircleCollision(this.particles[i], this.particles[j]);
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
                    randomUnitVector(35, 50).add(this.teams[i].playerCentroid),
                    10,
                    1,
                    i,
                    this.teams[i].color
                )
            }
        }
    }

    engageIfClose(me: Particle, other: Entity) {
        if (Vector2D.sqDist(me.pos, other.getFiringPos(me.pos)) < me.sqEngageRadius) {
            me.engaging.push(other)
        }
    }

    engageFights(): void {
        for (const me of this.particles) {
            me.engaging = me.engaging.filter(foe => foe && foe.isAlive());
            me.engaging = me.engaging.filter(foe => Vector2D.sqDist(me.pos, foe.getFiringPos(me.pos)) < me.sqEngageRadius);
            if (me.engaging.length >= me.maxTargets) return
            for (const team of this.teams) {
                if (team.id === me.teamID) continue
                team.players.forEach(player => {
                    this.engageIfClose(me, player)
                    if (me.engaging.length >= me.maxTargets) return
                })
                team.castles.forEach(castle => {
                    this.engageIfClose(me, castle)
                    if (me.engaging.length >= me.maxTargets) return
                })
            }

            if (me.engaging.length >= me.maxTargets) return
            for (const other of this.particles) {
                if (me.teamID !== other.teamID) {
                    this.engageIfClose(me, other);
                    if (me.engaging.length >= me.maxTargets) return
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
                const firingPos = foe.getFiringPos(me.pos);
                if (existingFoe) {
                    existingFoe.intensity = Math.min(existingFoe.intensity + .01, 1);
                    existingFoe.target.health -= existingFoe.intensity;
                    existingFoe.firingPos = firingPos;
                } else {
                    if (Vector2D.sqDist(me.pos, firingPos) < me.sqFireRadius) {
                        me.firingLaserAt.push({
                            target: foe,
                            intensity: 0,
                            firingPos: firingPos
                        })
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

    static handleCircleCollision(
        p1: Entity,
        p2: Entity,
    ): void {
        // Difference in positions and velocities
        const dx = p2.pos.x - p1.pos.x;
        const dy = p2.pos.y - p1.pos.y;
        const dvx = p2.vel.x - p1.vel.x;
        const dvy = p2.vel.y - p1.vel.y;

        // Calculate the squared distance between the particles
        const distSq = dx * dx + dy * dy;
        const combinedRadius = p1.radius + p2.radius;

        // If the particles are either at the same position or not touching, return
        if (distSq === 0 || distSq > combinedRadius * combinedRadius) return;

        // Dot product of relative velocity and relative position
        const dotProduct = dvx * dx + dvy * dy;
        if (dotProduct >= 0) return; // Already moving apart, no need to adjust velocities

        // Calculate the collision response factor based on the masses of the particles
        const factor = (2 * dotProduct) / ((p1.mass + p2.mass) * distSq);

        // Update velocities based on the collision
        p1.vel.x += factor * p2.mass * dx;
        p1.vel.y += factor * p2.mass * dy;
        p2.vel.x -= factor * p1.mass * dx;
        p2.vel.y -= factor * p1.mass * dy;

        // Adjust positions to prevent overlapping
        const distance = Math.sqrt(distSq);
        const overlap = (combinedRadius - distance) / 2;
        const correctionFactorX = (dx / distance) * overlap;
        const correctionFactorY = (dy / distance) * overlap;

        p1.pos.x -= correctionFactorX;
        p1.pos.y -= correctionFactorY;
        p2.pos.x += correctionFactorX;
        p2.pos.y += correctionFactorY;
    }


    static handleBallPolygonCollision_(
        particle: Particle,
        polygonHolder: PolygonalCollider,
    ): void {
        const closestPoint = closestPointOnPolygon(polygonHolder.collider.verts, particle.pos);

        const dx = closestPoint.x - particle.pos.x;
        const dy = closestPoint.y - particle.pos.y;

        const distSq = dx * dx + dy * dy;

        const dist = Math.sqrt(distSq);

        if (dist >= particle.radius) return; // No collision if the ball is not intersecting
        if (isInsidePolygon(polygonHolder.collider.verts, particle.pos)) {
            // Calculate the vector from the particle to the closest point
            const moveDirection = new Vector2D(
                particle.pos.x - closestPoint.x,
                particle.pos.y - closestPoint.y
            );

            particle.vel.x = polygonHolder.vel.x;
            particle.vel.y = polygonHolder.vel.y;
            return;
        }
        // Normal vector at the point of collision
        const normal = new Vector2D(dx / dist, dy / dist);

        // return if particle has already collided and is moving away
        if (Vector2D.dotProduct(particle.vel, normal) <= 0) return;

        const velocityAlongNormal = Vector2D.dotProduct(particle.vel, normal);

        // Reflect the ball's velocity along the normal (elastic collision)
        particle.vel.x -= 2 * velocityAlongNormal * normal.x;
        particle.vel.y -= 2 * velocityAlongNormal * normal.y;
        particle.vel.x += polygonHolder.vel.x
        particle.vel.y += polygonHolder.vel.y
    }

    static handleBallPolygonCollision(
        particle: Particle,
        polygonHolder: PolygonalCollider,
    ): void {
        // Calculate relative velocity between the particle and the polygon
        const relativeVel = new Vector2D(
            particle.vel.x - polygonHolder.vel.x,
            particle.vel.y - polygonHolder.vel.y
        );

        // Predict where the particle will be after this time step
        const predictedPosition = new Vector2D(
            particle.pos.x + relativeVel.x,
            particle.pos.y + relativeVel.y
        );

        const dt = predictedPosition.x / relativeVel.x

        // Find the closest point on the polygon to the predicted position
        const closestPoint = closestPointOnPolygon(polygonHolder.collider.verts, predictedPosition);

        const dx = closestPoint.x - predictedPosition.x;
        const dy = closestPoint.y - predictedPosition.y;

        const distSq = dx * dx + dy * dy;

        const dist = Math.sqrt(distSq);

        // Check if there's a collision based on the future position
        if (dist >= particle.radius) return; // No collision if the ball is not intersecting

        // Normal vector at the point of collision
        const normal = new Vector2D(dx / dist, dy / dist);

        // return if particle has already collided and is moving away
        if (Vector2D.dotProduct(relativeVel, normal) <= 0) return;

        const velocityAlongNormal = Vector2D.dotProduct(relativeVel, normal);

        // Reflect the particle's velocity along the normal (elastic collision)
        particle.vel.x -= 2 * velocityAlongNormal * normal.x;
        particle.vel.y -= 2 * velocityAlongNormal * normal.y;

        // Add the velocity of the polygon to the particle
        particle.vel.x += polygonHolder.vel.x;
        particle.vel.y += polygonHolder.vel.y;
        // Failsafe: Check if the particle is inside the polygon and move it out if necessary
        if (isInsidePolygon(polygonHolder.collider.verts, particle.pos)) {
            // Calculate the vector from the particle to the closest point
            const moveDirection = new Vector2D(
                particle.pos.x - closestPoint.x,
                particle.pos.y - closestPoint.y
            );

            const moveDist = Math.sqrt(moveDirection.x * moveDirection.x + moveDirection.y * moveDirection.y);

            // Normalize the direction
            const normalizedMoveDirection = new Vector2D(
                moveDirection.x / moveDist,
                moveDirection.y / moveDist
            );

            // Move the particle outside the polygon along this direction, by its radius
            particle.pos.x = closestPoint.x + normalizedMoveDirection.x * particle.radius;
            particle.pos.y = closestPoint.y + normalizedMoveDirection.y * particle.radius;
        }

    }
}

