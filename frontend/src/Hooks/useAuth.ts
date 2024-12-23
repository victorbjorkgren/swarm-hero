import { useAuth } from './AuthContext';

export const useLogin = () => {
    const { token, setToken } = useAuth();

    const requestCode = async (email: string) => {
        const response = await fetch('http://localhost:4000/request-code/', {
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
        const response = await fetch('http://localhost:4000/verify-code/', {
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
        const response: Response = await fetch('http://localhost:8080/request-game-room-token/', {
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

    return { requestCode, verifyCode, requestGameRoomToken };
};