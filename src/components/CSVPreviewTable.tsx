'use client';

import type { CSVParseResult, CellIssue } from '@/types';

interface CSVPreviewTableProps {
    result: CSVParseResult;
}

const MAX_PREVIEW_ROWS = 20;

export default function CSVPreviewTable({ result }: CSVPreviewTableProps) {
    const { rawHeaders, rawRows, cellIssues, errors, warnings } = result;

    if (rawHeaders.length === 0) return null;

    const previewRows = rawRows.slice(0, MAX_PREVIEW_ROWS);
    const hiddenCount = rawRows.length - previewRows.length;

    // Build a quick lookup: "row:column" → CellIssue
    const issueMap = new Map<string, CellIssue>();
    for (const issue of cellIssues) {
        issueMap.set(`${issue.row}:${issue.column}`, issue);
    }

    // Check which headers are recognized
    const HEADER_MAP_KEYS = new Set([
        'test case id', 'testcaseid', 'test_case_id', 'tc id', 'tcid', 'id', 'test id',
        'description', 'desc', 'test description', 'test_description', 'scenario', 'test scenario', 'steps', 'test steps',
        'expected result', 'expectedresult', 'expected_result', 'expected', 'expected outcome', 'expected behavior',
        'priority', 'prio', 'severity',
        'module', 'module name', 'feature', 'component', 'area',
    ]);
    const isRecognized = (header: string) => HEADER_MAP_KEYS.has(header.toLowerCase().trim());

    const totalErrors = errors.length + cellIssues.filter((i) => i.type === 'error').length;
    const totalWarnings = warnings.length + cellIssues.filter((i) => i.type === 'warning').length;

    return (
        <div className="space-y-3">
            {/* Summary Bar */}
            <div className="flex items-center gap-3 text-sm">
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
            </div>

            {/* Global errors (missing columns etc.) */}
            {errors.length > 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                    {errors.map((err, i) => (
                        <p key={i} className="text-red-600 text-sm flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                            </svg>
                            {err}
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
                            {rawHeaders.map((header) => {
                                const recognized = isRecognized(header);
                                return (
                                    <th
                                        key={header}
                                        className={`text-left px-3 py-2.5 font-medium text-[10px] uppercase tracking-wider whitespace-nowrap ${recognized
                                                ? 'text-stone-500'
                                                : 'text-amber-600 bg-amber-50/50'
                                            }`}
                                    >
                                        <span className="flex items-center gap-1">
                                            {header}
                                            {!recognized && (
                                                <span title="Unrecognized column — will be ignored" className="text-amber-400 cursor-help">
                                                    ⚠
                                                </span>
                                            )}
                                        </span>
                                    </th>
                                );
                            })}
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
                                                <p className={`text-[10px] mt-0.5 ${issue.type === 'error' ? 'text-red-500' : 'text-amber-500'
                                                    }`}>
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
