import {Controller} from "../../types/types";
import {PlayerServer} from "../Entities/PlayerServer";
import {Vector2D} from "../Utility";
import {AIBehavior} from "./AIBehavior";
import HeroGameLoopServer from "../HeroGameLoopServer";
import {Units} from "../../types/unitTypes";
import {CastleServer} from "../Entities/CastleServer";

export class AIController implements Controller {
    private target: Vector2D
    private behavior: AIBehavior
    private behaviorCallCooldown: number = 0;
    private activeCastle: CastleServer | null = null;

    constructor(
        private player: PlayerServer,
        otherPlayer: PlayerServer,
        scene: HeroGameLoopServer,
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