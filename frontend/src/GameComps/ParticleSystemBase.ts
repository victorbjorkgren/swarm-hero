import {
    closestPointOnPolygon,
    isInsidePolygon,
    Vector2D
} from "./Utility";
import {ParticleBase} from "./Entities/ParticleBase";
import {PlayerServer} from "./Entities/PlayerServer";
import {CastleServer} from "./Entities/CastleServer";
import {EntityBase, PolygonalCollider, Team} from "../types/types";
import {UnitPack} from "../types/unitTypes";
import {UnitManager} from "./UnitManager";
import {HeroGameLoopBase} from "./HeroGameLoopBase";
import {PlayerBase} from "./Entities/PlayerBase";
import {CastleBase} from "./Entities/CastleBase";

import {ParticleID} from "@shared/commTypes";

export class ParticleSystemBase {
    private sqCohedeDist: number = 250 ** 2;
    private sqSeparateDistance: number = 75 ** 2;
    private cohesionFactor: number = .1;
    private separationFactor: number = 2;
    private alignFactor: number = 40;
    protected unitManager: UnitManager<ParticleBase>;

    constructor(
        protected teams: Team[],
        protected scene: HeroGameLoopBase,
        private polygonColliderEntities: PolygonalCollider[] = [])
    {
        this.unitManager = new UnitManager();
    }

    getParticles(): UnitManager<ParticleBase> {
        return this.unitManager;
    }

    createParticle(origin: Vector2D, mass: number, maxVel: number, team: Team, groupID: number, unitInfo: UnitPack, owner: PlayerBase, droneId: ParticleID): ParticleBase {
        const p = new ParticleBase( origin , mass, team, maxVel, team.color, this.scene, groupID, unitInfo, owner, this.unitManager, droneId);
        p.setLeaderPosition(owner.pos);
        this.unitManager.add(p);
        return p;
    }

    update(): void {
        this.engageFights();
        this.fightFights();
        this.particleBehavior();
        this.updateBoid();
        this.updatePos()
    }

    updatePos(): void {
        this.unitManager.deepForEach((particle: ParticleBase) => {
            particle.acc.limit(particle.maxAcc);
            particle.vel.add(particle.acc);
            particle.vel.limit(particle.maxVel);
            particle.pos.add(particle.vel);
        })
    }

    particleBehavior(): void {
        this.unitManager.deepForEach((particle: ParticleBase) => {
            particle.initFrame();
            particle.approachDesiredVel();
            particle.calcDesiredPos();
            particle.approachDesiredPos();
        })
    }

    checkCollisions(): void {
        // for (let i=0; i < this.particles.length; ++i) {
        //     for (const polygonHolder of this.polygonColliderEntities)
        //         ParticleSystem.handleBallPolygonCollision(this.particles[i], polygonHolder);
            // for (const team of this.teams) {
            //     for (const player of team.players) {
            //         ParticleSystem.handleBallPolygonCollision(this.particles[i], player);
            //     }
            // }
            // for (let j = i + 1; j < this.particles.length; j++) {
            //     ParticleSystem.handleCircleCollision(this.particles[i], this.particles[j]);
            // }
        // }
    }

    getNewParticle(player: PlayerBase, castle: CastleBase, groupID: number, unitInfo: UnitPack, owner: PlayerBase, droneId: ParticleID): ParticleBase {
        const randomSpawnOffset = new Vector2D((Math.random()-.5)*30, (Math.random()-.5)*30);
        return this.createParticle(
            Vector2D.add(castle.pos, randomSpawnOffset),
            10,
            1,
            player.team!,
            groupID,
            unitInfo,
            owner,
            droneId
        );
    }

    sqFiringDistance(me: ParticleBase, other: EntityBase): number {
        return Vector2D.sqDist(me.pos, other.getFiringPos(me.pos));
    }

    engageIfClose(me: ParticleBase, other: EntityBase) {
        if (!other.isAlive()) return;
        if (me === other) return
        if (me.team === other.team) return
        if (this.sqFiringDistance(me, other) > me.sqEngageRadius) return;
        me.engaging.push(other)
        other.targetedBy.push(me);
    }

    engageFights(): void {
        this.unitManager.deepForEach((me: ParticleBase) => {
            for (let i = me.engaging.length - 1; i >= 0; i--) {
                const foe = me.engaging[i];
                if (!foe || !foe.isAlive() || this.sqFiringDistance(me, foe) >= me.sqEngageRadius) {
                    me.engaging.splice(i, 1);
                    const targetIndex = foe.targetedBy.findIndex(target => target === me);
                    if (targetIndex !== -1) {
                        foe.targetedBy.splice(targetIndex, 1);
                    }
                }
            }

            if (me.engaging.length >= me.maxTargets) return;
            for (const team of this.teams) {
                if (team === me.team) continue
                for (const playerId of team.playerIds) {
                    const player = this.scene.players.get(playerId);
                    if(!player) continue;
                    this.engageIfClose(me, player)
                    if (me.engaging.length >= me.maxTargets) return;
                    this.unitManager.ownerForEach(player, (other) => {
                        if (me.engaging.length >= me.maxTargets) return;
                        this.engageIfClose(me, other);
                    })
                }
                for (const castleId of team.castleIds) {
                    const castle = this.scene.castles.get(castleId);
                    if (!castle) continue;
                    this.engageIfClose(me, castle)
                    if (me.engaging.length >= me.maxTargets) return;
                    this.unitManager.ownerForEach(castle, (other) => {
                        if (me.engaging.length >= me.maxTargets) return;
                        this.engageIfClose(me, other);
                    })
                }
            }
        })
    }

    fightFights(): void {
        this.unitManager.deepForEach((me: ParticleBase) => {
            me.firingLaserAt = me.firingLaserAt.filter(foe => foe.target && foe.target.isAlive());
            me.firingLaserAt = me.firingLaserAt.filter(foe => Vector2D.sqDist(me.pos, foe.target.pos) < me.sqFireRadius);
            for (const foe of me.engaging) {
                const existingFoe = me.firingLaserAt.find(foeItem => foeItem.target === foe);
                const firingPos = foe.getFiringPos(me.pos);
                if (existingFoe) {
                    existingFoe.intensity = Math.min(existingFoe.intensity + .01, 1);
                    existingFoe.target.receiveDamage(existingFoe.intensity);
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
        })
    }

    updateBoid(): void {
        this.unitManager.deepForEach((p1: ParticleBase) => {
            const cohedePoint = Vector2D.zeros();
            const sepPoint = Vector2D.zeros();
            const alignV = Vector2D.zeros();
            let nCoh = 0;
            this.unitManager.ownerForEach(p1.owner, (p2: ParticleBase) => {
                if (p1 === p2) return;

                const sqDist = Vector2D.sqDist(p1.pos, p2.pos);
                // Separate
                if (sqDist < this.sqSeparateDistance) {
                    sepPoint.x += 0.03 * this.sqSeparateDistance * (p1.pos.x - p2.pos.x) / sqDist;
                    sepPoint.y += 0.03 * this.sqSeparateDistance * (p1.pos.y - p2.pos.y) / sqDist;
                }
                // Cohede & Align if boiding
                if (p1.isBoiding && sqDist < this.sqCohedeDist && sqDist > this.sqSeparateDistance) {
                    cohedePoint.add(p2.pos);
                    alignV.add(p2.vel);
                    nCoh += 1
                }

            })
            if (nCoh > 0) {
                cohedePoint.scale(1 / nCoh).sub(p1.pos).scale(this.cohesionFactor);
                alignV.scale(1 / nCoh).sub(p1.vel).scale(this.alignFactor);
            }
            sepPoint.scale(this.separationFactor);
            const desiredV = new Vector2D(
                cohedePoint.x + sepPoint.x + alignV.x,
                cohedePoint.y + sepPoint.y + alignV.y
            );
            p1.acc.add(Vector2D.subtract(desiredV, p1.vel));
        })
    }

    static handleCircleCollision(
        p1: EntityBase,
        p2: EntityBase,
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
        if (distSq === 0 || distSq > (combinedRadius * combinedRadius)) return;

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
        particle: ParticleBase,
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
            // const moveDirection = new Vector2D(
            //     particle.pos.x - closestPoint.x,
            //     particle.pos.y - closestPoint.y
            // );

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
        particle: ParticleBase,
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

        // const dt = predictedPosition.x / relativeVel.x

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

