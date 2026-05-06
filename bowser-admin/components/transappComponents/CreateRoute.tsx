"use client"
import { useState } from 'react'
import { BASE_URL } from '@/lib/api'
import { toast } from 'sonner'
import RouteForm, { RouteFormData } from './RouteForm'

const CreateRoute = () => {
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (formData: RouteFormData) => {
        setLoading(true)
        try {
            const response = await fetch(`${BASE_URL}/trans-app/routes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to create route')
            }

            const result = await response.json()
            toast.success('Route created successfully!', {
                description: `Route "${result.Name}" has been added.`
            })
        } catch (error) {
            console.error('Error creating route:', error)
            toast.error('Failed to create route', {
                description: error instanceof Error ? error.message : 'Unknown error occurred'
            })
            throw error
        } finally {
            setLoading(false)
        }
    }

    return (
        <RouteForm
            onSubmit={handleSubmit}
            submitLabel="Create Route"
            loading={loading}
            title="Create New Route"
            description="Fill in the route details below. Fields marked with * are required."
        />
    )
}

export default CreateRoute
