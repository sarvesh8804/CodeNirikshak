import { useEffect, useState } from 'react';
import { ArrowLeft, FileText, Download, ChevronRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ScoreCard as ScoreCardType } from '../types';
import { apiService } from '../lib/api';
import JsonSectionRenderer from './JsonSectionRenderer';

function ScoreCard({ card, delay }: { card: ScoreCardType; delay: number }) {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    const duration = 1500;
    const steps = 60;
    const increment = card.score / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= card.score) {
        setAnimatedScore(card.score);
        clearInterval(timer);
      } else {
        setAnimatedScore(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [card.score]);

  const percentage = (card.score / card.maxScore) * 100;
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const getColor = () => {
    switch (card.status) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'warning': return 'text-amber-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStrokeColor = () => {
    switch (card.status) {
      case 'excellent': return '#16a34a';
      case 'good': return '#2563eb';
      case 'warning': return '#d97706';
      case 'critical': return '#dc2626';
      default: return '#6b7280';
    }
  };

  return (
    <div
      className="bg-white p-6 rounded-2xl border-2 border-gray-200 shadow-sm hover:shadow-md transition-all animate-fade-in-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <h3 className="text-sm font-medium text-slate-600 mb-4">{card.title}</h3>
      <div className="flex items-center justify-center mb-4">
        <div className="relative w-32 h-32">
          <svg className="transform -rotate-90 w-32 h-32">
            <circle
              cx="64"
              cy="64"
              r="45"
              stroke="#e5e7eb"
              strokeWidth="8"
              fill="none"
            />
            <circle
              cx="64"
              cy="64"
              r="45"
              stroke={getStrokeColor()}
              strokeWidth="8"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className={`text-3xl font-bold ${getColor()}`}>{animatedScore}</div>
              <div className="text-xs text-slate-500">/ {card.maxScore}</div>
            </div>
          </div>
        </div>
      </div>
      <div className={`text-center text-sm font-medium ${getColor()}`}>
        {card.status === 'excellent' && 'Excellent'}
        {card.status === 'good' && 'Good'}
        {card.status === 'warning' && 'Needs Attention'}
        {card.status === 'critical' && 'Critical'}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { currentAnalysis, currentRepo, setCurrentPage } = useApp();
  const [fullData, setFullData] = useState<any>(null);

  useEffect(() => {
    if (!currentAnalysis) return;

    const fetchFullData = async () => {
      try {
        if (currentAnalysis.fullData) {
          // Data already loaded from transformation
          setFullData(currentAnalysis.fullData);
        } else if (currentRepo) {
          // Fetch from API if not already loaded
          const analysis = await apiService.getAnalysisFromDB(currentRepo.url);
          if (analysis?.combined_response) {
            setFullData(analysis.combined_response);
          }
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      }
    };

    fetchFullData();
  }, [currentAnalysis, currentRepo]);

  if (!currentAnalysis || !currentRepo) {
    return null;
  }

  const scores = Object.values(currentAnalysis.scores ?? {});

  // Utility safe getters
  const full = fullData ?? currentAnalysis.fullData ?? {};
  const tech = full.technicalSummary ?? {};
  const extracted = full.extractedCode ?? {};
  const health = full.health ?? {};
  const security = full.security ?? {};
  const feasibility = full.feasibility ?? {};
  const cost = full.cost ?? {};
  const compliance = full.fintech_compliance ?? {};

  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => setCurrentPage('landing')}
            className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Home</span>
          </button>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setCurrentPage('history')}
              className="text-slate-600 hover:text-slate-900 transition-colors"
            >
              History
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Analysis Results</h1>
          <p className="text-lg text-slate-600">{currentRepo.name}</p>
          <p className="text-sm text-slate-500">
            Analyzed on {new Date(currentAnalysis.createdAt).toLocaleString()}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-12">
          {scores.map((score: any, index: number) => (
            <ScoreCard key={score.title ?? index} card={score} delay={index * 100} />
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <button
            onClick={() => setCurrentPage('details')}
            className="bg-white p-8 rounded-2xl border-2 border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all text-left group"
          >
            <div className="flex items-center justify-between mb-4">
              <FileText className="w-8 h-8 text-blue-600" />
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-900 transition-colors" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">View Details</h3>
            <p className="text-slate-600">
              Explore detailed breakdowns of compliance, security, and quality metrics
            </p>
          </button>

          <button
            onClick={() => setCurrentPage('recommendations')}
            className="bg-white p-8 rounded-2xl border-2 border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all text-left group"
          >
            <div className="flex items-center justify-between mb-4">
              <FileText className="w-8 h-8 text-amber-600" />
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-900 transition-colors" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">View Recommendations</h3>
            <p className="text-slate-600">
              See prioritized action items with timelines and auto-fix options
            </p>
          </button>

          <button
            onClick={() => setCurrentPage('reports')}
            className="bg-white p-8 rounded-2xl border-2 border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all text-left group"
          >
            <div className="flex items-center justify-between mb-4">
              <Download className="w-8 h-8 text-green-600" />
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-900 transition-colors" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Export Reports</h3>
            <p className="text-slate-600">
              Download executive summaries, developer reports,or raw JSON data
            </p>
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <button
            onClick={() => setCurrentPage('code-files')}
            className="bg-white p-8 rounded-2xl border-2 border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all text-left group"
          >
            <div className="flex items-center justify-between mb-4">
              <FileText className="w-8 h-8 text-purple-600" />
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-900 transition-colors" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">View Code Files</h3>
            <p className="text-slate-600">
              Browse extracted code files from the repository
            </p>
          </button>
        </div>

        <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-8 mb-8">
          <h3 className="text-xl font-semibold text-slate-900 mb-4">Quick Insights</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <div className="text-3xl font-bold text-slate-900 mb-1">
                {Array.isArray(security?.securityAI?.highRisks) ? security.securityAI.highRisks.length : 0}
              </div>
              <div className="text-sm text-slate-600">High Risk Items</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-slate-900 mb-1">
                {Array.isArray(currentAnalysis.recommendations) ? currentAnalysis.recommendations.filter((r:any) => r.priority === 'P0').length : 0}
              </div>
              <div className="text-sm text-slate-600">Critical Recommendations</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-slate-900 mb-1">
                {Array.isArray(currentAnalysis.recommendations) ? currentAnalysis.recommendations.filter((r:any) => r.autoFixAvailable).length : 0}
              </div>
              <div className="text-sm text-slate-600">Auto-Fix Available</div>
            </div>
          </div>
        </div>

        {/* === NEW: Detailed collapsible sections showing full data pieces from your JSON === */}
        <div className="space-y-6">
          <JsonSectionRenderer title="Technical Summary" data={tech} />
          <JsonSectionRenderer title="Extracted Code Summary" data={{
            repository: extracted.repository,
            totalFiles: extracted.totalFiles,
            totalSize: extracted.totalSize,
            extractedAt: extracted.extractedAt
          }} />
          <JsonSectionRenderer title="Health Details" data={health} />
          <JsonSectionRenderer title="Security Details" data={security} />
          <JsonSectionRenderer title="Feasibility Summary" data={feasibility} />
          <JsonSectionRenderer title="Cost Analysis" data={cost} />
          <JsonSectionRenderer title="FinTech Compliance" data={compliance} />
          <JsonSectionRenderer title="Repo Metadata / Links" data={{
            githubUrl: currentAnalysis.repoUrl ?? currentRepo.url,
            createdAt: currentAnalysis.createdAt,
            lastUpdated: currentAnalysis.lastUpdated
          }} />
        </div>
      </div>
    </div>
  );
}
