"use client"
import { useState, useEffect } from 'react'
import { BASE_URL } from '@/lib/api'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card'
import Combobox, { ComboboxOption } from '../Combobox'
import CustomerForm, { CustomerFormData } from './CustomerForm'
import { Loader2, Search, Trash2 } from 'lucide-react'
import { 
    AlertDialog, 
    AlertDialogAction, 
    AlertDialogCancel, 
    AlertDialogContent, 
    AlertDialogDescription, 
    AlertDialogFooter, 
    AlertDialogHeader, 
    AlertDialogTitle, 
    AlertDialogTrigger 
} from '../ui/alert-dialog'
import { Button } from '../ui/button'

const UpdateCustomer = () => {
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>("")
    const [customerSearch, setCustomerSearch] = useState<string>("")
    const [customerOptions, setCustomerOptions] = useState<ComboboxOption[]>([])
    const [loading, setLoading] = useState(false)
    const [fetchingCustomer, setFetchingCustomer] = useState(false)
    const [selectedCustomerData, setSelectedCustomerData] = useState<CustomerFormData | null>(null)

    // Fetch customers for search
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

    // Load selected customer details
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
                
                // Normalize CompanyTag
                let normalizedTag = data.CompanyTag || "Not Applicable";
                const upperTag = String(normalizedTag).trim().toUpperCase();
                const validTags = ["EXPO", "INFRA", "ITA", "ITPL"];
                
                if (validTags.includes(upperTag)) {
                    // Match the case in COMPANIES constant
                    normalizedTag = upperTag === "EXPO" ? "Expo" : 
                                    upperTag === "INFRA" ? "Infra" : 
                                    upperTag === "ITA" ? "ITA" : "ITPL";
                } else if (upperTag === "NOT APPLICABLE" || !normalizedTag) {
                    normalizedTag = "Not Applicable";
                }

                // Ensure all fields are present with correct defaults
                const formData: CustomerFormData = {
                    ...data,
                    "Product Wise": data["Product Wise"] || [],
                    CompanyTag: normalizedTag
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

    const handleUpdate = async (formData: CustomerFormData) => {
        if (!selectedCustomerId) return

        setLoading(true)
        try {
            const submitData = {
                ...formData,
                PanNo: formData.PanNo.toUpperCase(),
                GSTIN: formData.GSTIN.toUpperCase()
            }

            const response = await fetch(`${BASE_URL}/trans-app/customers/update/${selectedCustomerId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(submitData)
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to update customer')
            }

            const result = await response.json()
            toast.success('Customer updated successfully!')
            
            // Update local state with returned data
            setSelectedCustomerData({
                ...result,
                CompanyTag: result.CompanyTag || "Not Applicable"
            })
        } catch (error) {
            console.error('Error updating customer:', error)
            toast.error('Failed to update customer', {
                description: error instanceof Error ? error.message : 'Unknown error occurred'
            })
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async () => {
        if (!selectedCustomerId) return

        setLoading(true)
        try {
            const response = await fetch(`${BASE_URL}/trans-app/customers/delete/${selectedCustomerId}`, {
                method: 'DELETE',
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to delete customer')
            }

            toast.success('Customer deleted successfully!')
            setSelectedCustomerId("")
            setSelectedCustomerData(null)
            setCustomerSearch("")
        } catch (error) {
            console.error('Error deleting customer:', error)
            toast.error('Failed to delete customer', {
                description: error instanceof Error ? error.message : 'Unknown error occurred'
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <Card className="w-full bg-muted/20 border-dotted border-2">
                <CardHeader className="pb-3 px-4 sm:px-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <CardTitle className="text-xl flex items-center gap-2">
                                <Search className="h-5 w-5 text-primary shrink-0" />
                                <span>Find Customer to Update</span>
                            </CardTitle>
                            <CardDescription className="text-xs sm:text-sm">
                                Search by Name, PAN, GSTIN, or Location.
                            </CardDescription>
                        </div>
                        {selectedCustomerId && (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="sm" className="gap-2 w-full sm:w-auto">
                                        <Trash2 className="h-4 w-4" />
                                        Delete Customer
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="w-[95vw] max-w-lg rounded-lg">
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This action cannot be undone. This will permanently delete 
                                            <span className="font-bold text-foreground"> "{selectedCustomerData?.Name}" </span> 
                                            and remove their data from our servers.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2">
                                        <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
                                        <AlertDialogAction 
                                            onClick={handleDelete}
                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full sm:w-auto"
                                        >
                                            Delete Permanently
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="px-4 sm:px-6 pb-6">
                    <div className="w-full max-w-xl">
                        <Combobox
                            className="w-full"
                            options={customerOptions}
                            value={selectedCustomerId}
                            onChange={setSelectedCustomerId}
                            searchTerm={customerSearch}
                            onSearchTermChange={setCustomerSearch}
                            placeholder="Type to search customers..."
                        />
                    </div>
                </CardContent>
            </Card>

            {fetchingCustomer && (
                <div className="flex flex-col items-center justify-center p-12 space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-muted-foreground animate-pulse">Loading customer details...</p>
                </div>
            )}

            {selectedCustomerData && !fetchingCustomer && (
                <CustomerForm
                    initialData={selectedCustomerData}
                    onSubmit={handleUpdate}
                    submitLabel="Update Customer"
                    loading={loading}
                    title={`Updating: ${selectedCustomerData.Name}`}
                    description="Review and modify the customer details below."
                />
            )}
            
            {!selectedCustomerId && !fetchingCustomer && (
                <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl bg-muted/5">
                    <Search className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <p className="text-muted-foreground italic">Select a customer above to see their details</p>
                </div>
            )}
        </div>
    )
}

export default UpdateCustomer
