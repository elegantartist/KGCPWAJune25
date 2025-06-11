/**
 * KEEP GOING CARE - DOCTOR DASHBOARD
 * Refactored from legacy blueprint to work with new secure architecture
 */

import React, { useState, useEffect } from 'react';
import { useLocation } from "wouter";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ArrowLeft, LogOut, UserCircle, Clipboard, Calendar, MessageSquare, Activity } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface Patient {
  id: number;
  name: string;
  email: string;
  phoneNumber: string;
  userId: number;
  doctorId: number;
  isActive: boolean;
  createdAt: string;
  uin: string | null;
}

interface HealthMetric {
  id: number;
  date: string;
  medicationScore: number;
  dietScore: number;
  exerciseScore: number;
}

interface CarePlanDirective {
  healthy_eating_plan: string;
  exercise_wellness_routine: string;
  prescribed_medication: string;
}

export default function DoctorDashboard() {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [healthData, setHealthData] = useState<any[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [, setLocation] = useLocation();
  const [doctorInfo, setDoctorInfo] = useState<{ name: string; firstName: string } | null>(null);
  const [doctorRemarks, setDoctorRemarks] = useState<CarePlanDirective>({
    healthy_eating_plan: "",
    exercise_wellness_routine: "",
    prescribed_medication: "",
  });

  // Use refs to store current values and avoid re-render issues
  const healthyEatingRef = React.useRef<HTMLTextAreaElement>(null);
  const exerciseWellnessRef = React.useRef<HTMLTextAreaElement>(null);
  const prescribedMedicationRef = React.useRef<HTMLTextAreaElement>(null);

  // Auth headers using localStorage JWT
  const createAuthHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  const handleUnauthorized = () => {
    localStorage.removeItem('auth_token');
    setLocation('/login');
  };

  // Fetch doctor's information
  const fetchDoctorInfo = async () => {
    try {
      const response = await fetch('/api/users/me', {
        method: 'GET',
        headers: createAuthHeaders()
      });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch doctor information');
      }

      const doctorData = await response.json();
      
      // Extract first name from full name (e.g., "Dr. Marijke Collins" -> "Marijke")
      const nameParts = doctorData.name.split(' ');
      let firstName = 'Doctor';
      
      if (nameParts.length >= 2) {
        // If name starts with "Dr.", use the next part
        if (nameParts[0].toLowerCase().includes('dr')) {
          firstName = nameParts[1];
        } else {
          // Otherwise use the first part
          firstName = nameParts[0];
        }
      }

      setDoctorInfo({
        name: doctorData.name,
        firstName: firstName
      });
    } catch (err: any) {
      console.error('Error fetching doctor info:', err);
      // Don't set error state for this, just use default welcome
    }
  };

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    setLocation('/login');
  };

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setLocation('/login');
      return;
    }
    fetchDoctorInfo();
    fetchPatients();
  }, [setLocation]);

  // Fetch doctor's patients (adapted from legacy API)
  const fetchPatients = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/doctor/patients', {
        method: 'GET',
        headers: createAuthHeaders()
      });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch patients');
      }

      const data = await response.json();
      setPatients(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch patient health data (fixed to use doctor-specific endpoint)
  const fetchPatientHealthData = async (patientId: number) => {
    try {
      const response = await fetch(`/api/doctor/patients/${patientId}/health-metrics`, {
        method: 'GET',
        headers: createAuthHeaders()
      });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch patient health data');
      }

      const data = await response.json();
      
      // Transform data for LineChart with hardened date handling
      const transformedData = data.map((entry: any) => {
        // HARDENED CODE: Check for valid date before creating Date object
        const dateObj = entry.date ? new Date(entry.date) : null;
        const formattedDate = dateObj && !isNaN(dateObj.getTime())
          ? `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`
          : 'No Date';
          
        return {
          date: formattedDate,
          medication: entry.medicationScore || 0,
          diet: entry.dietScore || 0,
          exercise: entry.exerciseScore || 0,
        };
      });

      setHealthData(transformedData);
      setSelectedPatient(prevPatient => ({ ...prevPatient!, healthData: transformedData }));
    } catch (err: any) {
      setError('Failed to fetch patient health data');
    }
  };

  // Fetch care plan directives (adapted from legacy)
  const fetchDoctorRemarks = async (patientId: number) => {
    try {
      const response = await fetch(`/api/doctor/patients/${patientId}/care-plan`, {
        method: 'GET',
        headers: createAuthHeaders(),
      });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!response.ok) {
        // If no care plan exists, use defaults
        setDoctorRemarks({
          healthy_eating_plan: "",
          exercise_wellness_routine: "",
          prescribed_medication: "",
        });
        return;
      }

      const data = await response.json();
      if (data.status === 'success') {
        setDoctorRemarks(data.remarks);
      } else {
        setDoctorRemarks({
          healthy_eating_plan: "",
          exercise_wellness_routine: "",
          prescribed_medication: "",
        });
      }
    } catch (err: any) {
      setError('Failed to fetch doctor remarks');
    }
  };

  // Handle patient selection
  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatient(patient);
    fetchPatientHealthData(patient.id);
    fetchDoctorRemarks(patient.id);
  };

  // New handler function for cleaning up state before going back to the list
  const handleReturnToList = () => {
    setHealthData([]); // Clear the previous patient's health data
    setDoctorRemarks({ // Reset the remarks to their initial state
      healthy_eating_plan: "",
      exercise_wellness_routine: "",
      prescribed_medication: "",
    });
    setError(null); // Clear any previous errors
    setSelectedPatient(null); // Go back to the list view
  };

  // Save care plan directives (adapted from legacy)
  const handleSaveHealthPoints = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!selectedPatient) return;

    const formData = new FormData(event.target as HTMLFormElement);
    const data = Object.fromEntries(formData.entries());

    try {
      const response = await fetch(`/api/doctor/patients/${selectedPatient.id}/care-plan`, {
        method: 'POST',
        headers: createAuthHeaders(),
        body: JSON.stringify(data)
      });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to save care plan directives');
      }

      // Update the local state with the saved data
      setDoctorRemarks({
        healthy_eating_plan: data.healthy_eating_plan as string || "",
        exercise_wellness_routine: data.exercise_wellness_routine as string || "",
        prescribed_medication: data.prescribed_medication as string || "",
      });

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);

      // Refresh the care plan data from server to ensure consistency
      fetchDoctorRemarks(selectedPatient.id);
    } catch (err: any) {
      setError('Failed to save care plan directives');
    }
  };

  // Loading spinner component
  const LoadingSpinner = () => (
    <div className="flex justify-center items-center p-8">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
    </div>
  );

  // Error message component
  const ErrorMessage = () => (
    <Alert className="mb-4">
      <AlertDescription className="text-red-700">
        {error}
        <Button
          variant="link"
          onClick={() => error?.includes('authentication') ? setLocation('/login') : fetchPatients()}
          className="ml-2 text-red-600 hover:text-red-800 underline"
        >
          {error?.includes('authentication') ? 'Go to Login' : 'Try again'}
        </Button>
      </AlertDescription>
    </Alert>
  );

  // Patient list view (adapted from legacy)
  const PatientListView = () => (
    <div className="p-6 space-y-6">
      <Card>
        {/* Header Section */}
        <CardHeader className="bg-emerald-50 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-3xl font-extrabold text-emerald-800">
                Welcome, Doctor {doctorInfo?.firstName || 'Doctor'}
              </CardTitle>
              <CardDescription className="text-emerald-600 mt-1">Your dashboard overview</CardDescription>
            </div>
            <div className="flex flex-col items-end space-y-2">
              <Button
                onClick={handleLogout}
                className="bg-green-600 text-white hover:bg-green-700 w-36"
              >
                <LogOut size={18} className="mr-2" />
                Logout
              </Button>
              <div className="border-t border-gray-300 w-36 my-2"></div>
              <Button
                onClick={() => console.log('Add patient modal would open')}
                className="bg-blue-600 text-white hover:bg-blue-700 w-36"
              >
                <UserCircle size={18} className="mr-2" />
                Add Patient
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Main Content Section */}
        <CardContent className="p-6">
          {error ? (
            <ErrorMessage />
          ) : loading ? (
            <LoadingSpinner />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {patients.map((patient) => (
                <Card
                  key={patient.id}
                  className="cursor-pointer hover:shadow-md transition-all duration-200 hover:bg-emerald-50"
                  onClick={() => handlePatientSelect(patient)}
                >
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <UserCircle className="text-emerald-600" size={24} />
                        <CardTitle className="text-lg text-emerald-800">{patient.name}</CardTitle>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-emerald-600">
                        <Calendar size={16} />
                        {/* HARDENED CODE: Check for valid createdAt before formatting */}
                        <p>Joined: {patient.createdAt ? new Date(patient.createdAt).toLocaleDateString() : 'Date not available'}</p>
                      </div>
                      <p className="text-sm text-emerald-700">{patient.email}</p>
                      <div className="flex justify-between mt-2 pt-2 border-t border-emerald-100">
                        <span className="flex items-center gap-1 text-sm text-emerald-600">
                          <Activity size={16} /> Active
                        </span>
                        <span className="flex items-center gap-1 text-sm text-emerald-600">
                          <MessageSquare size={16} /> ID: {patient.id}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // Patient detail view (adapted from legacy)
  const PatientDetailView = () => (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <Button
          variant="ghost"
          onClick={handleReturnToList}
          className="text-emerald-600 hover:text-emerald-800"
        >
          <ArrowLeft size={20} className="mr-2" />
          Back to Patient List
        </Button>

        <div className="flex flex-col items-end space-y-2">
          <Button
            onClick={handleLogout}
            className="bg-green-600 text-white hover:bg-green-700"
          >
            <LogOut size={18} className="mr-2" />
            Logout
          </Button>
          <hr className="w-full border-t border-gray-200 my-2" />
          <Button
            onClick={() => console.log('Progress report would open')}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            <Clipboard size={16} className="mr-2" />
            Progress Report
          </Button>
        </div>
      </div>

      {/* Patient Overview Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <UserCircle className="text-emerald-600" size={32} />
                <CardTitle className="text-2xl text-emerald-800">{selectedPatient?.name}</CardTitle>
              </div>
              <p className="text-emerald-600">Patient ID: #{selectedPatient?.id}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <div className="bg-emerald-50 rounded-lg p-4">
              <p className="text-sm text-emerald-600 mb-1">Joined Date</p>
              <p className="font-medium text-emerald-800">
                {/* HARDENED CODE: Check for valid createdAt before formatting */}
                {selectedPatient?.createdAt ? new Date(selectedPatient.createdAt).toLocaleDateString() : 'Date not available'}
              </p>
            </div>
            <div className="bg-emerald-50 rounded-lg p-4">
              <p className="text-sm text-emerald-600 mb-1">Email</p>
              <p className="font-medium text-emerald-800">{selectedPatient?.email}</p>
            </div>
            <div className="bg-emerald-50 rounded-lg p-4">
              <p className="text-sm text-emerald-600 mb-1">Phone</p>
              <p className="font-medium text-emerald-800">{selectedPatient?.phoneNumber}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Health Progress Graph */}
      {healthData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-emerald-800">Health Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={healthData}>
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="medication" stroke="#ff0000" name="Medication" />
                  <Line type="monotone" dataKey="diet" stroke="#008080" name="Diet" />
                  <Line type="monotone" dataKey="exercise" stroke="#0000ff" name="Exercise" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Care Plan Directives Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl text-emerald-800">KGC Care Plan Directives</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveHealthPoints} className="space-y-4">
            {/* Healthy Eating Plan */}
            <div className="bg-emerald-50 rounded-lg p-4">
              <Label className="text-sm font-medium text-emerald-700 mb-2">
                Healthy Eating Plan
              </Label>
              <Textarea
                ref={healthyEatingRef}
                name="healthy_eating_plan"
                placeholder="Enter details for Healthy Eating Plan..."
                className="w-full mt-2"
                rows={3}
                defaultValue={doctorRemarks.healthy_eating_plan || ""}
                key={`healthy_eating_${selectedPatient?.id}_${doctorRemarks.healthy_eating_plan}`}
              />
            </div>

            {/* Exercise and Wellness Routine */}
            <div className="bg-emerald-50 rounded-lg p-4">
              <Label className="text-sm font-medium text-emerald-700 mb-2">
                Exercise and Wellness Routine
              </Label>
              <Textarea
                ref={exerciseWellnessRef}
                name="exercise_wellness_routine"
                placeholder="Enter details for Exercise and Wellness Routine..."
                className="w-full mt-2"
                rows={3}
                defaultValue={doctorRemarks.exercise_wellness_routine || ""}
                key={`exercise_wellness_${selectedPatient?.id}_${doctorRemarks.exercise_wellness_routine}`}
              />
            </div>

            {/* Prescribed Medications */}
            <div className="bg-emerald-50 rounded-lg p-4">
              <Label className="text-sm font-medium text-emerald-700 mb-2">
                Prescribed Medications
              </Label>
              <Textarea
                ref={prescribedMedicationRef}
                name="prescribed_medication"
                placeholder="Enter details for Prescribed Medications..."
                className="w-full mt-2"
                rows={3}
                defaultValue={doctorRemarks.prescribed_medication || ""}
                key={`prescribed_medication_${selectedPatient?.id}_${doctorRemarks.prescribed_medication}`}
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
            >
              Save Care Plan Directives
            </Button>
          </form>

          {/* Success Message */}
          {showSuccess && (
            <Alert className="mt-4">
              <AlertDescription className="text-emerald-800">
                Care Plan Directives saved successfully!
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto bg-emerald-50/30 min-h-screen">
      {selectedPatient ? <PatientDetailView /> : <PatientListView />}
    </div>
  );
}