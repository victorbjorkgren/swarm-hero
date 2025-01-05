import {FactionSelection} from "./FactionSelection";
import React, {useEffect, useState} from "react";
import {CharacterStats, StatSelection} from "./StatSelection";
import {Character, Factions} from "../../../types/types";
import {Client, ClientID} from "@shared/commTypes";
import * as process from "node:process";
import {Assets} from "pixi.js";

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

const DEVELOPMENT = true;

const devCharacter: Character = {
    playerName: "MasterDev!",
    faction: Factions.Wild,
    stats: {
        health: 3,
        speed: 3,
        magicPower: 3,
        magicStamina: 3
    }
};

export const MainCharacterCreation: React.FC<Props> = ({doneCallback, backToMain}) => {
    const [currentStep, setCurrentStep] = useState<Steps>(Steps.Faction);
    const [name, setName] = useState<string>(DEVELOPMENT ? devCharacter.playerName : "");
    const [faction, setFaction] = useState<Factions | null>(DEVELOPMENT ? devCharacter.faction : null);

    // Let's load em here because why not
    useEffect(() => {
        Assets.load('/sprites/black_cat_run.json');
        Assets.load('/sprites/explosion_toon.json');
        Assets.load('/sprites/magic/tree-of-glory.json');
        Assets.load('/sprites/magic/tree-of-glory-idle.json');
        Assets.load('/sprites/magic/blue_doom.json');
        Assets.load('/sprites/magic/blue_doom_idle.json');
        Assets.load('/sprites/gold_mine.png');
        Assets.load('/sprites/gold_mine_2.png');
        Assets.load('/sprites/red_flag.png');
        Assets.load('/sprites/blue_flag.png');
        Assets.load('/sprites/castle-sprite.png');
        Assets.load('/sprites/castle-sprite-highlight.png');
    }, []);

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
                        defaultStats={DEVELOPMENT ? devCharacter.stats : null}
                    /> }
            </>
    );
};