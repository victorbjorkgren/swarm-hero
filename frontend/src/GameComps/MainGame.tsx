import React, {useEffect, useRef, useState} from 'react';
import Phaser from 'phaser';
import {HeroScene} from "./HeroScene";
import {CityPopup} from "../UI-Comps/CityPopup";
import {Player} from "./Player";
import {popUpEvent} from "../types/types";


const MainGame: React.FC = () => {
    const gameContainerRef = useRef(null);
    const gameRef = useRef<Phaser.Game | null>(null);
    const playersRef = useRef<Player[]>([]);
    const sceneRef = useRef<HeroScene | null>(null);

    const [playerPopUpEvent, setPlayerPopUpEvent] = useState<popUpEvent | undefined>(undefined);
    const [winner, setWinner] = useState<string | undefined>(undefined);


    useEffect(() => {
        const config: Phaser.Types.Core.GameConfig = {
            type: Phaser.AUTO,
            width: '100%',
            height: '100%',
            parent: gameContainerRef.current,
            scene: HeroScene,
        };

        gameRef.current = new Phaser.Game(config);
        gameRef.current.scene.start('HeroScene');

        sceneRef.current = gameRef.current.scene.getScene('HeroScene') as HeroScene;;
        sceneRef.current?.registerReactVars({
            setWinner: setWinner,
            winner: winner,
            setPlayerPopOpen: setPlayerPopUpEvent,
            playersRef: playersRef,
        });

        return () => {
            gameRef.current?.destroy(true);
        };
    });

    useEffect(() => {
        sceneRef.current?.registerReactVars({
            setWinner: setWinner,
            winner: winner,
            setPlayerPopOpen: setPlayerPopUpEvent,
            playersRef: playersRef,
        });
    }, [setWinner, winner, setPlayerPopUpEvent, playersRef]);

    const handleRematch = () => {
        if (gameRef.current && sceneRef.current) {
            gameRef.current.scene.scenes[0].scene.restart();
            setWinner(undefined); // Reset the winner state
            sceneRef.current.resumeGame();
        }
    };

    const handleRecruit = (playerID?: number): void => {
        if (playerID === undefined) return
        if (playersRef.current === null) return

        playersRef.current[playerID].buyDrone()
    }

    const handleGarrisonDrone = (playerID?: number): void => {
        if (playerID === undefined) return
        if (playersRef.current === null) return

        playersRef.current[playerID].garrisonDrone()
    }

    const handleBringDrone = (playerID?: number): void => {
        if (playerID === undefined) return
        if (playersRef.current === null) return

        playersRef.current[playerID].bringGarrisonDrone()
    }

    return (
        <>
            <div className="relative w-full h-full overflow-visible" ref={gameContainerRef}>
                    {playersRef.current.map(player => (
                        playerPopUpEvent !== undefined && playerPopUpEvent.playerID === player.team.id && (
                            <CityPopup
                                key={player.team.id}
                                anchorPoint={playerPopUpEvent.point}
                                recruitFunc={() => handleRecruit(player.team.id)}
                                garrisonFunc={() => handleGarrisonDrone(player.team.id)}
                                bringFunc={() => handleBringDrone(player.team.id)}
                            />
                        )
                    ))}
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