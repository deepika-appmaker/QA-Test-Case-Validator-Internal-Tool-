'use client';

import { useState, useRef, useEffect } from 'react';
import type { CSVParseResult, CellIssue } from '@/types';

interface CSVPreviewTableProps {
    result: CSVParseResult;
    onRenameHeader?: (oldName: string, newName: string) => void;
}

const MAX_PREVIEW_ROWS = 20;

// All recognized header names grouped by target field
const HEADER_SUGGESTIONS: { label: string; value: string }[] = [
    { label: 'Test Case ID', value: 'Test Case ID' },
    { label: 'Description', value: 'Description' },
    { label: 'Test Description', value: 'Test Description' },
    { label: 'Expected Result', value: 'Expected Result' },
    { label: 'Priority', value: 'Priority' },
    { label: 'Module', value: 'Module' },
    { label: 'Feature', value: 'Feature' },
    { label: 'Component', value: 'Component' },
];

const HEADER_MAP_KEYS = new Set([
    'test case id', 'testcaseid', 'test_case_id', 'tc id', 'tcid', 'id', 'test id',
    'description', 'desc', 'test description', 'test_description', 'scenario', 'test scenario', 'steps', 'test steps',
    'test descriptions', 'test case/test description', 'test case/test descriptions',
    'expected result', 'expectedresult', 'expected_result', 'expected', 'expected outcome', 'expected behavior', 'expected results',
    'priority', 'prio', 'severity',
    'module', 'module name', 'feature', 'component', 'area',
]);

const isRecognized = (header: string) => HEADER_MAP_KEYS.has(header.toLowerCase().trim());

// ─── Editable Header Cell ─────────────────────────────────────────

function EditableHeader({
    header,
    onRename,
}: {
    header: string;
    onRename: (newName: string) => void;
}) {
    const [editing, setEditing] = useState(false);
    const [value, setValue] = useState(header);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const recognized = isRecognized(header);

    useEffect(() => {
        setValue(header);
    }, [header]);

    const commit = () => {
        const trimmed = value.trim();
        if (trimmed && trimmed !== header) {
            onRename(trimmed);
        } else {
            setValue(header); // reset on empty/unchanged
        }
        setEditing(false);
        setShowSuggestions(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') commit();
        if (e.key === 'Escape') {
            setValue(header);
            setEditing(false);
            setShowSuggestions(false);
        }
    };

    const handleSuggestionClick = (suggestion: string) => {
        setValue(suggestion);
        onRename(suggestion);
        setEditing(false);
        setShowSuggestions(false);
    };

    if (editing) {
        const filteredSuggestions = HEADER_SUGGESTIONS.filter(s =>
            s.value.toLowerCase().includes(value.toLowerCase()) && s.value !== value
        );

        return (
            <div className="relative min-w-[140px]">
                <input
                    ref={inputRef}
                    autoFocus
                    value={value}
                    onChange={e => { setValue(e.target.value); setShowSuggestions(true); }}
                    onBlur={() => setTimeout(commit, 150)}
                    onKeyDown={handleKeyDown}
                    className="w-full px-2 py-1 text-xs font-semibold rounded-md border border-indigo-400 bg-white outline-none ring-2 ring-indigo-200 text-stone-800 min-w-[120px]"
                    placeholder="column name..."
                />
                {showSuggestions && filteredSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-stone-200 rounded-lg shadow-xl overflow-hidden min-w-[160px]">
                        <p className="px-3 py-1.5 text-[10px] text-stone-400 uppercase tracking-wide border-b border-stone-100">
                            Recognized fields
                        </p>
                        {filteredSuggestions.map(s => (
                            <button
                                key={s.value}
                                onMouseDown={() => handleSuggestionClick(s.value)}
                                className="w-full text-left px-3 py-2 text-xs text-stone-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    return (
        <button
            onClick={() => { setEditing(true); setShowSuggestions(true); }}
            title="Click to rename column"
            className={`group flex items-center gap-1.5 text-left rounded px-1 -mx-1 py-0.5 transition-all hover:bg-indigo-50 hover:ring-1 hover:ring-indigo-200 ${recognized ? 'text-stone-600' : 'text-amber-600'
                }`}
        >
            <span className="uppercase tracking-wider text-[10px] font-medium">{header}</span>
            {!recognized && (
                <span title="Unrecognized — click to rename" className="text-amber-400">⚠</span>
            )}
            {/* Edit pencil icon — visible on hover */}
            <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-3 h-3 opacity-0 group-hover:opacity-100 text-indigo-400 transition-opacity shrink-0"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
            </svg>
        </button>
    );
}

// ─── Main Table ───────────────────────────────────────────────────

export default function CSVPreviewTable({ result, onRenameHeader }: CSVPreviewTableProps) {
    const { rawHeaders, rawRows, cellIssues, errors, warnings } = result;

    if (rawHeaders.length === 0) return null;

    const previewRows = rawRows.slice(0, MAX_PREVIEW_ROWS);
    const hiddenCount = rawRows.length - previewRows.length;

    const issueMap = new Map<string, CellIssue>();
    for (const issue of cellIssues) {
        issueMap.set(`${issue.row}:${issue.column}`, issue);
    }

    const totalErrors = errors.length + cellIssues.filter((i) => i.type === 'error').length;
    const totalWarnings = warnings.length + cellIssues.filter((i) => i.type === 'warning').length;
    const unrecognizedCount = rawHeaders.filter(h => !isRecognized(h)).length;

    return (
        <div className="space-y-3">
            {/* Summary Bar */}
            <div className="flex items-center gap-3 text-sm flex-wrap">
                <span className="text-stone-500">
                    {rawRows.length} row{rawRows.length !== 1 ? 's' : ''} • {rawHeaders.length} column{rawHeaders.length !== 1 ? 's' : ''}
                </span>
                {totalErrors > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600 border border-red-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        {totalErrors} error{totalErrors !== 1 ? 's' : ''}
                    </span>
                )}
                {totalWarnings > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-600 border border-amber-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        {totalWarnings} warning{totalWarnings !== 1 ? 's' : ''}
                    </span>
                )}
                {totalErrors === 0 && totalWarnings === 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-600 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        All good
                    </span>
                )}
                {onRenameHeader && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-600 border border-indigo-200">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                        </svg>
                        Click any column header to rename
                    </span>
                )}
                {unrecognizedCount > 0 && !onRenameHeader && (
                    <span className="text-xs text-amber-500">{unrecognizedCount} unrecognized column{unrecognizedCount !== 1 ? 's' : ''}</span>
                )}
            </div>

            {/* Global errors */}
            {errors.length > 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                    {errors.map((err, i) => (
                        <p key={i} className="text-red-600 text-sm flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                            </svg>
                            {err}
                            {onRenameHeader && (
                                <span className="text-xs font-normal opacity-70 ml-1">— rename columns above to fix</span>
                            )}
                        </p>
                    ))}
                </div>
            )}

            {/* Table */}
            <div className="w-full overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="border-b border-stone-200 bg-stone-50">
                            <th className="px-3 py-2.5 text-stone-400 font-medium text-[10px] uppercase tracking-wider text-right w-10">
                                #
                            </th>
                            {rawHeaders.map((header) => (
                                <th
                                    key={header}
                                    className={`text-left px-3 py-2 ${!isRecognized(header) ? 'bg-amber-50/50' : ''}`}
                                >
                                    {onRenameHeader ? (
                                        <EditableHeader
                                            header={header}
                                            onRename={(newName) => onRenameHeader(header, newName)}
                                        />
                                    ) : (
                                        <span className={`flex items-center gap-1 text-[10px] uppercase tracking-wider font-medium ${isRecognized(header) ? 'text-stone-500' : 'text-amber-600'}`}>
                                            {header}
                                            {!isRecognized(header) && (
                                                <span title="Unrecognized column — will be ignored" className="text-amber-400 cursor-help">⚠</span>
                                            )}
                                        </span>
                                    )}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {previewRows.map((row, rowIdx) => (
                            <tr
                                key={rowIdx}
                                className="border-b border-stone-100 hover:bg-stone-50/50 transition-colors"
                            >
                                <td className="px-3 py-2 text-stone-300 text-right font-mono tabular-nums">
                                    {rowIdx + 1}
                                </td>
                                {rawHeaders.map((header) => {
                                    const issue = issueMap.get(`${rowIdx}:${header}`);
                                    const value = row[header] || '';

                                    let cellClass = 'text-stone-600';
                                    if (issue?.type === 'error') {
                                        cellClass = 'bg-red-50 border-l-2 border-l-red-400';
                                    } else if (issue?.type === 'warning') {
                                        cellClass = 'bg-amber-50/60 border-l-2 border-l-amber-300';
                                    }

                                    return (
                                        <td
                                            key={header}
                                            className={`px-3 py-2 max-w-[300px] ${cellClass}`}
                                        >
                                            <div className="truncate" title={value || undefined}>
                                                {value || (
                                                    <span className="text-stone-300 italic">empty</span>
                                                )}
                                            </div>
                                            {issue && (
                                                <p className={`text-[10px] mt-0.5 ${issue.type === 'error' ? 'text-red-500' : 'text-amber-500'}`}>
                                                    {issue.message}
                                                </p>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>

                {hiddenCount > 0 && (
                    <div className="px-4 py-2.5 text-center text-stone-400 text-xs border-t border-stone-100 bg-stone-50/50">
                        + {hiddenCount} more row{hiddenCount !== 1 ? 's' : ''} not shown
                    </div>
                )}
            </div>
        </div>
    );
}
