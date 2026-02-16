import Papa from 'papaparse';
import type { TestCase, CSVParseResult } from '@/types';

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

    'expected result': 'expectedResult',
    'expectedresult': 'expectedResult',
    'expected_result': 'expectedResult',
    'expected': 'expectedResult',
    'expected outcome': 'expectedResult',
    'expected behavior': 'expectedResult',

    'priority': 'priority',
    'prio': 'priority',
    'severity': 'priority',

    'module': 'module',
    'module name': 'module',
    'feature': 'module',
    'component': 'module',
    'area': 'module',
};

const MANDATORY_FIELDS: CSVMappableField[] = ['testId', 'description'];

/**
 * Parse a CSV file and return normalized test case rows.
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

                // Normalize headers
                const rawHeaders = results.meta.fields || [];
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
                    resolve({ rows: [], errors, warnings });
                    return;
                }

                // Transform rows
                const rows: TestCase[] = (results.data as Record<string, string>[]).map(
                    (row, index) => {
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

                        // Auto-generate test ID if missing
                        if (!tc.testId) {
                            tc.testId = `TC${String(index + 1).padStart(3, '0')}`;
                            warnings.push(`Row ${index + 1}: Missing Test Case ID, auto-generated as "${tc.testId}".`);
                        }

                        return tc;
                    }
                );

                // Row count validation
                if (rows.length > 500) {
                    errors.push(`File contains ${rows.length} rows. Maximum allowed is 500.`);
                    resolve({ rows: [], errors, warnings });
                    return;
                }

                resolve({ rows, errors, warnings });
            },
            error: (error: Error) => {
                resolve({
                    rows: [],
                    errors: [`CSV parsing failed: ${error.message}`],
                    warnings: [],
                });
            },
        });
    });
}
