import {PolygonalCollider, Team} from "../types/types";
import {Game} from "./Game";
import {ParticleInterface} from "./Entities/Particle";
import {UnitManager} from "./UnitManager";
import {closestPointOnPolygon, isInsidePolygon, Vector2D} from "./Utility";
import {UnitPack} from "../types/unitTypes";
import {EntityID, ParticleID} from "@shared/commTypes";
import {EntityState} from "../types/EntityTypes";

export class ParticleSystem {
    unitManager: UnitManager<ParticleInterface> = new UnitManager();

    constructor(
        public scene: Game,
        private polygonColliderEntities: PolygonalCollider[] = []
    ) {
    }

    getParticles(): UnitManager<ParticleInterface> {
        return this.unitManager;
    }

    update(delta: number): void {
        this.unitManager.deepForEach(
            particle => particle.update(delta)
        )
    }

    getNewParticle(
        team: Team,
        origin: Vector2D,
        unitInfo: UnitPack,
        ownerId: EntityID,
        droneId: ParticleID
    ): ParticleInterface {
        const randomSpawnOffset = new Vector2D((Math.random()-.5)*30, (Math.random()-.5)*30);
        origin.add(randomSpawnOffset);
        const p = new ParticleInterface(
            origin ,
            10,
            team,
            1,
            this,
            unitInfo,
            ownerId,
            droneId);
        this.unitManager.add(p);
        return p;
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

    static handleCircleCollision(
        p1: EntityState,
        p2: EntityState,
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
        particle: ParticleInterface,
        polygonHolder: PolygonalCollider,
    ): void {
        const closestPoint = closestPointOnPolygon(polygonHolder.collider.verts, particle.state.pos);

        const dx = closestPoint.x - particle.state.pos.x;
        const dy = closestPoint.y - particle.state.pos.y;

        const distSq = dx * dx + dy * dy;

        const dist = Math.sqrt(distSq);

        if (dist >= particle.state.radius) return; // No collision if the ball is not intersecting
        if (isInsidePolygon(polygonHolder.collider.verts, particle.state.pos)) {
            // Calculate the vector from the particle to the closest point
            // const moveDirection = new Vector2D(
            //     particle.state.pos.x - closestPoint.x,
            //     particle.state.pos.y - closestPoint.y
            // );

            particle.state.vel.x = polygonHolder.vel.x;
            particle.state.vel.y = polygonHolder.vel.y;
            return;
        }
        // Normal vector at the point of collision
        const normal = new Vector2D(dx / dist, dy / dist);

        // return if particle has already collided and is moving away
        if (Vector2D.dotProduct(particle.state.vel, normal) <= 0) return;

        const velocityAlongNormal = Vector2D.dotProduct(particle.state.vel, normal);

        // Reflect the ball's velocity along the normal (elastic collision)
        particle.state.vel.x -= 2 * velocityAlongNormal * normal.x;
        particle.state.vel.y -= 2 * velocityAlongNormal * normal.y;
        particle.state.vel.x += polygonHolder.vel.x
        particle.state.vel.y += polygonHolder.vel.y
    }

    static handleBallPolygonCollision(
        particle: ParticleInterface,
        polygonHolder: PolygonalCollider,
    ): void {
        // Calculate relative velocity between the particle and the polygon
        const relativeVel = new Vector2D(
            particle.state.vel.x - polygonHolder.vel.x,
            particle.state.vel.y - polygonHolder.vel.y
        );

        // Predict where the particle will be after this time step
        const predictedPosition = new Vector2D(
            particle.state.pos.x + relativeVel.x,
            particle.state.pos.y + relativeVel.y
        );

        // const dt = predictedPosition.x / relativeVel.x

        // Find the closest point on the polygon to the predicted position
        const closestPoint = closestPointOnPolygon(polygonHolder.collider.verts, predictedPosition);

        const dx = closestPoint.x - predictedPosition.x;
        const dy = closestPoint.y - predictedPosition.y;

        const distSq = dx * dx + dy * dy;

        const dist = Math.sqrt(distSq);

        // Check if there's a collision based on the future position
        if (dist >= particle.state.radius) return; // No collision if the ball is not intersecting

        // Normal vector at the point of collision
        const normal = new Vector2D(dx / dist, dy / dist);

        // return if particle has already collided and is moving away
        if (Vector2D.dotProduct(relativeVel, normal) <= 0) return;

        const velocityAlongNormal = Vector2D.dotProduct(relativeVel, normal);

        // Reflect the particle's velocity along the normal (elastic collision)
        particle.state.vel.x -= 2 * velocityAlongNormal * normal.x;
        particle.state.vel.y -= 2 * velocityAlongNormal * normal.y;

        // Add the velocity of the polygon to the particle
        particle.state.vel.x += polygonHolder.vel.x;
        particle.state.vel.y += polygonHolder.vel.y;
        // Failsafe: Check if the particle is inside the polygon and move it out if necessary
        if (isInsidePolygon(polygonHolder.collider.verts, particle.state.pos)) {
            // Calculate the vector from the particle to the closest point
            const moveDirection = new Vector2D(
                particle.state.pos.x - closestPoint.x,
                particle.state.pos.y - closestPoint.y
            );

            const moveDist = Math.sqrt(moveDirection.x * moveDirection.x + moveDirection.y * moveDirection.y);

            // Normalize the direction
            const normalizedMoveDirection = new Vector2D(
                moveDirection.x / moveDist,
                moveDirection.y / moveDist
            );

            // Move the particle outside the polygon along this direction, by its radius
            particle.state.pos.x = closestPoint.x + normalizedMoveDirection.x * particle.state.radius;
            particle.state.pos.y = closestPoint.y + normalizedMoveDirection.y * particle.state.radius;
        }

    }
}