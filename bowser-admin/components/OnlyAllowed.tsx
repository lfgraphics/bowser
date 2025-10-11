import React from 'react'
import { jwtDecode } from 'jwt-decode'

type DecodedToken = {
    roles?: string[]
    role?: string
    type?: string
    userId?: string
}

type WithRoleProps = {
    allowedRoles: string[]
    children: React.ReactNode
}

export default function OnlyAllowed({ allowedRoles, children }: WithRoleProps) {
    // You’d typically read from localStorage or a context
    const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null

    if (!token) {
        // no token => no roles => cannot show the component
        return null
    }

    try {
        const decoded: DecodedToken = jwtDecode(token)
        
        // For camp users, the role is not in the JWT token, so we need to get it from localStorage
        if (decoded.type === 'camp') {
            const adminUserData = typeof window !== 'undefined' ? localStorage.getItem('adminUser') : null
            if (adminUserData) {
                try {
                    const userData = JSON.parse(adminUserData)
                    const userRole = userData.role
                    if (userRole && allowedRoles.includes(userRole)) {
                        return <>{children}</>
                    }
                } catch (e) {
                    console.error('Error parsing adminUser data:', e)
                }
            }
            return null
        }
        
        // For regular admin tokens, check roles in the token
        const userRoles = Array.isArray(decoded.roles) ? decoded.roles : 
                         decoded.role ? [decoded.role] : []

        // check if there's intersection
        const hasRole = userRoles.some((role: string) => allowedRoles.includes(role))
        if (!hasRole) {
            return null // or <div>Not authorized</div>
        }

        return <>{children}</>
    } catch (error) {
        console.error('Error decoding token:', error)
        return null // bad token
    }
}