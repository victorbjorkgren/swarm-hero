import React, {useEffect, useRef, useState} from 'react';
import HeroGameLoop from "../../GameComps/HeroGameLoop";
import {CityPopup} from "./CityPopup";
import {Player} from "../../GameComps/Player";
import {popUpEvent} from "../../types/types";
import {Application} from "pixi.js";
import {Keyboard} from "../../GameComps/Keyboard";
import {Vector2D} from "../../GameComps/Utility";
import {WinnerDisplay} from "./WinnerDisplay";
import {PlayerBar} from "./PlayerBar";
import {Units} from "../../types/unitTypes";
import {Character} from "../CharacterCreation/MainCharacterCreation";


interface Props {
    character: Character | null;
    doneCallback: ()=>void;
}

const MainGame: React.FC<Props> = ({character, doneCallback}) => {
    const gameContainerRef = useRef<HTMLDivElement | null>(null);
    const playersRef = useRef<Player[]>([]);
    const gameSceneRef = useRef<HeroGameLoop | null>(null);
    const pixiRef = useRef<Application | null>(null);

    const [gameContainerStyle, setGameContainerStyle] = useState<React.CSSProperties>({});
    const [playerPopUpEvent, setPlayerPopUpEvent] = useState<popUpEvent | undefined>(undefined);
    const [winner, setWinner] = useState<string | undefined>(undefined);
    const [dayTime, setDayTime] = useState<number>(0);

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
        if (character === null) return;

        Keyboard.initialize();
        const screenVector = resizeApp();

        pixiRef.current = new Application();
        await pixiRef.current.init({
            background: '#72b372',
            width: screenVector.x,
            height: screenVector.y,
            antialias: true
        });

        if (gameContainerRef.current) {
            gameContainerRef.current.appendChild(pixiRef.current.canvas);
        }

        pixiRef.current.stage.eventMode = 'static';
        pixiRef.current.stage.hitArea = pixiRef.current.screen;

        gameSceneRef.current = new HeroGameLoop(
            pixiRef.current,
            setWinner,
            setPlayerPopUpEvent,
            playersRef,
            setDayTime,
            character,
        );

        gameSceneRef.current.start();
    };

    useEffect(() => {
        initGame();

        return () => {
            cleanUpGame();
        };
    }, [character]);

    const cleanUpGame = () => {
        if (gameSceneRef.current) {
            gameSceneRef.current.stopGame();
            gameSceneRef.current.resetControllers();
            gameSceneRef.current = null;
        }

        if (pixiRef.current && pixiRef.current.renderer) {
            gameContainerRef.current?.removeChild(pixiRef.current.canvas);
            pixiRef.current.destroy();
            pixiRef.current = null;
        }

        setWinner(undefined);
    }

    const handleRematch = () => {
        cleanUpGame();
        doneCallback();
    };

    const handleRecruit = (unit: Units, n: number): boolean => {
        if (gameSceneRef.current === null) return false
        if (gameSceneRef.current.localPlayer === null) return false
        return gameSceneRef.current.localPlayer.buyDrone(unit, n);
    }

    const handleGarrisonDrone = (unit: Units, n: number): boolean => {
        if (gameSceneRef.current === null) return false
        if (gameSceneRef.current.localPlayer === null) return false
        return gameSceneRef.current.localPlayer.garrisonDrones(unit, n);
    }

    const handleBringDrone = (unit: Units, n: number): boolean => {
        if (gameSceneRef.current === null) return false
        if (gameSceneRef.current.localPlayer === null) return false
        return gameSceneRef.current.localPlayer.bringGarrisonDrone(unit, n);
    }

    return (
        <>
            <div className="relative w-screen h-screen bg-green-950 flex items-center justify-center overflow-visible">
                <div style={gameContainerStyle} className="relative">
                    <div style={{width: `${100 * dayTime}%`}} className="absolute h-2 top-1 left-0 bg-green-100"></div>
                    <div
                        ref={gameContainerRef}
                        className={`
                        ${winner === undefined ? "" : "opacity-50 blur-sm saturate-0"}
                        ${gameSceneRef.current?.localPlayer?.popUpCastle !== null ? "blur-sm opacity-50": ""} 
                        transition duration-1000
                        `}
                    ></div>
                    <CityPopup
                        anchorPoint={playerPopUpEvent?.castle.pos}
                        player={gameSceneRef.current?.localPlayer}
                        recruitFunc={handleRecruit}
                    />
                    {winner === undefined &&
                        <PlayerBar
                            pickerCallback={(spell, castingDoneCallback) => {
                                gameSceneRef.current?.localPlayer?.prepareSpell(spell, castingDoneCallback)
                            }}
                            player={gameSceneRef.current ? gameSceneRef.current.localPlayer : null}
                        />}
                    <WinnerDisplay winner={winner} handleRematch={handleRematch} />
                </div>
            </div>
        </>
    );
};

export default MainGame;