"use client";

import { useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";

const useDrawerHistory = (isDrawerOpen: boolean, onClose: () => void) => {
    const pathname = usePathname();
    const drawerHistoryPushed = useRef(false);

    // Mount-only effect for popstate listener to avoid Strict Mode duplication
    useEffect(() => {
        const handlePopState = (e: PopStateEvent) => {
            console.log("popstate event, state:", e.state);
            if (isDrawerOpen) {
                onClose(); // Close drawer if open, regardless of state
            }
        };

        window.addEventListener("popstate", handlePopState);
        return () => {
            console.log("Removing popstate listener");
            window.removeEventListener("popstate", handlePopState);
        };
    }, [isDrawerOpen, onClose]); // Stable dependencies

    // Effect for managing history state
    useEffect(() => {
        if (isDrawerOpen && !drawerHistoryPushed.current && window.history.state?.drawer !== "open") {
            console.log("Pushing history state, current state:", window.history.state);
            window.history.pushState({ drawer: "open" }, "", window.location.href);
            drawerHistoryPushed.current = true;
        }

        return () => {
            if (drawerHistoryPushed.current) {
                console.log("Cleaning up history state");
                window.history.replaceState({}, "", window.location.href);
                drawerHistoryPushed.current = false;
            }
        };
    }, [isDrawerOpen, pathname]); // pathname ensures reset on route changes
};

export default useDrawerHistory;