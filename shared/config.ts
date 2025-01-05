import {SpellEffects, SpellPack, Spells} from "../frontend/src/types/spellTypes";
import {Units} from "../frontend/src/types/unitTypes";
import {Vector2D} from "../frontend/src/GameComps/Utility";
import {ControllerMapping, Factions} from "../frontend/src/types/types";

export const gameConfig = {
    nPlayerGame: 2,
    nTeamGame: 2,

    playerNameMaxLength: 25,

    playerStartOffset: new Vector2D(50, 0),

    cameraElasticAlpha: .05,
    cameraElasticMargin: .05,

    baseRenderScale: 1500,

    castleHealth: 5000,
    castleIncome: 1000,
    castleActivationDist: 70,

    playerStartGold: 1000,
    playerMaxVel: 2.,
    playerMaxAcc: .2,
    playerSelfIncome: 0,

    rovingSwarmVel: .5,
    swarmYieldCheckSqDist: 200 * 200,
    swarmYieldLimit: 2,

    mineYieldCheckSqDist: 50 * 50,
    mineYieldLimit: 100,
    mineIncome: 1000,

    sqPlayerVelCutoff: 0.075 * 0.075,

    dayLength: 30,

    healthLevels: [500, 1000, 1500, 2000, 2500, 3000],
    speedLevels: [.9, .95, 1.0, 1.05, 1.1, 1.2],
    powerLevels: [1.0, 1.1, 1.2, 1.3, 1.4, 1.5],
    manaLevels: [50, 100, 150, 200, 350, 500],

    factionInit: {
        [Factions.Mech]: {
            gold: 1500,
        },
        [Factions.Wild]: {
            gold: 1500,
        },
        [Factions.Mage]: {
            gold: 1500,
        },
        [Factions.Spirit]: {
            gold: 1500,
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
        effectAmount: 100,
        effectDuration: 0,
        warmUp: .5,
        coolDown: 5,
    },
    [Spells.SpeedUp]: {
        element: Spells.SpeedUp,
        castCost: 15,
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
        castCost: 15,
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
        castCost: 20,
        buyCost: 1000,
        castRange: 800,
        effectRange: 100,
        effectType: SpellEffects.Teleport,
        effectAmount: 0,
        effectDuration: 0,
        warmUp: 1,
        coolDown: 5,
    },
}
export const UnitPacks = {
    [Units.LaserDrone]: {
        element: Units.LaserDrone,
        buyCost: 100,
    }
}