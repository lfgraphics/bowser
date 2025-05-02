"use client"
import React, { useEffect, useState, FormEvent } from 'react';
import axios from 'axios';
import { isAuthenticated } from '@/lib/auth';
import { formatDate } from '@/lib/utils';
import { User } from '@/types';
import { BASE_URL } from '@/lib/api';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { Download } from 'lucide-react';

interface UpdateEntry {
    _id: string;
    appName: string;
    image: string;
    buildVersion: number;
    releaseNotes?: string;
    url: string;
    fileSizeMB?: string;
    pushDate: string;
}

interface FormData {
    appName: string;
    buildVersion: string;
    releaseNotes: string;
    url: string;
}

const UpdateManager: React.FC = () => {
    const [updates, setUpdates] = useState<UpdateEntry[]>([]);
    const [isAdmin, setIsAdmin] = useState(false);
    // const [formData, setFormData] = useState<FormData>({ appName: '', buildVersion: '', releaseNotes: '', url: '' });
    // const [loading, setLoading] = useState(false);
    const [user, setUser] = useState<User>()

    useEffect(() => {
        const checkAuth = () => {
            const authenticated = isAuthenticated();
            if (!authenticated) {
                window.location.href = '/login';
                return;
            }
            if ((user?.roles[0] !== 'Admin' && user?.roles[1] !== 'Admin')) {
                setIsAdmin(true);
            }
        };
        checkAuth();
        fetchUpdates();
    }, []);

    useEffect(() => {
        const storedUser = localStorage.getItem('adminUser');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, []);

    const fetchUpdates = async () => {
        try {
            const res = await axios.get('https://api.github.com/repos/lfgraphics/bowser/releases');
            const releases = res.data;

            // Group by tag_name and pick latest created_at per tag
            const latestByTag: Record<string, any> = {};

            releases.forEach((release: any) => {
                const tag = release.tag_name;
                const current = latestByTag[tag];

                if (!current || new Date(release.created_at) > new Date(current.created_at)) {
                    latestByTag[tag] = release;
                }
            });

            // Map to your UpdateEntry format
            const updates: UpdateEntry[] = Object.entries(latestByTag).map(([tag, release]: [string, any]) => {
                const asset = release.assets?.[0];
                const fileSizeMB = asset ? (asset.size / (1024 * 1024)).toFixed(2) : 'Unknown';
                const versionMatch = asset?.name?.match(/V[-.]?(\\d+)/i);
                const buildVersion = versionMatch ? Number(versionMatch[1]) : 0;

                return {
                    _id: release.id.toString(),
                    appName: asset.name,
                    image: tag === 'apk' ? '/android.png' : '/windows.png',
                    buildVersion,
                    releaseNotes: release.body,
                    url: asset?.browser_download_url || '',
                    fileSizeMB,
                    pushDate: asset?.created_at || release.created_at,
                };
            });

            console.log(updates)

            setUpdates(updates);
        } catch (err) {
            console.error('Failed to fetch GitHub releases:', err);
        }
    };

    // const fetchAllUpdates = async () => {
    //     try {
    //         const res = await axios.get<UpdateEntry[]>(`${BASE_URL}/updates`);
    //         setUpdates(res.data);
    //     } catch (err) {
    //         console.error('Failed to fetch all updates:', err);
    //     }
    // };

    // const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    //     e.preventDefault();
    //     setLoading(true);
    //     try {
    //         await axios.post(`${BASE_URL}/updates`, formData);
    //         setFormData({ appName: '', buildVersion: '', releaseNotes: '', url: '' });
    //         await fetchUpdates();
    //         await fetchAllUpdates();
    //     } catch (err) {
    //         console.error('Failed to submit update:', err);
    //     } finally {
    //         setLoading(false);
    //     }
    // };

    // const handleDelete = async (id: string) => {
    //     if (!confirm('Are you sure you want to delete this update?')) return;
    //     try {
    //         await axios.delete(`${BASE_URL}/updates/${id}`);
    //         await fetchAllUpdates();
    //     } catch (err) {
    //         console.error('Failed to delete update:', err);
    //     }
    // };

    // const convertToDirectDownload = (url: string): string => {
    //     const fileIdMatch = url.match(/\/d\/(.*?)(\/|$)/);
    //     if (!fileIdMatch) return url;
    //     return `https://drive.google.com/uc?export=download&id=${fileIdMatch[1]}`;
    // };

    return (
        <div className="p-4 container mx-auto">
            <h1 className="text-2xl font-bold mb-4">App Updates</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {updates.map(update => (
                    <Card key={update._id}>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>{update.appName}</CardTitle>
                            <Image src={update.image} alt='app icon' width={50} height={50} />
                        </CardHeader>
                        <CardContent>
                            <p><strong>Release Notes:</strong> {update.releaseNotes || 'N/A'}</p>
                            <p><strong>Size:</strong> {update.fileSizeMB || 'Unknown'} MB</p>
                            <p><strong>Released On:</strong> {formatDate(update.pushDate)}</p>
                        </CardContent>
                        <CardFooter>
                            <Link
                                href={update.url}
                                download
                                className="w-full inline-flex items-center text-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
                            >
                                <Download size={18} className='mr-3' />
                                Download
                            </Link>
                            {/* {isAdmin && <button onClick={() => handleDelete(update._id)} className="ml-4 text-red-600">Delete</button>} */}
                        </CardFooter>
                    </Card>
                ))}
            </div>
            {/* 
            {isAdmin && (
                <form onSubmit={handleSubmit} className="mt-6 border-t pt-4">
                    <h2 className="text-xl font-bold mb-2">Push New Update</h2>

                    <div className="mb-2">
                        <Input type="text" placeholder="App Name" className="w-full p-2 border" value={formData.appName} onChange={(e) => setFormData({ ...formData, appName: e.target.value })} required />
                    </div>

                    <div className="mb-2">
                        <Input type="number" placeholder="Build Version" className="w-full p-2 border" value={formData.buildVersion} onChange={(e) => setFormData({ ...formData, buildVersion: e.target.value })} required />
                    </div>

                    <div className="mb-2">
                        <Input placeholder="Release Notes" className="w-full p-2 border" value={formData.releaseNotes} onChange={(e) => setFormData({ ...formData, releaseNotes: e.target.value })} />
                    </div>

                    <div className="mb-2">
                        <Input type="url" placeholder="Google Drive Share URL" className="w-full p-2 border" value={formData.url} onChange={(e) => setFormData({ ...formData, url: e.target.value })} required />
                    </div>

                    <Button variant="default" type="submit" disabled={loading}>
                        {loading ? 'Uploading...' : 'Submit'}
                    </Button>
                </form>
            )}
            */}
        </div>
    );
};

export default UpdateManager;
