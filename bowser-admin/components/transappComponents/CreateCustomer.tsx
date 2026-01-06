"use client"
import { useState } from 'react'
import { BASE_URL } from '@/lib/api'
import { toast } from 'sonner'
import CustomerForm, { CustomerFormData } from './CustomerForm'

const CreateCustomer = () => {
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (formData: CustomerFormData) => {
        setLoading(true)
        try {
            // Transform data - uppercase PAN and GSTIN
            const submitData = {
                ...formData,
                PanNo: formData.PanNo.toUpperCase(),
                GSTIN: formData.GSTIN.toUpperCase()
            }

            const response = await fetch(`${BASE_URL}/trans-app/customers`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(submitData)
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to create customer')
            }

            const result = await response.json()
            toast.success('Customer created successfully!', {
                description: `Customer "${result.CustomerName}" has been added.`
            })

            // We can return true or something to signal success to the form if needed
            // But since initialFormData is exported, CustomerForm resets internally if we didn't pass a persistent initialData
        } catch (error) {
            console.error('Error creating customer:', error)
            toast.error('Failed to create customer', {
                description: error instanceof Error ? error.message : 'Unknown error occurred'
            })
            throw error // Re-throw to keep loading state if we want, or just handle here
        } finally {
            setLoading(false)
        }
    }

    return (
        <CustomerForm
            onSubmit={handleSubmit}
            submitLabel="Create Customer"
            loading={loading}
            title="Create New Customer"
            description="Fill in the customer details below. Fields marked with * are required."
        />
    )
}

export default CreateCustomer