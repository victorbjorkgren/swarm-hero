import React, {useState} from "react";
import VerificationInput from "./VerificationInput";
import {MenuButton} from "../../MenuButton";
import {useLogin} from "../../../Hooks/useAuth";

type Props = {
    email: string;
    handleBack: () => void;
    handleSucess: () => void;
}

export const LoginVerification = ({email, handleBack, handleSucess}: Props) => {
    const [message, setMessage] = useState("Back");

    const { verifyCode } = useLogin();

    const handleSubmit = async (code: string) => {
        try {
            await verifyCode(email, code);
            handleSucess();
        } catch (error) {
            console.error(error)
            setMessage("Error - Go Back?");
        }
    }

    return (
        <div className={`absolute h-screen w-screen gap-20 items-center justify-center flex flex-col`}>
            <span className={`font-titleFont font-bold text-8xl`}>Enter Code</span>
            <VerificationInput length={6} onComplete={handleSubmit} />
            <MenuButton label={message} onClick={handleBack} />
        </div>
    );
};