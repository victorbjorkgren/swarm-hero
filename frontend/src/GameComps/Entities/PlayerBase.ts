import {AABBCollider, CollisionResult, EntityBase, Team} from "../../types/types";
import {checkAABBCollision, Vector2D} from "../Utility";
import {gameConfig} from "../../config";
import {Factions} from "../../UI-Comps/CharacterCreation/FactionSelection";
import {SpellPack} from "../../types/spellTypes";
import {ParticleSystemBase} from "../ParticleSystemBase";
import {HeroGameLoopBase} from "../HeroGameLoopBase";
import {CastleBase} from "./CastleBase";
import {ParticleBase} from "./ParticleBase";
import {CastleServer} from "./CastleServer";
import {EntityID} from "@shared/commTypes";

export abstract class PlayerBase implements EntityBase {
    public vel: Vector2D = Vector2D.zeros();
    public acc: Vector2D = Vector2D.zeros();
    public targetedBy: ParticleBase[] = [];
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
    abstract team: Team | null;
    abstract myCastles: CastleBase[];

    abstract scene: HeroGameLoopBase;


    isAlive(): boolean {
        return this.health > 0;
    }

    receiveDamage(damage: number): void {
        this.health -= damage
        if (!this.isAlive()) {
            this.onDeath()
        }
    }

    checkCollisions(): CollisionResult {
        const myCollider = this.collider;
        for (const collider of this.scene.colliders) {
            const collisionTest = checkAABBCollision(myCollider, collider);
            if (collisionTest.collides) return collisionTest;
        }
        return {collides: false};
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

    onDeath(): void {
        let w: string;
        if (this.team!.id === 0)
            w = this.scene.teams[1].name;
        else
            w = this.scene.teams[0].name;
        this.scene.onDeath(w.toString());
    }

    get collider(): AABBCollider {
        // if (this.currentAnimation !== null) {
        //     return spriteToAABBCollider(this.currentAnimation);
        // } else {
        return {
            minX: this.pos.x - 20,
            maxX: this.pos.x + 20,
            minY: this.pos.y - 20,
            maxY: this.pos.y + 20,
            inverted: false
        };
        // }
    }

    findNearbyCastle(): CastleServer | null {
        for (const castle of this.myCastles) {
            if (castle.nearbyPlayers.find(player => player === this))
                return castle;
        }
        return null
    }

    getFiringPos(from: Vector2D): Vector2D {
        // if (this.currentAnimation !== null) {
        //     return new Vector2D(
        //         this.pos.x,
        //         this.pos.y,
        //     )
        // } else {
        return this.pos.copy();
        // }
        // return closestPointOnPolygon(this.collider.verts, from);
    }

    castSpell(castPos: Vector2D, spell: SpellPack): boolean {
        if (spell.castCost > this.mana) return false;
        if (Vector2D.sqDist(castPos, this.pos) > spell.castRange * spell.castRange) return false;

        this.mana -= spell.castCost;
        const sqEffectRange = spell.effectRange * spell.effectRange;
        this.scene.areaDamage(castPos, sqEffectRange, spell.effectAmount * this.powerMultiplier);

        return true;
    }
 }