'use client';

import { useCallback, useState, useRef } from 'react';
import { parseCSV } from '@/lib/csv-parser';
import type { CSVParseResult } from '@/types';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

interface FileUploaderProps {
    onParsed: (result: CSVParseResult) => void;
    disabled?: boolean;
}

export default function FileUploader({ onParsed, disabled }: FileUploaderProps) {
    const [dragActive, setDragActive] = useState(false);
    const [fileName, setFileName] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [parsing, setParsing] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const processFile = useCallback(
        async (file: File) => {
            setError(null);
            setFileName(null);

            // Validate file type
            if (!file.name.toLowerCase().endsWith('.csv')) {
                setError('Invalid file type. Please upload a .csv file.');
                return;
            }

            // Validate file size
            if (file.size > MAX_FILE_SIZE) {
                setError(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 5MB.`);
                return;
            }

            setFileName(file.name);
            setParsing(true);

            try {
                const result = await parseCSV(file);
                onParsed(result);
            } catch (err) {
                setError(`Failed to parse CSV: ${err instanceof Error ? err.message : 'Unknown error'}`);
            } finally {
                setParsing(false);
            }
        },
        [onParsed]
    );

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setDragActive(false);

            if (disabled) return;

            const file = e.dataTransfer.files[0];
            if (file) processFile(file);
        },
        [processFile, disabled]
    );

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
    }, []);

    const handleChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) processFile(file);
        },
        [processFile]
    );

    return (
        <div className="w-full max-w-2xl mx-auto">
            <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => !disabled && inputRef.current?.click()}
                className={`
          relative cursor-pointer rounded-2xl border-2 border-dashed p-12
          transition-all duration-300 ease-out
          ${dragActive
                        ? 'border-indigo-400 bg-indigo-50 scale-[1.02]'
                        : 'border-stone-300 bg-stone-50/50 hover:border-indigo-300 hover:bg-indigo-50/30'
                    }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleChange}
                    className="hidden"
                    disabled={disabled}
                />

                <div className="flex flex-col items-center gap-4 text-center">
                    {/* Upload Icon */}
                    <div className={`
            w-16 h-16 rounded-2xl flex items-center justify-center
            transition-all duration-300
            ${dragActive ? 'bg-indigo-100 text-indigo-600' : 'bg-stone-100 text-stone-400'}
          `}>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-8 h-8"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={1.5}
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
                            />
                        </svg>
                    </div>

                    {parsing ? (
                        <div className="flex items-center gap-3">
                            <div className="w-5 h-5 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
                            <span className="text-stone-400">Parsing {fileName}...</span>
                        </div>
                    ) : (
                        <>
                            <div>
                                <p className="text-stone-700 font-medium text-lg">
                                    {dragActive ? 'Drop your CSV here' : 'Drag & drop your CSV file'}
                                </p>
                                <p className="text-stone-400 text-sm mt-1">
                                    or click to browse • .csv only • 5MB max • 500 rows max
                                </p>
                            </div>
                            {fileName && !error && (
                                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-50 border border-indigo-200">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                    </svg>
                                    <span className="text-indigo-700 text-sm">{fileName}</span>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {error && (
                <div className="mt-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200">
                    <p className="text-red-600 text-sm flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                        </svg>
                        {error}
                    </p>
                </div>
            )}
        </div>
    );
}
