const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface CombinedAnalysisResponse {
  allstats: any;
  health: any;
  security: any;
  feasibility: any;
  cost: any;
  fintech_compliance: any;
}

export interface MongoDBAnalysisResult {
  githubUrl: string;
  allstats?: any;
  health?: any;
  security?: any;
  feasibility?: any;
  cost?: any;
  fintech_compliance?: any;
  combined_response?: CombinedAnalysisResponse;
  createdAt?: string;
  lastUpdated?: string;
}

class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  async analyzeRepository(githubUrl: string): Promise<CombinedAnalysisResponse> {
    const response = await fetch(`${this.baseUrl}/combined`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ github_url: githubUrl }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async getAnalysisFromDB(githubUrl: string): Promise<MongoDBAnalysisResult | null> {
    const response = await fetch(`${this.baseUrl}/analysis/${encodeURIComponent(githubUrl)}`);

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async getAllAnalyses(): Promise<MongoDBAnalysisResult[]> {
    const response = await fetch(`${this.baseUrl}/analyses`);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }
}

export const apiService = new ApiService();

