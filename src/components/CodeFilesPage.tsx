import { File, Code, Search } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { apiService } from '../lib/api';
import { useState, useEffect } from 'react';

interface CodeFile {
  path: string;
  content: string;
  size: number;
  language: string;
}

export default function CodeFilesPage() {
  const { currentRepo, setCurrentPage } = useApp();
  const [files, setFiles] = useState<CodeFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<CodeFile | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadFiles = async () => {
      if (!currentRepo) return;

      try {
        const analysis = await apiService.getAnalysisFromDB(currentRepo.url);
        const extractedFiles = analysis?.allstats?.extractedCode?.files || [];
        setFiles(extractedFiles);
      } catch (error) {
        console.error('Error loading files:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadFiles();
  }, [currentRepo]);

  const filteredFiles = files.filter(file =>
    file.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
    file.language.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedByLanguage = filteredFiles.reduce((acc, file) => {
    if (!acc[file.language]) {
      acc[file.language] = [];
    }
    acc[file.language].push(file);
    return acc;
  }, {} as Record<string, CodeFile[]>);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading code files...</p>
        </div>
      </div>
    );
  }

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
            <span className="text-slate-900 font-medium">Code Files</span>
          </div>
        </div>
      </nav>

      <div className="flex h-[calc(100vh-73px)]">
        <div className="w-80 border-r border-gray-200 overflow-y-auto bg-gray-50">
          <div className="p-4 border-b border-gray-200 bg-white sticky top-0">
            <div className="flex items-center space-x-2 mb-3">
              <Search className="w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-blue-500 text-sm"
              />
            </div>
            <div className="text-xs text-slate-500">
              {filteredFiles.length} of {files.length} files
            </div>
          </div>

          <div className="p-2">
            {Object.entries(groupedByLanguage).map(([language, langFiles]) => (
              <div key={language} className="mb-4">
                <div className="text-xs font-semibold text-slate-500 uppercase mb-2 px-2">
                  {language} ({langFiles.length})
                </div>
                {langFiles.map((file) => (
                  <button
                    key={file.path}
                    onClick={() => setSelectedFile(file)}
                    className={`w-full text-left px-3 py-2 rounded-lg mb-1 transition-colors ${
                      selectedFile?.path === file.path
                        ? 'bg-blue-100 text-blue-900'
                        : 'hover:bg-gray-100 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <File className="w-4 h-4 flex-shrink-0" />
                      <span className="text-sm font-mono truncate">{file.path}</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {(file.size / 1024).toFixed(1)} KB
                    </div>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50">
          {selectedFile ? (
            <div className="p-6">
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-4">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 font-mono">
                      {selectedFile.path}
                    </h3>
                    <div className="flex items-center space-x-4 mt-2 text-sm text-slate-600">
                      <span>{selectedFile.language}</span>
                      <span>{(selectedFile.size / 1024).toFixed(1)} KB</span>
                      <span>{selectedFile.content.split('\n').length} lines</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setCurrentPage('code-explorer')}
                    className="flex items-center space-x-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
                  >
                    <Code className="w-4 h-4" />
                    <span>Analyze</span>
                  </button>
                </div>
                <div className="p-6">
                  <pre className="text-sm font-mono text-slate-900 overflow-x-auto bg-slate-50 p-4 rounded-lg border border-gray-200">
                    {selectedFile.content.length > 50000
                      ? selectedFile.content.substring(0, 50000) + '\n\n... (truncated, file too large)'
                      : selectedFile.content}
                  </pre>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <File className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600">Select a file to view its contents</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

