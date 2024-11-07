import {BackButton} from "./BackButton";
import React, {useEffect, useRef, useState} from "react";
import {connectMesh} from "../../Hooks/Communication";
import {GameConnection, PeerMap} from "./MainCharacterCreation";
import {ThreeDots} from "react-loading-icons";
import {gameConfig} from "@shared/config";

interface Props {
    handleBack: () => void;
    doneCallback: (connectionData: GameConnection) => void;
    gameOn: boolean;
}
let leaveQueue: ()=>void = ()=>{}
let notConnected: boolean = true;

export const MatchMaking: React.FC<Props> = ({handleBack, doneCallback, gameOn}) => {
    const [nConnected, setNConnected] = useState<number>(0);

    const handleLeave = () => {
        leaveQueue();
        notConnected = true
        handleBack();
    }

    const handleConnected = (connectionData: GameConnection) => {
        doneCallback(connectionData);
        notConnected = true;
    }

    useEffect(() => {
        console.log('attempting connect', notConnected);
        if (notConnected) {
            notConnected = false;
            leaveQueue = connectMesh(gameConfig.nPlayerGame, setNConnected, handleConnected);
        }
    }, []);

    return (
        <>
            <BackButton handleBack={handleLeave}/>
            <div className="w-screen h-screen flex flex-col items-center justify-center select-none p-10 gap-15">
                <span className={`text-3xl`}>Waiting for opponents</span>
                <span className={`text-xl`}>Connected to {nConnected} / 2</span>
                <ThreeDots color="#AAAAAA" scale={.5}/>
            </div>
        </>
    );
};