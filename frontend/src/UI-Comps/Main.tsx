import {useRef, useState} from "react";
import {MainCharacterCreation} from "./CharacterCreation/MainCharacterCreation";
import MainGame from "./InGame/MainGame";
import {Factions} from "./CharacterCreation/FactionSelection";
import {Character} from "../types/types";

enum Scenes {
    CharacterCreation,
    MainGame
}

const devCharacter: Character = {
    playerName: "MasterDev!",
    faction: Factions.Wild,
    stats: {
        health: 3,
        speed: 3,
        magicPower: 3,
        magicStamina: 3
    }
}

export const Main = () => {
    const [currentScene, setCurrentScene] = useState<Scenes>(Scenes.CharacterCreation)

    const characterRef = useRef<Character | null>(devCharacter);


    const characterCreationDone = (newCharacter: Character) => {
        characterRef.current = newCharacter;
        setCurrentScene(Scenes.MainGame);
    }

    const gameDone = () => {
        setCurrentScene(Scenes.CharacterCreation);
    }

    return (
        <>
            {currentScene === Scenes.CharacterCreation
                && <MainCharacterCreation doneCallback={characterCreationDone} defaultCharacter={characterRef.current}/>}
            {currentScene === Scenes.MainGame
                && <MainGame character={characterRef.current} doneCallback={gameDone}/>}
        </>
    );
};