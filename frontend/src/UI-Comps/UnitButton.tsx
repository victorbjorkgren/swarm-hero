import {LiaTimesSolid} from "react-icons/lia";
import {GiLaserBurst} from "react-icons/gi";
import React from "react";
import {Units} from "../types/types";

interface UnitButtonProps {
    n: number;
    unit: Units;
    clickHandler: (n: number)=>void;
    flashError?: boolean;
}

export const UnitButton: React.FC<UnitButtonProps> = ( {n, unit, clickHandler, flashError} ) => {
    return (
        <div className="flex flex-row items-center justify-center space-x-2 text-white">
            <span className="text-xl mr-1 select-none">{n.toString()}</span><LiaTimesSolid className="text-sm"/>
            <div
                className={`${flashError ? "bg-red-500" : "bg-gray-300 active:bg-opacity-90"} bg-opacity-50 items-center hover:bg-opacity-70 text-2xl border border-white rounded-xl shadow p-2 transition duration-100`}
                onClick={()=>clickHandler(n)}
            >
                {unit === Units.laser ?  <GiLaserBurst /> : ""}
            </div>
        </div>
    );
};