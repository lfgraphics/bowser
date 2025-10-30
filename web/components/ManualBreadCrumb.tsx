'use client'; // only needed in app router when using client-side hooks

import { ChevronRight } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';

const ManualBreadcrumb = () => {
    const router = useRouter();
    const pathname = usePathname(); // e.g., /products/electronics/laptops

    const segments = pathname.split('/').filter(Boolean); // removes empty strings

    const handleClick = (index: number) => {
        const newPath = '/' + segments.slice(0, index + 1).join('/');
        router.push(newPath);
    };

    return (
        <nav className='ml-14 flex flex-row gap-1'>
            {/* <span onClick={() => router.push('/')} style={{ cursor: 'pointer' }}>
                Home
            </span> */}
            {segments.map((segment, index) => (
                <span key={index} className='flex flex-row gap-3'>
                    <span
                        onClick={() => handleClick(index)}
                        style={{
                            cursor: 'pointer',
                            textTransform: 'capitalize',
                        }}
                    >
                        {segment.replace(/-/g, ' ')}
                    </span>
                    {index < (segments.length -1) && <ChevronRight />}
                </span>
            ))}
        </nav>
    );
};

export default ManualBreadcrumb;
