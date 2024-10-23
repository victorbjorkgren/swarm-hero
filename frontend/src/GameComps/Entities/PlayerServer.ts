import {checkAABBCollision, pol2cart, spriteToAABBCollider, Vector2D} from "../Utility";
import {ParticleSystemBase} from "../ParticleSystemBase";
import {
    AABBCollider,
    Character,
    CollisionResult,
    Controller,
    DirectionalSpriteSheet,
    Factions,
    Team
} from "../../types/types";
import HeroGameLoopServer from "../HeroGameLoopServer";
import {AnimatedSprite, Assets, Container, Graphics, Spritesheet, Text} from "pixi.js";
import {renderArcaneWheel} from "../Graphics/ExplosionMarker";
import {SpellPack} from "../../types/spellTypes";
import {Units} from "../../types/unitTypes";
import {
    healthConversion,
    manaConversion,
    powerConversion,
    speedConversion
} from "../../UI-Comps/CharacterCreation/StatConversion";
import {gameConfig, UnitPacks} from "@shared/config";
import {NetworkController} from "../Controllers/NetworkController";
import {AIController} from "../Controllers/AIController";
import {PlayerBase} from "./PlayerBase";
import {CastleServer} from "./CastleServer";
import {CastleID, Client, ClientID, EntityID} from "@shared/commTypes";

export class PlayerServer extends PlayerBase {
    public id: ClientID;
    myCastles: CastleServer[] = [];

    constructor(
        public pos: Vector2D,
        public team: Team,
        private clientId: ClientID,
        character: Character,
        public scene: HeroGameLoopServer,
    ) {
        super();
        if (!character) throw new Error("Could not find a character on client");

        this.id = clientId;
        this.team!.playerIds.push(clientId);
        this.parseCharacter(character)
        // this.controller = new NetworkController(this);
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


    gainCastleControl(castle: CastleServer) {
        this.myCastles.push(castle);
        castle.owner = this.clientId;
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





}