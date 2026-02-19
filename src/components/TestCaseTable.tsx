'use client';

import { useState, useCallback, useMemo } from 'react';
import type { TestCase, AIStatus } from '@/types';
import StatusBadge from './StatusBadge';
import ScoreBadge from './ScoreBadge';

type SortDirection = 'asc' | 'desc' | null;
type FilterType = 'all' | 'PASS' | 'NEEDS_REWRITE' | 'ERROR' | 'FLAGGED' | 'PENDING';

interface TestCaseTableProps {
    testCases: TestCase[];
    onUpdateTestCase: (index: number, updates: Partial<TestCase>) => void;
    // onReAnalyze removed
    analyzing: boolean;
}

export default function TestCaseTable({
    testCases,
    onUpdateTestCase,
    // onReAnalyze removed
    analyzing,
}: TestCaseTableProps) {
    const [expandedRow, setExpandedRow] = useState<number | null>(null);
    const [scoreSort, setScoreSort] = useState<SortDirection>(null);
    const [issueFilter, setIssueFilter] = useState<FilterType>('all');

    const handleCellEdit = useCallback(
        (index: number, field: keyof TestCase, value: string) => {
            onUpdateTestCase(index, { [field]: value });
        },
        [onUpdateTestCase]
    );

    // Apply filter + sort, keeping track of original indices
    const displayData = useMemo(() => {
        let items = testCases.map((tc, originalIndex) => ({ tc, originalIndex }));

        // Filter
        if (issueFilter !== 'all') {
            if (issueFilter === 'FLAGGED') {
                items = items.filter(({ tc }) => tc.localFlags && tc.localFlags.length > 0);
            } else {
                items = items.filter(({ tc }) => (tc.aiStatus || 'PENDING') === issueFilter);
            }
        }

        // Sort by score
        if (scoreSort) {
            items.sort((a, b) => {
                const sa = a.tc.score ?? -1;
                const sb = b.tc.score ?? -1;
                return scoreSort === 'asc' ? sa - sb : sb - sa;
            });
        }

        return items;
    }, [testCases, issueFilter, scoreSort]);

    const handleExportCSV = () => {
        const headers = ['Test ID', 'Description', 'Expected Result', 'Priority', 'Module', 'AI Status', 'Score', 'Comment', 'Local Flags', 'Rewritten Description', 'Rewritten Expected', 'Improvement Reason'];
        const rows = testCases.map((tc) => [
            tc.testId,
            `"${(tc.description || '').replace(/"/g, '""')}"`,
            `"${(tc.expectedResult || '').replace(/"/g, '""')}"`,
            tc.priority || '',
            tc.module || '',
            tc.aiStatus || 'PENDING',
            tc.score?.toString() || '',
            `"${(tc.comment || '').replace(/"/g, '""')}"`,
            `"${(tc.localFlags || []).join('; ')}"`,
            `"${(tc.rewrittenDescription || '').replace(/"/g, '""')}"`,
            `"${(tc.rewrittenExpected || '').replace(/"/g, '""')}"`,
            `"${(tc.improvementReason || '').replace(/"/g, '""')}"`,
        ].join(','));

        const csv = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `qa-review-results-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (testCases.length === 0) {
        return (
            <div className="text-center py-16 text-gray-500">
                <p className="text-lg">No test cases loaded</p>
                <p className="text-sm mt-1">Upload a CSV file to get started</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* Toolbar: Filter + Export */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                    <label className="text-xs text-stone-500 font-medium">Filter:</label>
                    <select
                        value={issueFilter}
                        onChange={(e) => setIssueFilter(e.target.value as FilterType)}
                        className="text-xs rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-stone-600 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                    >
                        <option value="all">All ({testCases.length})</option>
                        <option value="PASS">✓ Passed ({testCases.filter((tc) => tc.aiStatus === 'PASS').length})</option>
                        <option value="NEEDS_REWRITE">✎ Needs Rewrite ({testCases.filter((tc) => tc.aiStatus === 'NEEDS_REWRITE').length})</option>
                        <option value="ERROR">✕ Error ({testCases.filter((tc) => tc.aiStatus === 'ERROR').length})</option>
                        <option value="PENDING">◌ Pending ({testCases.filter((tc) => !tc.aiStatus || tc.aiStatus === 'PENDING').length})</option>
                        <option value="FLAGGED">⚠ Flagged ({testCases.filter((tc) => tc.localFlags && tc.localFlags.length > 0).length})</option>
                    </select>
                    {issueFilter !== 'all' && (
                        <span className="text-xs text-stone-400">
                            Showing {displayData.length} of {testCases.length}
                        </span>
                    )}
                </div>

                <button
                    onClick={handleExportCSV}
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-700 px-3 py-1.5 rounded-lg border border-indigo-200 hover:bg-indigo-50 transition-all flex items-center gap-1.5"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    Export CSV
                </button>
            </div>

            {/* Table */}
            <div className="w-full overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-stone-200 bg-stone-50">
                            <th className="text-left px-4 py-3 text-stone-500 font-medium text-xs uppercase tracking-wider whitespace-nowrap">
                                ID
                            </th>
                            <th className="text-left px-4 py-3 text-stone-500 font-medium text-xs uppercase tracking-wider min-w-[250px]">
                                Description
                            </th>
                            <th className="text-left px-4 py-3 text-stone-500 font-medium text-xs uppercase tracking-wider min-w-[200px]">
                                Expected Result
                            </th>
                            <th className="text-left px-4 py-3 text-stone-500 font-medium text-xs uppercase tracking-wider whitespace-nowrap">
                                Priority
                            </th>
                            <th className="text-left px-4 py-3 text-stone-500 font-medium text-xs uppercase tracking-wider whitespace-nowrap">
                                Module
                            </th>
                            <th className="text-center px-4 py-3 text-stone-500 font-medium text-xs uppercase tracking-wider whitespace-nowrap">
                                Status
                            </th>
                            {/* Score (Sortable) */}
                            <th
                                className="text-center px-4 py-3 text-stone-500 font-medium text-xs uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-indigo-600 transition-colors select-none"
                                onClick={() => {
                                    setScoreSort(scoreSort === null ? 'desc' : scoreSort === 'desc' ? 'asc' : null);
                                }}
                            >
                                <span className="inline-flex items-center gap-1">
                                    Score
                                    {scoreSort === 'desc' && <span className="text-indigo-500">↓</span>}
                                    {scoreSort === 'asc' && <span className="text-indigo-500">↑</span>}
                                    {scoreSort === null && <span className="text-stone-300">↕</span>}
                                </span>
                            </th>
                            <th className="text-left px-4 py-3 text-stone-500 font-medium text-xs uppercase tracking-wider min-w-[200px]">
                                Comment
                            </th>
                            <th className="text-center px-4 py-3 text-stone-500 font-medium text-xs uppercase tracking-wider whitespace-nowrap">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {displayData.map(({ tc, originalIndex }) => (
                            <TableRow
                                key={`${tc.testId}-${originalIndex}`}
                                testCase={tc}
                                index={originalIndex}
                                onEdit={handleCellEdit}
                                analyzing={analyzing}
                                isExpanded={expandedRow === originalIndex}
                                onToggleExpand={() =>
                                    setExpandedRow(expandedRow === originalIndex ? null : originalIndex)
                                }
                            />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ─── Individual Table Row ─────────────────────────────────────────

interface TableRowProps {
    testCase: TestCase;
    index: number;
    onEdit: (index: number, field: keyof TestCase, value: string) => void;
    // onReAnalyze removed
    analyzing: boolean;
    isExpanded: boolean;
    onToggleExpand: () => void;
}

function TableRow({
    testCase,
    index,
    onEdit,
    // onReAnalyze removed
    analyzing,
    isExpanded,
    onToggleExpand,
}: TableRowProps) {
    const hasFlags = testCase.localFlags && testCase.localFlags.length > 0;
    const hasAIDetails = testCase.comment || testCase.rewrittenDescription || hasFlags;
    const isRowAnalyzing = testCase.aiStatus === 'ANALYZING';

    return (
        <>
            <tr
                className={`
           border-b border-stone-100 
           transition-colors duration-200
           ${hasFlags ? 'bg-amber-50/50' : 'hover:bg-stone-50'}
          ${isRowAnalyzing ? 'animate-pulse' : ''}
        `}
            >
                {/* Test ID */}
                <td className="px-4 py-3">
                    <span className="font-mono text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                        {testCase.testId}
                    </span>
                </td>

                {/* Description (Editable) */}
                <td className="px-4 py-3">
                    <EditableCell
                        value={testCase.description}
                        onSave={(val) => onEdit(index, 'description', val)}
                        placeholder="Enter description..."
                    />
                </td>

                {/* Expected Result (Editable) */}
                <td className="px-4 py-3">
                    <EditableCell
                        value={testCase.expectedResult}
                        onSave={(val) => onEdit(index, 'expectedResult', val)}
                        placeholder="Enter expected result..."
                    />
                </td>

                {/* Priority (Editable) */}
                <td className="px-4 py-3">
                    <EditableCell
                        value={testCase.priority}
                        onSave={(val) => onEdit(index, 'priority', val)}
                        placeholder="—"
                    />
                </td>

                {/* Module */}
                <td className="px-4 py-3 text-stone-500 text-xs">
                    {testCase.module || '—'}
                </td>

                {/* AI Status */}
                <td className="px-4 py-3 text-center">
                    <StatusBadge status={(testCase.aiStatus || 'PENDING') as AIStatus} />
                </td>

                {/* Score */}
                <td className="px-4 py-3 text-center">
                    <ScoreBadge score={testCase.score} />
                </td>

                {/* Comment (truncated, click to expand) */}
                <td className="px-4 py-3">
                    <div
                        className="text-stone-500 text-xs leading-relaxed cursor-pointer hover:text-stone-700 transition-colors"
                        onClick={hasAIDetails ? onToggleExpand : undefined}
                        title={hasAIDetails ? 'Click to expand full details' : undefined}
                    >
                        {testCase.comment
                            ? testCase.comment.length > 80
                                ? testCase.comment.substring(0, 80) + '...'
                                : testCase.comment
                            : '—'}
                    </div>
                </td>

                {/* Actions */}
                <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                        {/* Expand Details */}
                        {hasAIDetails && (
                            <button
                                onClick={onToggleExpand}
                                className={`p-1.5 rounded-lg transition-colors ${isExpanded
                                    ? 'text-indigo-600 bg-indigo-50'
                                    : hasFlags
                                        ? 'text-amber-600 hover:bg-amber-50'
                                        : 'text-stone-400 hover:bg-stone-100'
                                    }`}
                                title={isExpanded ? 'Collapse details' : 'Expand details'}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                                </svg>
                            </button>
                        )}

                        {/* Re-Analyze removed per requirement */}
                    </div>
                </td>
            </tr>

            {/* Expanded Details Row */}
            {isExpanded && (
                <tr className="border-b border-stone-100 bg-stone-50/50">
                    <td colSpan={9} className="px-6 py-4">
                        <div className="space-y-3">
                            {/* Full AI Comment */}
                            {testCase.comment && (
                                <div className="p-3 rounded-lg bg-white border border-stone-200">
                                    <p className="text-xs text-stone-500 font-medium mb-1">AI Review Comment</p>
                                    <p className="text-xs text-stone-700 leading-relaxed whitespace-pre-wrap">{testCase.comment}</p>
                                    {/* Confidence hidden */}
                                </div>
                            )}

                            {/* Validation Flags */}
                            {hasFlags && (
                                <div className="flex flex-wrap gap-2">
                                    {testCase.localFlags!.map((flag, i) => (
                                        <span
                                            key={i}
                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-amber-50 text-amber-700 border border-amber-200"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                                            </svg>
                                            {flag}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* AI Suggested Rewrite */}
                            {testCase.rewrittenDescription && (
                                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                                    <p className="text-xs text-emerald-700 font-medium mb-1">AI Suggested Rewrite</p>
                                    <p className="text-xs text-gray-700"><strong>Description:</strong> {testCase.rewrittenDescription}</p>
                                    {testCase.rewrittenExpected && (
                                        <p className="text-xs text-gray-700 mt-1"><strong>Expected:</strong> {testCase.rewrittenExpected}</p>
                                    )}
                                    {testCase.improvementReason && (
                                        <p className="text-xs text-stone-500 mt-2 italic">Reason: {testCase.improvementReason}</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
}

// ─── Editable Cell ────────────────────────────────────────────────

interface EditableCellProps {
    value: string;
    onSave: (value: string) => void;
    placeholder?: string;
}

function EditableCell({ value, onSave, placeholder }: EditableCellProps) {
    const [editing, setEditing] = useState(false);
    const [editValue, setEditValue] = useState(value);

    const handleBlur = () => {
        setEditing(false);
        if (editValue !== value) {
            onSave(editValue);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            (e.target as HTMLElement).blur();
        }
        if (e.key === 'Escape') {
            setEditValue(value);
            setEditing(false);
        }
    };

    if (editing) {
        return (
            <textarea
                autoFocus
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                className="w-full bg-white text-stone-700 text-xs rounded-lg px-3 py-2 border border-stone-300 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 focus:outline-none resize-none min-h-[60px]"
                rows={2}
            />
        );
    }

    return (
        <div
            onClick={() => {
                setEditValue(value);
                setEditing(true);
            }}
            className="text-stone-600 text-xs cursor-text hover:bg-stone-50 rounded-lg px-2 py-1.5 transition-colors min-h-[32px] flex items-center"
            title="Click to edit"
        >
            {value || <span className="text-stone-400">{placeholder}</span>}
        </div>
    );
}
