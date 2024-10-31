import {Controller, Controls} from "../../types/types";
import {Vector2D} from "../Utility";
import {AIBehavior} from "./AIBehavior";
import {PlayerClient} from "../Entities/PlayerClient";
import {HeroGameLoopClient} from "../HeroGameLoopClient";
import {CastleClient} from "../Entities/CastleClient";

export class AIController implements Controller {
    private target: Vector2D
    private behavior: AIBehavior
    private behaviorCallCooldown: number = 0;
    private activeCastle: CastleClient | null = null;

    constructor(
        private player: PlayerClient,
        otherPlayer: PlayerClient,
        scene: HeroGameLoopClient,
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