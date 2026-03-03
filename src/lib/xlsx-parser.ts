import * as XLSX from 'xlsx';
import type { TestCase, CSVParseResult, CellIssue, XLSXParseResult, SheetParseResult } from '@/types';

// ─── Header Normalization Map ─────────────────────────────────────
type CSVMappableField = 'testId' | 'description' | 'expectedResult' | 'priority' | 'module';

const HEADER_MAP: Record<string, CSVMappableField> = {
    'test case id': 'testId',
    'testcaseid': 'testId',
    'test_case_id': 'testId',
    'tc id': 'testId',
    'tcid': 'testId',
    'id': 'testId',
    'test id': 'testId',

    'description': 'description',
    'desc': 'description',
    'test description': 'description',
    'test_description': 'description',
    'scenario': 'description',
    'test scenario': 'description',
    'steps': 'description',
    'test steps': 'description',
    'test descriptions': 'description',
    'test case/test description': 'description',
    'test case/test descriptions': 'description',

    'expected result': 'expectedResult',
    'expectedresult': 'expectedResult',
    'expected_result': 'expectedResult',
    'expected': 'expectedResult',
    'expected outcome': 'expectedResult',
    'expected behavior': 'expectedResult',
    'expected results': 'expectedResult',

    'priority': 'priority',
    'prio': 'priority',
    'severity': 'priority',

    'module': 'module',
    'module name': 'module',
    'feature': 'module',
    'component': 'module',
    'area': 'module',
};

// Mandatory fields that must exist in every sheet
const MANDATORY_FIELDS: CSVMappableField[] = ['testId', 'description', 'expectedResult', 'priority'];

/**
 * Parse rows from a sheet (from XLSX.utils.sheet_to_json) into CSVParseResult format.
 * sheetName is used as the module fallback if no module column exists.
 */
function parseSheetRows(
    rawInput: Record<string, string>[],
    sheetName: string
): CSVParseResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const cellIssues: CellIssue[] = [];

    if (rawInput.length === 0) {
        return { rows: [], errors: ['Sheet is empty.'], warnings, rawHeaders: [], rawRows: [], cellIssues };
    }

    // Extract headers from first row keys
    const rawHeaders = Object.keys(rawInput[0]);
    const rawRows: Record<string, string>[] = rawInput.map((row) => {
        const clean: Record<string, string> = {};
        for (const h of rawHeaders) {
            clean[h] = String(row[h] ?? '').trim();
        }
        return clean;
    });

    // Normalize headers
    const headerMapping = new Map<string, CSVMappableField>();
    for (const raw of rawHeaders) {
        const normalized = raw.toLowerCase().trim();
        const mapped = HEADER_MAP[normalized];
        if (mapped) {
            headerMapping.set(raw, mapped);
        } else {
            warnings.push(`Unrecognized column "${raw}" — it will be ignored.`);
        }
    }

    // Check mandatory fields
    const mappedFields = new Set(headerMapping.values());
    for (const field of MANDATORY_FIELDS) {
        if (!mappedFields.has(field)) {
            errors.push(`Missing mandatory column: "${field}" in sheet "${sheetName}".`);
        }
    }

    if (errors.length > 0) {
        return { rows: [], errors, warnings, rawHeaders, rawRows, cellIssues };
    }

    const fieldToHeader = new Map<CSVMappableField, string>();
    for (const [raw, field] of headerMapping.entries()) {
        fieldToHeader.set(field, raw);
    }

    const hasModuleColumn = mappedFields.has('module');

    // Transform rows
    const rows: TestCase[] = rawRows.map((row, index) => {
        const tc: TestCase = {
            testId: '',
            description: '',
            expectedResult: '',
            priority: '',
            module: hasModuleColumn ? '' : sheetName, // fallback to sheet name
            aiStatus: 'PENDING',
        };

        for (const [rawHeader, field] of headerMapping.entries()) {
            const value = row[rawHeader]?.trim() || '';
            tc[field] = value;
        }

        // If module column exists but is empty, fallback to sheet name
        if (!tc.module) tc.module = sheetName;

        // Cell-level validation
        const testIdHeader = fieldToHeader.get('testId');
        const descHeader = fieldToHeader.get('description');
        const expectedHeader = fieldToHeader.get('expectedResult');
        const priorityHeader = fieldToHeader.get('priority');

        if (!tc.testId && testIdHeader) {
            tc.testId = `TC${String(index + 1).padStart(3, '0')}`;
            cellIssues.push({ row: index, column: testIdHeader, type: 'warning', message: `Empty — auto-generated as "${tc.testId}"` });
            warnings.push(`Row ${index + 1} [${sheetName}]: Missing Test Case ID, auto-generated as "${tc.testId}".`);
        }

        if (!tc.description && descHeader) {
            cellIssues.push({ row: index, column: descHeader, type: 'error', message: 'Description is empty' });
        }

        if (!tc.expectedResult && expectedHeader) {
            cellIssues.push({ row: index, column: expectedHeader, type: 'error', message: 'Expected result is empty' });
        }

        if (!tc.priority && priorityHeader) {
            cellIssues.push({ row: index, column: priorityHeader, type: 'error', message: 'Priority is empty' });
        }

        return tc;
    });

    if (rows.length > 500) {
        errors.push(`Sheet "${sheetName}" has ${rows.length} rows. Maximum per sheet is 500.`);
        return { rows: [], errors, warnings, rawHeaders, rawRows: rawRows.slice(0, 20), cellIssues };
    }

    return { rows, errors, warnings, rawHeaders, rawRows, cellIssues };
}

/**
 * Parse an XLSX file and return all sheets as SheetParseResult[].
 * Each sheet's name becomes the module if no module column exists.
 */
export async function parseXLSX(file: File): Promise<XLSXParseResult> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target!.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });

                const sheets: SheetParseResult[] = workbook.SheetNames.map((sheetName) => {
                    const worksheet = workbook.Sheets[sheetName];
                    // Convert sheet to JSON — header: 1 gives raw arrays, header omitted gives objects
                    const rawRows = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet, {
                        defval: '',
                        raw: false,  // Always return strings
                    });

                    const parseResult = parseSheetRows(rawRows, sheetName);
                    return { sheetName, parseResult };
                });

                resolve({ sheets, fileName: file.name });
            } catch (err) {
                reject(new Error(`Failed to parse XLSX: ${err instanceof Error ? err.message : 'Unknown error'}`));
            }
        };

        reader.onerror = () => reject(new Error('Failed to read file.'));
        reader.readAsArrayBuffer(file);
    });
}
