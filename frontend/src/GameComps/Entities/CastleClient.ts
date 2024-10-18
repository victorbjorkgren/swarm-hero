import {Team} from "../../types/types";
import {HeroGameLoopClient} from "../HeroGameLoopClient";
import {CastleID, ClientID} from "../HeroGameLoopServer";
import {Vector2D} from "../Utility";
import {CastleBase} from "./CastleBase";
import {PlayerClient} from "./PlayerClient";

export class CastleClient extends CastleBase {
    nearbyPlayers: PlayerClient[] = [];

    isAlive(): boolean {
        throw new Error("Method not implemented.");
    }
    receiveDamage(damage: number): void {
        throw new Error("Method not implemented.");
    }
    getFiringPos(from: Vector2D): Vector2D {
        throw new Error("Method not implemented.");
    }
    constructor(
        public id: CastleID,
        public pos: Vector2D,
        public team: Team,
        public owner: ClientID,
        private scene: HeroGameLoopClient
    ) {
        super();
    }

    render() {

    }

}