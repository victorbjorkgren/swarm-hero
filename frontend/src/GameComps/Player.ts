import {closestPointOnPolygon, Vector2D} from "./Utility";
import {ParticleSystem} from "./ParticleSystem";
import {ControllerMapping, Entity, Polygon, PolygonalCollider, Team} from "../types/types";
import {Particle} from "./Particle";
import {Castle} from "./Castle";
import {HeroScene} from "./HeroScene";

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
                new Vector2D(this.pos.x-20, this.pos.y-20),
                new Vector2D(this.pos.x-20, this.pos.y+20),
                new Vector2D(this.pos.x+20, this.pos.y+20),
                new Vector2D(this.pos.x+20, this.pos.y-20),
            ],
            attackable: true,
            isInside: false,
        };
    }

    public pos: Vector2D;
    public vel: Vector2D = Vector2D.zeros();
    public acc: Vector2D = Vector2D.zeros();
    private maxAcc: number = 0.1;
    private maxVel: number = 1.0;
    public radius: number = 20;
    public mass: number = 50**3;
    private readonly keyBindings: ControllerMapping | undefined;
    private _health: number = 1000;
    private particleSystem: ParticleSystem | undefined;
    public myPopUpIsOpen: boolean = false;
    private myDrones: Particle[] = [];

    constructor(
        public team: Team,
        private scene: HeroScene,
    ) {
        this.pos = team.playerCentroid;
        this.keyBindings = team.controllerMapping;
        this.team.players.push(this);

        this.keyBindings.buy.on('down', () => this.toggleCityPopup())
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

    buyDrone(): void {
        if (!this.particleSystem) return
        const castle = this.findNearbyCastle();
        if (castle === undefined) return
        this.myDrones.push(
            this.particleSystem.getNewParticle(this, castle)
        );
    }

    garrisonDrone(): void {
        const castle = this.findNearbyCastle();
        if (castle === undefined) return
        const p = this.myDrones.pop()
        if (p === undefined) return
        p.setLeaderPosition(castle.pos);
        castle.garrison.push(p);
    }

    bringGarrisonDrone(): void {
        const castle = this.findNearbyCastle();
        if (castle === undefined) return
        const p = castle.garrison.pop()
        if (p === undefined) return
        p.setLeaderPosition(this.pos);
        this.myDrones.push(p);
    }

    isAlive(): boolean {
        return this._health > 0;
    }

    getFiringPos(from: Vector2D): Vector2D {
        return closestPointOnPolygon(this.collider.verts, from);
    }

    render() {
        const graphics = (this.scene as any).graphics;

        if (graphics) {
            graphics.fillStyle(this.team.color, 1);
            graphics.fillRect(
                this.pos.x-20,
                this.pos.y-20,
                40, 40
            );
            // graphics.fillStyle(0x0000ff, 1);
            // for (const v of this.collider.verts) {
            //     graphics.fillCircle(v.x, v.y, 2);
            // }
        }
        else {
            console.log('Player has no scene graphics!')
        }
    }

    movement() {
        if (!this.keyBindings) return;
        let controlling = false;
        this.acc = Vector2D.zeros();
        if (this.keyBindings.left.isDown) {
            this.acc.x -= this.maxAcc;
            controlling = true;
        }
        if (this.keyBindings.right.isDown) {
            this.acc.x += this.maxAcc;
            controlling = true;
        }
        if (this.keyBindings.up.isDown) {
            this.acc.y -= this.maxAcc;
            controlling = true;
        }
        if (this.keyBindings.down.isDown) {
            this.acc.y += this.maxAcc;
            controlling = true;
        }
        if (!controlling) {
            this.vel.scale(.9);
        } else {
            this.acc.limit(this.maxAcc);
            this.vel.add(this.acc);
            this.vel.limit(this.maxVel);
        }
        this.pos.add(this.vel);
    }

}