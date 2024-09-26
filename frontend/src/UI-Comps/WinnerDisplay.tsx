import React from "react";

interface WinnerDisplayProps {
    winner: string | undefined;
    handleRematch: () => void;
}

export const WinnerDisplay: React.FC<WinnerDisplayProps> = ({winner, handleRematch}) => {
    return (
        <>
            {winner && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                    <span className="text-white text-8xl">Winner: {winner}</span>
                    <button
                        className="bg-blue-500 hover:bg-blue-700 text-white py-2 px-4 mt-4 rounded"
                        onClick={handleRematch}>Rematch?</button>
                </div>)
            };
        </>
    )

};