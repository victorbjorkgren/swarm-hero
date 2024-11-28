import React from "react";

type Props = {
    label: string;
    disabled?: boolean;
    onClick?: () => void;
}

export const MenuButton = ({ label, disabled, onClick }: Props) => {
    return (
        <button
            disabled={disabled}
            className={`bg-white flex items-center justify-center text-white text-2xl p-10 
                bg-opacity-10 w-60 h-12 border border-white border-opacity-50 rounded-xl 
                ${!disabled ? "hover:bg-opacity-40 active:bg-opacity-90" : "opacity-50"}`}
            onClick={onClick}
        >
            {label}
        </button>
    );
};