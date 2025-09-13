"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { DetailedVehicleData } from "@/types"; // adjust path

// Shape of the cache
export type VehiclesCacheData = {
    selectedVehicle?: string | null;       // vehicleId currently being viewed
    viewingDriver?: string | null;         // driverId currently being managed
    searchTerm?: string;                   // filter/search
    inactiveFilter?: boolean;              // toggle for showing inactive vehicles
    vehiclesAccordion?: string;            // expanded accordion state
    vehicleDetails?: Record<string, DetailedVehicleData>; // cached vehicles keyed by id
};

type VehiclesCacheContextType = {
    cache: VehiclesCacheData;
    setCache: (updater: (prev: VehiclesCacheData) => VehiclesCacheData) => void;
    clearCache: () => void;
};

const VehiclesCacheContext = createContext<VehiclesCacheContextType | null>(null);

export const VehiclesCacheProvider = ({ children }: { children: React.ReactNode }) => {
    const [cache, setCacheState] = useState<VehiclesCacheData>({});

    // Load from sessionStorage
    useEffect(() => {
        const saved = sessionStorage.getItem("vehiclesCache");
        if (saved) {
            const parsed = JSON.parse(saved);
            const now = Date.now();
            // Reset if cache is from another day
            if (!parsed.timestamp || new Date(parsed.timestamp).toDateString() !== new Date().toDateString()) {
                sessionStorage.removeItem("vehiclesCache");
            } else {
                setCacheState(parsed.data);
            }
        }
    }, []);

    // Save whenever cache changes
    useEffect(() => {
        sessionStorage.setItem(
            "vehiclesCache",
            JSON.stringify({ data: cache, timestamp: Date.now() })
        );
    }, [cache]);

    const setCache = (updater: (prev: VehiclesCacheData) => VehiclesCacheData) =>
        setCacheState((prev) => updater(prev));

    const clearCache = () => setCacheState({});

    return (
        <VehiclesCacheContext.Provider value={{ cache, setCache, clearCache }}>
            {children}
        </VehiclesCacheContext.Provider>
    );
};

export const useVehiclesCache = () => {
    const ctx = useContext(VehiclesCacheContext);
    if (!ctx) throw new Error("useVehiclesCache must be used inside VehiclesCacheProvider");
    return ctx;
};
