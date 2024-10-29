import WebSocket, {WebSocketServer} from 'ws';
import {v4 as uuidv4} from 'uuid';
import {ClientID} from "@shared/commTypes";
import {getNetworkIP} from "../Utilities.js";
import {gameConfig} from "../../shared/config.js";

// const ip = getNetworkIP();
const ip = 'localhost';
const port = 8081;
const nPlayers = gameConfig.nPlayerGame;

export const gameRoomSignalServer = (networkIP: string, port: number, nPlayerGame: number) => {
    return new Promise<void>((resolve, reject) => {
        const wss = new WebSocketServer({host: networkIP, port: port});
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
            players.forEach((ws, playerId) => {
                ws.close();
            });
            players.clear();

            wss.close((err) => {
                if (err) {
                    console.error('Error closing WebSocket server:', err);
                } else {
                    console.log('WebSocket server closed.');
                }
            });
        };

        console.log(`- Network: http://${networkIP}:${port}`);
    })
}


let running = true;

const shutdown = () => {
    running = false;
    console.log('Shutting down game room loop...');
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

console.log(`Game Room running on:`);
(async () => {
    while (running) {
        try {
            await gameRoomSignalServer(ip, port, nPlayers);
            console.log(`Game room on ${ip}:${port} with ${nPlayers} players setup complete!`);
        } catch (error) {
            console.error('Error in game room setup:', error);
            await new Promise((resolve) => setTimeout(resolve, 2000));
        }
    }
})();
