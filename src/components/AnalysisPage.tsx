import { useEffect, useState } from 'react';
import { Brain, Shield, Lock, Network, AlertTriangle, Lightbulb, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AnalysisAgent } from '../types';
import { apiService } from '../lib/api';
import { transformBackendToFrontend } from '../lib/dataTransformers';
import JsonSectionRenderer from './JsonSectionRenderer';

const AGENTS: AnalysisAgent[] = [
  {
    id: 'understanding',
    name: 'Understanding Agent',
    status: 'pending',
    progress: 0,
    description: 'Analyzing codebase structure and dependencies'
  },
  {
    id: 'compliance',
    name: 'Compliance Agent',
    status: 'pending',
    progress: 0,
    description: 'Checking RBI, PCI-DSS, KYC, GDPR compliance'
  },
  {
    id: 'security',
    name: 'Security Agent',
    status: 'pending',
    progress: 0,
    description: 'Scanning for vulnerabilities and secrets'
  },
  {
    id: 'architecture',
    name: 'Architecture Agent',
    status: 'pending',
    progress: 0,
    description: 'Evaluating design patterns and modularity'
  },
  {
    id: 'risk',
    name: 'Risk Agent',
    status: 'pending',
    progress: 0,
    description: 'Assessing financial and operational risks'
  },
  {
    id: 'recommendations',
    name: 'Recommendations Agent',
    status: 'pending',
    progress: 0,
    description: 'Generating prioritized action items'
  }
];

const AGENT_ICONS: Record<string, typeof Brain> = {
  understanding: Brain,
  compliance: Shield,
  security: Lock,
  architecture: Network,
  risk: AlertTriangle,
  recommendations: Lightbulb
};

export default function AnalysisPage() {
  const { currentRepo, setCurrentPage, setCurrentAnalysis } = useApp();
  const [agents, setAgents] = useState(AGENTS);
  const [overallProgress, setOverallProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const startAnalysis = async () => {
    if (!currentRepo) return;

    setIsAnalyzing(true);
    setError(null);
    let currentAgentIndex = 0;

    // Simulate agent progress
    const progressInterval = setInterval(() => {
      setAgents(prevAgents => {
        const newAgents = [...prevAgents];
        const currentAgent = newAgents[currentAgentIndex];

        if (currentAgent.progress < 100) {
          currentAgent.status = 'running';
          currentAgent.progress = Math.min(100, currentAgent.progress + 15);
        } else if (currentAgentIndex < newAgents.length - 1) {
          currentAgent.status = 'completed';
          currentAgentIndex++;
          newAgents[currentAgentIndex].status = 'running';
        }

        return newAgents;
      });

      const totalProgress = agents.reduce((sum, agent) => sum + agent.progress, 0) / agents.length;
      setOverallProgress(Math.round(totalProgress));
    }, 800);

    try {
      // Call backend API
      const combinedData = await apiService.analyzeRepository(currentRepo.url);
      
      // Mark all agents as completed
      setAgents(prevAgents => prevAgents.map(agent => ({
        ...agent,
        status: 'completed' as const,
        progress: 100
      })));
      setOverallProgress(100);
      clearInterval(progressInterval);

      // Transform backend data to frontend format
      const analysis = transformBackendToFrontend(combinedData, currentRepo.url);
      
      // Small delay for UX
      setTimeout(() => {
        setCurrentAnalysis(analysis);
        setCurrentPage('dashboard');
      }, 1000);
    } catch (err) {
      clearInterval(progressInterval);
      setError(err instanceof Error ? err.message : 'Analysis failed');
      setAgents(prevAgents => prevAgents.map(agent => ({
        ...agent,
        status: 'failed' as const
      })));
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    if (!currentRepo) {
      setCurrentPage('landing');
      return;
    }

    // Check if analysis already exists
    const checkExistingAnalysis = async () => {
      try {
        const existing = await apiService.getAnalysisFromDB(currentRepo.url);
        if (existing?.combined_response) {
          // Transform and use existing data
          const analysis = transformBackendToFrontend(existing.combined_response, currentRepo.url);
          setCurrentAnalysis(analysis);
          setCurrentPage('dashboard');
          return;
        }
      } catch (err: any) {
        // If DB is unavailable (503) or analysis not found (404), proceed to new analysis
        if (err.message?.includes('503') || err.message?.includes('Database not available')) {
          console.warn('Database unavailable, starting new analysis');
        } else if (err.message?.includes('404')) {
          // Analysis not found, proceed normally
        } else {
          console.error('Error checking existing analysis:', err);
        }
      }

      // Start new analysis
      startAnalysis();
    };

    checkExistingAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRepo]);

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">Analyzing Repository</h1>
          <p className="text-lg text-slate-600 mb-2">{currentRepo?.name}</p>
          <div className="flex items-center justify-center space-x-2 text-sm text-slate-500">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span>{isAnalyzing ? 'Analysis in progress...' : 'Preparing analysis...'}</span>
          </div>
        </div>

        {error && (
          <div className="mb-8 bg-red-50 border-2 border-red-200 rounded-2xl p-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-900 mb-2">Analysis Failed</h3>
                <p className="text-sm text-red-700 mb-4">{error}</p>
                <button
                  onClick={() => {
                    setError(null);
                    setAgents(AGENTS);
                    setOverallProgress(0);
                    startAnalysis();
                  }}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                >
                  Retry Analysis
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white p-6 rounded-2xl border-2 border-gray-200 shadow-sm mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-600">Overall Progress</span>
            <span className="text-sm font-semibold text-slate-900">{overallProgress}%</span>
          </div>
          <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500 ease-out"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>

        <div className="space-y-4">
          {agents.map((agent, index) => {
            const Icon = AGENT_ICONS[agent.id];
            return (
              <div
                key={agent.id}
                className="bg-white p-6 rounded-2xl border-2 border-gray-200 shadow-sm transition-all animate-fade-in-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-start space-x-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    agent.status === 'completed' ? 'bg-green-100' :
                    agent.status === 'running' ? 'bg-blue-100 animate-pulse' :
                    'bg-gray-100'
                  }`}>
                    <Icon className={`w-6 h-6 ${
                      agent.status === 'completed' ? 'text-green-600' :
                      agent.status === 'running' ? 'text-blue-600' :
                      'text-gray-400'
                    }`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold text-slate-900">{agent.name}</h3>
                      <span className={`text-xs font-medium px-3 py-1 rounded-full ${
                        agent.status === 'completed' ? 'bg-green-100 text-green-700' :
                        agent.status === 'running' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {agent.status === 'completed' ? 'Completed' :
                         agent.status === 'running' ? 'Running' :
                         'Pending'}
                      </span>
                    </div>

                    <p className="text-sm text-slate-600 mb-3">{agent.description}</p>

                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ease-out ${
                          agent.status === 'completed' ? 'bg-green-500' :
                          agent.status === 'running' ? 'bg-blue-500' :
                          'bg-gray-300'
                        }`}
                        style={{ width: `${agent.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick view of the backend payload if you want to inspect */}
        <div className="mt-8">
          <JsonSectionRenderer title="Preview: Raw Combined Payload (collapsed)" data={undefined} />
          {/* intentionally left collapsed by default; developers can toggle */}
        </div>
      </div>
    </div>
  );
}
