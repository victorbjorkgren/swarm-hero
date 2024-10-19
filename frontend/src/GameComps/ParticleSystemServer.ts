import {ParticleSystemBase} from "./ParticleSystemBase";
import {UnitManager} from "./UnitManager";
import {ParticleServer} from "./Entities/ParticleServer";

export class ParticleSystemServer extends ParticleSystemBase {
    protected override unitManager: UnitManager<ParticleServer> = new UnitManager();
}