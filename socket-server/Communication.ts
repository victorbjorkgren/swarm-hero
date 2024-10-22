import WebSocket, { WebSocketServer } from 'ws';
import {v4 as uuidv4} from 'uuid';
import {Client, ClientID} from "../shared/commTypes";


export const setupWss = (networkIP: string | undefined, nPlayerGame: number) => {
    const port = 8081;
    const wss = new WebSocketServer({port: port});
    let players: Map<ClientID, WebSocket> = new Map();
    let host: WebSocket | null = null;
    let hostId: string | null = null;

    const readyPeers: Set<ClientID> = new Set();

    wss.on('connection', (ws) => {
        const playerId = uuidv4();
        players.set(playerId, ws)
        console.log(`Connected to ${playerId}`);
        if (!host) {
            host = ws;
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
            console.log(`Disconnected from ${playerId}`);
        });
    });


    console.log(`Signaling server running on:`);
    console.log(`- Local: http://localhost:${port}`);
    if (networkIP)
        console.log(`- Network: http://${networkIP}:${port}`);

}
