import React, {useEffect, useState} from "react";
import {LiaCogsSolid} from "react-icons/lia";
import {GiMagicSwirl} from "react-icons/gi";
import {PiGhostThin} from "react-icons/pi";
import {FaCat} from "react-icons/fa";
import {BackButton} from "./BackButton";
import {Factions} from "../../../types/types";
import {TextInput} from "../../TextInput";
import {MenuButton} from "../../MenuButton";

interface Props {
    doneCallback: (name: string, faction: Factions)=>void;
    handleBack: () =>void;
    defaultName: string;
    defaultFaction: Factions | null;
}

export const FactionSelection: React.FC<Props> = ({doneCallback, handleBack, defaultName, defaultFaction}) => {
    const [playerName, setPlayerName] = useState<string>(defaultName);
    const [faction, setFaction] = useState<Factions | null>(defaultFaction);
    const [ready, setReady] = useState<boolean>(false);

    useEffect(() => {
        if (playerName.length >= 1 && faction !== null) {
            setReady(true)
        } else {
            setReady(false);
        }
    }, [faction, playerName]);

    const handleDone = () => {
        if (ready) {
            doneCallback(playerName, faction!)
        }
    }

    return (
        <>
            <BackButton handleBack={handleBack}/>
            <div className={`flex flex-col items-center justify-center w-screen h-screen gap-10 bg-transparent text-white`}>
                <TextInput label={"Screen Name"} value={playerName} setValue={setPlayerName} maxLength={10}/>
                <div className={`flex flex-row items-center gap-x-10 select-none bg-transparent`}>
                    <button
                        className={
                        `flex flex-col items-center justify-center gap-0.5 w-24 h-24 aspect-square 
                        border border-white rounded-xl bg-white transform duration-500 
                        ${faction === Factions.Mech ? 
                            "bg-opacity-100 text-black shadow-white-shadow" 
                            : "bg-opacity-0 opacity-30"}`}
                        onClick={()=>{}}
                    >
                        <LiaCogsSolid className={`text-6xl`}/>
                        <span className={`select-none text-xs text-center`}>AUTOMATON</span>
                    </button>
                    <button
                        className={
                            `flex flex-col items-center justify-center gap-0.5 w-24 h-24 aspect-square 
                        border border-white rounded-xl bg-white transform duration-500 
                        ${faction === Factions.Wild ?
                                "bg-opacity-100 text-black shadow-white-shadow"
                                : "bg-opacity-0 hover:bg-opacity-50 active:bg-opacity-70"}`}
                        onClick={()=>setFaction(Factions.Wild)}
                    >
                        <FaCat className={`text-6xl`}/>
                        <span className={`select-none text-xs text-center`}>WILD PACK</span>
                    </button>
                    <button
                        className={
                            `flex flex-col items-center justify-center gap-0.5 w-24 h-24 aspect-square 
                        border border-white rounded-xl bg-white transform duration-500 
                        ${faction === Factions.Mage ?
                                "bg-opacity-100 text-black shadow-white-shadow"
                                : "bg-opacity-0 opacity-30"}`}
                        onClick={()=>{}}
                    >
                        <GiMagicSwirl className={`text-6xl`}/>
                        <span className={`select-none text-xs text-center`}>THE ARCANE</span>
                    </button>
                    <button
                        className={
                            `flex flex-col items-center justify-center gap-0.5 w-24 h-24 aspect-square 
                        border border-white rounded-xl bg-white transform duration-500 
                        ${faction === Factions.Spirit ?
                                "bg-opacity-100 text-black shadow-white-shadow"
                                : "bg-opacity-0 opacity-30"}`}
                        onClick={()=>{}}
                    >
                        <PiGhostThin className={`text-6xl`}/>
                        <span className={`select-none text-xs text-center`}>SPIRIT</span>
                    </button>
                </div>
                <MenuButton label={"Next"} onClick={handleDone} />
            </div>
        </>
    );
};