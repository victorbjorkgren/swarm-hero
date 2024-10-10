
export enum Units {
    LaserDrone = 'LaserDrone',
}

export interface UnitPack {
    element: Units;
    buyCost: number;
}

export const UnitPacks = {
    [Units.LaserDrone]: {
        element: Units.LaserDrone,
        buyCost: 100,
    }
}

