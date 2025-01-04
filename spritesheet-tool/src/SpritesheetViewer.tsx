import React, {useState} from 'react';
import ImageUploader from './Components/ImageUploader';
import GridSettings from './Components/GridSettings';
import ImageArea, { calculateGrid } from './Components/ImageArea';
import SaveButton from './Components/SaveButton';
import {BackgroundRemoval} from "./Components/BackgroundRemoval";
import axios from 'axios';

export interface Padding {
    left: number,
    right: number,
    up: number,
    down: number
}

const SpritesheetViewer: React.FC = () => {
    const [image, setImage] = useState<string | null>(null);
    const [columns, setColumns] = useState<number>(1);
    const [rows, setRows] = useState<number>(1);
    const [gridPadding, setGridPadding] = useState<number>(0);
    const [backgroundColor, setBackgroundColor] = useState<string>('#ffffff');
    const [processedImage, setProcessedImage] = useState<string | null>(null);
    const [backgroundFeather, setBackgroundFeather] = useState<number>(0);
    const [resizeScale, setResizeScale] = useState<number>(1);
    const [imgPadding, setImgPadding] = useState<Padding>({left: 0, right: 0, up: 0, down: 0});
    const [imgName, setImgName] = useState<string>("NoName");

    const grids = calculateGrid(image, columns, rows, gridPadding, imgPadding);

    const handleImageUpload = (imageUrl: string, name: string) => {
        console.log(imageUrl);
        setImgName(name);
        setImage(imageUrl);
        // handleSendImage(imageUrl);
    };

    const handleRemoveBackground = async () => {
        if (image) {
            const formData = new FormData();
            const file = await fetch(image).then(res => res.blob());
            formData.append('file', file);
            formData.append("color", backgroundColor);
            formData.append("feather", backgroundFeather.toString());

            try {
                const response = await axios.post('http://127.0.0.1:8000/remove-background/', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                setProcessedImage(`data:image/png;base64,${response.data.image}`);
                setImage(`data:image/png;base64,${response.data.image}`);
            } catch (error) {
                console.error("Error processing image:", error);
            }
        }
    };

    const handleRescale = async () => {
        if (image) {
            const formData = new FormData();
            const file = await fetch(image).then(res => res.blob());
            formData.append('file', file);
            formData.append('scale', resizeScale.toString());

            try {
                const response = await axios.post('http://127.0.0.1:8000/resize/', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                setProcessedImage(`data:image/png;base64,${response.data.image}`);
                setImage(`data:image/png;base64,${response.data.image}`);
            } catch (error) {
                console.error("Error processing image:", error);
            }
        }
    };

    // const handleImgPadding = async() => {
    //     if (image) {
    //         console.log(imgPadding);
    //         const formData = new FormData();
    //         formData.append("padding", JSON.stringify(imgPadding));
    //
    //         try {
    //             const response = await axios.post('http://127.0.0.1:8000/set-padding/', formData, {
    //                 headers: {'Content-Type': 'multipart/form-data'},
    //             });
    //             setTransparentImage(`data:image/png;base64,${response.data.image}`);
    //             setImage(`data:image/png;base64,${response.data.image}`);
    //         } catch (error) {
    //             console.error("Error processing image:", error);
    //         }
    //     }
    // };

    // useEffect(() => {
    //     handleImgPadding();
    // }, [imgPadding]);

    return (
        <div className="w-full max-w-xl mx-auto p-4">
            <ImageUploader onUpload={handleImageUpload} />
            {image && (
                <>
                    <ImageArea
                        image={image}
                        grids={grids}
                    />
                    <GridSettings
                        columns={columns}
                        setColumns={setColumns}
                        rows={rows}
                        setRows={setRows}
                        gridPadding={gridPadding}
                        setGridPadding={setGridPadding}
                        imgPadding={imgPadding}
                        setImgPadding={setImgPadding}
                        scale={resizeScale}
                        setScale={setResizeScale}
                    />
                    <BackgroundRemoval
                        backgroundFeather={backgroundFeather}
                        setBackgroundFeather={setBackgroundFeather}
                        setBackgroundColor={setBackgroundColor}
                    />
                    <button
                        onClick={handleRemoveBackground}
                        className="bg-blue-500 text-white p-2 rounded hover:bg-blue-700 mt-4"
                    >
                        Process Image
                    </button>
                    <button
                        onClick={handleRescale}
                        className="bg-blue-500 text-white p-2 rounded hover:bg-blue-700 mt-4"
                    >
                        Resize Image
                    </button>
                    {processedImage && (
                        <div className="mt-4">
                            <h3 className="mb-2">Transparent Image Preview:</h3>
                            <img src={processedImage} alt="Transparent preview" className="w-full"/>
                        </div>
                    )}
                    <SaveButton grids={grids} name={imgName} processedImage={processedImage}/>
                </>
            )}
        </div>
    );
};

export default SpritesheetViewer;