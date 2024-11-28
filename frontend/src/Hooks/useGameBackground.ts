import {useEffect, useRef} from "react";
import {Application} from "pixi.js";
import {setupRandomBackground} from "../GameComps/Graphics/TileBackground";

export const useGameBackground = () => {
    const pixiRef = useRef<Application | null>(null);
    const sceneContainerRef = useRef<HTMLDivElement | null>(null);

    const initScene = async () => {
        if (pixiRef.current !== null) return;

        pixiRef.current = new Application();
        await pixiRef.current.init({
            background: '#72b372',
            width: window.innerWidth,
            height: window.innerHeight,
            antialias: true,
            eventMode: "none",
        });

        if (sceneContainerRef.current) {
            sceneContainerRef.current.appendChild(pixiRef.current.canvas);
        }

        await setupRandomBackground(pixiRef.current, window.innerWidth, window.innerHeight);
    }

    const cleanUpScene = () => {
        if (pixiRef.current && pixiRef.current.renderer) {
            sceneContainerRef.current?.removeChild(pixiRef.current.canvas);
            pixiRef.current.destroy();
            pixiRef.current = null;
        }
    }

    useEffect(() => {
        initScene();

        return () => {
            cleanUpScene();
        };
    }, []);

    return sceneContainerRef;
}
