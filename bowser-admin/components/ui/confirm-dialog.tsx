"use client";

import React from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";

export interface ConfirmDialogProps {
    /** Controls visibility */
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Dialog heading */
    title: string;
    /** Descriptive text shown under the heading */
    description: string;
    /** Label for the confirm button (default: "Delete") */
    confirmLabel?: string;
    /** Visual variant for the confirm button (default: "destructive") */
    confirmVariant?: "destructive" | "default" | "outline" | "secondary" | "ghost" | "link";
    /** Called when the user clicks Confirm */
    onConfirm: () => void;
    /** Shows a spinner on the confirm button and disables both buttons */
    isLoading?: boolean;
}

export function ConfirmDialog({
    open,
    onOpenChange,
    title,
    description,
    confirmLabel = "Delete",
    confirmVariant = "destructive",
    onConfirm,
    isLoading,
}: ConfirmDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader className="items-center text-center gap-3 pt-6">
                    <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                        <AlertTriangle className="h-6 w-6 text-destructive" />
                    </div>
                    <DialogTitle className="text-lg">{title}</DialogTitle>
                    <DialogDescription className="text-center text-muted-foreground">
                        {description}
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="flex-col sm:flex-row gap-2 px-6 pb-6">
                    <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => onOpenChange(false)}
                        disabled={isLoading}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant={confirmVariant}
                        className="flex-1 gap-2"
                        onClick={onConfirm}
                        disabled={isLoading}
                    >
                        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                        {confirmLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
