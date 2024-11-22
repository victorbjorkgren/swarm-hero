export enum SpellEffects {
    Damage,
    Morale,
    Speed,
    Teleport,
}

export enum Spells {
    Explosion = 'Explosion',
    SpeedUp = 'SpeedUp',
    SpeedDown = 'SpeedDown',
    Teleport = 'Teleport',
}

export interface SpellPack {
    element: Spells;
    castCost: number;
    buyCost: number;
    castRange: number;
    effectRange: number;
    effectType: SpellEffects;
    effectAmount: number;
    effectDuration: number;
    warmUp: number;
    coolDown: number;
}

