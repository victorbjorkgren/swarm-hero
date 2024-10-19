import {CollisionResult, DirectionalSpriteSheet, Team} from "../../types/types";
import {HeroGameLoopClient} from "../HeroGameLoopClient";
import {Character} from "../../UI-Comps/CharacterCreation/MainCharacterCreation";
import {CastleClient} from "./CastleClient";
import {pol2cart, Vector2D} from "../Utility";
import {
    healthConversion,
    manaConversion,
    powerConversion,
    speedConversion
} from "../../UI-Comps/CharacterCreation/StatConversion";
import {Factions} from "../../UI-Comps/CharacterCreation/FactionSelection";
import {AnimatedSprite, Assets, Container, Graphics, Spritesheet, Text} from "pixi.js";
import {SpellPack} from "../../types/spellTypes";
import {gameConfig, UnitPacks} from "../../config";
import {
    SpellCastMessage,
    ClientMessageType,
    BuyDroneMessage,
    BuySpellMessage,
    GarrisonMessage
} from "@shared/commTypes";
import {PlayerBase} from "./PlayerBase";
import HeroGameLoopServer, {CastleID, Client, ClientID} from "../HeroGameLoopServer";
import {renderArcaneWheel} from "../Graphics/ExplosionMarker";
import {Units} from "../../types/unitTypes";
import {CastleServer} from "./CastleServer";
import { CastleBase } from "./CastleBase";

export class PlayerClient extends PlayerBase {
    myCastles: CastleClient[] = [];
    isLocal: boolean = false;

    aimPos: Vector2D = Vector2D.zeros();
    public popUpCastle: CastleClient | null = null;

    private playerSpritePack: DirectionalSpriteSheet | null = null;
    private currentAnimation: AnimatedSprite | null = null;
    private healthSprite: Graphics | null = null;
    private manaSprite: Graphics | null = null;
    private rangeSprite: Graphics | null = null;
    private spellCursorSprite: Container | null = null;
    private nameSprite: Text | null = null;

    isCasting: boolean = false;
    private currentSpellRangeSpell: SpellPack | null = null;
    activeSpell: SpellPack | null = null;
    castingDoneCallback: (didCast: boolean) => void = () => {};


    constructor(
        public id: ClientID,
        public pos: Vector2D,
        public team: Team,
        public character: Character,
        public scene: HeroGameLoopClient,
    ) {
        super()
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
                animation.zIndex = HeroGameLoopClient.zIndex.ground;
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

    requestSpellCast(position: Vector2D, spell: SpellPack, safeTeam: Team[] = []) {
        this.scene.socket?.send(JSON.stringify({
            type: ClientMessageType.RequestSpellCast,
            payload: {position, spell, safeTeam} as SpellCastMessage}));
    }

    requestBuyDrone(unit: Units, n: number, castleId: CastleID) {
        this.scene.socket?.send(JSON.stringify({
            type: ClientMessageType.RequestBuyDrone,
            payload: {
                buyer: this.id,
                unit: unit,
                n: n,
                castle: castleId
            } as BuyDroneMessage,
        }))
    }

    requestBuySpell(spell: SpellPack) {
        const castleId = this.popUpCastle?.id
        if (!castleId) return
        this.scene.socket?.send(JSON.stringify({
            type: ClientMessageType.RequestBuySpell,
            payload: {
                buyer: this.id,
                spell: spell,
                castle: castleId
            } as BuySpellMessage,
        }))
    }

    requestGarrisonDrone(unit: Units, n: number, isBringing: boolean) {
        const castleId = this.popUpCastle?.id
        if (!castleId) return
        this.scene.socket?.send(JSON.stringify({
            type: ClientMessageType.RequestGarrison,
            payload: {
                instigator: this.id,
                isBringing: isBringing,
                unit: unit,
                n: n,
                castle: castleId
            } as GarrisonMessage,
        }))
    }

    findNearbyCastle(): CastleClient | null {
        for (const castle of this.myCastles) {
            if (castle.nearbyPlayers.find(player => player === this))
                return castle;
        }
        return null
    }

    gainCastleControl(castle: CastleClient) {
        this.myCastles.push(castle);
        castle.owner = this.id;
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

    buyDrone(unit: Units, n: number): boolean {
        if (!this.particleSystem) return false;
        if (this.popUpCastle === undefined || this.popUpCastle === null) return false;
        if (!this.popUpCastle.isAlive()) return false;
        if (this.gold < (UnitPacks[unit].buyCost * n)) return false

        this.gold -= UnitPacks[unit].buyCost * n;

        this.requestBuyDrone(unit, n, this.popUpCastle.id);
        // for (let i = 0; i < n; i++) {
        //     this.particleSystem.getNewParticle(this, castle, 0, UnitPacks[unit], this)
        // }
        return true;
    }

    buySpell(spell: SpellPack): boolean {
        if (this.popUpCastle === undefined || this.popUpCastle === null) return false;
        if (!this.popUpCastle.isAlive()) return false;
        if (this.gold < spell.buyCost) return false

        const spellIndex = this.popUpCastle.availableSpells.indexOf(spell);
        if (spellIndex === -1) return false;

        this.gold -= spell.buyCost;
        this.availableSpells.push(spell);
        this.popUpCastle.availableSpells.splice(spellIndex, 1);

        return true;
    }

    garrisonDrones(droneType: Units, n: number): boolean {
        const castle = this.popUpCastle;
        if (castle === null) return false;
        if (!castle.isAlive()) return false;
        if (castle.owner !== this.id) return false;

        const uMgr = this.particleSystem?.getParticles()
        if (uMgr === undefined) return false;

        const droneSet = uMgr.getUnits(this, droneType)
        if (droneSet === null) return false;
        if (droneSet.size < n) return false;

        let movedDrones = 0;
        for (const drone of droneSet) {
            uMgr.switchOwner(drone, castle)
            drone.setLeaderPosition(castle.pos);
            if (++movedDrones >= n) break;
        }
        return true;
    }

    bringGarrisonDrone(droneType: Units, n: number): boolean {
        const castle = this.popUpCastle;
        if (castle === null) return false;

        const uMgr = this.particleSystem?.getParticles()
        if (uMgr === undefined) return false;

        const droneSet = uMgr.getUnits(castle, droneType)
        if (droneSet === null) return false;
        if (droneSet.size < n) return false;

        let movedDrones = 0;
        for (const drone of droneSet) {
            uMgr.switchOwner(drone, this)
            drone.setLeaderPosition(this.pos);
            if (++movedDrones >= n) break;
        }
        return true;
    }


    castSpell(): void {
        if (!this.isCasting) return
        if (this.activeSpell === null) return
        if (this.spellCursorSprite === null) return

        if (this.activeSpell.castCost > this.mana)
            return this.cancelSpell();

        // const effectPos = new Vector2D(this.spellCursorSprite.position.x, this.spellCursorSprite.position.y);
        const sqCastRange = this.activeSpell.castRange * this.activeSpell.castRange;

        if (Vector2D.sqDist(this.aimPos, this.pos) > sqCastRange)
            return this.cancelSpell();

        this.requestSpellCast(this.aimPos, this.activeSpell);
        this.isCasting = false;
        this.activeSpell = null;
    }

    resolveSpell(castMessage: SpellCastMessage) {
        const spell = castMessage.spell
        const sqEffectRange = spell.effectRange * spell.effectRange;
        this.scene.areaDamage(castMessage.position, sqEffectRange, spell.effectAmount * this.powerMultiplier, castMessage.safeTeam);
        this.renderExplosion(castMessage.position, spell.effectRange);

        this.mana -= spell.castCost;
        this.castingDoneCallback(true);
        this.castingDoneCallback = ()=>{};
    }


    closeCityPopUp(): void {
        this.scene.setPlayerPopOpen(undefined);
        this.popUpCastle = null;
    }

    playerLeavingCastleMenu() {
        if (this.popUpCastle === null) return;
        if (!this.popUpCastle.nearbyPlayers.includes(this)) {
            this.closeCityPopUp();
        }
    }

    toggleCityPopup() {
        if (!this.scene.setPlayerPopOpen) return;
        if (this.popUpCastle !== null) return this.closeCityPopUp();

        for (const castleId of this.team.castleIds) {
            const castle = this.scene.castles.get(castleId);
            if (castle === undefined) return;
            if (castle.nearbyPlayers.includes(this)) {
                this.scene.setPlayerPopOpen(
                    {
                        playerID: this.team.id,
                        castle: castle
                    });
                this.popUpCastle = castle;
            }
        }
    }

    prepareSpell(spell: SpellPack, castingDoneCallback: (didCast: boolean) => void) {
        if (spell.castCost > this.mana) return;
        if (this.activeSpell === spell) return this.cancelSpell();
        this.isCasting = true;
        this.activeSpell = spell;
        this.castingDoneCallback = castingDoneCallback;
    }

    cancelSpell() {
        this.castingDoneCallback(false);
        this.castingDoneCallback = () => {
        };
        this.isCasting = false;
        this.activeSpell = null;
    }

    updateMovement() {

    }

    render() {
        this.renderSelf();
        this.renderAttack();
        this.renderHUD();

        this.playerLeavingCastleMenu();
    }

    renderSelf() {
        this.setAnimation();
        if (this.currentAnimation !== null) {
            this.currentAnimation.x = this.pos.x * this.scene.renderScale;
            this.currentAnimation.y = this.pos.y * this.scene.renderScale;
            this.currentAnimation.animationSpeed = (this.vel.magnitude() / this.maxVel) / 7 ;
            this.currentAnimation.scale = this.scene.renderScale;
        }
    }

    renderAttack(): void {

    }

    renderHUD(): void {
        this.renderStatsBar();
        if (this.isLocal) {
            this.renderSpellRange();
            this.renderCursor();
        } else {
            this.renderName();
        }
    }

    renderCursor() {
        if (this.spellCursorSprite === null) {
            this.spellCursorSprite = renderArcaneWheel(this.scene.pixiRef);
        }
        // const cursor = new Vector2D(this.spellCursorSprite.position.x, this.spellCursorSprite.position.y)
        if (this.activeSpell !== null && (Vector2D.sqDist(this.aimPos, this.pos) < (this.activeSpell.castRange ** 2))) {
            this.spellCursorSprite.visible = true;
            this.spellCursorSprite.position.x = this.aimPos.x * this.scene.renderScale;
            this.spellCursorSprite.position.y = this.aimPos.y * this.scene.renderScale;
            this.spellCursorSprite.scale.set(this.scene.renderScale);
            this.scene.pixiRef.stage.cursor = "none";
        } else {
            this.spellCursorSprite.visible = false;
            this.scene.pixiRef.stage.cursor = "auto";
        }
    }

    renderName() {
        if (this.nameSprite === null) {
            this.nameSprite = new Text(this.name, {
                fill: {color: this.team.color, alpha: 0.7},
                fontSize: 13,
                letterSpacing: -0.6
            });
            this.nameSprite.zIndex = HeroGameLoopClient.zIndex.ground;
            this.scene.pixiRef.stage.addChild(this.nameSprite);
        }
        this.nameSprite.position.set(this.pos.x * this.scene.renderScale, this.pos.y * this.scene.renderScale + 25);
    }

    renderStatsBar(): void {
        if (this.healthSprite === null) {
            this.healthSprite = new Graphics();
            this.healthSprite.zIndex = HeroGameLoopClient.zIndex.ground;
            this.scene.pixiRef.stage.addChild(this.healthSprite);
        }
        if (this.manaSprite === null) {
            this.manaSprite = new Graphics();
            this.manaSprite.zIndex = HeroGameLoopClient.zIndex.ground;
            this.scene.pixiRef.stage.addChild(this.manaSprite);
        }
        this.healthSprite.clear();
        this.manaSprite.clear()

        if (!this.isAlive()) return;
        if (this.currentAnimation === null) return;

        const healthRatio = this.health / this.maxHealth;
        const manaRatio = this.mana / this.maxMana;
        const lx = 40;
        this.healthSprite
            .moveTo(this.pos.x * this.scene.renderScale - (lx / 2), this.pos.y * this.scene.renderScale - this.currentAnimation.height / 2 - 8)
            .lineTo((this.pos.x * this.scene.renderScale - (lx / 2)) + (lx * healthRatio), this.pos.y * this.scene.renderScale  - this.currentAnimation.height / 2 - 8)
            .stroke({
                color: 0xFF0000,
                alpha: .3,
                width: 2
            })
        this.manaSprite
            .moveTo(this.pos.x * this.scene.renderScale - (lx / 2), this.pos.y * this.scene.renderScale - this.currentAnimation.height / 2 - 5)
            .lineTo((this.pos.x * this.scene.renderScale - (lx / 2)) + (lx * healthRatio), this.pos.y * this.scene.renderScale - this.currentAnimation.height / 2 - 5)
            .stroke({
                color: 0x0000FF,
                alpha: .3,
                width: 2
            })
    }

    renderSpellRange(): void {
        if (this.rangeSprite === null) {
            this.rangeSprite = new Graphics();
            this.rangeSprite.zIndex = HeroGameLoopClient.zIndex.hud;
            this.scene.pixiRef.stage.addChild(this.rangeSprite);
        }
        if (!this.isCasting || this.activeSpell === null) {
            this.rangeSprite.visible = false;
            return
        }
        this.rangeSprite.visible = true;

        const nDashes = 10;
        const gapSizeRatio = .5;
        const dashLength = 2 * Math.PI / ((1 + gapSizeRatio) * nDashes);

        if (this.currentSpellRangeSpell?.castRange !== this.activeSpell.castRange) {
            this.currentSpellRangeSpell = this.activeSpell;
            for (let i = 0; i < nDashes; i++) {
                const startAngle = i * (1 + gapSizeRatio) * dashLength;
                const startPos = pol2cart(this.activeSpell.castRange, startAngle);
                this.rangeSprite.moveTo(startPos.x, startPos.y);
                this.rangeSprite.arc(0, 0, this.activeSpell.castRange, startAngle, startAngle + dashLength);
            }
            this.rangeSprite.stroke({color: 0xffffff, alpha: 0.1, width: 5});
        }

        this.rangeSprite.x = this.pos.x * this.scene.renderScale;
        this.rangeSprite.y = this.pos.y * this.scene.renderScale;
        this.rangeSprite.scale.set(this.scene.renderScale);
        this.rangeSprite.rotation += .004;
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