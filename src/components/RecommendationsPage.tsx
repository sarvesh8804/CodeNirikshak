import { useEffect, useState } from 'react';
import { ArrowLeft, Zap, CheckCircle, Download } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { apiService } from '../lib/api';
import JsonSectionRenderer from './JsonSectionRenderer';

const timelinePhases = [
  { label: '7 Days', value: '7d', color: 'bg-red-500' },
  { label: '30 Days', value: '30d', color: 'bg-orange-500' },
  { label: '60 Days', value: '60d', color: 'bg-amber-500' },
  { label: '90 Days', value: '90d', color: 'bg-green-500' }
];

export default function RecommendationsPage() {
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
        console.error('Error fetching recommendations data:', error);
      }
    };

    fetchFullData();
  }, [currentAnalysis, currentRepo]);

  if (!currentAnalysis || !currentRepo) {
    return null;
  }

  const full = fullData ?? currentAnalysis.fullData ?? {};

  const groupedByPriority = {
    P0: (currentAnalysis.recommendations ?? []).filter((r:any) => r.priority === 'P0'),
    P1: (currentAnalysis.recommendations ?? []).filter((r:any) => r.priority === 'P1'),
    P2: (currentAnalysis.recommendations ?? []).filter((r:any) => r.priority === 'P2')
  };

  const groupedByTimeline = {
    '7d': (currentAnalysis.recommendations ?? []).filter((r:any) => r.timeline === '7d'),
    '30d': (currentAnalysis.recommendations ?? []).filter((r:any) => r.timeline === '30d'),
    '60d': (currentAnalysis.recommendations ?? []).filter((r:any) => r.timeline === '60d'),
    '90d': (currentAnalysis.recommendations ?? []).filter((r:any) => r.timeline === '90d')
  };

  const handleExportRaw = () => {
    const json = JSON.stringify(full, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentRepo.name}_analysis_full.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
            <span className="text-slate-900 font-medium">Recommendations</span>
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
          <div className="flex-1">
            <h1 className="text-4xl font-bold text-slate-900 mb-2">Recommendations</h1>
            <p className="text-lg text-slate-600">{currentRepo.name}</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleExportRaw}
              className="flex items-center space-x-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-semibold hover:bg-slate-800 transition-all"
            >
              <Download className="w-5 h-5" />
              <span>Export Full JSON</span>
            </button>
          </div>
        </div>

        <div className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Priority Recommendations</h2>
          <div className="space-y-4">
            {Object.entries(groupedByPriority).map(([priority, recs]) => (
              <div key={priority} className="space-y-3">
                {recs.length > 0 && (
                  <>
                    <h3 className={`text-lg font-semibold flex items-center space-x-2 ${
                      priority === 'P0' ? 'text-red-700' :
                      priority === 'P1' ? 'text-orange-700' :
                      'text-amber-700'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${
                        priority === 'P0' ? 'bg-red-500' :
                        priority === 'P1' ? 'bg-orange-500' :
                        'bg-amber-500'
                      }`} />
                      <span>{priority} - {priority === 'P0' ? 'Critical' : priority === 'P1' ? 'High' : 'Medium'}</span>
                    </h3>
                    {recs.map((rec: any) => (
                      <div
                        key={rec.id}
                        className={`bg-white p-6 rounded-2xl border-2 shadow-sm hover:shadow-md transition-all ${
                          priority === 'P0' ? 'border-red-200' :
                          priority === 'P1' ? 'border-orange-200' :
                          'border-amber-200'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <h4 className="text-xl font-semibold text-slate-900 flex-1">{rec.title}</h4>
                          <span className={`text-xs font-medium px-3 py-1 rounded-full ${
                            priority === 'P0' ? 'bg-red-100 text-red-700' :
                            priority === 'P1' ? 'bg-orange-100 text-orange-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {rec.priority}
                          </span>
                        </div>
                        <p className="text-slate-700 mb-4">{rec.description}</p>
                        <div className="grid grid-cols-3 gap-4 mb-4">
                          <div className="bg-blue-50 p-3 rounded-lg">
                            <div className="text-xs font-medium text-blue-600 mb-1">Impact</div>
                            <div className="text-sm font-semibold text-blue-900">{rec.impact}</div>
                          </div>
                          <div className="bg-purple-50 p-3 rounded-lg">
                            <div className="text-xs font-medium text-purple-600 mb-1">Effort</div>
                            <div className="text-sm font-semibold text-purple-900">{rec.effort}</div>
                          </div>
                          <div className="bg-green-50 p-3 rounded-lg">
                            <div className="text-xs font-medium text-green-600 mb-1">Timeline</div>
                            <div className="text-sm font-semibold text-green-900">{rec.timeline}</div>
                          </div>
                        </div>
                        {rec.autoFixAvailable && (
                          <button className="flex items-center space-x-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-800 transition-all">
                            <Zap className="w-4 h-4" />
                            <span>Apply Auto-Fix</span>
                          </button>
                        )}

                        {/* show raw rec details if available */}
                        <div className="mt-4">
                          <JsonSectionRenderer title="Full Recommendation Object" data={rec} />
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Implementation Roadmap</h2>
          <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-sm p-8">
            <div className="space-y-8">
              {timelinePhases.map((phase, index) => {
                const items = groupedByTimeline[phase.value as keyof typeof groupedByTimeline];
                return (
                  <div key={phase.value} className="relative">
                    {index !== timelinePhases.length - 1 && (
                      <div className="absolute left-4 top-12 w-0.5 h-full bg-gray-200" />
                    )}
                    <div className="flex items-start space-x-4">
                      <div className={`w-8 h-8 ${phase.color} rounded-full flex items-center justify-center flex-shrink-0 relative z-10`}>
                        <CheckCircle className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-slate-900 mb-2">{phase.label}</h3>
                        {items.length > 0 ? (
                          <ul className="space-y-2">
                            {items.map((item: any) => (
                              <li key={item.id} className="flex items-center space-x-2 text-slate-700">
                                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
                                <span className="text-sm">{item.title}</span>
                                <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                                  item.priority === 'P0' ? 'bg-red-100 text-red-700' :
                                  item.priority === 'P1' ? 'bg-orange-100 text-orange-700' :
                                  'bg-amber-100 text-amber-700'
                                }`}>
                                  {item.priority}
                                </span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-slate-500">No tasks scheduled</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-8">
          <h3 className="text-xl font-semibold text-slate-900 mb-4">Quick Actions</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <button className="bg-white p-4 rounded-xl border border-blue-200 hover:border-blue-300 hover:shadow-sm transition-all text-left">
              <div className="font-semibold text-slate-900 mb-1">Apply All Auto-Fixes</div>
              <div className="text-sm text-slate-600">
                {(currentAnalysis.recommendations ?? []).filter((r:any) => r.autoFixAvailable).length} fixes available
              </div>
            </button>
            <button className="bg-white p-4 rounded-xl border border-blue-200 hover:border-blue-300 hover:shadow-sm transition-all text-left">
              <div className="font-semibold text-slate-900 mb-1">Create JIRA Tickets</div>
              <div className="text-sm text-slate-600">Export to project management</div>
            </button>
            <button className="bg-white p-4 rounded-xl border border-blue-200 hover:border-blue-300 hover:shadow-sm transition-all text-left">
              <div className="font-semibold text-slate-900 mb-1">Schedule Review</div>
              <div className="text-sm text-slate-600">Set up team discussion</div>
            </button>
          </div>
        </div>

        {/* Additional context from the backend */}
        <div className="space-y-6">
          <JsonSectionRenderer title="Security - Top Fixes" data={full.security?.securityAI?.topFixes} />
          <JsonSectionRenderer title="Fintech Compliance - Top Critical Findings" data={full.fintech_compliance?.fintechComplianceAI?.topCriticalFindings} />
          <JsonSectionRenderer title="Feasibility - Recommended Next Steps" data={full.feasibility?.feasibility?.recommendedNextSteps} />
          <JsonSectionRenderer title="Cost - Next Steps" data={full.cost?.costAnalysis?.nextSteps} />
          <JsonSectionRenderer title="Technical Roadmap" data={full.technicalSummary?.roadmap} />
        </div>
      </div>
    </div>
  );
}
