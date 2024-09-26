import {Controller} from "../../types/types";
import {Player} from "../Player";
import {Vector2D} from "../Utility";
import {Particle} from "../Particle";
import {AIBehavior} from "./AIBehavior";

export class AIController implements Controller {
    private target: Vector2D
    private behavior: AIBehavior
    private behaviorCallCooldown: number = 0;

    constructor(
        private player: Player,
        otherPlayer: Player)
    {
        this.behavior = new AIBehavior(player, otherPlayer);
        this.target = player.pos.copy();
    }

    movement(): void {
        if (this.behaviorCallCooldown <= 0) {
            this.target = this.behavior.getTarget();
            if (this.behavior.wantsDrone() > 0) {
                this.buy();
            }
            this.behaviorCallCooldown = this.behavior.framesBetweenCalls;
        } else {
            this.behaviorCallCooldown--;
        }
        this.player.acc = this.target.copy();
        this.player.acc.toUnit().scale(this.player.maxAcc);


    }
    buy(): void {
        this.player.buyDrone()
    }
    special(): void {
        throw new Error("Method not implemented.");
    }
    cleanup(): void {

    }
}