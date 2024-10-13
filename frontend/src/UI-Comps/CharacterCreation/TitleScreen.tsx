import React from "react";

interface Props {
    newGameCallback: ()=>void;
}

export const TitleScreen: React.FC<Props> = ({newGameCallback}) => {
    return (
        <>
            <div className={`absolute h-screen w-screen gap-20 items-center justify-center flex flex-col`}>
                <span className={`font-bold text-8xl`}>Echoes of the Swarm</span>
                <button
                    className={
                    `bg-white flex items-center justify-center text-white text-2xl p-10 
                    bg-opacity-10 w-60 h-12 hover:bg-opacity-40 active:bg-opacity-90 
                    border border-white border-opacity-50 rounded-xl`}
                    onClick={newGameCallback}
                >NEW GAME</button>
            </div>
        </>
    );
};