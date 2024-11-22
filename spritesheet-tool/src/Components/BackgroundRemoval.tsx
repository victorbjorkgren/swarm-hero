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
