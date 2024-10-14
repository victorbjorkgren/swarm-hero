import {SpellEffects, Spells} from "./types/spellTypes";
import {Units} from "./types/unitTypes";
import {Vector2D} from "./GameComps/Utility";

export const gameConfig = {
    mapWidth: 8000,
    mapHeight: 4000,
    castlePositions: [
        new Vector2D(500, 2000),
        new Vector2D(7500, 2000),
    ],
    playerStartOffset: new Vector2D(0, 100),

    cameraElasticAlpha: .05,
    cameraElasticMargin: .05,

    baseRenderScale: 1500,

    castleHealth: 400,
    castleIncome: 1000,
    castleActivationDist: 70,

    playerStartGold: 1000,
    playerMaxAcc: .1,
    playerSelfIncome: 0,

    dayLength: 20,
} as const

export const SpellPacks = {
    [Spells.Explosion]: {
        element: Spells.Explosion,
        castCost: 10,
        buyCost: 1000,
        castRange: 400,
        effectRange: 100,
        effectType: SpellEffects.Damage,
        effectAmount: 90,
        coolDown: 5,
    },
    [Spells.LaserBurst]: {
        element: Spells.LaserBurst,
        castCost: 10,
        buyCost: 1000,
        castRange: 400,
        effectRange: 100,
        effectType: SpellEffects.Damage,
        effectAmount: 50,
        coolDown: 5,
    }
}
export const UnitPacks = {
    [Units.LaserDrone]: {
        element: Units.LaserDrone,
        buyCost: 100,
    }
}