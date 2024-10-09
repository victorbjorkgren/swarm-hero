import React, {useEffect, useRef, useState} from "react";
import {Vector2D} from "../GameComps/Utility";
import {UnitButton} from "./UnitButton";
import {Units} from "../types/types";
import {Player} from "../GameComps/Player";
import {SpellPack} from "./SpellPicker";


interface CityPopupProps {
    anchorPoint: Vector2D | undefined;
    player: Player | null | undefined;
    recruitFunc: (n: number)=>boolean;
    garrisonFunc: (n: number)=>boolean;
    bringFunc: (n: number)=>boolean;
}

export const CityPopup: React.FC<CityPopupProps> = ({anchorPoint, player, recruitFunc, garrisonFunc, bringFunc}) => {
    const divRef = useRef<HTMLDivElement | null>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [style, setStyle] = useState<React.CSSProperties>({});
    const [recruitFlashError, setRecruitFlashError] = useState<boolean>(false);
    // const [garrisonFlashError, setGarrisonFlashError] = useState<boolean>(false);
    // const [bringFlashError, setBringFlashError] = useState<boolean>(false);
    const [buySpellFlashError, setBuySpellFlashError] = useState<boolean[]>([]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (divRef.current && !divRef.current.contains(event.target as Node)) {
                setIsVisible(false);
                player && player.closeCityPopUp();
            }
        };

        if (player === null || player === undefined) return;
        if (anchorPoint === undefined || player.popUpCastle === null ) {
            setIsVisible(false);
            document.removeEventListener('mousedown', handleClickOutside)
            return
        }

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

        setIsVisible(true);

        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        }

    }, [anchorPoint, player?.popUpCastle, player]);

    const handleFlashRecruit = (n: number) => {
        const success = recruitFunc(n);
        if (!success) {
            setRecruitFlashError(true);
            setTimeout(() => setRecruitFlashError(false), 750);
        }
    }

    // const handleFlashGarrison = (n: number) => {
    //     const success = garrisonFunc(n);
    //     if (!success) {
    //         setGarrisonFlashError(true);
    //         setTimeout(() => setGarrisonFlashError(false), 750);
    //     }
    // }

    // const handleFlashBring = (n: number) => {
    //     const success = bringFunc(n);
    //     if (!success) {
    //         setBringFlashError(true);
    //         setTimeout(() => setBringFlashError(false), 750);
    //     }
    // }

    const handleBuySpell = (spell: SpellPack, index: number) => {
        if (player === null || player === undefined) return;
        const success = player.buySpell(spell);
        if (!success) {
            setBuySpellFlashError(prevErrors => {
                const newErrors = [...prevErrors];
                newErrors[index] = true;
                return newErrors;
            });
            setTimeout(() => {
                setBuySpellFlashError(prevErrors => {
                    const newErrors = [...prevErrors];
                    newErrors[index] = false;
                    return newErrors;
                })
            }, 750);
        }
    }

    if (player === undefined || player === null) return null;

    return (
        <div
            style={style}
            className={`flex flex-col gap-2 rounded-xl justify-between transform -translate-x-1/2 -translate-y-1/2 bg-white bg-opacity-30 text-white select-none border border-white backdrop-blur-sm w-1/4 h-1/2 origin-center transition-transform duration-300 ease-out ${isVisible ? "scale-100 opacity-100 pointer-events-auto" : "scale-0 opacity-0 pointer-events-none"}`}
            ref={divRef}
        >
            {/*General Info*/}
            <div className="flex flex-row justify-end px-2">
                <span className="font-bold">{`Gold: ${player.gold}`}</span>
            </div>
            {/*Purchasing*/}
            <div className="flex flex-row justify-around px-2">
                <div className="flex flex-col text-2xl items-end justify-start gap-y-2">
                    <span className="text-2xl">Recruit</span>
                    <UnitButton n={1} unit={Units.LaserDrone} clickHandler={handleFlashRecruit} flashError={recruitFlashError} />
                    <UnitButton n={10} unit={Units.LaserDrone} clickHandler={handleFlashRecruit} flashError={recruitFlashError} />
                </div>
                {/*Spells*/}
                <div className="flex flex-col text-6xl items-start justify-start space-y-2">
                    <span className="text-2xl">Buy Spells</span>
                    {player.popUpCastle && player.popUpCastle.availableSpells.map((spell: SpellPack, index: number) => (
                        <UnitButton key={index} n={0} unit={spell} clickHandler={() => handleBuySpell(spell, index)} flashError={buySpellFlashError[index]} />
                    ))}
                </div>
            </div>
            {/*Garrison*/}
            <div className="flex flex-row gap-3 py-2">
                <div className="flex flex-col px-2 gap-2 items-center justify-around">
                    <span>Town</span>
                    <span>Player</span>
                </div>
                <div className="flex flex-col px-2 gap-2 items-start justify-start">
                    <UnitButton n={0} unit={null} clickHandler={() => {}}/>
                    <UnitButton n={0} unit={null} clickHandler={() => {}}/>
                </div>
                <div className="flex flex-col px-2 gap-2 items-start justify-start">
                    <UnitButton n={0} unit={null} clickHandler={() => {}}/>
                    <UnitButton n={0} unit={null} clickHandler={() => {}}/>
                </div>
                <div className="flex flex-col px-2 gap-2 items-start justify-start">
                    <UnitButton n={0} unit={null} clickHandler={() => {}}/>
                    <UnitButton n={0} unit={null} clickHandler={() => {}}/>
                </div>
            </div>
        </div>
    );
};