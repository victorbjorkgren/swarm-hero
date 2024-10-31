import {AABBCollider} from "../types/types";
import {Vector2D} from "./Utility";
import {HeroGameLoopClient} from "./HeroGameLoopClient";

type Grid = boolean[][];

class Node {
    position: Vector2D;
    gCost: number; // cost from start to current node
    hCost: number; // heuristic cost to end node
    fCost: number; // total cost (g + h)
    parent: Node | null;

    constructor(position: Vector2D, gCost: number, hCost: number, parent: Node | null = null) {
        this.position = position;
        this.gCost = gCost;
        this.hCost = hCost;
        this.fCost = gCost + hCost;
        this.parent = parent;
    }
}

export  class NavMesh {
    private _mesh: Grid = [[]];

    static scale = 32;
    private static directions: Vector2D[] = [
        new Vector2D(0, -1), new Vector2D(0, 1), new Vector2D(-1, 0), new Vector2D(1, 0),
        new Vector2D(-1, -1), new Vector2D(1, -1), new Vector2D(-1, 1), new Vector2D(1, 1)
    ];

    constructor(private scene: HeroGameLoopClient) {}

    updateNavMesh(colliders: AABBCollider[]): void {
        const rows = Math.ceil(this.scene.sceneHeight / NavMesh.scale);
        const cols = Math.ceil(this.scene.sceneWidth / NavMesh.scale);

        // Initialize the navmesh array with all values set to true
        this._mesh = Array.from({ length: cols }, () => Array(rows).fill(true));

        for (const collider of colliders) {
            if (collider.inverted) continue;

            // Calculate the min/max indices for the collider, clamped within bounds
            const minX = Math.max(0, Math.floor(collider.minX / NavMesh.scale));
            const maxX = Math.min(cols - 1, Math.ceil(collider.maxX / NavMesh.scale));
            const minY = Math.max(0, Math.floor(collider.minY / NavMesh.scale));
            const maxY = Math.min(rows - 1, Math.ceil(collider.maxY / NavMesh.scale));

            // Mark the corresponding points as false
            for (let i = minX; i <= maxX; i++) {
                for (let j = minY; j <= maxY; j++) {
                    this._mesh[i][j] = false;
                }
            }
        }
    }

    aStar(start_: Vector2D, goal_: Vector2D): Vector2D[] {
        if (this._mesh === null) return [];
        const openList: Node[] = [];
        const closedList: Set<string> = new Set();

        const start = new Vector2D(Math.round(start_.x / NavMesh.scale), Math.round(start_.y / NavMesh.scale));
        const goal = new Vector2D(Math.round(goal_.x / NavMesh.scale), Math.round(goal_.y / NavMesh.scale));

        const startNode = new Node(start, 0, NavMesh.heuristic(start, goal));
        openList.push(startNode);

        while (openList.length > 0) {
            // Sort by fCost (total cost)
            openList.sort((a, b) => a.fCost - b.fCost);

            const currentNode = openList.shift()!;
            closedList.add(`${currentNode.position.x},${currentNode.position.y}`);

            // Check if reached goal
            if (Vector2D.isEqual(currentNode.position, goal)) {
                const finalPath = this.reconstructPath(currentNode);
                finalPath.forEach(node => node.scale(NavMesh.scale));
                finalPath.shift();
                return finalPath;
            }

            // Process neighbors
            const neighbors = this.getNeighbors(currentNode);
            for (const neighborPosition of neighbors) {
                if (closedList.has(`${neighborPosition.x},${neighborPosition.y}`)) continue;

                const gCost = currentNode.gCost + NavMesh.heuristic(currentNode.position, neighborPosition);
                const hCost = NavMesh.heuristic(neighborPosition, goal);

                const existingNode = openList.find(n => n.position.x === neighborPosition.x && n.position.y === neighborPosition.y);

                if (!existingNode || gCost < existingNode.gCost) {
                    const neighborNode = new Node(neighborPosition, gCost, hCost, currentNode);

                    if (!existingNode) {
                        openList.push(neighborNode);
                    } else {
                        existingNode.gCost = gCost;
                        existingNode.parent = currentNode;
                        existingNode.fCost = gCost + hCost;
                    }
                }
            }
        }

        // No path found
        return [];
    };

    // Heuristic: Euclidean distance (you can use Manhattan for grid-based diagonal-free movement)
    static heuristic(a: Vector2D, b: Vector2D): number {
        return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
    };

    // Check if a Vector2D is within grid bounds and walkable
    private isWalkable(point: Vector2D): boolean {
        return point.x >= 0 && point.y >= 0 &&
            point.x < this._mesh.length && point.y < this._mesh[0].length &&
            this._mesh[Math.floor(point.x)][Math.floor(point.y)]; // true means walkable
    };

    private getNeighbors(node: Node): Vector2D[] {
        return NavMesh.directions
            .map(dir => (Vector2D.add(node.position, dir)))
            .filter(point => this.isWalkable(point));
    };

    // Check if two points are in a straight line (horizontal, vertical, or diagonal)
    static isStraightLine(a: Vector2D, b: Vector2D, c: Vector2D): boolean {
        const ab = { x: b.x - a.x, y: b.y - a.y };
        const bc = { x: c.x - b.x, y: c.y - b.y };

        return (ab.x * bc.y === ab.y * bc.x); // Check if slopes are equal
    };

    // Check if a point is adjacent to an obstacle
    private isAdjacentToObstacle(point: Vector2D): boolean {
        return NavMesh.directions.some(dir => {
            const neighbor = { x: point.x + dir.x, y: point.y + dir.y };
            return neighbor.x >= 0
                && neighbor.y >= 0
                && neighbor.x < this._mesh.length
                && neighbor.y < this._mesh[0].length
                && !this._mesh[neighbor.x][neighbor.y];
        });
    };

    // Smooth the path by filtering unnecessary waypoints
    private smoothPath(path: Vector2D[]): Vector2D[] {
        if (path.length < 3) return path; // No smoothing needed if there are fewer than 3 points

        const smoothedPath: Vector2D[] = [path[0]]; // Keep the start point

        for (let i = 1; i < path.length - 1; i++) {
            const prev = smoothedPath[smoothedPath.length - 1];
            const curr = path[i];
            const next = path[i + 1];

            if (!NavMesh.isStraightLine(prev, curr, next) || this.isAdjacentToObstacle(curr)) {
                smoothedPath.push(curr); // Keep waypoints that break straight lines or are near obstacles
            }
        }

        smoothedPath.push(path[path.length - 1]); // Keep the goal point
        return smoothedPath;
    };

    private reconstructPath(node: Node | null): Vector2D[] {
        const path: Vector2D[] = [];
        while (node) {
            path.push(node.position);
            node = node.parent;
        }
        return path.reverse();
    };

}