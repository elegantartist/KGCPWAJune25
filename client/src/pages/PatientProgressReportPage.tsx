import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'wouter';
import { format } from 'date-fns';
import { apiRequest } from '@/lib/apiRequest';
import { PageLoader } from '@/components/PageLoader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  FileText,
  TrendingUp,
  TrendingDown,
  HeartPulse,
  BrainCircuit,
  BarChart,
  Lightbulb,
  Share2,
  StickyNote,
  ShieldCheck,
  Trophy,
} from 'lucide-react';

// --- Helper Sub-components ---

const ReportSection = ({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) => (
  <Card>
    <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
      {icon}
      <CardTitle>{title}</CardTitle>
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
);

const MetricCard = ({ title, value, unit, trend }: { title: string; value: string | number; unit: string; trend?: 'improving' | 'declining' | 'stable' }) => {
  const trendIcon = trend === 'improving' ? <TrendingUp className="h-5 w-5 text-green-500" /> :
                    trend === 'declining' ? <TrendingDown className="h-5 w-5 text-red-500" /> : null;
  return (
    <div className="flex flex-col p-4 bg-slate-50 rounded-lg">
      <span className="text-sm text-muted-foreground">{title}</span>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold">{value}</span>
        <span className="text-sm text-muted-foreground">{unit}</span>
        {trendIcon}
      </div>
    </div>
  );
};

const SuggestionCard = ({ suggestion }: { suggestion: string }) => (
  <div className="flex items-start gap-3 p-3 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg">
    <Lightbulb className="h-5 w-5 text-blue-600 mt-1 flex-shrink-0" />
    <p className="text-sm text-blue-800">{suggestion}</p>
  </div>
);

const PatientProgressReportPage = () => {
  const params = useParams();
  const reportId = params.id;

  const { data: report, isLoading, error } = useQuery({
    queryKey: ['ppr', reportId],
    queryFn: () => apiRequest(`/api/doctor/reports/${reportId}`),
    enabled: !!reportId,
  });

  if (isLoading) {
    return <PageLoader />;
  }

  if (error) {
    return <div className="p-8 text-center text-red-500">Error loading report: {(error as Error).message}</div>;
  }

  if (!report) {
    return <div className="p-8 text-center">Report not found.</div>;
  }

  const formatScore = (score: number | null) => score ? parseFloat(score.toString()).toFixed(1) : 'N/A';

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* --- Report Header --- */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Patient Progress Report</h1>
            <p className="text-muted-foreground">
              For: <span className="font-semibold text-primary">{report.patientName}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Period: {format(new Date(report.reportPeriodStartDate), 'd MMM yyyy')} - {format(new Date(report.reportPeriodEndDate), 'd MMM yyyy')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={report.shared ? "default" : "secondary"}>
              {report.shared ? "Shared with Patient" : "Not Shared"}
            </Badge>
            <Button size="sm" variant="outline">
              <Share2 className="h-4 w-4 mr-2" />
              Share Report
            </Button>
          </div>
        </div>

        {/* --- At-a-Glance Summary --- */}
        <ReportSection title="At-a-Glance Summary" icon={<HeartPulse className="h-6 w-6 text-blue-600" />}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard title="Avg. Diet Score" value={formatScore(report.avgDietScore)} unit="/ 10" />
            <MetricCard title="Avg. Exercise Score" value={formatScore(report.avgExerciseScore)} unit="/ 10" />
            <MetricCard title="Avg. Medication Score" value={formatScore(report.avgMedicationScore)} unit="/ 10" />
            <MetricCard title="Adherence Rate" value={report.adherenceRate ? report.adherenceRate.toFixed(0) : 'N/A'} unit="%" />
          </div>
        </ReportSection>

        {/* --- AI-Powered Insights --- */}
        <div className="grid md:grid-cols-2 gap-6">
          <ReportSection title="Behavioral Insights" icon={<BrainCircuit className="h-6 w-6 text-purple-600" />}>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {report.behaviorInsights || "No specific behavioral insights generated for this period."}
            </p>
          </ReportSection>
          <ReportSection title="Health Trends" icon={<TrendingUp className="h-6 w-6 text-green-600" />}>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {report.healthTrends || "No significant trends identified in this period."}
            </p>
          </ReportSection>
        </div>

        {/* --- Engagement & Milestones --- */}
        <div className="grid md:grid-cols-2 gap-6">
            <ReportSection title="Patient Engagement" icon={<BarChart className="h-6 w-6 text-orange-600" />}>
                <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">"Keep Going" Button Usage:</span>
                        <span className="font-bold">{report.keepGoingButtonUsageCount} times</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Overall Engagement Score:</span>
                        <span className="font-bold">{report.engagementScore ? report.engagementScore.toFixed(0) : 'N/A'} / 100</span>
                    </div>
                    <div className="pt-2">
                        <h4 className="text-sm font-semibold mb-1">Top Used Features:</h4>
                        <div className="flex flex-wrap gap-2">
                            {report.featureUsageSummary && Object.keys(report.featureUsageSummary).length > 0 ? (
                                Object.entries(report.featureUsageSummary).map(([feature, count]) => (
                                    <Badge key={feature} variant="secondary">{feature}: {String(count)}</Badge>
                                ))
                            ) : (
                                <p className="text-xs text-muted-foreground">No specific feature usage tracked.</p>
                            )}
                        </div>
                    </div>
                </div>
            </ReportSection>
            <ReportSection title="Progress Milestones" icon={<Trophy className="h-6 w-6 text-yellow-500" />}>
                <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Badges Earned This Period:</h4>
                    {report.progressBadges && report.progressBadges.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {report.progressBadges.map((badge: any, index: number) => (
                                <Badge key={index} className="capitalize bg-yellow-100 text-yellow-800">
                                    {badge.level} {badge.type}
                                </Badge>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-muted-foreground">No new badges earned in this period.</p>
                    )}
                </div>
            </ReportSection>
        </div>


        {/* --- AI-Suggested CPD Updates --- */}
        <ReportSection title="Suggested Care Plan Directive Updates" icon={<Lightbulb className="h-6 w-6 text-teal-600" />}>
          <div className="space-y-3">
            {report.newCpdSuggestions && report.newCpdSuggestions.length > 0 ? (
              report.newCpdSuggestions.map((s: any, i: number) => (
                <SuggestionCard key={i} suggestion={s.directive} />
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No specific CPD updates suggested at this time. Current plan appears effective.</p>
            )}
          </div>
        </ReportSection>

        {/* --- System Recommendations --- */}
        <ReportSection title="System Recommendations to Patient" icon={<ShieldCheck className="h-6 w-6 text-indigo-600" />}>
            <div className="space-y-2">
                {report.systemRecommendations && report.systemRecommendations.length > 0 ? (
                    <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
                        {report.systemRecommendations.map((rec: any, i: number) => (
                            <li key={i}>{rec.recommendation}</li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-sm text-muted-foreground">No automated recommendations were made to the patient during this period.</p>
                )}
            </div>
        </ReportSection>

        {/* --- Doctor's Notes --- */}
        <ReportSection title="Doctor's Notes" icon={<StickyNote className="h-6 w-6 text-gray-600" />}>
          <div className="space-y-3">
            <Textarea
              defaultValue={report.doctorNotes || ''}
              placeholder="Add your clinical notes, observations, and next steps here..."
              className="min-h-[120px]"
            />
            <div className="flex justify-end">
              <Button>Save Notes</Button>
            </div>
          </div>
        </ReportSection>

      </div>
    </div>
  );
};

export default PatientProgressReportPage;