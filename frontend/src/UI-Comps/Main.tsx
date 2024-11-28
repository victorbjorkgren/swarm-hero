import {useRef, useState} from "react";
import {GameConnection, MainCharacterCreation, PeerMap} from "./Lobby/CharacterCreation/MainCharacterCreation";
import MainGame from "./InGame/MainGame";
import {Character, Factions} from "../types/types";
import {LobbyMain} from "./Lobby/Login/LobbyMain";

enum Scenes {
    Lobby,
    MainGame
}

export const Main = () => {
    const [currentScene, setCurrentScene] = useState<Scenes>(Scenes.Lobby)
    const [gameOn, setGameOn] = useState<boolean>(false)

    const characterRef = useRef<Character | null>(null);
    const connectionData = useRef<GameConnection | null>(null);

    const enterGame = (characterSheet: Character, incomingConnection: GameConnection) => {
        characterRef.current = characterSheet;
        connectionData.current = incomingConnection;
        setGameOn(true);
        setCurrentScene(Scenes.MainGame);
    }

    const gameDone = () => {
        setGameOn(false);
        setCurrentScene(Scenes.Lobby);
    }

    return (
        <>
            {currentScene === Scenes.Lobby &&
                <LobbyMain enterGameCallback={enterGame} gameOn={gameOn} />
            }
            {currentScene === Scenes.MainGame &&
                <MainGame character={characterRef.current} connection={connectionData.current} doneCallback={gameDone}/>
            }
        </>
    );
};