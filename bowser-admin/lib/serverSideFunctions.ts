'use server' // Mark this file as containing server actions

import { BASE_URL } from '@/lib/api'

// Server action to fetch trip sheet data
export async function fetchTripSheet (id: string) {
  const response = await fetch(`${BASE_URL}/tripsheet/${id}`)
  if (!response.ok) {
    throw new Error('Network response was not ok')
  }
  return response.json()
}
