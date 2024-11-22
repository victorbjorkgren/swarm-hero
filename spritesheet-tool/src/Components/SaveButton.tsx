import React from 'react';
import {AnchorPoint, GridArea} from "./ImageArea";

interface Frame {
    x: number;
    y: number;
    w: number;
    h: number;
}


interface FrameData {
    frame: Frame;
    sourceSize: { w: number; h: number };
    spriteSourceSize: { x: number; y: number; w: number; h: number };
    anchor: AnchorPoint;
}

interface MetaData {
    image?: string;
    format?: string;
    size?: { w: number; h: number };
    scale?: number;
}

interface SpriteSheetData {
    frames: { [key: string]: FrameData };
    meta: MetaData;
    animations: { [key: string]: string[] };
}

interface SaveButtonProps {
    grids: GridArea[];
    name: string;
    processedImage: string | null;
}

const SaveButton: React.FC<SaveButtonProps> = ({ grids, name, processedImage}) => {


    const handleSaveToJson = () => {
        const animation: string[] = [];

        const img = document.getElementById('spritesheet') as HTMLImageElement;
        const naturalWidth = img ? img.naturalWidth : 1;
        const naturalHeight = img ? img.naturalHeight : 1;

        const data: SpriteSheetData = {
            frames: {},
            meta: {
                scale: 1,
                image: name + ".png",
                format: "RGBA8888",
                size: {w: naturalWidth, h: naturalHeight},
            },
            animations: {},
        };

        grids.forEach((grid, index) => {
            const spriteName = name + "_" + index.toString();
            if (!spriteName) return;

            animation.push(spriteName)

            const x = grid.left / grid.scale.x;
            const y = grid.top / grid.scale.y;
            const w = grid.width / grid.scale.x;
            const h = grid.height / grid.scale.y;
            data.frames[spriteName] = {
                frame: { x: x, y: y, w: w, h: h},
                sourceSize: { w: w, h: h },
                spriteSourceSize: { x: 0, y: 0, w: w, h: h },
                anchor: grid.anchor,
            };
        });

        data.animations['animation0'] = animation;

        const json = JSON.stringify(data, null, 2);
        console.log(json);
        const blob = new Blob([json], { type: 'application/json' });
        console.log(blob);
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = name + '.json';
        link.click();

        if (processedImage !== null) {
            setTimeout(() => {
                const imageLink = document.createElement('a');
                imageLink.href = processedImage;
                imageLink.download = name + '.png';
                imageLink.click();
            }, 100);
        }
    };

    return (
        <button
            onClick={handleSaveToJson}
            className="bg-blue-500 text-white p-2 rounded hover:bg-blue-700 mt-4"
        >
            Save Grid as JSON
        </button>
    );
};

export default SaveButton;