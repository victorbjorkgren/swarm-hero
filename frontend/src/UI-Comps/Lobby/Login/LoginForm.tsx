import React, { useState, useEffect } from 'react';
import { useLogin } from '../../../Hooks/useAuth';
import { TextInput } from "../../TextInput";
import { MenuButton } from "../../MenuButton";

type Props = {
    successCallback: (email: string) => void;
};

const LoginForm: React.FC<Props> = ({ successCallback }) => {
    const [email, setEmail] = useState('');
    const [lockMessage, setLockMessage] = useState('');
    const [lock, setLock] = useState(false);
    const [lockCooldown, setLockCooldown] = useState(0);
    const { requestCode } = useLogin();

    useEffect(() => {
        if (lock && lockCooldown > 0) {
            const timer = setTimeout(() => {
                setLockCooldown((prevCooldown) => {
                    const newCooldown = prevCooldown - 1;

                    if (newCooldown <= 0) {
                        setLock(false);
                        setLockMessage('');
                        return 0;
                    }

                    return newCooldown;
                });
            }, 1000);

            return () => clearTimeout(timer);
        }
    }, [lock, lockCooldown]);

    const handleError = (message: string) => {
        setLock(true);
        setLockMessage(message);
        setLockCooldown(5);
    };

    const handleSubmit = async () => {
        try {
            await requestCode(email);
            successCallback(email);
        } catch (err) {
            console.error(err);
            handleError(err instanceof Error ? err.message : String(err));
        }
    };

    const message = lock ? `${lockMessage} (Retry in ${lockCooldown}s)` : 'Send Code';

    return (
        <div className="absolute h-screen w-screen gap-20 items-center justify-center flex flex-col">
            <span className="font-titleFont font-bold text-8xl">Login</span>
            <TextInput placeholder="Enter email" value={email} setValue={setEmail} />
            <MenuButton label={message} onClick={handleSubmit} disabled={lock} />
        </div>
    );
};

export default LoginForm;