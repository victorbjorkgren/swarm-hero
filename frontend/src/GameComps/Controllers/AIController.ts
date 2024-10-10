import {Controller} from "../../types/types";
import {Player} from "../Player";
import {Vector2D} from "../Utility";
import {AIBehavior} from "./AIBehavior";
import HeroGameLoop from "../HeroGameLoop";
import {Units} from "../../types/unitTypes";
import {Castle} from "../Castle";

export class AIController implements Controller {
    private target: Vector2D
    private behavior: AIBehavior
    private behaviorCallCooldown: number = 0;
    private activeCastle: Castle | null = null;

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
        this.player.popUpCastle = this.player.findNearbyCastle();
        this.player.buyDrone(Units.LaserDrone, 1);
    }
    special(): void {
        throw new Error("Method not implemented.");
    }
    cleanup(): void {

    }
}