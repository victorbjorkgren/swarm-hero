import WebSocket, {WebSocketServer} from 'ws';
// const { Server } = WebSocket;
import express from 'express';
import http from 'http';
import { fileURLToPath } from 'url';
import path from 'path';
import os from 'os';

// Manually define __dirname in ES module scope
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const port = process.env.PORT || 8080;

const getNetworkIP = (): string | undefined => {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name] || []) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;  // Return the network IP
            }
        }
    }
    return undefined;
};

app.use(express.static('public'));

wss.on('connection', (ws: WebSocket) => {
    console.log('Client connected');

    ws.on('message', (message: string) => {
        console.log(`Received message => ${message}`);

        // Broadcast to all clients
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

app.get('*', (req, res) => {
    res.sendFile(path.join('public', 'index.html'));
});

server.listen(port, () => {
    const networkIP = getNetworkIP();
    console.log('WebSocket server running on:');
    console.log(`- Local: http://localhost:${port}`);
    if (networkIP) {
        console.log(`- Network: http://${networkIP}:${port}`);
    } else {
        console.log('- Network IP not found.');
    }
});