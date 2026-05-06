"use client"
import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Separator } from '../ui/separator'
import { Plus, Trash2, Loader2, CheckCircle2, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'

// Types based on Route model
export interface PumpDetail {
    PumpName: string
    StartPoint: number
    OffRoad: number
    EndPoint: number
}

export interface RouteFormData {
    Name: string
    Country: string
    From: string
    To: string
    Distance: number
    NoofToll: number
    Via?: string
    PumpDetail: PumpDetail[]
}

export const initialFormData: RouteFormData = {
    Name: '',
    Country: 'India',
    From: '',
    To: '',
    Distance: 0,
    NoofToll: 0,
    PumpDetail: []
}

interface RouteFormProps {
    initialData?: RouteFormData
    onSubmit: (data: RouteFormData) => Promise<void>
    onReset?: () => void
    submitLabel: string
    loading: boolean
    title: string
    description: string
}

const RouteForm = ({
    initialData = initialFormData,
    onSubmit,
    onReset,
    submitLabel,
    loading,
    title,
    description
}: RouteFormProps) => {
    const [formData, setFormData] = useState<RouteFormData>(initialData)
    const [errors, setErrors] = useState<Record<string, string>>({})

    // Reset formData when initialData changes (important for Update)
    useEffect(() => {
        setFormData(initialData)
    }, [initialData])

    // Auto-generate Name when From or To changes
    useEffect(() => {
        if (formData.From && formData.To) {
            setFormData(prev => ({
                ...prev,
                Name: `${formData.From} To ${formData.To}`
            }))
        }
    }, [formData.From, formData.To])

    // Recalculate all pump EndPoints when Distance changes
    useEffect(() => {
        if (formData.PumpDetail.length > 0) {
            setFormData(prev => ({
                ...prev,
                PumpDetail: prev.PumpDetail.map(pump => ({
                    ...pump,
                    EndPoint: prev.Distance - pump.StartPoint + pump.OffRoad
                }))
            }))
        }
    }, [formData.Distance])

    const handleInputChange = (field: keyof RouteFormData, value: string | number) => {
        setFormData(prev => ({ ...prev, [field]: value }))

        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev }
                delete newErrors[field]
                return newErrors
            })
        }
    }

    // Pump Detail handlers
    const addPumpDetail = () => {
        setFormData(prev => ({
            ...prev,
            // Default EndPoint to total distance
            PumpDetail: [...prev.PumpDetail, { PumpName: '', StartPoint: 0, OffRoad: 0, EndPoint: prev.Distance }]
        }))
    }

    const removePumpDetail = (index: number) => {
        setFormData(prev => ({
            ...prev,
            PumpDetail: prev.PumpDetail.filter((_, i) => i !== index)
        }))
    }

    const updatePumpDetail = (index: number, field: keyof PumpDetail, value: string | number) => {
        setFormData(prev => ({
            ...prev,
            PumpDetail: prev.PumpDetail.map((item, i) => {
                if (i !== index) return item

                const updated = { ...item, [field]: value }

                // Auto-calculate EndPoint: Distance - StartPoint + OffRoad
                if (field === 'StartPoint' || field === 'OffRoad') {
                    const startPoint = field === 'StartPoint' ? Number(value) : item.StartPoint
                    const offRoad = field === 'OffRoad' ? Number(value) : item.OffRoad
                    updated.EndPoint = prev.Distance - startPoint + offRoad
                }

                return updated
            })
        }))
    }

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {}

        if (!formData.From.trim()) newErrors.From = 'From location is required'
        if (!formData.To.trim()) newErrors.To = 'To location is required'
        if (!formData.Country.trim()) newErrors.Country = 'Country is required'

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleFormSubmit = async () => {
        if (!validateForm()) {
            toast.error('Please fix the validation errors')
            return
        }
        await onSubmit(formData)
    }

    const handleFormReset = () => {
        setFormData(initialFormData)
        setErrors({})
        if (onReset) onReset()
    }

    return (
        <Card className='w-full bg-background'>
            <CardHeader>
                <CardTitle className="text-2xl font-bold">
                    {title}
                </CardTitle>
                <CardDescription>
                    {description}
                </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-8">
                {/* Basic Information */}
                <section>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <div className="w-1 h-6 bg-blue-500 rounded-full" />
                        Route Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="From">From *</Label>
                            <Input
                                id="From"
                                value={formData.From}
                                onChange={(e) => handleInputChange('From', e.target.value)}
                                placeholder="Enter starting location"
                                className={errors.From ? 'border-red-500' : ''}
                            />
                            {errors.From && <p className="text-xs text-red-500">{errors.From}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="To">To *</Label>
                            <Input
                                id="To"
                                value={formData.To}
                                onChange={(e) => handleInputChange('To', e.target.value)}
                                placeholder="Enter destination location"
                                className={errors.To ? 'border-red-500' : ''}
                            />
                            {errors.To && <p className="text-xs text-red-500">{errors.To}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="Name">Route Name</Label>
                            <Input
                                id="Name"
                                value={formData.Name}
                                disabled
                                placeholder="Will be auto-generated"
                                className="bg-muted"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="Country">Country *</Label>
                            <Input
                                id="Country"
                                value={formData.Country}
                                onChange={(e) => handleInputChange('Country', e.target.value)}
                                placeholder="Enter country"
                                className={errors.Country ? 'border-red-500' : ''}
                            />
                            {errors.Country && <p className="text-xs text-red-500">{errors.Country}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="Distance">Distance (km)</Label>
                            <Input
                                id="Distance"
                                type="string"
                                inputMode='numeric'
                                value={formData.Distance}
                                onChange={(e) => handleInputChange('Distance', parseFloat(e.target.value) || 0)}
                                placeholder="Enter distance in km"
                                min="0"
                                step="0.1"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="NoofToll">Number of Tolls</Label>
                            <Input
                                id="NoofToll"
                                type="string"
                                inputMode='numeric'
                                value={formData.NoofToll}
                                onChange={(e) => handleInputChange('NoofToll', parseInt(e.target.value) || 0)}
                                placeholder="Enter number of tolls"
                                min="0"
                                step="1"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="via">Via</Label>
                            <Input
                                id="via"
                                type="string"
                                value={formData.Via}
                                onChange={(e) => handleInputChange('Via', e.target.value || "")}
                                placeholder="Enter via (If any)"
                            />
                        </div>
                    </div>
                </section>

                <Separator />

                {/* Pump Details */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <div className="w-1 h-6 bg-green-500 rounded-full" />
                            Pump Details
                        </h3>
                        <Button
                            type="button"
                            onClick={addPumpDetail}
                            size="sm"
                            variant="outline"
                            className="gap-2"
                        >
                            <Plus className="h-4 w-4" />
                            Add Pump
                        </Button>
                    </div>

                    {formData.PumpDetail.length === 0 ? (
                        <div className="text-center py-8 border-2 border-dashed rounded-lg bg-muted/5">
                            <p className="text-muted-foreground text-sm">
                                No pump details added. Click "Add Pump" to add pump information.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {formData.PumpDetail.map((pump, pumpIdx) => (
                                <Card key={pumpIdx} className="relative border-l-4 border-l-green-500">
                                    <CardHeader className="pb-3">
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-base">
                                                Pump #{pumpIdx + 1}
                                            </CardTitle>
                                            <Button
                                                type="button"
                                                onClick={() => removePumpDetail(pumpIdx)}
                                                size="icon"
                                                variant="ghost"
                                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor={`PumpName-${pumpIdx}`}>Pump Name *</Label>
                                                <Input
                                                    id={`PumpName-${pumpIdx}`}
                                                    value={pump.PumpName}
                                                    onChange={(e) => updatePumpDetail(pumpIdx, 'PumpName', e.target.value)}
                                                    placeholder="Enter pump name"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor={`StartPoint-${pumpIdx}`}>Distance form Start Point (km)</Label>
                                                <Input
                                                    id={`StartPoint-${pumpIdx}`}
                                                    type="string"
                                                    inputMode='numeric'
                                                    value={pump.StartPoint}
                                                    onChange={(e) => updatePumpDetail(pumpIdx, 'StartPoint', parseFloat(e.target.value) || 0)}
                                                    placeholder="Enter start point"
                                                    min="0"
                                                    step="0.1"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor={`OffRoad-${pumpIdx}`}>Off Road (km)</Label>
                                                <Input
                                                    id={`OffRoad-${pumpIdx}`}
                                                    type="string"
                                                    inputMode='numeric'
                                                    value={pump.OffRoad}
                                                    onChange={(e) => updatePumpDetail(pumpIdx, 'OffRoad', parseFloat(e.target.value) || 0)}
                                                    placeholder="Enter off road distance"
                                                    min="0"
                                                    step="0.1"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor={`EndPoint-${pumpIdx}`}>Distance to End Point (km)</Label>
                                                <Input
                                                    id={`EndPoint-${pumpIdx}`}
                                                    type="string"
                                                    inputMode='numeric'
                                                    value={pump.EndPoint}
                                                    disabled
                                                    placeholder="Auto-calculated"
                                                    className="bg-muted"
                                                    min="0"
                                                    step="0.1"
                                                />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </section>

                <Separator />

                {/* Form Actions */}
                <div className="flex flex-col sm:flex-row gap-4 justify-end pt-4">
                    <Button
                        type="button"
                        onClick={handleFormReset}
                        variant="outline"
                        disabled={loading}
                        className="gap-2"
                    >
                        <RotateCcw className="h-4 w-4" />
                        Reset Form
                    </Button>
                    <Button
                        type="button"
                        onClick={handleFormSubmit}
                        disabled={loading}
                        className="gap-2"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="h-4 w-4" />
                                {submitLabel}
                            </>
                        )}
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}

export default RouteForm
