import React, {useEffect, useState} from "react";
import {StatSlider} from "./StatSlider";

export interface CharacterStats {
    health: number,
    speed: number,
    magicPower: number,
    magicStamina: number,
}

interface Props {
    doneCallback: (stats: CharacterStats)=>void;
}

export const StatSelection: React.FC<Props> = ({doneCallback}) => {
    const MAX_POINTS = 12;

    const [health, setHealth] = useState<number>(0);
    const [speed, setSpeed] = useState<number>(0);
    const [magicPower, setMagicPower] = useState<number>(0);
    const [magicStamina, setMagicStamina] = useState<number>(0);

    const [pointsLeft, setPointsLeft] = useState<number>(MAX_POINTS);
    const [ready, setReady] = useState<boolean>(false);

    useEffect(() => {
        const pointsToSet = MAX_POINTS - health - speed - magicPower - magicStamina;
        setPointsLeft(pointsToSet);
        if (pointsToSet === 0) {
            setReady(true);
        } else {
            setReady(false);
        }
    }, [health, speed, magicPower, magicStamina]);

    const handleNewHealth = (n: number): void => {
        if (pointsLeft > 0 && n > 0) {
            setHealth(health + n);
        } else if (n < 0) {
            setHealth(health + n)
        }
    }

    const handleNewSpeed = (n: number): void => {
        if (pointsLeft > 0 && n > 0) {
            setSpeed(speed + n);
        } else if (n < 0) {
            setSpeed(speed + n)
        }
    }

    const handleNewPower = (n: number): void => {
        if (pointsLeft > 0 && n > 0) {
            setMagicPower(magicPower + n);
        } else if (n < 0) {
            setMagicPower(magicPower + n)
        }
    }

    const handleNewStamina = (n: number): void => {
        if (pointsLeft > 0 && n > 0) {
            setMagicStamina(magicStamina + n);
        } else if (n < 0) {
            setMagicStamina(magicStamina + n)
        }
    }

    return (
        <div className={`flex flex-col gap-10 items-center justify-center w-screen h-screen`}>
            <StatSlider label={"Health"} value={health} setValue={handleNewHealth} />
            <StatSlider label={"Speed"} value={speed} setValue={handleNewSpeed} />
            <StatSlider label={"Wisdom"} value={magicPower} setValue={handleNewPower} />
            <StatSlider label={"Grit"} value={magicStamina} setValue={handleNewStamina} />
            <span className={`text-xl`}>Points Left: {pointsLeft}</span>
            <button
                className={`bg-white text-white text-2xl bg-opacity-10 w-44 h-12 ${ready ? "hover:bg-opacity-40 active:bg-opacity-90" : "opacity-30"} border border-white rounded-xl`}
                onClick={() => doneCallback({health: health, speed: speed, magicPower: magicPower, magicStamina: magicStamina})}>
                Done
            </button>
        </div>
    );
};