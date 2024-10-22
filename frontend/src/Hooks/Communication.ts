import Peer, {SignalData} from "simple-peer";
import {Client, ClientID} from "@shared/commTypes";

export type SignalMesssage = {
    from: ClientID;
    to: ClientID;
    signal: SignalData;
}

export const useMesh = (nPlayerGame: number) => {
    const peers: Map<ClientID, Client> = new Map();
    const signalServer = new WebSocket('ws://localhost:8081');
    let myID: string = "";
    let isHost: boolean = false;
    let connectedPeers: Set<ClientID> = new Set()

    signalServer.onopen = () => {
        console.log('Connected to signaling server');
    };

    signalServer.onmessage = (message) => {
        const data = JSON.parse(message.data)
        switch (data.type) {
            case 'host-setup':
                myID = data.payload.playerId as string;
                isHost = myID === data.payload.hostId;
                console.log('Received host setup', myID, isHost);
                // createPeer();
                break;
            case 'peer-join':
                const newPeerId = data.payload.peerId;
                if (newPeerId !== myID) {
                    createPeer(newPeerId);
                }
                break;
            case 'signal-message':
                handleMessage(data.payload)
                break;
            case 'all-peers-ready':
                handleDone();
                break;
            default:
                console.error('Unhandled message type', message.type);
                break;
        }
    };

    // Broadcast our signal to everyone else
    function createPeer(peerId: string) {
        const newPeer = new Peer({ initiator: true, trickle: false });
        newPeer.on('signal', (signal) => {
            signalServer.send(JSON.stringify({type: 'signal-message', payload: {from: myID, to: peerId, signal}}));
        });
        newPeer.on('connect', () => {
            console.log(`Connected to a new peer ${peerId}`);
            connectedPeers.add(peerId);
            checkDone();
        });
        peers.set(peerId, { peer: newPeer, id: myID });
    }

    const handleMessage = (messageData: SignalMesssage) => {
        const { from, to, signal } = messageData;
        if (from === myID) return; // Ignore messages from ourselves

        let peerInstance = peers.get(from);

        if (!peerInstance) {
            const newPeer = new Peer({ initiator: false, trickle: false });
            newPeer.on('signal', (signal) => {
                signalServer.send(JSON.stringify({type: 'signal-message', payload: {from: myID, to: from, signal}}));
            });
            newPeer.on('connect', () => {
                console.log(`Connected to peer ${from}`);
                connectedPeers.add(from);
                checkDone();
            });
            peerInstance = { peer: newPeer, id: from };
            peers.set(from, peerInstance!);
        }

        peerInstance!.peer.signal(signal);
    }

    const checkDone = () => {
        if (connectedPeers.size === nPlayerGame - 1) {
            console.log('Connected to all players');
            signalServer.send(JSON.stringify({type: 'ready-to-disconnect'}))
        }
    }

    const handleDone = () => {
        signalServer.close();
        console.log('Ready to play!');
    }
}