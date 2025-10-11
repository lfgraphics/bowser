"use client"
import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    User,
    Mail,
    Phone,
    MapPin,
    Key,
    Edit,
    Save,
    X,
    Plus
} from 'lucide-react'
import { campProfileAPI, CampUser } from '@/lib/campAPI'
import { StackHolder, BASE_URL } from '@/lib/api'
import { toast } from 'sonner'
import Loading from '@/app/loading'
import { PasswordInput } from "@/components/PasswordInput"
import ConfigsManager from '@/components/ConfigsManager'
import Combobox, { ComboboxOption } from '@/components/Combobox'

export default function CampProfile() {
    const [user, setUser] = useState<CampUser | null>(null)
    const [activity, setActivity] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [isEditingProfile, setIsEditingProfile] = useState(false)
    const [isEditingConfigs, setIsEditingConfigs] = useState(false)
    const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)

    const [profileFormData, setProfileFormData] = useState({ name: '', email: '', locations: [] as string[] })
    const [configFormData, setConfigFormData] = useState<Record<string, any>>({})
    const [passwordFormData, setPasswordFormData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    })

    const [stackHolders, setStackHolders] = useState<ComboboxOption[]>([])
    const [stackHoldersLoading, setStackHoldersLoading] = useState(false)
    const [locationSearchTerm, setLocationSearchTerm] = useState('')
    const [showLocationCombobox, setShowLocationCombobox] = useState(false)
    const [locationToDelete, setLocationToDelete] = useState<string | null>(null)
    const [deleteLocationDialogOpen, setDeleteLocationDialogOpen] = useState(false)

    useEffect(() => {
        fetchProfile()
        fetchActivity()
    }, [])

    const fetchStackHolders = async () => {
        try {
            // Clear existing results first
            setStackHolders([])
            
            const response = await fetch(`${BASE_URL}/trans-app/stack-holders?params=${locationSearchTerm}`);
            const data = await response.json();
            const formattedData: ComboboxOption[] = data.map((item: { _id: string, InstitutionName: string, Location: string }) => ({
                value: item.Location, // Using Location like the working pattern
                label: `${item.InstitutionName}: ${item.Location}`
            }));
            setStackHolders(formattedData);
        } catch (error: any) {
            setStackHolders([]) // Clear on error too
            const message = error?.message || 'Failed to fetch destinations';
            toast.error(message, { richColors: true });
        }
    }

    useEffect(() => {
        fetchStackHolders()
    }, [locationSearchTerm])

    const fetchProfile = async () => {
        try {
            setLoading(true)
            const userData = await campProfileAPI.getProfile()
            setUser(userData)
            setProfileFormData({
                name: userData.name,
                email: userData.email || '',
                locations: userData.locations || []
            })

            // Handle configs - they come as plain objects from the API
            const configsObj: Record<string, any> = {}
            if (userData.configs && typeof userData.configs === 'object') {
                // Direct assignment since it's already a plain object
                Object.assign(configsObj, userData.configs)
            }
            setConfigFormData(configsObj)
        } catch (error: any) {
            console.error('Error fetching profile:', error)
            // Avoid duplicate toasts
            if (error.response?.status !== 200 && error.response?.status !== 304) {
                toast.error(error.response?.data?.message || 'Failed to fetch profile')
            }
        } finally {
            setLoading(false)
        }
    }

    const fetchActivity = async () => {
        try {
            const activityData = await campProfileAPI.getActivity()
            setActivity(activityData)
        } catch (error: any) {
            console.error('Error fetching activity:', error)
        }
    }

    const handleSaveProfile = async () => {
        try {
            const updateData = {
                name: profileFormData.name,
                email: profileFormData.email,
                locations: profileFormData.locations
            }
            await campProfileAPI.updateProfile(updateData)
            toast.success('Profile updated successfully')
            setIsEditingProfile(false)
            fetchProfile()
        } catch (error: any) {
            console.error('Error updating profile:', error)
            toast.error(error.response?.data?.message || 'Failed to update profile')
        }
    }

    const handleSaveConfigs = async () => {
        try {
            // Only send configs that are not readonly
            const editableConfigs: Record<string, any> = {}
            Object.entries(configFormData).forEach(([key, value]) => {
                if (!value.readonly) {
                    editableConfigs[key] = value
                }
            })

            await campProfileAPI.updateConfigs(editableConfigs)
            toast.success('Configuration updated successfully')
            setIsEditingConfigs(false)
            fetchProfile()
        } catch (error: any) {
            console.error('Error updating configs:', error)
            toast.error(error.response?.data?.message || 'Failed to update configuration')
        }
    }

    const handleChangePassword = async () => {
        if (passwordFormData.newPassword !== passwordFormData.confirmPassword) {
            toast.error('New passwords do not match')
            return
        }

        if (passwordFormData.newPassword.length < 6) {
            toast.error('Password must be at least 6 characters long')
            return
        }

        try {
            await campProfileAPI.changePassword(
                passwordFormData.currentPassword,
                passwordFormData.newPassword
            )
            toast.success('Password changed successfully')
            setIsPasswordDialogOpen(false)
            setPasswordFormData({ currentPassword: '', newPassword: '', confirmPassword: '' })
        } catch (error: any) {
            console.error('Error changing password:', error)
            toast.error(error.response?.data?.message || 'Failed to change password')
        }
    }

    const handleDeleteLocation = (location: string) => {
        setLocationToDelete(location)
        setDeleteLocationDialogOpen(true)
    }

    const confirmDeleteLocation = () => {
        if (locationToDelete) {
            setProfileFormData(prev => ({
                ...prev,
                locations: prev.locations.filter(loc => loc !== locationToDelete)
            }))
        }
        setDeleteLocationDialogOpen(false)
        setLocationToDelete(null)
    }

    const cancelDeleteLocation = () => {
        setDeleteLocationDialogOpen(false)
        setLocationToDelete(null)
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

    if (loading) {
        return <Loading />
    }

    if (!user) {
        return (
            <div className="container mx-auto p-6">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4">Profile</h1>
                    <p>Failed to load profile data.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">My Profile</h1>
                    <p className="text-muted-foreground">Manage your camp account settings</p>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Profile Information */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Basic Info */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Personal Information</CardTitle>
                                <CardDescription>Your basic account information</CardDescription>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    if (isEditingProfile) {
                                        setProfileFormData({
                                            name: user.name,
                                            email: user.email || '',
                                            locations: user.locations || []
                                        })
                                    }
                                    setIsEditingProfile(!isEditingProfile)
                                }}
                            >
                                {isEditingProfile ? <X className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {isEditingProfile ? (
                                <>
                                    <div>
                                        <Label htmlFor="name">Name</Label>
                                        <Input
                                            id="name"
                                            value={profileFormData.name}
                                            onChange={(e) => setProfileFormData(prev => ({ ...prev, name: e.target.value }))}
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="email">Email</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            value={profileFormData.email}
                                            onChange={(e) => setProfileFormData(prev => ({ ...prev, email: e.target.value }))}
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="locations">Locations</Label>
                                        <div className="space-y-3">
                                            {/* Display selected locations as badges */}
                                            {profileFormData.locations && profileFormData.locations.length > 0 && (
                                                <div className="flex flex-wrap gap-2">
                                                    {profileFormData.locations.map((location, index) => (
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
                                                        className="w-full md:w-auto"
                                                        options={stackHolders}
                                                        value=""
                                                        onChange={(value) => {
                                                            if (value && !profileFormData.locations.includes(value)) {
                                                                setProfileFormData(prev => ({
                                                                    ...prev,
                                                                    locations: [...prev.locations, value]
                                                                }))
                                                            }
                                                            setShowLocationCombobox(false)
                                                            setLocationSearchTerm('')
                                                            setStackHolders([])
                                                        }}
                                                        searchTerm={locationSearchTerm}
                                                        onSearchTermChange={setLocationSearchTerm}
                                                        placeholder="Search and select location..."
                                                        showAddButton={false}
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
                                    <div className="flex space-x-2">
                                        <Button onClick={handleSaveProfile}>
                                            <Save className="h-4 w-4 mr-2" />
                                            Save Changes
                                        </Button>
                                        <Button variant="outline" onClick={() => setIsEditingProfile(false)}>
                                            Cancel
                                        </Button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="flex items-center space-x-3">
                                        <User className="h-5 w-5 text-muted-foreground" />
                                        <div>
                                            <p className="font-medium">{user.name}</p>
                                            <p className="text-sm text-muted-foreground">Full Name</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <Phone className="h-5 w-5 text-muted-foreground" />
                                        <div>
                                            <p className="font-medium">{user.phone}</p>
                                            <p className="text-sm text-muted-foreground">Phone Number</p>
                                        </div>
                                    </div>
                                    {user.email && (
                                        <div className="flex items-center space-x-3">
                                            <Mail className="h-5 w-5 text-muted-foreground" />
                                            <div>
                                                <p className="font-medium">{user.email}</p>
                                                <p className="text-sm text-muted-foreground">Email Address</p>
                                            </div>
                                        </div>
                                    )}
                                    {user.locations && user.locations.length > 0 && (
                                        <div className="flex items-start space-x-3">
                                            <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                                            <div>
                                                <p className="font-medium">{user.locations.join(', ')}</p>
                                                <p className="text-sm text-muted-foreground">Assigned Locations</p>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {/* Configuration */}
                    <ConfigsManager
                        configs={configFormData}
                        onConfigsChange={setConfigFormData}
                        isEditing={isEditingConfigs}
                        onEditToggle={() => {
                            if (isEditingConfigs) {
                                // Reset configs to original
                                const configsObj: Record<string, any> = {}
                                if (user?.configs && typeof user.configs === 'object') {
                                    Object.assign(configsObj, user.configs)
                                }
                                setConfigFormData(configsObj)
                            }
                            setIsEditingConfigs(!isEditingConfigs)
                        }}
                        onSave={handleSaveConfigs}
                        onCancel={() => {
                            // Reset configs to original
                            const configsObj: Record<string, any> = {}
                            if (user?.configs && typeof user.configs === 'object') {
                                Object.assign(configsObj, user.configs)
                            }
                            setConfigFormData(configsObj)
                            setIsEditingConfigs(false)
                        }}
                        isAdmin={user?.role === 'admin'}
                        showReadonlyToggle={user?.role === 'admin'}
                        title="Configuration Settings"
                        description="Your account settings and preferences"
                    />
                </div>

                {/* Account Status & Actions */}
                <div className="space-y-6">
                    {/* Account Status */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Account Status</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Role</span>
                                <Badge variant={getRoleBadgeVariant(user.role)}>
                                    {user.role}
                                </Badge>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Status</span>
                                <Badge variant={getStatusBadgeVariant(user.status)}>
                                    {user.status}
                                </Badge>
                            </div>
                            {activity && (
                                <>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium">Last Login</span>
                                        <span className="text-sm text-muted-foreground">
                                            {activity.lastLogin
                                                ? new Date(activity.lastLogin).toLocaleDateString()
                                                : 'Never'
                                            }
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium">Member Since</span>
                                        <span className="text-sm text-muted-foreground">
                                            {activity.accountCreated
                                                ? new Date(activity.accountCreated).toLocaleDateString()
                                                : 'N/A'
                                            }
                                        </span>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {/* Quick Actions */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Quick Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <Button
                                variant="outline"
                                className="w-full justify-start"
                                onClick={() => setIsPasswordDialogOpen(true)}
                            >
                                <Key className="h-4 w-4 mr-2" />
                                Change Password
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Change Password Dialog */}
            <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Change Password</DialogTitle>
                        <DialogDescription>
                            Enter your current password and choose a new one.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="current-password">Current Password</Label>
                            <PasswordInput
                                id="current-password"
                                value={passwordFormData.currentPassword}
                                onChange={(e) => setPasswordFormData(prev => ({
                                    ...prev,
                                    currentPassword: e.target.value
                                }))}
                            />
                        </div>
                        <div>
                            <Label htmlFor="new-password">New Password</Label>
                            <PasswordInput
                                id="new-password"
                                value={passwordFormData.newPassword}
                                onChange={(e) => setPasswordFormData(prev => ({
                                    ...prev,
                                    newPassword: e.target.value
                                }))}
                            />
                        </div>
                        <div>
                            <Label htmlFor="confirm-password">Confirm New Password</Label>
                            <PasswordInput
                                id="confirm-password"
                                value={passwordFormData.confirmPassword}
                                onChange={(e) => setPasswordFormData(prev => ({
                                    ...prev,
                                    confirmPassword: e.target.value
                                }))}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => {
                            setIsPasswordDialogOpen(false)
                            setPasswordFormData({ currentPassword: '', newPassword: '', confirmPassword: '' })
                        }}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleChangePassword}
                            disabled={
                                !passwordFormData.currentPassword ||
                                !passwordFormData.newPassword ||
                                passwordFormData.newPassword !== passwordFormData.confirmPassword ||
                                passwordFormData.newPassword.length < 6
                            }
                        >
                            Change Password
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
    )
}