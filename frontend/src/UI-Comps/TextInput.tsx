import React from "react";

type Props = {
    label?: string;
    placeholder?: string;
    value: string;
    setValue: (value: string) => void;
    maxLength?: number;
}

export const TextInput = ({label, placeholder, value, setValue, maxLength}: Props) => {
    return (
        <div className={`flex flex-col gap-2 justify-evenly items-center`}>
            {label && <span className={`text-xl`}>{label + ":"}</span>}
            <input
                type="text"
                className={"w-60 rounded-xl text-3xl p-2 bg-transparent border-white border-2 text-center"}
                maxLength={maxLength}
                value={value}
                placeholder={placeholder}
                onChange={(e) => setValue(e.target.value)}
            />
        </div>
    );
};