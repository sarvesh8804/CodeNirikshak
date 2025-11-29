import { useState } from 'react';
import { ArrowLeft, File, Folder, ChevronRight, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface FileNode {
  name: string;
  type: 'file' | 'folder';
  path: string;
  children?: FileNode[];
  issues?: number;
}

const mockFileTree: FileNode[] = [
  {
    name: 'src',
    type: 'folder',
    path: 'src',
    children: [
      {
        name: 'auth',
        type: 'folder',
        path: 'src/auth',
        children: [
          { name: 'login.ts', type: 'file', path: 'src/auth/login.ts', issues: 2 },
          { name: 'register.ts', type: 'file', path: 'src/auth/register.ts', issues: 0 }
        ]
      },
      {
        name: 'config',
        type: 'folder',
        path: 'src/config',
        children: [
          { name: 'database.ts', type: 'file', path: 'src/config/database.ts', issues: 1 },
          { name: 'env.ts', type: 'file', path: 'src/config/env.ts', issues: 3 }
        ]
      },
      {
        name: 'utils',
        type: 'folder',
        path: 'src/utils',
        children: [
          { name: 'validation.ts', type: 'file', path: 'src/utils/validation.ts', issues: 0 },
          { name: 'encryption.ts', type: 'file', path: 'src/utils/encryption.ts', issues: 1 }
        ]
      }
    ]
  }
];

const mockCodeContent = `import { Database } from './types';

// ISSUE: Hardcoded database credentials (Line 4-7)
const dbConfig = {
  host: 'localhost',
  user: 'admin',
  password: 'admin123', // HIGH: Hardcoded password
  database: 'fintech_db'
};

export async function connectDB() {
  try {
    const connection = await Database.connect(dbConfig);
    return connection;
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error;
  }
}`;

function FileTreeNode({ node, selectedPath, onSelect, depth = 0 }: {
  node: FileNode;
  selectedPath: string | null;
  onSelect: (path: string) => void;
  depth?: number;
}) {
  const [isExpanded, setIsExpanded] = useState(depth === 0);

  const handleClick = () => {
    if (node.type === 'folder') {
      setIsExpanded(!isExpanded);
    } else {
      onSelect(node.path);
    }
  };

  return (
    <div>
      <button
        onClick={handleClick}
        className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-left transition-colors ${
          selectedPath === node.path
            ? 'bg-blue-100 text-blue-900'
            : 'hover:bg-gray-100 text-slate-700'
        }`}
        style={{ paddingLeft: `${depth * 16 + 12}px` }}
      >
        {node.type === 'folder' ? (
          <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
        ) : (
          <File className="w-4 h-4" />
        )}
        <span className="flex-1 text-sm font-medium">{node.name}</span>
        {node.issues !== undefined && node.issues > 0 && (
          <span className="bg-red-100 text-red-700 text-xs font-medium px-2 py-0.5 rounded-full">
            {node.issues}
          </span>
        )}
      </button>
      {node.type === 'folder' && isExpanded && node.children && (
        <div className="animate-fade-in">
          {node.children.map((child) => (
            <FileTreeNode
              key={child.path}
              node={child}
              selectedPath={selectedPath}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function CodeExplorer() {
  const { currentRepo, setCurrentPage } = useApp();
  const [selectedFile, setSelectedFile] = useState<string | null>('src/config/database.ts');
  const [activeTab, setActiveTab] = useState<'summary' | 'issues' | 'diff'>('issues');

  if (!currentRepo) {
    return null;
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
            <button
              onClick={() => setCurrentPage('details')}
              className="hover:text-slate-900 transition-colors"
            >
              Details
            </button>
            <span>/</span>
            <span className="text-slate-900 font-medium">Code Explorer</span>
          </div>
        </div>
      </nav>

      <div className="flex h-[calc(100vh-73px)]">
        <div className="w-80 border-r border-gray-200 overflow-y-auto bg-gray-50">
          <div className="p-4 border-b border-gray-200 bg-white">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center space-x-2">
              <Folder className="w-5 h-5" />
              <span>File Tree</span>
            </h2>
          </div>
          <div className="p-2">
            {mockFileTree.map((node) => (
              <FileTreeNode
                key={node.path}
                node={node}
                selectedPath={selectedFile}
                onSelect={setSelectedFile}
              />
            ))}
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="border-b border-gray-200 bg-white">
            <div className="px-6 py-3">
              <div className="flex items-center space-x-2 text-sm text-slate-600 mb-3">
                <File className="w-4 h-4" />
                <span className="font-mono">{selectedFile}</span>
              </div>
              <div className="flex space-x-1">
                <button
                  onClick={() => setActiveTab('summary')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'summary'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Summary
                </button>
                <button
                  onClick={() => setActiveTab('issues')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'issues'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  File Issues
                </button>
                <button
                  onClick={() => setActiveTab('diff')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'diff'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Before/After
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-slate-50">
            {activeTab === 'summary' && (
              <div className="p-6">
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">File Summary</h3>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-slate-600">Lines of Code:</span>
                      <span className="ml-2 text-sm text-slate-900">18</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-slate-600">Issues Found:</span>
                      <span className="ml-2 text-sm text-slate-900">1 high severity</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-slate-600">Category:</span>
                      <span className="ml-2 text-sm text-slate-900">Configuration</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'issues' && (
              <div className="p-6">
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="p-4 bg-red-50 border-b border-red-200 flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-red-900 mb-1">Hardcoded Database Credentials</div>
                      <div className="text-sm text-red-700 mb-2">Line 7: Sensitive credentials exposed in code</div>
                      <span className="inline-block bg-red-100 text-red-700 text-xs font-medium px-2 py-1 rounded">
                        HIGH SEVERITY
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <pre className="text-sm font-mono text-slate-900 overflow-x-auto">
                      {mockCodeContent}
                    </pre>
                  </div>
                </div>

                <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-6">
                  <h4 className="font-semibold text-amber-900 mb-2">💡 Recommended Fix</h4>
                  <p className="text-sm text-amber-800 mb-3">
                    Move credentials to environment variables and use a secure configuration management system.
                  </p>
                  <button className="bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors">
                    Apply Auto-Fix
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'diff' && (
              <div className="p-6">
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="grid grid-cols-2 divide-x divide-gray-200">
                    <div className="p-4">
                      <h4 className="text-sm font-semibold text-slate-900 mb-3">Before</h4>
                      <pre className="text-xs font-mono text-slate-900 bg-red-50 p-3 rounded-lg overflow-x-auto">
{`const dbConfig = {
  host: 'localhost',
  user: 'admin',
  password: 'admin123',
  database: 'fintech_db'
};`}
                      </pre>
                    </div>
                    <div className="p-4">
                      <h4 className="text-sm font-semibold text-slate-900 mb-3">After</h4>
                      <pre className="text-xs font-mono text-slate-900 bg-green-50 p-3 rounded-lg overflow-x-auto">
{`const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
};`}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 bg-white p-4">
            <button
              onClick={() => setCurrentPage('details')}
              className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Back to Details</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
