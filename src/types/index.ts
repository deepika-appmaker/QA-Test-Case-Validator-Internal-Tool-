// ─── Test Case Types ─────────────────────────────────────────────

export interface TestCase {
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

export interface UserProfile {
  userId: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  createdAt: Date;
}

export interface FileRecord {
  fileId: string;
  userId: string;
  fileName: string;
  uploadDate: Date;
  rowCount: number;
}

export interface DailyUsage {
  filesUploaded: number;
  rowsAnalyzed: number;
}

// ─── CSV Parsing Types ───────────────────────────────────────────

export interface CSVParseResult {
  rows: TestCase[];
  errors: string[];
  warnings: string[];
}

// ─── Rate Limit Types ────────────────────────────────────────────

export interface RateLimitCheck {
  allowed: boolean;
  message?: string;
  filesRemaining?: number;
  rowsRemaining?: number;
}
