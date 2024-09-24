import React, {useEffect, useState} from "react";
import {Vector2D} from "../GameComps/Utility";
import { GiLaserBurst } from "react-icons/gi";
import { LiaTimesSolid } from "react-icons/lia";
import {UnitButton} from "./UnitButton";
import {Units} from "../types/types";
import {Player} from "../GameComps/Player";

interface CityPopupProps {
    anchorPoint: Vector2D;
    player: Player;
    recruitFunc: (n: number)=>boolean;
    garrisonFunc: (n: number)=>boolean;
    bringFunc: (n: number)=>boolean;
}

export const CityPopup: React.FC<CityPopupProps> = ({anchorPoint, player, recruitFunc, garrisonFunc, bringFunc}) => {
    const [isVisible, setIsVisible] = useState(false);
    const [style, setStyle] = useState<React.CSSProperties>({});
    const [recruitFlashError, setRecruitFlashError] = useState<boolean>(false);
    const [garrisonFlashError, setGarrisonFlashError] = useState<boolean>(false);
    const [bringFlashError, setBringFlashError] = useState<boolean>(false);

    useEffect(() => {
        const margin = 20;
        let x = Math.max(anchorPoint.x, margin);
        let y = Math.max(anchorPoint.y, margin);
        x = Math.min(x, window.innerWidth - margin);
        y = Math.min(y, window.innerHeight - margin);

        // Using css style to avoid tailwind compilation issues
        setStyle({
            position: 'absolute',
            left: `${x}px`,
            top: `${y}px`,
            transform: 'translate(-50%, -50%)'
        });

        setIsVisible(true); // Trigger the scale-up effect
    }, [anchorPoint]);

    const handleFlashRecruit = (n: number) => {
        const success = recruitFunc(n);
        if (!success) {
            setRecruitFlashError(true);
            setTimeout(() => setRecruitFlashError(false), 750);
        }
    }

    const handleFlashGarrison = (n: number) => {
        const success = garrisonFunc(n);
        if (!success) {
            setGarrisonFlashError(true);
            setTimeout(() => setGarrisonFlashError(false), 750);
        }
    }

    const handleFlashBring = (n: number) => {
        const success = bringFunc(n);
        if (!success) {
            setBringFlashError(true);
            setTimeout(() => setBringFlashError(false), 750);
        }
    }

    return (
        <div
            style={style}
            className={`absolute transform -translate-x-1/2 -translate-y-1/2 bg-white bg-opacity-10 text-white select-none flex flex-col justify-around items-center border border-white backdrop-blur w-1/5 h-1/2 pointer-events-auto origin-center transition-transform duration-300 ease-out ${isVisible ? "scale-100 opacity-100" : "scale-0 opacity-0"}`}
        >
            <span className="font-bold">{`Gold: ${player.gold}`}</span>
            <span>Recruit:</span>
            <UnitButton n={1} unit={Units.laser} clickHandler={handleFlashRecruit} flashError={recruitFlashError} />
            <span>To Garrison:</span>
            <UnitButton n={1} unit={Units.laser} clickHandler={handleFlashGarrison} flashError={garrisonFlashError} />
            <span>From Garrison:</span>
            <UnitButton n={1} unit={Units.laser} clickHandler={handleFlashBring} flashError={bringFlashError} />

        </div>
    );
};