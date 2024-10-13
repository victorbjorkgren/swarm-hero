export const healthConversion = (level: number): number => {
    const levels = [250, 600, 1000, 1500, 2000];
    return levels[level];
}

export const speedConversion = (level: number): number => {
    const levels = [.5, .8, 1.1, 1.5, 2.0];
    return levels[level];
}

export const powerConversion = (level: number): number => {
    const levels = [.5, .8, 1.1, 1.5, 2.0];
    return levels[level];
}

export const manaConversion = (level: number): number => {
    const levels = [10, 30, 60, 100, 150];
    return levels[level];
}
