import React from 'react';

interface ImageUploaderProps {
    onUpload: (imageUrl: string) => void;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onUpload }) => {
    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                onUpload(e.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="mb-4">
            <input type="file" accept="image/*" onChange={handleImageUpload} />
        </div>
    );
};

export default ImageUploader;