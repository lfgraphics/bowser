"use client";
import { BASE_URL } from "@/lib/api";
import { useRef, useEffect } from "react";

export const updateDriverMobile = async (driverId: string, driverMobile: string) => {
    try {
        const response = await fetch(`${BASE_URL}/searchDriver/updateDriverMobile`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ driverId, driverMobile }),
        });

        if (!response.ok) {
            throw new Error(`Failed to update driver mobile number: ${response.status}`);
        }

        const result = await response.json();
        return result.message;
    } catch (error: any) {
        throw new Error(error?.message || 'Failed to update driver mobile number');
    }
};

export const updateTripDriver = async (vehicleNo: string, driver: string) => {
    try {
        const response = await fetch(`${BASE_URL}/allocateFueling/updateTripDriver`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ vehicleNo, driver }),
        });

        if (!response.ok) {
            throw new Error(`Failed to update trip details: ${response.status}`);
        } else {
            const result = await response.json();
            return result.message;
        }
    } catch (error: any) {
        throw new Error(error?.message || 'Failed to update trip details');
    }
}

export const getLocalDateTimeString = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
};

/**
 * React hook for debouncing a callback when dependencies change.
 * @param callback Function to debounce.
 * @param delay Delay in milliseconds.
 * @param deps Dependency array.
 */
export const useDebounceEffect = (
    callback: () => void,
    delay: number,
    deps: React.DependencyList
) => {
    const callbackRef = useRef(callback);

    // Always keep the latest callback
    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    useEffect(() => {
        const handler = setTimeout(() => {
            callbackRef.current();
        }, delay);

        return () => clearTimeout(handler);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [...deps, delay]);
};

export async function getLocation(): Promise<string | { error: string }> {
    if (!navigator.geolocation) {
        return { error: "Geolocation is not supported by this browser." };
    }

    try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
            });
        });

        const { latitude, longitude } = position.coords;
        const coordinates = `${latitude}, ${longitude}`;
        return coordinates;
    } catch (error) {
        return { error: "Unable to retrieve location. Please check permissions or internet connection." };
    }
}

export const toDate = (d?: string | Date | null) => d ? new Date(d) : undefined

/**
 * Converts text to title case (normal case) where each word is capitalized
 * @param text - The input text to convert
 * @returns The text converted to title case
 * @example
 * toTitleCase("hello world") // "Hello World"
 * toTitleCase("HELLO WORLD") // "Hello World"
 * toTitleCase("hELLo WoRLD") // "Hello World"
 */
export function toTitleCase(text: string): string {
    if (!text) return text;

    return text
        .toLowerCase()
        .split(' ')
        .map(word => {
            if (word.length === 0) return word;
            return word.charAt(0).toUpperCase() + word.slice(1);
        })
        .join(' ');
}

/**
 * Converts text to title case with support for common prepositions and articles
 * that should remain lowercase (except when they're the first word)
 * @param text - The input text to convert
 * @returns The text converted to proper title case
 * @example
 * toProperTitleCase("the quick brown fox") // "The Quick Brown Fox"
 * toProperTitleCase("lord of the rings") // "Lord of the Rings"
 */
export function toProperTitleCase(text: string): string {
    if (!text) return text;

    const lowercaseWords = new Set([
        'a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'if', 'in',
        'nor', 'of', 'on', 'or', 'so', 'the', 'to', 'up', 'yet'
    ]);

    return text
        .toLowerCase()
        .split(' ')
        .map((word, index) => {
            if (word.length === 0) return word;

            // Always capitalize the first word
            if (index === 0) {
                return word.charAt(0).toUpperCase() + word.slice(1);
            }

            // Keep common words lowercase unless they're the first word
            if (lowercaseWords.has(word)) {
                return word;
            }

            return word.charAt(0).toUpperCase() + word.slice(1);
        })
        .join(' ');
}

/**
 * Formats remarks text for better readability
 * - Converts to proper sentence case
 * - Handles multiple sentences
 * - Trims whitespace
 * - Capitalizes first letter of each sentence
 * @param remark - The remark text to format
 * @returns The formatted remark text
 * @example
 * formatRemark("loaded at depot. going to xyz location") // "Loaded at depot. Going to xyz location"
 * formatRemark("VEHICLE BREAKDOWN AT HIGHWAY") // "Vehicle breakdown at highway"
 * formatRemark("trip completed successfully. driver reported on time") // "Trip completed successfully. Driver reported on time"
 */
export function formatRemark(remark: string): string {
    if (!remark || typeof remark !== 'string') return remark || '';

    // Clean up the input
    const cleaned = remark.trim();
    if (!cleaned) return '';

    // Split by sentences (periods, exclamation marks, question marks)
    const sentences = cleaned.split(/([.!?]+)/).filter(part => part.trim());

    let result = '';
    for (let i = 0; i < sentences.length; i++) {
        const part = sentences[i].trim();
        if (!part) continue;

        // If it's punctuation, just add it
        if (/^[.!?]+$/.test(part)) {
            result += part;
        } else {
            // It's a sentence - format it
            const formatted = part.toLowerCase();
            const capitalized = formatted.charAt(0).toUpperCase() + formatted.slice(1);

            // Add space before sentence if not the first one
            if (result && !result.endsWith(' ')) {
                result += ' ';
            }
            result += capitalized;
        }
    }

    return result;
}

/**
 * Formats remarks with enhanced formatting for vehicle-specific contexts
 * - Capitalizes vehicle-related terms properly
 * - Handles common abbreviations
 * - Formats locations and technical terms
 * @param remark - The remark text to format
 * @returns The formatted remark text with vehicle-specific formatting
 * @example
 * formatVehicleRemark("loaded at iocl depot") // "Loaded at IOCL Depot"
 * formatVehicleRemark("going to hp petrol pump") // "Going to HP Petrol Pump"
 * formatVehicleRemark("vehicle breakdown on nh-1") // "Vehicle breakdown on NH-1"
 */
export function formatVehicleRemark(remark: string): string {
    if (!remark || typeof remark !== 'string') return remark || '';

    // First apply basic formatting
    let formatted = formatRemark(remark);

    // Vehicle and fuel industry specific terms
    const replacements = [
        // Fuel companies
        { pattern: /\biocl\b/gi, replacement: 'IOCL' },
        { pattern: /\bbpcl\b/gi, replacement: 'BPCL' },
        { pattern: /\bhpcl\b/gi, replacement: 'HPCL' },
        { pattern: /\bhp\b/gi, replacement: 'HP' },
        { pattern: /\bessar\b/gi, replacement: 'Essar' },
        { pattern: /\breliance\b/gi, replacement: 'Reliance' },

        // Common terms
        { pattern: /\bdepot\b/gi, replacement: 'Depot' },
        { pattern: /\bterminal\b/gi, replacement: 'Terminal' },
        { pattern: /\bpetrol pump\b/gi, replacement: 'Petrol Pump' },
        { pattern: /\bfilling station\b/gi, replacement: 'Filling Station' },
        { pattern: /\bnh-(\d+)/gi, replacement: 'NH-$1' },
        { pattern: /\bsh-(\d+)/gi, replacement: 'SH-$1' },
        { pattern: /\bkm\b/gi, replacement: 'km' },

        // Vehicle terms
        { pattern: /\btanker\b/gi, replacement: 'Tanker' },
        { pattern: /\bvehicle\b/gi, replacement: 'Vehicle' },
        { pattern: /\bdriver\b/gi, replacement: 'Driver' },
        { pattern: /\bloaded\b/gi, replacement: 'Loaded' },
        { pattern: /\bunloaded\b/gi, replacement: 'Unloaded' },
        { pattern: /\bempty\b/gi, replacement: 'Empty' },
        { pattern: /\bbreakdown\b/gi, replacement: 'Breakdown' },
        { pattern: /\bmaintenance\b/gi, replacement: 'Maintenance' },
    ];

    // Apply replacements
    replacements.forEach(({ pattern, replacement }) => {
        formatted = formatted.replace(pattern, replacement);
    });

    return formatted;
}