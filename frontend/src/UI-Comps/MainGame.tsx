import React, {useEffect, useRef, useState} from 'react';
import HeroGameLoop from "../GameComps/HeroGameLoop";
import {CityPopup} from "./CityPopup";
import {Player} from "../GameComps/Player";
import {popUpEvent} from "../types/types";
import {Application, Assets, Sprite} from "pixi.js";
import {Keyboard} from "../GameComps/Keyboard";
import {Vector2D} from "../GameComps/Utility";
import {WinnerDisplay} from "./WinnerDisplay";
import {PlayerBar} from "./PlayerBar";
import {SpellPack} from "./SpellPicker";


const MainGame: React.FC = () => {
    const gameContainerRef = useRef<HTMLDivElement | null>(null);
    const playersRef = useRef<Player[]>([]);
    const gameSceneRef = useRef<HeroGameLoop | null>(null);
    const pixiRef = useRef<Application | null>(null);

    const [gameContainerStyle, setGameContainerStyle] = useState<React.CSSProperties>({});
    const [playerPopUpEvent, setPlayerPopUpEvent] = useState<popUpEvent | undefined>(undefined);
    const [winner, setWinner] = useState<string | undefined>(undefined);
    const [dayTime, setDayTime] = useState<number>(0);
    const [spellSlots, setSpellSlots] = useState<SpellPack[]>([]);

    const resizeApp = (): Vector2D => {
        const ASPECT_RATIO = 16 / 9;

        const containerWidth = window.innerWidth;
        const containerHeight = window.innerHeight;

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
        return new Vector2D(newWidth, newHeight);

    }

    // window.addEventListener('resize', resizeApp);

    const initGame = async () => {
        if (pixiRef.current !== null) return;

        Keyboard.initialize();
        const screenVector = resizeApp();

        pixiRef.current = new Application();
        await pixiRef.current.init({
            background: '#72b372',
            width: screenVector.x,
            height: screenVector.y,
        });

        if (gameContainerRef.current) {
            gameContainerRef.current.appendChild(pixiRef.current.canvas);
        }

        pixiRef.current.stage.eventMode = 'static';
        pixiRef.current.stage.hitArea = pixiRef.current.screen;

        gameSceneRef.current = new HeroGameLoop(
            pixiRef.current,
            setWinner,
            winner,
            setPlayerPopUpEvent,
            playersRef,
            setDayTime,
            setSpellSlots,
        );

        gameSceneRef.current.start();
    };

    useEffect(() => {
        initGame();

        return () => {
            if (gameSceneRef.current) {
                gameSceneRef.current.stopGame();
                gameSceneRef.current.resetControllers();
                gameSceneRef.current = null;
            }

            if (pixiRef.current && pixiRef.current.renderer) {
                pixiRef.current.destroy();
                pixiRef.current = null;
            }
        };
    }, []);

    const handleRematch = () => {
        if (gameSceneRef.current) {
            gameSceneRef.current.stopGame();
            gameSceneRef.current.resetControllers();
            gameSceneRef.current = null;
        }

        if (pixiRef.current && pixiRef.current.renderer) {
            pixiRef.current.destroy();
            pixiRef.current = null;
        }
        setWinner(undefined); // Reset the winner state
            // gameSceneRef.current.start();
        initGame();
    };

    const handleRecruit = (playerID: number, n: number): boolean => {
        if (playerID === undefined) return false
        if (playersRef.current === null) return false
        const success = playersRef.current[playerID].buyDrone(n);
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
            <div className="relative w-screen h-screen bg-green-950 flex items-center justify-center overflow-visible">
                <div style={gameContainerStyle} className="relative">
                    <div style={{width: `${100 * dayTime}%`}} className="absolute h-2 top-1 left-0 bg-green-100"></div>
                    <div ref={gameContainerRef}></div>
                    {playersRef.current.map(player => (
                        playerPopUpEvent !== undefined && playerPopUpEvent.playerID === player.team.id && (
                                <CityPopup
                                    key={player.team.id}
                                    anchorPoint={playerPopUpEvent.point}
                                    player={player}
                                    recruitFunc={(n) => {
                                        return handleRecruit(player.team.id, n);
                                    }}
                                    garrisonFunc={() => {
                                        return handleGarrisonDrone(player.team.id)
                                    }}
                                    bringFunc={() => {
                                        return handleBringDrone(player.team.id);
                                    }}
                                />
                            )
                        ))
                    }
                    <PlayerBar
                        pickerCallback={(spell, castingDoneCallback)=>{gameSceneRef.current?.localPlayer?.prepareSpell(spell, castingDoneCallback)}}
                        spellSlots={spellSlots}
                        player={gameSceneRef.current ? gameSceneRef.current.localPlayer : null}
                    />
                    <WinnerDisplay winner={winner} handleRematch={handleRematch} />
                </div>
            </div>
        </>
    );
};

export default MainGame;