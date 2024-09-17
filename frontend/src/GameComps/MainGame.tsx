import React, {useEffect, useRef, useState} from 'react';
import Phaser from 'phaser';
import {preload, create, update, resumeGame} from "./PhaserFuncs";
import {CityPopup} from "../UI-Comps/CityPopup";
import {Player} from "./Player";
import {popUpEvent, Team} from "../types/types";
import {Castle} from "./Castle";
import {ParticleSystem} from "./ParticleSystem";

declare global {
    namespace Phaser {
        interface Scene {
            winner?: string | undefined;
            setWinner?: React.Dispatch<React.SetStateAction<string | undefined>>;
            players?: Player[];
            teams: Team[];
            castles?: Castle[];
            particleSystem?: ParticleSystem;
            setPlayerPopOpen?: React.Dispatch<React.SetStateAction<popUpEvent | undefined>>;
        }
    }
}

const MainGame: React.FC = () => {
    const gameContainerRef = useRef(null);
    const gameRef = useRef<Phaser.Game | null>(null);
    const playersRef = useRef<Player[] | null>(null);
    const [playerPopUpEvent, setPlayerPopUpEvent] = useState<popUpEvent | undefined>(undefined);
    const [winner, setWinner] = useState<string | undefined>(undefined);

    useEffect(() => {
        const config: Phaser.Types.Core.GameConfig = {
            type: Phaser.AUTO,
            width: '100%',
            height: '100%',
            parent: gameContainerRef.current,
            scene: {
                preload: preload,
                create: function () {
                    create.call(this);
                    // Register React-Phaser connection vars
                    this.setWinner = setWinner;
                    this.winner = winner;
                    this.setPlayerPopOpen = setPlayerPopUpEvent;
                    playersRef.current = this.players || [];
                },
                update: update,
            }
        };

        gameRef.current = new Phaser.Game(config);

        return () => {
            gameRef.current?.destroy(true);
        };
    }, []);

    const handleRematch = () => {
        if (gameRef.current) {
            gameRef.current.scene.scenes[0].scene.restart();
            setWinner(undefined); // Reset the winner state
            resumeGame();
        }
    };

    const handleRecruit = (playerID?: number): void => {
        if (playerID === undefined) return
        if (playersRef.current === null) return

        playersRef.current[playerID].buyDrone()
    }

    // justify-center items-center
    return (
        <>
            <div className="relative w-full h-full overflow-visible" ref={gameContainerRef}>
                    {playersRef.current && playersRef.current.map(player => (
                        playerPopUpEvent !== undefined && playerPopUpEvent.playerID === player.team.id && (
                            <CityPopup
                                key={player.team.id}
                                anchorPoint={playerPopUpEvent.point}
                                recruitFunc={() => handleRecruit(player.team.id)}
                                garrisonFunc={() => {}}
                                bringFunc={() => {}}
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