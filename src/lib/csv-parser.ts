import Papa from 'papaparse';
import type { TestCase, CSVParseResult, CellIssue } from '@/types';

// Base fields that we map from CSV headers
type CSVMappableField = 'testId' | 'description' | 'expectedResult' | 'priority' | 'module';

// ─── Header Normalization Map ─────────────────────────────────────
// Maps common header variations → canonical field names
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

const MANDATORY_FIELDS: CSVMappableField[] = ['testId', 'description', 'expectedResult', 'priority'];

/**
 * Parse a CSV file and return normalized test case rows with cell-level issues.
 */
export function parseCSV(file: File): Promise<CSVParseResult> {
    return new Promise((resolve) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (header: string) => header.trim(),
            complete: (results) => {
                const errors: string[] = [];
                const warnings: string[] = [];
                const cellIssues: CellIssue[] = [];

                // Raw data for preview
                const rawHeaders = results.meta.fields || [];
                const rawRows = (results.data as Record<string, string>[]).map((row) => {
                    const clean: Record<string, string> = {};
                    for (const h of rawHeaders) {
                        clean[h] = row[h] ?? '';
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
                        errors.push(`Missing mandatory column: "${field}". Please check your CSV headers.`);
                    }
                }

                if (errors.length > 0) {
                    resolve({ rows: [], errors, warnings, rawHeaders, rawRows, cellIssues });
                    return;
                }

                // Find the raw header names for mandatory/optional fields
                const fieldToHeader = new Map<CSVMappableField, string>();
                for (const [raw, field] of headerMapping.entries()) {
                    fieldToHeader.set(field, raw);
                }

                // Transform rows & generate cell-level issues
                const rows: TestCase[] = rawRows.map((row, index) => {
                    const tc: TestCase = {
                        testId: '',
                        description: '',
                        expectedResult: '',
                        priority: '',
                        module: '',
                        aiStatus: 'PENDING',
                    };

                    for (const [rawHeader, field] of headerMapping.entries()) {
                        const value = row[rawHeader]?.trim() || '';
                        tc[field] = value;
                    }

                    // Cell-level validation
                    const testIdHeader = fieldToHeader.get('testId');
                    const descHeader = fieldToHeader.get('description');
                    const expectedHeader = fieldToHeader.get('expectedResult');
                    const priorityHeader = fieldToHeader.get('priority');

                    // Missing Test ID
                    if (!tc.testId && testIdHeader) {
                        tc.testId = `TC${String(index + 1).padStart(3, '0')}`;
                        cellIssues.push({
                            row: index,
                            column: testIdHeader,
                            type: 'warning',
                            message: `Empty — auto-generated as "${tc.testId}"`,
                        });
                        warnings.push(`Row ${index + 1}: Missing Test Case ID, auto-generated as "${tc.testId}".`);
                    }

                    // Empty description
                    if (!tc.description && descHeader) {
                        cellIssues.push({
                            row: index,
                            column: descHeader,
                            type: 'error',
                            message: 'Description is empty',
                        });
                    }

                    // Empty expected result
                    if (!tc.expectedResult && expectedHeader) {
                        cellIssues.push({
                            row: index,
                            column: expectedHeader,
                            type: 'error',
                            message: 'Expected result is empty',
                        });
                    }

                    // Empty priority
                    if (!tc.priority && priorityHeader) {
                        cellIssues.push({
                            row: index,
                            column: priorityHeader,
                            type: 'error',
                            message: 'Priority is empty',
                        });
                    }



                    return tc;
                });

                // Row count validation
                if (rows.length > 500) {
                    errors.push(`File contains ${rows.length} rows. Maximum allowed is 500.`);
                    resolve({ rows: [], errors, warnings, rawHeaders, rawRows: rawRows.slice(0, 20), cellIssues });
                    return;
                }

                resolve({ rows, errors, warnings, rawHeaders, rawRows, cellIssues });
            },
            error: (error: Error) => {
                resolve({
                    rows: [],
                    errors: [`CSV parsing failed: ${error.message}`],
                    warnings: [],
                    rawHeaders: [],
                    rawRows: [],
                    cellIssues: [],
                });
            },
        });
    });
}
