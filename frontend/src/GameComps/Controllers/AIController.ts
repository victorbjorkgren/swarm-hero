import {Controller, Controls} from "../../types/types";
import {Vector2D} from "../Utility";
import {AIBehavior} from "../AI/AIBehavior";
import {PlayerInterface} from "../Entities/Player";
import {Game} from "../Game";
import {CastleInterface} from "../Entities/Castle";

export class AIController implements Controller {
    private target: Vector2D
    private behavior: AIBehavior
    private behaviorCallCooldown: number = 0;
    private activeCastle: CastleInterface | null = null;

    constructor(
        private player: PlayerInterface,
        otherPlayer: PlayerInterface,
        scene: Game,
        )
    {
        this.behavior = new AIBehavior(player, otherPlayer, scene);
        this.target = player.state.pos.copy();
    }

    movement(): void {
        //  TODO: Write to state buffer
        this.behavior.update();
        this.player.state.acc = this.behavior.targetDir.copy().toUnit().scale(this.player.state.maxAcc);

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