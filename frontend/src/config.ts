import {SpellEffects, Spells} from "./types/spellTypes";
import {Units} from "./types/unitTypes";
import {Vector2D} from "./GameComps/Utility";
import {Factions} from "./UI-Comps/CharacterCreation/FactionSelection";
import {ControllerMapping} from "./types/types";

export const gameConfig = {
    mapWidth: 8000,
    mapHeight: 4000,
    castlePositions: [
        new Vector2D(500, 500),
        new Vector2D(7500, 3500),
        new Vector2D(7500, 500),
        new Vector2D(500, 3500),
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
    }
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