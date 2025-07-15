import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Users, FileText, TrendingUp, AlertCircle, 
  Plus, Search, Filter, Calendar, Trash2, RotateCcw,
  UserPlus, Stethoscope, LogOut, ArrowLeft
} from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';

interface Patient {
  id: number;
  name: string;
  email: string;
  lastActive: string;
  complianceScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  activeCPDs: number;
}

interface CPD {
  id: number;
  patientName: string;
  category: string;
  directive: string;
  createdAt: string;
  compliance: number;
}

export default function DoctorDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState('patients');
  const [showCreatePatient, setShowCreatePatient] = useState(false);
  const queryClient = useQueryClient();

  // Fetch doctor's patients ordered by alert count
  const { data: patients = [], isLoading: loadingPatients } = useQuery({
    queryKey: ['/api/doctor/patients'],
    enabled: user?.role === 'doctor',
    select: (data) => {
      // Sort patients by alert count (highest first)
      return [...data].sort((a, b) => (b.alertCount || 0) - (a.alertCount || 0));
    }
  });

  // Create patient mutation
  const createPatientMutation = useMutation({
    mutationFn: async (patientData: any) => {
      const response = await fetch('/api/doctor/create-patient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...patientData, doctorId: user?.id })
      });
      if (!response.ok) throw new Error('Failed to create patient');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/doctor/patients'] });
      setShowCreatePatient(false);
      toast({ title: 'Patient created successfully', description: 'Welcome email sent to patient' });
    }
  });

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-green-100 text-green-800';
    }
  };

  return (
    <Layout>
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#2E8BC0] mb-2">Doctor Dashboard</h1>
          <p className="text-[#676767]">
            Manage your patients' Care Plan Directives and monitor their progress
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-[#2E8BC0]" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-[#676767]">Total Patients</p>
                  <p className="text-2xl font-bold text-[#2E8BC0]">{patients.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-[#2E8BC0]" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-[#676767]">Active CPDs</p>
                  <p className="text-2xl font-bold text-[#2E8BC0]">{recentCPDs.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-[#676767]">Avg Compliance</p>
                  <p className="text-2xl font-bold text-green-600">
                    {analytics?.avgCompliance || 0}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <AlertCircle className="h-8 w-8 text-red-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-[#676767]">High Risk</p>
                  <p className="text-2xl font-bold text-red-600">
                    {patients.filter((p: Patient) => p.riskLevel === 'high').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="patients">Patient Management</TabsTrigger>
            <TabsTrigger value="cpds">Care Plan Directives</TabsTrigger>
            <TabsTrigger value="reports">Progress Reports</TabsTrigger>
          </TabsList>

          {/* Patients Tab */}
          <TabsContent value="patients">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Patient Overview</CardTitle>
                    <CardDescription>Monitor patient progress and compliance</CardDescription>
                  </div>
                  <Button className="bg-[#2E8BC0] hover:bg-[#2E8BC0]/90">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Patient
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {loadingPatients ? (
                    <div className="text-center py-8">Loading patients...</div>
                  ) : patients.length > 0 ? (
                    patients.map((patient: Patient) => (
                      <div key={patient.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div>
                            <h3 className="font-medium">{patient.name}</h3>
                            <p className="text-sm text-[#676767]">{patient.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <Badge className={getRiskColor(patient.riskLevel)}>
                            {patient.riskLevel} risk
                          </Badge>
                          <div className="text-right">
                            <p className="text-sm font-medium">{patient.complianceScore}% compliance</p>
                            <p className="text-xs text-[#676767]">{patient.activeCPDs} active CPDs</p>
                          </div>
                          <Button variant="outline" size="sm">
                            View Details
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-[#676767]">
                      No patients assigned yet
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* CPDs Tab */}
          <TabsContent value="cpds">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Care Plan Directives</CardTitle>
                    <CardDescription>Create and manage patient care plans</CardDescription>
                  </div>
                  <Button className="bg-[#2E8BC0] hover:bg-[#2E8BC0]/90">
                    <Plus className="h-4 w-4 mr-2" />
                    Create CPD
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {loadingCPDs ? (
                    <div className="text-center py-8">Loading CPDs...</div>
                  ) : recentCPDs.length > 0 ? (
                    recentCPDs.map((cpd: CPD) => (
                      <div key={cpd.id} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-medium">{cpd.patientName}</h3>
                            <Badge variant="outline" className="mt-1">
                              {cpd.category}
                            </Badge>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-[#676767]">
                              {new Date(cpd.createdAt).toLocaleDateString()}
                            </p>
                            <p className="text-sm font-medium">{cpd.compliance}% compliance</p>
                          </div>
                        </div>
                        <p className="text-sm text-[#676767] italic">"{cpd.directive}"</p>
                        <div className="flex justify-end mt-3 space-x-2">
                          <Button variant="outline" size="sm">Edit</Button>
                          <Button variant="outline" size="sm">View Progress</Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-[#676767]">
                      No CPDs created yet
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <CardTitle>Patient Progress Reports</CardTitle>
                <CardDescription>AI-generated insights and recommendations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-[#676767]">
                  Progress reports will be generated by Kiro's Supervisor Agent
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}