// import React, { useState } from 'react';
// import { Upload, Github, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
// import { useApp } from '../context/AppContext';
// import { Repository } from '../types';
// import { apiService } from '../lib/api';

// export default function UploadPage() {
//   const { setCurrentPage, setCurrentRepo } = useApp();
//   const [githubUrl, setGithubUrl] = useState('');
//   const [dragActive, setDragActive] = useState(false);
//   const [extractedData, setExtractedData] = useState<Repository | null>(null);
//   const [isLoading, setIsLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   const handleDrag = (e: React.DragEvent) => {
//     e.preventDefault();
//     e.stopPropagation();
//     if (e.type === 'dragenter' || e.type === 'dragover') {
//       setDragActive(true);
//     } else if (e.type === 'dragleave') {
//       setDragActive(false);
//     }
//   };

//   const handleDrop = (e: React.DragEvent) => {
//     e.preventDefault();
//     e.stopPropagation();
//     setDragActive(false);

//     if (e.dataTransfer.files && e.dataTransfer.files[0]) {
//       handleFile(e.dataTransfer.files[0]);
//     }
//   };

//   const handleFile = (file: File) => {
//     const mockRepo: Repository = {
//       id: `repo-${Date.now()}`,
//       name: file.name.replace('.zip', ''),
//       url: '',
//       languages: ['TypeScript', 'JavaScript', 'Python'],
//       fintechModules: ['UPI', 'KYC', 'Wallet', 'Auth'],
//       analyzedAt: new Date().toISOString(),
//       status: 'pending'
//     };
//     setExtractedData(mockRepo);
//   };

//   const handleGithubSubmit = async () => {
//     if (!githubUrl) return;
    
//     setIsLoading(true);
//     setError(null);
    
//     try {
//       // Validate GitHub URL format
//       const urlPattern = /^https?:\/\/github\.com\/[\w\-\.]+\/[\w\-\.]+/;
//       if (!urlPattern.test(githubUrl)) {
//         throw new Error('Please enter a valid GitHub repository URL');
//       }
      
//       const repoName = githubUrl.split('/').pop()?.replace('.git', '') || 'repository';
      
//       // Check if analysis already exists in DB (gracefully handle DB unavailable)
//       try {
//         const existingAnalysis = await apiService.getAnalysisFromDB(githubUrl);
        
//         if (existingAnalysis) {
//           // Use existing data
//           const repo: Repository = {
//             id: githubUrl,
//             name: repoName,
//             url: githubUrl,
//             languages: existingAnalysis.allstats?.extractedCode?.files?.map((f: any) => f.language) || [],
//             fintechModules: detectFintechModules(existingAnalysis),
//             analyzedAt: existingAnalysis.lastUpdated || existingAnalysis.createdAt || new Date().toISOString(),
//             status: 'completed'
//           };
//           setExtractedData(repo);
//           setIsLoading(false);
//           return;
//         }
//       } catch (dbError: any) {
//         // If DB is unavailable (503) or analysis not found (404), proceed to create new entry
//         if (dbError.message?.includes('503') || dbError.message?.includes('Database not available')) {
//           console.warn('Database unavailable, proceeding with new analysis');
//         } else if (dbError.message?.includes('404')) {
//           // Analysis not found, proceed normally
//         } else {
//           // Other errors, log but continue
//           console.warn('Error checking existing analysis:', dbError);
//         }
//       }
      
//       // Create new repository entry
//       const repo: Repository = {
//         id: githubUrl,
//         name: repoName,
//         url: githubUrl,
//         languages: [],
//         fintechModules: [],
//         analyzedAt: new Date().toISOString(),
//         status: 'pending'
//       };
//       setExtractedData(repo);
//     } catch (err) {
//       setError(err instanceof Error ? err.message : 'Failed to process repository');
//       console.error('Error:', err);
//     } finally {
//       setIsLoading(false);
//     }
//   };
  
//   const detectFintechModules = (analysis: any): string[] => {
//     const modules: string[] = [];
//     const allText = JSON.stringify(analysis).toLowerCase();
    
//     if (allText.includes('upi') || allText.includes('payment')) modules.push('UPI');
//     if (allText.includes('kyc') || allText.includes('know your customer')) modules.push('KYC');
//     if (allText.includes('wallet')) modules.push('Wallet');
//     if (allText.includes('auth') || allText.includes('authentication')) modules.push('Auth');
//     if (allText.includes('transaction')) modules.push('Transaction Processing');
//     if (allText.includes('compliance') || allText.includes('rbi')) modules.push('Compliance');
    
//     return modules.length > 0 ? modules : ['General FinTech'];
//   };

//   const startAnalysis = () => {
//     if (extractedData) {
//       setCurrentRepo(extractedData);
//       setCurrentPage('analysis');
//     }
//   };

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
//         </div>
//       </nav>

//       <div className="max-w-4xl mx-auto px-6 py-16">
//         <div className="text-center mb-12">
//           <h1 className="text-4xl font-bold text-slate-900 mb-4">Upload Repository</h1>
//           <p className="text-lg text-slate-600">
//             Provide a GitHub URL or upload a ZIP file to begin analysis
//           </p>
//         </div>

//         {error && (
//           <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-2xl p-4 flex items-start space-x-3">
//             <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
//             <div className="flex-1">
//               <h3 className="font-semibold text-red-900 mb-1">Error</h3>
//               <p className="text-sm text-red-700">{error}</p>
//             </div>
//             <button
//               onClick={() => setError(null)}
//               className="text-red-600 hover:text-red-800"
//             >
//               ×
//             </button>
//           </div>
//         )}

//         {!extractedData ? (
//           <div className="space-y-8">
//             <div className="bg-white p-8 rounded-2xl border-2 border-gray-200 shadow-sm">
//               <div className="flex items-center space-x-3 mb-4">
//                 <Github className="w-6 h-6 text-slate-900" />
//                 <h2 className="text-xl font-semibold text-slate-900">GitHub Repository</h2>
//               </div>
//               <div className="flex space-x-3">
//                 <input
//                   type="text"
//                   value={githubUrl}
//                   onChange={(e) => setGithubUrl(e.target.value)}
//                   placeholder="https://github.com/username/repository"
//                   className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:outline-none transition-colors"
//                 />
//                 <button
//                   onClick={handleGithubSubmit}
//                   disabled={!githubUrl || isLoading}
//                   className="bg-slate-900 text-white px-6 py-3 rounded-xl font-semibold hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
//                 >
//                   {isLoading ? 'Processing...' : 'Extract'}
//                 </button>
//               </div>
//             </div>

//             <div className="text-center text-slate-500 font-medium">OR</div>

//             <div
//               onDragEnter={handleDrag}
//               onDragLeave={handleDrag}
//               onDragOver={handleDrag}
//               onDrop={handleDrop}
//               className={`bg-white p-12 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${
//                 dragActive
//                   ? 'border-blue-500 bg-blue-50'
//                   : 'border-gray-300 hover:border-gray-400'
//               }`}
//             >
//               <div className="text-center">
//                 <Upload className={`w-16 h-16 mx-auto mb-4 ${dragActive ? 'text-blue-500' : 'text-slate-400'}`} />
//                 <h3 className="text-xl font-semibold text-slate-900 mb-2">
//                   Drop ZIP file here
//                 </h3>
//                 <p className="text-slate-600 mb-4">or click to browse</p>
//                 <input
//                   type="file"
//                   accept=".zip"
//                   onChange={(e) => e.target.files && handleFile(e.target.files[0])}
//                   className="hidden"
//                   id="file-upload"
//                 />
//                 <label
//                   htmlFor="file-upload"
//                   className="inline-block bg-white text-slate-900 px-6 py-3 rounded-xl font-semibold border-2 border-slate-200 hover:border-slate-300 transition-all cursor-pointer"
//                 >
//                   Choose File
//                 </label>
//               </div>
//             </div>
//           </div>
//         ) : (
//           <div className="bg-white p-8 rounded-2xl border-2 border-green-200 shadow-sm animate-fade-in">
//             <div className="flex items-center space-x-3 mb-6">
//               <CheckCircle className="w-6 h-6 text-green-600" />
//               <h2 className="text-xl font-semibold text-slate-900">Repository Extracted</h2>
//             </div>

//             <div className="space-y-4 mb-8">
//               <div>
//                 <label className="text-sm font-medium text-slate-600 block mb-1">Repository Name</label>
//                 <div className="text-lg font-semibold text-slate-900">{extractedData.name}</div>
//               </div>

//               {extractedData.url && (
//                 <div>
//                   <label className="text-sm font-medium text-slate-600 block mb-1">URL</label>
//                   <div className="text-slate-900 break-all">{extractedData.url}</div>
//                 </div>
//               )}

//               <div>
//                 <label className="text-sm font-medium text-slate-600 block mb-2">Languages Detected</label>
//                 <div className="flex flex-wrap gap-2">
//                   {extractedData.languages.map((lang) => (
//                     <span
//                       key={lang}
//                       className="bg-blue-100 text-blue-700 px-3 py-1 rounded-lg text-sm font-medium"
//                     >
//                       {lang}
//                     </span>
//                   ))}
//                 </div>
//               </div>

//               <div>
//                 <label className="text-sm font-medium text-slate-600 block mb-2">FinTech Modules</label>
//                 <div className="flex flex-wrap gap-2">
//                   {extractedData.fintechModules.map((module) => (
//                     <span
//                       key={module}
//                       className="bg-amber-100 text-amber-700 px-3 py-1 rounded-lg text-sm font-medium"
//                     >
//                       {module}
//                     </span>
//                   ))}
//                 </div>
//               </div>
//             </div>

//             <div className="flex space-x-4">
//               <button
//                 onClick={startAnalysis}
//                 className="flex-1 bg-slate-900 text-white px-6 py-4 rounded-xl font-semibold hover:bg-slate-800 transition-all hover:shadow-lg"
//               >
//                 Start Analysis
//               </button>
//               <button
//                 onClick={() => setExtractedData(null)}
//                 className="bg-white text-slate-900 px-6 py-4 rounded-xl font-semibold border-2 border-slate-200 hover:border-slate-300 transition-all"
//               >
//                 Reset
//               </button>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }


























import React, { useState } from 'react';
import { Upload, Github, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Repository } from '../types';
import { apiService } from '../lib/api';

export default function UploadPage() {
  const { setCurrentPage, setCurrentRepo } = useApp();
  const [githubUrl, setGithubUrl] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [extractedData, setExtractedData] = useState<Repository | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFile = (file: File) => {
    const repo: Repository = {
      id: `repo-${Date.now()}`,
      name: file.name.replace('.zip', ''),
      url: '',
      languages: ['TypeScript', 'JavaScript', 'Python'],
      fintechModules: ['UPI', 'KYC', 'Wallet', 'Auth'],
      analyzedAt: new Date().toISOString(),
      status: 'pending'
    };
    setExtractedData(repo);
  };

  const handleGithubSubmit = async () => {
    if (!githubUrl) return;

    setIsLoading(true);
    setError(null);

    try {
      const urlPattern = /^https?:\/\/github\.com\/[\w\-\.]+\/[\w\-\.]+/;
      if (!urlPattern.test(githubUrl)) {
        throw new Error('Please enter a valid GitHub repository URL.');
      }

      const repoName = githubUrl.split('/').pop()?.replace('.git', '') || 'repository';

      let existing = null;
      try {
        existing = await apiService.getAnalysisFromDB(githubUrl);
      } catch {}

      if (existing) {
        const repo: Repository = {
          id: githubUrl,
          name: repoName,
          url: githubUrl,
          languages:
            existing.allstats?.extractedCode?.files?.map((f: any) => f.language) || [],
          fintechModules: detectFintechModules(existing),
          analyzedAt:
            existing.lastUpdated || existing.createdAt || new Date().toISOString(),
          status: 'completed'
        };
        setExtractedData(repo);
        setIsLoading(false);
        return;
      }

      const newRepo: Repository = {
        id: githubUrl,
        name: repoName,
        url: githubUrl,
        languages: [],
        fintechModules: [],
        analyzedAt: new Date().toISOString(),
        status: 'pending'
      };
      setExtractedData(newRepo);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process repository');
    } finally {
      setIsLoading(false);
    }
  };

  const detectFintechModules = (analysis: any) => {
    const txt = JSON.stringify(analysis).toLowerCase();
    const mods = [];
    if (txt.includes('upi')) mods.push('UPI');
    if (txt.includes('kyc')) mods.push('KYC');
    if (txt.includes('wallet')) mods.push('Wallet');
    if (txt.includes('auth')) mods.push('Auth');
    if (txt.includes('transaction')) mods.push('Transaction Processing');
    if (txt.includes('rbi') || txt.includes('compliance')) mods.push('Compliance');
    return mods.length ? mods : ['General FinTech'];
  };

  const startAnalysis = () => {
    if (extractedData) {
      setCurrentRepo(extractedData);
      setCurrentPage('analysis');
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-white">

      {/* Soft gradient blobs */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-[-120px] left-[-120px] w-[400px] h-[400px] 
                        bg-[#eef2ff] blur-[120px] opacity-60 rounded-full" />
        <div className="absolute bottom-[-140px] right-[-100px] w-[420px] h-[420px] 
                        bg-[#fae8ff] blur-[130px] opacity-60 rounded-full" />
        <div className="absolute top-[40%] left-[55%] w-[300px] h-[300px] 
                        bg-[#dbeafe] blur-[140px] opacity-40 rounded-full" />
      </div>

      {/* subtle grid */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.03)_1px,transparent_1px)] 
                      bg-[size:22px_22px] opacity-[0.25]" />

      {/* soft noise */}
      <div className="absolute inset-0 -z-10 opacity-[0.07] bg-[url('/noise.png')]" />

      {/* NAV */}
      <nav className="border-b bg-white/70 backdrop-blur-md sticky top-0 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center">
          <button
            onClick={() => setCurrentPage('landing')}
            className="flex items-center gap-2 text-slate-600 hover:text-indigo-600 transition"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <div className="max-w-4xl mx-auto px-6 py-16">

        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-slate-900">Upload Repository</h1>
          <p className="text-lg text-slate-600">
            Provide a GitHub URL or upload a ZIP file to begin analysis
          </p>
        </div>

        {/* ERROR */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 shadow">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-800">Error</h3>
              <p className="text-sm text-red-700">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-500 hover:text-red-700 text-lg"
            >
              ×
            </button>
          </div>
        )}

        {/* BEFORE EXTRACTION */}
        {!extractedData ? (
          <div className="space-y-10">
            
            {/* GITHUB CARD */}
            <div className="p-8 bg-white border rounded-2xl shadow-sm hover:shadow transition">
              <div className="flex items-center gap-3 mb-4">
                <Github className="w-6 h-6 text-indigo-600" />
                <h2 className="text-xl font-semibold text-slate-900">GitHub Repository</h2>
              </div>

              <div className="flex gap-3">
                <input
                  type="text"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  placeholder="https://github.com/user/repo"
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-300 
                             focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition outline-none"
                />
                <button
                  onClick={handleGithubSubmit}
                  disabled={!githubUrl || isLoading}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-xl 
                             font-semibold shadow hover:bg-indigo-500 transition disabled:opacity-50"
                >
                  {isLoading ? 'Checking…' : 'Extract'}
                </button>
              </div>
            </div>

            <div className="text-center text-slate-400 font-medium">OR</div>

            {/* DROPZONE */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`p-12 bg-white border-2 rounded-2xl shadow-sm hover:shadow-md transition cursor-pointer ${
                dragActive
                  ? 'border-indigo-500 bg-indigo-50/40'
                  : 'border-dashed border-slate-300 hover:border-slate-400'
              }`}
            >
              <div className="text-center">
                <Upload
                  className={`w-16 h-16 mx-auto mb-4 ${
                    dragActive ? 'text-indigo-500' : 'text-slate-400'
                  }`}
                />
                <h3 className="text-xl font-semibold text-slate-900 mb-2">Drop ZIP file here</h3>
                <p className="text-slate-600 mb-4">or click to browse</p>

                <input
                  type="file"
                  accept=".zip"
                  id="file-upload"
                  className="hidden"
                  onChange={(e) => e.target.files && handleFile(e.target.files[0])}
                />
                <label
                  htmlFor="file-upload"
                  className="px-6 py-3 bg-white border border-slate-300 rounded-xl 
                             font-semibold cursor-pointer hover:bg-slate-50 transition"
                >
                  Choose File
                </label>
              </div>
            </div>
          </div>

        ) : (
          
          /* AFTER EXTRACTION */
          <div className="p-8 bg-white border rounded-2xl shadow-sm">

            <div className="flex items-center gap-3 mb-6">
              <CheckCircle className="w-6 h-6 text-emerald-600" />
              <h2 className="text-xl font-semibold text-slate-900">Repository Extracted</h2>
            </div>

            <div className="space-y-4 mb-8">

              <div>
                <label className="text-sm font-medium text-slate-600">Repository Name</label>
                <div className="text-lg font-semibold">{extractedData.name}</div>
              </div>

              {extractedData.url && (
                <div>
                  <label className="text-sm font-medium text-slate-600">URL</label>
                  <div className="text-slate-700 break-all">{extractedData.url}</div>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-slate-600">Languages</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {extractedData.languages.map((lang) => (
                    <span
                      key={lang}
                      className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-sm"
                    >
                      {lang}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-600">FinTech Modules</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {extractedData.fintechModules.map((module) => (
                    <span
                      key={module}
                      className="px-3 py-1 bg-amber-100 text-amber-700 rounded-lg text-sm"
                    >
                      {module}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={startAnalysis}
                className="flex-1 px-6 py-4 bg-indigo-600 text-white rounded-xl 
                           font-semibold shadow hover:bg-indigo-500 transition"
              >
                Start Analysis
              </button>

              <button
                onClick={() => setExtractedData(null)}
                className="px-6 py-4 bg-white border border-slate-300 rounded-xl 
                           font-semibold hover:bg-slate-50 transition"
              >
                Reset
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}

