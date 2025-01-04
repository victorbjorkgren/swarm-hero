import {FactionSelection} from "./FactionSelection";
import React, {useState} from "react";
import {CharacterStats, StatSelection} from "./StatSelection";
import {Character, Factions} from "../../../types/types";
import {Client, ClientID} from "@shared/commTypes";

enum Steps {
    Faction,
    Stats,
    MatchMaking
}

export type PeerMap = Map<ClientID, Client>;

export type GameConnection = {
    localId: ClientID,
    hostId: ClientID,
    peers: PeerMap
}

interface Props {
    doneCallback: (character: Character) => void;
    gameOn: boolean;
    backToMain: ()=>void;
}

let character: Character | null = null;

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

export const MainCharacterCreation: React.FC<Props> = ({doneCallback, backToMain}) => {
    const [currentStep, setCurrentStep] = useState<Steps>(Steps.Faction);
    const [name, setName] = useState<string>(devCharacter.playerName || "");
    const [faction, setFaction] = useState<Factions | null>(devCharacter.faction || null);

    const factionDone = (name: string, faction: Factions) => {
        setName(name);
        setFaction(faction);
        setCurrentStep(Steps.Stats);
    }

    const statsDone = (stats: CharacterStats) => {
        if (name.length < 1 && faction === null) return;
        character = {
            playerName: name,
            faction: faction!,
            stats: stats,
        }
        doneCallback(character);
    }

    const handleBack = () => {
        setCurrentStep(Steps.Faction)
    }

    return (
            <>
                {currentStep === Steps.Faction &&
                    <FactionSelection
                        doneCallback={factionDone}
                        handleBack={backToMain}
                        defaultName={name}
                        defaultFaction={faction}
                    />}
                {currentStep === Steps.Stats &&
                    <StatSelection
                        doneCallback={statsDone}
                        handleBack={handleBack}
                        defaultStats={devCharacter.stats || null}
                    /> }
            </>
    );
};