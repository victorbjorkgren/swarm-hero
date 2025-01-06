import {useGameBackground} from "../../../Hooks/useGameBackground";
import React, {useEffect, useRef, useState} from "react";
import LoginForm from "./LoginForm";
import {TitleScreen} from "../TitleScreen";
import {GameConnection, MainCharacterCreation} from "../CharacterCreation/MainCharacterCreation";
import {MatchMaking} from "../MatchMaking";
import {Character} from "../../../types/types";
import {LoginVerification} from "./LoginVerification";
import {useLogin} from "../../../Hooks/useAuth";
import {Assets, Spritesheet, Texture} from "pixi.js";
import {TutorialScreen} from "../TutorialScreen";
import {AboutScreen} from "../AboutScreen";
import {BuildTime} from "../BuildTime";

enum Screens {
    RequestCode,
    VerifyCode,
    Title,
    Tutorial,
    About,
    CharacterCreation,
    MatchMaking
}

type Props = {
    enterGameCallback: (characterSheet: Character, incomingConnection: GameConnection) => void;
    gameOn: boolean;
}

export const LobbyMain = ({enterGameCallback, gameOn}: Props) => {
    const [currentStep, setCurrentStep] = useState<Screens | null>(null);
    const email = useRef<string>("");
    const sceneContainerRef = useGameBackground();
    const character = useRef<Character | null>(null);

    const { authenticated } = useLogin();

    const handleNewGame = () => {
        setCurrentStep(Screens.CharacterCreation);
    }

    const handleTutorial = () => {
        setCurrentStep(Screens.Tutorial);
    }

    const handleAbout = () => {
        setCurrentStep(Screens.About);
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

    useEffect(() => {
        if (authenticated) {
            setCurrentStep(Screens.Title);
        } else {
            setCurrentStep(Screens.RequestCode);
        }
    }, [authenticated]);


    if (currentStep === null) {
        return <div className="w-screen h-screen bg-transparent flex items-center justify-center text-white">Loading...</div>;
    }

    return (
        <div className={`w-screen h-screen bg-green-950`}>
            <BuildTime />
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
                    <TitleScreen newGameCallback={handleNewGame} tutorialCallback={handleTutorial} aboutCallback={handleAbout} />
                )}
                {currentStep === Screens.Tutorial && (
                    <TutorialScreen backToMain={toTitle} />
                )}
                {currentStep === Screens.About && (
                    <AboutScreen backToMain={toTitle} />
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