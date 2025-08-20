import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

import { User, LogOut } from 'lucide-react';

const UserHeader: React.FC = () => {
  // Get patient data for personalized display
  const { data: patientData } = useQuery({
    queryKey: ['/api/patient/profile', 2], // Default to Reuben Collins
    queryFn: async () => {
      const res = await fetch(`/api/patient/profile?patientId=2`);
      if (!res.ok) throw new Error('Failed to fetch patient profile');
      return res.json();
    },
    retry: false,
  });

  const handleLogout = async () => {
    try {
      // Clear email authentication session
      await fetch('/api/email-auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      // Redirect to authentication page
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
      // Still redirect on error
      window.location.href = '/';
    }
  };
  return (
    <div className="w-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b">
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8 border">
            <AvatarFallback className="bg-green-100">
              <User className="h-4 w-4 text-green-500" />
            </AvatarFallback>
          </Avatar>
          <div className="text-sm">
            <p className="font-medium text-[#2E8BC0]">
              {patientData?.name ? `Welcome ${patientData.name}` : 'Welcome Patient'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            onClick={handleLogout}
            variant="outline" 
            size="sm" 
            className="text-[#2E8BC0] hover:text-[#2E8BC0] hover:bg-[#2E8BC0]/10 border-[#2E8BC0]/30 text-xs"
          >
            <LogOut className="h-3 w-3 mr-1" />
            <span className="text-xs">Logout</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UserHeader;