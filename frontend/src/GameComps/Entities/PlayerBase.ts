import {CollisionResult, EntityBase, Team} from "../../types/types";
import {Vector2D} from "../Utility";
import {EntityID} from "../HeroGameLoopServer";
import {gameConfig} from "../../config";
import {Factions} from "../../UI-Comps/CharacterCreation/FactionSelection";
import {SpellPack} from "../../types/spellTypes";
import {ParticleSystemBase} from "../ParticleSystemBase";
import {HeroGameLoopBase} from "../HeroGameLoopBase";
import {CastleBase} from "./CastleBase";

export abstract class PlayerBase implements EntityBase {
    public vel: Vector2D = Vector2D.zeros();
    public acc: Vector2D = Vector2D.zeros();
    public targetedBy: string[] = [];
    public availableSpells: SpellPack[] = [];

    public maxVel: number = 1.0;
    public maxAcc: number = gameConfig.playerMaxAcc;
    public gold: number = gameConfig.playerStartGold;
    public givesIncome: number = gameConfig.playerSelfIncome;

    public particleSystem: ParticleSystemBase | null = null;

    public name: string = ""
    protected maxHealth: number = 0;
    protected powerMultiplier: number = 0;
    protected maxMana: number = 0;
    protected faction: Factions = Factions.Wild;

    public mana: number = this.maxMana;
    public health: number = this.maxHealth;

    public radius: number = 20; // for collider - unused
    public mass: number = 50**3; // for collision - unused

    abstract id: EntityID;
    abstract pos: Vector2D;
    abstract team: Team;
    abstract myCastles: CastleBase[];

    abstract scene: HeroGameLoopBase;

    abstract getFiringPos(from: Vector2D): Vector2D;
    abstract checkCollisions(): CollisionResult;
    abstract onDeath(): void;

    isAlive(): boolean {
        return this.health > 0;
    }

    receiveDamage(damage: number): void {
        this.health -= damage
        if (!this.isAlive()) {
            this.onDeath()
        }
    }


    updateMovement() {
        if (this.acc.isZero()) {
            this.vel.scale(.9)
        } else {
            this.vel.add(this.acc);
            this.vel.limit(this.maxVel);
        }
        if (this.vel.sqMagnitude() < (.075 * .075)) {
            this.vel.x = 0;
            this.vel.y = 0;
        }
        const collisionTest = this.checkCollisions();
        if (collisionTest.collides) {
            const normal = collisionTest.normal1!;
            if (normal.x > 0 && this.vel.x > 0) this.vel.x = 0;
            else if (normal.x < 0 && this.vel.x < 0) this.vel.x = 0;
            if (normal.y > 0 && this.vel.y > 0) this.vel.y = 0;
            else if (normal.y < 0 && this.vel.y < 0) this.vel.y = 0;
        }

        this.pos.add(this.vel);
    }

    newDay() {
        this.gold += this.givesIncome;
        this.myCastles.forEach(castle => {
            this.gold += castle.givesIncome;
        })
        this.particleSystem?.getParticles().ownerForEach(this, (drone) => {
            this.gold += drone.givesIncome;
        })
    }
 }