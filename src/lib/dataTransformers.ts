import { AnalysisResult, SecurityIssue, FileIssue, Recommendation, ComplianceData } from '../types';
import { CombinedAnalysisResponse } from './api';

/**
 * Transform backend analysis data to frontend format
 */
export function transformBackendToFrontend(
  combinedData: CombinedAnalysisResponse,
  githubUrl: string
): AnalysisResult {
  // Extract scores from different endpoints
  const complianceScore = calculateComplianceScore(combinedData);
  const securityScore = calculateSecurityScore(combinedData);
  const codeQualityScore = calculateCodeQualityScore(combinedData);
  const architectureScore = calculateArchitectureScore(combinedData);
  const financialRiskScore = calculateFinancialRiskScore(combinedData);

  // Transform security issues
  const securityIssues = extractSecurityIssues(combinedData);

  // Transform file issues
  const fileIssues = extractFileIssues(combinedData);

  // Transform recommendations
  const recommendations = extractRecommendations(combinedData);

  // Extract compliance data
  const complianceData = extractComplianceData(combinedData);

  return {
    id: `analysis-${Date.now()}`,
    repositoryId: githubUrl,
    scores: {
      compliance: {
        title: 'Compliance',
        score: complianceScore,
        maxScore: 100,
        status: getStatusFromScore(complianceScore)
      },
      financialRisk: {
        title: 'Financial Risk',
        score: financialRiskScore,
        maxScore: 100,
        status: getStatusFromScore(financialRiskScore)
      },
      security: {
        title: 'Security',
        score: securityScore,
        maxScore: 100,
        status: getStatusFromScore(securityScore)
      },
      codeQuality: {
        title: 'Code Quality',
        score: codeQualityScore,
        maxScore: 100,
        status: getStatusFromScore(codeQualityScore)
      },
      architecture: {
        title: 'Architecture',
        score: architectureScore,
        maxScore: 100,
        status: getStatusFromScore(architectureScore)
      }
    },
    complianceData,
    securityIssues,
    fileIssues,
    recommendations,
    createdAt: new Date().toISOString(),
    repoUrl: githubUrl,
    lastUpdated: new Date().toISOString(),
    fullData: combinedData
  };
}

function getStatusFromScore(score: number): 'excellent' | 'good' | 'warning' | 'critical' {
  if (score >= 90) return 'excellent';
  if (score >= 75) return 'good';
  if (score >= 60) return 'warning';
  return 'critical';
}

function calculateComplianceScore(data: CombinedAnalysisResponse): number {
  const fintech = data.fintech_compliance?.fintechComplianceAI;
  if (fintech?.complianceScore !== undefined && typeof fintech.complianceScore === 'number') {
    return fintech.complianceScore;
  }
  
  // Fallback: calculate from violations
  const violations = [
    ...(fintech?.rbiViolations || []),
    ...(fintech?.dpdpViolations || []),
    ...(fintech?.gdprViolations || []),
    ...(fintech?.pciViolations || []),
    ...(fintech?.crossCuttingRisks || [])
  ];
  
  const baseScore = 100;
  const penalty = violations.length * 8;
  return Math.max(0, baseScore - penalty);
}

function calculateSecurityScore(data: CombinedAnalysisResponse): number {
  const security = data.security?.securityAI;
  if (security?.securityScore !== undefined && typeof security.securityScore === 'number') {
    return security.securityScore;
  }
  
  // Fallback calculation
  const highRisks = security?.highRisks?.length || 0;
  const mediumRisks = security?.mediumRisks?.length || 0;
  const lowRisks = security?.lowRisks?.length || 0;
  
  const baseScore = 100;
  const penalty = (highRisks * 20) + (mediumRisks * 10) + (lowRisks * 5);
  return Math.max(0, baseScore - penalty);
}

function calculateCodeQualityScore(data: CombinedAnalysisResponse): number {
  const health = data.health;
  if (health?.healthScore !== undefined) {
    return health.healthScore;
  }
  
  // Fallback: use project report quality indicators
  const qualityReport = health?.projectReport?.qualityReport;
  let score = 50;
  
  if (qualityReport?.hasUnitTests === 'Yes') score += 20;
  if (qualityReport?.hasDocumentation !== 'Missing') score += 15;
  if (qualityReport?.complexityRating === 'Low') score += 15;
  
  return Math.min(100, score);
}

function calculateArchitectureScore(data: CombinedAnalysisResponse): number {
  const health = data.health;
  const healthScore = health?.healthScore || 50;
  
  // Architecture score based on health and branch stats
  const branchStats = health?.branchStats;
  let score = healthScore;
  
  if (branchStats?.active > 0) score += 10;
  if (branchStats?.stale < branchStats?.totalBranches / 2) score += 10;
  
  return Math.min(100, score);
}

function calculateFinancialRiskScore(data: CombinedAnalysisResponse): number {
  const feasibility = data.feasibility?.feasibility;
  const cost = data.cost?.costAnalysis;
  
  // Combine risk factors
  let score = 70; // Base score
  
  // Adjust based on feasibility risks
  const risks = feasibility?.risks || [];
  score -= risks.length * 5;
  
  // Adjust based on cost analysis
  if (cost?.successProbability !== undefined) {
    score = (score + cost.successProbability) / 2;
  }
  
  return Math.max(0, Math.min(100, score));
}

function extractSecurityIssues(data: CombinedAnalysisResponse): SecurityIssue[] {
  const issues: SecurityIssue[] = [];
  
  // From fintech compliance - check for critical findings first
  const fintech = data.fintech_compliance?.fintechComplianceAI;
  if (fintech) {
    const criticalFindings = fintech.topCriticalFindings?.length || 0;
    if (criticalFindings > 0) {
      issues.push({
        severity: 'critical',
        type: 'Compliance Violations',
        count: criticalFindings
      });
    }
    
    // Count violations by type
    const rbiViolations = fintech.rbiViolations?.length || 0;
    const pciViolations = fintech.pciViolations?.length || 0;
    const gdprViolations = fintech.gdprViolations?.length || 0;
    const crossCutting = fintech.crossCuttingRisks?.length || 0;
    
    if (rbiViolations > 0) {
      issues.push({
        severity: 'high',
        type: 'RBI Violations',
        count: rbiViolations
      });
    }
    if (pciViolations > 0) {
      issues.push({
        severity: 'critical',
        type: 'PCI-DSS Violations',
        count: pciViolations
      });
    }
    if (gdprViolations > 0) {
      issues.push({
        severity: 'high',
        type: 'GDPR Violations',
        count: gdprViolations
      });
    }
    if (crossCutting > 0) {
      issues.push({
        severity: 'high',
        type: 'Cross-Cutting Risks',
        count: crossCutting
      });
    }
  }
  
  // From security endpoint
  const security = data.security?.securityAI;
  if (security) {
    if (security.highRisks?.length > 0) {
      issues.push({
        severity: 'high',
        type: 'Security High Risks',
        count: security.highRisks.length
      });
    }
    if (security.mediumRisks?.length > 0) {
      issues.push({
        severity: 'medium',
        type: 'Security Medium Risks',
        count: security.mediumRisks.length
      });
    }
    if (security.lowRisks?.length > 0) {
      issues.push({
        severity: 'low',
        type: 'Security Low Risks',
        count: security.lowRisks.length
      });
    }
  }
  
  // From security tools
  const tools = data.security?.tools;
  if (tools) {
    // Count issues from bandit, semgrep, eslint
    const banditIssues = (tools.bandit?.match(/Issue:/g) || []).length;
    const semgrepIssues = (tools.semgrep?.match(/severity/g) || []).length;
    
    if (banditIssues > 0) {
      issues.push({
        severity: 'high',
        type: 'Bandit Security Issues',
        count: banditIssues
      });
    }
    if (semgrepIssues > 0) {
      issues.push({
        severity: 'medium',
        type: 'Semgrep Issues',
        count: semgrepIssues
      });
    }
  }
  
  return issues.length > 0 ? issues : [
    { severity: 'low', type: 'No Critical Issues', count: 0 }
  ];
}

function extractFileIssues(data: CombinedAnalysisResponse): FileIssue[] {
  const issues: FileIssue[] = [];
  
  // From security tools output
  const tools = data.security?.tools;
  if (tools?.bandit) {
    // Parse bandit output (simplified)
    const lines = tools.bandit.split('\n');
    lines.forEach((line: string) => {
      if (line.includes('Issue:')) {
        const fileMatch = line.match(/([^:]+):(\d+)/);
        if (fileMatch) {
          issues.push({
            file: fileMatch[1],
            line: parseInt(fileMatch[2]) || 0,
            severity: line.includes('HIGH') ? 'high' : 'medium',
            message: line.split('Issue:')[1]?.trim() || 'Security issue detected',
            category: 'security'
          });
        }
      }
    });
  }
  
  // From fintech compliance
  const fintech = data.fintech_compliance?.fintechComplianceAI;
  if (fintech?.topCriticalFindings) {
    fintech.topCriticalFindings.forEach((finding: any, index: number) => {
      issues.push({
        file: 'compliance',
        line: index + 1,
        severity: 'critical',
        message: finding.why || finding.rule || 'Compliance violation',
        category: 'compliance'
      });
    });
  }
  
  return issues.length > 0 ? issues : [];
}

function extractRecommendations(data: CombinedAnalysisResponse): Recommendation[] {
  const recommendations: Recommendation[] = [];
  
  // From fintech compliance
  const fintech = data.fintech_compliance?.fintechComplianceAI;
  if (fintech?.topCriticalFindings && Array.isArray(fintech.topCriticalFindings)) {
    fintech.topCriticalFindings.forEach((finding: any, index: number) => {
      recommendations.push({
        id: `rec-compliance-${index}`,
        priority: 'P0' as const,
        title: finding.rule || finding.why || 'Compliance Fix Required',
        description: finding.why || finding.fix || 'Compliance violation detected',
        impact: 'Critical',
        effort: '1-3 days',
        timeline: '7d' as const,
        autoFixAvailable: false
      });
    });
  }
  
  // From security recommendations
  const security = data.security?.securityAI;
  if (security?.topFixes) {
    security.topFixes.forEach((fix: string, index: number) => {
      recommendations.push({
        id: `rec-security-${index}`,
        priority: 'P1' as const,
        title: fix,
        description: 'Security improvement recommended',
        impact: 'High',
        effort: '2-5 days',
        timeline: '30d' as const,
        autoFixAvailable: false
      });
    });
  }
  
  // From health roadmap
  const health = data.health;
  if (health?.roadmap) {
    health.roadmap.forEach((item: string, index: number) => {
      recommendations.push({
        id: `rec-health-${index}`,
        priority: 'P2' as const,
        title: item,
        description: 'Project health improvement',
        impact: 'Medium',
        effort: '1-2 weeks',
        timeline: '60d' as const,
        autoFixAvailable: false
      });
    });
  }
  
  // From feasibility recommendations
  const feasibility = data.feasibility?.feasibility;
  if (feasibility?.recommendedNextSteps) {
    feasibility.recommendedNextSteps.forEach((step: string, index: number) => {
      recommendations.push({
        id: `rec-feasibility-${index}`,
        priority: 'P1' as const,
        title: step,
        description: 'Business feasibility improvement',
        impact: 'Medium',
        effort: '1-2 weeks',
        timeline: '90d' as const,
        autoFixAvailable: false
      });
    });
  }
  
  return recommendations.length > 0 ? recommendations : [];
}

function extractComplianceData(data: CombinedAnalysisResponse): ComplianceData {
  const fintech = data.fintech_compliance?.fintechComplianceAI;
  
  // Calculate compliance percentages
  const rbiViolations = fintech?.rbiViolations?.length || 0;
  const dpdpViolations = fintech?.dpdpViolations?.length || 0;
  const gdprViolations = fintech?.gdprViolations?.length || 0;
  const pciViolations = fintech?.pciViolations?.length || 0;
  
  // Use compliance score if available, otherwise calculate from violations
  const complianceScore = fintech?.complianceScore;
  const baseScore = typeof complianceScore === 'number' ? complianceScore : undefined;
  
  return {
    rbi: baseScore !== undefined ? Math.max(0, baseScore - (rbiViolations * 5)) : Math.max(0, 100 - (rbiViolations * 12)),
    pci: baseScore !== undefined ? Math.max(0, baseScore - (pciViolations * 5)) : Math.max(0, 100 - (pciViolations * 15)),
    kyc: baseScore !== undefined ? Math.max(0, baseScore - (dpdpViolations * 3)) : Math.max(0, 100 - (dpdpViolations * 8)),
    gdpr: baseScore !== undefined ? Math.max(0, baseScore - (gdprViolations * 5)) : Math.max(0, 100 - (gdprViolations * 12))
  };
}

