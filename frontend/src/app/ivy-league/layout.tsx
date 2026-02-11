'use client';

import { useEffect } from 'react';
import axios from 'axios';

// Set up axios interceptor to add auth tokens to all requests
function AxiosAuthSetup() {
    useEffect(() => {
        const interceptorId = axios.interceptors.request.use((config) => {
            if (typeof window !== 'undefined') {
                const token = localStorage.getItem('token');
                if (token && !config.headers.Authorization) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
            }
            return config;
        });

        return () => {
            axios.interceptors.request.eject(interceptorId);
        };
    }, []);

    return null;
}

export default function IvyLeagueLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <AxiosAuthSetup />
            {children}
        </>
    );
}
