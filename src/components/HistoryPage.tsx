// import { useState, useEffect } from 'react';
// import { ArrowLeft, Search, TrendingUp, TrendingDown, Minus } from 'lucide-react';
// import { useApp } from '../context/AppContext';

// interface HistoricalScan {
//   id: string;
//   repoName: string;
//   url: string;
//   analyzedAt: string;
//   overallScore: number;
//   trend: 'up' | 'down' | 'stable';
//   sparklineData: number[];
// }

// function Sparkline({ data, color }: { data: number[]; color: string }) {
//   const max = Math.max(...data);
//   const min = Math.min(...data);
//   const range = max - min || 1;
//   const width = 100;
//   const height = 30;

//   const points = data
//     .map((value, index) => {
//       const x = (index / (data.length - 1)) * width;
//       const y = height - ((value - min) / range) * height;
//       return `${x},${y}`;
//     })
//     .join(' ');

//   return (
//     <svg width={width} height={height} className="inline-block">
//       <polyline
//         points={points}
//         fill="none"
//         stroke={color}
//         strokeWidth="2"
//         strokeLinecap="round"
//         strokeLinejoin="round"
//       />
//     </svg>
//   );
// }

// // ---------------------------------------------------------------------------
// // NEW REAL TREND + REAL SPARKLINE LOGIC
// // ---------------------------------------------------------------------------

// /** Compute trend from real past score → present score */
// const getTrendFromScores = (scores: number[]): 'up' | 'down' | 'stable' => {
//   if (scores.length < 2) return 'stable';
//   const first = scores[0];
//   const last = scores[scores.length - 1];

//   if (last > first) return 'up';
//   if (last < first) return 'down';
//   return 'stable';
// };

// /** Generate sparkline based on real historical scores */
// const buildSparkline = (scores: number[]): number[] => {
//   if (scores.length === 0) return [70, 70, 70, 70, 70];
//   if (scores.length === 1) return Array(5).fill(scores[0]);

//   // If user has many historical scores → shrink into 5 points
//   const step = Math.max(1, Math.floor(scores.length / 5));

//   const condensed = [];
//   for (let i = 0; i < scores.length; i += step) {
//     condensed.push(scores[i]);
//   }

//   // Ensure exactly 5 points  
//   while (condensed.length < 5) condensed.push(condensed[condensed.length - 1]);
//   return condensed.slice(0, 5);
// };

// // ---------------------------------------------------------------------------

// export default function HistoryPage() {
//   const { setCurrentPage, setCurrentRepo } = useApp();
//   const [history, setHistory] = useState<HistoricalScan[]>([]);
//   const [searchQuery, setSearchQuery] = useState('');
//   const [selectedForComparison, setSelectedForComparison] = useState<string[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string>('');

//   const extractRepoName = (item: any): string => {
//     const nameFromRepo =
//       item?.allstats?.extractedCode?.repository?.name ||
//       item?.allstats?.extractedCode?.repository?.full_name;

//     if (nameFromRepo) return nameFromRepo;

//     if (typeof item.githubUrl === 'string') {
//       return item.githubUrl.split('/').pop() || 'Unknown Repo';
//     }

//     return 'Unknown Repo';
//   };

//   const extractAnalyzedAt = (item: any): string => {
//     return (
//       item?.lastUpdated ||
//       item?.allstats?.extractedCode?.extractedAt ||
//       item?.createdAt ||
//       new Date().toISOString()
//     );
//   };

//   const computeScore = (item: any): number => {
//     const scores: number[] = [];

//     if (item?.health?.healthScore) scores.push(item.health.healthScore);
//     if (item?.feasibility?.feasibility?.startupSuccessProbability)
//       scores.push(item.feasibility.feasibility.startupSuccessProbability);
//     if (item?.feasibility?.feasibility?.investorReadinessScore)
//       scores.push(item.feasibility.feasibility.investorReadinessScore);
//     if (item?.compliance?.complianceScore)
//       scores.push(item.compliance.complianceScore);

//     if (scores.length === 0) return 70;

//     return Math.round(
//       Math.min(100, Math.max(0, scores.reduce((a, b) => a + b) / scores.length))
//     );
//   };

//   useEffect(() => {
//     const load = async () => {
//       try {
//         const res = await fetch('http://localhost:8000/history');
//         const json = await res.json();
//         const docs = Array.isArray(json) ? json : json.records ?? [];

//         // Extract all scores for sparkline & trend
//         const mapped: HistoricalScan[] = docs.map((item:any) => {
//           const score = computeScore(item);

//           // NEW: use real score history if backend provides it
//           const historyScores: number[] =
//             item?.scoreHistory?.length > 0
//               ? item.scoreHistory
//               : [score]; // fallback

//           const sparklineData = buildSparkline(historyScores);
//           const trend = getTrendFromScores(historyScores);

//           return {
//             id: item._id,
//             repoName: extractRepoName(item),
//             url: item.githubUrl,
//             analyzedAt: extractAnalyzedAt(item),
//             overallScore: score,
//             trend,
//             sparklineData,
//           };
//         });

//         setHistory(mapped);
//       } catch (err: any) {
//         setError(err.message || 'Failed to load history');
//       } finally {
//         setLoading(false);
//       }
//     };

//     load();
//   }, []);

//   const filteredHistory = history.filter((scan) =>
//     scan.repoName.toLowerCase().includes(searchQuery.toLowerCase())
//   );

// const toggleComparison = (id: string) => {
//   setSelectedForComparison((prev) => {
//     let newSelection;
//     if (prev.includes(id)) {
//       newSelection = prev.filter((i) => i !== id);
//     } else {
//       newSelection = prev.length < 3 ? [...prev, id] : prev;
//     }

//     // Save to localStorage so ComparisonPage can read it
//     localStorage.setItem('selectedForComparison', JSON.stringify(newSelection));
//     return newSelection;
//   });
// };


//   const getScoreColor = (score: number) => {
//     if (score >= 90) return 'text-green-600';
//     if (score >= 75) return 'text-blue-600';
//     if (score >= 60) return 'text-amber-600';
//     return 'text-red-600';
//   };

//   const getSparklineColor = (score: number) => {
//     if (score >= 90) return '#16a34a';
//     if (score >= 75) return '#2563eb';
//     if (score >= 60) return '#d97706';
//     return '#dc2626';
//   };

//   // UI RENDER =================================================================

//   if (loading)
//     return (
//       <div className="min-h-screen flex items-center justify-center text-slate-600 text-lg">
//         Loading history…
//       </div>
//     );

//   if (error)
//     return (
//       <div className="min-h-screen flex flex-col items-center justify-center text-red-600 text-lg">
//         <p className="mb-4">Failed to load analysis history.</p>
//         <p className="text-sm text-slate-500">{error}</p>
//       </div>
//     );

//   return (
//     <div className="min-h-screen bg-white">
//       <nav className="border-b border-gray-200">
//         <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
//           <button
//             onClick={() => setCurrentPage('landing')}
//             className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 transition-colors"
//           >
//             <ArrowLeft className="w-5 h-5" />
//             <span>Back to Home</span>
//           </button>

//           {selectedForComparison.length >= 2 && (
//             <button
//               onClick={() => setCurrentPage('comparison')}
//               className="bg-slate-900 text-white px-6 py-2 rounded-lg font-semibold hover:bg-slate-800 transition-all"
//             >
//               Compare Selected ({selectedForComparison.length})
//             </button>
//           )}
//         </div>
//       </nav>

//       <div className="max-w-6xl mx-auto px-6 py-16">
//         <div className="mb-12">
//           <h1 className="text-4xl font-bold text-slate-900 mb-4">Analysis History</h1>
//           <p className="text-lg text-slate-600 mb-6">
//             View and compare your previous repository scans
//           </p>

//           <div className="relative">
//             <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
//             <input
//               type="text"
//               value={searchQuery}
//               onChange={(e) => setSearchQuery(e.target.value)}
//               placeholder="Search repositories..."
//               className="w-full pl-12 pr-4 py-4 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:outline-none transition-colors"
//             />
//           </div>
//         </div>

//         <div className="space-y-4">
//           {filteredHistory.map((scan, index) => (
//             <div
//               key={scan.id}
//               className={`bg-white p-6 rounded-2xl border-2 shadow-sm hover:shadow-md transition-all ${
//                 selectedForComparison.includes(scan.id)
//                   ? 'border-blue-400 bg-blue-50'
//                   : 'border-gray-200 hover:border-gray-300'
//               }`}
//             >
//               <div className="flex items-center space-x-6">
//                 <input
//                   type="checkbox"
//                   checked={selectedForComparison.includes(scan.id)}
//                   onChange={() => toggleComparison(scan.id)}
//                   className="w-5 h-5 rounded border-gray-300 text-blue-600"
//                 />

//                 <div className="flex-1 min-w-0">
//                   <button
//                     onClick={() =>
//                       setCurrentRepo({
//                         id: scan.id,
//                         name: scan.repoName,
//                         url: scan.url,
//                         languages: ['TypeScript', 'JavaScript'],
//                         fintechModules: ['Payment', 'KYC', 'Auth'],
//                         analyzedAt: scan.analyzedAt,
//                         status: 'completed',
//                       })
//                     }
//                     className="text-left w-full"
//                   >
//                     <div className="flex items-start justify-between mb-2">
//                       <div>
//                         <h3 className="text-xl font-semibold text-slate-900">
//                           {scan.repoName}
//                         </h3>
//                         <p className="text-sm text-slate-600">{scan.url}</p>
//                       </div>

//                       {scan.trend === 'up' && (
//                         <TrendingUp className="w-6 h-6 text-green-600" />
//                       )}
//                       {scan.trend === 'down' && (
//                         <TrendingDown className="w-6 h-6 text-red-600" />
//                       )}
//                       {scan.trend === 'stable' && (
//                         <Minus className="w-6 h-6 text-slate-400" />
//                       )}
//                     </div>

//                     <div className="flex items-center justify-between">
//                       <div className="flex items-center space-x-6">
//                         <div>
//                           <div
//                             className={`text-3xl font-bold ${getScoreColor(
//                               scan.overallScore
//                             )}`}
//                           >
//                             {scan.overallScore}
//                           </div>
//                           <div className="text-xs text-slate-500">
//                             Overall Score
//                           </div>
//                         </div>

//                         <div>
//                           <Sparkline
//                             data={scan.sparklineData}
//                             color={getSparklineColor(scan.overallScore)}
//                           />
//                           <div className="text-xs text-slate-500 text-center mt-1">
//                             Trend
//                           </div>
//                         </div>
//                       </div>

//                       <div className="text-sm text-slate-500">
//                         {new Date(scan.analyzedAt).toLocaleDateString('en-US', {
//                           month: 'short',
//                           day: 'numeric',
//                           year: 'numeric',
//                           hour: '2-digit',
//                           minute: '2-digit',
//                         })}
//                       </div>
//                     </div>
//                   </button>
//                 </div>
//               </div>
//             </div>
//           ))}
//         </div>

//         {filteredHistory.length === 0 && (
//           <div className="text-center py-16">
//             <Search className="w-16 h-16 text-slate-400 mx-auto mb-4" />
//             <h3 className="text-xl font-semibold text-slate-900">No results found</h3>
//             <p className="text-slate-600">Try adjusting your search query</p>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

import { useState, useEffect, useCallback } from 'react'; // Import useCallback
import { ArrowLeft, Search, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { apiService } from '../lib/api'; // Assuming apiService is available as per dashboard.tsx

interface HistoricalScan {
  id: string;
  repoName: string;
  url: string;
  analyzedAt: string;
  overallScore: number;
  trend: 'up' | 'down' | 'stable';
  sparklineData: number[];
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const width = 100;
  const height = 30;

  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} className="inline-block">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// REAL TREND + REAL SPARKLINE LOGIC (Unchanged from your snippet)
// ---------------------------------------------------------------------------

/** Compute trend from real past score → present score */
const getTrendFromScores = (scores: number[]): 'up' | 'down' | 'stable' => {
  if (scores.length < 2) return 'stable';
  const first = scores[0];
  const last = scores[scores.length - 1];

  if (last > first) return 'up';
  if (last < first) return 'down';
  return 'stable';
};

/** Generate sparkline based on real historical scores */
const buildSparkline = (scores: number[]): number[] => {
  if (scores.length === 0) return [70, 70, 70, 70, 70];
  if (scores.length === 1) return Array(5).fill(scores[0]);

  const step = Math.max(1, Math.floor(scores.length / 5));

  const condensed = [];
  for (let i = 0; i < scores.length; i += step) {
    condensed.push(scores[i]);
  }

  while (condensed.length < 5) condensed.push(condensed[condensed.length - 1]);
  return condensed.slice(0, 5);
};

// ---------------------------------------------------------------------------

export default function HistoryPage() {
  const { setCurrentPage, setCurrentRepo, setCurrentAnalysis } = useApp(); // Destructure setCurrentAnalysis
  const [history, setHistory] = useState<HistoricalScan[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedForComparison, setSelectedForComparison] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [loadingId, setLoadingId] = useState<string | null>(null); // To track which item is loading

  // ... (Extractors and computeScore functions remain the same)
  const extractRepoName = (item: any): string => {
    const nameFromRepo =
      item?.allstats?.extractedCode?.repository?.name ||
      item?.allstats?.extractedCode?.repository?.full_name;

    if (nameFromRepo) return nameFromRepo;

    if (typeof item.githubUrl === 'string') {
      return item.githubUrl.split('/').pop() || 'Unknown Repo';
    }

    return 'Unknown Repo';
  };

  const extractAnalyzedAt = (item: any): string => {
    return (
      item?.lastUpdated ||
      item?.allstats?.extractedCode?.extractedAt ||
      item?.createdAt ||
      new Date().toISOString()
    );
  };

  const computeScore = (item: any): number => {
    const scores: number[] = [];

    if (item?.health?.healthScore) scores.push(item.health.healthScore);
    if (item?.feasibility?.feasibility?.startupSuccessProbability)
      scores.push(item.feasibility.feasibility.startupSuccessProbability);
    if (item?.feasibility?.feasibility?.investorReadinessScore)
      scores.push(item.feasibility.feasibility.investorReadinessScore);
    if (item?.compliance?.complianceScore)
      scores.push(item.compliance.complianceScore);

    if (scores.length === 0) return 70;

    return Math.round(
      Math.min(100, Math.max(0, scores.reduce((a, b) => a + b) / scores.length))
    );
  };
  // ... (End of helper functions)


  // 🚀 NEW FUNCTION TO LOAD DASHBOARD
  const loadDashboardForScan = useCallback(async (scan: HistoricalScan) => {
    setLoadingId(scan.id);
    try {
      // 1. Fetch full analysis data from the backend
      const fullAnalysis = await apiService.getAnalysisFromDB(scan.url);

      if (!fullAnalysis) {
        throw new Error('Analysis data not found for this scan.');
      }

      // 2. Map full data to the expected currentAnalysis structure
      const mappedAnalysis = {
          // This structure is based on how Dashboard uses currentAnalysis
          repoUrl: scan.url,
          createdAt: fullAnalysis.createdAt,
          lastUpdated: fullAnalysis.lastUpdated || fullAnalysis.createdAt,
          scores: fullAnalysis.scores || {}, // Ensure scores exist for ScoreCard rendering
          recommendations: fullAnalysis.recommendations || [], // Ensure recommendations exist for Quick Insights
          fullData: fullAnalysis.combined_response || fullAnalysis, // Pass the full data for Dashboard's useEffect
      };

      // 3. Update App Context states
      setCurrentAnalysis(mappedAnalysis);
      setCurrentRepo({
        id: scan.id,
        name: scan.repoName,
        url: scan.url,
        languages: fullAnalysis.languages || ['Unknown'], // Use real data if available, fallback otherwise
        fintechModules: fullAnalysis.fintechModules || ['Unknown'],
        analyzedAt: scan.analyzedAt,
        status: 'completed',
      });
      setCurrentPage('dashboard'); // 4. Navigate to dashboard

    } catch (error) {
      console.error('Error loading historical analysis for dashboard:', error);
      alert('Could not load detailed analysis for this project.');
    } finally {
      setLoadingId(null);
    }
  }, [setCurrentAnalysis, setCurrentRepo, setCurrentPage]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('http://localhost:8000/history');
        const json = await res.json();
        const docs = Array.isArray(json) ? json : json.records ?? [];

        // Extract all scores for sparkline & trend
        const mapped: HistoricalScan[] = docs.map((item:any) => {
          const score = computeScore(item);

          // NEW: use real score history if backend provides it
          const historyScores: number[] =
            item?.scoreHistory?.length > 0
              ? item.scoreHistory
              : [score]; // fallback

          const sparklineData = buildSparkline(historyScores);
          const trend = getTrendFromScores(historyScores);

          return {
            id: item._id,
            repoName: extractRepoName(item),
            url: item.githubUrl,
            analyzedAt: extractAnalyzedAt(item),
            overallScore: score,
            trend,
            sparklineData,
          };
        });

        setHistory(mapped);
      } catch (err: any) {
        setError(err.message || 'Failed to load history');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const filteredHistory = history.filter((scan) =>
    scan.repoName.toLowerCase().includes(searchQuery.toLowerCase())
  );

const toggleComparison = (id: string) => {
  setSelectedForComparison((prev) => {
    let newSelection;
    if (prev.includes(id)) {
      newSelection = prev.filter((i) => i !== id);
    } else {
      newSelection = prev.length < 3 ? [...prev, id] : prev;
    }

    // Save to localStorage so ComparisonPage can read it
    localStorage.setItem('selectedForComparison', JSON.stringify(newSelection));
    return newSelection;
  });
};


  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-blue-600';
    if (score >= 60) return 'text-amber-600';
    return 'text-red-600';
  };

  const getSparklineColor = (score: number) => {
    if (score >= 90) return '#16a34a';
    if (score >= 75) return '#2563eb';
    if (score >= 60) return '#d97706';
    return '#dc2626';
  };

  // UI RENDER =================================================================

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-600 text-lg">
        Loading history…
      </div>
    );

  if (error)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-red-600 text-lg">
        <p className="mb-4">Failed to load analysis history.</p>
        <p className="text-sm text-slate-500">{error}</p>
      </div>
    );

  return (
    <div className="min-h-screen bg-white">
      {/* ... (Navigation and Header remain the same) ... */}
      <nav className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => setCurrentPage('landing')}
            className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Home</span>
          </button>

          {selectedForComparison.length >= 2 && (
            <button
              onClick={() => setCurrentPage('comparison')}
              className="bg-slate-900 text-white px-6 py-2 rounded-lg font-semibold hover:bg-slate-800 transition-all"
            >
              Compare Selected ({selectedForComparison.length})
            </button>
          )}
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">Analysis History</h1>
          <p className="text-lg text-slate-600 mb-6">
            View and compare your previous repository scans
          </p>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search repositories..."
              className="w-full pl-12 pr-4 py-4 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:outline-none transition-colors"
            />
          </div>
        </div>

        <div className="space-y-4">
          {filteredHistory.map((scan, index) => (
            <div
              key={scan.id}
              className={`bg-white p-6 rounded-2xl border-2 shadow-sm hover:shadow-md transition-all ${
                selectedForComparison.includes(scan.id)
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              } ${loadingId === scan.id ? 'opacity-70 cursor-wait' : ''}`}
            >
              <div className="flex items-center space-x-6">
                <input
                  type="checkbox"
                  checked={selectedForComparison.includes(scan.id)}
                  onChange={() => toggleComparison(scan.id)}
                  className="w-5 h-5 rounded border-gray-300 text-blue-600"
                />

                <div className="flex-1 min-w-0">
                  {/* 👇 MODIFIED BUTTON to use the new function */}
                  <button
                    onClick={() => loadDashboardForScan(scan)}
                    disabled={loadingId !== null} // Disable all buttons while one is loading
                    className="text-left w-full"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-xl font-semibold text-slate-900">
                          {scan.repoName}
                        </h3>
                        <p className="text-sm text-slate-600">{scan.url}</p>
                      </div>

                      {scan.trend === 'up' && (
                        <TrendingUp className="w-6 h-6 text-green-600" />
                      )}
                      {scan.trend === 'down' && (
                        <TrendingDown className="w-6 h-6 text-red-600" />
                      )}
                      {scan.trend === 'stable' && (
                        <Minus className="w-6 h-6 text-slate-400" />
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-6">
                        <div>
                          <div
                            className={`text-3xl font-bold ${getScoreColor(
                              scan.overallScore
                            )}`}
                          >
                            {scan.overallScore}
                          </div>
                          <div className="text-xs text-slate-500">
                            Overall Score
                          </div>
                        </div>

                        <div>
                          <Sparkline
                            data={scan.sparklineData}
                            color={getSparklineColor(scan.overallScore)}
                          />
                          <div className="text-xs text-slate-500 text-center mt-1">
                            Trend
                          </div>
                        </div>
                      </div>

                      <div className="text-sm text-slate-500">
                        {/* Show "Loading..." instead of date if it's the item being loaded */}
                        {loadingId === scan.id ? (
                            <span className='text-blue-600 font-medium'>Loading...</span>
                        ) : (
                            new Date(scan.analyzedAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                            })
                        )}
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredHistory.length === 0 && (
          <div className="text-center py-16">
            <Search className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900">No results found</h3>
            <p className="text-slate-600">Try adjusting your search query</p>
          </div>
        )}
      </div>
    </div>
  );
}