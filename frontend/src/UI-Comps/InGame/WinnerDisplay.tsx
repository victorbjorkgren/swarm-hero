import React from "react";

interface WinnerDisplayProps {
    winner: string | undefined;
    handleRematch: () => void;
}

export const WinnerDisplay: React.FC<WinnerDisplayProps> = ({winner, handleRematch}) => {
    return (
        <>
            {winner && (
                <div className="absolute top-0 left-0 h-screen w-screen flex flex-col gap-10 items-center justify-center">
                    <span className="text-white text-center text-9xl">{winner} Wins!</span>
                    <button
                        className="bg-gray-300 tracking-widest w-1/6 active:bg-opacity-100 bg-opacity-0 hover:bg-opacity-40 text-white text-xl border border-white rounded-xl shadow p-2 transition duration-100"
                        onClick={handleRematch}>
                        Again!
                    </button>
                </div>
            )}
        </>
    )

};