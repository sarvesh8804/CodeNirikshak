import { AppProvider, useApp } from './context/AppContext';
import LandingPage from './components/LandingPage';
import UploadPage from './components/UploadPage';
import AnalysisPage from './components/AnalysisPage';
import Dashboard from './components/Dashboard';
import DetailsPage from './components/DetailsPage';
import CodeExplorer from './components/CodeExplorer';
import RecommendationsPage from './components/RecommendationsPage';
import ReportsPage from './components/ReportsPage';
import HistoryPage from './components/HistoryPage';
import ComparisonPage from './components/ComparisonPage';
import CodeFilesPage from './components/CodeFilesPage';

function AppRouter() {
  const { currentPage } = useApp();

  switch (currentPage) {
    case 'landing':
      return <LandingPage />;
    case 'upload':
      return <UploadPage />;
    case 'analysis':
      return <AnalysisPage />;
    case 'dashboard':
      return <Dashboard />;
    case 'details':
      return <DetailsPage />;
    case 'code-explorer':
      return <CodeExplorer />;
    case 'recommendations':
      return <RecommendationsPage />;
    case 'reports':
      return <ReportsPage />;
    case 'history':
      return <HistoryPage />;
    case 'comparison':
      return <ComparisonPage />;
    case 'code-files':
      return <CodeFilesPage />;
    default:
      return <LandingPage />;
  }
}

function App() {
  return (
    <AppProvider>
      <AppRouter />
    </AppProvider>
  );
}

export default App;
