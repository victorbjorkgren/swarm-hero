import {checkAABBCollision, pol2cart, spriteToAABBCollider, Vector2D} from "./Utility";
import {ParticleSystem} from "./ParticleSystem";
import {AABBCollider, CollisionResult, DirectionalSpriteSheet, Entity, Team} from "../types/types";
import {Castle} from "./Castle";
import HeroGameLoop from "./HeroGameLoop";
import {AnimatedSprite, Assets, Container, Graphics, Spritesheet, Text} from "pixi.js";
import {renderArcaneWheel} from "./Graphics/ExplosionMarker";
import {SpellPack} from "../types/spellTypes";
import {Units} from "../types/unitTypes";
import {Character} from "../UI-Comps/CharacterCreation/MainCharacterCreation";
import {
    healthConversion,
    manaConversion,
    powerConversion,
    speedConversion
} from "../UI-Comps/CharacterCreation/StatConversion";
import {Factions} from "../UI-Comps/CharacterCreation/FactionSelection";
import {gameConfig, UnitPacks} from "../config";

export class Player implements Entity {
    public availableSpells: SpellPack[] = [];
    public isLocal: boolean = false;

    public pos: Vector2D;
    public vel: Vector2D = Vector2D.zeros();
    public acc: Vector2D = Vector2D.zeros();
    public aimPos: Vector2D = Vector2D.zeros();
    public radius: number = 20; // for collider - unused
    public mass: number = 50**3; // for collision - unused
    public popUpCastle: Castle | null = null;
    public maxAcc: number = gameConfig.playerMaxAcc;
    public maxVel: number = 1.0;
    public gold: number = gameConfig.playerStartGold;
    public givesIncome: number = gameConfig.playerSelfIncome;

    public name: string = "Unnamed Player"
    private maxHealth: number = 0;
    private powerMultiplier: number = 0;
    private maxMana: number = 0;
    private faction: Factions = Factions.Wild;

    private playerSpritePack: DirectionalSpriteSheet | null = null;
    private currentAnimation: AnimatedSprite | null = null;
    private healthSprite: Graphics | null = null;
    private manaSprite: Graphics | null = null;
    private rangeSprite: Graphics | null = null;
    private spellCursorSprite: Container | null = null;
    private nameSprite: Text | null = null;

    private isCasting: boolean = false;
    private currentSpellRangeSpell: SpellPack | null = null;

    private _health: number = this.maxHealth;
    public mana: number = this.maxMana;

    particleSystem: ParticleSystem | undefined;

    public myCastles: Castle[] = [];
    public targetedBy: Entity[] = [];

    private activeSpell: SpellPack | null = null;
    private castingDoneCallback: (didCast: boolean) => void = () => {};


    constructor(
        public team: Team,
        private scene: HeroGameLoop,
        character: Character
    ) {
        this.pos = team.playerCentroid;
        this.team.players.push(this);
        this.parseCharacter(character)
    }

    parseCharacter(character: Character) {
        this.name = character.playerName;

        this.maxHealth = healthConversion(character.stats.health);
        this.maxVel *= speedConversion(character.stats.speed);
        this.maxAcc *= speedConversion(character.stats.speed);
        this.powerMultiplier = powerConversion(character.stats.magicPower);
        this.maxMana = manaConversion(character.stats.magicStamina);

        this.faction = character.faction;

        this._health = this.maxHealth;
        this.mana = this.maxMana;
        if (this.faction === Factions.Wild) {
            this.getCat().catch(e => console.error(e));
        } else {
            throw new Error(`Faction not implemented`);
        }
    }

    set health(value: number) {
        this._health = value;
        if (!this.isAlive()) {
            this.onDeath()
        }
    }
    get health(): number {
        return this._health;
    }
    get collider(): AABBCollider {
        if (this.currentAnimation !== null) {
            return spriteToAABBCollider(this.currentAnimation);
        } else {
            return {
                minX: this.pos.x,
                maxX: this.pos.x + 20,
                minY: this.pos.y,
                maxY: this.pos.y + 20,
                inverted: false
            };
        }
    }

    onDeath(): void {
        let w: string;
        if (this.team.id === 0)
            w = this.scene.teams[1].name;
        else
            w = this.scene.teams[0].name;
        this.scene.onDeath(w.toString());
    }

    gainCastleControl(castle: Castle) {
        this.myCastles.push(castle);
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

    receiveDamage(damage: number) {
        this._health -= damage;
        if (this._health < 0) {
            this.onDeath();
        }
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

        for (const castle of this.team.castles) {
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

    setParticleSystem(particleSystem: ParticleSystem): void {
        this.particleSystem = particleSystem;
    }

    findNearbyCastle(): Castle | null {
        for (const castle of this.team.castles) {
            if (castle.nearbyPlayers.find(player => player === this))
                return castle;
        }
        return null
    }

    buyDrone(unit: Units, n: number): boolean {
        if (!this.particleSystem) return false;
        const castle = this.popUpCastle;
        if (castle === undefined || castle === null) return false;
        if (!castle.isAlive()) return false;
        if (this.gold < (UnitPacks[unit].buyCost * n)) return false

        this.gold -= UnitPacks[unit].buyCost * n;

        for (let i=0; i < n; i++) {
            this.particleSystem.getNewParticle(this, castle, 0, UnitPacks[unit], this)
        }
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

    isAlive(): boolean {
        return this._health > 0;
    }

    checkCollisions(): CollisionResult {
        const myCollider = this.collider;
        for (const collider of this.scene.colliders) {
            const collisionTest = checkAABBCollision(myCollider, collider);
            if (collisionTest.collides) return collisionTest;
        }
        return { collides: false };
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

    getFiringPos(from: Vector2D): Vector2D {
        if (this.currentAnimation !== null) {
            return new Vector2D(
                this.pos.x,
                this.pos.y,
            )
        } else {
            return this.pos.copy();
        }
        // return closestPointOnPolygon(this.collider.verts, from);
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
                animation.zIndex = HeroGameLoop.zIndex.ground;
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

    prepareSpell(spell: SpellPack, castingDoneCallback: (didCast: boolean) => void) {
        if (spell.castCost > this.mana) return;
        if (this.activeSpell === spell) return this.cancelSpell();
        this.isCasting = true;
        this.activeSpell = spell;
        this.castingDoneCallback = castingDoneCallback;
    }

    castSpell() {
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

    cancelSpell() {
        this.castingDoneCallback(false);
        this.castingDoneCallback = ()=>{};
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
                fill: {color: this.team.color, alpha: 0.7},
                fontSize: 13,
                letterSpacing: -0.6
            });
            this.nameSprite.zIndex = HeroGameLoop.zIndex.ground;
            this.scene.pixiRef.stage.addChild(this.nameSprite);
        }
        this.nameSprite.position.set(this.pos.x * this.scene.renderScale, this.pos.y * this.scene.renderScale + 25);
    }

    renderStatsBar(): void {
        if (this.healthSprite === null) {
            this.healthSprite = new Graphics();
            this.healthSprite.zIndex = HeroGameLoop.zIndex.ground;
            this.scene.pixiRef.stage.addChild(this.healthSprite);
        }
        if (this.manaSprite === null) {
            this.manaSprite = new Graphics();
            this.manaSprite.zIndex = HeroGameLoop.zIndex.ground;
            this.scene.pixiRef.stage.addChild(this.manaSprite);
        }
        this.healthSprite.clear();
        this.manaSprite.clear()

        if (!this.isAlive()) return;
        if (this.currentAnimation === null) return;

        const healthRatio = this._health / this.maxHealth;
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
            this.rangeSprite.zIndex = HeroGameLoop.zIndex.hud;
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
}