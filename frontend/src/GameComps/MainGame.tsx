import React, {useEffect, useRef} from 'react';
import Phaser from 'phaser';
import {preload, create, update} from "./PhaserFuncs";

const MainGame: React.FC = () => {
    const gameContainerRef = useRef(null);

    useEffect(() => {
        const config: Phaser.Types.Core.GameConfig = {
            type: Phaser.AUTO,
            width: '100%',
            height: '70%',
            parent: gameContainerRef.current,
            scene: {
                preload: preload,
                create: create,
                update: update,
            }
        };

        const game = new Phaser.Game(config);

        return () => {
            game.destroy(true);
        };
    }, []);

    return <div ref={gameContainerRef}></div>;
};

export default MainGame;