"use client"
import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '../ui/select'
import { Separator } from '../ui/separator'
import { Plus, Trash2, Loader2, CheckCircle2, RotateCcw } from 'lucide-react'
import { BASE_URL } from '@/lib/api'
import { toast } from 'sonner'
import Combobox, { ComboboxOption } from '../Combobox'

const COMPANIES = ["Expo", "Infra", "ITA", "ITPL"];

// Types based on Customer model
export interface DetentionEntry {
    Product: string
    DetMethod: string
    Charges: string
    DetDays: string
}

export interface RouteDetention {
    Route: string
    Detention: DetentionEntry[]
}

export interface ProductWise {
    PRProdcutName: string
    BilQty: string
    TollTax: string
    BillDateRange: string
    FreightCalc: string
}

export interface CustomerFormData {
    CompanyName: string
    Name: string
    IsMainParty: "Yes" | "No"
    CompanyTag: "Not Applicable" | "EXPO" | "Expo" | "INFRA" | "Infra" | "ITA" | "Ita" | "ITPL" | "Itpl"
    MailingName: string
    CustGroup: string
    Address: string
    Pincode: string
    ContactPerson: string
    MobileNo: string
    LandLineNo: string
    EMailID: string
    Country: string
    State: string
    Location: string
    PanNo: string
    RegtType: string
    GSTIN: string
    IsActiveCustomer: "Yes" | "No"
    IsBillingParty: "Yes" | "No"
    IsAttachedOwner: "Yes" | "No"
    IsConsiGnor: "Yes" | "No"
    IsConsignee: "Yes" | "No"
    ROuteDetention: RouteDetention[]
    "Product Wise": ProductWise[]
    CommanLedger?: string
}

export interface CustomerGroupFormData {
    Name: string
    State: string
}

export const initialFormData: CustomerFormData = {
    CompanyName: '',
    Name: '',
    IsMainParty: 'No',
    CompanyTag: 'Not Applicable',
    MailingName: '',
    CustGroup: '',
    Address: '',
    Pincode: '',
    ContactPerson: '',
    MobileNo: '',
    LandLineNo: '',
    EMailID: '',
    Country: 'India',
    State: '',
    Location: '',
    PanNo: '',
    RegtType: '',
    GSTIN: '',
    IsActiveCustomer: 'Yes',
    IsBillingParty: 'No',
    IsAttachedOwner: 'No',
    IsConsiGnor: 'No',
    IsConsignee: 'No',
    ROuteDetention: [],
    "Product Wise": [],
    CommanLedger: ""
}

interface CustomerFormProps {
    initialData?: CustomerFormData
    onSubmit: (data: CustomerFormData) => Promise<void>
    onReset?: () => void
    submitLabel: string
    loading: boolean
    title: string
    description: string
}

const CustomerForm = ({
    initialData = initialFormData,
    onSubmit,
    onReset,
    submitLabel,
    loading,
    title,
    description
}: CustomerFormProps) => {
    const [formData, setFormData] = useState<CustomerFormData>(initialData)
    const [errors, setErrors] = useState<Record<string, string>>({})

    // Reset formData when initialData changes (important for Update)
    useEffect(() => {
        setFormData(initialData)
        if (initialData.CommanLedger) {
            setSelectedCustomerId(initialData.CommanLedger)
        } else {
            setSelectedCustomerId("")
        }

        if (initialData.CustGroup) {
            setSelectedCustomerGroupId(initialData.CustGroup)
        } else {
            setSelectedCustomerGroupId("")
        }
    }, [initialData])


    // Goods fetching for Product Wise section
    const [goodsSearch, setGoodsSearch] = useState<string>("")
    const [goods, setGoods] = useState<ComboboxOption[]>([])

    const [selectedCustomerId, setSelectedCustomerId] = useState<string>("")
    const [customerSearch, setCustomerSearch] = useState<string>("")
    const [customerOptions, setCustomerOptions] = useState<ComboboxOption[]>([])
    const [fetchingCustomer, setFetchingCustomer] = useState(false)
    const [selectedCustomerData, setSelectedCustomerData] = useState<CustomerFormData | null>(null)

    const [selectedCustomerGroupId, setSelectedCustomerGroupId] = useState<string>("")
    const [customerGroupSearch, setCustomerGroupSearch] = useState<string>("")
    const [customerGroupOptions, setCustomerGroupOptions] = useState<ComboboxOption[]>([])
    const [fetchingCustomerGroup, setFetchingCustomerGroup] = useState(false)
    const [selectedCustomerGroupData, setSelectedCustomerGroupData] = useState<CustomerGroupFormData | null>(null)

    // Fetch goods from API
    useEffect(() => {
        const fetchGoods = async () => {
            try {
                const response = await fetch(`${BASE_URL}/trans-app/goods?params=${goodsSearch}`)
                const data = await response.json()
                const formattedData: ComboboxOption[] = data.map((item: { _id: string, GoodsName: string }) => ({
                    value: item.GoodsName,
                    label: item.GoodsName
                }))
                setGoods(formattedData)
            } catch (error) {
                console.error('Error fetching goods:', error)
            }
        }
        fetchGoods()
    }, [goodsSearch])

    useEffect(() => {
        const searchCustomers = async () => {
            if (customerSearch.length < 2) {
                setCustomerOptions([])
                return
            }
            try {
                const response = await fetch(`${BASE_URL}/trans-app/customers?search=${customerSearch}`)
                const data = await response.json()
                const formattedOptions: ComboboxOption[] = data.map((c: any) => ({
                    value: c._id,
                    label: `${c.CustomerName} (${c.Name}) - ${c.Location}`
                }))
                setCustomerOptions(formattedOptions)
            } catch (error) {
                console.error('Error searching customers:', error)
            }
        }

        const timer = setTimeout(searchCustomers, 300)
        return () => clearTimeout(timer)
    }, [customerSearch])

    useEffect(() => {
        const fetchCustomerDetails = async () => {
            if (!selectedCustomerId) {
                setSelectedCustomerData(null)
                return
            }

            setFetchingCustomer(true)
            try {
                const response = await fetch(`${BASE_URL}/trans-app/customers/get-customer/${selectedCustomerId}`)
                const data = await response.json()

                // Ensure all fields are present with correct defaults
                const formData: CustomerFormData = {
                    ...data,
                    MailingName: data.MailingName || "",
                    ROuteDetention: data.ROuteDetention || [],
                    "Product Wise": data["Product Wise"] || []
                }

                setSelectedCustomerData(formData)
            } catch (error) {
                console.error('Error fetching customer details:', error)
                toast.error('Failed to load customer details')
            } finally {
                setFetchingCustomer(false)
            }
        }

        fetchCustomerDetails()
    }, [selectedCustomerId])

    // Update form when leadger customer is selected
    useEffect(() => {
        if (selectedCustomerData && formData.IsMainParty === "No") {
            setFormData(prev => ({
                ...prev,
                MailingName: selectedCustomerData.MailingName || "",
                Address: selectedCustomerData.Address || "",
                ROuteDetention: selectedCustomerData.ROuteDetention || [],
                "Product Wise": selectedCustomerData["Product Wise"] || [],
                CommanLedger: selectedCustomerId
            }))
        } else if (!selectedCustomerId && formData.IsMainParty === "No") {
            setFormData(prev => ({
                ...prev,
                CommanLedger: ""
            }))
        }
    }, [selectedCustomerData, selectedCustomerId, formData.IsMainParty])

    // Sync CustGroup selection to formData
    useEffect(() => {
        setFormData(prev => ({
            ...prev,
            CustGroup: selectedCustomerGroupId
        }))
    }, [selectedCustomerGroupId])


    useEffect(() => {
        const searchCustomers = async () => {
            if (customerGroupSearch.length < 2) {
                setCustomerGroupOptions([])
                return
            }
            try {
                const response = await fetch(`${BASE_URL}/trans-app/customer-groups?search=${customerGroupSearch}`)
                const data = await response.json()
                const formattedOptions: ComboboxOption[] = data.map((c: any) => ({
                    value: c._id,
                    label: `${c.Name} (${c.State})`
                }))
                setCustomerGroupOptions(formattedOptions)
            } catch (error) {
                console.error('Error searching customers:', error)
            }
        }

        const timer = setTimeout(searchCustomers, 300)
        return () => clearTimeout(timer)
    }, [customerGroupSearch])

    useEffect(() => {
        const fetchCustomerGroupDetails = async () => {
            if (!selectedCustomerGroupId) {
                setSelectedCustomerGroupData(null)
                return
            }

            setFetchingCustomerGroup(true)
            try {
                const response = await fetch(`${BASE_URL}/trans-app/customer-groups/get/${selectedCustomerGroupId}`)
                const data = await response.json()

                // Ensure all fields are present with correct defaults
                const formData: CustomerGroupFormData = {
                    ...data,
                    CustGroup: data._id || "",
                    State: data.State || "",
                }

                setSelectedCustomerGroupData(formData)
            } catch (error) {
                console.error('Error fetching customer details:', error)
                toast.error('Failed to load customer details')
            } finally {
                setFetchingCustomerGroup(false)
            }
        }

        fetchCustomerGroupDetails()
    }, [selectedCustomerGroupId])

    const handleInputChange = (field: keyof CustomerFormData, value: string) => {
        setFormData(prev => {
            const newData = { ...prev, [field]: value };

            if (field === 'Name') {
                // If company tag is present, name should ideally end with it. 
                // But if user is typing, we extract the base name for MailingName.
                let baseName = value;
                for (const comp of COMPANIES) {
                    if (baseName.endsWith(`-${comp}`)) {
                        baseName = baseName.slice(0, -(comp.length + 1));
                        break;
                    }
                }
                if (prev.IsMainParty === 'Yes') {
                    newData.MailingName = baseName;
                }
            } else if (field === 'CompanyTag') {
                let baseName = prev.Name;
                // Strip old tags
                for (const comp of COMPANIES) {
                    if (baseName.endsWith(`-${comp}`)) {
                        baseName = baseName.slice(0, -(comp.length + 1));
                        break;
                    }
                }

                if (value && value !== "Not Applicable") {
                    newData.Name = `${baseName}-${value}`;
                } else {
                    newData.Name = baseName;
                }

                if (prev.IsMainParty === 'Yes') {
                    newData.MailingName = baseName;
                }
                newData.CompanyName = ""; // Reset company name as per previous logic
            }

            return newData;
        })

        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev }
                delete newErrors[field]
                return newErrors
            })
        }
    }

    const handleSelectChange = (field: keyof CustomerFormData, value: "Yes" | "No") => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    // Route Detention handlers
    const addRouteDetention = () => {
        setFormData(prev => ({
            ...prev,
            ROuteDetention: [...prev.ROuteDetention, { Route: '', Detention: [] }]
        }))
    }

    const removeRouteDetention = (index: number) => {
        setFormData(prev => ({
            ...prev,
            ROuteDetention: prev.ROuteDetention.filter((_, i) => i !== index)
        }))
    }

    const updateRouteDetention = (index: number, field: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            ROuteDetention: prev.ROuteDetention.map((item, i) =>
                i === index ? { ...item, [field]: value } : item
            )
        }))
    }

    const addDetentionEntry = (routeIndex: number) => {
        setFormData(prev => ({
            ...prev,
            ROuteDetention: prev.ROuteDetention.map((item, i) =>
                i === routeIndex
                    ? { ...item, Detention: [...item.Detention, { Product: '', DetMethod: '', Charges: '', DetDays: '' }] }
                    : item
            )
        }))
    }

    const removeDetentionEntry = (routeIndex: number, detentionIndex: number) => {
        setFormData(prev => ({
            ...prev,
            ROuteDetention: prev.ROuteDetention.map((item, i) =>
                i === routeIndex
                    ? { ...item, Detention: item.Detention.filter((_, j) => j !== detentionIndex) }
                    : item
            )
        }))
    }

    const updateDetentionEntry = (routeIndex: number, detentionIndex: number, field: keyof DetentionEntry, value: string) => {
        setFormData(prev => ({
            ...prev,
            ROuteDetention: prev.ROuteDetention.map((item, i) =>
                i === routeIndex
                    ? {
                        ...item,
                        Detention: item.Detention.map((det, j) =>
                            j === detentionIndex ? { ...det, [field]: value } : det
                        )
                    }
                    : item
            )
        }))
    }

    // Product Wise handlers
    const addProductWise = () => {
        setFormData(prev => ({
            ...prev,
            "Product Wise": [...prev["Product Wise"], { PRProdcutName: '', BilQty: '', TollTax: 'Separate', BillDateRange: '', FreightCalc: '' }]
        }))
    }

    const removeProductWise = (index: number) => {
        setFormData(prev => ({
            ...prev,
            "Product Wise": prev["Product Wise"].filter((_, i) => i !== index)
        }))
    }

    const updateProductWise = (index: number, field: keyof ProductWise, value: string) => {
        setFormData(prev => ({
            ...prev,
            "Product Wise": prev["Product Wise"].map((item, i) =>
                i === index ? { ...item, [field]: value } : item
            )
        }))
    }

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {}

        if (!formData.Name.trim()) newErrors.Name = 'Name is required'

        if (formData.PanNo && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.PanNo.toUpperCase())) {
            newErrors.PanNo = 'Invalid PAN format (e.g., ABCDE1234F)'
        }

        if (formData.GSTIN && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(formData.GSTIN.toUpperCase())) {
            newErrors.GSTIN = 'Invalid GSTIN format'
        }

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
        setSelectedCustomerId("")
        setSelectedCustomerData(null)
        setSelectedCustomerGroupId("")
        setSelectedCustomerGroupData(null)
        setErrors({})
        if (onReset) onReset()
    }

    const YesNoSelect = ({ field, value, id }: { field: keyof CustomerFormData, value: "Yes" | "No", id?: string }) => (
        <Select value={value} onValueChange={(val) => handleSelectChange(field, val as "Yes" | "No")}>
            <SelectTrigger id={id} className="w-full">
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="Yes">Yes</SelectItem>
                <SelectItem value="No">No</SelectItem>
            </SelectContent>
        </Select>
    )


    return (
        <Card className='w-full'>
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
                        Basic Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="IsMainParty">Is Main Party</Label>
                            <YesNoSelect id="IsMainParty" field="IsMainParty" value={formData.IsMainParty} />
                        </div>

                        {formData.IsMainParty === "No" && <div className='space-y-2'>
                            <Label htmlFor="CommanLedger">Common Ledger *</Label>
                            <Combobox
                                id="CommanLedger"
                                className="w-full"
                                options={customerOptions}
                                value={selectedCustomerId}
                                onChange={setSelectedCustomerId}
                                searchTerm={customerSearch}
                                onSearchTermChange={setCustomerSearch}
                                placeholder="Type to search customers..."
                            />
                        </div>}
                        <div className="space-y-2">
                            <Label htmlFor="Name">Name *</Label>
                            <Input
                                id="Name"
                                value={formData.Name}
                                onChange={(e) => handleInputChange('Name', e.target.value)}
                                placeholder="Enter name"
                                autoComplete="organization"
                                className={errors.Name ? 'border-red-500' : ''}
                            />
                            {errors.Name && <p className="text-xs text-red-500">{errors.Name}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="CompanyTag">Select Company *</Label>
                            <Select value={formData.CompanyTag} onValueChange={(val) => {
                                handleInputChange("CompanyTag", val);
                            }}>
                                <SelectTrigger id="CompanyTag" className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Not Applicable">Not Applicable</SelectItem>
                                    <SelectItem value="EXPO">EXPO</SelectItem>
                                    <SelectItem value="INFRA">INFRA</SelectItem>
                                    <SelectItem value="ITA">ITA</SelectItem>
                                    <SelectItem value="ITPL">ITPL</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="MailingName">Mailing Name *</Label>
                            <Input
                                id="MailingName"
                                value={formData.MailingName}
                                onChange={(e) => handleInputChange('MailingName', e.target.value)}
                                placeholder="Enter mailing name"
                                autoComplete="organization"
                                className={errors.MailingName ? 'border-red-500' : ''}
                            />
                            {errors.MailingName && <p className="text-xs text-red-500">{errors.MailingName}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="CustGroup">Customer Group</Label>
                            <Combobox
                                id="CustGroup"
                                className="w-full"
                                options={customerGroupOptions}
                                value={selectedCustomerGroupId}
                                onChange={setSelectedCustomerGroupId}
                                searchTerm={customerGroupSearch}
                                onSearchTermChange={setCustomerGroupSearch}
                                placeholder="Type to search customer groups..."
                            />
                        </div>
                    </div>
                </section>

                <Separator />

                {/* Location Information */}
                <section>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <div className="w-1 h-6 bg-green-500 rounded-full" />
                        Location Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="Address">Address *</Label>
                            <Input
                                id="Address"
                                value={formData.Address}
                                onChange={(e) => handleInputChange('Address', e.target.value)}
                                placeholder="Enter full address"
                                autoComplete="street-address"
                                className={errors.Address ? 'border-red-500' : ''}
                            />
                            {errors.Address && <p className="text-xs text-red-500">{errors.Address}</p>}
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="Pincode">Pincode *</Label>
                            <Input
                                id="Pincode"
                                value={formData.Pincode}
                                onChange={(e) => handleInputChange('Pincode', e.target.value)}
                                placeholder="Enter pincode"
                                autoComplete="postal-code"
                                className={errors.Pincode ? 'border-red-500' : ''}
                            />
                            {errors.Pincode && <p className="text-xs text-red-500">{errors.Pincode}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="Country">Country *</Label>
                            <Input
                                id="Country"
                                value={formData.Country}
                                onChange={(e) => handleInputChange('Country', e.target.value)}
                                placeholder="Enter country"
                                autoComplete="country-name"
                                className={errors.Country ? 'border-red-500' : ''}
                            />
                            {errors.Country && <p className="text-xs text-red-500">{errors.Country}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="State">State *</Label>
                            <Input
                                id="State"
                                value={formData.State}
                                onChange={(e) => handleInputChange('State', e.target.value)}
                                placeholder="Enter state"
                                autoComplete="address-level1"
                                className={errors.State ? 'border-red-500' : ''}
                            />
                            {errors.State && <p className="text-xs text-red-500">{errors.State}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="Location">Location *</Label>
                            <Input
                                id="Location"
                                value={formData.Location}
                                onChange={(e) => handleInputChange('Location', e.target.value)}
                                placeholder="Enter location"
                                autoComplete="address-level2"
                                className={errors.Location ? 'border-red-500' : ''}
                            />
                            {errors.Location && <p className="text-xs text-red-500">{errors.Location}</p>}
                        </div>
                    </div>
                </section>

                <Separator />

                {/* Contact Information */}
                <section>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <div className="w-1 h-6 bg-red-500 rounded-full" />
                        Contact Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="ContactPerson">Contact Person *</Label>
                            <Input
                                id="ContactPerson"
                                value={formData.ContactPerson}
                                onChange={(e) => handleInputChange('ContactPerson', e.target.value)}
                                placeholder="Enter contact person name"
                                autoComplete="name"
                                className={errors.ContactPerson ? 'border-red-500' : ''}
                            />
                            {errors.ContactPerson && <p className="text-xs text-red-500">{errors.ContactPerson}</p>}
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="MobileNo">Mobile No *</Label>
                            <Input
                                id="MobileNo"
                                value={formData.MobileNo}
                                onChange={(e) => handleInputChange('MobileNo', e.target.value)}
                                placeholder="Enter mobile number"
                                autoComplete="tel"
                                className={errors.MobileNo ? 'border-red-500' : ''}
                            />
                            {errors.MobileNo && <p className="text-xs text-red-500">{errors.MobileNo}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="LandLineNo">Landline No *</Label>
                            <Input
                                id="LandLineNo"
                                value={formData.LandLineNo}
                                onChange={(e) => handleInputChange('LandLineNo', e.target.value)}
                                placeholder="Enter landline number"
                                autoComplete="tel"
                                className={errors.LandLineNo ? 'border-red-500' : ''}
                            />
                            {errors.LandLineNo && <p className="text-xs text-red-500">{errors.LandLineNo}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="Email">Email *</Label>
                            <Input
                                id="Email"
                                value={formData.EMailID}
                                onChange={(e) => handleInputChange('EMailID', e.target.value)}
                                placeholder="Enter email"
                                autoComplete="email"
                                className={errors.EMailID ? 'border-red-500' : ''}
                            />
                            {errors.EMailID && <p className="text-xs text-red-500">{errors.EMailID}</p>}
                        </div>
                    </div>
                </section>

                <Separator />

                {/* Tax Information */}
                <section>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <div className="w-1 h-6 bg-orange-500 rounded-full" />
                        Tax Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="PanNo">PAN Number</Label>
                            <Input
                                id="PanNo"
                                value={formData.PanNo}
                                onChange={(e) => handleInputChange('PanNo', e.target.value.toUpperCase())}
                                placeholder="ABCDE1234F"
                                maxLength={10}
                                autoComplete="off"
                                className={errors.PanNo ? 'border-red-500' : ''}
                            />
                            {errors.PanNo && <p className="text-xs text-red-500">{errors.PanNo}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="GSTIN">GSTIN</Label>
                            <Input
                                id="GSTIN"
                                value={formData.GSTIN}
                                onChange={(e) => handleInputChange('GSTIN', e.target.value.toUpperCase())}
                                placeholder="22AAAAA0000A1Z5"
                                maxLength={15}
                                autoComplete="off"
                                className={errors.GSTIN ? 'border-red-500' : ''}
                            />
                            {errors.GSTIN && <p className="text-xs text-red-500">{errors.GSTIN}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="RegtType">Registration Type</Label>
                            <Select
                                value={formData.RegtType}
                                onValueChange={(value) => {
                                    handleInputChange('RegtType', value);
                                }}
                            >
                                <SelectTrigger id="RegtType">
                                    <SelectValue placeholder="Select registration type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Unknown">Unknown</SelectItem>
                                    <SelectItem value="Composition">Composition</SelectItem>
                                    <SelectItem value="Consumer">Consumer</SelectItem>
                                    <SelectItem value="Regular">Regular</SelectItem>
                                    <SelectItem value="Unregistered">Unregistered</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </section>

                <Separator />

                {/* Status Flags */}
                <section>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <div className="w-1 h-6 bg-purple-500 rounded-full" />
                        Customer Status Flags
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="IsActiveCustomer">Is Active Customer</Label>
                            <YesNoSelect id="IsActiveCustomer" field="IsActiveCustomer" value={formData.IsActiveCustomer} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="IsBillingParty">Is Billing Party</Label>
                            <YesNoSelect id="IsBillingParty" field="IsBillingParty" value={formData.IsBillingParty} />
                        </div>
                        {
                            formData.IsMainParty === "Yes" && (
                                <>
                                    <div className="space-y-2">
                                        <Label htmlFor="IsAttachedOwner">Is Attached Owner</Label>
                                        <YesNoSelect id="IsAttachedOwner" field="IsAttachedOwner" value={formData.IsAttachedOwner} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="IsConsiGnor">Is Consignor</Label>
                                        <YesNoSelect id="IsConsiGnor" field="IsConsiGnor" value={formData.IsConsiGnor} />
                                    </div>
                                </>
                            )
                        }
                        <div className="space-y-2">
                            <Label htmlFor="IsConsignee">Is Consignee</Label>
                            <YesNoSelect id="IsConsignee" field="IsConsignee" value={formData.IsConsignee} />
                        </div>
                    </div>
                </section>

                <Separator />

                {/* Route Detention Section */}
                {formData.IsMainParty === 'Yes' &&
                    <>
                        <section>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold flex items-center gap-2">
                                    <div className="w-1 h-6 bg-cyan-500 rounded-full" />
                                    Route Detention
                                </h3>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={addRouteDetention}
                                    className="gap-1"
                                >
                                    <Plus className="h-4 w-4" />
                                    Add Route
                                </Button>
                            </div>

                            {(formData.ROuteDetention || []).length === 0 ? (
                                <p className="text-muted-foreground text-sm italic">No routes added yet. Click "Add Route" to begin.</p>
                            ) : (
                                <div className="space-y-4">
                                    {(formData.ROuteDetention || []).map((route, routeIndex) => (
                                        <Card key={routeIndex} className="bg-muted/30">
                                            <CardContent className="pt-4 space-y-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="flex-1">
                                                        <Label>Route Name</Label>
                                                        <Input
                                                            value={route.Route || ''}
                                                            onChange={(e) => updateRouteDetention(routeIndex, 'Route', e.target.value)}
                                                            placeholder="Enter route name"
                                                        />
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        variant="destructive"
                                                        size="icon"
                                                        onClick={() => removeRouteDetention(routeIndex)}
                                                        className="mt-6"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>

                                                <div className="ml-4 border-l-2 border-cyan-500/30 pl-4">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-sm font-medium">Detention Entries</span>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => addDetentionEntry(routeIndex)}
                                                            className="gap-1"
                                                        >
                                                            <Plus className="h-3 w-3" />
                                                            Add Detention
                                                        </Button>
                                                    </div>

                                                    {(route.Detention || []).length === 0 ? (
                                                        <p className="text-sm text-muted-foreground italic">No detention entries</p>
                                                    ) : (
                                                        <div className="space-y-3">
                                                            {(route.Detention || []).map((detention, detIndex) => (
                                                                <div key={detIndex} className="p-3 bg-background/50 rounded-md space-y-2">
                                                                    <div className="flex items-center justify-between">
                                                                        <span className="text-xs text-muted-foreground">Entry {detIndex + 1}</span>
                                                                        <Button
                                                                            type="button"
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            onClick={() => removeDetentionEntry(routeIndex, detIndex)}
                                                                            className="h-6 w-6"
                                                                        >
                                                                            <Trash2 className="h-3 w-3 text-destructive" />
                                                                        </Button>
                                                                    </div>
                                                                    <div className="grid grid-cols-2 gap-2">
                                                                        <div>
                                                                            <Label className="text-xs">Product</Label>
                                                                            <Combobox
                                                                                className="w-full"
                                                                                options={goods}
                                                                                value={detention.Product || ''}
                                                                                onChange={(value) => updateDetentionEntry(routeIndex, detIndex, 'Product', value)}
                                                                                searchTerm={goodsSearch}
                                                                                onSearchTermChange={setGoodsSearch}
                                                                                placeholder="Select Product"
                                                                                showAddButton={false}
                                                                            />
                                                                        </div>
                                                                        <div>
                                                                            <Label className="text-xs">Method</Label>
                                                                            <Input
                                                                                value={detention.DetMethod || ''}
                                                                                onChange={(e) => updateDetentionEntry(routeIndex, detIndex, 'DetMethod', e.target.value)}
                                                                                placeholder="Method"
                                                                            />
                                                                        </div>
                                                                        <div>
                                                                            <Label className="text-xs">Charges</Label>
                                                                            <Input
                                                                                value={detention.Charges || ''}
                                                                                onChange={(e) => updateDetentionEntry(routeIndex, detIndex, 'Charges', e.target.value)}
                                                                                placeholder="Charges"
                                                                            />
                                                                        </div>
                                                                        <div>
                                                                            <Label className="text-xs">Days</Label>
                                                                            <Input
                                                                                value={detention.DetDays || ''}
                                                                                onChange={(e) => updateDetentionEntry(routeIndex, detIndex, 'DetDays', e.target.value)}
                                                                                placeholder="Days"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </section>

                        <Separator />
                    </>
                }

                {/* Product Wise Section */}
                {formData.IsMainParty === 'Yes' &&
                    <>
                        <section>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold flex items-center gap-2">
                                    <div className="w-1 h-6 bg-pink-500 rounded-full" />
                                    Product Wise Details
                                </h3>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={addProductWise}
                                    className="gap-1"
                                >
                                    <Plus className="h-4 w-4" />
                                    Add Product
                                </Button>
                            </div>

                            {(formData["Product Wise"] || []).length === 0 ? (
                                <p className="text-muted-foreground text-sm italic">No products added yet. Click "Add Product" to begin.</p>
                            ) : (
                                <div className="space-y-3">
                                    {(formData["Product Wise"] || []).map((product, index) => (
                                        <div key={index} className="p-3 bg-muted/30 rounded-lg space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium">Product {index + 1}</span>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => removeProductWise(index)}
                                                    className="h-7 w-7"
                                                >
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                                                <div>
                                                    <Label className="text-xs">Product Name</Label>
                                                    <Combobox
                                                        className="w-full"
                                                        options={goods}
                                                        value={product.PRProdcutName || ''}
                                                        onChange={(value) => updateProductWise(index, 'PRProdcutName', value)}
                                                        searchTerm={goodsSearch}
                                                        onSearchTermChange={setGoodsSearch}
                                                        placeholder="Select Product"
                                                        showAddButton={false}
                                                    />
                                                </div>
                                                <div>
                                                    <Label className="text-xs">Bill Qty</Label>
                                                    <Input
                                                        value={product.BilQty || ''}
                                                        onChange={(e) => updateProductWise(index, 'BilQty', e.target.value)}
                                                        placeholder="Bill qty"
                                                    />
                                                </div>
                                                <div>
                                                    <Label className="text-xs">Toll Tax</Label>
                                                    <Input
                                                        value={product.TollTax || ''}
                                                        onChange={(e) => updateProductWise(index, 'TollTax', e.target.value)}
                                                        placeholder="Toll tax"
                                                    />
                                                </div>
                                                <div>
                                                    <Label className="text-xs">Bill Date Range</Label>
                                                    <Input
                                                        value={product.BillDateRange || ''}
                                                        onChange={(e) => updateProductWise(index, 'BillDateRange', e.target.value)}
                                                        placeholder="Date range"
                                                    />
                                                </div>
                                                <div>
                                                    <Label className="text-xs">Freight Calc</Label>
                                                    <Input
                                                        value={product.FreightCalc || ''}
                                                        onChange={(e) => updateProductWise(index, 'FreightCalc', e.target.value)}
                                                        placeholder="Freight calc"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                        <Separator />
                    </>
                }


                {/* Action Buttons */}
                <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleFormReset}
                        disabled={loading}
                    >
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Reset
                    </Button>
                    <Button
                        onClick={handleFormSubmit}
                        disabled={loading}
                        className="sm:min-w-[180px]"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                {submitLabel}
                            </>
                        )}
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}

export default CustomerForm
