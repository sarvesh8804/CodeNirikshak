// import { createContext, useContext, useState, ReactNode } from 'react';
// import { Repository, AnalysisResult } from '../types';

// interface AppContextType {
//   currentRepo: Repository | null;
//   setCurrentRepo: (repo: Repository | null) => void;
//   currentAnalysis: AnalysisResult | null;
//   setCurrentAnalysis: (analysis: AnalysisResult | null) => void;
//   currentPage: string;
//   setCurrentPage: (page: string) => void;
// }

// const AppContext = createContext<AppContextType | undefined>(undefined);

// export function AppProvider({ children }: { children: ReactNode }) {
//   const [currentRepo, setCurrentRepo] = useState<Repository | null>(null);
//   const [currentAnalysis, setCurrentAnalysis] = useState<AnalysisResult | null>(null);
//   const [currentPage, setCurrentPage] = useState('landing');

//   return (
//     <AppContext.Provider
//       value={{
//         currentRepo,
//         setCurrentRepo,
//         currentAnalysis,
//         setCurrentAnalysis,
//         currentPage,
//         setCurrentPage,
//       }}
//     >
//       {children}
//     </AppContext.Provider>
//   );
// }

// export function useApp() {
//   const context = useContext(AppContext);
//   if (context === undefined) {
//     throw new Error('useApp must be used within an AppProvider');
//   }
//   return context;
// }

import { createContext, useContext, useState, ReactNode } from 'react';
import { Repository, AnalysisResult } from '../types';

interface AppContextType {
  currentRepo: Repository | null;
  setCurrentRepo: (repo: Repository | null) => void;

  currentAnalysis: AnalysisResult | null;
  setCurrentAnalysis: (analysis: AnalysisResult | null) => void;

  currentPage: string;
  setCurrentPage: (page: string) => void;

  selectedHistoryProject: any | null;               // ⭐ NEW
  setSelectedHistoryProject: (project: any | null) => void; // ⭐ NEW
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentRepo, setCurrentRepo] = useState<Repository | null>(null);
  const [currentAnalysis, setCurrentAnalysis] = useState<AnalysisResult | null>(null);
  const [currentPage, setCurrentPage] = useState('landing');

  // ⭐ NEW STATE (stores the project user clicked in History)
  const [selectedHistoryProject, setSelectedHistoryProject] = useState<any | null>(null);

  return (
    <AppContext.Provider
      value={{
        currentRepo,
        setCurrentRepo,
        currentAnalysis,
        setCurrentAnalysis,
        currentPage,
        setCurrentPage,
        selectedHistoryProject,
        setSelectedHistoryProject,    // ⭐ NEW EXPORT
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
