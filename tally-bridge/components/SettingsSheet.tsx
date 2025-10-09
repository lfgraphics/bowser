"use client"

import { useState, useEffect } from 'react'
import { Settings, X, RefreshCw } from 'lucide-react'
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent } from './ui/card'
import ThemeToggle from './ThemeToggle'

interface SettingsSheetProps {
    bridgeReady: boolean
}

export default function SettingsSheet({
    bridgeReady
}: SettingsSheetProps) {
    const [open, setOpen] = useState(false)
    const [localUri, setLocalUri] = useState('mongodb://localhost:27017')
    const [localUriStatus, setLocalUriStatus] = useState<'idle' | 'loading' | 'saving' | 'success' | 'error'>('idle')
    const [localUriMessage, setLocalUriMessage] = useState('')

    // Load current configuration when component mounts or opens
    const loadCurrentConfig = async () => {
        if (!bridgeReady) {
            console.log('Bridge not ready, skipping config load')
            return
        }
        
        console.log('Loading current MongoDB configuration using bridge API...')
        setLocalUriStatus('loading')
        try {
            if (!window?.bridge) {
                throw new Error('Bridge not available')
            }
            
            const uri = await window?.bridge?.getLocalUri()
            console.log('Bridge API Response:', uri)
            
            if (typeof uri === 'string') {
                setLocalUri(uri || 'mongodb://localhost:27017')
                setLocalUriStatus('idle')
                console.log('Successfully loaded config via bridge:', uri)
            } else {
                throw new Error('Invalid response from bridge API')
            }
        } catch (error: any) {
            console.error('Failed to load MongoDB config via bridge:', error)
            setLocalUriStatus('error')
            setLocalUriMessage(`Failed to load configuration: ${error?.message || 'Unknown error'}`)
            setTimeout(() => {
                setLocalUriStatus('idle')
                setLocalUriMessage('')
            }, 5000)
        }
    }

    // Save configuration
    const onSaveLocalUri = async () => {
        if (!bridgeReady) return
        
        setLocalUriStatus('saving')
        setLocalUriMessage('')
        
        try {
            // Simple validation
            if (!/^mongodb(\+srv)?:\/\//.test(localUri)) {
                throw new Error('URI must start with mongodb:// or mongodb+srv://')
            }

            if (!window?.bridge) {
                throw new Error('Bridge not available')
            }

            console.log('Saving MongoDB configuration via bridge API:', localUri)
            const result = await window?.bridge?.setLocalUri(localUri)
            console.log('Bridge API save result:', result)

            if (result?.success) {
                setLocalUriStatus('success')
                setLocalUriMessage('Configuration saved successfully! Changes apply immediately.')
            } else {
                throw new Error(result?.error || 'Failed to save configuration')
            }
        } catch (error: any) {
            console.error('Failed to save MongoDB config via bridge:', error)
            setLocalUriStatus('error')
            setLocalUriMessage(error?.message || 'Failed to save configuration')
        } finally {
            setTimeout(() => {
                setLocalUriStatus('idle')
                setLocalUriMessage('')
            }, 3000)
        }
    }

    // Load config when component mounts and when opened
    useEffect(() => {
        loadCurrentConfig()
    }, [bridgeReady])

    // Reload config when sheet opens
    useEffect(() => {
        if (open && bridgeReady) {
            loadCurrentConfig()
        }
    }, [open, bridgeReady])

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
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-medium mb-2">MongoDB Configuration</h3>
                                <label className="text-xs text-muted-foreground">Local URI</label>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={loadCurrentConfig}
                                disabled={!bridgeReady || localUriStatus === 'loading'}
                                className="h-8 w-8 p-0"
                            >
                                <RefreshCw className={`w-4 h-4 ${localUriStatus === 'loading' ? 'animate-spin' : ''}`} />
                            </Button>
                        </div>
                        <div className="flex gap-2">
                            <Input
                                value={localUri}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocalUri(e.target.value)}
                                placeholder="mongodb://localhost:27017"
                                className="flex-1"
                                disabled={localUriStatus === 'loading'}
                            />
                            <Button
                                onClick={onSaveLocalUri}
                                disabled={!bridgeReady || localUriStatus === 'saving' || localUriStatus === 'loading'}
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
                            Configuration is synced with user-config.json and applies immediately on save.
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