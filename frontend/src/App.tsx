import React, {useEffect} from 'react';
import './App.css';
import {Main} from "./UI-Comps/Main";

const App: React.FC = () => {
  // const [socket, setSocket] = useState<WebSocket | null>(null);

  useEffect(() => {
    const signalingServer = new WebSocket('ws://localhost:8080');
    // const ws = new WebSocket('ws://localhost:8080');
    // setSocket(ws);
    //
    // ws.onmessage = (message: MessageEvent) => {
    //   console.log('Received: ', message.data);
    //   // You can handle the message and pass it to Phaser if needed
    // };
    //
    // return () => {
    //   ws.close();
    // };
  }, []);

  return <Main />;
};

export default App;
