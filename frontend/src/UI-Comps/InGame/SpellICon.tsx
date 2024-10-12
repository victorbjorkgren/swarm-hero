import {SpellIcons} from "./SpellPicker";
import React from "react";
import {SpellPack} from "../../types/spellTypes";

interface Props {
    spell: SpellPack
}

export const SpellICon: React.FC<Props> = ({spell}) => {
    return (
        <>
            {SpellIcons[spell.element]}
            <span className="text-xs select-none">{spell.castCost} Mana</span>
        </>
    );
};