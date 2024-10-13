import {Factions, FactionSelection} from "./FactionSelection";
import React, {useEffect, useRef, useState} from "react";
import {CharacterStats, StatSelection} from "./StatSelection";
import {Application} from "pixi.js";
import {setupBackground} from "../../GameComps/Graphics/TileBackground";
import {TitleScreen} from "./TitleScreen";

enum Steps {
    TitleScreen,
    Faction,
    Stats
}

export interface Character {
    playerName: string;
    faction: Factions;
    stats: CharacterStats
}

interface Props {
    doneCallback: (charactor: Character) => void;
    defaultCharacter: Character | null;
}

export const MainCharacterCreation: React.FC<Props> = ({doneCallback, defaultCharacter}) => {
    const [currentStep, setCurrentStep] = useState<Steps>(Steps.TitleScreen);
    const [name, setName] = useState<string>(defaultCharacter?.playerName || "");
    const [faction, setFaction] = useState<Factions | null>(defaultCharacter?.faction || null);

    const pixiRef = useRef<Application | null>(null);
    const sceneContainerRef = useRef<HTMLDivElement | null>(null);

    const initScene = async () => {
        if (pixiRef.current !== null) return;

        pixiRef.current = new Application();
        await pixiRef.current.init({
            background: '#72b372',
            width: window.innerWidth,
            height: window.innerHeight,
            antialias: true,
            eventMode: "none",
        });

        if (sceneContainerRef.current) {
            sceneContainerRef.current.appendChild(pixiRef.current.canvas);
        }

        await setupBackground(pixiRef.current, window.innerWidth, window.innerHeight);
    }

    const cleanUpScene = () => {
        if (pixiRef.current && pixiRef.current.renderer) {
            sceneContainerRef.current?.removeChild(pixiRef.current.canvas);
            pixiRef.current.destroy();
            pixiRef.current = null;
        }
    }

    useEffect(() => {
        initScene();

        return () => {
            cleanUpScene();
        };
    }, []);

    const factionDone = (name: string, faction: Factions) => {
        setName(name);
        setFaction(faction);
        setCurrentStep(Steps.Stats);
    }

    const statsDone = (stats: CharacterStats) => {
        if (name.length < 1 && faction === null) return;
        const character = {
            playerName: name,
            faction: faction!,
            stats: stats,
        }
        doneCallback(character);
    }

    const handleNewGame = () => {
        setCurrentStep(Steps.Faction);
    }

    const handleBackToMain = () => {
        setCurrentStep(Steps.TitleScreen)
    }

    return (
        <div className={`w-screen h-screen bg-green-950`}>
            <div ref={sceneContainerRef} className={`absolute saturate-0 opacity-50`}></div>
            <div className={`absolute flex flex-col w-full h-full text-white`}>
                {currentStep === Steps.TitleScreen &&
                    <TitleScreen
                        newGameCallback={handleNewGame}/>}
                {currentStep === Steps.Faction &&
                    <FactionSelection
                        doneCallback={factionDone}
                        handleBack={handleBackToMain}
                        defaultName={name}
                        defaultFaction={faction}
                    />}
                {currentStep === Steps.Stats &&
                    <StatSelection
                        doneCallback={statsDone}
                        handleBack={handleBackToMain}
                        defaultStats={defaultCharacter?.stats || null}
                    /> }
            </div>
        </div>
    );
};