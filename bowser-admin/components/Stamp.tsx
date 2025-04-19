import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Stamp Component
 * 
 * A reusable component to display a stamp-like UI element with customizable text, size, color, border rounding, and rotation.
 * 
 * @param {string} text - The text to display inside the stamp.
 * @param {('scale-50' | 'scale-75' | 'scale-100' | 'scale-125' | 'scale-150')} [size='scale-100'] - Tailwind CSS transform scale values.
 * @param {('red-600' | 'green-600' | 'yellow-600' | 'blue-600')} [color='red-600'] - Tailwind CSS text and border color classes.
 * @param {('' | 'rounded' | 'rounded-md' | 'rounded-lg' | 'rounded-full')} [rounded=''] - Tailwind CSS rounded classes.
 * @param {('rotate-0' | 'rotate-6' | 'rotate-12' | 'rotate-[-15deg]')} [rotation='rotate-[-15deg]'] - Tailwind CSS rotation classes.
 */
interface StampProps {
    text: string;
    size?: 'scale-50' | 'scale-75' | 'scale-100' | 'scale-125' | 'scale-150'; // Suggestions for size
    color?: 'red-600' | 'green-600' | 'yellow-600' | 'blue-600'; // Suggestions for color
    rounded?: '' | 'rounded' | 'rounded-sm' | 'rounded-md' | 'rounded-lg' | 'rounded-full'; // Suggestions for rounded
    rotation?: 'rotate-0' | 'rotate-6' | 'rotate-12' | 'rotate-[-15deg]'; // Suggestions for rotation
    className?: string; // Additional class names for customization
}

const Stamp: React.FC<StampProps> = ({
    text,
    size = 'scale-100',
    color = 'red-600',
    rounded = '',
    rotation = 'rotate-[-15deg]',
    className = ''
}) => {
    return (
        <div
            className={cn(
                'relative flex justify-center items-center',
                size,
                className
            )}
        >
            <div
                className={cn(
                    'absolute text-center font-bold text-xl transform border-4 border-dashed px-4 py-2',
                    `text-${color}`,
                    `border-${color}`,
                    rotation,
                    rounded
                )}
            >
                {text}
            </div>
        </div>
    );
};

export default Stamp;