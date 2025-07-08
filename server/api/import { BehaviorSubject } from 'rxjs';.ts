import { BehaviorSubject } from 'rxjs';

// Types
export interface HealthMetrics {
  sleep: number;
  nutrition: number;
  activity: number;
  date: string;
  // Any other relevant fields
}

export interface AnalysisResult {
  summary: string;
  recommendations: string[];
  trendAnalysis: string;
  isImproving: boolean;
  // Any other analysis outputs from the backend
}

class HealthAnalysisService {
  // BehaviorSubject to publish analysis results to any subscribed component
  private analysisResults = new BehaviorSubject<AnalysisResult | null>(null);

  // Cache the latest analysis to avoid redundant processing
  private latestMetricsKey: string = '';
  private latestResult: AnalysisResult | null = null;

  // Observable that components can subscribe to
  public results$ = this.analysisResults.asObservable();

  // Main analysis method that calls the backend
  public async analyzeHealthMetrics(metrics: HealthMetrics[]): Promise<AnalysisResult> {
    const metricsKey = JSON.stringify(metrics);

    // Return cached result if metrics haven't changed
    if (this.latestMetricsKey === metricsKey && this.latestResult) {
      return this.latestResult;
    }

    try {
      // This will call the new backend endpoint for analysis.
      // The endpoint will be responsible for calling the supervisorAgent's analysis logic.
      const response = await fetch('/api/analyze-health-metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({ metrics }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze health metrics');
      }

      const result: AnalysisResult = await response.json();

      // Update cache
      this.latestMetricsKey = metricsKey;
      this.latestResult = result;

      // Publish the new result to all subscribers
      this.analysisResults.next(result);

      return result;
    } catch (error) {
      console.error('Health analysis error:', error);
      throw error;
    }
  }

  // Method to clear cache if needed (e.g., on logout)
  public clearCache(): void {
    this.latestMetricsKey = '';
    this.latestResult = null;
  }
}

// Create and export a singleton instance for use across the application
export const healthAnalysisService = new HealthAnalysisService();