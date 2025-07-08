import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, UserPlus, LogOut, AlertTriangle, Bell, Link as LinkIcon } from 'lucide-react';
import { Link } from 'wouter';

// Define the shape of the patient data returned from the API
interface Patient {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  alertStatus: 'ok' | 'inactive' | 'emergency';
}

const DoctorDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isCreatePatientOpen, setIsCreatePatientOpen] = useState(false);
  const [newPatient, setNewPatient] = useState({ name: '', email: '', phoneNumber: '' });

  // Fetch doctor's patients using react-query
  const { data: patients, isLoading, error } = useQuery<Patient[]>({
    queryKey: ['doctor-patients'],
    queryFn: async () => {
      const token = localStorage.getItem('accessToken');
      // This API endpoint will need to be created in the backend
      const response = await fetch('/api/doctor/patients', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch patients.');
      }
      return response.json();
    },
  });

  // Mutation for creating a new patient
  const createPatientMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('accessToken');
      // This API endpoint will need to be created in the backend
      const response = await fetch('/api/doctor/create-patient', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(newPatient),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create patient.');
      }
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Patient account created and welcome email sent.' });
      queryClient.invalidateQueries({ queryKey: ['doctor-patients'] });
      setIsCreatePatientOpen(false);
      setNewPatient({ name: '', email: '', phoneNumber: '' });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const handleCreatePatientSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createPatientMutation.mutate();
  };

  const getAlertIcon = (status: Patient['alertStatus']) => {
    switch (status) {
      case 'emergency':
        return <Badge variant="destructive" className="flex items-center gap-1"><AlertTriangle className="h-4 w-4" /> Emergency</Badge>;
      case 'inactive':
        return <Badge variant="secondary" className="flex items-center gap-1"><Bell className="h-4 w-4" /> Inactive</Badge>;
      default:
        return <Badge variant="outline">OK</Badge>;
    }
  };

  return (
    <div className="p-8">
      <header className="flex justify-between items-center mb-8">
        <div>
            <h1 className="text-3xl font-bold">Doctor Dashboard</h1>
            <p className="text-muted-foreground">Welcome, Dr. {user?.name}</p>
        </div>
        <div className="flex items-center gap-4">
          <Dialog open={isCreatePatientOpen} onOpenChange={setIsCreatePatientOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Create New Patient
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Patient Account</DialogTitle>
                <DialogDescription>Enter the patient's details. They will receive a welcome email to get started.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreatePatientSubmit} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" value={newPatient.name} onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" value={newPatient.email} onChange={(e) => setNewPatient({ ...newPatient, email: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Mobile Phone Number</Label>
                  <Input id="phone" value={newPatient.phoneNumber} onChange={(e) => setNewPatient({ ...newPatient, phoneNumber: e.target.value })} required />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={createPatientMutation.isPending}>
                    {createPatientMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Create Patient
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          <Button onClick={logout} variant="outline">
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>My Patients</CardTitle>
          <CardDescription>View and manage all of your assigned patients.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div> :
           error ? <p className="text-destructive">Error loading patients.</p> :
           <Table>
             <TableHeader>
               <TableRow>
                 <TableHead>Name</TableHead>
                 <TableHead>Email</TableHead>
                 <TableHead>Status</TableHead>
                 <TableHead>Joined On</TableHead>
                 <TableHead>Alerts</TableHead>
                 <TableHead className="text-right">Actions</TableHead>
               </TableRow>
             </TableHeader>
             <TableBody>
               {patients?.map((p) => (
                 <TableRow key={p.id}>
                   <TableCell className="font-medium">{p.name}</TableCell>
                   <TableCell>{p.email}</TableCell>
                   <TableCell>
                     <Badge variant={p.isActive ? 'default' : 'secondary'} className={p.isActive ? 'bg-green-600' : ''}>
                       {p.isActive ? 'Active' : 'Inactive'}
                     </Badge>
                   </TableCell>
                   <TableCell>{new Date(p.createdAt).toLocaleDateString()}</TableCell>
                   <TableCell>{getAlertIcon(p.alertStatus)}</TableCell>
                   <TableCell className="text-right">
                     <Link href={`/doctor/patient/${p.id}`}>
                       <Button variant="ghost" size="sm">
                         <LinkIcon className="h-4 w-4 mr-2" />
                         View Profile
                       </Button>
                     </Link>
                   </TableCell>
                 </TableRow>
               ))}
             </TableBody>
           </Table>
          }
        </CardContent>
      </Card>
    </div>
  );
};

export default DoctorDashboard;
