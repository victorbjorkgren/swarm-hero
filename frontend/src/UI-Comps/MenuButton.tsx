import React from "react";

type Props = {
    label: string;
    disabled?: boolean;
    small?: boolean;
    onClick?: () => void;
}

export const MenuButton = ({ label, disabled, small, onClick }: Props) => {
    return (
        <button
            disabled={disabled}
            className={`bg-white flex items-center justify-center text-white 
                bg-opacity-10 border border-white border-opacity-50 rounded-xl
                ${small ? "font-mono text-lg p-5 w-32 h-9 tracking-widest" : "font-mono tracking-widest text-2xl p-9 w-64 h-12"}
                ${!disabled ? "hover:bg-opacity-40 active:bg-opacity-90" : "opacity-50"}`}
            onClick={onClick}
        >
            {label}
        </button>
    );
};