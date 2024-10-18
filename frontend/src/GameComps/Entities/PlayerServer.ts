import {checkAABBCollision, pol2cart, spriteToAABBCollider, Vector2D} from "../Utility";
import {ParticleSystemBase} from "../ParticleSystemBase";
import {AABBCollider, CollisionResult, Controller, DirectionalSpriteSheet, Team} from "../../types/types";
import HeroGameLoopServer, {CastleID, Client, ClientID, EntityID} from "../HeroGameLoopServer";
import {AnimatedSprite, Assets, Container, Graphics, Spritesheet, Text} from "pixi.js";
import {renderArcaneWheel} from "../Graphics/ExplosionMarker";
import {SpellPack} from "../../types/spellTypes";
import {Units} from "../../types/unitTypes";
import {Character} from "../../UI-Comps/CharacterCreation/MainCharacterCreation";
import {
    healthConversion,
    manaConversion,
    powerConversion,
    speedConversion
} from "../../UI-Comps/CharacterCreation/StatConversion";
import {Factions} from "../../UI-Comps/CharacterCreation/FactionSelection";
import {gameConfig, UnitPacks} from "../../config";
import {NetworkController} from "../Controllers/NetworkController";
import {AIController} from "../Controllers/AIController";
import {PlayerBase} from "./PlayerBase";
import {CastleServer} from "./CastleServer";

export class PlayerServer extends PlayerBase {
    public id: ClientID;
    public controller: Controller;
    myCastles: CastleServer[] = [];

    constructor(
        public pos: Vector2D,
        public team: Team,
        private client: Client,
        public scene: HeroGameLoopServer,
    ) {
        super();
        if (!client.character) throw new Error("Could not find a character on client");

        this.id = client.id;
        this.team.playerIds.push(client.id);
        this.parseCharacter(client.character)
        this.controller = new NetworkController(this);
    }

    parseCharacter(character: Character) {
        this.name = character.playerName;

        this.maxHealth = healthConversion(character.stats.health);
        this.maxVel *= speedConversion(character.stats.speed);
        this.maxAcc *= speedConversion(character.stats.speed);
        this.powerMultiplier = powerConversion(character.stats.magicPower);
        this.maxMana = manaConversion(character.stats.magicStamina);

        this.faction = character.faction;

        this.health = this.maxHealth;
        this.mana = this.maxMana;
        // if (this.faction === Factions.Wild) {
        //     this.getCat().catch(e => console.error(e));
        // } else {
        //     throw new Error(`Faction not implemented`);
        // }
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

    onDeath(): void {
        let w: string;
        if (this.team.id === 0)
            w = this.scene.teams[1].name;
        else
            w = this.scene.teams[0].name;
        this.scene.onDeath(w.toString());
    }

    gainCastleControl(castle: CastleServer) {
        this.myCastles.push(castle);
        castle.owner = this.client.id;
    }

    receiveDamage(damage: number) {
        this.health -= damage;
        if (this.health < 0) {
            this.onDeath();
        }
    }

    setParticleSystem(particleSystem: ParticleSystemBase): void {
        this.particleSystem = particleSystem;
    }

    findNearbyCastle(): CastleServer | null {
        for (const castle of this.myCastles) {
            if (castle.nearbyPlayers.find(player => player === this))
                return castle;
        }
        return null
    }


    isAlive(): boolean {
        return this.health > 0;
    }

    checkCollisions(): CollisionResult {
        const myCollider = this.collider;
        for (const collider of this.scene.colliders) {
            const collisionTest = checkAABBCollision(myCollider, collider);
            if (collisionTest.collides) return collisionTest;
        }
        return {collides: false};
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

    // async getCat() {
    //     const catSpriteSheet: Spritesheet = await Assets.cache.get('/sprites/black_cat_run.json');
    //     const animations = catSpriteSheet.data.animations!;
    //     this.playerSpritePack =  {
    //         'd': AnimatedSprite.fromFrames(animations["u/black_0"]),
    //         'dr': AnimatedSprite.fromFrames(animations["ur/black_0"]),
    //         'r': AnimatedSprite.fromFrames(animations["r/black_0"]),
    //         'ur': AnimatedSprite.fromFrames(animations["dr/black_0"]),
    //         'u': AnimatedSprite.fromFrames(animations["d/black_0"]),
    //         'ul': AnimatedSprite.fromFrames(animations["dl/black_0"]),
    //         'l': AnimatedSprite.fromFrames(animations["l/black_0"]),
    //         'dl': AnimatedSprite.fromFrames(animations["ul/black_0"]),
    //     };
    //     Object.keys(this.playerSpritePack).forEach(key => {
    //         if (this.playerSpritePack) {
    //             const animation = this.playerSpritePack[key as keyof DirectionalSpriteSheet];
    //             animation.loop = true;
    //             animation.visible = false;
    //             animation.anchor.set(.5);
    //             animation.zIndex = HeroGameLoopServer.zIndex.ground;
    //             this.scene.pixiRef.stage.addChild(animation);
    //         }
    //     });
    // }

    // determineDirectionFromAngle(): string {
    //     const {x, y} = this.vel;
    //
    //     // If velocity is zero, return idle animation
    //     if (x === 0 && y === 0) {
    //         return 'd'; // Default to 'down'
    //     }
    //
    //     // Calculate the angle in radians
    //     const angle = Math.atan2(y, x);
    //
    //     // Map angle to one of the 8 directions
    //     const directionIndex = Math.round((angle + Math.PI) / (Math.PI / 4)) % 8;
    //     return ['l', 'dl', 'd', 'dr', 'r', 'ur', 'u', 'ul'][directionIndex]
    //
    // }

    // setAnimation() {
    //     if (this.playerSpritePack === null) return
    //     const key = this.determineDirectionFromAngle();
    //     const newAnimation = this.playerSpritePack[key as keyof DirectionalSpriteSheet];
    //     if (newAnimation === this.currentAnimation) return;
    //     if (this.currentAnimation) {
    //         this.currentAnimation.stop();
    //         this.currentAnimation.visible = false;
    //     }
    //
    //     this.currentAnimation = newAnimation;
    //     this.currentAnimation.visible = true;
    //     this.currentAnimation.play();
    // }

    // prepareSpell(spell: SpellPack, castingDoneCallback: (didCast: boolean) => void) {
    //     if (spell.castCost > this.mana) return;
    //     if (this.activeSpell === spell) return this.cancelSpell();
    //     this.isCasting = true;
    //     this.activeSpell = spell;
    //     this.castingDoneCallback = castingDoneCallback;
    // }

    castSpell(pos: Vector2D, spell: SpellPack): boolean {
        // if (!this.isCasting) return false;
        // if (this.activeSpell === null) return false;
        // if (this.spellCursorSprite === null) return false;
        if (spell.castCost > this.mana) return false;

        // const effectPos = new Vector2D(this.spellCursorSprite.position.x, this.spellCursorSprite.position.y);

        if (Vector2D.sqDist(pos, this.pos) > spell.castRange * spell.castRange) return false;


        return true;
    }

    resolveSpell(spell: SpellPack, pos: Vector2D): void {
        this.mana -= spell.castCost;
        const sqEffectRange = spell.effectRange * spell.effectRange;
        this.scene.areaDamage(pos, sqEffectRange, spell.effectAmount * this.powerMultiplier);
        // this.scene.renderExplosion(this.aimPos, spell.effectRange);

        // Reset casting preparation
        // this.castingDoneCallback(true);
        // this.castingDoneCallback = ()=>{};
    }

}