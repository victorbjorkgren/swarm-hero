import {Controller} from "../../types/types";
import {Player} from "../Player";
import {Vector2D} from "../Utility";
import {Particle} from "../Particle";
import {AIBehavior} from "./AIBehavior";
import HeroGameLoop from "../HeroGameLoop";

export class AIController implements Controller {
    private target: Vector2D
    private behavior: AIBehavior
    private behaviorCallCooldown: number = 0;

    constructor(
        private player: Player,
        otherPlayer: Player,
        scene: HeroGameLoop,
        )
    {
        this.behavior = new AIBehavior(player, otherPlayer, scene);
        this.target = player.pos.copy();
    }

    movement(): void {
        this.behavior.update();
        this.player.acc = this.behavior.targetDir.copy().toUnit().scale(this.player.maxAcc);

        if (this.behavior.doBuy) {
            this.behavior.doBuy = false;
            this.buy();
        }
        if (this.behavior.doSpecial) {
            this.behavior.doSpecial = false;
            this.special();
        }
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