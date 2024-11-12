import Papa from 'papaparse';

import ruins2v2 from './ruins2v2/data.json';
import {Application, Assets, Sprite, Texture} from "pixi.js";
import {Vector2D} from "../Utility";

type levelData = typeof ruins2v2;

export enum Levels {
    Ruins2v2,
}

export const LevelData = {
    [Levels.Ruins2v2]: ruins2v2
}

export const levelDir = {
    [Levels.Ruins2v2]: "/levels/ruins2v2",
}

export type NeutralSwarm = {
    position: Vector2D,
    wayPoints: Vector2D[],
    n: number
}

export const loadCSVAsIntArray = async (filePath: string): Promise<number[][]> => {
    const response = await fetch(filePath);
    const csvText = await response.text();

    return new Promise((resolve, reject) => {
        Papa.parse<string[]>(csvText, {
            complete: (result: Papa.ParseResult<string[]>) => {
                // Map each row to an array of integers
                const data = result.data.map((row: string[]) => row.map((value) => parseInt(value, 10)));
                resolve(data);
            },
            error: (error: any) => reject(error),
            skipEmptyLines: true,
        });
    });
}

export class Level {
    private data: levelData;

    public readonly mapOffset: Vector2D;
    public readonly mapWidth: number;
    public readonly mapHeight: number;

    public playerStart: Vector2D[];
    public neutralSwarms: NeutralSwarm[];

    public groundNavMesh: number[][] = [[]];
    public navScale: number = 1

    public groundSprite: Sprite | null = null;
    public nonColSprite: Sprite | null = null;

    constructor(
        private level: Levels,
        private pixi: Application
    ) {
        this.data = LevelData[level];
        this.mapOffset = Vector2D.cast(this.data)

        this.mapWidth = this.data.width;
        this.mapHeight = this.data.height;

        this.playerStart = this.data.entities.Castle.map(
            (castleData) =>
                Vector2D.cast(castleData)
        );
        const neutralStaticSwarms: NeutralSwarm[] = this.data.entities.NeutralStaticSwarm.map((swarm) => {
            return {
                position: Vector2D.cast(swarm),
                n: swarm.customFields.NParticles,
                wayPoints: []
            };
        })
        const neutralRovingSwarms: NeutralSwarm[] = this.data.entities.NeutralRovingSwarm.map((swarm) => {
            return {
                position: Vector2D.cast(swarm),
                n: swarm.customFields.NParticles,
                wayPoints: swarm.customFields.WayPoints.map(p => new Vector2D(p.cx * swarm.width * 2, p.cy * swarm.height * 2)),
            }
        })

        this.neutralSwarms = neutralStaticSwarms.concat(neutralRovingSwarms);
    }

    async load() {
        let groundNavPromise;
        let groundTexPromise;
        let nonColTexPromise;
        if (this.level === Levels.Ruins2v2) {
            groundNavPromise = loadCSVAsIntArray(levelDir[this.level] + "/Ground.csv");
            groundTexPromise = Assets.load(levelDir[this.level] + "/Ground.png");
            nonColTexPromise = Assets.load(levelDir[this.level] + "/Tiles.png");
        } else {
            throw new Error("Unknown level");
        }
        this.groundNavMesh = await groundNavPromise;
        this.navScale = this.mapHeight / this.groundNavMesh.length

        const neutralStaticSwarms: NeutralSwarm[] = this.data.entities.NeutralStaticSwarm.map((swarm) => (
            {
                position: Vector2D.cast(swarm),
                n: swarm.customFields.NParticles,
                wayPoints: []
            }
        ))
        const neutralRovingSwarms: NeutralSwarm[] = this.data.entities.NeutralRovingSwarm.map((swarm) => (
            {
                position: Vector2D.cast(swarm),
                n: swarm.customFields.NParticles,
                wayPoints: swarm.customFields.WayPoints.map(p => new Vector2D(p.cx * this.navScale, p.cy * this.navScale)),
            }
        ))

        this.neutralSwarms = neutralStaticSwarms.concat(neutralRovingSwarms);

        this.groundSprite = new Sprite(await groundTexPromise);
        this.nonColSprite = new Sprite(await nonColTexPromise);

        this.pixi.stage.addChild(this.groundSprite);
        this.pixi.stage.addChild(this.nonColSprite);
    }

    setScale(scale: number) {
        if (!this.groundSprite || !this.nonColSprite) return;
        this.groundSprite.scale = scale;
        this.nonColSprite.scale = scale;
    }
}

