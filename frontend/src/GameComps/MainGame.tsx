import React, {useEffect, useRef, useState} from 'react';
import HeroGameLoop from "./HeroGameLoop";
import {CityPopup} from "../UI-Comps/CityPopup";
import {Player} from "./Player";
import {popUpEvent} from "../types/types";
import {Application, Assets, Sprite} from "pixi.js";
import {Keyboard} from "./Keyboard";


const MainGame: React.FC = () => {
    const gameContainerRef = useRef<HTMLDivElement | null>(null);
    const playersRef = useRef<Player[]>([]);
    const gameSceneRef = useRef<HeroGameLoop | null>(null);
    const pixiRef = useRef<Application | null>(null);

    const [gameContainerStyle, setGameContainerStyle] = useState<React.CSSProperties>({});
    const [playerPopUpEvent, setPlayerPopUpEvent] = useState<popUpEvent | undefined>(undefined);
    const [winner, setWinner] = useState<string | undefined>(undefined);
    const [dayTime, setDayTime] = useState<number>(0);

    const resizeApp = () => {
        const ASPECT_RATIO = 16 / 9;

        if (gameContainerRef.current === null) return
        if (pixiRef.current === null) return
        const containerWidth = gameContainerRef.current.clientWidth;
        const containerHeight = gameContainerRef.current.clientHeight;

        // Calculate the aspect ratio of the container
        const containerAspectRatio = containerWidth / containerHeight;

        let newWidth, newHeight;

        if (containerAspectRatio > ASPECT_RATIO) {
            newHeight = containerHeight;
            newWidth = newHeight * ASPECT_RATIO;
        } else {
            newWidth = containerWidth;
            newHeight = newWidth / ASPECT_RATIO;
        }

        setGameContainerStyle({
            width: `${newWidth}px`,
            height: `${newHeight}px`,
        })

    }

    window.addEventListener('resize', resizeApp);

    const initGame = async () => {
        Keyboard.initialize();

        pixiRef.current = new Application();
        await pixiRef.current.init({
            background: '#333333',
            resizeTo: gameContainerRef.current!
        });

        if (gameContainerRef.current) {
            gameContainerRef.current.appendChild(pixiRef.current.canvas);
        }

        resizeApp();

        gameSceneRef.current = new HeroGameLoop(
            pixiRef.current,
            setWinner,
            winner,
            setPlayerPopUpEvent,
            playersRef,
            setDayTime
        );

        gameSceneRef.current.start();
    };

    useEffect(() => {
        initGame();

        return () => {
            if (gameContainerRef.current) {
                gameContainerRef.current.innerHTML = '';
            }
        };
    }, []);

    const handleRematch = () => {
        if (gameSceneRef.current) {
            setWinner(undefined); // Reset the winner state
            gameSceneRef.current.start();
        }
    };

    const handleRecruit = (playerID?: number): boolean => {
        if (playerID === undefined) return false
        if (playersRef.current === null) return false

        const success = playersRef.current[playerID].buyDrone();
        return success;
    }

    const handleGarrisonDrone = (playerID?: number): boolean => {
        if (playerID === undefined) return false
        if (playersRef.current === null) return false

        const success = playersRef.current[playerID].garrisonDrone();
        return success;
    }

    const handleBringDrone = (playerID?: number): boolean => {
        if (playerID === undefined) return false
        if (playersRef.current === null) return false

        const success = playersRef.current[playerID].bringGarrisonDrone();
        return success;
    }

    return (
        <>
            <div className="relative w-full h-full overflow-visible">
                <div style={gameContainerStyle} ref={gameContainerRef}></div>
                    {playersRef.current.map(player => (
                        playerPopUpEvent !== undefined && playerPopUpEvent.playerID === player.team.id && (
                            <CityPopup
                                key={player.team.id}
                                anchorPoint={playerPopUpEvent.point}
                                recruitFunc={() => {
                                    return handleRecruit(player.team.id);
                                }}
                                garrisonFunc={() => {
                                    return handleGarrisonDrone(player.team.id)
                                }}
                                bringFunc={() => {
                                    return handleBringDrone(player.team.id);
                                }}
                            />
                        )
                    ))}
                <div style={{width: `${100*dayTime}%`}} className="absolute h-2 top-1 left-0 bg-green-100"></div>
                    {winner && (
                        <div className="absolute top-10 right-10 flex flex-col items-center">
                            <span className="text-white">Winner: {winner}</span>
                            <button
                                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 mt-4 rounded"
                                onClick={handleRematch}
                                content={"Rematch!"}/>
                        </div>
                    )
                    }
            </div>
        </>
    );
};

export default MainGame;