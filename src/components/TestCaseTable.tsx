'use client';

import { useState, useCallback } from 'react';
import type { TestCase, AIStatus } from '@/types';
import StatusBadge from './StatusBadge';
import ScoreBadge from './ScoreBadge';

interface TestCaseTableProps {
    testCases: TestCase[];
    onUpdateTestCase: (index: number, updates: Partial<TestCase>) => void;
    onReAnalyze: (index: number) => void;
    analyzing: boolean;
}

export default function TestCaseTable({
    testCases,
    onUpdateTestCase,
    onReAnalyze,
    analyzing,
}: TestCaseTableProps) {
    const [expandedRow, setExpandedRow] = useState<number | null>(null);

    const handleCellEdit = useCallback(
        (index: number, field: keyof TestCase, value: string) => {
            onUpdateTestCase(index, { [field]: value });
        },
        [onUpdateTestCase]
    );

    if (testCases.length === 0) {
        return (
            <div className="text-center py-16 text-gray-500">
                <p className="text-lg">No test cases loaded</p>
                <p className="text-sm mt-1">Upload a CSV file to get started</p>
            </div>
        );
    }

    return (
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
                        <th className="text-center px-4 py-3 text-stone-500 font-medium text-xs uppercase tracking-wider whitespace-nowrap">
                            Score
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
                    {testCases.map((tc, index) => (
                        <TableRow
                            key={tc.testId || index}
                            testCase={tc}
                            index={index}
                            onEdit={handleCellEdit}
                            onReAnalyze={onReAnalyze}
                            analyzing={analyzing}
                            isExpanded={expandedRow === index}
                            onToggleExpand={() =>
                                setExpandedRow(expandedRow === index ? null : index)
                            }
                        />
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// ─── Individual Table Row ─────────────────────────────────────────

interface TableRowProps {
    testCase: TestCase;
    index: number;
    onEdit: (index: number, field: keyof TestCase, value: string) => void;
    onReAnalyze: (index: number) => void;
    analyzing: boolean;
    isExpanded: boolean;
    onToggleExpand: () => void;
}

function TableRow({
    testCase,
    index,
    onEdit,
    onReAnalyze,
    analyzing,
    isExpanded,
    onToggleExpand,
}: TableRowProps) {
    const hasFlags = testCase.localFlags && testCase.localFlags.length > 0;
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

                {/* Comment */}
                <td className="px-4 py-3">
                    <div className="text-stone-500 text-xs leading-relaxed">
                        {testCase.comment || '—'}
                    </div>
                </td>

                {/* Actions */}
                <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                        {/* Expand / Flags */}
                        {hasFlags && (
                            <button
                                onClick={onToggleExpand}
                                className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors"
                                title="View validation flags"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                                </svg>
                            </button>
                        )}

                        {/* Re-Analyze */}
                        <button
                            onClick={() => onReAnalyze(index)}
                            disabled={analyzing || isRowAnalyzing}
                            className={`
                p-1.5 rounded-lg transition-all duration-200
                ${analyzing || isRowAnalyzing
                                    ? 'text-gray-600 cursor-not-allowed'
                                    : 'text-stone-400 hover:bg-indigo-50 hover:text-indigo-600'
                                }
              `}
                            title="Re-analyze this row"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 ${isRowAnalyzing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
                            </svg>
                        </button>
                    </div>
                </td>
            </tr>

            {/* Expanded Flags Row */}
            {isExpanded && hasFlags && (
                <tr className="border-b border-stone-100 bg-amber-50/50">
                    <td colSpan={9} className="px-6 py-3">
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
                            {testCase.rewrittenDescription && (
                                <div className="w-full mt-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                                    <p className="text-xs text-emerald-700 font-medium mb-1">AI Suggested Rewrite:</p>
                                    <p className="text-xs text-gray-700"><strong>Description:</strong> {testCase.rewrittenDescription}</p>
                                    {testCase.rewrittenExpected && (
                                        <p className="text-xs text-gray-700 mt-1"><strong>Expected:</strong> {testCase.rewrittenExpected}</p>
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
