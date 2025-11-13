"use client";

import React, { useState, useCallback, useEffect } from "react";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import useDrawerHistory from "@/hooks/use-drawer-history";
import { Button } from "./ui/button";

const CustomDrawer = ({ title, description, children }: { title: string | null; description: string | null; children: React.ReactNode }) => {
    const [isOpen, setIsOpen] = useState(true);

    const handleClose = useCallback(() => {
        setIsOpen(false);
        // Clean up history state on UI close
        if (window.history.state?.drawer === "open") {
            window.history.back(); // Trigger back to pop the state
        }
    }, []);

    useDrawerHistory(isOpen, handleClose);

    // Log mount only, not re-renders
    useEffect(() => {
        console.log("CustomDrawer mounted, isOpen:", isOpen);
    }, []);

    return (
        <Drawer open={isOpen} onOpenChange={setIsOpen} onClose={handleClose}>
            <DrawerContent className="mx-auto w-full max-w-lg md:max-w-7xl px-4 max-h-[80svh]">
                <DrawerHeader className="text-left">
                    <DrawerTitle>{title}</DrawerTitle>
                    <DrawerDescription>{description}</DrawerDescription>
                </DrawerHeader>
                {children}
                <DrawerFooter className="pt-2">
                    <DrawerClose asChild>
                        <Button variant="outline" onClick={handleClose}>
                            Close
                        </Button>
                    </DrawerClose>
                </DrawerFooter>
            </DrawerContent>
        </Drawer>
    );
};

export default CustomDrawer;