import React from "react";
import {SpellICon} from "./SpellICon";
import {Spells, SpellPack} from "../../types/spellTypes";
import {Units} from "../../types/unitTypes";
import {UnitIcon} from "./UnitIcon";
import {SpellPacks, UnitPacks} from "@shared/config";

interface UnitButtonProps {
    n: number;
    size: number;
    unit: Units | SpellPack | null;
    clickHandler: ()=>void;
    flashError?: boolean;
}

export const UnitButton: React.FC<UnitButtonProps> = ( {n, size, unit, clickHandler, flashError} ) => {
    let ware;
    switch (unit) {
        case SpellPacks[Spells.Explosion]:
            ware = <SpellICon spell={SpellPacks[Spells.Explosion]} />;
            break;
        case SpellPacks[Spells.SpeedUp]:
            ware = <SpellICon spell={SpellPacks[Spells.SpeedUp]} />;
            break;
        case SpellPacks[Spells.SpeedDown]:
            ware = <SpellICon spell={SpellPacks[Spells.SpeedDown]} />;
            break;
        case SpellPacks[Spells.Teleport]:
            ware = <SpellICon spell={SpellPacks[Spells.Teleport]} />;
            break;
        case Units.LaserDrone:
            ware = <UnitIcon unit={UnitPacks[Units.LaserDrone]} n={n} />
            break;
        default:
            ware = ""
    }

    return (
        <div className="flex flex-row items-center justify-center space-x-2 text-white">
            <div
                className={`
                ${flashError ? "bg-red-500" : "bg-gray-300 active:bg-opacity-90"} 
                aspect-square w-${size} h-${size} flex flex-col items-center flex-shrink-0 justify-center 
                bg-opacity-50 hover:bg-opacity-70 border border-white rounded-xl shadow 
                gap-1 p-2 px-4 transition duration-100
                `}
                onClick={()=>clickHandler()}
            >
                {ware}
            </div>
        </div>
    );
};