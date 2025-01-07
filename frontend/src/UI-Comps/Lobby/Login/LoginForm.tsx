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
    const [failLock, setFailLock] = useState(false);
    const [loadLock, setLoadLock] = useState(false);
    const [lockCooldown, setLockCooldown] = useState(0);
    const { requestCode } = useLogin();

    useEffect(() => {
        if (failLock && lockCooldown > 0) {
            const timer = setTimeout(() => {
                setLockCooldown((prevCooldown) => {
                    const newCooldown = prevCooldown - 1;

                    if (newCooldown <= 0) {
                        setFailLock(false);
                        setLockMessage('');
                        return 0;
                    }

                    return newCooldown;
                });
            }, 1000);

            return () => clearTimeout(timer);
        }
    }, [failLock, lockCooldown]);

    const handleError = (message: string) => {
        setFailLock(true);
        setLockMessage(message);
        setLockCooldown(5);
    };

    const handleSubmit = async () => {
        setLoadLock(true);
        try {
            await requestCode(email);
            successCallback(email);
        } catch (err) {
            console.error(err);
            handleError(err instanceof Error ? err.message : String(err));
        } finally {
            setLoadLock(false);
        }
    };

    let message = 'Send Code';
    if (failLock) {
        message = `${lockMessage} (Retry in ${lockCooldown}s)`;
    } else if (loadLock) {
        message = 'Waking Up...'
    }

    return (
        <div className="absolute h-screen w-screen gap-20 items-center justify-center flex flex-col">
            <span className="font-titleFont font-bold text-8xl">Login</span>
            <TextInput placeholder="Enter email" value={email} setValue={setEmail} />
            <MenuButton label={message} onClick={handleSubmit} disabled={failLock || loadLock} />
        </div>
    );
};

export default LoginForm;