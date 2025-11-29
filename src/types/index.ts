export interface Repository {
  id: string;
  name: string;
  url: string;
  languages: string[];
  fintechModules: string[];
  analyzedAt: string;
  status: 'pending' | 'analyzing' | 'completed' | 'failed';
}

export interface AnalysisAgent {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  description: string;
}

export interface ScoreCard {
  title: string;
  score: number;
  maxScore: number;
  status: 'excellent' | 'good' | 'warning' | 'critical';
  trend?: 'up' | 'down' | 'stable';
}

export interface ComplianceData {
  rbi: number;
  pci: number;
  kyc: number;
  gdpr: number;
}

export interface SecurityIssue {
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: string;
  count: number;
}

export interface FileIssue {
  file: string;
  line: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  category: string;
}

export interface Recommendation {
  id: string;
  priority: 'P0' | 'P1' | 'P2';
  title: string;
  description: string;
  impact: string;
  effort: string;
  timeline: '7d' | '30d' | '60d' | '90d';
  autoFixAvailable: boolean;
}

export interface AnalysisResult {
  id: string;
  repositoryId: string;
  scores: {
    compliance: ScoreCard;
    financialRisk: ScoreCard;
    security: ScoreCard;
    codeQuality: ScoreCard;
    architecture: ScoreCard;
  };
  complianceData: ComplianceData;
  securityIssues: SecurityIssue[];
  fileIssues: FileIssue[];
  recommendations: Recommendation[];
  createdAt: string;
  // Optional extended fields often included by backend or transformers
  fullData?: any;
  repoUrl?: string;
  lastUpdated?: string;
}
