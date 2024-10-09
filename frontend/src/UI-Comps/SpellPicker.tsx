import React from "react";
import {GiCornerExplosion, GiLaserBurst} from "react-icons/gi";
import {SpellCastIcon} from "./SpellCastIcon";
import {Spells} from "../types/types";

enum SpellEffects {
    Damage,
    Morale,
    Speed,
    Teleport,
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

export const SpellIcons = {
    [Spells.Explosion]: <GiCornerExplosion />,
    [Spells.LaserBurst]: <GiLaserBurst />,
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

interface SpellPickerProps {
    pickerCallback: (spell: SpellPack, castingDoneCallback: (didCast: boolean)=>void) => void;
    spellSlots: SpellPack[];
}

export const SpellPicker: React.FC<SpellPickerProps> = ({pickerCallback, spellSlots}) => {
    if (spellSlots.length === 0) return null

    return (
        <div className="absolute bottom-5 gap-x-14 px-14 py-8 flex justify-around items-center shadow-white-shadow backdrop-blur-sm rounded-xl text-white">
            {spellSlots.map((spell: SpellPack, index: number) => (
                <SpellCastIcon key={index} spell={spell} slot={index+1} pickerCallback={pickerCallback} />
            ))}
        </div>
    );
};