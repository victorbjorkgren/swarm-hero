import {jwtDecode} from 'jwt-decode';
import { useAuth } from './AuthContext';
import {useEffect, useState} from "react";
import Cookies from 'js-cookie';

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
        persistToken(token);
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

    const persistToken = (token: string) => {
        try {
            const { exp } = jwtDecode(token);
            if (!exp) throw new Error("Token does not contain an 'exp' field.");
            const expirationInDays = (exp * 1000 - Date.now()) / (1000 * 60 * 60 * 24);
            Cookies.set('swarmEchoAuthToken', token, { expires: expirationInDays });
            setToken(token);
        } catch (error) {
            console.error("Failed to set token in cookie:", error);
        }
    };

    const loadPersistedToken = () => {
        const savedToken = Cookies.get('swarmEchoAuthToken');
        if (savedToken && isTokenValid(savedToken)) {
            setToken(savedToken);
        }
    };

    const clearToken = () => {
        Cookies.remove('swarmEchoAuthToken');
        setToken(null);
    };

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

    useEffect(() => {
        loadPersistedToken();
    }, []);

    // Hook for local checking if the token is valid
    useEffect(() => {
        if (token && isTokenValid(token)) {
            setAuthenticated(true); // Skip login if valid
        } else {
            setAuthenticated(false); // Prompt login
        }
    }, [token]);

    return { requestCode, verifyCode, requestGameRoomToken, authenticated, clearToken };
};