"use client"
import React, { useEffect, useState } from 'react';
import { isAuthenticated } from '@/lib/auth';
import { User } from '@/types';
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

const Profile = () => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [editingField, setEditingField] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
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

    const isUpdated = name !== initialName || phoneNumber !== initialPhoneNumber;

    const handleUpdateUser = async () => {
        if (name !== initialName || phoneNumber !== initialPhoneNumber) {
            if (name.length < 4) {
                alert('Name must have at least 4 characters.');
                return;
            }
            if (phoneNumber.length !== 10) {
                alert('Phone number must be 10 digits long.');
                return;
            }
            try {
                setLoading(true);
                const userId = user?.userId;
                const response = await axios.put(`${BASE_URL}/users/update`, {
                    userId,
                    name,
                    phoneNumber,
                });

                if (response.status === 200) {
                    console.log('User updated successfully:', response.data.user);
                    setInitialName(name);
                    setInitialPhoneNumber(phoneNumber);
                    setEditingField(null)
                }
            } catch (error: any) {
                console.error('Error updating user:', error.response?.data?.message || error.message);
                setError((error as any).response?.data?.message || error.message || 'An error occurred while generating the reset URL.');
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
                            <span>{user?.roles.join(', ')}</span>
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
                                <Button variant="outline" onClick={() => editingField === 'name' ? handleSave() : handleEdit('name')}>
                                    {editingField === 'name' ? <Check /> : <Edit2 />}
                                </Button>
                            </div>
                            <div className="flex justify-between items-center gap-3">
                                <Label className='flex-[0.9]'>Phone Number</Label>
                                {editingField === 'phoneNumber' ? (
                                    <Input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="flex-[1]" />
                                ) : (
                                    <span className="flex-[1">{phoneNumber}</span>
                                )}
                                <Button variant="outline" onClick={() => editingField === 'phoneNumber' ? handleSave() : handleEdit('phoneNumber')}>
                                    {editingField === 'phoneNumber' ? <Check /> : <Edit2 />}
                                </Button>
                            </div>
                        </div>
                        {isUpdated && <Button onClick={handleUpdateUser}>Save Changes</Button>}
                        <Button onClick={handlePasswordReset}>Change Password</Button>
                        {error && <p className="text-red-500">{error}</p>}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default Profile;