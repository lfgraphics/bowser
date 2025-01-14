import React from 'react'
import { jwtDecode } from 'jwt-decode'

type DecodedToken = {
    roles: string[]
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
        const userRoles = decoded.roles

        // check if there's intersection
        const hasRole = userRoles.some((role) => allowedRoles.includes(role))
        if (!hasRole) {
            return null // or <div>Not authorized</div>
        }

        return <>{children}</>
    } catch (error) {
        return null // bad token
    }
}