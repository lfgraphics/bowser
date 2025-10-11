"use client"
import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select"
import {
    TooltipProvider,
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import {
    Settings,
    Plus,
    Trash2,
    Lock,
    Unlock,
    Edit,
    Save,
    X
} from 'lucide-react'
import { toast } from 'sonner'

interface ConfigsManagerProps {
    configs: Record<string, any>
    onConfigsChange: (configs: Record<string, any>) => void
    isEditing: boolean
    onEditToggle: () => void
    onSave: () => void
    onCancel: () => void
    isAdmin?: boolean
    showReadonlyToggle?: boolean
    title?: string
    description?: string
}

export default function ConfigsManager({
    configs,
    onConfigsChange,
    isEditing,
    onEditToggle,
    onSave,
    onCancel,
    isAdmin = false,
    showReadonlyToggle = false,
    title = "Configuration Settings",
    description = "Manage your configuration settings"
}: ConfigsManagerProps) {
    const [isAddingConfig, setIsAddingConfig] = useState(false)
    const [newConfigKey, setNewConfigKey] = useState('')
    const [newConfigValue, setNewConfigValue] = useState('')

    // For allowedExpenses
    const [isAddingExpense, setIsAddingExpense] = useState(false)
    const [customExpenseKey, setCustomExpenseKey] = useState('')
    const [customExpenseValue, setCustomExpenseValue] = useState('')

    // Filter configs based on user role - hide readonly configs for non-admin users
    const getVisibleConfigs = () => {
        if (isAdmin) {
            return configs
        }

        // For non-admin users, filter out readonly configs
        const visibleConfigs: Record<string, any> = {}
        Object.entries(configs).forEach(([key, value]) => {
            if (typeof value === 'object' && value !== null && !value.readonly) {
                visibleConfigs[key] = value
            } else if (typeof value !== 'object' || value === null) {
                // Include primitive values
                visibleConfigs[key] = value
            }
        })
        return visibleConfigs
    }

    const handleConfigChange = (key: string, field: string, value: any) => {
        const updatedConfigs = { ...configs }
        if (typeof updatedConfigs[key] === 'object' && updatedConfigs[key] !== null) {
            updatedConfigs[key] = { ...updatedConfigs[key], [field]: value }
        } else {
            updatedConfigs[key] = { [field]: value }
        }
        onConfigsChange(updatedConfigs)
    }

    const handleConfigValueChange = (key: string, value: any) => {
        const updatedConfigs = { ...configs }
        updatedConfigs[key] = value
        onConfigsChange(updatedConfigs)
    }

    const handleAddCustomConfig = () => {
        if (!newConfigKey.trim() || !newConfigValue.trim()) {
            toast.error('Please enter both config name and value')
            return
        }

        const updatedConfigs = { ...configs }
        updatedConfigs[newConfigKey] = {
            value: newConfigValue,
            readonly: false
        }
        onConfigsChange(updatedConfigs)

        setNewConfigKey('')
        setNewConfigValue('')
        setIsAddingConfig(false)
        toast.success('Configuration added')
    }

    const handleRemoveConfig = (configKey: string) => {
        const updatedConfigs = { ...configs }
        delete updatedConfigs[configKey]
        onConfigsChange(updatedConfigs)
        toast.success('Configuration removed')
    }

    const handleAddCustomExpense = () => {
        if (!customExpenseKey.trim() || !customExpenseValue.trim()) {
            toast.error('Please enter both expense name and value')
            return
        }

        const updatedConfigs = { ...configs }
        if (!updatedConfigs.allowedExpenses) {
            updatedConfigs.allowedExpenses = { readonly: false }
        }

        updatedConfigs.allowedExpenses = {
            ...updatedConfigs.allowedExpenses,
            [customExpenseKey]: parseInt(customExpenseValue) || 0
        }

        onConfigsChange(updatedConfigs)

        setCustomExpenseKey('')
        setCustomExpenseValue('')
        setIsAddingExpense(false)
        toast.success('Custom expense added')
    }

    const handleRemoveExpense = (expenseKey: string) => {
        const updatedConfigs = { ...configs }
        if (updatedConfigs.allowedExpenses && typeof updatedConfigs.allowedExpenses === 'object') {
            const newExpenses = { ...updatedConfigs.allowedExpenses }
            delete newExpenses[expenseKey]
            updatedConfigs.allowedExpenses = newExpenses
            onConfigsChange(updatedConfigs)
            toast.success('Expense removed')
        }
    }

    const visibleConfigs = getVisibleConfigs()

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Settings className="h-5 w-5" />
                            {title}
                        </CardTitle>
                        <CardDescription>
                            {description}
                        </CardDescription>
                    </div>
                    <div className="flex gap-2">
                        {isEditing ? (
                            <>
                                <Button size="sm" onClick={onSave}>
                                    <Save className="h-4 w-4 mr-2" />
                                    Save
                                </Button>
                                <Button size="sm" variant="outline" onClick={onCancel}>
                                    <X className="h-4 w-4 mr-2" />
                                    Cancel
                                </Button>
                            </>
                        ) : (
                            <Button size="sm" onClick={onEditToggle}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                            </Button>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                {Object.keys(visibleConfigs).length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">
                        No configuration settings available
                    </p>
                ) : (
                    Object.entries(visibleConfigs).map(([key, value]) => (
                        <div key={key} className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Label className="text-sm font-medium capitalize">
                                        {key.replace(/([A-Z])/g, ' $1').trim()}
                                    </Label>
                                    {typeof value === 'object' && value?.readonly && (
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Lock className="h-4 w-4 text-muted-foreground" />
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>This setting is read-only</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    )}
                                    {showReadonlyToggle && isAdmin && isEditing && typeof value === 'object' && (
                                        <div className="flex items-center gap-2">
                                            <Switch
                                                checked={!value?.readonly}
                                                onCheckedChange={(checked) =>
                                                    handleConfigChange(key, 'readonly', !checked)
                                                }
                                            />
                                            <span className="text-xs text-muted-foreground">
                                                {value?.readonly ? 'Read-only' : 'Editable'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                {isEditing && !value?.readonly && (
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleRemoveConfig(key)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>

                            <div className="bg-muted/50 p-4 rounded-lg">
                                {key === 'allowedExpenses' && typeof value === 'object' && value !== null ? (
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-2 gap-4">
                                            {Object.entries(value).filter(([k]) => k !== 'readonly').map(([expenseKey, expenseValue]) => (
                                                <div key={expenseKey} className="flex items-center justify-between p-2 bg-background rounded border">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium capitalize">{expenseKey}:</span>
                                                        {isEditing && !value.readonly ? (
                                                            <Input
                                                                type="number"
                                                                value={expenseValue as number}
                                                                onChange={(e) => handleConfigChange(key, expenseKey, parseInt(e.target.value) || 0)}
                                                                className="w-20 h-8"
                                                            />
                                                        ) : (
                                                            <Badge variant="secondary">₹{String(expenseValue)}</Badge>
                                                        )}
                                                    </div>
                                                    {isEditing && !value.readonly && (
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => handleRemoveExpense(expenseKey)}
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>

                                        {isEditing && !value.readonly && (
                                            <div className="mt-3">
                                                {isAddingExpense ? (
                                                    <div className="flex gap-2">
                                                        <Input
                                                            placeholder="Expense name"
                                                            value={customExpenseKey}
                                                            onChange={(e) => setCustomExpenseKey(e.target.value)}
                                                            className="flex-1"
                                                        />
                                                        <Input
                                                            type="number"
                                                            placeholder="Amount"
                                                            value={customExpenseValue}
                                                            onChange={(e) => setCustomExpenseValue(e.target.value)}
                                                            className="w-24"
                                                        />
                                                        <Button size="sm" onClick={handleAddCustomExpense}>
                                                            <Plus className="h-4 w-4" />
                                                        </Button>
                                                        <Button size="sm" variant="outline" onClick={() => setIsAddingExpense(false)}>
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => setIsAddingExpense(true)}
                                                    >
                                                        <Plus className="h-4 w-4 mr-2" />
                                                        Add Custom Expense
                                                    </Button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ) : typeof value === 'object' && value !== null ? (
                                    <div className="space-y-2">
                                        {Object.entries(value).filter(([k]) => k !== 'readonly').map(([subKey, subValue]) => (
                                            <div key={subKey} className="flex items-center justify-between">
                                                <Label className="capitalize">{subKey.replace(/([A-Z])/g, ' $1').trim()}:</Label>
                                                {isEditing && !value.readonly ? (
                                                    <Input
                                                        value={subValue as string}
                                                        onChange={(e) => handleConfigChange(key, subKey, e.target.value)}
                                                        className="w-32"
                                                    />
                                                ) : (
                                                    <Badge variant="outline">{String(subValue)}</Badge>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between">
                                        <Label>Value:</Label>
                                        {isEditing ? (
                                            <Input
                                                value={String(value)}
                                                onChange={(e) => handleConfigValueChange(key, e.target.value)}
                                                className="w-32"
                                            />
                                        ) : (
                                            <Badge variant="outline">{String(value)}</Badge>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}

                {isEditing && (
                    <Separator />
                )}

                {isEditing && (
                    <div className="space-y-3">
                        {isAddingConfig ? (
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Config name"
                                    value={newConfigKey}
                                    onChange={(e) => setNewConfigKey(e.target.value)}
                                    className="flex-1"
                                />
                                <Input
                                    placeholder="Config value"
                                    value={newConfigValue}
                                    onChange={(e) => setNewConfigValue(e.target.value)}
                                    className="flex-1"
                                />
                                <Button size="sm" onClick={handleAddCustomConfig}>
                                    <Plus className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => setIsAddingConfig(false)}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        ) : (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setIsAddingConfig(true)}
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Configuration
                            </Button>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}