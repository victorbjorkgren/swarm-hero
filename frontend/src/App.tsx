import React, {useEffect} from 'react';
import './App.css';
import MainGame from './GameComps/MainGame';

const App: React.FC = () => {
  // const [socket, setSocket] = useState<WebSocket | null>(null);

  useEffect(() => {
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

  return (
      <div className="App">
        <div className={"game-container"}>
          <MainGame />
        </div>
      </div>
  );
};

export default App;
