export const USE_MOCK_DATA = true;
import { apiRequest } from '../lib/apiRequest';
import { User, HealthMetric, CarePlanDirective } from '../../../../shared/types';

const API_BASE_URL = '/api';

export const api = {
  auth: {
    adminLogin(credentials: any) {
      return apiRequest('POST', `${API_BASE_URL}/auth/admin-login`, credentials);
    },
    sendSms(data: any) {
      return apiRequest('POST', `${API_BASE_URL}/auth/send-sms`, data);
    },
    verifySms(data: any) {
      return apiRequest('POST', `${API_BASE_URL}/auth/verify-sms`, data);
    },
    logout() {
      return apiRequest('POST', `${API_BASE_URL}/auth/logout`, {});
    },
  },

  admin: {
    createDoctor(data: any) {
      return apiRequest('POST', `${API_BASE_URL}/admin/create-doctor`, data);
    },
    createPatient(data: any) {
      return apiRequest('POST', `${API_BASE_URL}/admin/create-patient`, data);
    },
    getDoctors(): Promise<User[]> {
      return apiRequest('GET', `${API_BASE_URL}/admin/doctors`);
    },
    getPatients(): Promise<User[]> {
      return apiRequest('GET', `${API_BASE_URL}/admin/patients`);
    },
    getStats() {
      return apiRequest('GET', `${API_BASE_URL}/admin/stats`);
    },
    getProfile(): Promise<User> {
      return apiRequest('GET', `${API_BASE_URL}/admin/profile`);
    },
    setImpersonatedDoctor(data: any) {
        return apiRequest('POST', `${API_BASE_URL}/admin/set-impersonated-doctor`, data);
    },
    deleteUser(userId: number) {
        return apiRequest('DELETE', `${API_BASE_URL}/admin/users/${userId}`);
    },
    updateUserContact(userId: number, data: any) {
        return apiRequest('PATCH', `${API_BASE_URL}/admin/users/${userId}/contact`, data);
    },
    requestMcaAccess(data: any) {
        return apiRequest('POST', `${API_BASE_URL}/doctor/mca-access`, data);
    },
    assignPatient(data: any) {
        return apiRequest('POST', `${API_BASE_URL}/admin/assign-patient`, data);
    }
  },

  doctor: {
    createPatient(data: any) {
      return apiRequest('POST', `${API_BASE_URL}/doctors/create-patient`, data);
    },
    getProfile(): Promise<User> {
      return apiRequest('GET', `${API_BASE_URL}/doctor/profile`);
    },
    getPatients(): Promise<User[]> {
      return apiRequest('GET', `${API_BASE_URL}/doctor/patients`);
    },
    getAlertsCount(): Promise<{ count: number }> {
        return apiRequest('GET', `${API_BASE_URL}/doctor/alerts/count`);
    },
    getPatientHealthMetrics(patientId: number): Promise<HealthMetric[]> {
        return apiRequest('GET', `${API_BASE_URL}/doctor/patients/${patientId}/health-metrics`);
    },
    getPatientCarePlan(patientId: number): Promise<{ remarks: Record<string, string> }> {
        return apiRequest('GET', `${API_BASE_URL}/doctor/patients/${patientId}/care-plan`);
    },
    savePatientCarePlan(patientId: number, data: any) {
        return apiRequest('POST', `${API_BASE_URL}/doctor/patients/${patientId}/care-plan`, data);
    }
  },

  patient: {
    getDashboard(): Promise<any> {
      return apiRequest('GET', `${API_BASE_URL}/patients/me/dashboard`);
    },
    submitScores(scores: any) {
      return apiRequest('POST', `${API_BASE_URL}/patients/me/scores`, scores);
    },
    getHealthMetricsHistory(): Promise<HealthMetric[]> {
        return apiRequest('GET', `${API_BASE_URL}/patients/me/health-metrics/history`);
    }
  },

  user: {
    getMe(): Promise<User> {
        return apiRequest('GET', `${API_BASE_URL}/users/me`);
    },
    getCurrentContext(): Promise<User> {
        return apiRequest('GET', `${API_BASE_URL}/user/current-context`);
    },
    getMotivationalImage(userId: number): Promise<any> {
        return apiRequest('GET', `${API_BASE_URL}/users/${userId}/motivational-image`);
    },
    getHealthMetrics(userId: number): Promise<any> {
        return apiRequest('GET', `${API_BASE_URL}/users/${userId}/health-metrics`);
    },
    getActiveCarePlanDirectives(userId: number): Promise<CarePlanDirective[]> {
        return apiRequest('GET', `${API_BASE_URL}/users/${userId}/care-plan-directives/active`);
    },
    getLatestHealthMetrics(userId: number): Promise<HealthMetric> {
        return apiRequest('GET', `${API_BASE_URL}/users/${userId}/health-metrics/latest`);
    },
    getSavedRecipes(userId: number): Promise<any[]> {
        return apiRequest('GET', `${API_BASE_URL}/users/${userId}/saved-recipes`);
    },
    saveRecipe(userId: number, recipe: any) {
        return apiRequest('POST', `${API_BASE_URL}/users/${userId}/saved-recipes`, recipe);
    }
  },

  chat: {
    sendMessage(message: string, sessionId?: string) {
        return apiRequest('POST', `${API_BASE_URL}/chat`, { message, sessionId });
    }
  },

  stripe: {
    createSubscriptionSession() {
        return apiRequest('POST', `${API_BASE_URL}/stripe/create-subscription-session`, {});
    },
    createCreditPurchaseSession(data: any) {
        return apiRequest('POST', `${API_.../stripe/create-credit-purchase-session`, data);
    },
    createCustomerPortalSession() {
        return apiRequest('POST', `${API_BASE_URL}/stripe/create-customer-portal-session`, {});
    }
  }
};
