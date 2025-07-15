import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  Users, UserPlus, Stethoscope, Trash2, RotateCcw,
  LogOut, Search, AlertTriangle, Database
} from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: 'doctor' | 'patient';
  status: 'active' | 'deleted';
  createdAt: string;
  lastActive?: string;
  alertCount?: number;
  assignedDoctor?: string;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [showCreateDoctor, setShowCreateDoctor] = useState(false);
  const [showCreatePatient, setShowCreatePatient] = useState(false);

  // Fetch all users
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['/api/admin/users'],
    enabled: user?.role === 'admin'
  });

  // Fetch deleted users
  const { data: deletedUsers = [] } = useQuery({
    queryKey: ['/api/admin/users/deleted'],
    enabled: user?.role === 'admin'
  });

  // Create doctor mutation
  const createDoctorMutation = useMutation({
    mutationFn: async (doctorData: any) => {
      const response = await fetch('/api/admin/create-doctor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(doctorData)
      });
      if (!response.ok) throw new Error('Failed to create doctor');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setShowCreateDoctor(false);
      toast({ title: 'Doctor created successfully', description: 'Welcome email sent' });
    }
  });

  // Create patient mutation
  const createPatientMutation = useMutation({
    mutationFn: async (patientData: any) => {
      const response = await fetch('/api/admin/create-patient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patientData)
      });
      if (!response.ok) throw new Error('Failed to create patient');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setShowCreatePatient(false);
      toast({ title: 'Patient created successfully', description: 'Welcome email sent' });
    }
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async ({ userId, userType }: { userId: number, userType: string }) => {
      const response = await fetch(`/api/admin/delete-user/${userId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userType })
      });
      if (!response.ok) throw new Error('Failed to delete user');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users/deleted'] });
      toast({ title: 'User deleted', description: 'User moved to deleted storage' });
    }
  });

  // Restore user mutation
  const restoreUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await fetch(`/api/admin/restore-user/${userId}`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Failed to restore user');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users/deleted'] });
      toast({ title: 'User restored', description: 'User access restored' });
    }
  });

  const activeUsers = users.filter((u: User) => u.status === 'active');
  const doctors = activeUsers.filter((u: User) => u.role === 'doctor');
  const patients = activeUsers.filter((u: User) => u.role === 'patient');

  return (
    <Layout>
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header with KGC Branding */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#2E8BC0] mb-2">Admin Dashboard</h1>
            <p className="text-[#676767]">Complete system administration and user management</p>
          </div>
          <Button variant="outline" className="border-[#2E8BC0] text-[#2E8BC0]">
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-[#fdfdfd] border-[#2E8BC0]/20">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Stethoscope className="h-8 w-8 text-[#2E8BC0]" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-[#676767]">Active Doctors</p>
                  <p className="text-2xl font-bold text-[#2E8BC0]">{doctors.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#fdfdfd] border-[#2E8BC0]/20">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-[#2E8BC0]" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-[#676767]">Active Patients</p>
                  <p className="text-2xl font-bold text-[#2E8BC0]">{patients.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#fdfdfd] border-[#2E8BC0]/20">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Trash2 className="h-8 w-8 text-red-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-[#676767]">Deleted Users</p>
                  <p className="text-2xl font-bold text-red-600">{deletedUsers.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#fdfdfd] border-[#2E8BC0]/20">
            <CardContent className="p-6">
              <div className="flex items-center">
                <AlertTriangle className="h-8 w-8 text-yellow-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-[#676767]">System Alerts</p>
                  <p className="text-2xl font-bold text-yellow-600">0</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="overview">User Management</TabsTrigger>
            <TabsTrigger value="doctors">Doctors</TabsTrigger>
            <TabsTrigger value="patients">Patients</TabsTrigger>
            <TabsTrigger value="deleted">Deleted Users</TabsTrigger>
          </TabsList>

          {/* User Management Overview */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Create Doctor */}
              <Card className="bg-[#fdfdfd] border-[#2E8BC0]/20">
                <CardHeader>
                  <CardTitle className="text-[#676767] flex items-center">
                    <Stethoscope className="h-5 w-5 mr-2 text-[#2E8BC0]" />
                    Create Doctor
                  </CardTitle>
                  <CardDescription className="text-[#a4a4a4]">
                    Add new doctor with email/SMS verification
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Dialog open={showCreateDoctor} onOpenChange={setShowCreateDoctor}>
                    <DialogTrigger asChild>
                      <Button className="w-full bg-[#2E8BC0] hover:bg-[#2E8BC0]/90">
                        <UserPlus className="h-4 w-4 mr-2" />
                        Create Doctor
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle className="text-[#2E8BC0]">Create New Doctor</DialogTitle>
                      </DialogHeader>
                      <CreateDoctorForm
                        onSubmit={(data) => createDoctorMutation.mutate(data)}
                        isLoading={createDoctorMutation.isPending}
                      />
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>

              {/* Create Patient */}
              <Card className="bg-[#fdfdfd] border-[#2E8BC0]/20">
                <CardHeader>
                  <CardTitle className="text-[#676767] flex items-center">
                    <Users className="h-5 w-5 mr-2 text-[#2E8BC0]" />
                    Create Patient
                  </CardTitle>
                  <CardDescription className="text-[#a4a4a4]">
                    Add new patient with doctor assignment
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Dialog open={showCreatePatient} onOpenChange={setShowCreatePatient}>
                    <DialogTrigger asChild>
                      <Button className="w-full bg-[#2E8BC0] hover:bg-[#2E8BC0]/90">
                        <Users className="h-4 w-4 mr-2" />
                        Create Patient
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle className="text-[#2E8BC0]">Create New Patient</DialogTitle>
                      </DialogHeader>
                      <CreatePatientForm
                        onSubmit={(data) => createPatientMutation.mutate(data)}
                        isLoading={createPatientMutation.isPending}
                        doctors={doctors}
                      />
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>

              {/* System Management */}
              <Card className="bg-[#fdfdfd] border-[#2E8BC0]/20">
                <CardHeader>
                  <CardTitle className="text-[#676767] flex items-center">
                    <Database className="h-5 w-5 mr-2 text-[#2E8BC0]" />
                    System Management
                  </CardTitle>
                  <CardDescription className="text-[#a4a4a4]">
                    Backup, restore, and system maintenance
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full text-sm">
                      Export User Data
                    </Button>
                    <Button variant="outline" className="w-full text-sm">
                      System Health Check
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Doctors Tab */}
          <TabsContent value="doctors">
            <Card className="bg-[#fdfdfd] border-[#2E8BC0]/20">
              <CardHeader>
                <CardTitle className="text-[#676767]">Doctor Management</CardTitle>
                <CardDescription className="text-[#a4a4a4]">
                  Manage all doctors in the system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <UserList
                  users={doctors}
                  userType="doctor"
                  onDelete={(userId) => deleteUserMutation.mutate({ userId, userType: 'doctor' })}
                  onImpersonate={(userId) => console.log('Impersonate doctor:', userId)}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Patients Tab */}
          <TabsContent value="patients">
            <Card className="bg-[#fdfdfd] border-[#2E8BC0]/20">
              <CardHeader>
                <CardTitle className="text-[#676767]">Patient Management</CardTitle>
                <CardDescription className="text-[#a4a4a4]">
                  Manage all patients in the system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <UserList
                  users={patients}
                  userType="patient"
                  onDelete={(userId) => deleteUserMutation.mutate({ userId, userType: 'patient' })}
                  onImpersonate={(userId) => console.log('Impersonate patient:', userId)}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Deleted Users Tab */}
          <TabsContent value="deleted">
            <Card className="bg-[#fdfdfd] border-[#2E8BC0]/20">
              <CardHeader>
                <CardTitle className="text-[#676767]">Deleted Users</CardTitle>
                <CardDescription className="text-[#a4a4a4]">
                  Manage deleted users and restore access
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DeletedUserList
                  users={deletedUsers}
                  onRestore={(userId) => restoreUserMutation.mutate(userId)}
                  onPermanentDelete={(userId) => console.log('Permanent delete:', userId)}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

// Create Doctor Form Component
function CreateDoctorForm({ onSubmit, isLoading }: any) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            value={formData.firstName}
            onChange={(e) => setFormData({...formData, firstName: e.target.value})}
            required
          />
        </div>
        <div>
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            value={formData.lastName}
            onChange={(e) => setFormData({...formData, lastName: e.target.value})}
            required
          />
        </div>
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({...formData, email: e.target.value})}
          required
        />
      </div>
      <div>
        <Label htmlFor="phone">Mobile Phone</Label>
        <Input
          id="phone"
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData({...formData, phone: e.target.value})}
          required
        />
      </div>
      <Button type="submit" disabled={isLoading} className="w-full bg-[#2E8BC0] hover:bg-[#2E8BC0]/90">
        {isLoading ? 'Creating...' : 'Create Doctor'}
      </Button>
    </form>
  );
}

// Create Patient Form Component
function CreatePatientForm({ onSubmit, isLoading, doctors }: any) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    assignedDoctorId: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            value={formData.firstName}
            onChange={(e) => setFormData({...formData, firstName: e.target.value})}
            required
          />
        </div>
        <div>
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            value={formData.lastName}
            onChange={(e) => setFormData({...formData, lastName: e.target.value})}
            required
          />
        </div>
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({...formData, email: e.target.value})}
          required
        />
      </div>
      <div>
        <Label htmlFor="phone">Mobile Phone</Label>
        <Input
          id="phone"
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData({...formData, phone: e.target.value})}
          required
        />
      </div>
      <div>
        <Label htmlFor="doctor">Assign Doctor</Label>
        <select
          id="doctor"
          value={formData.assignedDoctorId}
          onChange={(e) => setFormData({...formData, assignedDoctorId: e.target.value})}
          className="w-full p-2 border rounded"
          required
        >
          <option value="">Select a doctor</option>
          {doctors.map((doctor: User) => (
            <option key={doctor.id} value={doctor.id}>
              Dr. {doctor.firstName} {doctor.lastName}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" disabled={isLoading} className="w-full bg-[#2E8BC0] hover:bg-[#2E8BC0]/90">
        {isLoading ? 'Creating...' : 'Create Patient'}
      </Button>
    </form>
  );
}

// User List Component
function UserList({ users, userType, onDelete, onImpersonate }: any) {
  return (
    <div className="space-y-4">
      {users.map((user: User) => (
        <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <h3 className="font-medium text-[#676767]">
              {userType === 'doctor' ? 'Dr. ' : ''}{user.firstName} {user.lastName}
            </h3>
            <p className="text-sm text-[#a4a4a4]">{user.email}</p>
            <p className="text-sm text-[#a4a4a4]">{user.phone}</p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={() => onImpersonate(user.id)}>
              Test Profile
            </Button>
            <Button variant="outline" size="sm" onClick={() => onDelete(user.id)} className="text-red-600">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

// Deleted User List Component
function DeletedUserList({ users, onRestore, onPermanentDelete }: any) {
  return (
    <div className="space-y-4">
      {users.map((user: User) => (
        <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg bg-red-50">
          <div>
            <h3 className="font-medium text-[#676767]">
              {user.role === 'doctor' ? 'Dr. ' : ''}{user.firstName} {user.lastName}
            </h3>
            <p className="text-sm text-[#a4a4a4]">{user.email}</p>
            <Badge variant="outline" className="text-red-600">Deleted</Badge>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={() => onRestore(user.id)}>
              <RotateCcw className="h-4 w-4 mr-1" />
              Restore
            </Button>
            <Button variant="outline" size="sm" onClick={() => onPermanentDelete(user.id)} className="text-red-600">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}