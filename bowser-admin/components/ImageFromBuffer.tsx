import React from "react";

interface ImageFromBufferObjectProps {
    bufferObject?: {
        type: string; // always "Buffer"
        data: number[];
    };
    mimeType?: string;
    alt?: string;
    className?: string;
}

const ImageFromBufferObject: React.FC<ImageFromBufferObjectProps> = ({
    bufferObject,
    mimeType = "image/png",
    alt = "Image",
    className = ""
}) => {
    if (!bufferObject || !Array.isArray(bufferObject.data)) return null;
    const uint8Array = new Uint8Array(bufferObject.data);
    const base64String = btoa(String.fromCharCode(...uint8Array));
    const src = `data:${mimeType};base64,${base64String}`;

    return (
        <>
            <img src={src} alt={alt} className={className} />
        </>
    );
};

export default ImageFromBufferObject;
