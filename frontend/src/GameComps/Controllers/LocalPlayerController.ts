import {Controller, ControllerMapping} from "../../types/types";
import {Player} from "../Player";
import {Vector2D} from "../Utility";
import {Keyboard} from "../Keyboard";

export class LocalPlayerController implements Controller {
    private readonly specialHandler: () => void;
    private readonly buyHandler: () => void;

    constructor(
        private player: Player,
        private keyBindings: ControllerMapping
    ) {
        this.specialHandler = () => this.special()
        this.buyHandler = () => this.buy();

        Keyboard.onPushSubscribe(
            this.keyBindings.buy,
            this.buyHandler,
        );
        Keyboard.onPushSubscribe(
            this.keyBindings.special,
            this.specialHandler,
        )
    }

    cleanup(): void {
        Keyboard.onPushUnsubscribe(
            this.keyBindings.buy,
            this.buyHandler,
        );
        Keyboard.onPushUnsubscribe(
            this.keyBindings.special,
            this.specialHandler,
        )
    }

    movement() {
        if (!this.keyBindings) return;

        this.player.acc = Vector2D.zeros();
        let controlling = false;

        if (Keyboard.state.get(this.keyBindings.left)) {
            this.player.acc.x -= this.player.maxAcc;
            controlling = true;
        }
        if (Keyboard.state.get(this.keyBindings.right)) {
            this.player.acc.x += this.player.maxAcc;
            controlling = true;
        }
        if (Keyboard.state.get(this.keyBindings.up)) {
            this.player.acc.y -= this.player.maxAcc;
            controlling = true;
        }
        if (Keyboard.state.get(this.keyBindings.down)) {
            this.player.acc.y += this.player.maxAcc;
            controlling = true;
        }

        if (controlling) {
            this.player.acc.limit(this.player.maxAcc);
            this.player.vel.add(this.player.acc);
            this.player.vel.limit(this.player.maxVel);
        } else {
            this.player.vel.scale(.9);
        }
        if (this.player.vel.sqMagnitude() < (.1 * .1)) {
            this.player.vel.x = 0;
            this.player.vel.y = 0;
        }

        this.player.pos.add(this.player.vel);
    }

    buy(): void {
        this.player.toggleCityPopup();
    }
    special(): void {
        this.player.health = 0
    }

}