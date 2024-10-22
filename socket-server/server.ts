import WebSocket, {WebSocketServer} from 'ws';
// const { Server } = WebSocket;
import express from 'express';
import http from 'http';
import { fileURLToPath } from 'url';
import path from 'path';
import os from 'os';
import {setupWss} from "./Communication.js";

// Manually define __dirname in ES module scope
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
// const wss = new WebSocketServer({ server });

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

const wss = setupWss(getNetworkIP(), 3);

app.get('*', (req, res) => {
    console.log('Sending client code')
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

server.listen(port, () => {
    const networkIP = getNetworkIP();
    console.log('Client delivery server running on:');
    console.log(`- Local: http://localhost:${port}`);
    if (networkIP) {
        console.log(`- Network: http://${networkIP}:${port}`);
    } else {
        console.log('- Network IP not found.');
    }
});