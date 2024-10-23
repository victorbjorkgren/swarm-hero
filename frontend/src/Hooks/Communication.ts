import { ClientID } from "@shared/commTypes";
import { GameConnection, PeerMap } from "../UI-Comps/CharacterCreation/MainCharacterCreation";
import {PlayerServer} from "../GameComps/Entities/PlayerServer";

export type SignalMesssage = {
    from: ClientID;
    to: ClientID;
    signal: any; // This will include both SDP (offer/answer) and ICE candidates
};

export type InitialPeerMap = Map<string, RTCPeerConnection>;

export const connectMesh = (
    nPlayerGame: number,
    nConnected: (n: number) => void,
    doneCallback: (connectionData: GameConnection) => void
) => {
    const initializingPeers: InitialPeerMap = new Map();
    const connectedPeers: PeerMap = new Map();
    const signalServer = new WebSocket("ws://192.168.1.100:8081");
    let myId: string = "";
    let hostId: string = "";
    // let connectedPeersCollection: Set<ClientID> = new Set();

    signalServer.onopen = () => {
        console.log("Connected to signaling server");
    };

    signalServer.onmessage = (message) => {
        const data = JSON.parse(message.data);
        switch (data.type) {
            case "host-setup":
                myId = data.payload.playerId as string;
                hostId = data.payload.hostId;
                console.log("Received host setup", myId, hostId);
                break;
            case "peer-join":
                const newPeerId = data.payload.peerId;
                if (newPeerId !== myId) {
                    createPeer(newPeerId, true); // Initiator if we're the one connecting
                }
                break;
            case "peer-leave":
                handlePeerLeave(data.payload.peerId);
                break;
            case "signal-message":
                handleMessage(data.payload);
                break;
            case "all-peers-ready":
                handleDone();
                break;
            default:
                console.error("Unhandled message type", data.type);
                break;
        }
    };

    // Create a peer connection and handle signaling
    function createPeer(peerId: string, initiator: boolean) {
        const peerConnection = new RTCPeerConnection({
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });

        let dataChannel: RTCDataChannel | null = null;

        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                signalServer.send(
                    JSON.stringify({
                        type: "signal-message",
                        payload: { from: myId, to: peerId, signal: event.candidate },
                    })
                );
            }
        };

        // Handle connection state changes
        peerConnection.onconnectionstatechange = () => {
            if (peerConnection.connectionState === "connected") {
                console.log(`Connected to peer ${peerId}`);
                checkDone();
            }
        };

        if (initiator) {
            dataChannel = peerConnection.createDataChannel("game-data");
            dataChannel.onopen = () => {
                console.log("Data channel is open");
            };
            // dataChannel.onmessage = (event) => {
            //     console.log(`Message from ${peerId}:`, event.data);
            // };
            connectedPeers.set(peerId, { peer: peerConnection, datachannel: dataChannel, id: peerId });
            checkDone();
        } else {
            peerConnection.ondatachannel = (event) => {
                dataChannel = event.channel;
                dataChannel.onopen = () => {
                    console.log("Data channel is open");
                };
                connectedPeers.set(peerId, { peer: peerConnection, datachannel: dataChannel, id: peerId });
                checkDone()
                // dataChannel.onmessage = (event) => {
                //     console.log(`Message from ${peerId}:`, event.data);
                // };
            };
        }

        if (initiator) {
            peerConnection
                .createOffer()
                .then((offer) => peerConnection.setLocalDescription(offer))
                .then(() => {
                    signalServer.send(
                        JSON.stringify({
                            type: "signal-message",
                            payload: {
                                from: myId,
                                to: peerId,
                                signal: peerConnection.localDescription,
                            },
                        })
                    );
                });

        }
        initializingPeers.set(peerId, peerConnection);
    }

    // Handle incoming signaling messages
    const handleMessage = (messageData: SignalMesssage) => {
        const { from, to, signal } = messageData;
        if (from === myId) throw new Error("Messaged self!");

        let peerConnection = initializingPeers.get(from);
        if (!peerConnection) {
            createPeer(from, false);
            peerConnection = initializingPeers.get(from)!;
        }

        if (signal.type === "offer") {
            // If we received an offer, create an answer
            peerConnection
                .setRemoteDescription(new RTCSessionDescription(signal))
                .then(() => peerConnection.createAnswer())
                .then((answer) => peerConnection.setLocalDescription(answer))
                .then(() => {
                    signalServer.send(
                        JSON.stringify({
                            type: "signal-message",
                            payload: {
                                from: myId,
                                to: from,
                                signal: peerConnection.localDescription,
                            },
                        })
                    );
                });
        } else if (signal.type === "answer") {
            peerConnection.setRemoteDescription(new RTCSessionDescription(signal));
        } else if (signal.candidate) {
            peerConnection.addIceCandidate(new RTCIceCandidate(signal));
        }
    };

    // Check if all peers are connected
    const checkDone = () => {
        nConnected(connectedPeers.size);
        if (connectedPeers.size === nPlayerGame - 1) {
            console.log("Disconnecting from signal server");
            signalServer.send(JSON.stringify({ type: "ready-to-disconnect" }));
        }
    };

    const handlePeerLeave = (peerId: string) => {
        const peerConnection = initializingPeers.get(peerId);
        if (peerConnection) {
            peerConnection.close();
        }
        initializingPeers.delete(peerId);
        connectedPeers.delete(peerId);
        nConnected(connectedPeers.size);
    };

    const handleDone = () => {
        signalServer.close();
        console.log("Ready to play!");
        doneCallback({ localId: myId, hostId: hostId, peers: connectedPeers });
    };

    const leave = () => {
        signalServer.close();
    };

    return leave;
};