import {Character, CollisionResult, Controller, DirectionalSpriteSheet, Factions, Team} from "../../types/types";
import {HeroGameLoopClient} from "../HeroGameLoopClient";
import {CastleClient} from "./CastleClient";
import {pol2cart, Vector2D} from "../Utility";
import {
    healthConversion,
    manaConversion,
    powerConversion,
    speedConversion
} from "../../UI-Comps/CharacterCreation/StatConversion";
import {AnimatedSprite, Assets, Container, Graphics, Spritesheet, Text} from "pixi.js";
import {SpellPack} from "../../types/spellTypes";
import {gameConfig, player1Keys, UnitPacks} from "@shared/config";
import {
    SpellCastMessage,
    ClientMessageType,
    BuyDroneMessage,
    RequestBuySpellMessage,
    GarrisonMessage, Client, CastleID, ClientID, SpellCastID
} from "@shared/commTypes";
import {PlayerBase} from "./PlayerBase";
import HeroGameLoopServer from "../HeroGameLoopServer";
import {renderArcaneWheel} from "../Graphics/ExplosionMarker";
import {Units} from "../../types/unitTypes";
import {CastleServer} from "./CastleServer";
import { CastleBase } from "./CastleBase";
import { v4 as uuidv4 } from 'uuid';
import {NetworkController} from "../Controllers/NetworkController";
import {LocalPlayerController} from "../Controllers/LocalPlayerController";

export class PlayerClient extends PlayerBase {
    myCastles: CastleClient[] = [];
    isLocal: boolean = false;

    public pos: Vector2D = Vector2D.zeros();
    public team: Team | null = null;
    public character: Character | null = null;

    aimPos: Vector2D = Vector2D.zeros();
    public popUpCastle: CastleClient | null = null;

    private playerSpritePack: DirectionalSpriteSheet | null = null;
    private currentAnimation: AnimatedSprite | null = null;
    private healthBarSprite: Graphics | null = null;
    private manaBarSprite: Graphics | null = null;
    private rangeSprite: Graphics | null = null;
    private spellCursorSprite: Container | null = null;
    private nameSprite: Text | null = null;

    isCasting: boolean = false;
    private currentSpellRangeSpell: SpellPack | null = null;
    activeSpell: SpellPack | null = null;
    castingDoneCallback: (didCast: boolean) => void = () => {};

    public controller: Controller;


    constructor(
        public id: ClientID,
        public scene: HeroGameLoopClient,
    ) {
        super()
        if (scene.localId == id) {
            this.controller = new LocalPlayerController(this, player1Keys, scene);
        } else {
            this.controller = new NetworkController(this);
        }
    }

    gameInit(pos: Vector2D, team: Team, character: Character) {
        this.pos = pos;
        this.team = team;
        this.parseCharacter(character)
    }


    parseCharacter(character: Character) {
        this.character = character;
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

    broadcastSpellCast(position: Vector2D, spell: SpellPack, safeTeam: Team[] = []) {
        const castId = uuidv4();
        this.scene.observedSpellCasts.add(castId);
        const payload: SpellCastMessage = {
            instigator: this.id,
            position: position,
            spell: spell,
            castId: castId,
            safeTeam: safeTeam
        };
        this.scene.clients.forEach(client => {
            if (client.id === this.scene.localId) return;
            client.datachannel.send(JSON.stringify({
                type: ClientMessageType.RequestSpellCast,
                payload: payload}));
        })
    }

    broadcastBuyDrone(unit: Units, n: number, castleId: CastleID) {
        this.scene.broadcast(
            ClientMessageType.RequestBuyDrone,
            {
                buyer: this.id,
                unit: unit,
                n: n,
                castle: castleId
            } as BuyDroneMessage,
        )
    }

    requestGarrisonDrone(unit: Units, n: number, isBringing: boolean) {
        const castleId = this.popUpCastle?.id
        if (!castleId) return
        this.scene.hostchannel?.send(JSON.stringify({
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
            if (castle.nearbyPlayers.find(playerId => playerId === this.id))
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

    attemptBuyDrone(unit: Units, n: number): boolean {
        // Host Check
        if (!this.scene.particleSystem) return false;
        if (this.popUpCastle === undefined || this.popUpCastle === null) return false;
        if (!this.popUpCastle.isAlive()) return false;
        if (this.gold < (UnitPacks[unit].buyCost * n)) return false

        this.scene.hostchannel?.send(JSON.stringify({
            type: ClientMessageType.RequestBuyDrone,
            payload: {
                buyer: this.id,
                unit: unit,
                n: n,
                castle: this.popUpCastle.id
            }
        }))

        return true;

        // this.gold -= UnitPacks[unit].buyCost * n;
        //
        // this.broadcastBuyDrone(unit, n, this.popUpCastle.id);
        // return true;
    }

    attemptBuySpell(spell: SpellPack) {
        // Host Check
        if (this.popUpCastle === undefined || this.popUpCastle === null) return false;
        if (!this.popUpCastle.isAlive()) return false;
        if (this.gold < spell.buyCost) return false
        const spellIndex = this.popUpCastle.availableSpells.indexOf(spell);
        if (spellIndex === -1) return false;

        this.scene.hostchannel?.send(JSON.stringify({
            type: ClientMessageType.RequestBuySpell,
            payload: {
                buyer: this.id,
                spell: spell,
                castle: this.popUpCastle.id
            }
        }))
        return true;
    }

    garrisonDrones(droneType: Units, n: number): boolean {
        const castle = this.popUpCastle;
        if (castle === null) return false;
        if (!castle.isAlive()) return false;
        if (castle.owner !== this.id) return false;

        const uMgr = this.scene.particleSystem.getParticles()
        if (uMgr === undefined) return false;

        const droneSet = uMgr.getUnits(this.id, droneType)
        if (droneSet === null) return false;
        if (droneSet.size < n) return false;

        let movedDrones = 0;
        for (const drone of droneSet) {
            uMgr.switchOwner(drone, castle.id)
            drone.setLeader(castle);
            if (++movedDrones >= n) break;
        }
        return true;
    }

    bringGarrisonDrone(droneType: Units, n: number): boolean {
        const castle = this.popUpCastle;
        if (castle === null) return false;

        const uMgr = this.scene.particleSystem.getParticles()
        if (uMgr === undefined) return false;

        const droneSet = uMgr.getUnits(castle.id, droneType)
        if (droneSet === null) return false;
        if (droneSet.size < n) return false;

        let movedDrones = 0;
        for (const drone of droneSet) {
            uMgr.switchOwner(drone, this.id)
            drone.setLeader(this);
            if (++movedDrones >= n) break;
        }
        return true;
    }


    attemptSpellCast(): void {
        // Direct Peer
        if (!this.isCasting) return
        if (this.activeSpell === null) return
        if (this.spellCursorSprite === null) return

        const success = this.castSpell(this.aimPos, this.activeSpell);

        if (success) {
            this.broadcastSpellCast(this.aimPos, this.activeSpell);
            this.isCasting = false;
            this.activeSpell = null;
        } else {
            this.cancelSpell()
        }
    }

    closeCityPopUp(): void {
        this.scene.setPlayerPopOpen(undefined);
        this.popUpCastle = null;
    }

    playerLeavingCastleMenu() {
        if (this.popUpCastle === null) return;
        if (!this.popUpCastle.nearbyPlayers.includes(this.id)) {
            this.closeCityPopUp();
        }
    }

    toggleCityPopup() {
        if (!this.scene.setPlayerPopOpen) return;
        if (this.popUpCastle !== null) return this.closeCityPopUp();

        for (const castleId of this.team!.castleIds) {
            const castle = this.scene.castles.get(castleId);
            if (castle === undefined) return;
            if (castle.nearbyPlayers.includes(this.id)) {
                this.scene.setPlayerPopOpen(
                    {
                        playerID: this.team!.id,
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

    castSpell(castPos: Vector2D, spell: SpellPack): boolean {
        if (!this.availableSpells.some(spellPack => JSON.stringify(spellPack) === JSON.stringify(spell))) return false;
        if (spell.castCost > this.mana) return false;
        if (Vector2D.sqDist(castPos, this.pos) > spell.castRange * spell.castRange) return false;
        this.mana -= spell.castCost;
        const sqEffectRange = spell.effectRange * spell.effectRange;
        this.scene.areaDamage(castPos, sqEffectRange, spell.effectAmount * this.powerMultiplier);
        this.renderExplosion(castPos, spell.effectRange);

        this.castingDoneCallback(true);
        this.castingDoneCallback = ()=>{};
        return true;
    }

    cancelSpell() {
        this.castingDoneCallback(false);
        this.castingDoneCallback = () => {
        };
        this.isCasting = false;
        this.activeSpell = null;
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
                fill: {color: this.team!.color, alpha: 0.7},
                fontSize: 13,
                letterSpacing: -0.6
            });
            this.nameSprite.zIndex = HeroGameLoopClient.zIndex.ground;
            this.scene.pixiRef.stage.addChild(this.nameSprite);
        }
        this.nameSprite.position.set(this.pos.x * this.scene.renderScale, this.pos.y * this.scene.renderScale + 25);
    }

    renderStatsBar(): void {
        if (this.healthBarSprite === null) {
            this.healthBarSprite = new Graphics();
            this.healthBarSprite.zIndex = HeroGameLoopClient.zIndex.ground;
            this.scene.pixiRef.stage.addChild(this.healthBarSprite);
        }
        if (this.manaBarSprite === null) {
            this.manaBarSprite = new Graphics();
            this.manaBarSprite.zIndex = HeroGameLoopClient.zIndex.ground;
            this.scene.pixiRef.stage.addChild(this.manaBarSprite);
        }
        this.healthBarSprite.clear();
        this.manaBarSprite.clear()

        if (!this.isAlive()) return;
        if (this.currentAnimation === null) return;

        const healthRatio = this.health / this.maxHealth;
        const manaRatio = this.mana / this.maxMana;
        const lx = 40;
        this.healthBarSprite
            .moveTo(this.pos.x * this.scene.renderScale - (lx / 2), this.pos.y * this.scene.renderScale - this.currentAnimation.height / 2 - 8)
            .lineTo((this.pos.x * this.scene.renderScale - (lx / 2)) + (lx * healthRatio), this.pos.y * this.scene.renderScale  - this.currentAnimation.height / 2 - 8)
            .stroke({
                color: 0xFF0000,
                alpha: .3,
                width: 2
            })
        this.manaBarSprite
            .moveTo(this.pos.x * this.scene.renderScale - (lx / 2), this.pos.y * this.scene.renderScale - this.currentAnimation.height / 2 - 5)
            .lineTo((this.pos.x * this.scene.renderScale - (lx / 2)) + (lx * manaRatio), this.pos.y * this.scene.renderScale - this.currentAnimation.height / 2 - 5)
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