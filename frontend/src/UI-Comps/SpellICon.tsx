import {SpellIcons, SpellPack} from "./SpellPicker";
import React from "react";

interface Props {
    spell: SpellPack
}

export const SpellICon: React.FC<Props> = ({spell}) => {
    return (
        <>
            {SpellIcons[spell.element]}
            <span className="text-xs">{spell.castCost} Mana</span>
        </>
    );
};