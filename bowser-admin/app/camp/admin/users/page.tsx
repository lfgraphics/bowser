"use client"
import { useEffect, useState } from 'react'
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
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Search,
    Edit,
    Trash2,
    UserCheck,
    UserX,
    Key,
    Settings,
    ChevronLeft,
    ChevronRight,
    Plus,
    X
} from 'lucide-react'
import { campAdminAPI, CampUser, CampUsersPaginationResponse } from '@/lib/campAPI'
import { getAllStackHolders, StackHolder } from '@/lib/api'
import { toast } from 'sonner'
import Loading from '@/app/loading'
import { Textarea } from "@/components/ui/textarea"
import ConfigsManager from '@/components/ConfigsManager'
import Combobox, { ComboboxOption } from '@/components/Combobox'
import { BASE_URL } from '@/lib/api'

export default function CampUsersManagement() {
    const [users, setUsers] = useState<CampUsersPaginationResponse | null>(null)
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState('all_statuses')
    const [roleFilter, setRoleFilter] = useState('all_roles')
    const [currentPage, setCurrentPage] = useState(1)
    const [selectedUser, setSelectedUser] = useState<CampUser | null>(null)
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
    const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false)
    const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)
    const [newPassword, setNewPassword] = useState('')
    const [editFormData, setEditFormData] = useState<Partial<CampUser>>({})
    const [configFormData, setConfigFormData] = useState<Record<string, any>>({})
    const [newConfigKey, setNewConfigKey] = useState('')
    const [newConfigValue, setNewConfigValue] = useState('')
    const [isAddingConfig, setIsAddingConfig] = useState(false)
    const [customExpenseKey, setCustomExpenseKey] = useState('')
    const [customExpenseValue, setCustomExpenseValue] = useState('')
    const [isAddingExpense, setIsAddingExpense] = useState(false)

    // Delete confirmation dialog state
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [userToDelete, setUserToDelete] = useState<CampUser | null>(null)

    // StackHolders state
    const [stackHolders, setStackHolders] = useState<ComboboxOption[]>([])
    const [locationSearchTerm, setLocationSearchTerm] = useState('')
    const [showLocationCombobox, setShowLocationCombobox] = useState(false)
    const [locationToDelete, setLocationToDelete] = useState<string | null>(null)
    const [deleteLocationDialogOpen, setDeleteLocationDialogOpen] = useState(false)

    useEffect(() => {
        fetchUsers()
    }, [currentPage, searchTerm, statusFilter, roleFilter])

    const fetchStackHolders = async () => {
        try {
            // Clear existing results first
            setStackHolders([])

            const response = await fetch(`${BASE_URL}/trans-app/stack-holders?params=${locationSearchTerm}`)
            const data = await response.json()
            const formattedData: ComboboxOption[] = data.map((item: { _id: string, InstitutionName: string, Location: string }) => ({
                value: item.Location, // Using Location like the working pattern
                label: `${item.InstitutionName}: ${item.Location}`
            }))
            setStackHolders(formattedData)
        } catch (error: any) {
            setStackHolders([]) // Clear on error too
            const message = error?.message || 'Failed to fetch destinations'
            toast.error(message, { richColors: true })
        }
    }

    useEffect(() => {
        fetchStackHolders()
    }, [locationSearchTerm])

    const fetchUsers = async () => {
        try {
            setLoading(true)
            const data = await campAdminAPI.getUsers({
                page: currentPage,
                limit: 10,
                search: searchTerm,
                status: statusFilter === 'all_statuses' ? '' : statusFilter,
                role: roleFilter === 'all_roles' ? '' : roleFilter
            })
            setUsers(data)
        } catch (error: any) {
            console.error('Error fetching users:', error)
            toast.error(error.response?.data?.message || 'Failed to fetch users')
        } finally {
            setLoading(false)
        }
    }

    const handleSearch = () => {
        setCurrentPage(1)
        fetchUsers()
    }

    const handleEditUser = (user: CampUser) => {
        setSelectedUser(user)
        setEditFormData({
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            status: user.status,
            locations: user.locations
        })
        setIsEditDialogOpen(true)
    }

    const handleSaveUser = async () => {
        if (!selectedUser) return

        try {
            await campAdminAPI.updateUser(selectedUser._id!, editFormData)
            toast.success('User updated successfully')
            setIsEditDialogOpen(false)
            fetchUsers()
        } catch (error: any) {
            console.error('Error updating user:', error)
            toast.error(error.response?.data?.message || 'Failed to update user')
        }
    }

    const handleConfigUser = async (user: CampUser) => {
        setSelectedUser(user)

        // Convert configs to object for editing
        const configsObj: Record<string, any> = {}
        if (user.configs) {
            // Check if it's already an object or if it's a Map
            if (user.configs instanceof Map) {
                user.configs.forEach((value, key) => {
                    configsObj[key] = value
                })
            } else if (typeof user.configs === 'object') {
                // It's already an object, copy it
                Object.assign(configsObj, user.configs)
            }
        }
        setConfigFormData(configsObj)
        setIsConfigDialogOpen(true)
    }

    const handleSaveConfigs = async () => {
        if (!selectedUser) return

        try {
            await campAdminAPI.updateUserConfigs(selectedUser._id!, configFormData)
            toast.success('User configs updated successfully')
            setIsConfigDialogOpen(false)
            fetchUsers()
        } catch (error: any) {
            console.error('Error updating configs:', error)
            toast.error(error.response?.data?.message || 'Failed to update configs')
        }
    }

    const handleResetPassword = async () => {
        if (!selectedUser || !newPassword) return

        try {
            await campAdminAPI.resetPassword(selectedUser._id!, newPassword)
            toast.success('Password reset successfully')
            setIsPasswordDialogOpen(false)
            setNewPassword('')
        } catch (error: any) {
            console.error('Error resetting password:', error)
            toast.error(error.response?.data?.message || 'Failed to reset password')
        }
    }

    const handleVerifyUser = async (userId: string) => {
        try {
            await campAdminAPI.verifyUser(userId)
            toast.success('User verified successfully')
            fetchUsers()
        } catch (error: any) {
            console.error('Error verifying user:', error)
            toast.error(error.response?.data?.message || 'Failed to verify user')
        }
    }

    const handleSuspendUser = async (userId: string) => {
        try {
            await campAdminAPI.suspendUser(userId)
            toast.success('User suspended successfully')
            fetchUsers()
        } catch (error: any) {
            console.error('Error suspending user:', error)
            toast.error(error.response?.data?.message || 'Failed to suspend user')
        }
    }

    const handleDeleteUser = async (userId: string) => {
        if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
            return
        }

        try {
            await campAdminAPI.deleteUser(userId)
            toast.success('User deleted successfully')
            fetchUsers()
        } catch (error: any) {
            console.error('Error deleting user:', error)
            toast.error(error.response?.data?.message || 'Failed to delete user')
        }
    }

    // Helper function to check if current user is admin (assuming admin access means they can edit everything)
    const isCurrentUserAdmin = () => {
        // Since they can access this page, they have admin privileges
        return true
    }

    const handleDeleteLocation = (location: string) => {
        setLocationToDelete(location)
        setDeleteLocationDialogOpen(true)
    }

    const confirmDeleteLocation = () => {
        if (locationToDelete) {
            setEditFormData(prev => ({
                ...prev,
                locations: prev.locations?.filter(loc => loc !== locationToDelete) || []
            }))
        }
        setDeleteLocationDialogOpen(false)
        setLocationToDelete(null)
    }

    const cancelDeleteLocation = () => {
        setDeleteLocationDialogOpen(false)
        setLocationToDelete(null)
    }

    const handleAddCustomExpense = () => {
        if (!customExpenseKey.trim() || !customExpenseValue.trim()) {
            toast.error('Please enter both expense name and value')
            return
        }

        setConfigFormData(prev => ({
            ...prev,
            allowedExpenses: {
                ...prev.allowedExpenses,
                [customExpenseKey]: parseInt(customExpenseValue) || 0
            }
        }))

        setCustomExpenseKey('')
        setCustomExpenseValue('')
        setIsAddingExpense(false)
        toast.success('Custom expense added')
    }

    const handleRemoveExpense = (expenseKey: string) => {
        setConfigFormData(prev => {
            const newExpenses = { ...prev.allowedExpenses }
            delete newExpenses[expenseKey]
            return {
                ...prev,
                allowedExpenses: newExpenses
            }
        })
        toast.success('Expense removed')
    }

    const handleAddCustomConfig = () => {
        if (!newConfigKey.trim() || !newConfigValue.trim()) {
            toast.error('Please enter both config name and value')
            return
        }

        try {
            const parsedValue = JSON.parse(newConfigValue)
            setConfigFormData(prev => ({
                ...prev,
                [newConfigKey]: parsedValue
            }))

            setNewConfigKey('')
            setNewConfigValue('')
            setIsAddingConfig(false)
            toast.success('Custom config added')
        } catch (error) {
            toast.error('Please enter valid JSON for the config value')
        }
    }

    const handleRemoveConfig = (configKey: string) => {
        if (['allowedExpenses', 'preferences', 'permissions'].includes(configKey)) {
            if (!confirm(`Are you sure you want to remove the entire ${configKey} section?`)) {
                return
            }
        }

        setConfigFormData(prev => {
            const newConfig = { ...prev }
            delete newConfig[configKey]
            return newConfig
        })
        toast.success('Config removed')
    }

    const getStatusBadgeVariant = (status: string) => {
        switch (status) {
            case 'active': return 'default'
            case 'inactive': return 'secondary'
            case 'suspended': return 'destructive'
            default: return 'outline'
        }
    }

    const getRoleBadgeVariant = (role: string) => {
        switch (role) {
            case 'admin': return 'destructive'
            case 'supervisor': return 'default'
            case 'officer': return 'secondary'
            default: return 'outline'
        }
    }

    if (loading && !users) {
        return <Loading />
    }

    return (
        <TooltipProvider>
            <div className="container mx-auto p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold">Camp Users Management</h1>
                        <p className="text-muted-foreground">Manage and verify camp users</p>
                    </div>
                </div>
                <div className='p-4'>
                    <div className="grid gap-4 md:grid-cols-4">
                        <div>
                            <Label htmlFor="search">Search</Label>
                            <div className="flex space-x-2">
                                <Input
                                    id="search"
                                    placeholder="Name, email, or phone..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button onClick={handleSearch}>
                                            <Search className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Search Users</p>
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                        </div>
                        <div>
                            <Label>Status</Label>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All statuses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all_statuses">All statuses</SelectItem>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="inactive">Inactive</SelectItem>
                                    <SelectItem value="suspended">Suspended</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Role</Label>
                            <Select value={roleFilter} onValueChange={setRoleFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All roles" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all_roles">All roles</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                    <SelectItem value="supervisor">Supervisor</SelectItem>
                                    <SelectItem value="officer">Officer</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                {/* Users Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Users ({users?.pagination.totalUsers || 0})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="text-center py-8">Loading...</div>
                        ) : (
                            <>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Contact</TableHead>
                                            <TableHead>Role</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Created</TableHead>
                                            <TableHead>Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {users && users?.users.map((user) => (
                                            <TableRow key={user._id}>
                                                <TableCell>{user.name}</TableCell>
                                                <TableCell>
                                                    <div>
                                                        <div>{user.phone}</div>
                                                        {user.email && (
                                                            <div className="text-sm text-muted-foreground">{user.email}</div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={getRoleBadgeVariant(user.role)}>
                                                        {user.role}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={getStatusBadgeVariant(user.status)}>
                                                        {user.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex space-x-2">
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => handleEditUser(user)}
                                                                >
                                                                    <Edit className="h-4 w-4" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p>Edit User</p>
                                                            </TooltipContent>
                                                        </Tooltip>

                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => handleConfigUser(user)}
                                                                >
                                                                    <Settings className="h-4 w-4" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p>Manage Configs</p>
                                                            </TooltipContent>
                                                        </Tooltip>

                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => {
                                                                        setSelectedUser(user)
                                                                        setIsPasswordDialogOpen(true)
                                                                    }}
                                                                >
                                                                    <Key className="h-4 w-4" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p>Reset Password</p>
                                                            </TooltipContent>
                                                        </Tooltip>

                                                        {user.status === 'inactive' && (
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        onClick={() => handleVerifyUser(user._id!)}
                                                                    >
                                                                        <UserCheck className="h-4 w-4" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>Verify User</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        )}

                                                        {user.status === 'active' && (
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        onClick={() => handleSuspendUser(user._id!)}
                                                                    >
                                                                        <UserX className="h-4 w-4" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>Suspend User</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        )}

                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    size="sm"
                                                                    variant="destructive"
                                                                    onClick={() => handleDeleteUser(user._id!)}
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p>Delete User</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>

                                {/* Pagination */}
                                {users && users.pagination.totalPages > 1 && (
                                    <div className="flex justify-between items-center mt-4">
                                        <div className="text-sm text-muted-foreground">
                                            Page {users.pagination.currentPage} of {users.pagination.totalPages}
                                        </div>
                                        <div className="flex space-x-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                disabled={!users.pagination.hasPrev}
                                                onClick={() => setCurrentPage(prev => prev - 1)}
                                            >
                                                <ChevronLeft className="h-4 w-4" />
                                                Previous
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                disabled={!users.pagination.hasNext}
                                                onClick={() => setCurrentPage(prev => prev + 1)}
                                            >
                                                Next
                                                <ChevronRight className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Edit User Dialog */}
                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Edit User</DialogTitle>
                            <DialogDescription>
                                Update user information and permissions.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="edit-name">Name</Label>
                                <Input
                                    id="edit-name"
                                    value={editFormData.name || ''}
                                    onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                                />
                            </div>
                            <div>
                                <Label htmlFor="edit-email">Email</Label>
                                <Input
                                    id="edit-email"
                                    type="email"
                                    value={editFormData.email || ''}
                                    onChange={(e) => setEditFormData(prev => ({ ...prev, email: e.target.value }))}
                                />
                            </div>
                            <div>
                                <Label htmlFor="edit-phone">Phone</Label>
                                <Input
                                    id="edit-phone"
                                    value={editFormData.phone || ''}
                                    onChange={(e) => setEditFormData(prev => ({ ...prev, phone: e.target.value }))}
                                />
                            </div>
                            <div>
                                <Label>Role</Label>
                                <Select
                                    value={editFormData.role || ''}
                                    onValueChange={(value) => setEditFormData(prev => ({ ...prev, role: value as 'admin' | 'officer' | 'supervisor' }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="admin">Admin</SelectItem>
                                        <SelectItem value="supervisor">Supervisor</SelectItem>
                                        <SelectItem value="officer">Officer</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Status</Label>
                                <Select
                                    value={editFormData.status || ''}
                                    onValueChange={(value) => setEditFormData(prev => ({ ...prev, status: value as 'active' | 'inactive' | 'suspended' }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="inactive">Inactive</SelectItem>
                                        <SelectItem value="suspended">Suspended</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="edit-locations">Locations</Label>
                                <div className="space-y-3">
                                    {/* Display selected locations as badges */}
                                    {editFormData.locations && editFormData.locations.length > 0 && (
                                        <div className="flex flex-wrap gap-2">
                                            {editFormData.locations.map((location, index) => (
                                                <div
                                                    key={index}
                                                    className="relative group bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium"
                                                >
                                                    <span>{location}</span>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="absolute -top-2 -right-2 h-5 w-5 p-0 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/80"
                                                        onClick={() => handleDeleteLocation(location)}
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Add location button */}
                                    <div className="flex gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                setShowLocationCombobox(!showLocationCombobox)
                                                if (!showLocationCombobox) {
                                                    setLocationSearchTerm('')
                                                }
                                            }}
                                        >
                                            <Plus className="h-4 w-4 mr-1" />
                                            Add Location
                                        </Button>
                                    </div>

                                    {/* Location selection combobox */}
                                    {showLocationCombobox && (
                                        <div className="space-y-2">
                                            <Combobox
                                                options={stackHolders.filter(sh =>
                                                    !editFormData.locations?.includes(sh.value)
                                                )}
                                                value=""
                                                onChange={(value) => {
                                                    if (value && !editFormData.locations?.includes(value)) {
                                                        setEditFormData(prev => ({
                                                            ...prev,
                                                            locations: [...(prev.locations || []), value]
                                                        }))
                                                    }
                                                    setShowLocationCombobox(false)
                                                    setLocationSearchTerm('')
                                                    setStackHolders([])
                                                }}
                                                placeholder="Search and select location..."
                                                searchTerm={locationSearchTerm}
                                                onSearchTermChange={setLocationSearchTerm}
                                                width="w-full"
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    setShowLocationCombobox(false)
                                                    setLocationSearchTerm('')
                                                    setStackHolders([])
                                                }}
                                            >
                                                Cancel
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleSaveUser}>Save Changes</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Config Dialog */}
                <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
                    <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Manage User Settings</DialogTitle>
                            <DialogDescription>
                                Configure user permissions, expenses, and preferences for {selectedUser?.name}.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-6">
                            {/* Allowed Expenses Section */}
                            {configFormData.allowedExpenses && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="flex items-center space-x-2">
                                                <h3 className="text-lg font-semibold">Expense Allowances</h3>
                                            </div>
                                            <p className="text-sm text-muted-foreground">Set daily expense limits for the user</p>
                                        </div>
                                        <div className="flex items-center space-x-4">
                                            <div className="flex items-center space-x-2">
                                                <Label htmlFor="expenses-readonly" className="text-sm">User cannot edit:</Label>
                                                <Switch
                                                    id="expenses-readonly"
                                                    checked={configFormData.allowedExpenses?.readonly || false}
                                                    onCheckedChange={(checked) => setConfigFormData(prev => ({
                                                        ...prev,
                                                        allowedExpenses: {
                                                            ...prev.allowedExpenses,
                                                            readonly: checked
                                                        }
                                                    }))}
                                                />
                                            </div>
                                            <div className="flex space-x-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => setIsAddingExpense(true)}
                                                >
                                                    <Plus className="h-4 w-4 mr-1" />
                                                    Add Expense
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() => handleRemoveConfig('allowedExpenses')}
                                                >
                                                    <X className="h-4 w-4 mr-1" />
                                                    Remove Section
                                                </Button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Standard Expenses */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {Object.entries(configFormData.allowedExpenses)
                                            .filter(([key]) => key !== 'readonly')
                                            .map(([key, value]) => (
                                                <div key={key} className="space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <Label htmlFor={key} className="capitalize">
                                                            {key.replace(/([A-Z])/g, ' $1')} {key === 'petrol' ? '(per liter)' : '(per day)'}
                                                        </Label>
                                                        {!['hotel', 'fooding', 'petrol'].includes(key) && (
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => handleRemoveExpense(key)}
                                                            >
                                                                <X className="h-3 w-3" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <span className="text-sm">₹</span>
                                                        <Input
                                                            id={key}
                                                            type="number"
                                                            value={typeof value === 'number' ? value : 0}
                                                            onChange={(e) => setConfigFormData(prev => ({
                                                                ...prev,
                                                                allowedExpenses: {
                                                                    ...prev.allowedExpenses,
                                                                    [key]: parseInt(e.target.value) || 0
                                                                }
                                                            }))}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                    </div>

                                    {/* Add Custom Expense */}
                                    {isAddingExpense && (
                                        <div className="border rounded-lg p-4 space-y-4">
                                            <div className="flex items-center justify-between">
                                                <h4 className="font-medium">Add Custom Expense</h4>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => setIsAddingExpense(false)}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <Label htmlFor="custom-expense-key">Expense Name</Label>
                                                    <Input
                                                        id="custom-expense-key"
                                                        placeholder="e.g., transport, meals"
                                                        value={customExpenseKey}
                                                        onChange={(e) => setCustomExpenseKey(e.target.value)}
                                                    />
                                                </div>
                                                <div>
                                                    <Label htmlFor="custom-expense-value">Amount (₹)</Label>
                                                    <Input
                                                        id="custom-expense-value"
                                                        type="number"
                                                        placeholder="0"
                                                        value={customExpenseValue}
                                                        onChange={(e) => setCustomExpenseValue(e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                            <Button onClick={handleAddCustomExpense} className="w-full">
                                                Add Expense
                                            </Button>
                                        </div>
                                    )}
                                    <Separator />
                                </div>
                            )}

                            {/* Add Expenses Section if it doesn't exist */}
                            {!configFormData.allowedExpenses && (
                                <div className="space-y-4">
                                    <Button
                                        variant="outline"
                                        onClick={() => setConfigFormData(prev => ({
                                            ...prev,
                                            allowedExpenses: {
                                                hotel: 200,
                                                fooding: 100,
                                                petrol: 2,
                                                readonly: false
                                            }
                                        }))}
                                    >
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add Expense Allowances Section
                                    </Button>
                                    <Separator />
                                </div>
                            )}

                            {/* Preferences Section */}
                            {configFormData.preferences && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="flex items-center space-x-2">
                                                <h3 className="text-lg font-semibold">User Preferences</h3>
                                            </div>
                                            <p className="text-sm text-muted-foreground">Personal settings and preferences</p>
                                        </div>
                                        <div className="flex items-center space-x-4">
                                            <div className="flex items-center space-x-2">
                                                <Label htmlFor="preferences-readonly" className="text-sm">User cannot edit:</Label>
                                                <Switch
                                                    id="preferences-readonly"
                                                    checked={configFormData.preferences?.readonly || false}
                                                    onCheckedChange={(checked) => setConfigFormData(prev => ({
                                                        ...prev,
                                                        preferences: {
                                                            ...prev.preferences,
                                                            readonly: checked
                                                        }
                                                    }))}
                                                />
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                onClick={() => handleRemoveConfig('preferences')}
                                            >
                                                <X className="h-4 w-4 mr-1" />
                                                Remove Section
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <Label>Email Notifications</Label>
                                                <p className="text-sm text-muted-foreground">Receive email alerts</p>
                                            </div>
                                            <Switch
                                                checked={configFormData.preferences?.emailNotifications || false}
                                                onCheckedChange={(checked) => setConfigFormData(prev => ({
                                                    ...prev,
                                                    preferences: {
                                                        ...prev.preferences,
                                                        emailNotifications: checked
                                                    }
                                                }))}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <Label>SMS Notifications</Label>
                                                <p className="text-sm text-muted-foreground">Receive SMS alerts</p>
                                            </div>
                                            <Switch
                                                checked={configFormData.preferences?.smsNotifications || false}
                                                onCheckedChange={(checked) => setConfigFormData(prev => ({
                                                    ...prev,
                                                    preferences: {
                                                        ...prev.preferences,
                                                        smsNotifications: checked
                                                    }
                                                }))}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <Label>Auto Reports</Label>
                                                <p className="text-sm text-muted-foreground">Generate automatic reports</p>
                                            </div>
                                            <Switch
                                                checked={configFormData.preferences?.autoReports || false}
                                                onCheckedChange={(checked) => setConfigFormData(prev => ({
                                                    ...prev,
                                                    preferences: {
                                                        ...prev.preferences,
                                                        autoReports: checked
                                                    }
                                                }))}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <Label>Dark Mode</Label>
                                                <p className="text-sm text-muted-foreground">Use dark theme</p>
                                            </div>
                                            <Switch
                                                checked={configFormData.preferences?.darkMode || false}
                                                onCheckedChange={(checked) => setConfigFormData(prev => ({
                                                    ...prev,
                                                    preferences: {
                                                        ...prev.preferences,
                                                        darkMode: checked
                                                    }
                                                }))}
                                            />
                                        </div>
                                    </div>
                                    <Separator />
                                </div>
                            )}

                            {/* Add Preferences Section if it doesn't exist */}
                            {!configFormData.preferences && (
                                <div className="space-y-4">
                                    <Button
                                        variant="outline"
                                        onClick={() => setConfigFormData(prev => ({
                                            ...prev,
                                            preferences: {
                                                emailNotifications: true,
                                                smsNotifications: false,
                                                autoReports: false,
                                                darkMode: false,
                                                readonly: false
                                            }
                                        }))}
                                    >
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add User Preferences Section
                                    </Button>
                                    <Separator />
                                </div>
                            )}

                            {/* Permissions Section */}
                            {configFormData.permissions && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="flex items-center space-x-2">
                                                <h3 className="text-lg font-semibold">Access Permissions</h3>
                                            </div>
                                            <p className="text-sm text-muted-foreground">Control user access and capabilities</p>
                                        </div>
                                        <div className="flex items-center space-x-4">
                                            <div className="flex items-center space-x-2">
                                                <Label htmlFor="permissions-readonly" className="text-sm">User cannot edit:</Label>
                                                <Switch
                                                    id="permissions-readonly"
                                                    checked={configFormData.permissions?.readonly || false}
                                                    onCheckedChange={(checked) => setConfigFormData(prev => ({
                                                        ...prev,
                                                        permissions: {
                                                            ...prev.permissions,
                                                            readonly: checked
                                                        }
                                                    }))}
                                                />
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                onClick={() => handleRemoveConfig('permissions')}
                                            >
                                                <X className="h-4 w-4 mr-1" />
                                                Remove Section
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <Label>View Reports</Label>
                                                <p className="text-sm text-muted-foreground">Access to view reports</p>
                                            </div>
                                            <Switch
                                                checked={configFormData.permissions?.canViewReports || false}
                                                onCheckedChange={(checked) => setConfigFormData(prev => ({
                                                    ...prev,
                                                    permissions: {
                                                        ...prev.permissions,
                                                        canViewReports: checked
                                                    }
                                                }))}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <Label>Edit Records</Label>
                                                <p className="text-sm text-muted-foreground">Modify existing records</p>
                                            </div>
                                            <Switch
                                                checked={configFormData.permissions?.canEditRecords || false}
                                                onCheckedChange={(checked) => setConfigFormData(prev => ({
                                                    ...prev,
                                                    permissions: {
                                                        ...prev.permissions,
                                                        canEditRecords: checked
                                                    }
                                                }))}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <Label>Create Requests</Label>
                                                <p className="text-sm text-muted-foreground">Submit new requests</p>
                                            </div>
                                            <Switch
                                                checked={configFormData.permissions?.canCreateRequests !== false}
                                                onCheckedChange={(checked) => setConfigFormData(prev => ({
                                                    ...prev,
                                                    permissions: {
                                                        ...prev.permissions,
                                                        canCreateRequests: checked
                                                    }
                                                }))}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <Label>Approve Requests</Label>
                                                <p className="text-sm text-muted-foreground">Approve others' requests</p>
                                            </div>
                                            <Switch
                                                checked={configFormData.permissions?.canApproveRequests || false}
                                                onCheckedChange={(checked) => setConfigFormData(prev => ({
                                                    ...prev,
                                                    permissions: {
                                                        ...prev.permissions,
                                                        canApproveRequests: checked
                                                    }
                                                }))}
                                            />
                                        </div>
                                    </div>
                                    <Separator />
                                </div>
                            )}

                            {/* Add Permissions Section if it doesn't exist */}
                            {!configFormData.permissions && (
                                <div className="space-y-4">
                                    <Button
                                        variant="outline"
                                        onClick={() => setConfigFormData(prev => ({
                                            ...prev,
                                            permissions: {
                                                canViewReports: true,
                                                canEditRecords: false,
                                                canCreateRequests: true,
                                                canApproveRequests: false,
                                                readonly: false
                                            }
                                        }))}
                                    >
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add Access Permissions Section
                                    </Button>
                                    <Separator />
                                </div>
                            )}

                            {/* Advanced Section for other configs */}
                            <div className="space-y-4">
                                <Separator />
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-semibold">Advanced Settings</h3>
                                        <p className="text-sm text-muted-foreground">Custom configurations and technical settings</p>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setIsAddingConfig(true)}
                                    >
                                        <Plus className="h-4 w-4 mr-1" />
                                        Add Config
                                    </Button>
                                </div>

                                {/* Custom configs */}
                                {Object.entries(configFormData)
                                    .filter(([key]) => !['allowedExpenses', 'preferences', 'permissions'].includes(key))
                                    .map(([key, value]) => (
                                        <div key={key} className="space-y-2 border rounded-lg p-4">
                                            <div className="flex items-center justify-between">
                                                <Label className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}</Label>
                                                <div className="flex items-center space-x-2">
                                                    <div className="flex items-center space-x-2">
                                                        <Label htmlFor={`${key}-readonly`} className="text-sm">User cannot edit:</Label>
                                                        <Switch
                                                            id={`${key}-readonly`}
                                                            checked={value?.readonly || false}
                                                            onCheckedChange={(checked) => setConfigFormData(prev => ({
                                                                ...prev,
                                                                [key]: {
                                                                    ...prev[key],
                                                                    readonly: checked
                                                                }
                                                            }))}
                                                        />
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        onClick={() => handleRemoveConfig(key)}
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                            <Textarea
                                                value={JSON.stringify(value, null, 2)}
                                                onChange={(e) => {
                                                    try {
                                                        const parsed = JSON.parse(e.target.value)
                                                        setConfigFormData(prev => ({ ...prev, [key]: parsed }))
                                                    } catch (error) {
                                                        // Invalid JSON, don't update
                                                    }
                                                }}
                                                rows={3}
                                                className="font-mono text-sm"
                                            />
                                        </div>
                                    ))}

                                {/* Add Custom Config */}
                                {isAddingConfig && (
                                    <div className="border rounded-lg p-4 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h4 className="font-medium">Add Custom Configuration</h4>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => setIsAddingConfig(false)}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        <div className="space-y-4">
                                            <div>
                                                <Label htmlFor="new-config-key">Configuration Name</Label>
                                                <Input
                                                    id="new-config-key"
                                                    placeholder="e.g., customSettings, workHours"
                                                    value={newConfigKey}
                                                    onChange={(e) => setNewConfigKey(e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <Label htmlFor="new-config-value">Configuration Value (JSON)</Label>
                                                <Textarea
                                                    id="new-config-value"
                                                    placeholder='{"key": "value", "enabled": true}'
                                                    value={newConfigValue}
                                                    onChange={(e) => setNewConfigValue(e.target.value)}
                                                    rows={3}
                                                    className="font-mono text-sm"
                                                />
                                            </div>
                                        </div>
                                        <Button onClick={handleAddCustomConfig} className="w-full">
                                            Add Configuration
                                        </Button>
                                    </div>
                                )}

                                {/* Show message if no advanced configs */}
                                {Object.entries(configFormData).filter(([key]) => !['allowedExpenses', 'preferences', 'permissions'].includes(key)).length === 0 && !isAddingConfig && (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <p>No advanced configurations yet.</p>
                                        <p className="text-sm">Click "Add Config" to create custom settings.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsConfigDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleSaveConfigs}>Save Settings</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Password Reset Dialog */}
                <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Reset Password</DialogTitle>
                            <DialogDescription>
                                Set a new password for {selectedUser?.name}.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="new-password">New Password</Label>
                                <Input
                                    id="new-password"
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Enter new password (min 6 characters)"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => {
                                setIsPasswordDialogOpen(false)
                                setNewPassword('')
                            }}>
                                Cancel
                            </Button>
                            <Button onClick={handleResetPassword} disabled={newPassword.length < 6}>
                                Reset Password
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Delete Location Confirmation Dialog */}
                <Dialog open={deleteLocationDialogOpen} onOpenChange={setDeleteLocationDialogOpen}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-destructive">
                                <X className="h-5 w-5" />
                                Remove Location
                            </DialogTitle>
                            <DialogDescription>
                                Are you sure you want to remove this location? This action cannot be undone.
                            </DialogDescription>
                        </DialogHeader>

                        {locationToDelete && (
                            <div className="py-4">
                                <div className="p-3 border rounded-lg bg-destructive/5 border-destructive/20">
                                    <p className="font-medium text-center">
                                        {locationToDelete}
                                    </p>
                                </div>
                            </div>
                        )}

                        <DialogFooter>
                            <Button variant="outline" onClick={cancelDeleteLocation}>
                                Cancel
                            </Button>
                            <Button variant="destructive" onClick={confirmDeleteLocation}>
                                <X className="h-4 w-4 mr-2" />
                                Remove Location
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </TooltipProvider>
    )
}