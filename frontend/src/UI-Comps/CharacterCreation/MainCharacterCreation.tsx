import {Factions, FactionSelection} from "./FactionSelection";
import React, {useEffect, useRef, useState} from "react";
import {CharacterStats, StatSelection} from "./StatSelection";
import {Application} from "pixi.js";
import {setupBackground} from "../../GameComps/Graphics/TileBackground";

enum Steps {
    Faction,
    Stats
}

export interface Character {
    playerName: string;
    faction: Factions;
    stats: CharacterStats
}

interface Props {
    doneCallback: (charactor: Character) => void
}

export const MainCharacterCreation: React.FC<Props> = ({doneCallback}) => {
    const [currentStep, setCurrentStep] = useState<Steps>(Steps.Faction);
    const [name, setName] = useState<string>('');
    const [faction, setFaction] = useState<Factions | null>(null);
    // const [stats, setStats] = useState<CharacterStats | null>(null);

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

    return (
        <div className={`w-screen h-screen bg-green-950`}>
            <div ref={sceneContainerRef} className={`absolute saturate-0 opacity-50`}></div>
            <div className={`absolute flex flex-col w-full h-full text-white`}>
                {currentStep === Steps.Faction && <FactionSelection doneCallback={factionDone} />}
                {currentStep === Steps.Stats && <StatSelection doneCallback={statsDone} /> }
            </div>
        </div>
    );
};