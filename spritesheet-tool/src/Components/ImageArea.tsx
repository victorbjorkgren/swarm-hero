import React from 'react';
import {Padding} from "../SpritesheetViewer";

export interface GridArea {
    top: number;
    left: number;
    width: number;
    height: number;
    anchor: AnchorPoint;
}

export interface AnchorPoint {
    x: number;
    y: number;
}

interface GridOverlayProps {
    image: string;
    grids: GridArea[];
}

const ImageArea: React.FC<GridOverlayProps> = ({ image, grids}) => {
    return (
        <div className="relative mb-4">
            <img id="spritesheet" src={image} alt="spritesheet" className="w-full"/>
            {grids.map((grid, index) => (
                <div key={index}>
                    <div
                        style={{
                            position: 'absolute',
                            top: `${grid.top}px`,
                            left: `${grid.left}px`,
                            width: `${grid.width}px`,
                            height: `${grid.height}px`,
                            border: '2px dashed red',
                            boxSizing: 'border-box',
                        }}
                    />
                    <div
                        style={{
                            top: `${grid.top + grid.anchor.y}px`,
                            left: `${grid.left + grid.anchor.x}px`,
                        }}
                        className="absolute w-2 h-2 rounded-full bg-green-200 box-border transform -translate-x-1/2 -translate-y-1/2"
                    />
                </div>
            ))}
        </div>
    );
};

export const calculateGrid = (
    image: string | null,
    columns: number,
    rows: number,
    gridPadding: number,
    imgPadding: Padding,
): GridArea[] => {
    if (!image) return [];
    const img = document.getElementById('spritesheet') as HTMLImageElement;
    const width = img ? img.width : 0;
    const height = img ? img.height : 0;
    const w_pad = imgPadding.left + imgPadding.right;
    const h_pad = imgPadding.up + imgPadding.down
    const gridWidth = (width + w_pad - (columns - 1) * gridPadding) / columns;
    const gridHeight = (height + h_pad - (rows - 1) * gridPadding) / rows;

    let grids = [];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < columns; c++) {
            const top = imgPadding.up + r * (gridHeight + gridPadding);
            const left = imgPadding.left + c * (gridWidth + gridPadding);
            const topDelta = top - Math.max(0, top);
            const leftDelta = left - Math.max(0, left);
            const anchor = {x: left - Math.max(0, left), y: top - Math.max(0, top)};
            grids.push({
                top: Math.max(0, top),
                left: Math.max(0, left),
                width: gridWidth + leftDelta,
                height: gridHeight + topDelta,
                anchor: anchor,
            });
        }
    }
    return grids;
};

export default ImageArea;