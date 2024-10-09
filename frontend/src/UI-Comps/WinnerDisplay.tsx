import React from "react";

interface WinnerDisplayProps {
    winner: string | undefined;
    handleRematch: () => void;
}

export const WinnerDisplay: React.FC<WinnerDisplayProps> = ({winner, handleRematch}) => {
    return (
        <>
            {winner && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col gap-10 items-center">
                    <span className="text-white text-9xl">{winner} Wins!</span>
                    <button
                        className="bg-gray-300 w-1/2 active:bg-opacity-100 bg-opacity-0 hover:bg-opacity-40 text-white text-xl border border-white rounded-xl shadow p-2 transition duration-100"
                        onClick={handleRematch}>Rematch?</button>
                </div>)
            };
        </>
    )

};