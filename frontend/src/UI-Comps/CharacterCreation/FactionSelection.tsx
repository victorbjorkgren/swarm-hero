import React, {useEffect, useState} from "react";
import {LiaCogsSolid} from "react-icons/lia";
import {GiLoveHowl, GiMagicSwirl} from "react-icons/gi";
import {PiGhostThin} from "react-icons/pi";

export enum Factions {
    Mech,
    Wild,
    Mage,
    Spirit
}

interface Props {
    doneCallback: (name: string, faction: Factions)=>void;
}

export const FactionSelection: React.FC<Props> = ({doneCallback}) => {
    const [playerName, setPlayerName] = useState<string>('');
    const [faction, setFaction] = useState<Factions | null>(null);
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
        <div className={`flex flex-col items-center justify-center w-screen h-screen gap-10 bg-transparent text-white`}>
            <div className={`flex flex-col gap-2 justify-evenly items-center`}>
                <span className={`text-xl`}>Screen Name:</span>
                <input
                    type="text"
                    className={"w-60 rounded-xl text-3xl p-2 bg-transparent border-white border-2 text-center"}
                    maxLength={10}
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                />
            </div>
            <div className={`flex flex-row items-center gap-x-10 select-none bg-transparent`}>
                <button
                    className={
                    `flex flex-col items-center justify-center gap-0.5 w-24 h-24 aspect-square 
                    border border-white rounded-xl bg-white transform duration-500 
                    ${faction === Factions.Mech ? 
                        "bg-opacity-100 text-black shadow-white-shadow" 
                        : "bg-opacity-0 hover:bg-opacity-50 active:bg-opacity-70"}`}
                    onClick={()=>setFaction(Factions.Mech)}
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
                    <GiLoveHowl className={`text-6xl`}/>
                    <span className={`select-none text-xs text-center`}>WILD PACK</span>
                </button>
                <button
                    className={
                        `flex flex-col items-center justify-center gap-0.5 w-24 h-24 aspect-square 
                    border border-white rounded-xl bg-white transform duration-500 
                    ${faction === Factions.Mage ?
                            "bg-opacity-100 text-black shadow-white-shadow"
                            : "bg-opacity-0 hover:bg-opacity-50 active:bg-opacity-70"}`}
                    onClick={()=>setFaction(Factions.Mage)}
                >
                    <GiMagicSwirl className={`text-6xl`}/>
                    <span className={`select-none text-xs text-center`}>LONELY MAGE</span>
                </button>
                <button
                    className={
                        `flex flex-col items-center justify-center gap-0.5 w-24 h-24 aspect-square 
                    border border-white rounded-xl bg-white transform duration-500 
                    ${faction === Factions.Spirit ?
                            "bg-opacity-100 text-black shadow-white-shadow"
                            : "bg-opacity-0 hover:bg-opacity-50 active:bg-opacity-70"}`}
                    onClick={()=>setFaction(Factions.Spirit)}
                >
                    <PiGhostThin className={`text-6xl`}/>
                    <span className={`select-none text-xs text-center`}>SPIRIT</span>
                </button>
            </div>
            <button
                className={`bg-white text-white text-2xl bg-opacity-10 w-44 h-12 ${ready ? "hover:bg-opacity-40 active:bg-opacity-90" : "opacity-30"} border border-white rounded-xl`}
                onClick={handleDone}
            >Next</button>
        </div>
    );
};