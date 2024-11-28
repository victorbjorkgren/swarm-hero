import React from "react";
import {FaMinus, FaPlus} from "react-icons/fa";

interface Props {
    label: string;
    value: number;
    setValue: (value: number) => void;
}

export const StatSlider: React.FC<Props> = ({label, value, setValue}) => {

    return (
        <div className={`w-full max-w-md flex flex-col gap-0 items-center select-none`}>
            <span className="text-white lg:text-lg sm:text-sm text-xs select-none">{label}</span>
            <div className={`flex flex-row items-center gap-x-3`}>
                <div
                    className={`flex lg:w-12 lg:h-12 sm:h-8 sm:w-8 lg:text-xl sm:text-lg text-xs justify-center items-center bg-white bg-opacity-10 hover:bg-opacity-70 active:bg-opacity-90 border border-white rounded-xl select-none`}
                    onClick={() => {
                        if (value > 0)
                            setValue(-1)
                    }}
                >
                    <FaMinus />
                </div>
                <div className={`${value > 0 ? "bg-amber-300 shadow-amber300-shadow" : "bg-black"} lg:w-20 lg:h-2 sm:w-10 sm:h-1 w-5 h-1 rounded-l-full`}/>
                <div className={`${value > 1 ? "bg-amber-300 shadow-amber300-shadow" : "bg-black"} lg:w-20 lg:h-2 sm:w-10 sm:h-1 w-5 h-1`}/>
                <div className={`${value > 2 ? "bg-amber-300 shadow-amber300-shadow" : "bg-black"} lg:w-20 lg:h-2 sm:w-10 sm:h-1 w-5 h-1`}/>
                <div className={`${value > 3 ? "bg-amber-300 shadow-amber300-shadow" : "bg-black"} lg:w-20 lg:h-2 sm:w-10 sm:h-1 w-5 h-1`}/>
                <div className={`${value > 4 ? "bg-amber-300 shadow-amber300-shadow" : "bg-black"} lg:w-20 lg:h-2 sm:w-10 sm:h-1 w-5 h-1 rounded-r-full`}/>
                <div
                    className={`flex lg:w-12 lg:h-12 sm:h-8 sm:w-8 lg:text-xl sm:text-lg text-xs justify-center items-center bg-white bg-opacity-10 hover:bg-opacity-70 active:bg-opacity-90 border border-white rounded-xl select-none`}
                    onClick={() => {
                        if (value < 5)
                            setValue(1)
                    }}
                ><FaPlus /></div>
            </div>
        </div>
    );
};