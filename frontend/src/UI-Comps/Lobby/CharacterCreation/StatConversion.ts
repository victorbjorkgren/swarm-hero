import {gameConfig} from "@shared/config";

export const healthConversion = (level: number): number => {
    return gameConfig.healthLevels[level];
}

export const speedConversion = (level: number): number => {
    return gameConfig.speedLevels[level];
}

export const powerConversion = (level: number): number => {
    return gameConfig.powerLevels[level];
}

export const manaConversion = (level: number): number => {
    return gameConfig.manaLevels[level];
}
