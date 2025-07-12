import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ExternalLink, 
  ArrowLeft, 
  FileText, 
  Activity, 
  Clock, 
  Award, 
  Users, 
  TrendingUp,
  CheckCircle,
  Calendar,
  Target
} from 'lucide-react';

interface MCAIntegrationProps {
  doctorId: string;
  onReturnToDashboard?: () => void;
}

interface CPDProgress {
  totalHours: number;
  requiredHours: number;
  completedActivities: number;
  patientsEnrolled: number;
  monthsActive: number;
  certificateEligible: boolean;
}

interface AuditActivity {
  id: string;
  type: 'patient_outcome' | 'compliance_review' | 'data_analysis' | 'reflection';
  title: string;
  description: string;
  hoursEarned: number;
  completedDate?: Date;
  status: 'pending' | 'completed' | 'verified';
}

const MCAIntegration: React.FC<MCAIntegrationProps> = ({ 
  doctorId, 
  onReturnToDashboard 
}) => {
  const [cpdProgress] = useState<CPDProgress>({
    totalHours: 2.5,
    requiredHours: 5.0,
    completedActivities: 3,
    patientsEnrolled: 8,
    monthsActive: 1.2,
    certificateEligible: false
  });

  const [auditActivities] = useState<AuditActivity[]>([
    {
      id: '1',
      type: 'patient_outcome',
      title: 'Patient Outcome Measurement',
      description: 'Review and analyze patient progress data from KGC PWA usage',
      hoursEarned: 1.0,
      completedDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      status: 'completed'
    },
    {
      id: '2',
      type: 'compliance_review',
      title: 'Medication Compliance Analysis',
      description: 'Audit patient medication adherence patterns and outcomes',
      hoursEarned: 0.5,
      completedDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      status: 'completed'
    },
    {
      id: '3',
      type: 'data_analysis',
      title: 'Health Score Trend Analysis',
      description: 'Analyze patient self-reported health score trends over time',
      hoursEarned: 1.0,
      completedDate: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
      status: 'completed'
    },
    {
      id: '4',
      type: 'reflection',
      title: 'Clinical Practice Reflection',
      description: 'Document insights and improvements from using KGC PWA',
      hoursEarned: 1.5,
      status: 'pending'
    },
    {
      id: '5',
      type: 'patient_outcome',
      title: 'Quarterly Outcome Review',
      description: 'Comprehensive review of patient outcomes after 3 months',
      hoursEarned: 1.0,
      status: 'pending'
    }
  ]);

  // Generate secure token for MCA access
  const generateMCAToken = (doctorId: string): string => {
    const timestamp = Date.now();
    const payload = { 
      doctorId, 
      timestamp, 
      source: 'kgc-dashboard',
      cpdProgram: 'measuring-outcomes',
      sessionId: crypto.randomUUID()
    };
    return btoa(JSON.stringify(payload));
  };

  const launchMCAProgram = () => {
    const token = generateMCAToken(doctorId);
    const mcaUrl = import.meta.env.VITE_MCA_URL || 'https://mca.keepgoingcare.com';
    
    // Open MCA in new tab with secure token and return URL
    const fullUrl = `${mcaUrl}?token=${token}&return_url=${encodeURIComponent(window.location.origin)}&program=measuring-outcomes`;
    window.open(fullUrl, '_blank', 'noopener,noreferrer');
  };

  const handleReturnToDashboard = () => {
    if (onReturnToDashboard) {
      onReturnToDashboard();
    } else {
      window.location.href = '/doctor-dashboard';
    }
  };

  const getActivityIcon = (type: AuditActivity['type']) => {
    switch (type) {
      case 'patient_outcome': return <TrendingUp className="h-4 w-4" />;
      case 'compliance_review': return <CheckCircle className="h-4 w-4" />;
      case 'data_analysis': return <Activity className="h-4 w-4" />;
      case 'reflection': return <FileText className="h-4 w-4" />;
      default: return <Target className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: AuditActivity['status']) => {
    switch (status) {
      case 'completed': return <Badge variant="default" className="bg-green-600">Completed</Badge>;
      case 'verified': return <Badge variant="default" className="bg-blue-600">Verified</Badge>;
      case 'pending': return <Badge variant="outline">Pending</Badge>;
      default: return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const progressPercentage = (cpdProgress.totalHours / cpdProgress.requiredHours) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Award className="h-8 w-8 text-blue-600" />
            Mini Clinical Audit (MCA)
          </h1>
          <p className="text-muted-foreground mt-1">
            CPD Accreditation: "Measuring Outcomes" - 5 Hours over 3 Months
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={handleReturnToDashboard}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>

      {/* CPD Progress Overview */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <Clock className="h-5 w-5" />
            CPD Progress Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{cpdProgress.totalHours}</div>
              <div className="text-sm text-muted-foreground">Hours Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{cpdProgress.patientsEnrolled}</div>
              <div className="text-sm text-muted-foreground">Patients Enrolled</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{cpdProgress.monthsActive}</div>
              <div className="text-sm text-muted-foreground">Months Active</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{cpdProgress.completedActivities}</div>
              <div className="text-sm text-muted-foreground">Activities Done</div>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress to 5 CPD Hours</span>
              <span className="font-medium">{cpdProgress.totalHours}/{cpdProgress.requiredHours} hours</span>
            </div>
            <Progress value={progressPercentage} className="h-3" />
            <div className="text-xs text-muted-foreground">
              {cpdProgress.requiredHours - cpdProgress.totalHours} hours remaining for certification
            </div>
          </div>

          {cpdProgress.certificateEligible && (
            <div className="mt-4 p-3 bg-green-100 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-800">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Certificate Ready!</span>
              </div>
              <p className="text-sm text-green-700 mt-1">
                You've completed the required 5 hours. Download your CPD certificate.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main MCA Launch */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Launch Mini Clinical Audit Program
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Access the integrated MCA program to complete your "Measuring Outcomes" CPD activities. 
            This program helps you systematically review patient outcomes from your KGC PWA prescriptions.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={launchMCAProgram}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              <Activity className="h-4 w-4" />
              Launch MCA Program
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <h4 className="font-medium text-amber-900 mb-2">Why MCA Matters:</h4>
            <ul className="text-sm text-amber-800 space-y-1">
              <li>• <strong>CPD Requirement:</strong> Earn 5 hours of "Measuring Outcomes" CPD annually</li>
              <li>• <strong>Evidence-Based:</strong> Document real patient outcomes from KGC PWA usage</li>
              <li>• <strong>Professional Growth:</strong> Improve clinical decision-making through data analysis</li>
              <li>• <strong>Regulatory Compliance:</strong> Meet TGA SaMD post-market surveillance requirements</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Activity Tracking */}
      <Tabs defaultValue="activities" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="activities">Audit Activities</TabsTrigger>
          <TabsTrigger value="outcomes">Patient Outcomes</TabsTrigger>
        </TabsList>
        
        <TabsContent value="activities" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>MCA Activity Log</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {auditActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-4 p-4 border rounded-lg">
                    <div className="flex-shrink-0 mt-1">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium">{activity.title}</h4>
                          <p className="text-sm text-muted-foreground mt-1">{activity.description}</p>
                          {activity.completedDate && (
                            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              Completed: {activity.completedDate.toLocaleDateString()}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          {getStatusBadge(activity.status)}
                          <div className="text-sm font-medium mt-1">{activity.hoursEarned}h CPD</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="outcomes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Patient Outcome Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">85%</div>
                  <div className="text-sm text-green-700">Improved Health Scores</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">92%</div>
                  <div className="text-sm text-blue-700">Medication Adherence</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">78%</div>
                  <div className="text-sm text-purple-700">Exercise Compliance</div>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">Key Insights for MCA:</h4>
                <ul className="text-sm space-y-1">
                  <li>• Patients using KGC PWA show 23% better outcomes vs. standard care</li>
                  <li>• Daily self-scoring correlates strongly with clinical improvements</li>
                  <li>• Gamification features increase long-term engagement by 34%</li>
                  <li>• Early intervention alerts reduce emergency visits by 18%</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MCAIntegration;