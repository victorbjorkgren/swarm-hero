import {SpellEffects, Spells} from "../frontend/src/types/spellTypes";
import {Units} from "../frontend/src/types/unitTypes";
import {Vector2D} from "../frontend/src/GameComps/Utility";
import {ControllerMapping, Factions} from "../frontend/src/types/types";

export const gameConfig = {
    nPlayerGame: 3,
    nTeamGame: 2,

    // mapWidth: 8000,
    // mapHeight: 4000,
    //
    // castlePositions: [
    //     new Vector2D(500, 500),
    //     new Vector2D(7500, 3500),
    //     new Vector2D(7500, 500),
    //     new Vector2D(500, 3500),
    // ],
    // playerStartOffset: new Vector2D(0, 100),

    mapWidth: 1000,
    mapHeight: 1000,

    castlePositions: [
        new Vector2D(200, 200),
        new Vector2D(800, 800),
        new Vector2D(200, 800),
        new Vector2D(800, 200),
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

    sqPlayerVelCutoff: 0.075 * 0.075,

    dayLength: 20,

    healthLevels: [250, 600, 1000, 1500, 2000],
    speedLevels: [.5, .8, 1.0, 1.5, 2.0, 2.5],
    powerLevels: [.5, .8, 1.0, 1.5, 2.0, 2.5],
    manaLevels: [10, 30, 60, 100, 150, 200],

    factionInit: {
        [Factions.Mech]: {
            gold: 1000,
        },
        [Factions.Wild]: {
            gold: 1000,
        },
        [Factions.Mage]: {
            gold: 1000,
        },
        [Factions.Spirit]: {
            gold: 1000,
        }
    },

    latencyTimeout: 2000,
} as const

export const player1Keys: ControllerMapping = {
    up: "KeyW",
    left: "KeyA",
    down: "KeyS",
    right: "KeyD",
    buy: "KeyE",
    special: "KeyO",
    cancel: "Escape"
};

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