import {Team} from "../types/types";
import {HeroGameLoopClient} from "./HeroGameLoopClient";
import {ParticleSystemBase} from "./ParticleSystemBase";
import {ParticleBase} from "./Entities/ParticleBase";
import {ParticleClient} from "./Entities/ParticleClient";
import {UnitManager} from "./UnitManager";

export class ParticleSystemClient extends ParticleSystemBase{
    protected override unitManager: UnitManager<ParticleClient> = new UnitManager();
    constructor(
        protected teams: Team[],
        protected scene: HeroGameLoopClient
    ) {
        super(teams, scene);
    }


    render() {
        this.unitManager.deepForEach((particle: ParticleClient) => {
            particle.render();
        });
    }
}