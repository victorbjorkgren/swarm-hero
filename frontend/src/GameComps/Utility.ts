import {Graphics, Sprite} from "pixi.js";
import {AABBCollider, CollisionResult, EntityState, PolygonalCollider} from "../types/types";

export class Vector2D {
    constructor(public x: number, public y: number) {
    }

    scale(a: number): Vector2D {
        this.x *= a;
        this.y *= a;
        return this;
    }

    copy(): Vector2D {
        return new Vector2D(this.x, this.y);
    }

    add(other: Vector2D): Vector2D {
        this.x += other.x;
        this.y += other.y;
        return this;
    }

    sub(other: Vector2D): Vector2D {
        this.x -= other.x;
        this.y -= other.y;
        return this;
    }

    limit(limit: number): Vector2D {
        const sqMag = this.x * this.x + this.y * this.y;
        if ((limit * limit) < sqMag) {
            const scale = limit / Math.sqrt(sqMag);
            this.x = this.x * scale;
            this.y = this.y * scale;
        }
        return this;
    }

    toUnit(): Vector2D {
        const mag = this.magnitude();
        if (mag !== 0)
            this.scale(1 / mag);
        return this;
    }

    sqDistanceTo(other: Vector2D): number {
        return Vector2D.subtract(this, other).sqMagnitude();
    }

    isZero(): boolean {
        return this.x === 0 && this.y === 0;

    }

    magnitude(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    sqMagnitude(): number {
        return this.x * this.x + this.y * this.y;
    }

    static subtract(v1: Vector2D, v2: Vector2D): Vector2D {
        return new Vector2D(v1.x - v2.x, v1.y - v2.y);
    }

    static add(v1: Vector2D, v2: Vector2D): Vector2D {
        return new Vector2D(v1.x + v2.x, v1.y + v2.y);
    }

    static dotProduct(v1: Vector2D, v2: Vector2D): number {
        return v1.x * v2.x + v1.y * v2.y;
    }

    static sqDist(v1: Vector2D, v2: Vector2D): number {
        const dp = Vector2D.subtract(v1, v2);
        return Vector2D.dotProduct(dp, dp);
    }

    static scale(v: Vector2D, a: number): Vector2D {
        return new Vector2D(v.x * a, v.y * a);
    }

    static isEqual(v1: Vector2D, v2: Vector2D): boolean {
        return v1.x === v2.x && v2.y === v2.y;
    }

    static zeros(): Vector2D {
        return new Vector2D(0, 0);
    }

    static ones(): Vector2D {
        return new Vector2D(1, 1);
    }

    static cast<T extends {x: number, y: number}>(obj: T): Vector2D {
        return new Vector2D(obj.x, obj.y);
    }
}

export function randomUnitVector(rMin:number=0, rMax: number=1): Vector2D {
    const angle = Math.random() * 2 * Math.PI;
    const r = Math.random() * (rMax - rMin) + rMin;
    return new Vector2D(
        Math.cos(angle) * r,
        Math.sin(angle) * r
    );
}

export function closestPointOnPolygon(polygon: Vector2D[], circleCenter: Vector2D): Vector2D {
    let closestPoint = polygon[0];
    let minDistSq = Infinity;

    // Loop through each edge of the polygon
    for (let i = 0; i < polygon.length; i++) {
        const currentPoint = polygon[i];
        const nextPoint = polygon[(i + 1) % polygon.length]; // Wrap around to the first point

        // Find the closest point on the current edge segment
        const edge = Vector2D.subtract(nextPoint, currentPoint);
        const toCircle = Vector2D.subtract(circleCenter, currentPoint);
        const t = Math.max(0, Math.min(1, Vector2D.dotProduct(toCircle, edge) / Vector2D.dotProduct(edge, edge))); // Clamp t between 0 and 1
        const projection = new Vector2D(
            currentPoint.x + t * edge.x,
            currentPoint.y + t * edge.y
        );

        // Calculate the squared distance to this point
        const distSq = Vector2D.dotProduct(Vector2D.subtract(projection, circleCenter), Vector2D.subtract(projection, circleCenter));

        // Update the closest point if necessary
        if (distSq < minDistSq) {
            minDistSq = distSq;
            closestPoint = projection;
        }
    }

    return closestPoint;
}

export function isInsidePolygon(polygon: Vector2D[], circleCenter: Vector2D): boolean {
    let isInside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].x, yi = polygon[i].y;
        const xj = polygon[j].x, yj = polygon[j].y;

        const intersect = ((yi > circleCenter.y) !== (yj > circleCenter.y)) &&
            (circleCenter.x < (xj - xi) * (circleCenter.y - yi) / (yj - yi) + xi);
        if (intersect) isInside = !isInside;
    }
    return isInside;
}

export const massToRadius = (mass: number): number => {
    return mass ** (1 / 3);
}

export const spriteToAABBCollider = (sprite: Sprite): AABBCollider => {
    return {
        minX: sprite.x,
        maxX: sprite.x + sprite.width,
        minY: sprite.y,
        maxY: sprite.y + sprite.height,
        inverted: false
    };
}

export const checkAABBCollision = (obj1: AABBCollider, obj2: AABBCollider): CollisionResult => {
    if (obj1.inverted && obj2.inverted) throw Error('Cant collide two inverted objects');
    if (obj1.inverted) return checkAABBInside(obj2, obj1);
    if (obj2.inverted) return checkAABBInside(obj1, obj2);

    if (
        obj1.minX < obj2.maxX &&
        obj1.maxX > obj2.minX &&
        obj1.minY < obj2.maxY &&
        obj1.maxY > obj2.minY
    ) {
        const penetrationX1 = obj2.maxX - obj1.minX; // obj1 is to the left
        const penetrationX2 = obj1.maxX - obj2.minX; // obj1 is to the right
        const penetrationY1 = obj2.maxY - obj1.minY; // obj1 is below
        const penetrationY2 = obj1.maxY - obj2.minY; // obj1 is above

        const minPenetrationX = Math.min(penetrationX1, penetrationX2);
        const minPenetrationY = Math.min(penetrationY1, penetrationY2);

        if (minPenetrationX < minPenetrationY) {
            // Horizontal collision
            if (penetrationX1 < penetrationX2) {
                return {
                    collides: true,
                    normal1: new Vector2D(-1, 0), // obj1 is to the left
                    normal2: new Vector2D(1, 0), // obj2 is to the right
                };
            } else {
                return {
                    collides: true,
                    normal1: new Vector2D(1, 0),  // obj1 is to the right
                    normal2: new Vector2D(-1, 0)  // obj2 is to the left
                };
            }
        } else {
            // Vertical collision
            if (penetrationY1 < penetrationY2) {
                return {
                    collides: true,
                    normal1: new Vector2D(0, -1), // obj1 is below
                    normal2: new Vector2D(0, 1),   // obj2 is above
                };
            } else {
                return {
                    collides: true,
                    normal1: new Vector2D(0, 1),  // obj1 is above
                    normal2: new Vector2D(0, -1)  // obj2 is below
                };
            }
        }
    }

    return {collides: false};
}

const checkAABBInside = (inner: AABBCollider, outer: AABBCollider): CollisionResult => {
    if (
        inner.minX >= outer.minX &&
        inner.maxX <= outer.maxX &&
        inner.minY >= outer.minY &&
        inner.maxY <= outer.maxY
    )
        return {collides: false}

    // Determine the smallest distance to the edges of the outer box
    const distLeft = inner.minX - outer.minX;
    const distRight = outer.maxX - inner.maxX;
    const distTop = inner.minY - outer.minY;
    const distBottom = outer.maxY - inner.maxY;

    // Find the minimum distance and assign the normal accordingly
    const minDistX = Math.min(distLeft, distRight);
    const minDistY = Math.min(distTop, distBottom);

    if (minDistX < minDistY) {
        // Horizontal normal (either left or right)
        const normalX = distLeft < distRight ? -1 : 1;
        return {
            collides: true,
            normal1: new Vector2D(normalX, 0),
            normal2: new Vector2D(-normalX, 0)
        };
    } else {
        // Vertical normal (either top or bottom)
        const normalY = distTop < distBottom ? -1 : 1;
        return {
            collides: true,
            normal1: new Vector2D(0, normalY ),
            normal2: new Vector2D(0, -normalY )
        };
    }
}

const cart2pol = (x: number, y: number): { r: number; theta: number } => {
    const r = Math.sqrt(x * x + y * y); // Radius
    const theta = Math.atan2(y, x);     // Angle in radians
    return { r, theta };
};

export const pol2cart = (r: number, theta: number): { x: number; y: number } => {
    const x = r * Math.cos(theta);  // x coordinate
    const y = r * Math.sin(theta);  // y coordinate
    return { x, y };
};

export const getMedian = (numbers: number[]): number | null => {
    if (numbers.length === 0) return null;
    const sortedNumbers = [...numbers].sort((a, b) => a - b);
    const middleIndex = Math.floor(sortedNumbers.length / 2);
    if (sortedNumbers.length % 2 !== 0) {
        return sortedNumbers[middleIndex];
    }
    return (sortedNumbers[middleIndex - 1] + sortedNumbers[middleIndex]) / 2;
}