import React from "react";
import {MenuButton} from "../MenuButton";

interface Props {
    newGameCallback: ()=>void;
}

export const TitleScreen: React.FC<Props> = ({newGameCallback}) => {
    return (
        <>
            <div className={`absolute h-screen w-screen gap-20 items-center justify-center flex flex-col`}>
                <span className={`font-titleFont font-bold text-8xl`}>Echoes of the Swarm</span>
                <MenuButton label={"NEW GAME"} onClick={newGameCallback} />
            </div>
        </>
    );
};