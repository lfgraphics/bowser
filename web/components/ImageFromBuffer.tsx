import React, { useEffect, useState } from "react";

interface ImageFromBufferObjectProps {
    bufferObject?: {
        type: string;
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
    const [src, setSrc] = useState<string | null>(null);

    useEffect(() => {
        if (!bufferObject || !Array.isArray(bufferObject.data)) return;

        const blob = new Blob([new Uint8Array(bufferObject.data)], { type: mimeType });
        const reader = new FileReader();
        reader.onloadend = () => {
            setSrc(reader.result as string);
        };
        reader.readAsDataURL(blob);
    }, [bufferObject, mimeType]);

    if (!src) return null;

    return <img src={src} alt={alt} className={className} />;
};

export default ImageFromBufferObject;
