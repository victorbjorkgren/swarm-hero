import {
    AABBCollider,
    Character,
    CollisionResult,
    Controller,
    DirectionalSpriteSheet, EntityInterface, EntityLogic, EntityRenderer, EntityState,
    EntityTypes,
    Factions,
    Team
} from "../../types/types";
import {Game} from "../Game";
import {CastleInterface} from "./Castle";
import {checkAABBCollision, pol2cart, Vector2D} from "../Utility";
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
    GarrisonMessage, CastleID, ClientID, ServerMessageType, ParticleID, PlayerUpdateData
} from "@shared/commTypes";
import {renderArcaneWheel} from "../Graphics/ExplosionMarker";
import {Units} from "../../types/unitTypes";
import { v4 as uuidv4 } from 'uuid';
import {NetworkController} from "../Controllers/NetworkController";
import {LocalPlayerController} from "../Controllers/LocalPlayerController";
import {ParticleInterface} from "./Particle";
import {SpectatorController} from "../Controllers/SpectatorController";
import * as assert from "node:assert";

export class PlayerInterface extends EntityInterface {
    public state: PlayerState;
    protected logic: PlayerLogic;
    protected renderer: PlayerRenderer;

    public popUpCastle: CastleInterface | null = null;
    public controller: Controller;

    castingDoneCallback: (didCast: boolean) => void = () => {};

    constructor(
        id: ClientID,
        scene: Game,
    ) {
        super();

        this.state = new PlayerState(id, scene);
        this.logic = new PlayerLogic(this.state);
        this.renderer = new PlayerRenderer(this.state);

        if (scene.localId === id) {
            this.controller = new LocalPlayerController(this, player1Keys, scene);
        } else {
            this.controller = new NetworkController(this);
        }
    }

    update(delta: number) {
        this.controller.movement();
        this.logic.update(delta);
        this.renderer.update();
        this.playerLeavingCastleMenu()
    }

    updateFromHost(playerUpdate: PlayerUpdateData) {
        if (playerUpdate.pos !== null)
            this.state.pos = Vector2D.cast(playerUpdate.pos);
        if (playerUpdate.vel !== null)
            this.state.vel = Vector2D.cast(playerUpdate.vel);
        if (playerUpdate.acc !== null)
            this.state.acc = Vector2D.cast(playerUpdate.acc);

        if (playerUpdate.health !== null)
            this.state.health = playerUpdate.health;
        if (playerUpdate.mana !== null)
            this.state.mana = playerUpdate.mana;
        if (playerUpdate.gold !== null)
            this.state.gold = playerUpdate.gold;
    }

    receiveDamage(damage: number): void {
        this.state.health -= damage
        if (!this.state.isAlive()) {
            this.state.scene.broadcastDeath(this.state.id, EntityTypes.Player)
        }
    }

    getGold(gold: number) {
        if (gold < 0) throw new Error("Given gold must be positive");
        this.state.gold += gold;
    }

    payGold(gold: number) {
        if (gold < 0) throw new Error("Paid gold must be positive");
        this.state.gold -= gold;
    }

    getSpell(spell: SpellPack) {
        this.state.availableSpells.push(spell);
    }

    setAimPos(x: number, y: number) {
        this.state.aimPos.x = x;
        this.state.aimPos.y = y;
    }

    setLocal(character: Character) {
        this.state.isLocal = true;
        this.state.character = character;
    }

    newDay() {
        this.state.gold += this.state.givesIncome;
        this.state.mana = this.state.maxMana;
        this.state.myCastles.forEach(castleId => {
            const castle = this.state.scene.getEntityById(castleId, EntityTypes.Castle)
            this.state.gold += castle?.state.givesIncome || 0;
        })
        this.state.scene.particleSystem?.getParticles().ownerForEach(this.state.id, (drone) => {
            this.state.gold += drone.state.givesIncome;
        })
    }

    onDeath(): void {
        console.log('Player onDeath')
        this.controller.cleanup();
        this.controller = new SpectatorController();
        this.renderer.cleanUp();
        this.state.scene.onPlayerDeath(this);
    }

    findNearbyCastle(): CastleInterface | null {
        for (const castleId of this.state.myCastles) {
            const castle = this.state.scene.getEntityById(castleId, EntityTypes.Castle) as CastleInterface | undefined
            if (castle && castle.state.nearbyPlayers.find(playerId => playerId === this.state.id))
                return castle;
        }
        return null
    }

    gameInit(pos: Vector2D, team: Team, character: Character) {
        this.state.pos = pos;
        this.state.team = team;
        this.state.parseCharacter(character);
        this.renderer.parseCharacter(character);
    }

    broadcastSpellCast(position: Vector2D, spell: SpellPack, safeTeam: Team[] = []) {
        const castId = uuidv4();
        this.state.scene.observedSpellCasts.add(castId);
        const payload: SpellCastMessage = {
            instigator: this.state.id,
            position: position,
            spell: spell,
            castId: castId,
            safeTeam: safeTeam
        };
        this.state.scene.clients.forEach(client => {
            if (client.id === this.state.scene.localId) return;
            client.datachannel.send(JSON.stringify({
                type: ClientMessageType.RequestSpellCast,
                payload: payload}));
        })
    }

    requestGarrisonDrone(unit: Units, n: number, isBringing: boolean) {
        const castleId = this.popUpCastle?.state.id
        if (!castleId) return
        this.state.scene.sendToHost(
            ClientMessageType.RequestGarrison,
            {
                instigator: this.state.id,
                isBringing: isBringing,
                unit: unit,
                n: n,
                castle: castleId
            }
        )
    }

    gainCastleControl(castle: CastleInterface) {
        this.state.myCastles.push(castle.state.id);
        castle.state.owner = this.state.id;
    }

    attemptBuyDrone(unit: Units, n: number): boolean {
        // Host Check
        if (!this.state.scene.particleSystem) return false;
        if (this.popUpCastle === undefined || this.popUpCastle === null) return false;
        if (!this.popUpCastle.state.isAlive()) return false;
        if (this.state.gold < (UnitPacks[unit].buyCost * n)) return false

        this.state.scene.sendToHost(
            ClientMessageType.RequestBuyDrone,
            {
                buyer: this.state.id,
                unit: unit,
                n: n,
                castle: this.popUpCastle.state.id
            }
        )

        return true;

        // this.gold -= UnitPacks[unit].buyCost * n;
        //
        // this.broadcastBuyDrone(unit, n, this.popUpCastle.id);
        // return true;
    }

    attemptBuySpell(spell: SpellPack) {
        // Host Check
        if (this.popUpCastle === undefined || this.popUpCastle === null) return false;
        if (!this.popUpCastle.state.isAlive()) return false;
        if (this.state.gold < spell.buyCost) return false
        const spellIndex = this.popUpCastle.state.availableSpells.indexOf(spell);
        if (spellIndex === -1) return false;

        this.state.scene.sendToHost(
            ClientMessageType.RequestBuySpell,
            {
                buyer: this.state.id,
                spell: spell,
                castle: this.popUpCastle.state.id
            }
        )
        return true;
    }

    garrisonDrones(droneType: Units, n: number): boolean {
        const castle = this.popUpCastle;
        if (castle === null) return false;
        if (!castle.state.isAlive()) return false;
        if (castle.state.owner !== this.state.id) return false;

        const uMgr = this.state.scene.particleSystem.getParticles()
        if (uMgr === undefined) return false;

        const droneSet = uMgr.getUnits(this.state.id, droneType)
        if (droneSet === null) return false;
        if (droneSet.size < n) return false;

        let movedDrones = 0;
        for (const drone of droneSet) {
            uMgr.switchOwner(drone, castle.state.id)
            drone.setLeader(castle.state);
            if (++movedDrones >= n) break;
        }
        return true;
    }

    bringGarrisonDrone(droneType: Units, n: number): boolean {
        const castle = this.popUpCastle;
        if (castle === null) return false;

        const uMgr = this.state.scene.particleSystem.getParticles()
        if (uMgr === undefined) return false;

        const droneSet = uMgr.getUnits(castle.state.id, droneType)
        if (droneSet === null) return false;
        if (droneSet.size < n) return false;

        let movedDrones = 0;
        for (const drone of droneSet) {
            uMgr.switchOwner(drone, this.state.id)
            drone.setLeader(this.state);
            if (++movedDrones >= n) break;
        }
        return true;
    }

    attemptSpellCast(): void {
        // Direct Peer
        if (!this.state.isCasting) return
        if (this.state.activeSpell === null) return
        if (this.renderer.spellCursorSprite === null) return

        const success = this.castSpell(this.state.aimPos, this.state.activeSpell);

        if (success) {
            this.broadcastSpellCast(this.state.aimPos, this.state.activeSpell);
            this.state.isCasting = false;
            this.state.activeSpell = null;
        } else {
            this.cancelSpell()
        }
    }

    closeCityPopUp(): void {
        this.state.scene.setPlayerPopOpen(undefined);
        this.popUpCastle = null;
    }

    playerLeavingCastleMenu() {
        if (this.popUpCastle === null) return;
        if (!this.popUpCastle.state.nearbyPlayers.includes(this.state.id)) {
            this.closeCityPopUp();
        }
    }

    toggleCityPopup() {
        if (!this.state.scene.setPlayerPopOpen) return;
        if (this.popUpCastle !== null) return this.closeCityPopUp();

        for (const castleId of this.state.team!.castleIds) {
            const castle = this.state.scene.castles.get(castleId);
            if (castle === undefined) return;
            if (castle.state.nearbyPlayers.includes(this.state.id)) {
                this.state.scene.setPlayerPopOpen(
                    {
                        playerID: this.state.team!.id,
                        castle: castle
                    });
                this.popUpCastle = castle;
            }
        }
    }

    prepareSpell(spell: SpellPack, castingDoneCallback: (didCast: boolean) => void) {
        if (spell.castCost > this.state.mana) return;
        if (this.state.activeSpell === spell) return this.cancelSpell();
        this.state.isCasting = true;
        this.state.activeSpell = spell;
        this.castingDoneCallback = castingDoneCallback;
    }

    castSpell(castPos: Vector2D, spell: SpellPack): boolean {
        if (!this.state.availableSpells.some(spellPack => JSON.stringify(spellPack) === JSON.stringify(spell))) return false;
        if (spell.castCost > this.state.mana) return false;
        if (Vector2D.sqDist(castPos, this.state.pos) > spell.castRange * spell.castRange) return false;
        this.state.mana -= spell.castCost;
        const sqEffectRange = spell.effectRange * spell.effectRange;
        this.state.scene.areaDamage(castPos, sqEffectRange, spell.effectAmount * this.state.powerMultiplier);
        this.renderer.renderExplosion(castPos, spell.effectRange);

        this.castingDoneCallback(true);
        this.castingDoneCallback = ()=>{};
        return true;
    }

    cancelSpell() {
        this.castingDoneCallback(false);
        this.castingDoneCallback = () => {
        };
        this.state.isCasting = false;
        this.state.activeSpell = null;
    }
}

class PlayerState implements EntityState {
    public pos: Vector2D = Vector2D.zeros();
    public vel: Vector2D = Vector2D.zeros();
    public acc: Vector2D = Vector2D.zeros();
    public targetedBy: ParticleID[] = [];
    public availableSpells: SpellPack[] = [];

    public team: Team | null = null;
    myCastles: CastleID[] = [];
    public entityType: EntityTypes = EntityTypes.Player;

    public maxVel: number = 1.0;
    public maxAcc: number = gameConfig.playerMaxAcc;
    public gold: number = gameConfig.playerStartGold;
    public givesIncome: number = gameConfig.playerSelfIncome;

    public name: string = ""
    maxHealth: number = 0;
    powerMultiplier: number = 0;
    maxMana: number = 0;
    protected faction: Factions = Factions.Wild;

    public mana: number = this.maxMana;
    public health: number = this.maxHealth;

    isCasting: boolean = false;
    public currentSpellRangeSpell: SpellPack | null = null;
    activeSpell: SpellPack | null = null;
    public aimPos: Vector2D = Vector2D.zeros();

    public character: Character | null = null;
    public isLocal: boolean = false;

    public radius: number = 20; // for collider - unused
    public mass: number = 50**3; // for collision - unused

    constructor(
        public id: ClientID,
        public scene: Game,
    ) {
    }

    isAlive(): boolean {
        return this.health > 0;
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
    }

}

class PlayerLogic extends EntityLogic {

    constructor(protected state: PlayerState) {super();}

    update(delta: number) {
        this.updateMovement(delta);
    }

    checkAABBCollisions(): CollisionResult {
        const myCollider = this.state.collider;
        for (const collider of this.state.scene.colliders) {
            const collisionTest = checkAABBCollision(myCollider, collider);
            if (collisionTest.collides) return collisionTest;
        }
        return {collides: false};
    }

    handleAABBCollision(collisionTest: CollisionResult) {
        if (collisionTest.collides) {
            const normal = collisionTest.normal1!;
            if (normal.x > 0 && this.state.vel.x > 0) this.state.vel.x = 0;
            else if (normal.x < 0 && this.state.vel.x < 0) this.state.vel.x = 0;
            if (normal.y > 0 && this.state.vel.y > 0) this.state.vel.y = 0;
            else if (normal.y < 0 && this.state.vel.y < 0) this.state.vel.y = 0;
        }
    }

    gridCollision() {
        const scene = this.state.scene;
        const grid = scene.level.groundNavMesh;
        const navScale = scene.level.navScale;
        const pos = this.state.pos;
        const vel = this.state.vel;

        const nextX = Math.floor((pos.x + vel.x) / navScale);
        const nextY = Math.floor((pos.y + vel.y) / navScale);

        if (grid[nextY][nextX] > 0) return;

        const currX = Math.floor(pos.x / navScale);
        const currY = Math.floor(pos.y / navScale);

        // Inline collision checks for both x and y axes
        const xCol = grid[currY][nextX] === 0;
        const yCol = grid[nextY][currX] === 0;

        if (xCol && ((nextX > currX && vel.x > 0) || (nextX < currX && vel.x < 0))) {
            vel.x = 0;
        }
        if (yCol && ((nextY > currY && vel.y > 0) || (nextY < currY && vel.y < 0))) {
            vel.y = 0;
        }
    }

    updateMovement(deltaScale: number) {
        const acc = this.state.acc;
        const vel = this.state.vel;
        const pos = this.state.pos;

        acc.isZero()
        && acc.add(vel.copy().scale(-.08));

        vel.add(acc.copy().scale(deltaScale));
        vel.limit(this.state.maxVel);

        this.gridCollision();

        vel.sqMagnitude() < gameConfig.sqPlayerVelCutoff
        && vel.scale(0);

        pos.add(vel.copy().scale(deltaScale));
    }
}

class PlayerRenderer extends EntityRenderer {
    private playerSpritePack: DirectionalSpriteSheet | null = null;
    private currentAnimation: AnimatedSprite | null = null;
    private healthBarSprite: Graphics | null = null;
    private manaBarSprite: Graphics | null = null;
    private rangeSprite: Graphics | null = null;
    spellCursorSprite: Container | null = null;
    private nameSprite: Text | null = null;

    constructor(protected state: PlayerState) {super();}

    update() {
        this.renderSelf();
        this.renderAttack();
        this.renderHUD();
    }

    cleanUp() {
        if (this.playerSpritePack) {
            Object.keys(this.playerSpritePack).forEach(key => {
                const animation = this.playerSpritePack![key as keyof DirectionalSpriteSheet];
                this.state.scene.pixiRef.stage.removeChild(animation);
                animation.destroy();
            });
            this.playerSpritePack = null;
        }
        if (this.currentAnimation) {
            this.state.scene.pixiRef.stage.removeChild(this.currentAnimation)
            this.currentAnimation.destroy();
            this.currentAnimation = null;
        }
        if (this.healthBarSprite) {
            this.state.scene.pixiRef.stage.removeChild(this.healthBarSprite)
            this.healthBarSprite.destroy();
            this.healthBarSprite = null;
        }
        if (this.manaBarSprite) {
            this.state.scene.pixiRef.stage.removeChild(this.manaBarSprite)
            this.manaBarSprite.destroy();
            this.manaBarSprite = null;
        }
        if (this.rangeSprite) {
            this.state.scene.pixiRef.stage.removeChild(this.rangeSprite)
            this.rangeSprite.destroy();
            this.rangeSprite = null;
        }
        if (this.spellCursorSprite) {
            this.state.scene.pixiRef.stage.removeChild(this.spellCursorSprite)
            this.spellCursorSprite.destroy();
            this.spellCursorSprite = null;
        }
        if (this.nameSprite) {
            this.state.scene.pixiRef.stage.removeChild(this.nameSprite)
            this.nameSprite.destroy();
            this.nameSprite = null;
        }
    }

    private determineDirectionFromAngle(): string {
        const {x, y} = this.state.vel;

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

    parseCharacter(character: Character) {
        if (character.faction === Factions.Wild) {
            this.getCat().catch(e => console.error(e));
        } else {
            throw new Error(`Faction not implemented in PlayerRenderer`);
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
                animation.zIndex = Game.zIndex.ground;
                this.state.scene.pixiRef.stage.addChild(animation);
            }
        });
    }

    protected renderSelf() {
        this.setAnimation();
        if (this.currentAnimation !== null) {
            this.currentAnimation.x = this.state.pos.x * this.state.scene.renderScale;
            this.currentAnimation.y = this.state.pos.y * this.state.scene.renderScale;
            this.currentAnimation.animationSpeed = (this.state.vel.magnitude() / this.state.maxVel) / 7 ;
            this.currentAnimation.scale = this.state.scene.renderScale;
        }
    }

    protected renderAttack(): void {

    }

    private renderHUD(): void {
        this.renderStatsBar();
        if (this.state.isLocal) {
            this.renderSpellRange();
            this.renderCursor();
        } else {
            this.renderName();
        }
    }

    private renderCursor() {
        if (this.spellCursorSprite === null) {
            this.spellCursorSprite = renderArcaneWheel(this.state.scene.pixiRef);
        }
        // const cursor = new Vector2D(this.spellCursorSprite.position.x, this.spellCursorSprite.position.y)
        if (this.state.activeSpell !== null && (Vector2D.sqDist(this.state.aimPos, this.state.pos) < (this.state.activeSpell.castRange ** 2))) {
            this.spellCursorSprite.visible = true;
            this.spellCursorSprite.position.x = this.state.aimPos.x * this.state.scene.renderScale;
            this.spellCursorSprite.position.y = this.state.aimPos.y * this.state.scene.renderScale;
            this.spellCursorSprite.scale.set(this.state.scene.renderScale);
            this.state.scene.pixiRef.stage.cursor = "none";
        } else {
            this.spellCursorSprite.visible = false;
            this.state.scene.pixiRef.stage.cursor = "auto";
        }
    }

    private renderName() {
        if (this.nameSprite === null) {
            this.nameSprite = new Text(this.state.name, {
                fill: {color: this.state.team!.color, alpha: 0.7},
                fontSize: 13,
                letterSpacing: -0.6
            });
            this.nameSprite.zIndex = Game.zIndex.ground;
            this.state.scene.pixiRef.stage.addChild(this.nameSprite);
        }
        this.nameSprite.position.set(this.state.pos.x * this.state.scene.renderScale, this.state.pos.y * this.state.scene.renderScale + 25);
    }

    protected renderStatsBar(): void {
        if (this.healthBarSprite === null) {
            this.healthBarSprite = new Graphics();
            this.healthBarSprite.zIndex = Game.zIndex.ground;
            this.state.scene.pixiRef.stage.addChild(this.healthBarSprite);
        }
        if (this.manaBarSprite === null) {
            this.manaBarSprite = new Graphics();
            this.manaBarSprite.zIndex = Game.zIndex.ground;
            this.state.scene.pixiRef.stage.addChild(this.manaBarSprite);
        }
        this.healthBarSprite.clear();
        this.manaBarSprite.clear()

        if (!this.state.isAlive()) return;
        if (this.currentAnimation === null) return;

        const healthRatio = this.state.health / this.state.maxHealth;
        const manaRatio = this.state.mana / this.state.maxMana;
        const lx = 40;
        this.healthBarSprite
            .moveTo(this.state.pos.x * this.state.scene.renderScale - (lx / 2), this.state.pos.y * this.state.scene.renderScale - this.currentAnimation.height / 2 - 8)
            .lineTo((this.state.pos.x * this.state.scene.renderScale - (lx / 2)) + (lx * healthRatio), this.state.pos.y * this.state.scene.renderScale  - this.currentAnimation.height / 2 - 8)
            .stroke({
                color: 0xFF0000,
                alpha: .3,
                width: 2
            })
        this.manaBarSprite
            .moveTo(this.state.pos.x * this.state.scene.renderScale - (lx / 2), this.state.pos.y * this.state.scene.renderScale - this.currentAnimation.height / 2 - 5)
            .lineTo((this.state.pos.x * this.state.scene.renderScale - (lx / 2)) + (lx * manaRatio), this.state.pos.y * this.state.scene.renderScale - this.currentAnimation.height / 2 - 5)
            .stroke({
                color: 0x0000FF,
                alpha: .3,
                width: 2
            })
    }

    private renderSpellRange(): void {
        if (this.rangeSprite === null) {
            this.rangeSprite = new Graphics();
            this.rangeSprite.zIndex = Game.zIndex.hud;
            this.state.scene.pixiRef.stage.addChild(this.rangeSprite);
        }
        if (!this.state.isCasting || this.state.activeSpell === null) {
            this.rangeSprite.visible = false;
            return
        }
        this.rangeSprite.visible = true;

        const nDashes = 10;
        const gapSizeRatio = .5;
        const dashLength = 2 * Math.PI / ((1 + gapSizeRatio) * nDashes);

        if (this.state.currentSpellRangeSpell?.castRange !== this.state.activeSpell.castRange) {
            this.state.currentSpellRangeSpell = this.state.activeSpell;
            for (let i = 0; i < nDashes; i++) {
                const startAngle = i * (1 + gapSizeRatio) * dashLength;
                const startPos = pol2cart(this.state.activeSpell.castRange, startAngle);
                this.rangeSprite.moveTo(startPos.x, startPos.y);
                this.rangeSprite.arc(0, 0, this.state.activeSpell.castRange, startAngle, startAngle + dashLength);
            }
            this.rangeSprite.stroke({color: 0xffffff, alpha: 0.1, width: 5});
        }

        this.rangeSprite.x = this.state.pos.x * this.state.scene.renderScale;
        this.rangeSprite.y = this.state.pos.y * this.state.scene.renderScale;
        this.rangeSprite.scale.set(this.state.scene.renderScale);
        this.rangeSprite.rotation += .004;
    }

    public renderExplosion(position: Vector2D, radius: number) {
        if (this.state.scene.explosionSprite === null) return
        const explosion = new AnimatedSprite(this.state.scene.explosionSprite);
        explosion.zIndex = Game.zIndex.hud;
        explosion.loop = false;
        explosion.animationSpeed = .5;
        explosion.anchor.set(0.5);
        explosion.scale = this.state.scene.renderScale * .15 * radius / 100;
        explosion.x = position.x * this.state.scene.renderScale;
        explosion.y = position.y * this.state.scene.renderScale;
        explosion.visible = true;
        this.state.scene.pixiRef.stage.addChild(explosion);
        explosion.gotoAndPlay(0);
        explosion.onComplete = () => {
            this.state.scene.pixiRef.stage.removeChild(explosion);
            explosion.destroy();
        }
    }
}