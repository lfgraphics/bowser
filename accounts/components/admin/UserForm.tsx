"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";

interface User {
    _id?: string;
    userId: string;
    name: string;
    email?: string;
    role: string;
    isActive: boolean;
    validTill?: string;
}

interface UserFormProps {
    initialData?: User | null;
    onSubmit: (data: any) => Promise<void>;
    isLoading: boolean;
    isEditing?: boolean;
}

export function UserForm({ initialData, onSubmit, isLoading, isEditing = false }: UserFormProps) {
    const [formData, setFormData] = useState({
        userId: "",
        name: "",
        email: "",
        password: "",
        role: "grManager",
        validTill: "",
        isActive: true
    });
    const [error, setError] = useState("");

    useEffect(() => {
        if (initialData) {
            setFormData({
                userId: initialData.userId,
                name: initialData.name,
                email: initialData.email || "",
                password: "", // Don't populate password
                role: initialData.role,
                validTill: initialData.validTill ? new Date(initialData.validTill).toISOString().split('T')[0] : "",
                isActive: initialData.isActive ?? true
            });
        }
    }, [initialData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!isEditing && !formData.password) {
            setError("Password is required for new users");
            return;
        }

        if (formData.password && formData.password.length < 6) {
            setError("Password must be at least 6 characters long");
            return;
        }

        try {
            await onSubmit(formData);
        } catch (err: any) {
            setError(err.message || "Failed to submit form");
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            {error && (
                <Alert variant="destructive" className="bg-red-500/10 border-red-500/50">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
            
            <div className="space-y-2">
                <Label className="text-slate-300">User ID</Label>
                <Input
                    value={formData.userId}
                    onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                    required
                    disabled={isEditing}
                    placeholder="e.g. johndoe"
                    className="bg-brand-bg-800 border-brand-border text-white placeholder:text-slate-500"
                />
                {isEditing && <p className="text-xs text-slate-500">User ID cannot be changed</p>}
            </div>

            <div className="space-y-2">
                <Label className="text-slate-300">Full Name</Label>
                <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="Enter full name"
                    className="bg-brand-bg-800 border-brand-border text-white placeholder:text-slate-500"
                />
            </div>

            <div className="space-y-2">
                <Label className="text-slate-300">Email (Optional)</Label>
                <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@example.com"
                    className="bg-brand-bg-800 border-brand-border text-white placeholder:text-slate-500"
                />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="text-slate-300">Role</Label>
                    <select
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        className="w-full bg-brand-bg-800 border border-brand-border rounded-md px-3 py-2 text-white h-10 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                    >
                        <option value="grManager">GR Manager</option>
                        <option value="cashierAdmin">Cashier Admin</option>
                        <option value="tempCashier">Temp Cashier</option>
                        <option value="accountant">Accountant</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>

                <div className="space-y-2">
                    <Label className="text-slate-300">Status</Label>
                    <select
                        value={formData.isActive ? "true" : "false"}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.value === "true" })}
                        className="w-full bg-brand-bg-800 border border-brand-border rounded-md px-3 py-2 text-white h-10 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                    >
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                    </select>
                </div>
            </div>

            {formData.role === "tempCashier" && (
                <div className="space-y-2">
                    <Label className="text-slate-300">Valid Till</Label>
                    <Input
                        type="date"
                        value={formData.validTill}
                        onChange={(e) => setFormData({ ...formData, validTill: e.target.value })}
                        required
                        className="bg-brand-bg-800 border-brand-border text-white"
                    />
                </div>
            )}

            <Button type="submit" disabled={isLoading} className="w-full bg-brand-primary hover:bg-brand-primary/90 text-white mt-4">
                {isLoading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</>
                ) : (
                    isEditing ? "Update User" : "Create User"
                )}
            </Button>
        </form>
    );
}
