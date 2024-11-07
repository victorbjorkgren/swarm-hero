import Papa from 'papaparse';

import ruins2v2 from './Level_0/data.json';
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
    [Levels.Ruins2v2]: "/sprites/PixelArtTopDownTextures/TopDownRuins_1.0/simplified/Level_0",
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
    public groundNavMesh: number[][] = [[]];
    public navScale: number = 1

    public groundSprite: Sprite | null = null;
    public nonColSprite: Sprite | null = null;

    constructor(
        private level: Levels,
        private pixi: Application
    ) {
        this.data = ruins2v2;
        this.mapOffset = Vector2D.cast(this.data)

        this.mapWidth = this.data.width;
        this.mapHeight = this.data.height;

        this.playerStart = ruins2v2.entities.Castle.map(
            (castleData) =>
                Vector2D.cast(castleData)
        );
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

