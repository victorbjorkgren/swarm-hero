import React, {useEffect, useRef, useState} from "react";
import {SpellICon} from "./SpellICon";
import {SpellPack} from "../../types/spellTypes";

interface Props {
    spell: SpellPack;
    slot: number;
    pickerCallback: (spell: SpellPack, castingDoneCallback: (didCast: boolean)=>void) => void;
}

export const SpellCastIcon: React.FC<Props> = ({spell, slot, pickerCallback}) => {
    const [isActive, setIsActive] = useState<boolean>(false);
    const [isCoolingDown, setIsCoolingDown] = useState(false);
    const isCoolingDownRef = useRef(isCoolingDown);
    const [coolDownProgress, setCoolDownProgress] = useState(0);

    const handleClick = (spell: SpellPack) => {
        if (isCoolingDownRef.current) return;
        setIsActive(true);
        pickerCallback(spell, (didCast)=> {
            didCast && startCoolDown();
            setIsActive(false);
        });
    }

    const startCoolDown = () => {
        if (!isCoolingDownRef.current) {
            setIsCoolingDown(true);
            isCoolingDownRef.current = true;
            setCoolDownProgress(100);
        }
    };

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === slot.toString()) {
                if (isCoolingDownRef.current) return;
                handleClick(spell);
            }
        };

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [handleClick, slot, spell]);

    useEffect(() => {
        let interval: NodeJS.Timer;

        if (isCoolingDown) {
            setIsActive(false);
            interval = setInterval(() => {
                setCoolDownProgress((prevProgress: number) => {
                    const newProgress = prevProgress - 100 / (spell.coolDown * 60); // Decrease based on FPS (60)
                    if (newProgress <= 0) {
                        setIsCoolingDown(false);
                        isCoolingDownRef.current = false;
                        return 0;
                    }
                    return newProgress;
                });
            }, 1000 / 60); // 60 FPS for smooth animation
        }

        return () => clearInterval(interval); // Clean up interval on unmount
    }, [isCoolingDown, spell.coolDown]);

    return (
        <div
            className={`relative select-none`}
            onClick={() => handleClick(spell)}
        >
            {/* Cool-down overlay */}
            {isCoolingDown && (
                <div
                    className="absolute top-0 left-0 w-full h-full bg-white bg-opacity-90 rounded-xl"
                    style={{
                        width: `${coolDownProgress}%`,
                    }}
                />
            )}
            <div className={`flex flex-col flex-grow px-3.5 w-full aspect-square bg-gray-300 bg-opacity-20 ${isActive ? "bg-opacity-90" : ""} ${isCoolingDown ? "opacity-30" : "active:bg-opacity-90 hover:bg-opacity-70"} text-7xl rounded-xl shadow p-2 transition duration-100 items-center border border-white pointer-events-auto`}>
                <span className="absolute top-1 left-2 text-xs">{slot}</span>
                <SpellICon spell={spell} />
            </div>
        </div>
    );
};