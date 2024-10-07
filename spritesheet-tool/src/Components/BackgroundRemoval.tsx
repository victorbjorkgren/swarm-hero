import React, {useEffect} from "react";
import { EyeDropper } from 'react-eyedrop';

interface Props {
    backgroundFeather: number;
    setBackgroundFeather: React.Dispatch<React.SetStateAction<number>>;
    setBackgroundColor: React.Dispatch<React.SetStateAction<string>>;
}

export const BackgroundRemoval: React.FC<Props> = ({backgroundFeather, setBackgroundFeather, setBackgroundColor}) => {
    return (
        <div className="mt-4">
            <label className="block mb-2">Pick a color to make transparent:</label>
            <EyeDropper
                onChange={({rgb, hex}) => {
                    setBackgroundColor(hex);
                    console.log(rgb, hex);
                }}
            />
            <label>Feather:</label>
            <input
                type="number"
                value={backgroundFeather}
                onChange={(e) => setBackgroundFeather(Number(e.target.value))}
                min="0"
                className="border p-1"
            />
        </div>
    );
};

const hexToRgb = (hex: string) => {
    const bigint = parseInt(hex.slice(1), 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return {r, g, b};
};

const makeColorTransparent = (color: string, imageSrc: string) => {
    return new Promise<string | null>((resolve) => {
        const img = new Image();
        img.src = imageSrc;

        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            if (ctx) {
                const { r, g, b } = hexToRgb(color);

                // Set canvas size to image size
                canvas.width = img.width;
                canvas.height = img.height;

                // Draw the original image onto the canvas
                ctx.drawImage(img, 0, 0);

                // Get image data
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;

                // Loop through all pixels
                for (let i = 0; i < data.length; i += 4) {
                    // Match the color (r, g, b) to make it transparent
                    if (data[i] === r && data[i + 1] === g && data[i + 2] === b) {
                        data[i + 3] = 0; // Set alpha to 0 (transparent)
                    }
                }

                // Put the updated image data back into the canvas
                ctx.putImageData(imageData, 0, 0);

                // Return the canvas data as a data URL
                resolve(canvas.toDataURL('image/png'));
            } else {
                resolve(null);
            }
        };
    });
};