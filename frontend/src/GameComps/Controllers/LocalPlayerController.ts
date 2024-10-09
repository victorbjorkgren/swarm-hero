import {Controller, ControllerMapping} from "../../types/types";
import {Player} from "../Player";
import {Vector2D} from "../Utility";
import {Keyboard} from "../Keyboard";

export class LocalPlayerController implements Controller {
    private readonly specialHandler: () => void;
    private readonly buyHandler: () => void;
    private readonly cancelHandler: () => void;

    constructor(
        private player: Player,
        private keyBindings: ControllerMapping
    ) {
        this.specialHandler = () => this.special()
        this.buyHandler = () => this.buy();
        this.cancelHandler = () => this.cancel();

        Keyboard.onPushSubscribe(
            this.keyBindings.buy,
            this.buyHandler,
        );
        Keyboard.onPushSubscribe(
            this.keyBindings.special,
            this.specialHandler,
        );
        Keyboard.onPushSubscribe(
            this.keyBindings.cancel,
            this.cancelHandler,
        );
    }

    cleanup(): void {
        Keyboard.onPushUnsubscribe(
            this.keyBindings.buy,
            this.buyHandler,
        );
        Keyboard.onPushUnsubscribe(
            this.keyBindings.special,
            this.specialHandler,
        );
        Keyboard.onPushUnsubscribe(
            this.keyBindings.cancel,
            this.cancelHandler,
        )
    }

    movement() {
        if (!this.keyBindings) return;

        this.player.acc = Vector2D.zeros();

        if (Keyboard.state.get(this.keyBindings.left)) {
            this.player.acc.x -= this.player.maxAcc;
        }
        if (Keyboard.state.get(this.keyBindings.right)) {
            this.player.acc.x += this.player.maxAcc;
        }
        if (Keyboard.state.get(this.keyBindings.up)) {
            this.player.acc.y -= this.player.maxAcc;
        }
        if (Keyboard.state.get(this.keyBindings.down)) {
            this.player.acc.y += this.player.maxAcc;
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
        this.player.receiveDamage(100);
    }

}