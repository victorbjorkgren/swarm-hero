import {useRef, useState} from "react";
import {Character, MainCharacterCreation} from "./CharacterCreation/MainCharacterCreation";
import MainGame from "./InGame/MainGame";

enum Scenes {
    CharacterCreation,
    MainGame
}

export const Main = () => {
    const [currentScene, setCurrentScene] = useState<Scenes>(Scenes.CharacterCreation)

    const characterRef = useRef<Character | null>(null);


    const characterCreationDone = (newCharacter: Character) => {
        characterRef.current = newCharacter;
        setCurrentScene(Scenes.MainGame);
    }

    const gameDone = () => {
        setCurrentScene(Scenes.CharacterCreation);
    }

    return (
        <>
            {currentScene === Scenes.CharacterCreation && <MainCharacterCreation doneCallback={characterCreationDone} />}
            {currentScene === Scenes.MainGame && <MainGame character={characterRef.current} doneCallback={gameDone}/>}
        </>
    );
};