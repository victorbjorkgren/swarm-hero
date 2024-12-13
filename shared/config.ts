import {SpellEffects, SpellPack, Spells} from "../frontend/src/types/spellTypes";
import {Units} from "../frontend/src/types/unitTypes";
import {Vector2D} from "../frontend/src/GameComps/Utility";
import {ControllerMapping, Factions} from "../frontend/src/types/types";

export const gameConfig = {
    nPlayerGame: 2,
    nTeamGame: 2,

    playerStartOffset: new Vector2D(50, 0),

    cameraElasticAlpha: .05,
    cameraElasticMargin: .05,

    baseRenderScale: 1500,

    castleHealth: 400,
    castleIncome: 1000,
    castleActivationDist: 70,

    playerStartGold: 1000,
    playerMaxAcc: .1,
    playerSelfIncome: 0,

    rovingSwarmVel: .5,
    swarmYieldCheckSqDist: 200 * 200,
    mineYieldCheckSqDist: 50 * 50,
    swarmYieldLimit: 2,
    mineYieldLimit: 2,

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

export const SpellPacks: { [key in Spells]: SpellPack } = {
    [Spells.Explosion]: {
        element: Spells.Explosion,
        castCost: 50,
        buyCost: 1000,
        castRange: 400,
        effectRange: 100,
        effectType: SpellEffects.Damage,
        effectAmount: 90,
        effectDuration: 0,
        warmUp: .5,
        coolDown: 5,
    },
    [Spells.SpeedUp]: {
        element: Spells.SpeedUp,
        castCost: 10,
        buyCost: 1000,
        castRange: 400,
        effectRange: 100,
        effectType: SpellEffects.Speed,
        effectAmount: 0.5,
        effectDuration: 10,
        warmUp: .1,
        coolDown: 15,
    },
    [Spells.SpeedDown]: {
        element: Spells.SpeedDown,
        castCost: 10,
        buyCost: 1000,
        castRange: 400,
        effectRange: 100,
        effectType: SpellEffects.Speed,
        effectAmount: -0.5,
        effectDuration: 10,
        warmUp: .1,
        coolDown: 15,
    },
    [Spells.Teleport]: {
        element: Spells.Teleport,
        castCost: 50,
        buyCost: 1000,
        castRange: 400,
        effectRange: 100,
        effectType: SpellEffects.Teleport,
        effectAmount: 0,
        effectDuration: 0,
        warmUp: 2,
        coolDown: 5,
    },
}
export const UnitPacks = {
    [Units.LaserDrone]: {
        element: Units.LaserDrone,
        buyCost: 100,
    }
}