import {AnimatedSprite} from "pixi.js";
import {Game} from "../GameComps/Game";
import {EntityID, ParticleID} from "@shared/commTypes";
import {Vector2D} from "../GameComps/Utility";
import {Team} from "./types";

export enum EntityTypes {
    Player,
    Castle,
    Particle,
    Null,
    Any,
}

export abstract class EntityInterface {
    public abstract state: EntityState;
    protected abstract renderer: EntityRenderer;
    protected abstract logic: EntityLogic;

    public abstract update(delta: number): void;

    public abstract receiveDamage(damage: number): void;

    public abstract onDeath(): void;

    public snapMove(delta: Vector2D): void {
        this.state.pos.add(delta);
    }

    buffSpeed(multiplier: number, duration: number): void {
        const buff = this.state.maxVel * multiplier;
        this.state.maxVel += buff;
        this.renderer.playSpeedBuffAnimation(multiplier > 0);
        setTimeout(() => {
            this.state.maxVel += buff;
            this.renderer.stopSpeedBuffAnimation()
        }, duration * 1000);
    }
}

export abstract class EntityState {
    abstract id: EntityID;
    abstract pos: Vector2D;
    abstract vel: Vector2D;
    abstract radius: number;
    abstract mass: number;
    abstract health: number;
    abstract givesIncome: number;
    abstract team: Team | null;
    abstract maxVel: number;

    abstract scene: Game;

    abstract entityType: EntityTypes;

    abstract targetedBy: ParticleID[];
    abstract attackable: boolean;

    abstract isAlive(): boolean;

    abstract getFiringPos(from: Vector2D): Vector2D;
}

export abstract class EntityLogic {
    protected abstract state: EntityState;

    public abstract update(deltaScale: number): void;
}

export abstract class EntityRenderer {
    protected abstract state: EntityState;

    protected speedUpBuffAnimation: AnimatedSprite | null = null;
    protected speedDownBuffAnimation: AnimatedSprite | null = null;

    protected abstract renderSelf(): void;

    protected abstract renderAttack(): void;

    protected abstract renderStatsBar(): void;

    public abstract update(): void;

    public abstract cleanUp(): void;

    public playSpeedBuffAnimation(isUp: boolean): void {
        if (!this.speedUpBuffAnimation || !this.speedDownBuffAnimation) return
        const animToPlay = isUp ? this.speedUpBuffAnimation : this.speedDownBuffAnimation;
        animToPlay.visible = true;
        animToPlay.gotoAndPlay(0);
    }

    protected updateAnimationSprites() {
        if (!this.speedUpBuffAnimation) {
            console.log('greenSprite', this.state.scene.greenIdleSprite);
            if (this.state.scene.greenIdleSprite === null) return
            this.speedUpBuffAnimation = new AnimatedSprite(this.state.scene.greenIdleSprite);
            this.speedUpBuffAnimation.zIndex = Game.zIndex.ground;
            this.speedUpBuffAnimation.loop = true;
            this.speedUpBuffAnimation.animationSpeed = 1;
            this.speedUpBuffAnimation.anchor.set(0.5);
            this.speedUpBuffAnimation.visible = false;
            this.state.scene.pixiRef.stage.addChild(this.speedUpBuffAnimation);
        }
        if (!this.speedDownBuffAnimation) {
            if (this.state.scene.blueIdleSprite === null) return
            this.speedDownBuffAnimation = new AnimatedSprite(this.state.scene.blueIdleSprite);
            this.speedDownBuffAnimation.zIndex = Game.zIndex.ground;
            this.speedDownBuffAnimation.loop = true;
            this.speedDownBuffAnimation.animationSpeed = 1;
            this.speedDownBuffAnimation.anchor.set(0.5);
            this.speedDownBuffAnimation.visible = false;
            this.state.scene.pixiRef.stage.addChild(this.speedDownBuffAnimation);
        }

        this.speedDownBuffAnimation.scale = this.state.scene.renderScale * this.state.radius / 100;
        this.speedDownBuffAnimation.x = this.state.pos.x * this.state.scene.renderScale;
        this.speedDownBuffAnimation.y = this.state.pos.y * this.state.scene.renderScale;

        this.speedUpBuffAnimation.scale = this.state.scene.renderScale * this.state.radius / 100;
        this.speedUpBuffAnimation.x = this.state.pos.x * this.state.scene.renderScale;
        this.speedUpBuffAnimation.y = this.state.pos.y * this.state.scene.renderScale;
    }

    public stopSpeedBuffAnimation() {
        if (!this.speedUpBuffAnimation) return;
        if (!this.speedDownBuffAnimation) return;
        this.speedUpBuffAnimation.visible = false;
        this.speedDownBuffAnimation.visible = false;
        this.speedUpBuffAnimation.stop();
        this.speedDownBuffAnimation.stop();
    }
}