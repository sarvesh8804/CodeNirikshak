import { useEffect, useState } from 'react';
import { ArrowLeft, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useApp } from '../context/AppContext';

// --- INTERFACES ---
interface ComparisonRepo {
  id: string;
  name: string;
  overallScore: number;
  scores: {
    compliance: number;
    financialRisk: number;
    security: number;
    codeQuality: number;
    architecture: number;
  };
}

// --- DELTA INDICATOR COMPONENT ---
function DeltaIndicator({ value, baseline }: { value: number; baseline: number }) {
  const delta = value - baseline;
  const isPositive = delta > 0;
  const isNeutral = delta === 0;

  if (isNeutral) {
    return (
      <div className="flex items-center space-x-1 text-slate-500">
        <Minus className="w-4 h-4" />
        <span className="text-sm font-medium">0</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
      {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
      <span className="text-sm font-medium">{isPositive ? '+' : ''}{delta}</span>
    </div>
  );
}

// --- UTILITY FUNCTION ---
// Helper to safely parse a value into a number (returns 0 if invalid or missing)
const safeParseScore = (value: any, defaultValue: number = 0): number => {
    const num = parseFloat(value);
    return isNaN(num) ? defaultValue : num;
};


// --- COMPARISON PAGE COMPONENT ---
export default function ComparisonPage() {
  const { setCurrentPage } = useApp();
  const [comparisonData, setComparisonData] = useState<ComparisonRepo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const categories = [
    { key: 'compliance', label: 'Compliance' },
    { key: 'financialRisk', label: 'Financial Risk' },
    { key: 'security', label: 'Security' }
  ] as const;

  const baseline = comparisonData[0] ?? null;

  useEffect(() => {
    const fetchComparison = async () => {
      try {
        const selectedIds: string[] = Array.from(
          new Set(JSON.parse(localStorage.getItem('selectedForComparison') || '[]'))
        );

        if (selectedIds.length === 0) {
          setError('No repositories selected for comparison');
          setLoading(false);
          return;
        }

        const res = await fetch(`http://localhost:8000/repos?ids=${selectedIds.join(',')}`);
        const json = await res.json();
        
        const rawRecords: any[] = Array.isArray(json?.records) ? json.records : [];

        const mappedData: ComparisonRepo[] = rawRecords.map((record, i) => {
            
            // A. Name & ID
            const repoName = record.allstats?.extractedCode?.repository?.name ?? `Repo ${i + 1}`;
            const repoId = record._id || `temp-id-${i}`;

            // B. Dynamic Score Extraction (MAPPING TO THE CONFIRMED BACKEND STRUCTURE)
            
            // 1. Compliance Score (e.g., 65)
            // Path: record.fintech_compliance.fintechComplianceAI.complianceScore
            const compliance = safeParseScore(record.fintech_compliance?.fintechComplianceAI?.complianceScore);
            
            // 2. Financial Risk Score
            // Path: record.feasibility.successProbability (e.g., 25)
            const financialRisk = safeParseScore(record.feasibility?.successProbability);
            
            // 3. Security Score (Using Compliance Score as a proxy since Security Score is often tied to compliance in FinTech audits)
            const security = compliance; // Use compliance score as proxy for security
            
            // C. Code Quality & Architecture (Still using static placeholders)
            // THESE WILL REMAIN 75 and 85 UNLESS YOU ADD THEM TO YOUR DB DOCS.
            const codeQuality = safeParseScore(record.technicalSummary?.codeQualityScore, 75); 
            const architecture = safeParseScore(record.technicalSummary?.architectureScore, 85); 

            // D. Assemble Final Scores Object
            const finalScores = {
                compliance: compliance,
                financialRisk: financialRisk,
                security: security,
              
            };
            
            // E. Calculate Overall Score (Average of the 5 metrics)
            const scoreValues = [finalScores.compliance, finalScores.financialRisk, finalScores.security];
            const validScores = scoreValues.filter(score => typeof score === 'number');
            
            const overallScore = validScores.length > 0 
                ? validScores.reduce((sum, current) => sum + current, 0) / validScores.length 
                : 0;

            // --- FINAL REPO OBJECT ---
            return {
                id: repoId,
                name: repoName,
                overallScore: Math.round(overallScore), 
                scores: finalScores,
            } as ComparisonRepo;
        });

        setComparisonData(mappedData);
      } catch (err: any) {
        setError(err.message || 'Failed to load comparison data');
      } finally {
        setLoading(false);
      }
    };

    fetchComparison();
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading comparison…</div>;
  if (error) return <div className="min-h-screen flex flex-col items-center justify-center text-red-600">{error}</div>;
  if (comparisonData.length === 0) return <div className="min-h-screen flex items-center justify-center text-slate-500">No comparison data available</div>;

  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <button
            onClick={() => setCurrentPage('history')}
            className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to History</span>
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold text-slate-900 mb-4">Repository Comparison</h1>
        <p className="text-lg text-slate-600 mb-8">
          Side-by-side analysis of {comparisonData.length} {comparisonData.length === 1 ? 'repository' : 'repositories'}
        </p>

        <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-sm overflow-auto mb-8">
          <table className="w-full">
            <thead className="bg-gray-50 border-b-2 border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold sticky left-0 bg-gray-50 z-10">Metric</th>
                {comparisonData.map((repo, i) => (
                  <th key={repo.id || i} className="px-6 py-4 text-center text-sm font-semibold min-w-[200px]">{repo.name}</th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">
              <tr className="bg-blue-50">
                <td className="px-6 py-4 text-sm font-semibold sticky left-0 bg-blue-50 z-10">Overall Score</td>
                {comparisonData.map((repo, i) => (
                  <td key={`overall-${repo.id || i}`} className="px-6 py-4 text-center">
                    <div className="text-2xl font-bold text-blue-600 mb-1">{repo.overallScore ?? '-'}</div>
                    {baseline && repo.id !== baseline.id && (
                      <DeltaIndicator value={repo.overallScore ?? 0} baseline={baseline.overallScore ?? 0} />
                    )}
                  </td>
                ))}
              </tr>

              {categories.map((category) => (
                <tr key={category.key} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium sticky left-0 bg-white hover:bg-gray-50 z-10">{category.label}</td>
                  {comparisonData.map((repo, i) => (
                    <td key={`${category.key}-${repo.id || i}`} className="px-6 py-4 text-center">
                      <div className="text-xl font-semibold text-slate-900 mb-1">
                        {repo.scores?.[category.key] ?? '-'}
                      </div>
                      {baseline && repo.id !== baseline.id && (
                        <DeltaIndicator
                          value={repo.scores?.[category.key] ?? 0}
                          baseline={baseline.scores?.[category.key] ?? 0}
                        />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}