"use client"
import React, { useEffect, useState } from 'react';
import { isAuthenticated } from '@/lib/auth';
import { TransAppUser, User } from '@/types';
import Loading from '@/app/loading';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { Check, Edit2 } from 'lucide-react';
import axios from 'axios';
import { BASE_URL } from '@/lib/api';
import { Separator } from '@/components/ui/separator';
import { PasswordInput } from '@/components/PasswordInput';
import { toast } from 'sonner';

const Profile = () => {
    const [user, setUser] = useState<TransAppUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [editingField, setEditingField] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [initialName, setInitialName] = useState('');
    const [initialPhoneNumber, setInitialPhoneNumber] = useState('');
    const router = useRouter();

    useEffect(() => {
        if (isAuthenticated()) {
            const storedUser = JSON.parse(localStorage.getItem('adminUser')!);
            setUser(storedUser);
            setName(storedUser.name);
            setPhoneNumber(storedUser.phoneNumber);
            setInitialName(storedUser.name);
            setInitialPhoneNumber(storedUser.phoneNumber);
            setLoading(false);
        } else {
            router.push('/login');
        }
    }, []);

    const handleEdit = (field: string) => {
        setEditingField(field);
    };

    const handleSave = () => {
        if (user) {
            setUser({ ...user, name, phoneNumber });
        }
        setEditingField(null);
    };

    const handlePasswordReset = async () => {
        const userId = user?.userId;
        setLoading(true);
        setError('');

        try {
            const response = await axios.post(`${BASE_URL}/auth/generate-reset-url`, { userId });
            const resetUrl = response.data.resetUrl;
            window.location.href = resetUrl;
        } catch (err) {
            setError((err as any).response?.data?.message || 'An error occurred while generating the reset URL.');
        } finally {
            setLoading(false);
        }
    };

    const isUpdated = name !== initialName || phoneNumber !== initialPhoneNumber || password.length > 0;

    const handleUpdateUser = async () => {
        if (name !== initialName || phoneNumber !== initialPhoneNumber) {
            if (name?.trim().length < 4) {
                toast.error('Name must have at least 4 characters.', { richColors: true });
                return;
            }
            if (phoneNumber?.replace(" ", "").length !== 10) {
                toast.error('Phone number must be 10 digits long.', { richColors: true });
                return;
            }

            try {
                setLoading(true);
                const userId = user?._id;
                const response = await axios.post(`${BASE_URL}/trans-app/manage-profile/update-profile`, {
                    userName: name?.trim(),
                    phoneNumber: phoneNumber?.replace(" ", ""),
                    password,
                    id: userId,
                    //  photo, 
                });

                if (response.status === 200) {
                    console.log('User updated successfully:', response.data.user);
                    setEditingField(null);
                    setInitialName(name);
                    setInitialPhoneNumber(phoneNumber);
                    localStorage.setItem("adminUser", JSON.stringify(response.data.user));
                    user && setUser(response.data.user);
                    toast.success('Profile updated successfully!', { richColors: true });
                }
            } catch (error: any) {
                console.error('Error updating user:', error.response?.data?.error || error.message);
                setError((error as any).response?.data?.message || error.message || (error as any).response?.data?.error || 'An error occurred while generating the reset URL.');
            } finally {
                setLoading(false);
            }
        }
    };

    return (
        <div className="flex justify-center items-center bg-background min-h-screen">
            {loading && <Loading />}
            <Card className="w-[350px]">
                <CardHeader>
                    <CardTitle>Profile</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col space-y-4">
                        <div className="flex justify-between gap-3">
                            <Label className='flex-[0.9]'>User Id</Label>
                            <span>{user?.userId}</span>
                        </div>
                        <div className="flex justify-between gap-3">
                            <Label className='flex-[0.9]'>Role/s</Label>
                            <span>{user?.Division}</span>
                        </div>
                        <Separator />
                        <div className="flex flex-col space-y-4">
                            <div className="flex justify-between items-center gap-3">
                                <Label className='flex-[0.9]'>Name</Label>
                                {editingField === 'name' ? (
                                    <Input value={name} onChange={(e) => setName(e.target.value)} className="flex-[1]" />
                                ) : (
                                    <span className="flex-[1">{name}</span>
                                )}
                                <span onClick={() => editingField === 'name' ? handleSave() : handleEdit('name')}>
                                    {editingField === 'name' ? <Check size={18} color='white' /> : <Edit2 size={18} color='gray' />}
                                </span>
                            </div>
                            <div className="flex justify-between items-center gap-3">
                                <Label className='flex-[0.9]'>Phone Number</Label>
                                {editingField === 'phoneNumber' ? (
                                    <Input type='number' value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="flex-[1]" />
                                ) : (
                                    <span className="flex-[1">{phoneNumber}</span>
                                )}
                                <span onClick={() => editingField === 'phoneNumber' ? handleSave() : handleEdit('phoneNumber')}>
                                    {editingField === 'phoneNumber' ? <Check size={18} color='white' /> : <Edit2 size={18} color='gray' />}
                                </span>
                            </div>
                            <div className="flex justify-between items-center gap-3">
                                <Label className='flex-[0.9]'>Password</Label>
                                {editingField === 'password' ? (
                                    <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} className="flex-[1]" />
                                ) : (
                                    '*'.repeat(password.length)
                                )}
                                <span onClick={() => editingField === 'password' ? handleSave() : handleEdit('password')}>
                                    {editingField === 'password' ? <Check size={18} color='white' /> : <Edit2 size={18} color='gray' />}
                                </span>
                            </div>
                        </div>
                        {isUpdated && <Button onClick={handleUpdateUser}>Save Changes</Button>}
                        {error && <p className="text-red-500">{error}</p>}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default Profile;