import {Controller, ControllerMapping, Controls} from "../../types/types";
import {Vector2D} from "../Utility";
import {Keyboard} from "./Keyboard";
import {Player} from "../Entities/Player";
import {ClientMessageType} from "@shared/commTypes";
import {Game} from "../Game";

export class LocalPlayerController implements Controller {
    private readonly specialHandler: () => void;
    private readonly buyHandler: () => void;
    private readonly cancelHandler: () => void;

    private movementKeysDown: Set<keyof ControllerMapping> = new Set([])

    constructor(
        private player: Player,
        private keyBindings: ControllerMapping,
        private scene: Game,
    ) {
        this.specialHandler = () => this.special()
        this.buyHandler = () => this.buy();
        this.cancelHandler = () => this.cancel();

        Keyboard.onPushSubscribe(
            this.keyBindings[Controls.buy],
            this.buyHandler,
        );
        Keyboard.onPushSubscribe(
            this.keyBindings[Controls.special],
            this.specialHandler,
        );
        Keyboard.onPushSubscribe(
            this.keyBindings[Controls.cancel],
            this.cancelHandler,
        );
    }

    remoteKeyDown(key: Controls): void {
        // No effect on local player
    }
    remoteKeyUp(key: Controls): void {
        // No effect on local player
    }

    cleanup(): void {
        this.movementKeysDown.clear();

        Keyboard.onPushUnsubscribe(
            this.keyBindings[Controls.buy],
            this.buyHandler,
        );
        Keyboard.onPushUnsubscribe(
            this.keyBindings[Controls.special],
            this.specialHandler,
        );
        Keyboard.onPushUnsubscribe(
            this.keyBindings[Controls.cancel],
            this.cancelHandler,
        )
    }

    networkSignal(key: Controls, down: boolean): void {
        if (this.movementKeysDown.has(key) && down) {}
        else if (!this.movementKeysDown.has(key) && !down) {}
        else if (this.movementKeysDown.has(key) && !down ) {
            this.movementKeysDown.delete(key);
            this.scene.broadcast(ClientMessageType.KeyUp, key);
        }
        else if (!this.movementKeysDown.has(key) && down) {
            this.movementKeysDown.add(key);
            this.scene.broadcast(ClientMessageType.KeyDown, key)
        }
    }

    movement() {
        if (!this.keyBindings) return;

        this.player.acc = Vector2D.zeros();

        if (Keyboard.state.get(this.keyBindings[Controls.left])) {
            this.networkSignal(Controls.left, true);
            this.player.acc.x -= this.player.maxAcc;
        } else {
            this.networkSignal(Controls.left, false);
        }

        if (Keyboard.state.get(this.keyBindings[Controls.right])) {
            this.networkSignal(Controls.right, true);
            this.player.acc.x += this.player.maxAcc;
        } else {
            this.networkSignal(Controls.right, false);
        }

        if (Keyboard.state.get(this.keyBindings[Controls.up])) {
            this.networkSignal(Controls.up, true);
            this.player.acc.y -= this.player.maxAcc;
        } else {
            this.networkSignal(Controls.up, false);
        }
        if (Keyboard.state.get(this.keyBindings[Controls.down])) {
            this.networkSignal(Controls.down, true);
            this.player.acc.y += this.player.maxAcc;
        } else {
            this.networkSignal(Controls.down, false);
        }

        this.player.acc.limit(this.player.maxAcc);
    }

    buy(): void {
        this.player.toggleCityPopup();
    }
    cancel(): void {
        this.player.closeCityPopUp();
        this.player.cancelSpell();
    }

    special(): void {
        // this.player.receiveDamage(100);
    }

}