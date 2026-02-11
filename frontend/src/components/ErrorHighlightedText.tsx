'use client';

import { useState, useEffect, JSX } from 'react';
import axios from 'axios';
import { IVY_API_URL } from '@/lib/ivyApi';

interface GrammarError {
    offset: number;
    length: number;
    message: string;
    shortMessage: string;
    rule: {
        id: string;
        description: string;
    };
    type: 'SPELLING' | 'GRAMMAR';
}

interface ErrorHighlightProps {
    text: string;
    onErrorsFound?: (errors: GrammarError[]) => void;
}

export function ErrorHighlightedText({ text, onErrorsFound }: ErrorHighlightProps) {
    const [errors, setErrors] = useState<GrammarError[]>([]);
    const [loading, setLoading] = useState(false);
    const [hoveredError, setHoveredError] = useState<number | null>(null);

    useEffect(() => {
        checkText();
    }, [text]);

    const checkText = async () => {
        if (!text || text.trim().length === 0) {
            setErrors([]);
            onErrorsFound?.([]);
            return;
        }

        setLoading(true);
        try {
            const response = await axios.post(`${IVY_API_URL}/grammar-check/check`, {
                text,
                language: 'en-US',
            });

            if (response.data.success) {
                setErrors(response.data.data.errors || []);
                onErrorsFound?.(response.data.data.errors || []);
            }
        } catch (error) {
            console.error('Error checking grammar:', error);
            setErrors([]);
        } finally {
            setLoading(false);
        }
    };

    // Render text with error highlights
    const renderText = () => {
        if (errors.length === 0) {
            return <span className="text-gray-900">{text}</span>;
        }

        const segments: JSX.Element[] = [];
        let lastIndex = 0;

        // Sort errors by offset
        const sortedErrors = [...errors].sort((a, b) => a.offset - b.offset);

        sortedErrors.forEach((error, idx) => {
            // Add text before error
            if (lastIndex < error.offset) {
                segments.push(
                    <span key={`text-${idx}`} className="text-gray-900">
                        {text.substring(lastIndex, error.offset)}
                    </span>
                );
            }

            // Add error span
            const errorText = text.substring(error.offset, error.offset + error.length);
            const isSpelling = error.type === 'SPELLING';
            const underlineColor = isSpelling ? 'decoration-red-500' : 'decoration-blue-500';
            const bgColor = hoveredError === error.offset ? (isSpelling ? 'bg-red-100' : 'bg-blue-100') : 'bg-transparent';

            segments.push(
                <span
                    key={`error-${error.offset}`}
                    className={`relative underline ${underlineColor} ${bgColor} cursor-help transition-colors group`}
                    onMouseEnter={() => setHoveredError(error.offset)}
                    onMouseLeave={() => setHoveredError(null)}
                    title={error.message}
                >
                    {errorText}
                    {/* Tooltip */}
                    <span className="invisible group-hover:visible absolute bottom-full left-0 mb-2 w-64 bg-gray-900 text-white text-xs rounded-lg p-3 z-50 whitespace-normal">
                        <div className="font-bold mb-1">
                            {isSpelling ? '🔴 Spelling' : '🔵 Grammar'}
                        </div>
                        <div className="mb-1">{error.message}</div>
                        <div className="text-gray-300 text-xs">{error.rule.description}</div>
                    </span>
                </span>
            );

            lastIndex = error.offset + error.length;
        });

        // Add remaining text
        if (lastIndex < text.length) {
            segments.push(
                <span key="text-end" className="text-gray-900">
                    {text.substring(lastIndex)}
                </span>
            );
        }

        return <>{segments}</>;
    };

    return (
        <div className="w-full">
            {loading && (
                <div className="text-xs text-gray-400 mb-2">Checking for errors...</div>
            )}
            <div className="text-gray-900 whitespace-pre-wrap leading-relaxed break-words">
                {renderText()}
            </div>
            {errors.length > 0 && !loading && (
                <div className="mt-3 flex items-center gap-4 text-xs text-gray-600">
                    <span className="flex items-center gap-1">
                        <span className="inline-block w-2 h-2 rounded-full bg-red-500"></span>
                        Spelling: {errors.filter(e => e.type === 'SPELLING').length}
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="inline-block w-2 h-2 rounded-full bg-blue-500"></span>
                        Grammar: {errors.filter(e => e.type === 'GRAMMAR').length}
                    </span>
                </div>
            )}
        </div>
    );
}
