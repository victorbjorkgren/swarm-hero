import React from "react";
import {MenuButton} from "../MenuButton";

interface Props {
    newGameCallback: ()=>void;
    tutorialCallback: ()=>void;
    aboutCallback: ()=>void;
}

export const TitleScreen: React.FC<Props> = ({newGameCallback, tutorialCallback, aboutCallback}) => {
    return (
        <>
            <div className={`absolute h-screen w-screen gap-20 items-center justify-center flex flex-col`}>
                <span className={`font-titleFont font-bold text-8xl`}>Echoes of the Swarm</span>
                <div className={`flex flex-col gap-10 items-center`}>
                    <MenuButton label={"NEW GAME"} onClick={newGameCallback} />
                    <MenuButton label={"TUTORIAL"} onClick={tutorialCallback} small={true} />
                    <MenuButton label={"ABOUT"} onClick={aboutCallback} small={true} />
                </div>
            </div>
        </>
    );
};