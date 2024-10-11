import React, {useState} from "react";
import {Units} from "../types/unitTypes";
import {UnitButton} from "../UI-Comps/UnitButton";

interface Props {
    isVisible: boolean;
    unit: Units | null;
    max: number;
    doneCallback: (unit: Units | null, n: number) => void;
}

export const MovePopup: React.FC<Props> = ({isVisible, unit, max, doneCallback}) => {
    const [moveTotal, setMoveTotal] = useState<number>(0);

    const size = 12;

    const handleIncrement = (n: number) => {
        if (moveTotal + n < max) {
            setMoveTotal(moveTotal + n);
        } else {
            setMoveTotal(max);
        }
    }

    const handleDone = () => {
        doneCallback(unit, moveTotal);
        setMoveTotal(0);
    }

    return (
        <div className={
            `absolute flex flex-row gap-2 rounded-xl justify-between bg-white bg-opacity-30 text-white p-3 gap-3
            select-none border border-white backdrop-blur-sm translate-y-20 transition-transform duration-300 ease-out 
            ${isVisible ? "scale-100 opacity-100 pointer-events-auto" : "scale-0 opacity-0 pointer-events-none"}`}>
            <span>{`Moving ${moveTotal} units`}</span>
            <UnitButton size={size} n={1} unit={unit} clickHandler={()=>handleIncrement(1)} />
            <UnitButton size={size} n={Math.round(max / 3)} unit={unit} clickHandler={()=>handleIncrement(Math.round(max / 3))} />
            <UnitButton size={size} n={max} unit={unit} clickHandler={()=>handleIncrement(max)} />
            <button
                className="bg-gray-300 w-1/2 active:bg-opacity-100 bg-opacity-0 hover:bg-opacity-40
                text-white text-xl border border-white rounded-xl shadow p-2 transition duration-100"
                onClick={handleDone}
            >
                Done
            </button>
        </div>
    );
};