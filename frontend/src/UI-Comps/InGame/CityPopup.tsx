import React, {useEffect, useRef, useState} from "react";
import {Vector2D} from "../../GameComps/Utility";
import {UnitButton} from "./UnitButton";
import {Player} from "../../GameComps/Player";

import {SpellPack} from "../../types/spellTypes";
import {Units} from "../../types/unitTypes";
import {MovePopup} from "./MovePopup";


interface CityPopupProps {
    anchorPoint: Vector2D | undefined;
    player: Player | null | undefined;
    recruitFunc: (unit: Units, n: number)=>boolean;
}

export const CityPopup: React.FC<CityPopupProps> = ({anchorPoint, player, recruitFunc}) => {
    const divRef = useRef<HTMLDivElement | null>(null);
    const isBringing = useRef<boolean>(false);

    const [isVisible, setIsVisible] = useState(false);
    const [style, setStyle] = useState<React.CSSProperties>({});
    const [recruitFlashError, setRecruitFlashError] = useState<boolean>(false);
    const [buySpellFlashError, setBuySpellFlashError] = useState<boolean[]>([]);
    const [moveGarrisonPopUpVisible, setMoveGarrisonPopUpVisible] = useState<boolean>(false);
    const [maxMoveUnits, setMaxMoveUnits] = useState<number>(0);
    const [moveUnit, setMoveUnit] = useState<Units | null>(null);

    // Popup placement logic
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
        });

        setIsVisible(true);

        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        }

    }, [anchorPoint]);

    const handleFlashRecruit = (unit: Units, n: number) => {
        const success = recruitFunc(unit, n);
        if (!success) {
            setRecruitFlashError(true);
            setTimeout(() => setRecruitFlashError(false), 750);
        }
    }

    const handleOpenMovePopup = (unit : Units | null, max: number | null) => {
        if (unit === null || max === null) return;
        setMoveUnit(unit);
        setMaxMoveUnits(max);
        setMoveGarrisonPopUpVisible(true);
    }

    const handleMoveGarrison = (unit: Units | null, n: number) => {
        console.log('Moving', n, unit);
        setMoveGarrisonPopUpVisible(false);
        if (!unit || !player) return;
        if (isBringing.current) {
            player.bringGarrisonDrone(unit, n);
        } else {
            player.garrisonDrones(unit, n);
        }
    }

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

    const playerDrones = Array.from(player.particleSystem?.getParticles().getUnitCounts(player) || []);
    const townDrones = Array.from(player.particleSystem?.getParticles().getUnitCounts(player.popUpCastle) || []);

    const maxUnitBoxes = Math.max(playerDrones.length, townDrones.length) + 1;

    const spellBoxSize = 30;
    const recruitBoxSize = 20;
    const garrisonBoxSize = 20;

    return (
        <div ref={divRef}>
            <div
                // style={style}
                className={`
                absolute top-1/2 left-1/2 flex flex-col gap-2 rounded-xl justify-between transform -translate-y-1/2 -translate-x-1/2
                items-center bg-white bg-opacity-30 text-white select-none border border-white backdrop-blur-sm
                origin-center transition-transform duration-300 ease-out 
                ${isVisible ? "scale-100 opacity-100" : "scale-0 opacity-0"} 
                ${isVisible && moveGarrisonPopUpVisible ? "blur-sm opacity-70": ""} 
                ${isVisible && !moveGarrisonPopUpVisible ? "pointer-events-auto" : "pointer-events-none"}`}
            >
                {/*General Info*/}
                <div className="flex flex-row justify-end px-2">
                    <span className="font-bold">{`Gold: ${player.gold}`}</span>
                </div>
                {/*Purchasing*/}
                <div className="flex flex-row justify-around px-4 gap-x-14">
                    <div className="flex flex-col text-2xl items-end justify-start gap-y-2">
                        <span className="text-2xl">Units</span>
                        <UnitButton size={recruitBoxSize} n={1} unit={Units.LaserDrone} clickHandler={() => {
                            handleFlashRecruit(Units.LaserDrone, 1)
                        }} flashError={recruitFlashError}/>
                        <UnitButton size={recruitBoxSize} n={10} unit={Units.LaserDrone} clickHandler={() => {handleFlashRecruit(Units.LaserDrone, 10)}} flashError={recruitFlashError}/>
                    </div>
                    {/*Spells*/}
                    <div className="flex flex-col text-6xl items-start justify-start space-y-2">
                        <span className="text-2xl">Spells</span>
                        {player.popUpCastle && player.popUpCastle.availableSpells.map((spell: SpellPack, index: number) => (
                            <UnitButton size={spellBoxSize} key={index} n={0} unit={spell} clickHandler={() => handleBuySpell(spell, index)} flashError={buySpellFlashError[index]}/>
                        ))}
                    </div>
                </div>
                {/*Garrison*/}
                <div className="flex flex-col items-start justify-start space-y-2 px-4">
                    <span className="text-2xl">Garrison</span>
                    <div className="flex flex-row gap-3 py-2 select-none">
                        <div className="flex flex-col px-2 gap-1 items-center justify-around">
                            <span>Town</span>
                            <span>Player</span>
                        </div>
                        {Array.from({length: maxUnitBoxes}).map((_, index) => (
                            <div key={index} className="flex flex-col gap-2 items-start justify-start">
                                {/* Town UnitButton (or empty if no unit exists at this index) */}
                                <UnitButton
                                    size={garrisonBoxSize}
                                    n={townDrones[index]?.count || 0}
                                    unit={townDrones[index]?.unit || null}
                                    clickHandler={() => {
                                        isBringing.current = true;
                                        handleOpenMovePopup(townDrones[index]?.unit, townDrones[index]?.count);
                                    }}
                                />
                                {/* Player UnitButton (or empty if no unit exists at this index) */}
                                <UnitButton
                                    size={garrisonBoxSize}
                                    n={playerDrones[index]?.count || 0}
                                    unit={playerDrones[index]?.unit || null}
                                    clickHandler={() => {
                                        isBringing.current = false;
                                        handleOpenMovePopup(playerDrones[index]?.unit, playerDrones[index]?.count);
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <div style={style}>
                <MovePopup
                    isVisible={moveGarrisonPopUpVisible} unit={moveUnit}
                    max={maxMoveUnits}
                    doneCallback={(unit, n)=>handleMoveGarrison(unit, n)} />
            </div>
        </div>
    );
};