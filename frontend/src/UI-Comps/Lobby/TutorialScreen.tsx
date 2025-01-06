import {BackButton} from "./CharacterCreation/BackButton";
import React from "react";
import {MenuButton} from "../MenuButton";
import {gameConfig} from "@shared/config";

type Props = {
    backToMain: ()=>void;
}

export const TutorialScreen = ({backToMain}: Props) => {
    return (
        <>
            <BackButton handleBack={backToMain}/>
            <div className={`absolute h-screen w-screen gap-10 items-center justify-center flex flex-col`}>
                <span className={`font-titleFont font-bold text-5xl`}>Tutorial</span>
                <div className={`font-mono text-xl w-80`}>
                    Use WASD keys for movement.
                    E to interact with your castle.
                    Mouse to cast spells.
                </div>
                <div className={`font-mono text-xl w-80`}>
                    Kill all opponents on the other team in order to win. Destroying their castles is not required to win
                </div>
                <div className={`font-mono text-xl w-80`}>
                    Each day is {gameConfig.dayLength}s long, and each morning you will get 1000 gold for each castle
                    and gold mine you own. Clear the swarm near a gold mine and move close to it to capture it.
                </div>
                <MenuButton label={"BACK"} onClick={backToMain} small={true}/>
            </div>
        </>
    );
};