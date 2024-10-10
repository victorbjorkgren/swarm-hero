enum SpellEffects {
    Damage,
    Morale,
    Speed,
    Teleport,
}

export enum Spells {
    Explosion = 'Explosion',
    LaserBurst = 'LaserBurst',
}

export interface SpellPack {
    element: Spells;
    castCost: number;
    buyCost: number;
    castRange: number;
    effectRange: number;
    effectType: SpellEffects;
    effectAmount: number;
    coolDown: number;
}

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