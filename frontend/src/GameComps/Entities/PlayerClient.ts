import {DirectionalSpriteSheet, Team} from "../../types/types";
import {HeroGameLoopClient} from "../HeroGameLoopClient";
import {Character} from "../../UI-Comps/CharacterCreation/MainCharacterCreation";
import {CastleClient} from "./CastleClient";
import {Vector2D} from "../Utility";
import {
    healthConversion,
    manaConversion,
    powerConversion,
    speedConversion
} from "../../UI-Comps/CharacterCreation/StatConversion";
import {Factions} from "../../UI-Comps/CharacterCreation/FactionSelection";
import {AnimatedSprite, Assets, Container, Graphics, Spritesheet, Text} from "pixi.js";
import HeroGameLoopServer, {ClientID} from "../HeroGameLoopServer";
import {SpellPack} from "../../types/spellTypes";
import {gameConfig} from "../../config";
import {AreaDamageMessage, ClientMessageType} from "@shared/commTypes";

export class PlayerClient {
    isLocal: boolean = false;

    pos: Vector2D = Vector2D.zeros();
    vel: Vector2D = Vector2D.zeros();
    acc: Vector2D = Vector2D.zeros();
    aimPos: Vector2D = Vector2D.zeros();
    maxAcc: number = .1;
    health: number = 0;
    private name: string = "";
    private maxHealth: number = 0;
    private maxVel: number = 1;
    private powerMultiplier: number = 1;
    private maxMana: number = 0;
    private faction: Factions = Factions.Wild;
    mana: number = 0;
    gold: number = 0;

    private playerSpritePack: DirectionalSpriteSheet | null = null;
    private currentAnimation: AnimatedSprite | null = null;
    private healthSprite: Graphics | null = null;
    private manaSprite: Graphics | null = null;
    private rangeSprite: Graphics | null = null;
    private spellCursorSprite: Container | null = null;
    private nameSprite: Text | null = null;

    private isCasting: boolean = false;
    private currentSpellRangeSpell: SpellPack | null = null;


    constructor(
        public id: ClientID,
        private team: Team,
        private scene: HeroGameLoopClient,
        public character: Character,
    ) {
    }

    parseCharacter(character: Character) {
        this.name = character.playerName;

        this.maxHealth = healthConversion(character.stats.health);
        this.maxVel *= speedConversion(character.stats.speed);
        this.maxAcc *= speedConversion(character.stats.speed);
        this.powerMultiplier = powerConversion(character.stats.magicPower);
        this.maxMana = manaConversion(character.stats.magicStamina);

        this.faction = character.faction;
        const fInit = gameConfig.factionInit[character.faction];

        this.gold = fInit.gold;
        this.health = this.maxHealth;
        this.mana = this.maxMana;
        if (this.faction === Factions.Wild) {
            this.getCat().catch(e => console.error(e));
        } else {
            throw new Error(`Faction not implemented`);
        }
    }

    async getCat() {
        const catSpriteSheet: Spritesheet = await Assets.cache.get('/sprites/black_cat_run.json');
        const animations = catSpriteSheet.data.animations!;
        this.playerSpritePack =  {
            'd': AnimatedSprite.fromFrames(animations["u/black_0"]),
            'dr': AnimatedSprite.fromFrames(animations["ur/black_0"]),
            'r': AnimatedSprite.fromFrames(animations["r/black_0"]),
            'ur': AnimatedSprite.fromFrames(animations["dr/black_0"]),
            'u': AnimatedSprite.fromFrames(animations["d/black_0"]),
            'ul': AnimatedSprite.fromFrames(animations["dl/black_0"]),
            'l': AnimatedSprite.fromFrames(animations["l/black_0"]),
            'dl': AnimatedSprite.fromFrames(animations["ul/black_0"]),
        };
        Object.keys(this.playerSpritePack).forEach(key => {
            if (this.playerSpritePack) {
                const animation = this.playerSpritePack[key as keyof DirectionalSpriteSheet];
                animation.loop = true;
                animation.visible = false;
                animation.anchor.set(.5);
                animation.zIndex = HeroGameLoopServer.zIndex.ground;
                this.scene.pixiRef.stage.addChild(animation);
            }
        });
    }

    determineDirectionFromAngle(): string {
        const {x, y} = this.vel;

        // If velocity is zero, return idle animation
        if (x === 0 && y === 0) {
            return 'd'; // Default to 'down'
        }

        // Calculate the angle in radians
        const angle = Math.atan2(y, x);

        // Map angle to one of the 8 directions
        const directionIndex = Math.round((angle + Math.PI) / (Math.PI / 4)) % 8;
        return ['l', 'dl', 'd', 'dr', 'r', 'ur', 'u', 'ul'][directionIndex]

    }

    setAnimation() {
        if (this.playerSpritePack === null) return
        const key = this.determineDirectionFromAngle();
        const newAnimation = this.playerSpritePack[key as keyof DirectionalSpriteSheet];
        if (newAnimation === this.currentAnimation) return;
        if (this.currentAnimation) {
            this.currentAnimation.stop();
            this.currentAnimation.visible = false;
        }

        this.currentAnimation = newAnimation;
        this.currentAnimation.visible = true;
        this.currentAnimation.play();
    }

    requestAreaDamage(position: Vector2D, spell: SpellPack, safeTeam: Team[] = []) {
        this.scene.socket.send(JSON.stringify({
            type: ClientMessageType.RequestAreaDamage,
            payload: {position, spell, safeTeam} as AreaDamageMessage}));
        this.renderExplosion(position, spell.effectRange);
    }

    gainCastleControl(castle: CastleClient) {
        // To server?
    }

    castSpell(): void {
        if (!this.isCasting) return
        if (this.activeSpell === null) return
        if (this.spellCursorSprite === null) return
        if (this.activeSpell.castCost > this.mana) return;

        // const effectPos = new Vector2D(this.spellCursorSprite.position.x, this.spellCursorSprite.position.y);
        const sqCastRange = this.activeSpell.castRange * this.activeSpell.castRange;

        if (Vector2D.sqDist(this.aimPos, this.pos) > sqCastRange)
            return this.cancelSpell();

        this.mana -= this.activeSpell.castCost;
        const sqEffectRange = this.activeSpell.effectRange * this.activeSpell.effectRange;
        this.scene.areaDamage(this.aimPos, sqEffectRange, this.activeSpell.effectAmount * this.powerMultiplier);
        this.scene.renderExplosion(this.aimPos, this.activeSpell.effectRange);

        // Reset casting preparation
        this.castingDoneCallback(true);
        this.castingDoneCallback = ()=>{};
        this.isCasting = false;
        this.activeSpell = null;
    }

    toggleCityPopup() {

    }

    closeCityPopUp() {

    }

    cancelSpell() {

    }

    newDay() {

    }

    updateMovement() {

    }

    render() {

    }

    renderExplosion(position: Vector2D, radius: number) {
        if (this.scene.explosionSprite === null) return
        const explosion = new AnimatedSprite(this.scene.explosionSprite);
        explosion.zIndex = HeroGameLoopClient.zIndex.hud;
        explosion.loop = false;
        explosion.animationSpeed = .5;
        explosion.anchor.set(0.5);
        explosion.scale = this.scene.renderScale * .15 * radius / 100;
        explosion.x = position.x * this.scene.renderScale;
        explosion.y = position.y * this.scene.renderScale;
        explosion.visible = true;
        this.scene.pixiRef.stage.addChild(explosion);
        explosion.gotoAndPlay(0);
        explosion.onComplete = () => {
            this.scene.pixiRef.stage.removeChild(explosion);
            explosion.destroy();
        }
    }
}