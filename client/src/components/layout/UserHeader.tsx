import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { User, UserCog, UserPlus, Users } from 'lucide-react';

interface DoctorPatient {
  id: number;
  name: string;
  uin: string;
}

const UserHeader: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [doctorPatients, setDoctorPatients] = useState<DoctorPatient[]>([]);
  const [showPatients, setShowPatients] = useState(false);

  useEffect(() => {
    // Get doctor patients if applicable
    if (user?.role === 'doctor') {
      const patientsJson = localStorage.getItem('doctorPatients');
      if (patientsJson) {
        try {
          const patients = JSON.parse(patientsJson);
          setDoctorPatients(patients);
        } catch (e) {
          console.error('Error parsing doctor patients:', e);
        }
      }
    }
  }, [user]);
  
  // Original handleReturnToAdmin function removed as it's now implemented directly in dashboard.tsx

  if (!user) {
    return null;
  }

  return (
    <div className="w-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b">
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8 border">
            <AvatarFallback className={user.role === 'admin' ? 'bg-purple-100' : user.role === 'doctor' ? 'bg-blue-100' : 'bg-green-100'}>
              {user.role === 'admin' ? (
                <UserPlus className="h-4 w-4 text-purple-500" />
              ) : user.role === 'doctor' ? (
                <UserCog className="h-4 w-4 text-blue-500" />
              ) : (
                <User className="h-4 w-4 text-green-500" />
              )}
            </AvatarFallback>
          </Avatar>
          <div className="text-sm">
            <div className="flex items-center gap-2">
              <p className="font-medium">{user.name}</p>
              <Badge variant={user.role === 'admin' ? 'destructive' : user.role === 'doctor' ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">
                {user.role}
              </Badge>
            </div>
            {user.role === 'admin' && (
              <p className="text-xs text-gray-500">{user.uin}</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Only show doctor's patients button - Return to Admin moved to dashboard.tsx */}
          {user.role === 'doctor' && doctorPatients.length > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowPatients(!showPatients)}
              className="text-gray-500 hover:text-gray-700 text-xs"
            >
              <Users className="h-3 w-3 mr-1" />
              <span className="text-xs">My Patients</span>
            </Button>
          )}
        </div>
      </div>
      
      {/* Doctor's patients list - collapsible */}
      {user.role === 'doctor' && showPatients && doctorPatients.length > 0 && (
        <div className="bg-white p-3 border-b shadow-sm">
          <p className="text-xs font-semibold text-gray-500 mb-2">Your Patients:</p>
          <div className="space-y-2">
            {doctorPatients.map(patient => (
              <div key={patient.id} className="flex items-center justify-between text-xs p-2 bg-gray-50 rounded-md">
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="bg-green-100">
                      <User className="h-3 w-3 text-green-500" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <button 
                      onClick={() => {
                        // Save the patient's info in localStorage
                        localStorage.setItem('currentUser', JSON.stringify({
                          id: patient.id,
                          name: patient.name,
                          role: 'patient',
                          uin: patient.uin
                        }));
                        // Navigate to patient dashboard
                        setLocation('/');
                      }}
                      className="font-medium text-green-600 hover:text-green-800 hover:underline cursor-pointer text-left"
                    >
                      {patient.name}
                    </button>
                    {user.role === 'admin' && (
                      <p className="text-[10px] text-gray-500">{patient.uin}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserHeader;