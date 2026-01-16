"use client";

import { useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";

const useDrawerHistory = (isDrawerOpen: boolean, onClose: () => void) => {
    const pathname = usePathname();
    const drawerHistoryPushed = useRef(false);

    // Mount-only effect for popstate listener to avoid Strict Mode duplication
    useEffect(() => {
        const handlePopState = (e: PopStateEvent) => {
            if (isDrawerOpen) {
                onClose(); // Close drawer if open, regardless of state
            }
        };

        window.addEventListener("popstate", handlePopState);
        return () => {
            window.removeEventListener("popstate", handlePopState);
        };
    }, [isDrawerOpen, onClose]); // Stable dependencies

    // Effect for managing history state
    useEffect(() => {
        if (isDrawerOpen && !drawerHistoryPushed.current && window.history.state?.drawer !== "open") {
            window.history.pushState({ drawer: "open" }, "", window.location.href);
            drawerHistoryPushed.current = true;
        }

        return () => {
            if (drawerHistoryPushed.current) {
                window.history.replaceState({}, "", window.location.href);
                drawerHistoryPushed.current = false;
            }
        };
    }, [isDrawerOpen, pathname]); // pathname ensures reset on route changes
};

export default useDrawerHistory;