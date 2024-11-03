import {Controller, Controls} from "../../types/types";
import {Vector2D} from "../Utility";
import {PlayerInterface} from "../Entities/Player";

export class NetworkController implements Controller {
    private keysPressed: Set<Controls> = new Set<Controls>()

    constructor(
        private player: PlayerInterface
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
        // TODO: Write to state buffer
        this.player.state.acc = Vector2D.zeros();

        if (this.keysPressed.has(Controls.left)) {
            this.player.state.acc.x -= this.player.state.maxAcc;
        }
        if (this.keysPressed.has(Controls.right)) {
            this.player.state.acc.x += this.player.state.maxAcc;
        }
        if (this.keysPressed.has(Controls.up)) {
            this.player.state.acc.y -= this.player.state.maxAcc;
        }
        if (this.keysPressed.has(Controls.down)) {
            this.player.state.acc.y += this.player.state.maxAcc;
        }

        this.player.state.acc.limit(this.player.state.maxAcc);
    }

    special(): void {

    }
}
