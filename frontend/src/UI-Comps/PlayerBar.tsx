import React from "react";
import {IconType} from "react-icons";
import {GiLaserBurst} from "react-icons/gi";
import {SpellPack, SpellPicker} from "./SpellPicker";
import {Player} from "../GameComps/Player";

interface SpellPickerProps {
    pickerCallback: (spell: SpellPack, castingDoneCallback: ()=>void) => void;
    spellSlots: SpellPack[];
    player: Player | null;
}


export const PlayerBar: React.FC<SpellPickerProps> = ({pickerCallback, spellSlots, player}) => {
    return (
        <div className="absolute w-full h-full top-0 left-0 flex justify-center pointer-events-none">

                {/*<div className="flex flex-col flex-grow items-left justify-around text-m m-5">*/}
                {/*    <span>{player ? player.name : ""}</span>*/}
                {/*    <span>Team: {player && player.team.name}</span>*/}
                {/*    <span>Gold: {player && player.gold}</span>*/}
                {/*    <span>Mana: {player && player.mana}</span>*/}
                {/*</div>*/}
                <SpellPicker pickerCallback={pickerCallback} spellSlots={spellSlots}/>
        </div>
    );
};