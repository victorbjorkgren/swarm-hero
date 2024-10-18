import {Team} from "../types/types";
import {HeroGameLoopClient} from "./HeroGameLoopClient";
import {ParticleSystemBase} from "./ParticleSystemBase";

export class ParticleSystemClient extends ParticleSystemBase{
    constructor(
        protected teams: Team[],
        protected scene: HeroGameLoopClient
    ) {
        super(teams, scene);
    }

    update() {

    }

    render() {

    }
}