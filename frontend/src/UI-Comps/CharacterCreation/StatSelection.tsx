import React, {useEffect, useState} from "react";
import {StatSlider} from "./StatSlider";
import {BackButton} from "./BackButton";

export interface CharacterStats {
    health: number,
    speed: number,
    magicPower: number,
    magicStamina: number,
}

interface Props {
    doneCallback: (stats: CharacterStats)=>void;
    handleBack: ()=>void;
    defaultStats: CharacterStats | null;
}

export const StatSelection: React.FC<Props> = ({doneCallback, handleBack, defaultStats}) => {
    const MAX_POINTS = 12;

    const [health, setHealth] = useState<number>(defaultStats?.health || 0);
    const [speed, setSpeed] = useState<number>(defaultStats?.speed || 0);
    const [magicPower, setMagicPower] = useState<number>(defaultStats?.magicPower || 0);
    const [magicStamina, setMagicStamina] = useState<number>(defaultStats?.magicStamina || 0);

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
        <>
            <BackButton handleBack={handleBack}/>
            <div className={`flex flex-col gap-2 sm:gap-2 lg:gap-10 items-center justify-center w-screen h-screen max-w-full max-h-full`}>
                <StatSlider label={"Health"} value={health} setValue={handleNewHealth} />
                <StatSlider label={"Speed"} value={speed} setValue={handleNewSpeed} />
                <StatSlider label={"Wisdom"} value={magicPower} setValue={handleNewPower} />
                <StatSlider label={"Grit"} value={magicStamina} setValue={handleNewStamina} />
                <span className={`lg:text-xl sm:text-lg text-sm select-none`}>Points Left: {pointsLeft}</span>
                <button
                    className={`bg-white text-white lg:text-2xl sm:text-xl text-xs bg-opacity-10 lg:w-44 sm:w-36 w-24 lg:h-12 sm:h-8 h-6 ${ready ? "hover:bg-opacity-40 active:bg-opacity-90" : "opacity-30"} border border-white rounded-xl`}
                    onClick={() => doneCallback({health: health, speed: speed, magicPower: magicPower, magicStamina: magicStamina})}>
                    Done
                </button>
            </div>
        </>
    );
};