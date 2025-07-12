// Mock services for compilation
export const userCreationService = {
  emailExists: () => Promise.resolve(false),
  createDoctor: (data: any) => Promise.resolve({ doctor: data, uin: 'DOC001' }),
  createPatient: (data: any) => Promise.resolve({ patient: data, uin: 'PAT001' })
};

export const AIContextService = {
  prepareSecureContext: () => Promise.resolve({
    sessionId: 'test',
    secureBundle: {},
    securityValidation: true,
    timestamp: new Date()
  }),
  validateAIResponse: () => Promise.resolve({ valid: true }),
  getContextSummary: () => Promise.resolve({})
};

export const supervisorAgent = {
  runSupervisorQuery: () => Promise.resolve({ response: 'Test response', processingTime: 100 })
};

export const searchExerciseWellnessVideos = (query: string, filters: any) => Promise.resolve({
  videos: [],
  query: query,
  answer: 'No videos found'
});

export const searchCookingVideos = () => Promise.resolve({
  videos: [],
  query: '',
  answer: 'No videos found'
});

export const getMealInspiration = () => Promise.resolve('Healthy meal suggestion');
export const getWellnessInspiration = () => Promise.resolve('Wellness activity suggestion');
export const getWeeklyMealPlan = () => Promise.resolve('Weekly meal plan');
export const getWellnessProgram = () => Promise.resolve('Wellness program');

export const analyzeHealthTrends = () => Promise.resolve([]);
export const generatePredictiveAlerts = () => Promise.resolve([]);
export const generateAnalyticsInsights = () => Promise.resolve([]);

export const proactiveMonitoring = {
  startMonitoringSession: () => Promise.resolve({
    userId: 1,
    startTime: new Date(),
    status: 'active',
    alertsGenerated: 0,
    trendsAnalyzed: 0,
    interventionsTriggered: 0
  }),
  getMonitoringStatus: () => null,
  getActiveAlerts: () => Promise.resolve([])
};

export const emergencyPiiScan = () => ({ hasPii: false, piiTypes: [] });

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: number;
    role: string;
    name: string;
  };
}

export const authMiddleware = (roles?: string[]) => (req: any, res: any, next: any) => {
  req.user = { userId: 1, role: 'admin', name: 'Test User' };
  next();
};

export const createAccessToken = (data: any) => 'test-token-' + Date.now();

export const secureLog = (level: string, message: string, data?: any) => {
  console.log(`[${level}] ${message}`, data);
};