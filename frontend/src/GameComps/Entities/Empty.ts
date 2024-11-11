import {EntityInterface, EntityLogic, EntityRenderer, EntityState, EntityTypes, Team} from "../../types/types";
import {EmptyID, ParticleID} from "@shared/commTypes";
import {Vector2D} from "../Utility";
import {Game} from "../Game";

export class EmptyInterface extends EntityInterface{
    public state: EmptyState;
    protected logic: EmptyLogic;
    protected renderer: EmptyRenderer;

    constructor(
        id: EmptyID,
        pos: Vector2D,
        scene: Game
    ) {
        super();
        this.state = new EmptyState(id, pos, scene);
        this.logic = new EmptyLogic(this.state);
        this.renderer = new EmptyRenderer(this.state);
    }

    onDeath(): void {
        throw new Error("Not implemented");
    }

    receiveDamage(damage: number): void {
        throw new Error("Not implemented");
    }

    update(delta: number): void {
        throw new Error("Not implemented");
    }
}

class EmptyState implements EntityState {
    entityType: EntityTypes = EntityTypes.Null;
    givesIncome: number = 0;
    health: number = 1;
    mass: number = Infinity;
    radius: number = 1;
    targetedBy: ParticleID[] = [];
    attackable: boolean = false;
    team: Team | null = null;
    vel: Vector2D = Vector2D.zeros();

    constructor(
        public id: EmptyID,
        public pos: Vector2D,
        public scene: Game
    ) {
    }

    getFiringPos(from: Vector2D): Vector2D {
        throw new Error("Not implemented");
    }

    isAlive(): boolean {
        return true;
    }
}

class EmptyLogic extends EntityLogic{
    constructor(protected state: EntityState) {
        super();
    }
    public update(deltaScale: number): void {
        throw new Error("Method not implemented.");
    }

}

class EmptyRenderer extends EntityRenderer {
    constructor(protected state: EntityState) {
        super();
    }

    protected renderSelf(): void {
        throw new Error("Method not implemented.");
    }
    protected renderAttack(): void {
        throw new Error("Method not implemented.");
    }
    protected renderStatsBar(): void {
        throw new Error("Method not implemented.");
    }
    public update(): void {
        throw new Error("Method not implemented.");
    }
    public cleanUp(): void {
        throw new Error("Method not implemented.");
    }

}