// ─── Test Case Types ─────────────────────────────────────────────

export interface TestCase {
  id?: string; // Firestore Document ID
  testId: string;
  description: string;
  expectedResult: string;
  priority: string;
  module: string;
  aiStatus?: AIStatus;
  score?: number;
  comment?: string;
  confidence?: number;
  localFlags?: string[];
  rewrittenDescription?: string;
  rewrittenExpected?: string;
  improvementReason?: string;
}

export type AIStatus = 'PASS' | 'NEEDS_REWRITE' | 'PENDING' | 'ANALYZING' | 'ERROR';

// ─── AI Response Types ───────────────────────────────────────────

export interface AIReviewResult {
  testId: string;
  status: AIStatus;
  score: number;
  reason: string;
  confidence: number;
}

export interface AIRewriteResult {
  testId: string;
  rewrittenDescription: string;
  rewrittenExpected: string;
  improvementReason: string;
}

export interface AIModuleSummary {
  averageScore: number;
  rewritePercentage: number;
  automationReadiness: string;
  mainIssues: string[];
}

// ─── Firebase Types ──────────────────────────────────────────────

export type UserRole = 'admin' | 'qa';

export interface UserProfile {
  userId: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: UserRole;
  createdAt: Date;
}

export interface ProjectFolder {
  projectId: string;
  name: string;
  description?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt?: Date;
  avgScore?: number;
  deleted?: boolean;
}

export interface FileRecord {
  fileId: string;
  userId: string;
  fileName: string;
  uploadDate: Date;
  rowCount: number;
  // New fields (optional for backward compat with existing docs)
  projectId?: string;
  uploadedBy?: string;   // user email
  version?: number;
  aiReviewed?: boolean;
  averageScore?: number | null;
  summary?: AIModuleSummary; // Persisted AI Summary
}

export interface DailyUsage {
  filesUploaded: number;
  rowsAnalyzed: number;
}

// ─── CSV Parsing Types ───────────────────────────────────────────

export interface CellIssue {
  row: number;          // 0-indexed row in rawRows
  column: string;       // raw header name
  type: 'error' | 'warning';
  message: string;
}

export interface CSVParseResult {
  rows: TestCase[];
  errors: string[];
  warnings: string[];
  rawHeaders: string[];
  rawRows: Record<string, string>[];
  cellIssues: CellIssue[];
}

// ─── Rate Limit Types ────────────────────────────────────────────

export interface RateLimitCheck {
  allowed: boolean;
  message?: string;
  filesRemaining?: number;
  rowsRemaining?: number;
}
