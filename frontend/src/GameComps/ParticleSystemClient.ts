import {Team} from "../types/types";
import {HeroGameLoopClient} from "./HeroGameLoopClient";
import {ParticleSystemBase} from "./ParticleSystemBase";
import {ParticleBase} from "./Entities/ParticleBase";
import {ParticleClient} from "./Entities/ParticleClient";
import {UnitManager} from "./UnitManager";
import {Vector2D} from "./Utility";
import {UnitPack} from "../types/unitTypes";
import {PlayerBase} from "./Entities/PlayerBase";
import {ParticleID} from "@shared/commTypes";
import {CastleBase} from "./Entities/CastleBase";
import {PlayerClient} from "./Entities/PlayerClient";
import {CastleClient} from "./Entities/CastleClient";

export class ParticleSystemClient extends ParticleSystemBase{
    protected override unitManager: UnitManager<ParticleClient> = new UnitManager();
    constructor(
        protected teams: Team[],
        protected scene: HeroGameLoopClient
    ) {
        super(teams, scene);
    }

    getNewParticle(player: PlayerClient, castle: CastleClient, groupID: number, unitInfo: UnitPack, owner: PlayerClient, droneId: ParticleID): ParticleClient {
        const randomSpawnOffset = new Vector2D((Math.random()-.5)*30, (Math.random()-.5)*30);
        return this.createParticle(
            Vector2D.add(castle.pos, randomSpawnOffset),
            10,
            1,
            player.team!,
            groupID,
            unitInfo,
            owner,
            droneId
        );
    }

    createParticle(origin: Vector2D, mass: number, maxVel: number, team: Team, groupID: number, unitInfo: UnitPack, owner: PlayerClient, droneId: ParticleID): ParticleClient {
        const p = new ParticleClient( origin , mass, team, maxVel, team.color, this.scene, groupID, unitInfo, owner.id, this.unitManager, droneId);
        p.setLeader(owner);
        this.unitManager.add(p);
        return p;
    }

    render() {
        this.unitManager.deepForEach((particle: ParticleClient) => {
            particle.render();
        });
    }
}