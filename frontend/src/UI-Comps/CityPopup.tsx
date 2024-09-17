import React, {useEffect, useState} from "react";
import {Vector2D} from "../GameComps/Utility";
import { GiLaserBurst } from "react-icons/gi";
import { LiaTimesSolid } from "react-icons/lia";
import {UnitButton} from "./UnitButton";
import {Units} from "../types/types";

interface CityPopupProps {
    anchorPoint: Vector2D;
    recruitFunc: (n: number)=>void;
    garrisonFunc: (n: number)=>void;
    bringFunc: (n: number)=>void;
}

export const CityPopup: React.FC<CityPopupProps> = ({anchorPoint, recruitFunc, garrisonFunc, bringFunc}) => {
    const [isVisible, setIsVisible] = useState(false);
    const [style, setStyle] = useState<React.CSSProperties>({});

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


    return (
        <div
            style={style}
            className={`absolute transform -translate-x-1/2 -translate-y-1/2 bg-white bg-opacity-10 text-white flex flex-col justify-around items-center border border-white backdrop-blur w-1/5 h-1/2 pointer-events-auto origin-center transition-transform duration-300 ease-out ${isVisible ? "scale-100 opacity-100" : "scale-0 opacity-0"}`}
        >
            <span className="select-none">Recruit:</span>
            <UnitButton n={1} unit={Units.laser} clickHandler={recruitFunc}/>
            <span className="select-none">To Garrison:</span>
            <UnitButton n={1} unit={Units.laser} clickHandler={garrisonFunc}/>
            <span className="select-none">From Garrison:</span>
            <UnitButton n={1} unit={Units.laser} clickHandler={bringFunc}/>

        </div>
    );
};