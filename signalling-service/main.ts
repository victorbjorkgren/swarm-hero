import WebSocket, {WebSocketServer} from 'ws';
import {v4 as uuidv4} from 'uuid';
import {ClientID} from "@shared/commTypes";
import {gameConfig} from "@shared/config";
import jwt from 'jsonwebtoken';
import http, {IncomingMessage, ServerResponse} from "node:http";
import express, {Request, Response} from "express";
import {randomUUID} from "crypto";
import cors from "cors";

const port = process.env.PORT || '8081';
const nPlayers = gameConfig.nPlayerGame;

const app = express();
app.use(express.json());
app.use(cors());

const shortLivedTokens = new Set<string>();
const SHORT_TOKEN_TTL = 15 * 1000;

app.get('/request-game-room-token/', (req: Request, res: Response) => {
    if (authenticateJWT(req)) {
        const gameRoomToken: string = randomUUID();
        shortLivedTokens.add(gameRoomToken);
        setTimeout(() => {
            shortLivedTokens.delete(gameRoomToken);
            }, SHORT_TOKEN_TTL
        );
        res.json({ gameRoomToken });
    } else {
        res.status(401).json({ error: 'Invalid or expired JWT token.' });
    }
});

app.get('/ping/', (req: Request, res: Response) => {
    res.status(200).send(`Match-maker alive!`);
});

const httpServer = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

httpServer.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const token = url.searchParams.get('token');

    if (authenticateGameRoomToken(token || "") && req.url?.startsWith('/connect')) {
        wss.handleUpgrade(req, socket, head, (ws) => {
            wss.emit('connection', ws, req);
        });
    } else {
        socket.destroy();
    }
});

httpServer.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});

const authenticateJWT = (req: IncomingMessage): boolean => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1]; // Bearer <token>

    if (!token) {
        console.warn('Tokenless authentication attempted');
        return false;
    }

    try {
        if (publicKey === null) {
            return false;
        }
        const decoded = jwt.verify(token, publicKey, { algorithms: ["RS256"] });
        console.log(`Client authenticated`);
        return true;
    } catch (err) {
        console.warn('JWT verification failed:', err instanceof Error ? err.message : String(err));
        return false;
    }
}

const authenticateGameRoomToken = (token: string): boolean => {
    if (shortLivedTokens.has(token)) {
        shortLivedTokens.delete(token);
        return true;
    }
    return false;
}

export const gameRoomSignalServer = (nPlayerGame: number) => {
    return new Promise<void>((resolve, reject) => {
        // const httpServer = http.createServer((req: IncomingMessage, res: ServerResponse) => {
        //     if (req.url === '/ping') {
        //         res.writeHead(200, { 'Content-Type': 'text/plain' });
        //         res.end(`Game room alive with ${players.size} players`);
        //     }
        // });

        // httpServer.on('upgrade', (req: IncomingMessage, socket: Socket, head: Buffer) => {
        //     const url = new URL(req.url || '', `http://${req.headers.host}`);
        //     const token = url.searchParams.get('token');
        //
        //     const hasAuth = authenticateGameRoomToken(token || "");
        //     const connectCall = req.url?.startsWith('/connect')
        //     if (connectCall && hasAuth) {
        //         wss.handleUpgrade(req, socket, head, (ws: WebSocket) => {
        //             wss.emit('connection', ws, req);
        //         });
        //     } else {
        //         socket.destroy();
        //     }
        // });
        // httpServer.listen(port, () => {
        //     console.log(`Server listening on port ${port}`);
        // })

        const wss = new WebSocketServer({ noServer: true });
        let players: Map<ClientID, WebSocket> = new Map();
        let hostSocket: WebSocket | null = null;
        let hostId: string | null = null;

        const readyPeers: Set<ClientID> = new Set();

        wss.on('connection', (ws) => {

            const playerId = uuidv4();
            players.set(playerId, ws)
            console.log(`Connected to ${playerId}`);
            if (!hostSocket) {
                hostSocket = ws;
                hostId = playerId;
            }
            ws.send(JSON.stringify({type: 'host-setup', payload: {playerId: playerId, hostId: hostId}}));
            wss.clients.forEach((client) => {
                client.send(JSON.stringify({type: 'peer-join', payload: {peerId: playerId}}));
            })

            ws.on('message', (data: ArrayBuffer) => {
                // const rawData: string = data instanceof ArrayBuffer ? new TextDecoder().decode(data) : data.toString();
                const parsedData = JSON.parse(new TextDecoder().decode(data));
                if (parsedData.type === 'signal-message') {
                    const recipient = players.get(parsedData.payload.to);
                    if (recipient) {
                        recipient.send(JSON.stringify(parsedData));
                    } else {
                        console.error('Signal message to unknown recipient')
                    }
                } else if (parsedData.type === 'ready-to-disconnect') {
                    readyPeers.add(playerId);
                    if (readyPeers.size === nPlayerGame) {
                        wss.clients.forEach((client) => {
                            client.send(JSON.stringify({type: 'all-peers-ready'}));
                        })
                    }
                }
            });

            ws.on('close', () => {
                players.delete(playerId);
                if (!readyPeers.has(playerId)) {
                    wss.clients.forEach((client) => {
                        client.send(JSON.stringify({type: 'peer-leave', payload: {peerId: playerId}}));
                    })
                }
                if (playerId === hostId) {
                    hostId = null;
                    hostSocket = null;
                }
                if (readyPeers.size === nPlayerGame && players.size === 0) {
                    cleanUp();
                    resolve();
                }
                console.log(`Disconnected from ${playerId}`);
            });
        });

        wss.on('error', (err) => {
            cleanUp();
            reject(err);
        });

        const cleanUp = () => {
            console.log('Cleaning up game room resources...');

            process.off('SIGINT', cleanUp);
            process.off('SIGTERM', cleanUp);

            players.forEach((ws, playerId) => {
                ws.close();
            });
            players.clear();

            httpServer.close((err) => {
                if (err) {
                    console.error('Error closing server:', err);
                } else {
                    console.log('Game room Http Server closed successfully.');
                }
            });

            wss.close((err) => {
                if (err) {
                    console.error('Error closing WebSocket server:', err);
                } else {
                    console.log('Game room WebSocket Server closed.');
                }
            });
        };

        process.on('SIGINT', cleanUp);
        process.on('SIGTERM', cleanUp);
    })
}

let running = true;
let cancelTimeout: Function | null = null;
let publicKey: string | null = null;

const shutdown = () => {
    running = false;
    if (cancelTimeout) cancelTimeout();
    console.log('Shutting down game room loop...');
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Game room runner
console.log(`Game Room running on:`);
(async () => {
    while (running) {
        try {
            await gameRoomSignalServer(nPlayers);
            console.log(`Game room on :${port} with ${nPlayers} players setup complete!`);
        } catch (error) {
            console.error('Error in game room setup:', error);
            await new Promise((resolve) => setTimeout(resolve, 2000));
        }
    }
})();

// Public key retriever func
(async () => {
    while (running) {
        try {
            const response = await fetch('http://localhost:4000/keys/');

            if (!response.ok) {
                console.error('Could not retrieve key from login server');
            } else {
                console.info('New key retrieved from login server.');
            }

            const key = await response.json();
            publicKey = key.publicKey;
        } catch (error) {
            console.error('Could not retrieve key from login server');
        }

        await new Promise((resolve, reject) => {
            const stepBackTime = publicKey === null ? 1000 : 60 * 60 * 1000;
            const timeoutId = setTimeout(resolve, stepBackTime);
            cancelTimeout = () => {
                clearTimeout(timeoutId); // Clear the timeout
                reject(new Error('Timeout cancelled')); // Reject the promise
            };
        }).catch((err) => {
            if (err.message !== 'Key fetcher cancelled') throw err;
        });
    }
})();
