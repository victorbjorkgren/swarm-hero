import {BackButton} from "./CharacterCreation/BackButton";
import React, {useEffect, useRef, useState} from "react";
import {connectMesh} from "../../Hooks/Communication";
import {GameConnection, PeerMap} from "./CharacterCreation/MainCharacterCreation";
import {ThreeDots} from "react-loading-icons";
import {gameConfig} from "@shared/config";
import {useLogin} from "../../Hooks/useAuth";

interface Props {
    handleBack: () => void;
    doneCallback: (connectionData: GameConnection) => void;
    gameOn: boolean;
}

export const MatchMaking: React.FC<Props> = ({handleBack, doneCallback, gameOn}) => {
    const [nConnected, setNConnected] = useState<number>(0);
    const [isConnecting, setIsConnecting] = useState<boolean>(true);

    const leaveQueue = useRef<()=>void>(()=>{})
    const gameRoomToken = useRef<string | null>(null);
    const isFetching = useRef<boolean>(false);

    const {requestGameRoomToken} = useLogin();

    useEffect(() => {
        if (gameRoomToken.current !== null || isFetching.current) return;
        isFetching.current = true
        const fetchToken = async () => {
            const token = await requestGameRoomToken();
            if (token === null) throw new Error('Null gameRoomToken received');
            console.log('Received gameRoomToken', token);
            gameRoomToken.current = token;
            isFetching.current = false;
            leaveQueue.current = connectMesh(
                gameConfig.nPlayerGame,
                setNConnected,
                gameRoomToken.current,
                (connectionData: GameConnection) => {
                    doneCallback(connectionData);
                    setIsConnecting(false); // Stop connecting after a match is made
                },
            );
        }
        fetchToken();

    }, [gameRoomToken.current, isFetching.current]);

    const handleLeave = () => {
        leaveQueue.current();
        setIsConnecting(false);
        handleBack();
    }

    useEffect(() => {
        if (!isConnecting) return; // Only connect when needed

        return () => {
            leaveQueue.current();
        };
    }, [isConnecting]);

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