import {BackButton} from "./CharacterCreation/BackButton";
import React from "react";
import {MenuButton} from "../MenuButton";

type Props = {
    backToMain: ()=>void;
}

export const AboutScreen = ({backToMain}: Props) => {
    return (
        <>
            <BackButton handleBack={backToMain}/>
            <div className={`absolute h-screen w-screen gap-20 items-center justify-center flex flex-col`}>
                <span className={`font-titleFont font-bold text-5xl`}>ABOUT</span>
                <div className={`font-mono text-xl`}>
                    Game and Engine made by <b>Victor Björkgren</b><br/>
                </div>
                <div className={`font-mono text-xl`}>
                    Soon there will be attribution to the artists who contributed with most of the artwork
                </div>
                <MenuButton label={"BACK"} onClick={backToMain} small={true}/>
            </div>
        </>
    );
};