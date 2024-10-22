import {BackButton} from "./BackButton";
import React, {useEffect, useRef, useState} from "react";
import {connectMesh} from "../../Hooks/Communication";
import {GameConnection, PeerMap} from "./MainCharacterCreation";
import {ThreeDots} from "react-loading-icons";

interface Props {
    handleBack: () => void;
    doneCallback: (connectionData: GameConnection) => void;
}
let leaveQueue: ()=>void = ()=>{}

export const MatchMaking: React.FC<Props> = ({handleBack, doneCallback}) => {
    const [nConnected, setNConnected] = useState<number>(0);

    const handleLeave = () => {
        leaveQueue();
        handleBack();
    }

    useEffect(() => {
        leaveQueue = connectMesh(3, setNConnected, doneCallback);
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