import React, { useEffect } from 'react';
import Phaser from 'phaser';

const PhaserGame: React.FC = () => {
    useEffect(() => {
        const config: Phaser.Types.Core.GameConfig = {
            type: Phaser.AUTO,
            width: 800,
            height: 600,
            scene: {
                preload: function (this: Phaser.Scene) {
                    this.load.image('sky', 'https://examples.phaser.io/assets/skies/space3.png');
                },
                create: function (this: Phaser.Scene) {
                    this.add.image(400, 300, 'sky');
                }
            }
        };

        const game = new Phaser.Game(config);

        return () => {
            game.destroy(true);
        };
    }, []);

    return <div id="phaser-container"></div>;
};

export default PhaserGame;