import React from "react";
import {SpellPicker} from "./SpellPicker";
import {SpellPack} from "../../types/spellTypes";
import {PlayerInterface} from "../../GameComps/Entities/Player";

interface SpellPickerProps {
    pickerCallback: (spell: SpellPack, castingDoneCallback: (didCast: boolean)=>void) => void;
    player: PlayerInterface | null;
}

export const PlayerBar: React.FC<SpellPickerProps> = ({pickerCallback, player}) => {
    const castleMenuClosed = player?.popUpCastle === null;
    return (
        <div className={`absolute w-full h-full top-0 left-0 flex justify-center pointer-events-none transition duration-500 ${castleMenuClosed ? "opacity-100" : "opacity-30"}`}>
                {/*<div className="flex flex-col flex-grow items-left justify-around text-m m-5">*/}
                {/*    <span>{player ? player.name : ""}</span>*/}
                {/*    <span>Team: {player && player.team.name}</span>*/}
                {/*    <span>Gold: {player && player.gold}</span>*/}
                {/*    <span>Mana: {player && player.mana}</span>*/}
                {/*</div>*/}
                <SpellPicker pickerCallback={pickerCallback} spellSlots={player ? player.state.availableSpells : []}/>
        </div>
    );
};