import express from 'express';
import http from 'http';
import {fileURLToPath} from 'url';
import path from 'path';
import {getNetworkIP} from "../Utilities";

// Manually define __dirname in ES module scope
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const main = http.createServer(app);
// const wss = new WebSocketServer({ server });

const port = process.env.PORT || 8080;


app.use(express.static('public'));

app.get('*', (req, res) => {
    console.log('Sending client code')
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

main.listen(port, () => {
    const networkIP = getNetworkIP();
    console.log('Client delivery server running on:');
    console.log(`- Local: http://localhost:${port}`);
    if (networkIP) {
        console.log(`- Network: http://${networkIP}:${port}`);
    } else {
        console.log('- Network IP not found.');
    }
});