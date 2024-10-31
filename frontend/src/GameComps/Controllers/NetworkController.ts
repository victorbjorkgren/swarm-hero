import {Controller, Controls} from "../../types/types";
import {Vector2D} from "../Utility";
import {PlayerClient} from "../Entities/PlayerClient";

export class NetworkController implements Controller {
    private keysPressed: Set<Controls> = new Set<Controls>()

    constructor(
        private player: PlayerClient
    ) {
    }

    remoteKeyDown(key: Controls) {
        this.keysPressed.add(key);
    }

    remoteKeyUp(key: Controls) {
        this.keysPressed.delete(key);
    }

    buy(): void {
    }

    cleanup(): void {
        this.keysPressed.clear();
    }

    movement(): void {
        this.player.acc = Vector2D.zeros();

        if (this.keysPressed.has(Controls.left)) {
            this.player.acc.x -= this.player.maxAcc;
        }
        if (this.keysPressed.has(Controls.right)) {
            this.player.acc.x += this.player.maxAcc;
        }
        if (this.keysPressed.has(Controls.up)) {
            this.player.acc.y -= this.player.maxAcc;
        }
        if (this.keysPressed.has(Controls.down)) {
            this.player.acc.y += this.player.maxAcc;
        }

        this.player.acc.limit(this.player.maxAcc);
    }

    special(): void {

    }
}
