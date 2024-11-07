import {useRef, useState} from "react";
import {GameConnection, MainCharacterCreation, PeerMap} from "./CharacterCreation/MainCharacterCreation";
import MainGame from "./InGame/MainGame";
import {Character, Factions} from "../types/types";

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
    const [gameOn, setGameOn] = useState<boolean>(false)

    const characterRef = useRef<Character | null>(devCharacter);
    const connectionData = useRef<GameConnection | null>(null);


    const characterCreationDone = (newCharacter: Character, incomingConnection: GameConnection) => {
        characterRef.current = newCharacter;
        connectionData.current = incomingConnection;
        setGameOn(true);
        setCurrentScene(Scenes.MainGame);
    }

    const gameDone = () => {
        setGameOn(false);
        setCurrentScene(Scenes.CharacterCreation);
    }

    return (
        <>
            {currentScene === Scenes.CharacterCreation
                && <MainCharacterCreation doneCallback={characterCreationDone} defaultCharacter={characterRef.current} gameOn={gameOn} />}
            {currentScene === Scenes.MainGame
                && <MainGame character={characterRef.current} connection={connectionData.current} doneCallback={gameDone}/>}
        </>
    );
};