"use client"
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { formatDate } from '@/lib/utils';
import { User } from '@/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { Download, GlobeIcon } from 'lucide-react';
import { InstallPrompt } from '../page';

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

const UpdateManager: React.FC = () => {
    const [updates, setUpdates] = useState<UpdateEntry[]>([]);
    const [showAll, setShowAll] = useState(false);
    const [user, setUser] = useState<User>()
    const [isStandalone, setIsStandalone] = useState(false);
    useEffect(() => {
        setIsStandalone(window.matchMedia("(display-mode: standalone)").matches);
    }, []);
    useEffect(() => {
        // const checkAuth = () => {
        //     const authenticated = isAuthenticated();
        //     if (!authenticated) {
        //         window.location.href = '/login';
        //         return;
        //     }
        //     if ((user?.roles[0] !== 'Admin' && user?.roles[1] !== 'Admin')) {
        //         setIsAdmin(true);
        //     }
        // };
        // checkAuth();
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
            const releasesRes = await axios.get('/api/github-releases');
            const releases = releasesRes.data;

            // Filter only apk and exe releases
            const filtered = releases.filter((r: any) => ['apk', 'exe'].includes(r.tag_name));

            // Fetch assets directly from each release's assets_url
            const latestAssetsByTag: Record<string, any> = {};

            for (const release of filtered) {
                const tag = release.tag_name;

                if (!release.assets_url) continue;

                // Fetch the full assets list from the assets_url
                const assetsRes = await axios.get(release.assets_url);
                const assets = assetsRes.data;

                if (!assets.length) continue;

                // Find the most recently updated asset
                const latestAsset = assets.reduce((latest: any, current: any) =>
                    new Date(current.updated_at) > new Date(latest.updated_at) ? current : latest,
                    assets[0]);

                latestAssetsByTag[tag] = {
                    release,
                    asset: latestAsset
                };
            }

            // Format for frontend
            const updates: UpdateEntry[] = Object.entries(latestAssetsByTag).map(([tag, { release, asset }]) => {
                const fileSizeMB = asset ? (asset.size / (1024 * 1024)).toFixed(2) : 'Unknown';

                return {
                    _id: release.id.toString(),
                    appName: asset?.name || '',
                    image: tag === 'apk' ? '/android.png' : '/windows.png',
                    buildVersion: 0,
                    releaseNotes: release.body || '',
                    url: asset?.browser_download_url || '',
                    fileSizeMB,
                    pushDate: asset?.updated_at || release.published_at,
                };
            });

            setUpdates(updates);
        } catch (err) {
            console.error('Error fetching updates:', err);
        }
    };

    return (
        <div className="p-4 container mx-auto">
            <h1 className="text-2xl font-bold mb-4">App Updates</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
                <div className="w-full text-center">
                    <Button
                        onClick={() => setShowAll(!showAll)}
                        variant="outline"
                    >
                        {showAll ? 'Show Less' : 'Show More'}
                    </Button>
                </div>
                {updates
                    .filter((update) => showAll ? true : update.image !== '/windows.png')
                    .map(update => (
                        <Card key={update._id} className="flex flex-col h-full">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle>{update.appName}</CardTitle>
                                <Image src={update.image} alt="app icon" width={50} height={50} />
                            </CardHeader>
                            <div className="flex flex-col flex-1">
                                <CardContent className="flex-1 flex flex-col justify-start gap-1">
                                    <p><strong>Release Notes:</strong> {update.releaseNotes || 'N/A'}</p>
                                    <p><strong>Size:</strong> {update.fileSizeMB || 'Unknown'} MB</p>
                                    <p><strong>Released On:</strong> {formatDate(update.pushDate)}</p>
                                </CardContent>

                                <CardFooter className="mt-auto">
                                    <Link
                                        href={update.url}
                                        download
                                        className="w-full inline-flex items-center text-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
                                    >
                                        <Download size={18} className="mr-3" />
                                        Download
                                    </Link>
                                </CardFooter>
                            </div>
                        </Card>
                    ))}
                {!isStandalone && showAll &&
                    <Card className="flex flex-col h-full">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Office Admins Web Portal</CardTitle>
                            <GlobeIcon size={40} color='green' />
                        </CardHeader>
                        <div className="flex flex-col flex-1">
                            <CardContent></CardContent>
                            <CardFooter className='block mt-auto'>
                                <InstallPrompt />
                            </CardFooter>
                        </div>
                    </Card>
                }
            </div>
        </div>
    );
};

export default UpdateManager;
