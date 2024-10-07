import React from 'react';
import {Padding} from "../SpritesheetViewer";

interface GridSettingsProps {
    columns: number;
    setColumns: (value: number) => void;
    rows: number;
    setRows: (value: number) => void;
    gridPadding: number;
    setGridPadding: (value: number) => void;
    imgPadding: Padding;
    setImgPadding: React.Dispatch<React.SetStateAction<Padding>>
}

const GridSettings: React.FC<GridSettingsProps> = ({columns, setColumns, rows, setRows, gridPadding, setGridPadding, imgPadding, setImgPadding}) => {
    const handleImagePadding = (key: keyof Padding, value: number) => {
        const prevPadding = imgPadding;
        setImgPadding(prevPadding => ({
                ...prevPadding,
                [key]: value
        }));
    }

    return (
        <div className="flex flex-col space-x-4">
            <div>
                <label>Columns:</label>
                <input
                    type="number"
                    value={columns}
                    onChange={(e) => setColumns(Number(e.target.value))}
                    min="1"
                    className="border p-1"
                />
            </div>
            <div>
                <label>Rows:</label>
                <input
                    type="number"
                    value={rows}
                    onChange={(e) => setRows(Number(e.target.value))}
                    min="1"
                    className="border p-1"
                />
            </div>
            <div>
                <label>Grid Padding:</label>
                <input
                    type="number"
                    value={gridPadding}
                    onChange={(e) => setGridPadding(Number(e.target.value))}
                    className="border p-1"
                />
            </div>
            <div className="flex space-x-4">
                Padding:
                <label>Top:</label>
                <input
                    type="number"
                    value={imgPadding.up}
                    onChange={(e) => handleImagePadding('up', Number(e.target.value))}
                    className="border p-1"
                />
                <label>Left:</label>
                <input
                    type="number"
                    value={imgPadding.left}
                    onChange={(e) => handleImagePadding('left', Number(e.target.value))}
                    className="border p-1"
                />
                <label>Bottom:</label>
                <input
                    type="number"
                    value={imgPadding.down}
                    onChange={(e) => handleImagePadding('down', Number(e.target.value))}
                    className="border p-1"
                />
                <label>Right:</label>
                <input
                    type="number"
                    value={imgPadding.right}
                    onChange={(e) => handleImagePadding('right', Number(e.target.value))}
                    className="border p-1"
                />
            </div>
        </div>
    );
};

export default GridSettings;