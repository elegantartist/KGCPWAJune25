import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogoutButton } from "@/components/ui/LogoutButton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PatientAlertsPanel from "@/components/doctor/PatientAlertsPanel";
import { PatientAlertBadge } from "@/components/doctor/PatientAlertBadge";
import PPRHealthSnapshots from "@/components/doctor/PPRHealthSnapshots";
import { format } from "date-fns";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useLocation, Link } from "wouter";
import { 
  LineChart as RechartsLineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart as RechartsPieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { 
  UserPlus, 
  UserCheck, 
  ClipboardList,
  FileText,
  ChevronRight,
  Calendar,
  BarChart3,
  Mail,
  Activity,
  Lightbulb,
  Utensils,
  Pill,
  Phone,
  MessageSquare,
  AlertCircle,
  Settings,
  Save,
  ArrowLeft,
  Trophy,
  ExternalLink,
  FileBarChart
} from "lucide-react";

// Schema for adding a new patient
const newPatientSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  email: z.string().email("Please enter a valid email address"),
  phoneNumber: z.string().min(10, "Mobile phone number is required for SMS verification and emergency alerts").regex(/^\+?[1-9]\d{1,14}$/, "Please enter a valid phone number"),
  dietDirective: z.string().min(10, "Please provide detailed diet instructions"),
  exerciseDirective: z.string().min(10, "Please provide detailed exercise and wellness instructions"),
  medicationDirective: z.string().min(10, "Please provide detailed medication instructions"),
});

// Schema for updating care plan directives
const updateCpdSchema = z.object({
  id: z.number(),
  directive: z.string().min(10, "Directive must be at least 10 characters"),
});

// Schema for updating doctor profile
const updateDoctorProfileSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  email: z.string().email("Please enter a valid email address"),
  phoneNumber: z.string()
    .min(10, "Phone number must be at least 10 digits")
    .regex(/^\+?[0-9\s\-()]+$/, "Please enter a valid phone number format"),
});

// Doctor dashboard component
export default function DoctorDashboard() {
  const { toast } = useToast();
  
  // Automatic doctor assignment (Dr. Marijke Collins - ID: 1)
  const currentDoctorId = 1;
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [currentTab, setCurrentTab] = useState("patients");
  const [selectedPatient, setSelectedPatient] = useState<number | null>(null);
  const [isAddingPatient, setIsAddingPatient] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isViewingReport, setIsViewingReport] = useState<number | null>(null);
  const [isEditingCpd, setIsEditingCpd] = useState<{ id: number, category: string } | null>(null);

  // Fetch current user context (for impersonation detection)
  const { data: userContext, isLoading: isLoadingContext } = useQuery<{
    userRole: string;
    doctorId?: number;
    impersonatedDoctorId?: number;
    adminOriginalUserId?: number;
  }>({
    queryKey: ["/api/user/current-context"],
    staleTime: 0,
  });

  const isAdminImpersonating = userContext?.userRole === 'admin' && userContext?.impersonatedDoctorId;
  const doctorToDisplayId = isAdminImpersonating ? userContext.impersonatedDoctorId : currentDoctorId; // Use automatic doctor assignment

  // Admin return function
  const handleReturnToAdminDashboard = async () => {
    try {
      const response = await fetch('/api/admin/clear-impersonation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to clear impersonation context.');
      }

      console.log('[FRONTEND DEBUG] Admin cleared impersonation. Redirecting to /admin-dashboard');
      navigate('/admin-dashboard');
    } catch (error: any) {
      console.error('Error clearing impersonation:', error);
      toast({
        title: "Return Failed",
        description: error.message || "Could not return to admin dashboard.",
        variant: "destructive",
      });
    }
  };

  // Doctor information with admin impersonation support
  const { data: doctor, isLoading: isLoadingDoctor } = useQuery({
    // CRITICAL FIX: Add doctorToDisplayId to queryKey to ensure re-fetch on impersonation switch
    queryKey: ["/api/doctor/profile", doctorToDisplayId],
    queryFn: async () => {
      // Ensure the backend receives the correct ID if directly passed, or relies on session
      const res = await fetch(`/api/doctor/profile?doctorId=${doctorToDisplayId}`);
      if (!res.ok) throw new Error('Failed to fetch doctor profile');
      return res.json();
    },
    enabled: !isLoadingContext && !!doctorToDisplayId, // Only enable if we have a doctor ID to display
    retry: false,
  });

  // Get doctor's patients with admin impersonation support
  const {
    data: patients = [],
    isLoading: isLoadingPatients,
    refetch: refetchPatients
  } = useQuery({
    // CRITICAL FIX: Add doctorToDisplayId to queryKey to ensure re-fetch on impersonation switch
    queryKey: ["/api/doctor/patients", doctorToDisplayId],
    queryFn: async () => {
      const res = await fetch(`/api/doctor/patients?doctorId=${doctorToDisplayId}`);
      if (!res.ok) throw new Error('Failed to fetch patients');
      return res.json();
    },
    enabled: !isLoadingContext && !!doctorToDisplayId, // Only enable if we have a doctor ID to display
    retry: false,
  });

  // Get patient details when one is selected
  const { 
    data: patientDetails, 
    isLoading: isLoadingPatientDetails,
    refetch: refetchPatientDetails
  } = useQuery({
    queryKey: ["/api/doctor/patients", selectedPatient],
    queryFn: async () => {
      console.log("Fetching details for patient ID:", selectedPatient);
      const res = await fetch(`/api/doctor/patients/${selectedPatient}`);
      if (!res.ok) throw new Error('Failed to fetch patient details');
      const data = await res.json();
      console.log("Patient details fetched:", data);
      return data;
    },
    enabled: selectedPatient !== null,
    retry: false,
  });

  // Note: Removed manual refetch useEffect as the updated queryKey dependencies handle re-fetching automatically

  // Get patient reports when a patient is selected
  const { 
    data: patientReports, 
    isLoading: isLoadingReports 
  } = useQuery({
    queryKey: ["/api/doctor/patients", selectedPatient, "reports"],
    queryFn: async () => {
      const res = await fetch(`/api/doctor/patients/${selectedPatient}/reports`);
      if (!res.ok) throw new Error('Failed to fetch patient reports');
      return res.json();
    },
    enabled: selectedPatient !== null,
    retry: false,
  });

  // Get report details when viewing a specific report
  const { 
    data: reportDetails, 
    isLoading: isLoadingReportDetails 
  } = useQuery({
    queryKey: ["/api/doctor/reports", isViewingReport, doctorToDisplayId],
    queryFn: async () => {
      const res = await fetch(`/api/doctor/reports/${isViewingReport}?doctorId=${doctorToDisplayId}`);
      if (!res.ok) throw new Error('Failed to fetch report details');
      return res.json();
    },
    enabled: isViewingReport !== null && !!doctorToDisplayId,
    retry: false,
  });

  // Add new patient mutation
  const addPatientMutation = useMutation({
    mutationFn: (data: z.infer<typeof newPatientSchema>) => {
      return apiRequest(
        "POST",
        "/api/doctor/patients",
        data
      );
    },
    onSuccess: () => {
      toast({
        title: "Patient added successfully",
        description: "An invitation email has been sent to the patient",
      });
      setIsAddingPatient(false);
      queryClient.invalidateQueries({ queryKey: ["/api/doctor/patients", doctor?.id] });
    },
    onError: (error) => {
      toast({
        title: "Failed to add patient",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  });

  // Generate patient progress report mutation
  const generateReportMutation = useMutation({
    mutationFn: (patientId: number) => {
      return apiRequest(
        "POST",
        `/api/doctor/patients/${patientId}/reports`
      );
    },
    onSuccess: (data) => {
      toast({
        title: "Progress report generated",
        description: "The report has been created successfully",
      });
      setIsGeneratingReport(false);
      queryClient.invalidateQueries({ 
        queryKey: ["/api/doctor/patients", selectedPatient, "reports"] 
      });
      setIsViewingReport(data.id);
    },
    onError: (error) => {
      toast({
        title: "Failed to generate report",
        description: error.message || "Please try again",
        variant: "destructive",
      });
      setIsGeneratingReport(false);
    }
  });

  // Update care plan directive mutation
  const updateCpdMutation = useMutation({
    mutationFn: (data: z.infer<typeof updateCpdSchema>) => {
      return apiRequest(
        "PATCH",
        `/api/doctor/care-plan-directives/${data.id}`,
        { directive: data.directive }
      );
    },
    onSuccess: () => {
      toast({
        title: "Care plan updated",
        description: "The directive has been updated successfully",
      });
      setIsEditingCpd(null);
      queryClient.invalidateQueries({ 
        queryKey: ["/api/doctor/patients", selectedPatient] 
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update care plan",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  });

  // MCA access mutation
  const mcaAccessMutation = useMutation({
    mutationFn: () => {
      // For impersonated sessions, pass the target doctor ID
      const params = isAdminImpersonating && userContext?.impersonatedDoctorId 
        ? { targetDoctorId: userContext.impersonatedDoctorId }
        : {};
      
      return apiRequest("POST", "/api/doctor/mca-access", params);
    },
    onSuccess: (data) => {
      // Open MCA app in new tab with secure token
      window.open(data.mcaAccessUrl, '_blank');
      toast({
        title: "MCA Access Granted",
        description: "Opening Mini Clinical Audit application",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to access MCA",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  });

  // Form for adding new patients
  const newPatientForm = useForm<z.infer<typeof newPatientSchema>>({
    resolver: zodResolver(newPatientSchema),
    defaultValues: {
      name: "",
      email: "",
      phoneNumber: "",
      dietDirective: "",
      exerciseDirective: "",
      medicationDirective: "",
    },
  });

  // Form for updating care plan directives
  const updateCpdForm = useForm<z.infer<typeof updateCpdSchema>>({
    resolver: zodResolver(updateCpdSchema),
    defaultValues: {
      id: 0,
      directive: "",
    },
  });

  // Form for updating doctor profile
  const updateProfileForm = useForm<z.infer<typeof updateDoctorProfileSchema>>({
    resolver: zodResolver(updateDoctorProfileSchema),
    defaultValues: {
      name: "",
      email: "",
      phoneNumber: "",
    },
  });

  // Update doctor profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: (data: z.infer<typeof updateDoctorProfileSchema>) => {
      return apiRequest(
        "PATCH",
        "/api/doctor/profile",
        data
      );
    },
    onSuccess: () => {
      toast({
        title: "Profile updated",
        description: "Your profile information has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/doctor/profile"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to update profile",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  });

  // Set up the CPD form when editing a directive
  useEffect(() => {
    if (isEditingCpd && patientDetails) {
      const directive = patientDetails.carePlanDirectives.find(
        (cpd: any) => cpd.id === isEditingCpd.id
      );
      if (directive) {
        updateCpdForm.reset({
          id: directive.id,
          directive: directive.directive,
        });
      }
    }
  }, [isEditingCpd, patientDetails, updateCpdForm]);

  // Set up the profile form with doctor data
  useEffect(() => {
    if (doctor) {
      updateProfileForm.reset({
        name: doctor.name || "",
        email: doctor.email || "",
        phoneNumber: doctor.phoneNumber || "",
      });
    }
  }, [doctor, updateProfileForm]);

  // Handler for adding a new patient
  const handleAddPatient = (data: z.infer<typeof newPatientSchema>) => {
    addPatientMutation.mutate(data);
  };

  // Handler for generating a progress report
  const handleGenerateReport = () => {
    if (selectedPatient) {
      setIsGeneratingReport(true);
      generateReportMutation.mutate(selectedPatient);
    }
  };

  // Handler for updating a care plan directive
  const handleUpdateCpd = (data: z.infer<typeof updateCpdSchema>) => {
    updateCpdMutation.mutate(data);
  };

  // Handler for updating doctor profile
  const handleUpdateProfile = (data: z.infer<typeof updateDoctorProfileSchema>) => {
    updateProfileMutation.mutate(data);
  };

  // Helper function to get color based on score
  const getScoreColor = (score: number) => {
    if (score >= 8) return "bg-green-100 text-green-800";
    if (score >= 5) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  // Helper function to get icon for CPD category
  const getCpdIcon = (category: string) => {
    switch (category) {
      case "diet":
        return <Utensils className="h-4 w-4 mr-2" />;
      case "exercise":
        return <Activity className="h-4 w-4 mr-2" />;
      case "medication":
        return <Pill className="h-4 w-4 mr-2" />;
      default:
        return <ClipboardList className="h-4 w-4 mr-2" />;
    }
  };

  if (isLoadingDoctor) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Loading Doctor Dashboard</h2>
          <p>Please wait while we load your information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {isAdminImpersonating && (
        <div className="flex justify-between items-center mb-3">
          <Button 
            variant="outline" 
            className="flex items-center text-gray-600 hover:text-gray-900"
            onClick={handleReturnToAdminDashboard}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Return to Admin Dashboard
          </Button>
        </div>
      )}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#2E8BC0]">
            {doctor?.name ? `Welcome ${doctor.name}` : 'Welcome Doctor'}
          </h1>
          <p className="text-gray-600">
            {doctor?.uin ? `UIN: ${doctor.uin} | Manage your patients and their care plans` : 'Manage your patients and their care plans'}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            onClick={() => mcaAccessMutation.mutate()}
            disabled={mcaAccessMutation.isPending}
            className="bg-[#2E8BC0] hover:bg-[#1E6B8F] text-white"
          >
            <FileBarChart className="h-4 w-4 mr-2" />
            {mcaAccessMutation.isPending ? "Opening..." : "Self-Reported Mini Clinical Audit (MCA)"}
            <ExternalLink className="h-4 w-4 ml-2" />
          </Button>
          <LogoutButton userRole="doctor" variant="outline" />
        </div>
        <Card className="p-4 shadow-sm">
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={doctor?.profileImageUrl} alt={doctor?.name} />
              <AvatarFallback>{doctor?.name?.charAt(0) || "D"}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex justify-between items-center">
                <span className="font-medium text-lg">{doctor?.name || "Doctor"}</span>
                <PatientAlertsPanel />
              </div>
              <div className="flex items-center text-sm text-gray-500 mt-1">
                <Mail className="h-3.5 w-3.5 mr-1" />
                <span>{doctor?.email}</span>
              </div>
              <div className="flex items-center text-sm text-gray-500 mt-1">
                <Phone className="h-3.5 w-3.5 mr-1" />
                <span>{doctor?.phoneNumber || "No phone number"}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patient List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-[#2E8BC0]">
                <span className="flex items-center">
                  <UserCheck className="h-5 w-5 mr-2" />
                  My Patients
                </span>
              </CardTitle>
              <Dialog open={isAddingPatient} onOpenChange={setIsAddingPatient}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-[#2E8BC0]">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add New
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col">
                  <DialogHeader className="flex-shrink-0">
                    <DialogTitle>Add New Patient</DialogTitle>
                    <DialogDescription>
                      Enter patient details and initial care plan directives. An invitation will be sent to the patient.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex-1 overflow-y-auto px-1">
                    <Form {...newPatientForm}>
                      <form onSubmit={newPatientForm.handleSubmit(handleAddPatient)} className="space-y-4 pb-4">
                      <FormField
                        control={newPatientForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Patient Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Full name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={newPatientForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Address</FormLabel>
                            <FormControl>
                              <Input placeholder="email@example.com" {...field} />
                            </FormControl>
                            <FormDescription>
                              An invitation will be sent to this email address.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={newPatientForm.control}
                        name="phoneNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Mobile Phone Number</FormLabel>
                            <FormControl>
                              <Input placeholder="+61 412 345 678" {...field} />
                            </FormControl>
                            <FormDescription>
                              Required for SMS verification during account setup and emergency patient alerts
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="border rounded-md p-4 bg-gray-50">
                        <h3 className="font-medium mb-2">Initial Care Plan Directives</h3>
                        <FormField
                          control={newPatientForm.control}
                          name="dietDirective"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Diet Plan</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Enter specific diet recommendations and guidelines" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={newPatientForm.control}
                          name="exerciseDirective"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Exercise & Wellness Routine</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Enter exercise and wellness recommendations" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={newPatientForm.control}
                          name="medicationDirective"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Medication Instructions</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Enter medication details, dosage, and schedule" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                        <DialogFooter className="flex-shrink-0 mt-4">
                          <Button type="button" variant="outline" onClick={() => setIsAddingPatient(false)}>
                            Cancel
                          </Button>
                          <Button type="submit" className="bg-[#2E8BC0]">
                            {addPatientMutation.isPending ? "Adding..." : "Add Patient"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <CardDescription>
              Select a patient to view their details
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingPatients ? (
              <div className="text-center py-6">Loading patients...</div>
            ) : !patients?.length ? (
              <div className="text-center py-6 text-gray-500">
                <UserPlus className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>No patients yet</p>
                <p className="text-sm mt-2">Add your first patient to get started</p>
              </div>
            ) : (
              <ScrollArea className="h-[600px]">
                <div className="space-y-2">
                  {patients.map((patient: any) => (
                    <div
                      key={patient.id}
                      className={`p-3 rounded-md cursor-pointer hover:bg-gray-100 flex items-center justify-between ${
                        selectedPatient === patient.id ? "bg-blue-50 border border-blue-200" : ""
                      }`}
                      onClick={() => {
                        console.log("Clicked patient:", patient.id);
                        setSelectedPatient(patient.id);
                        setIsViewingReport(null);
                      }}
                    >
                      <div className="flex items-center">
                        <Avatar className="h-8 w-8 mr-3">
                          <AvatarFallback>{patient.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{patient.name}</p>
                          <p className="text-xs text-gray-500">{patient.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <PatientAlertBadge
                          doctorId={doctorToDisplayId}
                          patientId={patient.id}
                          patientName={patient.name}
                        />
                        <ChevronRight className="h-4 w-4 text-gray-400 ml-2" />
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Patient Details with CPD boxes */}
        <Card className="lg:col-span-2">
          {!selectedPatient ? (
            <div className="flex items-center justify-center h-full p-8 text-center text-gray-500">
              <div>
                <UserCheck className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-1">No Patient Selected</h3>
                <p>Select a patient from the list to view their details and care plan</p>
              </div>
            </div>
          ) : isLoadingPatientDetails ? (
            <div className="flex items-center justify-center h-[500px]">
              <p>Loading patient details...</p>
            </div>
          ) : (
            <>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-xl text-[#2E8BC0]">{patientDetails?.name}</CardTitle>
                    <CardDescription>
                      <div className="flex items-center mt-1">
                        <Mail className="h-4 w-4 mr-1" />
                        <span className="text-gray-600">{patientDetails?.email}</span>
                      </div>
                      <div className="flex items-center mt-1">
                        <Calendar className="h-4 w-4 mr-1" />
                        <span className="text-gray-600">Patient since: {format(new Date(patientDetails?.joinedDate), "MMMM d, yyyy")}</span>
                      </div>
                    </CardDescription>
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                      UIN: {patientDetails?.uin || "Not assigned"}
                    </Badge>
                    <Button
                      size="sm"
                      onClick={handleGenerateReport}
                      disabled={isGeneratingReport}
                      className="bg-[#2E8BC0]"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      {isGeneratingReport ? "Generating..." : "Generate PPR"}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="cpd" className="space-y-4">
                  <TabsList>
                    <TabsTrigger value="cpd" className="flex items-center">
                      <ClipboardList className="h-4 w-4 mr-2" />
                      Care Plan Directives
                    </TabsTrigger>
                    <TabsTrigger value="ppr" className="flex items-center">
                      <FileText className="h-4 w-4 mr-2" />
                      Progress Reports
                    </TabsTrigger>
                  </TabsList>

                  {/* CPD Tab Content - Redesigned Layout */}
                  <TabsContent value="cpd" className="space-y-4">
                    {/* Health Metrics - Compact Version */}
                    <div>
                      <h3 className="text-lg font-medium mb-3 flex items-center">
                        <BarChart3 className="h-5 w-5 mr-2 text-[#2E8BC0]" />
                        Latest Patient Scores
                      </h3>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-gray-50 rounded-lg p-3 text-center">
                          <Badge className={`mb-1 ${getScoreColor(patientDetails?.latestMetrics?.medicationScore || 0)}`}>
                            {patientDetails?.latestMetrics?.medicationScore?.toFixed(1) || "N/A"}
                          </Badge>
                          <div className="text-xs font-medium text-gray-600">Medication</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3 text-center">
                          <Badge className={`mb-1 ${getScoreColor(patientDetails?.latestMetrics?.dietScore || 0)}`}>
                            {patientDetails?.latestMetrics?.dietScore?.toFixed(1) || "N/A"}
                          </Badge>
                          <div className="text-xs font-medium text-gray-600">Diet</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3 text-center">
                          <Badge className={`mb-1 ${getScoreColor(patientDetails?.latestMetrics?.exerciseScore || 0)}`}>
                            {patientDetails?.latestMetrics?.exerciseScore?.toFixed(1) || "N/A"}
                          </Badge>
                          <div className="text-xs font-medium text-gray-600">Exercise</div>
                        </div>
                      </div>
                    </div>

                    {/* Care Plan Directives - Redesigned Grid Layout */}
                    <div>
                      <h3 className="text-lg font-medium mb-3 flex items-center">
                        <ClipboardList className="h-5 w-5 mr-2 text-[#2E8BC0]" />
                        Care Plan Directives
                      </h3>
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {/* Diet Directive */}
                        <Card className="h-fit">
                          <CardHeader className="p-3 pb-2">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center">
                                <Utensils className="h-4 w-4 mr-2 text-green-600" />
                                <CardTitle className="text-sm font-medium">Diet Plan</CardTitle>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs"
                                onClick={() => {
                                  const dietCpd = patientDetails?.carePlanDirectives?.find(
                                    (cpd: any) => cpd.category === 'diet'
                                  );
                                  if (dietCpd) {
                                    setIsEditingCpd({ id: dietCpd.id, category: 'diet' });
                                  } else {
                                    toast({
                                      title: "No diet directive found",
                                      description: "Please add a diet directive first",
                                      variant: "destructive",
                                    });
                                  }
                                }}
                              >
                                Edit
                              </Button>
                            </div>
                            <CardDescription className="text-xs">
                              {(() => {
                                const dietCpd = patientDetails?.carePlanDirectives?.find((cpd: any) => cpd.category === 'diet');
                                return dietCpd?.updatedAt ? 
                                  `Updated: ${format(new Date(dietCpd.updatedAt), "MMM d")}` : 
                                  "Not set";
                              })()}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="p-3 pt-1">
                            <div className="text-xs max-h-20 overflow-y-auto">
                              {patientDetails?.carePlanDirectives?.find((cpd: any) => cpd.category === 'diet')?.directive || 
                               "No diet directive set. Click Edit to add one."}
                            </div>
                          </CardContent>
                        </Card>

                        {/* Exercise Directive */}
                        <Card className="h-fit">
                          <CardHeader className="p-3 pb-2">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center">
                                <Activity className="h-4 w-4 mr-2 text-blue-600" />
                                <CardTitle className="text-sm font-medium">Exercise & Wellness</CardTitle>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs"
                                onClick={() => {
                                  const exerciseCpd = patientDetails?.carePlanDirectives?.find(
                                    (cpd: any) => cpd.category === 'exercise'
                                  );
                                  if (exerciseCpd) {
                                    setIsEditingCpd({ id: exerciseCpd.id, category: 'exercise' });
                                  } else {
                                    toast({
                                      title: "No exercise directive found",
                                      description: "Please add an exercise directive first",
                                      variant: "destructive",
                                    });
                                  }
                                }}
                              >
                                Edit
                              </Button>
                            </div>
                            <CardDescription className="text-xs">
                              {patientDetails?.carePlanDirectives?.find((cpd: any) => cpd.category === 'exercise')?.updatedAt ? 
                                `Updated: ${format(new Date(patientDetails?.carePlanDirectives?.find((cpd: any) => cpd.category === 'exercise')?.updatedAt), "MMM d")}` :
                                "Not set"}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="p-3 pt-1">
                            <div className="text-xs max-h-20 overflow-y-auto">
                              {patientDetails?.carePlanDirectives?.find((cpd: any) => cpd.category === 'exercise')?.directive || 
                               "No exercise directive set. Click Edit to add one."}
                            </div>
                          </CardContent>
                        </Card>

                        {/* Medication Directive */}
                        <Card className="h-fit">
                          <CardHeader className="p-3 pb-2">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center">
                                <Pill className="h-4 w-4 mr-2 text-red-600" />
                                <CardTitle className="text-sm font-medium">Medication</CardTitle>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs"
                                onClick={() => {
                                  const medicationCpd = patientDetails?.carePlanDirectives?.find(
                                    (cpd: any) => cpd.category === 'medication'
                                  );
                                  if (medicationCpd) {
                                    setIsEditingCpd({ id: medicationCpd.id, category: 'medication' });
                                  } else {
                                    toast({
                                      title: "No medication directive found",
                                      description: "Please add a medication directive first",
                                      variant: "destructive",
                                    });
                                  }
                                }}
                              >
                                Edit
                              </Button>
                            </div>
                            <CardDescription className="text-xs">
                              {patientDetails?.carePlanDirectives?.find((cpd: any) => cpd.category === 'medication')?.updatedAt ? 
                                `Updated: ${format(new Date(patientDetails?.carePlanDirectives?.find((cpd: any) => cpd.category === 'medication')?.updatedAt), "MMM d")}` :
                                "Not set"}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="p-3 pt-1">
                            <div className="text-xs max-h-20 overflow-y-auto">
                              {patientDetails?.carePlanDirectives?.find((cpd: any) => cpd.category === 'medication')?.directive || 
                               "No medication directive set. Click Edit to add one."}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </TabsContent>

                  {/* PPR Tab Content */}
                  <TabsContent value="ppr">
                    {isLoadingReports ? (
                      <div className="flex items-center justify-center h-[300px]">
                        <p>Loading reports...</p>
                      </div>
                    ) : !patientReports?.length ? (
                      <div className="flex items-center justify-center h-[300px] text-center text-gray-500">
                        <div>
                          <AlertCircle className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                          <h3 className="text-lg font-medium mb-1">No Reports Found</h3>
                          <p>This patient doesn't have any progress reports yet</p>
                          <Button 
                            className="mt-4 bg-[#2E8BC0]"
                            onClick={handleGenerateReport}
                            disabled={isGeneratingReport}
                          >
                            {isGeneratingReport ? "Generating..." : "Generate First Report"}
                          </Button>
                        </div>
                      </div>
                    ) : isViewingReport ? (
                      isLoadingReportDetails ? (
                        <div className="flex items-center justify-center h-[300px]">
                          <p>Loading report details...</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <h3 className="text-lg font-medium">
                                Progress Report for {reportDetails?.patientName}
                              </h3>
                              <p className="text-sm text-gray-500">
                                Period: {reportDetails?.reportPeriodStartDate && reportDetails?.reportPeriodEndDate ? 
                                  `${format(new Date(reportDetails.reportPeriodStartDate), "MMM d")} - ${format(new Date(reportDetails.reportPeriodEndDate), "MMM d, yyyy")}` : 
                                  'Date range not available'}
                              </p>
                            </div>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setIsViewingReport(null)}
                            >
                              Back to Reports
                            </Button>
                          </div>

                          <div className="border rounded-md p-4">
                            <h4 className="text-md font-medium mb-3 flex items-center">
                              <BarChart3 className="h-5 w-5 mr-2 text-[#2E8BC0]" />
                              Health Metrics Summary
                            </h4>
                            <div className="grid grid-cols-3 gap-4">
                              <Card className="bg-gray-50">
                                <CardContent className="pt-6">
                                  <div className="text-center">
                                    <Badge className={`mb-2 ${getScoreColor(reportDetails?.avgMedicationScore || 0)}`}>
                                      {reportDetails?.avgMedicationScore?.toFixed(1) || "N/A"}
                                    </Badge>
                                    <span className="text-sm font-medium">Avg. Medication</span>
                                  </div>
                                </CardContent>
                              </Card>
                              <Card className="bg-gray-50">
                                <CardContent className="pt-6">
                                  <div className="text-center">
                                    <Badge className={`mb-2 ${getScoreColor(reportDetails?.avgDietScore || 0)}`}>
                                      {reportDetails?.avgDietScore?.toFixed(1) || "N/A"}
                                    </Badge>
                                    <span className="text-sm font-medium">Avg. Diet</span>
                                  </div>
                                </CardContent>
                              </Card>
                              <Card className="bg-gray-50">
                                <CardContent className="pt-6">
                                  <div className="text-center">
                                    <Badge className={`mb-2 ${getScoreColor(reportDetails?.avgExerciseScore || 0)}`}>
                                      {reportDetails?.avgExerciseScore?.toFixed(1) || "N/A"}
                                    </Badge>
                                    <span className="text-sm font-medium">Avg. Exercise</span>
                                  </div>
                                </CardContent>
                              </Card>
                            </div>
                          </div>

                          {/* Keep Going Button Usage */}
                          <div className="border rounded-md p-4">
                            <h4 className="text-md font-medium mb-3 flex items-center">
                              <Activity className="h-5 w-5 mr-2 text-[#2E8BC0]" />
                              Patient Engagement
                            </h4>
                            <div className="grid grid-cols-2 gap-4">
                              <Card className="bg-gray-50">
                                <CardContent className="pt-6">
                                  <div className="text-center">
                                    <div className="text-2xl font-bold mb-2 text-[#2E8BC0]">
                                      {reportDetails?.keepGoingButtonUsageCount || 0}
                                    </div>
                                    <span className="text-sm font-medium">Keep Going Button Uses</span>
                                  </div>
                                </CardContent>
                              </Card>
                              <Card className="bg-gray-50">
                                <CardContent className="pt-6">
                                  <div className="text-center">
                                    <Badge className={`mb-2 ${reportDetails?.chatSentimentScore >= 0 ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                                      {reportDetails?.chatSentimentScore >= 0 ? 'Positive' : 'Negative'}
                                    </Badge>
                                    <span className="text-sm font-medium">Chat Sentiment</span>
                                  </div>
                                </CardContent>
                              </Card>
                            </div>
                          </div>

                          {/* Health Snapshots - Comprehensive Visual Analysis */}
                          {reportDetails?.healthSnapshotsData && (
                            <PPRHealthSnapshots
                              healthSnapshotsData={reportDetails.healthSnapshotsData}
                              reportPeriod={{
                                start: reportDetails.reportPeriodStartDate ? new Date(reportDetails.reportPeriodStartDate) : new Date(),
                                end: reportDetails.reportPeriodEndDate ? new Date(reportDetails.reportPeriodEndDate) : new Date()
                              }}
                            />
                          )}

                          {/* Progress Milestone Badges - At the bottom of PPR */}
                          {reportDetails?.progressBadges && (
                            <div className="border rounded-md p-4 mt-4">
                              <h4 className="text-md font-medium mb-3 flex items-center">
                                <Trophy className="h-5 w-5 mr-2 text-[#2E8BC0]" />
                                Progress Milestone Badges
                                <div className="relative ml-2 group">
                                  <AlertCircle className="h-4 w-4 text-gray-400 cursor-help" />
                                  <div className="absolute z-50 hidden group-hover:block bg-black text-white text-xs rounded p-2 w-64 -left-32 -top-20">
                                    <p>Progress Milestone Badges are awarded to patients for consistent self-scoring and engagement with the app.</p>
                                    <p className="mt-1">Badges come in tiers: Bronze, Silver, Gold, and Platinum, with each tier requiring more consistent behavior.</p>
                                  </div>
                                </div>
                              </h4>

                              <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  {/* Empty state when no badges */}
                                  {reportDetails.progressBadges.totalBadges === 0 ? (
                                    <div className="col-span-3 p-4 border border-dashed rounded-md bg-gray-50 flex flex-col items-center justify-center">
                                      <Trophy className="h-8 w-8 text-gray-400 mb-2" />
                                      <p className="text-gray-500 text-center">No badges earned during this period.</p>
                                      <p className="text-xs text-gray-400 text-center mt-1">
                                        Badges are earned when patients consistently self-score 8 or higher.
                                      </p>
                                    </div>
                                  ) : (
                                    /* Display highest level badges for each category */
                                    Object.entries(reportDetails.progressBadges.badgeCategoryCounts).map(([category, count]) => {
                                      // Find the highest level badge for this category
                                      const highestBadge = reportDetails.progressBadges.recentBadges
                                        .filter(badge => badge.type === category)
                                        .sort((a, b) => {
                                          const levels = { bronze: 1, silver: 2, gold: 3, platinum: 4 };
                                          return levels[b.level.toLowerCase()] - levels[a.level.toLowerCase()];
                                        })[0];

                                      if (!highestBadge) return null;

                                      return (
                                        <Card key={category} className="bg-gray-50">
                                          <CardHeader className="pb-2">
                                            <div className="flex items-center justify-between">
                                              <CardTitle className="text-sm font-medium capitalize">{category} Badge</CardTitle>
                                              <Badge 
                                                className={`
                                                  ${highestBadge.level.toLowerCase() === 'bronze' ? 'bg-amber-100 text-amber-800 border-amber-200' : ''}
                                                  ${highestBadge.level.toLowerCase() === 'silver' ? 'bg-gray-100 text-gray-800 border-gray-300' : ''}
                                                  ${highestBadge.level.toLowerCase() === 'gold' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' : ''}
                                                  ${highestBadge.level.toLowerCase() === 'platinum' ? 'bg-blue-100 text-blue-800 border-blue-300' : ''}
                                                `}
                                              >
                                                {highestBadge.level}
                                              </Badge>
                                            </div>
                                          </CardHeader>
                                          <CardContent>
                                            <div className="text-sm">
                                              <p>Patient has earned {count} {category} badge(s)</p>
                                              <p className="text-xs text-gray-500 mt-1">
                                                Latest on {format(new Date(highestBadge.earnedDate), "MMM d, yyyy")}
                                              </p>
                                              <div className="relative mt-2 group">
                                                <div className="cursor-help text-xs text-blue-600 underline">What does this mean?</div>
                                                <div className="absolute z-50 hidden group-hover:block bg-black text-white text-xs rounded p-2 w-64 left-0 top-5">
                                                  {category === 'exercise' && 
                                                    <p>Exercise badges are earned when patients consistently report exercise scores of 8 or higher.</p>
                                                  }
                                                  {category === 'diet' && 
                                                    <p>Diet badges are earned when patients consistently report diet scores of 8 or higher.</p>
                                                  }
                                                  {category === 'medication' && 
                                                    <p>Medication badges are earned when patients consistently report medication scores of 8 or higher.</p>
                                                  }
                                                  <p className="mt-1">
                                                    <span className="font-bold">Bronze:</span> 7 consecutive days<br/>
                                                    <span className="font-bold">Silver:</span> 14 consecutive days<br/>
                                                    <span className="font-bold">Gold:</span> 30 consecutive days<br/>
                                                    <span className="font-bold">Platinum:</span> 90 consecutive days
                                                  </p>
                                                </div>
                                              </div>
                                            </div>
                                          </CardContent>
                                        </Card>
                                      );
                                    })
                                  )}
                                </div>

                                <div>
                                  <p className="text-sm font-medium mb-2">Overall Badge Summary</p>
                                  <p className="text-sm">{reportDetails.progressBadges.summary}</p>

                                  {reportDetails.progressBadges.totalBadges > 0 && (
                                    <div className="mt-4">
                                      <p className="text-sm font-medium mb-2">Badges by Level</p>
                                      <div className="flex flex-wrap gap-2">
                                        {Object.entries(reportDetails.progressBadges.badgeLevels || {}).map(([level, count]) => (
                                          <Badge 
                                            key={level}
                                            className={`
                                              ${level.toLowerCase() === 'bronze' ? 'bg-amber-100 text-amber-800' : ''}
                                              ${level.toLowerCase() === 'silver' ? 'bg-gray-100 text-gray-800' : ''}
                                              ${level.toLowerCase() === 'gold' ? 'bg-yellow-100 text-yellow-800' : ''}
                                              ${level.toLowerCase() === 'platinum' ? 'bg-blue-100 text-blue-800' : ''}
                                            `}
                                          >
                                            {level}: {count}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    ) : (
                      <div className="space-y-3">
                        <h3 className="text-md font-medium">Available Progress Reports</h3>
                        {patientReports.map((report: any) => (
                          <Card key={report.id} className="bg-gray-50 hover:bg-gray-100 cursor-pointer"
                            onClick={() => setIsViewingReport(report.id)}>
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium">{report.reportDate ? format(new Date(report.reportDate), "MMMM d, yyyy") : 'Date not available'}</p>
                                  <p className="text-sm text-gray-500">
                                    Period: {report.reportPeriodStartDate && report.reportPeriodEndDate ? 
                                      `${format(new Date(report.reportPeriodStartDate), "MMM d")} - ${format(new Date(report.reportPeriodEndDate), "MMM d, yyyy")}` : 
                                      'Date range not available'}
                                  </p>
                                </div>
                                <div className="flex items-center">
                                  <div className="flex space-x-1 mr-4">
                                    <Badge className={getScoreColor(report.avgScore || 0)}>
                                      {report.avgScore?.toFixed(1) || "N/A"}
                                    </Badge>
                                  </div>
                                  <ChevronRight className="h-4 w-4 text-gray-400" />
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </>
          )}
        </Card>
      </div>

      {/* Settings Dialog */}
      <Dialog open={currentTab === 'settings'} onOpenChange={(open) => !open && setCurrentTab('patients')}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Profile Settings</DialogTitle>
            <DialogDescription>
              Update your personal information and notification preferences
            </DialogDescription>
          </DialogHeader>
          <Form {...updateProfileForm}>
            <form onSubmit={updateProfileForm.handleSubmit(handleUpdateProfile)} className="space-y-4">
              <FormField
                control={updateProfileForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={updateProfileForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormDescription>
                      This email will be used for notifications and alerts.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={updateProfileForm.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="+61 4XX XXX XXX" {...field} />
                    </FormControl>
                    <FormDescription>
                      Your mobile number for urgent alerts about patients.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setCurrentTab('patients')}
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-[#2E8BC0]">
                  <Save className="h-4 w-4 mr-2" />
                  {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit CPD Dialog */}
      <Dialog open={isEditingCpd !== null} onOpenChange={(open) => !open && setIsEditingCpd(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              Edit {isEditingCpd?.category === 'diet' ? 'Diet Plan' : 
                    isEditingCpd?.category === 'exercise' ? 'Exercise & Wellness Routine' : 
                    isEditingCpd?.category === 'medication' ? 'Medication Instructions' : 'Care Plan Directive'}
            </DialogTitle>
            <DialogDescription>
              Update the care plan directive for {patientDetails?.name}.
            </DialogDescription>
          </DialogHeader>
          <Form {...updateCpdForm}>
            <form onSubmit={updateCpdForm.handleSubmit(handleUpdateCpd)} className="space-y-4">
              <FormField
                control={updateCpdForm.control}
                name="directive"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {isEditingCpd?.category === 'diet' ? 'Diet Plan' : 
                      isEditingCpd?.category === 'exercise' ? 'Exercise & Wellness Routine' : 
                      isEditingCpd?.category === 'medication' ? 'Medication Instructions' : 'Directive'}
                    </FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder={
                          isEditingCpd?.category === 'diet' 
                            ? "Enter specific diet recommendations and guidelines" 
                            : isEditingCpd?.category === 'exercise'
                            ? "Enter exercise and wellness recommendations"
                            : isEditingCpd?.category === 'medication'
                            ? "Enter medication details, dosage, and schedule"
                            : "Enter detailed instructions or guidelines"
                        }
                        className="min-h-[200px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      These directives will guide the Patient Dashboard chatbot in providing personalised support.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditingCpd(null)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-[#2E8BC0]">
                  {updateCpdMutation.isPending ? "Updating..." : "Update Directive"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}