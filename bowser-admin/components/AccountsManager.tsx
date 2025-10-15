"use client"

import React, { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Plus, Edit, Trash2, CreditCard, Building, X } from 'lucide-react'
import { toast } from 'sonner'

export interface Account {
    _id?: string
    accountType: 'upi' | 'bankAccount'
    // UPI fields
    upiId?: string
    upiHolderName?: string
    // Bank Account fields
    bankName?: string
    accountNumber?: string
    ifscCode?: string
    accountHolderName?: string
}

interface AccountsManagerProps {
    accounts: Account[]
    onAccountsChange: (accounts: Account[]) => void
    isEditing: boolean
    onEditToggle: () => void
    onSave: () => void
    onCancel: () => void
    title?: string
    description?: string
    readOnly?: boolean
}

export default function AccountsManager({
    accounts,
    onAccountsChange,
    isEditing,
    onEditToggle,
    onSave,
    onCancel,
    title = "Account Information",
    description = "Manage payment accounts",
    readOnly = false
}: AccountsManagerProps) {
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
    const [accountToDelete, setAccountToDelete] = useState<Account | null>(null)
    const [formData, setFormData] = useState<Account>({
        accountType: 'upi'
    })

    const resetForm = () => {
        setFormData({
            accountType: 'upi'
        })
    }

    const validateAccount = (account: Account): boolean => {
        if (account.accountType === 'upi') {
            return !!(account.upiId?.trim() && account.upiHolderName?.trim())
        } else {
            return !!(
                account.bankName?.trim() &&
                account.accountNumber?.trim() &&
                account.ifscCode?.trim() &&
                account.accountHolderName?.trim()
            )
        }
    }

    const handleAddAccount = () => {
        if (!validateAccount(formData)) {
            toast.error('Please fill in all required fields')
            return
        }

        const newAccount: Account = {
            ...formData,
            // Use a temporary ID for frontend state management (backend will ignore invalid ObjectIds)
            _id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        }

        onAccountsChange([...accounts, newAccount])
        setIsAddDialogOpen(false)
        resetForm()
    }

    const handleEditAccount = () => {
        if (!selectedAccount || !validateAccount(formData)) {
            toast.error('Please fill in all required fields')
            return
        }

        const updatedAccounts = accounts.map(account =>
            account._id === selectedAccount._id ? { ...formData, _id: selectedAccount._id } : account
        )

        onAccountsChange(updatedAccounts)
        setIsEditDialogOpen(false)
        setSelectedAccount(null)
        resetForm()
    }

    const handleDeleteAccount = () => {
        if (!accountToDelete) return

        const updatedAccounts = accounts.filter(account => account._id !== accountToDelete._id)
        onAccountsChange(updatedAccounts)
        setIsDeleteDialogOpen(false)
        setAccountToDelete(null)
    }

    const openEditDialog = (account: Account) => {
        setSelectedAccount(account)
        setFormData({ ...account })
        setIsEditDialogOpen(true)
    }

    const openDeleteDialog = (account: Account) => {
        setAccountToDelete(account)
        setIsDeleteDialogOpen(true)
    }

    const getAccountDisplayName = (account: Account): string => {
        if (account.accountType === 'upi') {
            return account.upiId || 'UPI Account'
        } else {
            return `${account.bankName} - ${account.accountNumber?.slice(-4)}` || 'Bank Account'
        }
    }

    const getAccountIcon = (accountType: string) => {
        return accountType === 'upi' ? <CreditCard className="h-4 w-4" /> : <Building className="h-4 w-4" />
    }

    return (
        <TooltipProvider>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>{title}</CardTitle>
                        <p className="text-sm text-muted-foreground">{description}</p>
                    </div>
                    {!readOnly && (
                        <div className="flex gap-2">
                            {isEditing && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setIsAddDialogOpen(true)
                                        resetForm()
                                    }}
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Account
                                </Button>
                            )}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={isEditing ? onCancel : onEditToggle}
                            >
                                {isEditing ? <X className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
                            </Button>
                        </div>
                    )}
                </CardHeader>
                <CardContent className="space-y-4">
                    {accounts.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <CreditCard className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p>No accounts added yet</p>
                            {isEditing && !readOnly && (
                                <Button
                                    variant="outline"
                                    className="mt-2"
                                    onClick={() => {
                                        setIsAddDialogOpen(true)
                                        resetForm()
                                    }}
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add First Account
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            {accounts.map((account, index) => (
                                <div
                                    key={account._id || index}
                                    className="flex items-center justify-between p-3 border rounded-lg bg-muted/50"
                                >
                                    <div className="flex items-center space-x-3">
                                        {getAccountIcon(account.accountType)}
                                        <div>
                                            <div className="font-medium">{getAccountDisplayName(account)}</div>
                                            <div className="text-sm text-muted-foreground">
                                                {account.accountType === 'upi' ? (
                                                    <>
                                                        <span>{account.upiHolderName}</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span>{account.accountHolderName}</span>
                                                        <span className="mx-2">•</span>
                                                        <span>{account.ifscCode}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Badge variant="outline" className="text-xs">
                                            {account.accountType === 'upi' ? 'UPI' : 'Bank'}
                                        </Badge>
                                        {isEditing && !readOnly && (
                                            <div className="flex gap-1">
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => openEditDialog(account)}
                                                        >
                                                            <Edit className="h-3 w-3" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Edit account</TooltipContent>
                                                </Tooltip>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => openDeleteDialog(account)}
                                                            className="text-destructive hover:text-destructive"
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Delete account</TooltipContent>
                                                </Tooltip>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {isEditing && !readOnly && (
                        <div className="pt-4 border-t">
                            <div className="flex justify-end space-x-2">
                                <Button variant="outline" onClick={onCancel}>
                                    Cancel
                                </Button>
                                <Button onClick={onSave}>
                                    Save Changes
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Add Account Dialog */}
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Add New Account</DialogTitle>
                        <DialogDescription>
                            Add a new payment account. Changes will be saved when you click "Save Changes" on the main form.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="account-type">Account Type</Label>
                            <Select
                                value={formData.accountType}
                                onValueChange={(value: 'upi' | 'bankAccount') =>
                                    setFormData(prev => ({ ...prev, accountType: value }))
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="upi">UPI</SelectItem>
                                    <SelectItem value="bankAccount">Bank Account</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {formData.accountType === 'upi' ? (
                            <>
                                <div>
                                    <Label htmlFor="upi-id">UPI ID *</Label>
                                    <Input
                                        id="upi-id"
                                        placeholder="example@upi"
                                        value={formData.upiId || ''}
                                        onChange={(e) => setFormData(prev => ({ ...prev, upiId: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="upi-holder-name">Account Holder Name *</Label>
                                    <Input
                                        id="upi-holder-name"
                                        placeholder="Full name as per UPI"
                                        value={formData.upiHolderName || ''}
                                        onChange={(e) => setFormData(prev => ({ ...prev, upiHolderName: e.target.value }))}
                                    />
                                </div>
                            </>
                        ) : (
                            <>
                                <div>
                                    <Label htmlFor="bank-name">Bank Name *</Label>
                                    <Input
                                        id="bank-name"
                                        placeholder="e.g., State Bank of India"
                                        value={formData.bankName || ''}
                                        onChange={(e) => setFormData(prev => ({ ...prev, bankName: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="account-number">Account Number *</Label>
                                    <Input
                                        id="account-number"
                                        placeholder="Enter account number"
                                        value={formData.accountNumber || ''}
                                        onChange={(e) => setFormData(prev => ({ ...prev, accountNumber: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="ifsc-code">IFSC Code *</Label>
                                    <Input
                                        id="ifsc-code"
                                        placeholder="e.g., SBIN0000123"
                                        value={formData.ifscCode || ''}
                                        onChange={(e) => setFormData(prev => ({ ...prev, ifscCode: e.target.value.toUpperCase() }))}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="account-holder-name">Account Holder Name *</Label>
                                    <Input
                                        id="account-holder-name"
                                        placeholder="Full name as per bank records"
                                        value={formData.accountHolderName || ''}
                                        onChange={(e) => setFormData(prev => ({ ...prev, accountHolderName: e.target.value }))}
                                    />
                                </div>
                            </>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => {
                            setIsAddDialogOpen(false)
                            resetForm()
                        }}>
                            Cancel
                        </Button>
                        <Button onClick={handleAddAccount}>
                            Add Account
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Account Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Edit Account</DialogTitle>
                        <DialogDescription>
                            Update account information. Changes will be saved when you click "Save Changes" on the main form.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="edit-account-type">Account Type</Label>
                            <Select
                                value={formData.accountType}
                                onValueChange={(value: 'upi' | 'bankAccount') =>
                                    setFormData(prev => ({
                                        ...prev,
                                        accountType: value,
                                        // Clear fields when switching type
                                        upiId: value === 'upi' ? prev.upiId : undefined,
                                        upiHolderName: value === 'upi' ? prev.upiHolderName : undefined,
                                        bankName: value === 'bankAccount' ? prev.bankName : undefined,
                                        accountNumber: value === 'bankAccount' ? prev.accountNumber : undefined,
                                        ifscCode: value === 'bankAccount' ? prev.ifscCode : undefined,
                                        accountHolderName: value === 'bankAccount' ? prev.accountHolderName : undefined,
                                    }))
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="upi">UPI</SelectItem>
                                    <SelectItem value="bankAccount">Bank Account</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {formData.accountType === 'upi' ? (
                            <>
                                <div>
                                    <Label htmlFor="edit-upi-id">UPI ID *</Label>
                                    <Input
                                        id="edit-upi-id"
                                        placeholder="example@upi"
                                        value={formData.upiId || ''}
                                        onChange={(e) => setFormData(prev => ({ ...prev, upiId: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="edit-upi-holder-name">Account Holder Name *</Label>
                                    <Input
                                        id="edit-upi-holder-name"
                                        placeholder="Full name as per UPI"
                                        value={formData.upiHolderName || ''}
                                        onChange={(e) => setFormData(prev => ({ ...prev, upiHolderName: e.target.value }))}
                                    />
                                </div>
                            </>
                        ) : (
                            <>
                                <div>
                                    <Label htmlFor="edit-bank-name">Bank Name *</Label>
                                    <Input
                                        id="edit-bank-name"
                                        placeholder="e.g., State Bank of India"
                                        value={formData.bankName || ''}
                                        onChange={(e) => setFormData(prev => ({ ...prev, bankName: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="edit-account-number">Account Number *</Label>
                                    <Input
                                        id="edit-account-number"
                                        placeholder="Enter account number"
                                        value={formData.accountNumber || ''}
                                        onChange={(e) => setFormData(prev => ({ ...prev, accountNumber: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="edit-ifsc-code">IFSC Code *</Label>
                                    <Input
                                        id="edit-ifsc-code"
                                        placeholder="e.g., SBIN0000123"
                                        value={formData.ifscCode || ''}
                                        onChange={(e) => setFormData(prev => ({ ...prev, ifscCode: e.target.value.toUpperCase() }))}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="edit-account-holder-name">Account Holder Name *</Label>
                                    <Input
                                        id="edit-account-holder-name"
                                        placeholder="Full name as per bank records"
                                        value={formData.accountHolderName || ''}
                                        onChange={(e) => setFormData(prev => ({ ...prev, accountHolderName: e.target.value }))}
                                    />
                                </div>
                            </>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => {
                            setIsEditDialogOpen(false)
                            setSelectedAccount(null)
                            resetForm()
                        }}>
                            Cancel
                        </Button>
                        <Button onClick={handleEditAccount}>
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Account Dialog */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <Trash2 className="h-5 w-5" />
                            Delete Account
                        </DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this account? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>

                    {accountToDelete && (
                        <div className="py-4">
                            <div className="p-3 border rounded-lg bg-destructive/5 border-destructive/20">
                                <div className="flex items-center space-x-2">
                                    {getAccountIcon(accountToDelete.accountType)}
                                    <div>
                                        <div className="font-medium">{getAccountDisplayName(accountToDelete)}</div>
                                        <div className="text-sm text-muted-foreground">
                                            {accountToDelete.accountType === 'upi' ?
                                                accountToDelete.upiHolderName :
                                                accountToDelete.accountHolderName
                                            }
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => {
                            setIsDeleteDialogOpen(false)
                            setAccountToDelete(null)
                        }}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDeleteAccount}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Account
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </TooltipProvider>
    )
}