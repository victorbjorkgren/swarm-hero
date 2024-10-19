export interface Communication {}
//
// export const useSignalServer = () => {
//     const signalingServer = new WebSocket('ws://localhost:8080');
//     let peerConnection: { addIceCandidate: (arg0: RTCIceCandidate) => void; } | null = null;
//     let hostId = null;
//     let isHost = false;
//
//     signalingServer.onmessage = (message) => {
//         const data = JSON.parse(message.data);
//
//         if (data.type === 'hostAssigned') {
//             hostId = data.hostId;
//             isHost = (hostId === myPlayerId);  // Check if this client is the host
//
//             if (!isHost) {
//                 // If I'm not the host, start a WebRTC connection with the host
//                 startConnectionWithHost();
//             }
//         } else if (data.type === 'offer' && isHost) {
//             // If I'm the host and I receive an offer, respond with an answer
//             handleOffer(data.offer, data.sourceId);
//         } else if (data.type === 'answer' && !isHost) {
//             // If I'm not the host, and I receive an answer to my offer
//             handleAnswer(data.answer);
//         } else if (data.type === 'iceCandidate') {
//             // Handle ICE candidates for both host and non-host clients
//             peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
//         }
//     };
// }
//
// const configuration = {
//     iceServers: [
//         { urls: 'stun:stun.l.google.com:19302' } // Using Google STUN server for simplicity
//     ]
// };
//
// function startConnectionWithHost() {
//     peerConnection = new RTCPeerConnection(configuration);
//
//     // Handle ICE candidates (send them to the signaling server)
//     peerConnection.onicecandidate = (event) => {
//         if (event.candidate) {
//             signalingServer.send(JSON.stringify({
//                 type: 'iceCandidate',
//                 candidate: event.candidate,
//                 targetId: hostId
//             }));
//         }
//     };
//
//     // Create and send WebRTC offer
//     peerConnection.createOffer()
//         .then(offer => {
//             peerConnection.setLocalDescription(offer);
//             signalingServer.send(JSON.stringify({
//                 type: 'offer',
//                 offer: offer,
//                 targetId: hostId
//             }));
//         });
// }
//
// // Host handling offer from other players
// const handleOffer = (offer, sourceId) => {
//     let peerConnection = new RTCPeerConnection(configuration);
//
//     peerConnection.onicecandidate = (event) => {
//         if (event.candidate) {
//             signalingServer.send(JSON.stringify({
//                 type: 'iceCandidate',
//                 candidate: event.candidate,
//                 targetId: sourceId
//             }));
//         }
//     };
//
//     peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
//     peerConnection.createAnswer()
//         .then(answer => {
//             peerConnection.setLocalDescription(answer);
//             signalingServer.send(JSON.stringify({
//                 type: 'answer',
//                 answer: answer,
//                 targetId: sourceId
//             }));
//         });
// }
//
// function handleAnswer(answer) {
//     peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
// }