import React, {useEffect, useRef, useState} from 'react';
import Phaser from 'phaser';
import {preload, create, update, resumeGame} from "./PhaserFuncs";
import styles from "comps.module.css";

declare global {
    namespace Phaser {
        interface Scene {
            winner?: string | undefined;
            setWinner?: React.Dispatch<React.SetStateAction<string | undefined>>;
        }
    }
}

const MainGame: React.FC = () => {
    const gameContainerRef = useRef(null);
    const gameRef = useRef<Phaser.Game | null>(null);
    const [winner, setWinner] = useState<string | undefined>(undefined);

    useEffect(() => {
        const config: Phaser.Types.Core.GameConfig = {
            type: Phaser.AUTO,
            width: '100%',
            height: '70%',
            parent: gameContainerRef.current,
            scene: {
                preload: preload,
                create: function () {
                    create.call(this);
                    // Pass setWinner to the Phaser scene
                    this.setWinner = setWinner;
                    this.winner = winner;
                },
                update: update,
            }
        };

        gameRef.current = new Phaser.Game(config);

        return () => {
            gameRef.current?.destroy(true);
        };
    }, []);

    const handleRematch = () => {
        if (gameRef.current) {
            gameRef.current.scene.scenes[0].scene.restart();
            setWinner(undefined); // Reset the winner state
            resumeGame();
        }
    };

    return (
        <div className="App">
            <div className={styles.gameContainer} ref={gameContainerRef}>
                <div className={styles.hud}>
                    {winner && (
                        <div>
                            Winner: {winner}
                            <button
                                className={styles.hudButton}
                                onClick={handleRematch}
                                content={"Rematch!"}/>
                        </div>
                    )
                    }
                </div>
            </div>
        </div>
    );
};

export default MainGame;