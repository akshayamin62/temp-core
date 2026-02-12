'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function StudentSidebar() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    // Check if conversation is open (when a task is selected)
    const isConversationOpen = searchParams.get('conversationOpen') === 'true';
    const urlStudentId = searchParams.get('studentId');
    const readOnly = searchParams.get('readOnly') === 'true';

    // Build query string to forward to sub-pages
    const forwardQs = urlStudentId ? `studentId=${urlStudentId}&readOnly=true` : '';

    const buildHref = (base: string) => {
        if (!forwardQs) return base;
        return base.includes('?') ? `${base}&${forwardQs}` : `${base}?${forwardQs}`;
    };

    const navItems = [
        {
            name: 'Dashboard', href: buildHref(`/ivy-league/student`), icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
            )
        },
        {
            name: 'Documents', href: buildHref(`/ivy-league/student/documents`), icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
            )
        },
        {
            name: 'Academic Excellence', href: buildHref(`/ivy-league/student/pointer1`), icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                </svg>
            )
        },
        {
            name: 'Spike in one area', href: buildHref(`/ivy-league/student/activities?pointerNo=2`), icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
            )
        },
        {
            name: 'Leadership & Initiative', href: buildHref(`/ivy-league/student/activities?pointerNo=3`), icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
            )
        },
        {
            name: 'Global or Social Impact', href: buildHref(`/ivy-league/student/activities?pointerNo=4`), icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 002 2h.158a2.5 2.5 0 012.236 1.382l.842 1.684a1 1 0 00.894.553H20M13 4.108V5a3 3 0 003 3H20m-7-7a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            )
        },
        {
            name: 'Authentic & Reflective Storytelling', href: buildHref(`/ivy-league/student/pointer5`), icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
            )
        },
        {
            name: 'Engagement with Learning & Intellectual Curiosity', href: buildHref(`/ivy-league/student/pointer6`), icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
            )
        },
    ];

    const isActive = (href: string) => {
        const url = new URL(href, 'http://localhost');
        const hrefPointerNo = url.searchParams.get('pointerNo');
        const currentPointerNo = searchParams.get('pointerNo');
        if (hrefPointerNo || currentPointerNo) {
            return pathname === url.pathname && hrefPointerNo === currentPointerNo;
        }
        return pathname === url.pathname;
    };

    return (
        <aside className={`bg-white border-r border-gray-100 flex flex-col h-screen sticky top-0 shadow-sm z-20 transition-all duration-300 ${isConversationOpen ? 'w-20' : 'w-72'}`}>
            <div className={`p-8 border-b border-gray-50 ${isConversationOpen ? 'px-4' : ''}`}>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100 flex-shrink-0">
                        <span className="text-white font-black text-xl italic leading-none">I</span>
                    </div>
                    {!isConversationOpen && (
                    <div>
                        <h1 className="font-black text-gray-900 tracking-tighter text-xl uppercase leading-none">Ivy League</h1>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-1">{readOnly ? 'Read-Only View' : 'Student Portal'}</p>
                    </div>
                    )}
                </div>
            </div>

            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                {navItems.map((item) => {
                    const active = isActive(item.href);
                    
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            title={isConversationOpen ? item.name : undefined}
                            className={`flex items-center gap-4 rounded-2xl transition-all font-bold text-sm tracking-tight group relative ${
                                isConversationOpen ? 'px-3 py-3 justify-center' : 'px-5 py-4'
                            } ${active
                                ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 ring-4 ring-indigo-50 scale-[1.02]'
                                : 'text-gray-500 hover:bg-gray-50 hover:text-indigo-600'
                                }`}
                        >
                            <span className={`${active ? 'text-white' : 'text-gray-400 group-hover:text-indigo-600 transition-colors'}`}>
                                {item.icon}
                            </span>
                            {!isConversationOpen && <span className="uppercase tracking-wide">{item.name}</span>}
                        </Link>
                    );
                })}
            </nav>

            {!isConversationOpen && (
            <div className="p-6">
                <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Session</span>
                    </div>
                    <p className="text-xs font-bold text-gray-900 leading-relaxed uppercase tracking-tight">Johnny Doe</p>
                    <p className="text-[10px] font-medium text-gray-400 mt-1 uppercase tracking-wider">Candidate #239</p>
                </div>
            </div>
            )}
        </aside>
    );
}

export default function StudentLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex bg-[#FBFBFE] min-h-screen">
            <Suspense fallback={<div className="w-72 bg-white border-r animate-pulse"></div>}>
                <StudentSidebar />
            </Suspense>
            <main className="flex-1 min-h-screen overflow-x-hidden">
                {children}
            </main>
        </div>
    );
}
