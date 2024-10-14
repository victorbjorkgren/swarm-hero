export enum SpellEffects {
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

