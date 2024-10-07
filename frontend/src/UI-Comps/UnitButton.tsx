import {LiaTimesSolid} from "react-icons/lia";
import {GiLaserBurst} from "react-icons/gi";
import React from "react";
import {Spells, Units} from "../types/types";
import {SpellCastIcon} from "./SpellCastIcon";
import {SpellIcons, SpellPacks} from "./SpellPicker";
import {SpellICon} from "./SpellICon";

interface UnitButtonProps {
    n: number;
    unit: Units | Spells | null;
    clickHandler: (n: number)=>void;
    flashError?: boolean;
}

export const UnitButton: React.FC<UnitButtonProps> = ( {n, unit, clickHandler, flashError} ) => {
    let ware;
    switch (unit) {
        case Spells.Explosion:
            ware = <SpellICon spell={SpellPacks[Spells.Explosion]} />;
            break;
        case Spells.LaserBurst:
            ware = <SpellICon spell={SpellPacks[Spells.LaserBurst]} />;
            break;
        case Units.LaserDrone:
            ware = <GiLaserBurst />
            break;
        default:
            ware = ""
    }
    return (
        <div className="flex flex-row items-center justify-center space-x-2 text-white">
            {n > 0 && <span className="text-xl mr-1 select-none">{n.toString()}</span>}
            {n > 0 && <LiaTimesSolid className="text-sm"/>}
            <div
                className={`${flashError ? "bg-red-500" : "bg-gray-300 active:bg-opacity-90"} aspect-square min-w-10 flex flex-col items-center flex-grow justify-center bg-opacity-50 hover:bg-opacity-70 border border-white rounded-xl shadow p-2 transition duration-100`}
                onClick={()=>clickHandler(n)}
            >
                {ware}
            </div>
        </div>
    );
};