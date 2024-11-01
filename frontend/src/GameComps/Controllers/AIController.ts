import {Controller, Controls} from "../../types/types";
import {Vector2D} from "../Utility";
import {AIBehavior} from "../AI/AIBehavior";
import {Player} from "../Entities/Player";
import {Game} from "../Game";
import {CastleState} from "../Entities/Castle";

export class AIController implements Controller {
    private target: Vector2D
    private behavior: AIBehavior
    private behaviorCallCooldown: number = 0;
    private activeCastle: CastleState | null = null;

    constructor(
        private player: Player,
        otherPlayer: Player,
        scene: Game,
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
        // this.player.popUpCastle = this.player.findNearbyCastle();
        // this.player.buyDrone(Units.LaserDrone, 1);
        // this.player
    }
    special(): void {
        throw new Error("Method not implemented.");
    }
    cleanup(): void {

    }

    remoteKeyDown(key: Controls): void {
    }

    remoteKeyUp(key: Controls): void {
    }
}