import React, { useState, useEffect } from 'react';
import { useParams } from 'wouter';
import { useAuth } from '@/hooks/useAuth'; // Assuming useAuth provides doctor's details/token
import { apiRequest } from '@/lib/apiRequest';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, FileText, Share2, PlusCircle } from 'lucide-react';

// Define interfaces for PPR data (can be expanded)
interface PPR {
  id: number;
  reportDate: string;
  avgDietScore: number | null;
  avgExerciseScore: number | null;
  avgMedicationScore: number | null;
  keepGoingButtonUsageCount: number;
  shared: boolean;
  // Add other relevant fields from patientProgressReports schema
}

const DoctorPatientReportsPage: React.FC = () => {
  const params = useParams();
  const patientUserId = params.patientUserId ? parseInt(params.patientUserId) : null;
  const { user: doctorUser } = useAuth(); // Doctor performing the action
  const { toast } = useToast();

  const [reports, setReports] = useState<PPR[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isSharingReport, setIsSharingReport] = useState<number | null>(null); // Store ID of report being shared/unshared
  const [error, setError] = useState<string | null>(null);
  const [patientName, setPatientName] = useState<string>('');
  const queryClient = useQueryClient(); // From @tanstack/react-query if used, or remove if not

  // Fetch patient's name - assuming an endpoint like /api/users/:id/name or similar
  // For now, we'll use a placeholder. In a real app, fetch this.
  useEffect(() => {
    if (patientUserId) {
      // Placeholder: In a real app, fetch patient details including name
      // Example: apiRequest(`/api/patients/${patientUserId}/details`).then(data => setPatientName(data.name));
      setPatientName(`Patient User ID: ${patientUserId}`); // Update if you have actual patient name
    }
  }, [patientUserId]);

  const { data: fetchedReportsData, isLoading: isLoadingInitialReports, error: fetchError, refetch: fetchReports } = useQuery<PPR[]>({
    queryKey: ['patientReports', patientUserId],
    queryFn: async () => {
      if (!patientUserId) return [];
      // Path assumes doctorReportsRouter is mounted at /api/doctor/reports
      return apiRequest<PPR[]>(`/api/doctor/reports/patient/${patientUserId}`, 'GET');
    },
    enabled: !!patientUserId,
    onSuccess: (data) => {
      setReports(data || []);
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to fetch reports.');
      toast({ title: 'Error', description: err.message || 'Failed to fetch reports.', variant: 'destructive' });
    }
  });

  useEffect(() => {
    if (fetchedReportsData) {
      setReports(fetchedReportsData);
    }
  }, [fetchedReportsData]);


  const generateReportMutation = useMutation({
    mutationFn: () => {
      if (!patientUserId) throw new Error("Patient User ID not found for generating report.");
      // For PPR generation, we need start and end dates.
      // For simplicity, let's default to the last 14 days from today.
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 14);

      return apiRequest<PPR>('/api/doctor/reports', 'POST', {
        patientId: patientUserId,
        reportPeriodStartDate: startDate.toISOString(),
        reportPeriodEndDate: endDate.toISOString(),
        // doctorNotes: "Optional notes here"
      });
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'New Patient Progress Report generated.' });
      fetchReports(); // Refetch reports list
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to generate report.');
      toast({ title: 'Error', description: err.message || 'Failed to generate report.', variant: 'destructive' });
    },
  });

  const shareReportMutation = useMutation({
    mutationFn: ({ reportId, shared }: { reportId: number, shared: boolean }) => {
      return apiRequest(`/api/doctor/reports/${reportId}/share`, 'PATCH', { shared });
    },
    onSuccess: (data, variables) => {
      toast({ title: 'Success', description: `Report ${variables.shared ? 'shared' : 'unshared'} successfully.` });
      fetchReports(); // Refetch reports list
    },
    onError: (err: any, variables) => {
      toast({ title: 'Error', description: `Failed to ${variables.shared ? 'share' : 'unshare'} report.`, variant: 'destructive' });
    }
  });


  const handleGenerateReport = () => {
    if (!patientUserId || !doctorUser) return;
    generateReportMutation.mutate();
  };

  const handleShareReport = (reportId: number, currentSharedStatus: boolean) => {
    setIsSharingReport(reportId);
    shareReportMutation.mutate({ reportId, shared: !currentSharedStatus }, {
      onSettled: () => setIsSharingReport(null)
    });
  };

  const isLoading = isLoadingInitialReports || generateReportMutation.isPending ;


  if (!patientUserId) {
    return <Layout><div className="p-4">Invalid patient ID.</div></Layout>;
  }

  return (
    <Layout>
      <div className="container mx-auto p-4 md:p-8">
        <CardHeader className="px-0 flex flex-row justify-between items-center">
          <div>
            <CardTitle className="text-2xl md:text-3xl">Patient Progress Reports</CardTitle>
            <CardDescription>For {patientName}</CardDescription>
          </div>
          <Button onClick={handleGenerateReport} disabled={generateReportMutation.isPending}>
            {generateReportMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
            Generate New Report
          </Button>
        </CardHeader>

        {isLoadingInitialReports && (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2">Loading reports...</p>
          </div>
        )}

        {fetchError && (
          <div className="text-red-600 bg-red-100 p-4 rounded-md">{(fetchError as Error).message}</div>
        )}

        {!isLoadingInitialReports && !fetchError && reports.length === 0 && (
          <div className="text-center py-10 border-2 border-dashed border-gray-300 rounded-lg">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-700">No reports found</h3>
            <p className="mt-1 text-sm text-gray-500">Generate a new report to get started.</p>
          </div>
        )}

        {reports.length > 0 && (
          <div className="space-y-4">
            {reports.map(report => (
              <Card key={report.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">Report ID: {report.id}</CardTitle>
                      <CardDescription>Generated on: {new Date(report.reportDate).toLocaleDateString()}</CardDescription>
                    </div>
                    <Badge variant={report.shared ? "default" : "outline"} className={report.shared ? "bg-green-600 text-white" : ""}>
                      {report.shared ? 'Shared' : 'Not Shared'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm mb-4">
                    <div><strong>Diet Avg:</strong> {report.avgDietScore?.toFixed(1) ?? 'N/A'}</div>
                    <div><strong>Exercise Avg:</strong> {report.avgExerciseScore?.toFixed(1) ?? 'N/A'}</div>
                    <div><strong>Meds Avg:</strong> {report.avgMedicationScore?.toFixed(1) ?? 'N/A'}</div>
                    <div><strong>Keep Going Usage:</strong> {report.keepGoingButtonUsageCount}</div>
                  </div>
                  {/* TODO: Add more detailed view or link to PatientProgressReportPage.tsx if that's separate */}
                  <div className="mt-4 flex space-x-2">
                    <Button variant="outline" size="sm" onClick={() => alert(`Viewing report ${report.id} - full view to be implemented.`)}>
                      <FileText className="mr-2 h-4 w-4"/> View Full Report
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleShareReport(report.id, report.shared)}
                      disabled={shareReportMutation.isLoading && isSharingReport === report.id}
                    >
                      {shareReportMutation.isLoading && isSharingReport === report.id ?
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> :
                        <Share2 className="mr-2 h-4 w-4"/>}
                      {report.shared ? 'Unshare' : 'Share with Patient'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default DoctorPatientReportsPage;
