import React from "react";
import {GiCornerExplosion, GiSnail} from "react-icons/gi";
import {SpellCastIcon} from "./SpellCastIcon";
import {Spells, SpellPack} from "../../types/spellTypes";
import {FaRunning} from "react-icons/fa";

export const SpellIcons = {
    [Spells.Explosion]: <GiCornerExplosion />,
    [Spells.SpeedUp]: <FaRunning />,
    [Spells.SpeedDown]: <GiSnail />,
    [Spells.Teleport]: <img src="/sprites/DimensionDoorIcon.png" alt="Dimension Door" style={{ width: '1em', height: '1em' }} />
};

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