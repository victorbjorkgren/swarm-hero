import {IoIosArrowBack} from "react-icons/io";
import React from "react";

interface Props {
    handleBack: () => void;
}

export const BackButton: React.FC<Props> = ({handleBack}) => {
    return (
        <button className={`absolute text-xl select-none p-5`} onClick={handleBack}><IoIosArrowBack/></button>
    );
};