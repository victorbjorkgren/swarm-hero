import React from "react";
import {UnitPack, Units} from "../types/unitTypes";
import {GiLaserBurst} from "react-icons/gi";
import {LiaTimesSolid} from "react-icons/lia";

const UnitIcons = {
    [Units.LaserDrone]: <GiLaserBurst />,
}

interface Props {
    unit: UnitPack;
    n: number;
}

export const UnitIcon: React.FC<Props> = ({unit, n}) => {
    return (
        <>
            {UnitIcons[unit.element]}
            <span className="flex flex-row text-xs select-none break-inside-avoid"><LiaTimesSolid />{n}</span>
        </>
    );
};