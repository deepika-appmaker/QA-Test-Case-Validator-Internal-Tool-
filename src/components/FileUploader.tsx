'use client';

import { useCallback, useState, useRef } from 'react';
import { parseCSV } from '@/lib/csv-parser';
import { parseXLSX } from '@/lib/xlsx-parser';
import type { CSVParseResult, XLSXParseResult } from '@/types';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB (xlsx can be larger)

interface FileUploaderProps {
    onParsed: (result: CSVParseResult, fileName: string) => void;
    onXLSXParsed?: (result: XLSXParseResult) => void;
    disabled?: boolean;
    compact?: boolean;
}

export default function FileUploader({ onParsed, onXLSXParsed, disabled, compact = false }: FileUploaderProps) {
    const [dragActive, setDragActive] = useState(false);
    const [fileName, setFileName] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [parsing, setParsing] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const processFile = useCallback(
        async (file: File) => {
            setError(null);
            setFileName(null);

            const isCSV = file.name.toLowerCase().endsWith('.csv');
            const isXLSX = file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls');

            if (!isCSV && !isXLSX) {
                setError('Invalid file type. Please upload a .csv or .xlsx file.');
                return;
            }

            if (file.size > MAX_FILE_SIZE) {
                setError(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 10MB.`);
                return;
            }

            setFileName(file.name);
            setParsing(true);

            try {
                if (isXLSX) {
                    if (!onXLSXParsed) {
                        setError('XLSX upload is not supported on this page.');
                        return;
                    }
                    const result = await parseXLSX(file);
                    onXLSXParsed(result);
                } else {
                    const result = await parseCSV(file);
                    onParsed(result, file.name);
                }
            } catch (err) {
                setError(`Failed to parse file: ${err instanceof Error ? err.message : 'Unknown error'}`);
            } finally {
                setParsing(false);
            }
        },
        [onParsed, onXLSXParsed]
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
          relative cursor-pointer rounded-2xl border-2 border-dashed
          transition-all duration-300 ease-out
          ${dragActive
                        ? 'border-indigo-400 bg-indigo-50 scale-[1.02]'
                        : 'border-stone-300 bg-stone-50/50 hover:border-indigo-300 hover:bg-indigo-50/30'
                    }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${compact ? 'p-6 flex items-center gap-6' : 'p-12'}
        `}
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleChange}
                    className="hidden"
                    disabled={disabled}
                />

                <div className={`flex flex-col items-center gap-4 text-center ${compact ? 'flex-row text-left gap-6' : ''}`}>
                    {/* Upload Icon */}
                    <div className={`
            rounded-2xl flex items-center justify-center
            transition-all duration-300
            ${dragActive ? 'bg-indigo-100 text-indigo-600' : 'bg-stone-100 text-stone-400'}
            ${compact ? 'w-12 h-12 shrink-0' : 'w-16 h-16'}
          `}>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className={compact ? 'w-6 h-6' : 'w-8 h-8'}
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

                    <div className="flex-1">
                        {parsing ? (
                            <div className="flex items-center gap-3">
                                <div className="w-5 h-5 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
                                <span className="text-stone-400">Parsing {fileName}...</span>
                            </div>
                        ) : (
                            <>
                                <div>
                                    <p className={`text-stone-700 font-medium ${compact ? 'text-base' : 'text-lg'}`}>
                                        {dragActive
                                            ? 'Drop your file here'
                                            : compact
                                                ? 'Upload a different file'
                                                : 'Drag & drop your file'}
                                    </p>
                                    <p className="text-stone-400 text-sm mt-1">
                                        {compact
                                            ? '.csv or .xlsx • 10MB max'
                                            : 'or click to browse • .csv or .xlsx • 10MB max • 500 rows per sheet'}
                                    </p>
                                    {!compact && (
                                        <div className="flex items-center justify-center gap-3 mt-3">
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-xs font-medium text-emerald-700">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                                </svg>
                                                CSV — Single module
                                            </span>
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-xs font-medium text-indigo-700">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
                                                </svg>
                                                XLSX — Multi-sheet modules
                                            </span>
                                        </div>
                                    )}
                                </div>
                                {fileName && !error && (
                                    <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                        </svg>
                                        <span className="text-indigo-700 text-sm truncate max-w-[200px]">{fileName}</span>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
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
