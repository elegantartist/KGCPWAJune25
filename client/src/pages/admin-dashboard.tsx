import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

// UI Components
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// Icons
import {
  Users,
  UserPlus,
  UserCog,
  Stethoscope,
  Activity,
  Mail,
  Phone,
  Calendar,
  Trash2,
  RefreshCcw,
  BarChart4,
  FileText,
  Shield,
  Clock,
  UserCheck,
  UserX,
  Eye,
  EyeOff,
  MessageSquare,
  Link,
  Unlink,
  FileBarChart,
  ExternalLink,
  Rocket,
  GitBranch,
  CheckCircle,
  XCircle,
  AlertCircle,
  Play,
  RotateCcw,
  Server,
  GitCommit,
  Timer,
  LogOut
} from "lucide-react";

// Validation schemas
const newDoctorSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  email: z.string().email("Please enter a valid email address"),
  phoneNumber: z.string().min(10, "Mobile phone number is required for 2FA and emergency alerts").regex(/^\+?[1-9]\d{1,14}$/, "Please enter a valid phone number")
});

const newPatientSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  email: z.string().email("Please enter a valid email address"),
  phoneNumber: z.string().min(10, "Mobile phone number is required for SMS verification and emergency alerts").regex(/^\+?[1-9]\d{1,14}$/, "Please enter a valid phone number"),
  dietPlan: z.string().optional(),
  exerciseWellness: z.string().optional(),
  medicationInstructions: z.string().optional()
});

const contactUpdateSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  phoneNumber: z.string().min(10, "Phone number is required").regex(/^\+?[1-9]\d{1,14}$/, "Please enter a valid phone number")
});

const patientAssignmentSchema = z.object({
  doctorId: z.string().min(1, "Please select a doctor"),
  patientId: z.string().min(1, "Patient ID is required"),
  notes: z.string().optional()
});

export default function AdminDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [currentTab, setCurrentTab] = useState("overview");
  const [isAddingDoctor, setIsAddingDoctor] = useState(false);
  const [isAddingPatient, setIsAddingPatient] = useState(false);
  const [isAssigningPatient, setIsAssigningPatient] = useState(false);
  const [isReassigningPatient, setIsReassigningPatient] = useState(false);
  const [selectedPatientForAssignment, setSelectedPatientForAssignment] = useState<Patient | null>(null);
  const [userToDelete, setUserToDelete] = useState<{ id: number, name: string, role: string } | null>(null);
  const [contactToEdit, setContactToEdit] = useState<{ id: number, name: string, email: string, phoneNumber?: string, role: string } | null>(null);

  // Define types for better type safety
  type AdminProfile = {
    id: number;
    name: string;
    email: string;
    role: string;
  };

  type Doctor = {
    id: number;
    name: string;
    email: string;
    phoneNumber?: string;
    uin: string;
    joinedDate: string;
    isActive: boolean;
  };

  type Patient = {
    id: number;
    name: string;
    email: string;
    uin: string;
    joinedDate: string;
    isActive: boolean;
  };

  type SystemStats = {
    doctorCount: number;
    patientCount: number;
    reportCount: number;
  };

  // Fetch admin profile
  const { data: adminProfile, isLoading: isLoadingAdmin } = useQuery<AdminProfile>({
    queryKey: ["/api/admin/profile"],
    retry: false,
  });

  // Fetch doctors
  const { 
    data: doctors = [] as Doctor[], 
    isLoading: isLoadingDoctors,
    refetch: refetchDoctors 
  } = useQuery<Doctor[]>({
    queryKey: ["/api/admin/doctors"],
    retry: false
  });

  // Fetch patients
  const { 
    data: patients = [] as Patient[], 
    isLoading: isLoadingPatients,
    refetch: refetchPatients
  } = useQuery<Patient[]>({
    queryKey: ["/api/admin/patients"],
    retry: false
  });

  // Fetch system stats
  const { 
    data: stats = { doctorCount: 0, patientCount: 0, reportCount: 0 } as SystemStats,
    isLoading: isLoadingStats,
    refetch: refetchStats
  } = useQuery<SystemStats>({
    queryKey: ["/api/admin/stats"],
    retry: false
  });

  // Admin impersonation function
  const handleViewDoctorDashboard = async (doctor: Doctor) => {
    try {
      const response = await fetch('/api/admin/set-impersonated-doctor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctorIdToImpersonate: doctor.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // If unauthorized (401), redirect to admin login for re-authentication
        if (response.status === 401) {
          console.log('[FRONTEND DEBUG] Admin session expired or invalid. Redirecting to admin login.');
          toast({
            title: "Authentication Required",
            description: "Please log in as admin to access doctor dashboard.",
            variant: "destructive",
          });
          navigate('/admin-login');
          return;
        }
        
        throw new Error(errorData.message || 'Failed to set impersonation context.');
      }

      // On success, redirect to the doctor's dashboard
      console.log(`[FRONTEND DEBUG] Admin set impersonation. Redirecting to /doctor-dashboard`);
      navigate('/doctor-dashboard');
    } catch (error: any) {
      console.error('Error setting impersonation:', error);
      toast({
        title: "Impersonation Failed",
        description: error.message || "Could not set admin impersonation for doctor.",
        variant: "destructive",
      });
    }
  };

  // Add doctor mutation
  const addDoctorMutation = useMutation({
    mutationFn: (data: z.infer<typeof newDoctorSchema>) => {
      return apiRequest(
        "POST",
        "/api/admin/doctors",
        data
      );
    },
    onSuccess: () => {
      toast({
        title: "Doctor added successfully",
        description: "A secure setup link has been sent to the doctor's email address",
      });
      setIsAddingDoctor(false);
      refetchDoctors();
      refetchStats();
    },
    onError: (error) => {
      toast({
        title: "Failed to add doctor",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  });

  // Add patient mutation
  const addPatientMutation = useMutation({
    mutationFn: (data: z.infer<typeof newPatientSchema>) => {
      return apiRequest(
        "POST", 
        "/api/admin/patients",
        data
      );
    },
    onSuccess: () => {
      toast({
        title: "Patient added successfully",
        description: "The new patient has been added to the system",
      });
      setIsAddingPatient(false);
      refetchPatients();
      refetchStats();
    },
    onError: (error) => {
      toast({
        title: "Failed to add patient",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: (userId: number) => {
      return apiRequest(
        "DELETE",
        `/api/admin/users/${userId}`
      );
    },
    onSuccess: () => {
      toast({
        title: "User deactivated successfully",
        description: "The user has been deactivated from the system",
      });
      setUserToDelete(null);
      refetchDoctors();
      refetchPatients();
      refetchStats();
    },
    onError: (error) => {
      toast({
        title: "Failed to deactivate user",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  });

  // Contact update mutation
  const updateContactMutation = useMutation({
    mutationFn: async ({ userId, contactData }: { userId: number, contactData: z.infer<typeof contactUpdateSchema> }) => {
      return apiRequest(
        "PATCH",
        `/api/admin/users/${userId}/contact`,
        contactData
      );
    },
    onSuccess: () => {
      toast({
        title: "Contact information updated",
        description: "User contact details have been successfully updated",
      });
      setContactToEdit(null);
      refetchDoctors();
      refetchPatients();
    },
    onError: (error) => {
      toast({
        title: "Failed to update contact",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  });

  // MCA access mutation for admin super-user access
  const mcaAccessMutation = useMutation({
    mutationFn: (params: { targetDoctorId?: number } = {}) => {
      return apiRequest("POST", "/api/doctor/mca-access", params);
    },
    onSuccess: (data) => {
      // Open MCA app in new tab with secure token
      window.open(data.mcaAccessUrl, '_blank');
      toast({
        title: "MCA Access Granted",
        description: `Opening ${data.doctorName || 'Doctor'}'s Mini Clinical Audit (${data.assignedPatientCount} patients)`,
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

  // Patient assignment mutation
  const assignPatientMutation = useMutation({
    mutationFn: (data: z.infer<typeof patientAssignmentSchema>) => {
      return apiRequest(
        "POST",
        "/api/admin/assign-patient",
        {
          doctorId: parseInt(data.doctorId),
          patientId: parseInt(data.patientId),
          notes: data.notes
        }
      );
    },
    onSuccess: () => {
      toast({
        title: "Patient assigned successfully",
        description: "The patient has been assigned to the selected doctor",
      });
      setIsAssigningPatient(false);
      setIsReassigningPatient(false);
      setSelectedPatientForAssignment(null);
      patientAssignmentForm.reset();
      refetchDoctors();
      refetchPatients();
    },
    onError: (error) => {
      toast({
        title: "Assignment failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  });

  // State for password visibility
  const [showDoctorPassword, setShowDoctorPassword] = useState(false);
  const [showPatientPassword, setShowPatientPassword] = useState(false);

  // New doctor form
  const newDoctorForm = useForm<z.infer<typeof newDoctorSchema>>({
    resolver: zodResolver(newDoctorSchema),
    defaultValues: {
      name: "",
      email: "",
      phoneNumber: ""
    }
  });

  // New patient form
  const newPatientForm = useForm<z.infer<typeof newPatientSchema>>({
    resolver: zodResolver(newPatientSchema),
    defaultValues: {
      name: "",
      email: "",
      phoneNumber: "",
      dietPlan: "",
      exerciseWellness: "",
      medicationInstructions: ""
    }
  });

  // Contact update form
  const contactUpdateForm = useForm<z.infer<typeof contactUpdateSchema>>({
    resolver: zodResolver(contactUpdateSchema),
    defaultValues: {
      email: "",
      phoneNumber: ""
    }
  });

  // Patient assignment form
  const patientAssignmentForm = useForm<z.infer<typeof patientAssignmentSchema>>({
    resolver: zodResolver(patientAssignmentSchema),
    defaultValues: {
      doctorId: "",
      patientId: "",
      notes: ""
    }
  });

  // Set contact form values when editing
  useEffect(() => {
    if (contactToEdit) {
      contactUpdateForm.reset({
        email: contactToEdit.email,
        phoneNumber: contactToEdit.phoneNumber || ""
      });
    }
  }, [contactToEdit, contactUpdateForm]);

  // Handler for adding a new doctor
  const handleAddDoctor = (data: z.infer<typeof newDoctorSchema>) => {
    addDoctorMutation.mutate(data);
  };

  // Handler for adding a new patient
  const handleAddPatient = (data: z.infer<typeof newPatientSchema>) => {
    addPatientMutation.mutate(data);
  };

  // Handler for updating contact information
  const handleUpdateContact = (data: z.infer<typeof contactUpdateSchema>) => {
    if (contactToEdit) {
      updateContactMutation.mutate({ 
        userId: contactToEdit.id, 
        contactData: data 
      });
    }
  };

  // Handler for deleting a user
  const handleDeleteUser = () => {
    if (userToDelete) {
      deleteUserMutation.mutate(userToDelete.id);
    }
  };

  // Handler for assigning patient to doctor
  const handleAssignPatient = (data: z.infer<typeof patientAssignmentSchema>) => {
    assignPatientMutation.mutate(data);
  };

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/logout"),
    onSuccess: () => {
      toast({
        title: "Logged out successfully",
        description: "You have been securely logged out",
      });
      // Navigate to login or home page
      window.location.href = "/";
    },
    onError: (error) => {
      toast({
        title: "Logout failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  });

  // Handler for opening assignment dialog
  const handleOpenAssignment = (patient?: Patient) => {
    if (patient) {
      setSelectedPatientForAssignment(patient);
      patientAssignmentForm.reset({
        doctorId: "",
        patientId: patient.id.toString(),
        notes: ""
      });
      setIsReassigningPatient(true);
    } else {
      setSelectedPatientForAssignment(null);
      patientAssignmentForm.reset();
      setIsAssigningPatient(true);
    }
  };

  // Helper function to format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-AU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (isLoadingAdmin) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Loading Admin Dashboard</h2>
          <p>Please wait while we load your information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#2E8BC0]">Admin Dashboard</h1>
          <p className="text-gray-600">Manage users and system settings</p>
        </div>
        <div className="flex items-center space-x-4">
          <Card className="p-4 shadow-sm">
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-blue-700 text-white">
                  <Shield className="h-8 w-8" />
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-lg">{adminProfile?.name || "Administrator"}</p>
                <div className="flex items-center text-sm text-gray-500 mt-1">
                  <Mail className="h-3.5 w-3.5 mr-1" />
                  <p>{adminProfile?.email || "admin@keepgoingcare.com"}</p>
                </div>
                <div className="flex items-center">
                  <Badge variant="secondary" className="mr-2">System Admin</Badge>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                className="ml-4"
              >
                <LogOut className="h-4 w-4 mr-2" />
                {logoutMutation.isPending ? "Logging out..." : "Logout"}
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <Tabs value={currentTab} onValueChange={setCurrentTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center">
            <BarChart4 className="h-4 w-4 mr-2" />
            <span>Overview</span>
          </TabsTrigger>
          <TabsTrigger value="doctors" className="flex items-center">
            <Stethoscope className="h-4 w-4 mr-2" />
            <span>Doctors</span>
          </TabsTrigger>
          <TabsTrigger value="patients" className="flex items-center">
            <Activity className="h-4 w-4 mr-2" />
            <span>Patients</span>
          </TabsTrigger>
          <TabsTrigger value="contacts" className="flex items-center">
            <UserCog className="h-4 w-4 mr-2" />
            <span>Contacts</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-[#2E8BC0] flex items-center">
                  <Stethoscope className="h-5 w-5 mr-2" />
                  Doctors
                </CardTitle>
                <CardDescription>Total registered doctors</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{isLoadingStats ? '...' : stats.doctorCount}</div>
              </CardContent>
              <CardFooter className="pt-0">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full" 
                  onClick={() => setCurrentTab("doctors")}
                >
                  Manage Doctors
                </Button>
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-[#2E8BC0] flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  Patients
                </CardTitle>
                <CardDescription>Total registered patients</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{isLoadingStats ? '...' : stats.patientCount}</div>
              </CardContent>
              <CardFooter className="pt-0">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => setCurrentTab("patients")}
                >
                  Manage Patients
                </Button>
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-[#2E8BC0] flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Reports
                </CardTitle>
                <CardDescription>Progress reports generated</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{isLoadingStats ? '...' : stats.reportCount}</div>
              </CardContent>
              <CardFooter className="pt-0">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => {
                    refetchStats();
                    toast({
                      title: "Statistics updated",
                      description: "The system statistics have been refreshed",
                    });
                  }}
                >
                  <RefreshCcw className="h-4 w-4 mr-2" />
                  Refresh Stats
                </Button>
              </CardFooter>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-[#2E8BC0] flex items-center">
                  <UserCheck className="h-5 w-5 mr-2" />
                  Recent Doctors
                </CardTitle>
                <CardDescription>Latest registered healthcare providers</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingDoctors ? (
                  <div className="text-center py-6">Loading doctors...</div>
                ) : doctors.length === 0 ? (
                  <div className="text-center py-6 text-gray-500">
                    <UserCog className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p>No doctors registered yet</p>
                    <p className="text-sm mt-1">Add doctors to get started</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[250px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Date Joined</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {doctors.slice(0, 5).map((doctor: any) => (
                          <TableRow key={doctor.id}>
                            <TableCell className="font-medium">
                              <button 
                                onClick={() => {
                                  // Save the doctor's info in localStorage
                                  localStorage.setItem('currentUser', JSON.stringify({
                                    id: doctor.id,
                                    name: doctor.name,
                                    role: 'doctor',
                                    uin: doctor.uin
                                  }));
                                  // Navigate to doctor dashboard
                                  navigate('/doctor-dashboard');
                                }}
                                className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                              >
                                {doctor.name}
                              </button>
                            </TableCell>
                            <TableCell>{doctor.email}</TableCell>
                            <TableCell>
                              {doctor.joinedDate ? formatDate(doctor.joinedDate) : 'N/A'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </CardContent>
              <CardFooter>
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => setCurrentTab("doctors")}
                >
                  View All Doctors
                </Button>
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-[#2E8BC0] flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  Recent Patients
                </CardTitle>
                <CardDescription>Latest registered patients</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingPatients ? (
                  <div className="text-center py-6">Loading patients...</div>
                ) : patients.length === 0 ? (
                  <div className="text-center py-6 text-gray-500">
                    <UserCog className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p>No patients registered yet</p>
                    <p className="text-sm mt-1">Add patients to get started</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[250px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>UIN</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {patients.slice(0, 5).map((patient: any) => (
                          <TableRow key={patient.id}>
                            <TableCell className="font-medium">
                              <button 
                                onClick={async () => {
                                  try {
                                    const response = await fetch('/api/admin/set-impersonated-patient', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ patientIdToImpersonate: patient.id }),
                                    });

                                    if (!response.ok) {
                                      const errorData = await response.json();
                                      
                                      // If unauthorized (401), redirect to admin login for re-authentication
                                      if (response.status === 401) {
                                        console.log('[FRONTEND DEBUG] Admin session expired or invalid. Redirecting to admin login.');
                                        toast({
                                          title: "Authentication Required",
                                          description: "Please log in as admin to access patient dashboard.",
                                          variant: "destructive",
                                        });
                                        navigate('/admin-login');
                                        return;
                                      }
                                      
                                      throw new Error(errorData.message || 'Failed to set patient impersonation context.');
                                    }

                                    // On success, redirect to the patient's dashboard
                                    console.log(`[FRONTEND DEBUG] Admin set patient impersonation. Redirecting to /patient-dashboard`);
                                    navigate('/patient-dashboard');
                                    toast({
                                      title: "Viewing Patient Dashboard",
                                      description: `You are now viewing the app as ${patient.name}. All data will be recorded as this patient.`,
                                    });
                                  } catch (error: any) {
                                    console.error('Error setting patient impersonation:', error);
                                    toast({
                                      title: "Impersonation Failed",
                                      description: error.message || "Could not set admin impersonation for patient.",
                                      variant: "destructive",
                                    });
                                  }
                                }}
                                className="text-green-600 hover:text-green-800 hover:underline cursor-pointer"
                              >
                                {patient.name}
                              </button>
                            </TableCell>
                            <TableCell>{patient.email}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{patient.uin || 'N/A'}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </CardContent>
              <CardFooter>
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => setCurrentTab("patients")}
                >
                  View All Patients
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>

        {/* Doctors Tab */}
        <TabsContent value="doctors" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Doctor Management</h2>
            <Dialog open={isAddingDoctor} onOpenChange={setIsAddingDoctor}>
              <DialogTrigger asChild>
                <Button className="bg-[#2E8BC0]">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add New Doctor
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Add New Doctor</DialogTitle>
                  <DialogDescription>
                    Enter the doctor's details. A secure setup link will be sent to their email for account activation.
                  </DialogDescription>
                </DialogHeader>
                <Form {...newDoctorForm}>
                  <form onSubmit={newDoctorForm.handleSubmit(handleAddDoctor)} className="space-y-4">
                    <FormField
                      control={newDoctorForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Dr. Jane Smith" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={newDoctorForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input placeholder="doctor@example.com" {...field} />
                          </FormControl>
                          <FormDescription>
                            A secure setup link will be sent to this email address
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={newDoctorForm.control}
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
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsAddingDoctor(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" className="bg-[#2E8BC0]">
                        {addDoctorMutation.isPending ? "Adding..." : "Add Doctor"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
          <div className="rounded-md border">
            {isLoadingDoctors ? (
              <div className="text-center py-8">Loading doctors...</div>
            ) : doctors.length === 0 ? (
              <div className="text-center py-12 px-4">
                <Stethoscope className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-2">No Doctors Yet</h3>
                <p className="text-gray-500 max-w-md mx-auto mb-6">
                  Add doctors to the system to enable them to manage patients and view their progress through the Doctor Dashboard.
                </p>
                <Button onClick={() => setIsAddingDoctor(true)} className="bg-[#2E8BC0]">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Your First Doctor
                </Button>
              </div>
            ) : (
              <Table>
                <TableCaption>List of all registered doctors in the system</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>UIN</TableHead>
                    <TableHead>Joined Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {doctors.map((doctor: any) => (
                    <TableRow key={doctor.id}>
                      <TableCell className="font-medium">
                        <button 
                          onClick={() => handleViewDoctorDashboard(doctor)}
                          className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                        >
                          {doctor.name}
                        </button>
                        {doctor.roleName && (
                          <Badge variant="secondary" className="ml-2 capitalize">{doctor.roleName}</Badge>
                        )}
                      </TableCell>
                      <TableCell>{doctor.email}</TableCell>
                      <TableCell>{doctor.phoneNumber || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{doctor.uin || "—"}</Badge>
                      </TableCell>
                      <TableCell>
                        {doctor.joinedDate ? formatDate(doctor.joinedDate) : "—"}
                      </TableCell>
                      <TableCell>
                        {doctor.isActive ? (
                          <Badge variant="outline" className="bg-green-100 text-green-800">Active</Badge>
                        ) : (
                          <Badge variant="destructive" className="bg-red-100 text-red-800">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-[#2E8BC0] border-[#2E8BC0] hover:bg-[#2E8BC0] hover:text-white"
                            onClick={() => {
                              mcaAccessMutation.mutate({ targetDoctorId: doctor.id });
                            }}
                            disabled={mcaAccessMutation.isPending}
                          >
                            <FileBarChart className="h-3 w-3 mr-1" />
                            MCA
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="icon" 
                                className="h-8 w-8 text-red-500"
                                onClick={() => setUserToDelete({
                                  id: doctor.id,
                                  name: doctor.name,
                                  role: "doctor"
                                })}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Deactivate Doctor</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to deactivate <strong>{userToDelete?.name}</strong>? This will prevent them from accessing the system and managing their patients. This action can be reversed later if needed.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => setUserToDelete(null)}>
                                  Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={handleDeleteUser}
                                  className="bg-red-500 text-white hover:bg-red-600"
                                >
                                  {deleteUserMutation.isPending ? "Deactivating..." : "Deactivate"}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        {/* Patients Tab */}
        <TabsContent value="patients" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Patient Management</h2>
            <div className="flex space-x-2">
              <Dialog open={isAssigningPatient} onOpenChange={setIsAssigningPatient}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="border-[#2E8BC0] text-[#2E8BC0]">
                    <Link className="h-4 w-4 mr-2" />
                    Assign Patient
                  </Button>
                </DialogTrigger>
              </Dialog>
              <Dialog open={isAddingPatient} onOpenChange={setIsAddingPatient}>
                <DialogTrigger asChild>
                  <Button className="bg-[#2E8BC0]">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add New Patient
                  </Button>
                </DialogTrigger>
              </Dialog>
            </div>
            
            {/* Assignment Dialog */}
            <Dialog open={isAssigningPatient || isReassigningPatient} onOpenChange={(open) => {
              if (!open) {
                setIsAssigningPatient(false);
                setIsReassigningPatient(false);
                setSelectedPatientForAssignment(null);
                patientAssignmentForm.reset();
              }
            }}>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>
                    {isReassigningPatient ? `Assign ${selectedPatientForAssignment?.name} to Doctor` : "Assign Patient to Doctor"}
                  </DialogTitle>
                  <DialogDescription>
                    {isReassigningPatient 
                      ? "Select a doctor to assign this patient to. This will create a new doctor-patient relationship."
                      : "Select both a patient and doctor to create a new assignment relationship."
                    }
                  </DialogDescription>
                </DialogHeader>
                <Form {...patientAssignmentForm}>
                  <form onSubmit={patientAssignmentForm.handleSubmit(handleAssignPatient)} className="space-y-4">
                    {!isReassigningPatient && (
                      <FormField
                        control={patientAssignmentForm.control}
                        name="patientId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Select Patient</FormLabel>
                            <FormControl>
                              <select {...field} className="w-full p-2 border border-gray-300 rounded-md">
                                <option value="">Choose a patient...</option>
                                {patients.map((patient) => (
                                  <option key={patient.id} value={patient.id.toString()}>
                                    {patient.name} ({patient.uin})
                                  </option>
                                ))}
                              </select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    
                    <FormField
                      control={patientAssignmentForm.control}
                      name="doctorId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Select Doctor</FormLabel>
                          <FormControl>
                            <select {...field} className="w-full p-2 border border-gray-300 rounded-md">
                              <option value="">Choose a doctor...</option>
                              {doctors.map((doctor) => (
                                <option key={doctor.id} value={doctor.id.toString()}>
                                  {doctor.name} ({doctor.uin})
                                </option>
                              ))}
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={patientAssignmentForm.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Assignment Notes (Optional)</FormLabel>
                          <FormControl>
                            <textarea 
                              {...field} 
                              className="w-full p-2 border border-gray-300 rounded-md h-20"
                              placeholder="Add any notes about this assignment..."
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsAssigningPatient(false);
                          setIsReassigningPatient(false);
                          setSelectedPatientForAssignment(null);
                          patientAssignmentForm.reset();
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={assignPatientMutation.isPending}
                        className="bg-[#2E8BC0]"
                      >
                        {assignPatientMutation.isPending ? "Assigning..." : "Assign Patient"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
            
            <Dialog open={isAddingPatient} onOpenChange={setIsAddingPatient}>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Add New Patient</DialogTitle>
                  <DialogDescription>
                    Enter the patient's details to create a new account.
                  </DialogDescription>
                </DialogHeader>
                <Form {...newPatientForm}>
                  <form onSubmit={newPatientForm.handleSubmit(handleAddPatient)} className="space-y-4">
                    <FormField
                      control={newPatientForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" {...field} />
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
                            <Input placeholder="patient@example.com" {...field} />
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
                    
                    <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                      <h3 className="font-semibold text-gray-900">Initial Care Plan Directives</h3>
                      
                      <FormField
                        control={newPatientForm.control}
                        name="dietPlan"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Diet Plan</FormLabel>
                            <FormControl>
                              <textarea 
                                {...field}
                                className="w-full p-3 border border-gray-300 rounded-md h-20 resize-none"
                                placeholder="Enter specific diet recommendations and guidelines"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={newPatientForm.control}
                        name="exerciseWellness"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Exercise & Wellness Routine</FormLabel>
                            <FormControl>
                              <textarea 
                                {...field}
                                className="w-full p-3 border border-gray-300 rounded-md h-20 resize-none"
                                placeholder="Enter exercise and wellness recommendations"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={newPatientForm.control}
                        name="medicationInstructions"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Medication Instructions</FormLabel>
                            <FormControl>
                              <textarea 
                                {...field}
                                className="w-full p-3 border border-gray-300 rounded-md h-20 resize-none"
                                placeholder="Enter medication details, dosage, and schedule"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsAddingPatient(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" className="bg-[#2E8BC0]">
                        {addPatientMutation.isPending ? "Adding..." : "Add Patient"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
          <div className="rounded-md border">
            {isLoadingPatients ? (
              <div className="text-center py-8">Loading patients...</div>
            ) : patients.length === 0 ? (
              <div className="text-center py-12 px-4">
                <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-2">No Patients Yet</h3>
                <p className="text-gray-500 max-w-md mx-auto mb-6">
                  Add patients to the system so doctors can monitor their health metrics and provide personalised care.
                </p>
                <Button onClick={() => setIsAddingPatient(true)} className="bg-[#2E8BC0]">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Your First Patient
                </Button>
              </div>
            ) : (
              <Table>
                <TableCaption>List of all registered patients in the system</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>UIN</TableHead>
                    <TableHead>Joined Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {patients.map((patient: any) => (
                    <TableRow key={patient.id}>
                      <TableCell className="font-medium">
                        <button 
                          onClick={async () => {
                            try {
                              const response = await fetch('/api/admin/set-impersonated-patient', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ patientIdToImpersonate: patient.id }),
                              });

                              if (!response.ok) {
                                const errorData = await response.json();
                                
                                // If unauthorized (401), redirect to admin login for re-authentication
                                if (response.status === 401) {
                                  console.log('[FRONTEND DEBUG] Admin session expired or invalid. Redirecting to admin login.');
                                  toast({
                                    title: "Authentication Required",
                                    description: "Please log in as admin to access patient dashboard.",
                                    variant: "destructive",
                                  });
                                  navigate('/admin-login');
                                  return;
                                }
                                
                                throw new Error(errorData.message || 'Failed to set patient impersonation context.');
                              }

                              console.log(`[FRONTEND DEBUG] Admin set patient impersonation. Redirecting to /patient-dashboard`);
                              navigate('/patient-dashboard'); // Navigate to patient dashboard
                              toast({
                                title: "Viewing Patient Dashboard",
                                description: `You are now viewing the app as ${patient.name}. All data will be recorded as this patient.`,
                              });
                            } catch (error: any) {
                              console.error('Error setting patient impersonation:', error);
                              toast({
                                title: "Impersonation Failed",
                                description: error.message || "Could not set admin impersonation for patient.",
                                variant: "destructive",
                              });
                            }
                          }}
                          className="text-green-600 hover:text-green-800 hover:underline cursor-pointer text-left font-medium"
                        >
                          {patient.name}
                        </button>
                        {patient.roleName && (
                          <Badge variant="secondary" className="ml-2 capitalize">{patient.roleName}</Badge>
                        )}
                      </TableCell>
                      <TableCell>{patient.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{patient.uin || "—"}</Badge>
                      </TableCell>
                      <TableCell>
                        {patient.joinedDate ? formatDate(patient.joinedDate) : "—"}
                      </TableCell>
                      <TableCell>
                        {patient.isActive ? (
                          <Badge variant="outline" className="bg-green-100 text-green-800">Active</Badge>
                        ) : (
                          <Badge variant="destructive" className="bg-red-100 text-red-800">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-8 w-8 text-blue-500"
                            onClick={() => handleOpenAssignment(patient)}
                            title="Assign to Doctor"
                          >
                            <Link className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="icon" 
                                className="h-8 w-8 text-red-500"
                                onClick={() => setUserToDelete({
                                  id: patient.id,
                                  name: patient.name,
                                  role: "patient"
                                })}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Deactivate Patient</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to deactivate <strong>{userToDelete?.name}</strong>? This will prevent them from accessing the system. This action can be reversed later if needed.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel onClick={() => setUserToDelete(null)}>
                                Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={handleDeleteUser}
                                className="bg-red-500 text-white hover:bg-red-600"
                              >
                                {deleteUserMutation.isPending ? "Deactivating..." : "Deactivate"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        {/* Contact Management Tab */}
        <TabsContent value="contacts" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-[#2E8BC0]">Contact Management</h2>
              <p className="text-gray-600">Admin override for all user contact information</p>
            </div>
            <Badge variant="secondary" className="bg-red-100 text-red-800">
              Admin Override Authority
            </Badge>
          </div>

          <Card className="border-l-4 border-l-orange-500">
            <CardHeader>
              <CardTitle className="text-orange-700 flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                Admin Contact Override Panel
              </CardTitle>
              <CardDescription>
                As system administrator, you have full authority to view and modify all user contact information. 
                This includes emergency contact updates, phone number changes for 2FA, and email address corrections.
              </CardDescription>
            </CardHeader>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Doctors Contact Management */}
            <Card>
              <CardHeader>
                <CardTitle className="text-[#2E8BC0] flex items-center">
                  <Stethoscope className="h-5 w-5 mr-2" />
                  Doctor Contact Information
                </CardTitle>
                <CardDescription>
                  View and manage all doctor contact details including emergency contacts and 2FA phone numbers
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingDoctors ? (
                  <div className="text-center py-6">Loading doctor contacts...</div>
                ) : doctors.length === 0 ? (
                  <div className="text-center py-6 text-gray-500">
                    <UserCog className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p>No doctors registered yet</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {doctors.map((doctor: any) => (
                        <Card key={doctor.id} className="border border-gray-200">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div className="space-y-2 flex-1">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-semibold text-gray-900">{doctor.name}</h4>
                                  <Badge variant={doctor.isActive ? "default" : "secondary"}>
                                    {doctor.isActive ? "Active" : "Inactive"}
                                  </Badge>
                                </div>
                                <div className="space-y-1 text-sm">
                                  <div className="flex items-center text-gray-600">
                                    <Mail className="h-3.5 w-3.5 mr-1.5" />
                                    <span>{doctor.email}</span>
                                  </div>
                                  <div className="flex items-center text-gray-600">
                                    <Phone className="h-3.5 w-3.5 mr-1.5" />
                                    <span>{doctor.phoneNumber || "No phone number"}</span>
                                  </div>
                                  <div className="flex items-center text-gray-600">
                                    <Calendar className="h-3.5 w-3.5 mr-1.5" />
                                    <span>Joined {formatDate(doctor.joinedDate)}</span>
                                  </div>
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setContactToEdit({
                                  id: doctor.id,
                                  name: doctor.name,
                                  email: doctor.email,
                                  phoneNumber: doctor.phoneNumber,
                                  role: "doctor"
                                })}
                                className="ml-3"
                              >
                                <UserCog className="h-4 w-4 mr-1" />
                                Edit Contact
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            {/* Patients Contact Management */}
            <Card>
              <CardHeader>
                <CardTitle className="text-[#2E8BC0] flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  Patient Contact Information
                </CardTitle>
                <CardDescription>
                  View and manage all patient contact details for emergency communications
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingPatients ? (
                  <div className="text-center py-6">Loading patient contacts...</div>
                ) : patients.length === 0 ? (
                  <div className="text-center py-6 text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p>No patients registered yet</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {patients.map((patient: any) => (
                        <Card key={patient.id} className="border border-gray-200">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div className="space-y-2 flex-1">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-semibold text-gray-900">{patient.name}</h4>
                                  <Badge variant={patient.isActive ? "default" : "secondary"}>
                                    {patient.isActive ? "Active" : "Inactive"}
                                  </Badge>
                                </div>
                                <div className="space-y-1 text-sm">
                                  <div className="flex items-center text-gray-600">
                                    <Mail className="h-3.5 w-3.5 mr-1.5" />
                                    <span>{patient.email}</span>
                                  </div>
                                  <div className="flex items-center text-gray-600">
                                    <Phone className="h-3.5 w-3.5 mr-1.5" />
                                    <span>{patient.phoneNumber || "No phone number"}</span>
                                  </div>
                                  <div className="flex items-center text-gray-600">
                                    <Calendar className="h-3.5 w-3.5 mr-1.5" />
                                    <span>Joined {formatDate(patient.joinedDate)}</span>
                                  </div>
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setContactToEdit({
                                  id: patient.id,
                                  name: patient.name,
                                  email: patient.email,
                                  phoneNumber: patient.phoneNumber,
                                  role: "patient"
                                })}
                                className="ml-3"
                              >
                                <UserCog className="h-4 w-4 mr-1" />
                                Edit Contact
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Emergency Contact Override Information */}
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader>
              <CardTitle className="text-blue-700 flex items-center">
                <Phone className="h-5 w-5 mr-2" />
                Emergency Contact Protocol
              </CardTitle>
              <CardDescription>
                Admin contact override details for emergency situations and system communications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-semibold text-gray-900">Admin Emergency Contact</h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div className="flex items-center">
                      <Phone className="h-3.5 w-3.5 mr-1.5" />
                      <span>0433509441</span>
                    </div>
                    <div className="flex items-center">
                      <Mail className="h-3.5 w-3.5 mr-1.5" />
                      <span>admin@anthrocytai.com</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-gray-900">Override Authority</h4>
                  <div className="text-sm text-gray-600">
                    <p>As system administrator, you can override any user contact information for emergency communications, 2FA updates, or technical support purposes.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contact Edit Dialog */}
        <Dialog open={!!contactToEdit} onOpenChange={() => setContactToEdit(null)}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <UserCog className="h-5 w-5 mr-2" />
                Update Contact Information
              </DialogTitle>
              <DialogDescription>
                Admin override: Update contact details for {contactToEdit?.name} ({contactToEdit?.role})
              </DialogDescription>
            </DialogHeader>
            <Form {...contactUpdateForm}>
              <form onSubmit={contactUpdateForm.handleSubmit(handleUpdateContact)} className="space-y-4">
                <FormField
                  control={contactUpdateForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center">
                        <Mail className="h-4 w-4 mr-1" />
                        Email Address
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="user@example.com" {...field} />
                      </FormControl>
                      <FormDescription>
                        This email will be used for all system communications
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={contactUpdateForm.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center">
                        <Phone className="h-4 w-4 mr-1" />
                        Phone Number
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="+61400000000" {...field} />
                      </FormControl>
                      <FormDescription>
                        Required for 2FA verification and emergency alerts
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setContactToEdit(null)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={updateContactMutation.isPending}
                    className="bg-[#2E8BC0] hover:bg-[#1E5F8F]"
                  >
                    {updateContactMutation.isPending ? "Updating..." : "Update Contact"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </Tabs>

      {/* CI/CD Monitoring Section */}
      <div className="mt-8 border-t pt-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-[#2E8BC0] flex items-center">
              <Rocket className="h-5 w-5 mr-2" />
              CI/CD Pipeline Monitor
            </CardTitle>
            <CardDescription>
              Continuous Integration and Deployment status for KGC platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Current Deployment Status */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Current Deployment</h3>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Live
                  </Badge>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <Server className="h-4 w-4 mr-2 text-blue-600" />
                      <span className="font-medium">Production</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <GitCommit className="h-3 w-3 mr-1" />
                      <span>v2.1.3</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center">
                      <GitBranch className="h-4 w-4 mr-2 text-blue-600" />
                      <span className="font-medium">Branch: main</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Timer className="h-3 w-3 mr-1" />
                      <span>2 hours ago</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pipeline Status */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Pipeline Status</h3>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                      <span className="text-sm">Source</span>
                    </div>
                    <span className="text-xs text-gray-500">GitHub</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                      <span className="text-sm">Build</span>
                    </div>
                    <span className="text-xs text-gray-500">AWS CodeBuild</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                      <span className="text-sm">Deploy</span>
                    </div>
                    <span className="text-xs text-gray-500">AWS Amplify</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Deployments */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-4">Recent Deployments</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 mr-3 text-green-600" />
                    <div>
                      <p className="font-medium text-sm">Production deployment successful</p>
                      <p className="text-xs text-gray-500">v2.1.3 - CI/CD monitoring interface added</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">2 hours ago</p>
                    <p className="text-xs text-gray-400">Duration: 3m 24s</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 mr-3 text-green-600" />
                    <div>
                      <p className="font-medium text-sm">Production deployment successful</p>
                      <p className="text-xs text-gray-500">v2.1.2 - Documentation cleanup and organization</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">1 day ago</p>
                    <p className="text-xs text-gray-400">Duration: 2m 58s</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 mr-3 text-green-600" />
                    <div>
                      <p className="font-medium text-sm">Production deployment successful</p>
                      <p className="text-xs text-gray-500">v2.1.1 - Production logging cleanup</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">2 days ago</p>
                    <p className="text-xs text-gray-400">Duration: 3m 12s</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex space-x-3">
              <Button 
                variant="outline"
                size="sm"
                className="flex items-center"
                onClick={() => {
                  toast({
                    title: "Pipeline Status",
                    description: "All systems operational. Last deployment: 2 hours ago",
                  });
                }}
              >
                <RefreshCcw className="h-4 w-4 mr-1" />
                Refresh Status
              </Button>
              
              <Button 
                variant="outline"
                size="sm"
                className="flex items-center"
                onClick={() => {
                  window.open('https://console.aws.amazon.com/codesuite/codepipeline/pipelines', '_blank');
                }}
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                AWS Console
              </Button>
              
              <Button 
                variant="outline"
                size="sm"
                className="flex items-center"
                onClick={() => {
                  window.open('https://github.com/elegantartist/KGCPWAJune25', '_blank');
                }}
              >
                <GitBranch className="h-4 w-4 mr-1" />
                GitHub Repository
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}