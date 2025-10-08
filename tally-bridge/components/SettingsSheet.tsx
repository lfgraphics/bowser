"use client"

import { useState } from 'react'
import { Settings, X } from 'lucide-react'
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent } from './ui/card'
import ThemeToggle from './ThemeToggle'

interface SettingsSheetProps {
    localUri: string
    setLocalUri: (uri: string) => void
    localUriStatus: 'idle' | 'saving' | 'success' | 'error'
    localUriMessage: string
    bridgeReady: boolean
    onSaveLocalUri: () => Promise<void>
}

export default function SettingsSheet({
    localUri,
    setLocalUri,
    localUriStatus,
    localUriMessage,
    bridgeReady,
    onSaveLocalUri
}: SettingsSheetProps) {
    const [open, setOpen] = useState(false)

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <Settings className="w-4 h-4" />
                    Settings
                </Button>
            </SheetTrigger>
            <SheetContent className="w-[400px] sm:w-[540px] p-6">
                <SheetHeader>
                    <SheetTitle>Settings</SheetTitle>
                </SheetHeader>

                <div className="flex flex-col justify-around">
                    {/* Theme Settings */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-medium">Theme</h3>
                            <p className="text-xs text-muted-foreground">
                                Toggle between light and dark theme
                            </p>
                        </div>
                        <ThemeToggle />
                    </div>

                    <div className="grid gap-4">
                        <div>
                            <h3 className="text-sm font-medium mb-2">MongoDB Configuration</h3>
                            <label className="text-xs text-muted-foreground">Local URI</label>
                        </div>
                        <div className="flex gap-2">
                            <Input
                                value={localUri}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocalUri(e.target.value)}
                                placeholder="mongodb://localhost:27017"
                                className="flex-1"
                            />
                            <Button
                                onClick={onSaveLocalUri}
                                disabled={!bridgeReady || localUriStatus === 'saving'}
                                size="sm"
                            >
                                {localUriStatus === 'saving' ? 'Saving…' : 'Save'}
                            </Button>
                        </div>
                        {localUriMessage && (
                            <div className={
                                localUriStatus === 'error'
                                    ? 'text-destructive text-xs'
                                    : 'text-green-500 text-xs'
                            }>
                                {localUriMessage}
                            </div>
                        )}
                        <p className="text-xs text-muted-foreground">
                            Enter your MongoDB connection string. Changes may require app restart.
                        </p>
                    </div>

                    <SheetFooter>
                        <h3 className="text-sm font-medium mb-2">Application Info</h3>
                        <div className="text-xs text-muted-foreground space-y-1">
                            <p>Tally Bridge v3.0.0</p>
                            <p>MongoDB Sync & Tally Integration</p>
                        </div>
                    </SheetFooter>
                </div>
            </SheetContent>
        </Sheet>
    )
}