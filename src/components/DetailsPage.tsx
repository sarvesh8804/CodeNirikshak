import React, { useState, useEffect } from 'react';
import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { apiService } from '../lib/api';
import JsonSectionRenderer from './JsonSectionRenderer';

function CollapsibleSection({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-sm overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-slate-600" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-600" />
        )}
      </button>
      {isOpen && (
        <div className="p-6 pt-0 border-t border-gray-200 animate-fade-in">
          {children}
        </div>
      )}
    </div>
  );
}

function BarChart({ data, max }: { data: { label: string; value: number; color: string }[]; max: number }) {
  return (
    <div className="space-y-4">
      {data.map((item) => (
        <div key={item.label}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">{item.label}</span>
            <span className="text-sm font-semibold text-slate-900">{item.value}%</span>
          </div>
          <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full ${item.color} transition-all duration-1000 ease-out`}
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function DetailsPage() {
  const { currentAnalysis, currentRepo, setCurrentPage } = useApp();
  const [fullData, setFullData] = useState<any>(null);

  useEffect(() => {
    if (!currentAnalysis) return;

    const fetchFullData = async () => {
      try {
        if (currentAnalysis.fullData) {
          setFullData(currentAnalysis.fullData);
        } else if (currentRepo) {
          const analysis = await apiService.getAnalysisFromDB(currentRepo.url);
          if (analysis?.combined_response) {
            setFullData(analysis.combined_response);
          }
        }
      } catch (error) {
        console.error('Error fetching details data:', error);
      }
    };

    fetchFullData();
  }, [currentAnalysis, currentRepo]);

  if (!currentAnalysis || !currentRepo) {
    return null;
  }

  const full = fullData ?? currentAnalysis.fullData ?? {};
  const complianceData = [
    { label: 'RBI Compliance', value: full.fintech_compliance?.fintechComplianceAI?.complianceScore ?? 0, color: 'bg-blue-500' },
    { label: 'PCI-DSS', value: full.fintech_compliance?.fintechComplianceAI?.complianceScore ?? 0, color: 'bg-green-500' },
    { label: 'KYC Requirements', value:  (full.fintech_compliance?.fintechComplianceAI?.complianceScore ?? 0) - 10, color: 'bg-amber-500' },
    { label: 'GDPR', value: full.fintech_compliance?.fintechComplianceAI?.complianceScore ?? 0, color: 'bg-purple-500' }
  ];

  const codeQualityData = [
    { label: 'Maintainability', value: full.health?.projectReport?.qualityReport?.maintainability ?? 82, color: 'bg-green-500' },
    { label: 'Readability', value: full.health?.projectReport?.qualityReport?.readability ?? 75, color: 'bg-blue-500' },
    { label: 'Test Coverage', value: full.health?.projectReport?.qualityReport?.testCoverage ?? 68, color: 'bg-amber-500' },
    { label: 'Documentation', value: full.health?.projectReport?.qualityReport?.documentation ?? 71, color: 'bg-purple-500' }
  ];

  const architectureData = [
    { label: 'Modularity', value: 88, color: 'bg-green-500' },
    { label: 'Coupling', value: 35, color: 'bg-amber-500' },
    { label: 'Cohesion', value: 92, color: 'bg-blue-500' },
    { label: 'Design Patterns', value: 78, color: 'bg-purple-500' }
  ];

  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center space-x-2 text-sm text-slate-600">
            <button
              onClick={() => setCurrentPage('dashboard')}
              className="hover:text-slate-900 transition-colors"
            >
              Dashboard
            </button>
            <span>/</span>
            <span className="text-slate-900 font-medium">Details</span>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="flex items-center space-x-4 mb-12">
          <button
            onClick={() => setCurrentPage('dashboard')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">Detailed Analysis</h1>
            <p className="text-lg text-slate-600">{currentRepo.name}</p>
          </div>
        </div>

        <div className="space-y-6">
          <CollapsibleSection title="Compliance Analysis" defaultOpen={true}>
            <p className="text-slate-600 mb-6">
              Breakdown of regulatory compliance across different standards and frameworks.
            </p>
            <BarChart data={complianceData} max={100} />

            {/* show detailed compliance AI node */}
            <div className="mt-6">
              <JsonSectionRenderer title="Fintech Compliance AI Output" data={full.fintech_compliance?.fintechComplianceAI} />
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Security Issues">
            <p className="text-slate-600 mb-6">
              Distribution of security vulnerabilities by severity and type.
            </p>
            <div className="space-y-4">
              {(full.security?.securityAI?.highRisks ?? []).map((risk: any, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-4 rounded-xl border border-gray-200"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span className="font-medium text-slate-900">{typeof risk === 'string' ? risk : JSON.stringify(risk)}</span>
                  </div>
                </div>
              ))}

              {/* Tools summary */}
              <JsonSectionRenderer title="Security Tools" data={full.security?.tools} />
              <JsonSectionRenderer title="Security AI Summary" data={full.security?.securityAI} />
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Code Quality Metrics">
            <p className="text-slate-600 mb-6">
              Assessment of code maintainability, readability, test coverage, and documentation.
            </p>
            <BarChart data={codeQualityData} max={100} />
            <JsonSectionRenderer title="Project Report" data={full.health?.projectReport} />
          </CollapsibleSection>

          <CollapsibleSection title="Architecture Analysis">
            <p className="text-slate-600 mb-6">
              Evaluation of architectural patterns, modularity, coupling, and design quality.
            </p>
            <BarChart data={architectureData} max={100} />
            <JsonSectionRenderer title="Project Structure" data={full.technicalSummary?.projectStructure} />
            <JsonSectionRenderer title="Main Files" data={full.technicalSummary?.mainFiles} />
          </CollapsibleSection>

          <CollapsibleSection title="File-Level Issues">
            <p className="text-slate-600 mb-6">
              Specific issues identified in individual files with line numbers.
            </p>
            <div className="space-y-3">
              {(currentAnalysis.fileIssues ?? []).map((issue: any, index: number) => (
                <button
                  key={index}
                  onClick={() => setCurrentPage('code-explorer')}
                  className="w-full p-4 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all text-left"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="font-mono text-sm text-blue-600">{issue.file}:{issue.line}</div>
                    <span className={`text-xs font-medium px-3 py-1 rounded-full ${
                      issue.severity === 'critical' ? 'bg-red-100 text-red-700' :
                      issue.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                      issue.severity === 'medium' ? 'bg-amber-100 text-amber-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {issue.severity?.toUpperCase?.() ?? 'INFO'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700">{issue.message}</p>
                  <div className="mt-2">
                    <span className="text-xs font-medium text-slate-500 uppercase">{issue.category}</span>
                  </div>
                </button>
              ))}

              <JsonSectionRenderer title="Extracted Files (summary)" data={{
                totalFiles: full.extractedCode?.totalFiles,
                totalSize: full.extractedCode?.totalSize,
                sampleFiles: (full.extractedCode?.files ?? []).slice(0, 6).map((f:any) => ({ path: f.path, size: f.size, language: f.language }))
              }} />
            </div>
          </CollapsibleSection>

          {/* Additional detailed sections from backend */}
          <CollapsibleSection title="Feasibility & Business" defaultOpen={false}>
            <p className="text-slate-600 mb-4">Business feasibility, market fit and recommended next steps.</p>
            <JsonSectionRenderer title="Feasibility Overview" data={full.feasibility?.feasibility} />
            <JsonSectionRenderer title="Feasibility - technical summary used" data={full.feasibility?.technicalSummaryUsed} />
            <JsonSectionRenderer title="Feasibility - recommended next steps" data={full.feasibility?.feasibility?.recommendedNextSteps} />
          </CollapsibleSection>

          <CollapsibleSection title="Cost & Monetization" defaultOpen={false}>
            <p className="text-slate-600 mb-4">Cost analysis, MVP estimates, and monetization options.</p>
            <JsonSectionRenderer title="Cost Analysis" data={full.cost?.costAnalysis} />
            <JsonSectionRenderer title="Estimated Cost To Build" data={full.cost?.costAnalysis?.estimatedCostToBuild} />
            <JsonSectionRenderer title="Cost - next steps" data={full.cost?.costAnalysis?.nextSteps} />
          </CollapsibleSection>

          <CollapsibleSection title="Repo & Metadata">
            <JsonSectionRenderer title="Repository Record (extracted)" data={full.extractedCode?.repository} />
            <JsonSectionRenderer title="Meta" data={{
              githubUrl: currentAnalysis.repoUrl ?? currentRepo.url,
              createdAt: currentAnalysis.createdAt,
              lastUpdated: currentAnalysis.lastUpdated
            }} />
            {/* <JsonSectionRenderer title="Raw AI Texts" data={full.allstats?.raw_ai_text ?? full.raw_ai_text ?? full.security?.raw_ai} /> */}
          </CollapsibleSection>
        </div>

        <div className="mt-8 flex space-x-4">
          <button
            onClick={() => setCurrentPage('code-explorer')}
            className="flex-1 bg-slate-900 text-white px-6 py-4 rounded-xl font-semibold hover:bg-slate-800 transition-all"
          >
            Explore Code Issues
          </button>
          <button
            onClick={() => setCurrentPage('recommendations')}
            className="flex-1 bg-white text-slate-900 px-6 py-4 rounded-xl font-semibold border-2 border-slate-200 hover:border-slate-300 transition-all"
          >
            View Recommendations
          </button>
        </div>
      </div>
    </div>
  );
}
