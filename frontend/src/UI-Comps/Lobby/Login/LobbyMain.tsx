import {useGameBackground} from "../../../Hooks/useGameBackground";
import React, {useRef, useState} from "react";
import LoginForm from "./LoginForm";
import {TitleScreen} from "../TitleScreen";
import {GameConnection, MainCharacterCreation} from "../CharacterCreation/MainCharacterCreation";
import {MatchMaking} from "../MatchMaking";
import {Character} from "../../../types/types";
import {LoginVerification} from "./LoginVerification";

enum Screens {
    RequestCode,
    VerifyCode,
    Title,
    CharacterCreation,
    MatchMaking
}

type Props = {
    enterGameCallback: (characterSheet: Character, incomingConnection: GameConnection) => void;
    gameOn: boolean;
}

export const LobbyMain = ({enterGameCallback, gameOn}: Props) => {
    const [currentStep, setCurrentStep] = useState<Screens>(Screens.RequestCode);
    const email = useRef<string>("");

    const sceneContainerRef = useGameBackground();

    const character = useRef<Character | null>(null);

    const handleNewGame = () => {
        setCurrentStep(Screens.CharacterCreation);
    }

    const toTitle = () => {
        setCurrentStep(Screens.Title);
    }

    const characterDone = (incomingCharacter: Character) => {
        character.current = incomingCharacter;
        setCurrentStep(Screens.MatchMaking);
    }

    const matchMakingDone = (connectionData: GameConnection) => {
        if (!character.current) throw new Error("Matchmaking without character sheet!")
        enterGameCallback(character.current, connectionData);
    }




    return (
        <div className={`w-screen h-screen bg-green-950`}>
            <div ref={sceneContainerRef} className={`absolute saturate-0 opacity-50`} />
            <div className={`absolute flex flex-col w-full h-full text-white`}>
                {currentStep === Screens.RequestCode && (
                    <LoginForm successCallback={(userEmail: string) => {
                        email.current = userEmail;
                        setCurrentStep(Screens.VerifyCode);
                    }}/>
                )}
                {currentStep === Screens.VerifyCode && (
                    <LoginVerification
                        email={email.current}
                        handleBack={() => setCurrentStep(Screens.RequestCode)}
                        handleSucess={() => setCurrentStep(Screens.Title)}
                    />
                )}
                {currentStep === Screens.Title && (
                    <TitleScreen newGameCallback={handleNewGame} />
                )}
                {currentStep === Screens.CharacterCreation && (
                    <MainCharacterCreation doneCallback={characterDone} gameOn={gameOn} backToMain={toTitle} />
                )}
                {currentStep === Screens.MatchMaking &&
                    <MatchMaking
                        doneCallback={matchMakingDone}
                        handleBack={toTitle}
                        gameOn={gameOn}
                    />}
            </div>
        </div>
    );
};