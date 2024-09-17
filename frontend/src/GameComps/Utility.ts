export class Vector2D {
    constructor(public x: number, public y: number) {
    }

    scale(a: number): Vector2D {
        this.x *= a;
        this.y *= a;
        return this;
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

    static zeros(): Vector2D {
        return new Vector2D(0, 0);
    }

    static ones(): Vector2D {
        return new Vector2D(1, 1);
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

