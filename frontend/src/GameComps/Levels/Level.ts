import Papa from 'papaparse';

import {Application, Assets, Sprite} from "pixi.js";
import {Vector2D} from "../Utility";
import {NeutralTypes} from "../Entities/Neutral";
import {gameConfig} from "@shared/config";
import {TeamName} from "@shared/commTypes";

export enum Levels {
    Test2v2,
    Field4v4,
}

export const levelDir = {
    [Levels.Field4v4]: "/levels/field2v2",
    [Levels.Test2v2]: "/levels/test2v2",
}

export type NeutralSwarm = {
    position: Vector2D,
    wayPoints: Vector2D[],
    n: number
}

export type NeutralBuilding = {
    position: Vector2D,
    type: NeutralTypes,
    income: number,
    guards: number
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

type StaticCustomField = {
    x: number,
    y: number,
    NParticles: number
}

type RovingCustomField = {
    x: number,
    y: number,
    NParticles: number,
    WayPoints: {cx: number, cy: number}[],
}

type MineCustomField = {
    NParticles: number
}

type CastleCustomField = {
    Teams: TeamName
}

export type LevelData = {
    x: number,
    y: number,
    height: number,
    width: number,
    entities: {
        Castle: {x: number, y: number, customFields: CastleCustomField   }[],
        NeutralStaticSwarm: {x: number, y: number, customFields: StaticCustomField}[],
        NeutralRovingSwarm: {x: number, y: number, width: number, height: number, customFields: RovingCustomField}[],
        GoldMine: {x: number, y: number, customFields: MineCustomField}[],
    }
}

export class Level {
    private data: LevelData | null = null;

    public mapOffset: Vector2D = Vector2D.zeros();
    public mapWidth: number = 1;
    public mapHeight: number = 1;

    public playerStart: {pos: Vector2D, team: TeamName}[] = [];
    public neutralSwarms: NeutralSwarm[] = [];
    public neutralBuildings: NeutralBuilding[] = [];

    public groundNavMesh: number[][] = [[]];
    public navScale: number = 1

    public groundSprite: Sprite | null = null;
    public nonColSprite: Sprite | null = null;

    constructor(
        private level: Levels,
        private pixi: Application
    ) { }

    private ensureArray(data: Partial<LevelData>): LevelData {
        const allEntities = {
            ...data.entities,
            NeutralStaticSwarm: Array.isArray(data.entities?.NeutralStaticSwarm) ? data.entities.NeutralStaticSwarm : [],
            NeutralRovingSwarm: Array.isArray(data.entities?.NeutralRovingSwarm) ? data.entities.NeutralRovingSwarm : [],
            GoldMine: Array.isArray(data.entities?.GoldMine) ? data.entities.GoldMine : []
        }
        return {
            ...data,
            entities: allEntities
        } as LevelData;
    }

    async fetchLevelData(): Promise<void> {
        const levelResponse = await fetch(levelDir[this.level] + '/data.json');
        const parsedLevel = await levelResponse.json();
        this.data = this.ensureArray(parsedLevel)

        this.mapOffset = Vector2D.cast(this.data)

        this.mapWidth = this.data.width;
        this.mapHeight = this.data.height;

        this.playerStart = this.data.entities.Castle.map(
            (castleData) => {
                return {
                    pos: Vector2D.cast(castleData),
                    team: castleData.customFields.Teams
                }
            }
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

        this.neutralBuildings = this.data.entities.GoldMine.map(mine => {
            return {
                type: NeutralTypes.GOLDMINE,
                position: Vector2D.cast(mine),
                income: gameConfig.mineIncome,
                guards: mine.customFields.NParticles
            }
        })

        this.neutralSwarms = neutralStaticSwarms.concat(neutralRovingSwarms);

    }

    async load() {
        if (this.data === null) throw new Error('No level data');

        let groundNavPromise;
        let groundTexPromise;
        let nonColTexPromise;

        groundNavPromise = loadCSVAsIntArray(levelDir[this.level] + "/Ground.csv");
        groundTexPromise = Assets.load(levelDir[this.level] + "/Ground.png");
        nonColTexPromise = Assets.load(levelDir[this.level] + "/Plants.png");

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

