import {Team} from "../../types/types";
import {HeroGameLoopClient} from "../HeroGameLoopClient";

export class CastleClient {
    constructor(
        private team: Team,
        private scene: HeroGameLoopClient
    ) {
    }

    render() {

    }
}