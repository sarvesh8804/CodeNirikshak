import { useEffect, useState } from 'react';
import { ArrowLeft, FileText, Download, Code } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { apiService } from '../lib/api';
import JsonSectionRenderer from './JsonSectionRenderer';

export default function ReportsPage() {
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
        console.error('Error fetching reports data:', error);
      }
    };

    fetchFullData();
  }, [currentAnalysis, currentRepo]);

  if (!currentAnalysis || !currentRepo) {
    return null;
  }

  const full = fullData ?? currentAnalysis.fullData ?? {};

  const reports = [
    {
      id: 'executive',
      title: 'Executive Summary',
      description: 'High-level overview for stakeholders and decision makers',
      format: 'PDF',
      icon: FileText,
      color: 'blue',
      pages: '3-5 pages',
      includes: ['Overall scores', 'Key findings', 'Risk assessment', 'Cost analysis']
    },
    {
      id: 'developer',
      title: 'Developer Report',
      description: 'Detailed technical report with code examples and fixes',
      format: 'PDF',
      icon: Code,
      color: 'green',
      pages: '15-20 pages',
      includes: ['Code issues', 'Fix recommendations', 'Before/after examples', 'Best practices']
    },
    {
      id: 'json',
      title: 'Raw Data Export',
      description: 'Complete analysis data in JSON format for integration',
      format: 'JSON',
      icon: Code,
      color: 'purple',
      pages: 'Full dataset',
      includes: ['All metrics', 'File-level data', 'Timestamps', 'Issue details']
    }
  ];

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'blue':
        return {
          bg: 'bg-blue-100',
          text: 'text-blue-600',
          border: 'border-blue-200',
          hover: 'hover:border-blue-300'
        };
      case 'green':
        return {
          bg: 'bg-green-100',
          text: 'text-green-600',
          border: 'border-green-200',
          hover: 'hover:border-green-300'
        };
      case 'purple':
        return {
          bg: 'bg-purple-100',
          text: 'text-purple-600',
          border: 'border-purple-200',
          hover: 'hover:border-purple-300'
        };
      default:
        return {
          bg: 'bg-gray-100',
          text: 'text-gray-600',
          border: 'border-gray-200',
          hover: 'hover:border-gray-300'
        };
    }
  };

  const handleDownload = (reportType: string) => {
    if (reportType === 'json') {
      const blob = new Blob([JSON.stringify(full, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentRepo.name}_analysis.json`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }

    // For PDF downloads you would call backend endpoint; fallback to console for now
    console.log(`Downloading ${reportType} report...`);
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
            <span className="text-slate-900 font-medium">Reports</span>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-16">
        <div className="flex items-center space-x-4 mb-12">
          <button
            onClick={() => setCurrentPage('dashboard')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">Export Reports</h1>
            <p className="text-lg text-slate-600">{currentRepo.name}</p>
          </div>
        </div>

        <div className="space-y-6 mb-12">
          {reports.map((report) => {
            const Icon = report.icon;
            const colors = getColorClasses(report.color);

            return (
              <div
                key={report.id}
                className={`bg-white p-8 rounded-2xl border-2 ${colors.border} ${colors.hover} shadow-sm hover:shadow-md transition-all`}
              >
                <div className="flex items-start space-x-6">
                  <div className={`w-16 h-16 ${colors.bg} rounded-2xl flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-8 h-8 ${colors.text}`} />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-2xl font-semibold text-slate-900 mb-1">{report.title}</h3>
                        <p className="text-slate-600">{report.description}</p>
                      </div>
                      <span className={`text-xs font-medium px-3 py-1 rounded-full ${colors.bg} ${colors.text}`}>
                        {report.format}
                      </span>
                    </div>

                    <div className="mb-4">
                      <div className="text-sm font-medium text-slate-600 mb-2">Includes:</div>
                      <div className="flex flex-wrap gap-2">
                        {report.includes.map((item) => (
                          <span
                            key={item}
                            className="bg-gray-100 text-slate-700 px-3 py-1 rounded-lg text-sm"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500">{report.pages}</span>
                      <button
                        onClick={() => handleDownload(report.id)}
                        className="flex items-center space-x-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-semibold hover:bg-slate-800 transition-all hover:shadow-lg"
                      >
                        <Download className="w-5 h-5" />
                        <span>Download {report.format}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-8">
          <h3 className="text-xl font-semibold text-slate-900 mb-4">Report Preview</h3>
          <div className="bg-white rounded-xl border border-amber-200 p-6 mb-4">
            <div className="text-sm text-slate-600 mb-4">
              <strong>Repository:</strong> {currentRepo.name}
            </div>
            <div className="text-sm text-slate-600 mb-4">
              <strong>Analysis Date:</strong> {new Date(currentAnalysis.createdAt).toLocaleString()}
            </div>
            <div className="grid grid-cols-5 gap-4">
              <div>
                <div className="text-2xl font-bold text-slate-900">{currentAnalysis.scores?.compliance?.score ?? '—'}</div>
                <div className="text-xs text-slate-600">Compliance</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900">{currentAnalysis.scores?.financialRisk?.score ?? '—'}</div>
                <div className="text-xs text-slate-600">Risk</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900">{currentAnalysis.scores?.security?.score ?? '—'}</div>
                <div className="text-xs text-slate-600">Security</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900">{currentAnalysis.scores?.codeQuality?.score ?? '—'}</div>
                <div className="text-xs text-slate-600">Quality</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900">{currentAnalysis.scores?.architecture?.score ?? '—'}</div>
                <div className="text-xs text-slate-600">Architecture</div>
              </div>
            </div>
          </div>
          <p className="text-sm text-slate-600">
            All reports include your analysis data and can be customized before export.
          </p>
        </div>

        {/* Extra: expose underlying raw sections so users can customize exports */}
        <div className="space-y-6 mt-6">
          <JsonSectionRenderer title="Full Technical Summary (for reports)" data={full.technicalSummary} />
          <JsonSectionRenderer title="Full Health Data (for reports)" data={full.health} />
          <JsonSectionRenderer title="Full Security Data (for reports)" data={full.security} />
          <JsonSectionRenderer title="Fintech Compliance (for reports)" data={full.fintech_compliance} />
        </div>
      </div>
    </div>
  );
}
