import {jwtDecode} from 'jwt-decode';
import { useAuth } from './AuthContext';
import {useEffect, useState} from "react";

export const useLogin = () => {
    const [authenticated, setAuthenticated] = useState(false);
    const { token, setToken } = useAuth();

    const requestCode = async (email: string) => {
        const response = await fetch('https://swarm-login-service.onrender.com/request-code/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        });

        if (!response.ok) {
            const { message } = await response.json();
            console.log(message);
            throw new Error(message);
        }
    };

    const verifyCode = async (email: string, code: string) => {
        const response = await fetch('https://swarm-login-service.onrender.com/verify-code/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email, code: code }),
        })

        if (!response.ok) {
            const { message } = await response.json();
            console.log(message);
            throw new Error(message);
        }

        const { token } = await response.json();
        setToken(token);
    }

    const requestGameRoomToken = async (): Promise<string | null> => {
        if (!token) return null;
        const response: Response = await fetch('https://swarm-match-making.onrender.com/request-game-room-token/', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            }
        });

        if (!response.ok) {
            const { message } = await response.json();
            console.log(message);
            throw new Error(message);
        }

        const { gameRoomToken} = await response.json();
        return gameRoomToken;
    }

    const isTokenValid = (token: string | null): boolean => {
        if (!token) return false;
        try {
            const { exp } = jwtDecode(token);
            if (!exp) return false;
            return exp * 1000 > Date.now();
        } catch (error) {
            return false;
        }
    };

    // Hook for local checking if the token is valid
    useEffect(() => {
        if (token && isTokenValid(token)) {
            setAuthenticated(true); // Skip login if valid
        } else {
            setAuthenticated(false); // Prompt login
        }
    }, [token]);

    return { requestCode, verifyCode, requestGameRoomToken, authenticated };
};