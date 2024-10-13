import React from "react";
import {FaMinus, FaPlus} from "react-icons/fa";

interface Props {
    label: string;
    value: number;
    setValue: (value: number) => void;
}

export const StatSlider: React.FC<Props> = ({label, value, setValue}) => {

    return (
        <div className={`flex flex-col gap-0 items-center select-none`}>
            <span className="text-white text-lg select-none">{label}</span>
            <div className={`flex flex-row items-center gap-3`}>
                <div
                    className={`flex w-12 h-12 text-xl justify-center items-center bg-white bg-opacity-10 hover:bg-opacity-70 active:bg-opacity-90 border border-white rounded-xl select-none`}
                    onClick={() => {
                        if (value > 0)
                            setValue(-1)
                    }}
                >
                    <FaMinus />
                </div>
                <div className={`${value > 0 ? "bg-amber-300 shadow-amber300-shadow" : "bg-black"} w-20 h-2 rounded-l-full`}/>
                <div className={`${value > 1 ? "bg-amber-300 shadow-amber300-shadow" : "bg-black"} w-20 h-2`}/>
                <div className={`${value > 2 ? "bg-amber-300 shadow-amber300-shadow" : "bg-black"} w-20 h-2`}/>
                <div className={`${value > 3 ? "bg-amber-300 shadow-amber300-shadow" : "bg-black"} w-20 h-2`}/>
                <div className={`${value > 4 ? "bg-amber-300 shadow-amber300-shadow" : "bg-black"} w-20 h-2 rounded-r-full`}/>
            <div
                className={`flex w-12 h-12 text-xl leading-none justify-center items-center bg-white bg-opacity-10 hover:bg-opacity-70 active:bg-opacity-90 border border-white rounded-xl select-none text-center`}
                onClick={() => {
                    if (value < 5)
                        setValue(1)
                }}
            ><FaPlus /></div>
            </div>
        </div>
    );
};