import {closestPointOnPolygon, Vector2D} from "./Utility";
import {ParticleSystem} from "./ParticleSystem";
import {ControllerMapping, Entity, Polygon, PolygonalCollider, Team} from "../types/types";
import {Particle} from "./Particle";
import {Castle} from "./Castle";
import HeroGameLoop from "./HeroGameLoop";
import {Keyboard} from "./Keyboard";
import { Graphics } from "pixi.js";

export class Player implements Entity, PolygonalCollider {
    set health(value: number) {
        this._health = value;
        if (!this.isAlive()) {
            let w: number;
            if (this.team.id === 0)
                w = 1;
            else
                w = 0;
            this.scene.onDeath(w.toString());
        }
    }

    get health(): number {
        return this._health;
    }

    get collider(): Polygon {
        return {
            verts: [
                new Vector2D(this.pos.x, this.pos.y),
                new Vector2D(this.pos.x, this.pos.y+40),
                new Vector2D(this.pos.x+40, this.pos.y+40),
                new Vector2D(this.pos.x+40, this.pos.y),
            ],
            attackable: true,
            isInside: false,
        };
    }

    public pos: Vector2D;
    public vel: Vector2D = Vector2D.zeros();
    public acc: Vector2D = Vector2D.zeros();
    public radius: number = 20;
    public mass: number = 50**3;
    public myPopUpIsOpen: boolean = false;
    public gold: number = 100;
    public givesIncome: number = 0;

    private playerSprite: Graphics | null = null;
    private attackSprite: Graphics | null = null;
    private healthSprite: Graphics | null = null;

    private maxAcc: number = 0.1;
    private maxVel: number = 1.0;
    private maxHealth: number = 1000;
    private _health: number = this.maxHealth;
    private particleSystem: ParticleSystem | undefined;
    private myDrones: Particle[] = [];
    private myCastles: Castle[] = [];

    private readonly keyBindings: ControllerMapping;

    constructor(
        public team: Team,
        private scene: HeroGameLoop,
    ) {
        this.pos = team.playerCentroid;
        this.keyBindings = team.controllerMapping;
        this.team.players.push(this);

        Keyboard.onPushSubscribe(
            this.keyBindings.buy,
            () => this.toggleCityPopup()
        );
        Keyboard.onPushSubscribe(
            this.keyBindings.special,
            () => this.health = 0
        )
    }

    gainCastleControl(castle: Castle) {
        this.myCastles.push(castle);
    }

    newDay() {
        this.gold += this.givesIncome;
        this.myCastles.forEach(castle => {
            this.gold += castle.givesIncome;
        })
        this.myDrones.forEach(drone => {
            this.gold += drone.givesIncome;
        })
    }

    toggleCityPopup() {
        if (!this.scene.setPlayerPopOpen) return;
        if (this.myPopUpIsOpen) {
            this.scene.setPlayerPopOpen(undefined);
            this.myPopUpIsOpen = false;
        } else {
            for (const castle of this.team.castles) {
                if (castle.nearbyPlayers.find(player => player === this)) {
                    this.scene.setPlayerPopOpen(
                        {
                            playerID: this.team.id,
                            point: castle.pos
                        });
                    this.myPopUpIsOpen = true;
                }
            }
        }
    }

    setParticleSystem(particleSystem: ParticleSystem): void {
        this.particleSystem = particleSystem;
    }

    findNearbyCastle(): Castle | undefined {
        for (const castle of this.team.castles) {
            if (castle.nearbyPlayers.find(player => player === this))
                return castle;
        }
        return undefined
    }

    buyDrone(): boolean {
        if (!this.particleSystem) return false;
        const castle = this.findNearbyCastle();
        if (castle === undefined) return false;
        if (this.gold >= Particle.price) {
            this.gold -= Particle.price;
            this.myDrones.push(
                this.particleSystem.getNewParticle(this, castle)
            );
            return true;
        }
        return false;
    }

    garrisonDrone(): boolean {
        const castle = this.findNearbyCastle();
        if (castle === undefined) return false;
        const p = this.myDrones.pop()
        if (p === undefined) return false;
        p.setLeaderPosition(castle.pos);
        castle.garrison.push(p);
        return true;
    }

    bringGarrisonDrone(): boolean {
        const castle = this.findNearbyCastle();
        if (castle === undefined) return false;
        const p = castle.garrison.pop()
        if (p === undefined) return false;
        p.setLeaderPosition(this.pos);
        this.myDrones.push(p);
        return true;
    }

    isAlive(): boolean {
        return this._health > 0;
    }

    getFiringPos(from: Vector2D): Vector2D {
        return closestPointOnPolygon(this.collider.verts, from);
    }

    render() {
        this.renderSelf();
        this.renderAttack();
        this.renderHealthBar();
    }

    renderSelf() {
        if (this.playerSprite === null) {
            this.playerSprite = new Graphics()
                .rect(0, 0, 40, 40)
                .fill({color: this.team.color, alpha: 1});
            this.scene.pixiRef.stage.addChild(this.playerSprite);
        }

        this.playerSprite.x = this.pos.x;
        this.playerSprite.y = this.pos.y;
    }

    renderAttack(): void {

    }

    renderHealthBar(): void {
        if (this.healthSprite === null) {
            this.healthSprite = new Graphics();
            this.scene.pixiRef.stage.addChild(this.healthSprite);
        }
        this.healthSprite.clear();
        if (!this.isAlive()) return;

        const healthRatio = this._health / this.maxHealth;
        this.healthSprite
            .moveTo(this.pos.x, this.pos.y - 5)
            .lineTo(this.pos.x + (40 * healthRatio), this.pos.y - 5)
            .stroke({
                color: this.team.color,
                alpha: .8,
                width: 2
            })
    }

    movement() {
        if (!this.keyBindings) return;

        this.acc = Vector2D.zeros();
        let controlling = false;

        if (Keyboard.state.get(this.keyBindings.left)) {
            this.acc.x -= this.maxAcc;
            controlling = true;
        }
        if (Keyboard.state.get(this.keyBindings.right)) {
            this.acc.x += this.maxAcc;
            controlling = true;
        }
        if (Keyboard.state.get(this.keyBindings.up)) {
            this.acc.y -= this.maxAcc;
            controlling = true;
        }
        if (Keyboard.state.get(this.keyBindings.down)) {
            this.acc.y += this.maxAcc;
            controlling = true;
        }

        if (controlling) {
            this.acc.limit(this.maxAcc);
            this.vel.add(this.acc);
            this.vel.limit(this.maxVel);
        } else {
            this.vel.scale(.9);
        }
        this.pos.add(this.vel);
    }

}