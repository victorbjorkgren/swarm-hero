import React from "react";
import {SpellICon} from "./SpellICon";
import {Spells, SpellPack, SpellPacks} from "../types/spellTypes";
import {UnitPacks, Units} from "../types/unitTypes";
import {UnitIcon} from "./UnitIcon";

interface UnitButtonProps {
    n: number;
    unit: Units | SpellPack | null;
    clickHandler: ()=>void;
    flashError?: boolean;
}

export const UnitButton: React.FC<UnitButtonProps> = ( {n, unit, clickHandler, flashError} ) => {
    let ware;
    switch (unit) {
        case SpellPacks[Spells.Explosion]:
            ware = <SpellICon spell={SpellPacks[Spells.Explosion]} />;
            break;
        case SpellPacks[Spells.LaserBurst]:
            ware = <SpellICon spell={SpellPacks[Spells.LaserBurst]} />;
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
                aspect-square min-w-full flex flex-col items-center flex-shrink-0 justify-center 
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