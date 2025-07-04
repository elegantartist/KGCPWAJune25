import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

const ImpersonationBanner: React.FC = () => {
  const { endImpersonation, user } = useAuth();

  return (
    <div className="fixed top-0 left-0 right-0 bg-yellow-400 text-yellow-900 p-2 flex items-center justify-center z-50 shadow-lg">
      <AlertTriangle className="h-5 w-5 mr-3" />
      <div className="text-sm font-semibold">
        You are currently impersonating <strong>{user?.name}</strong> ({user?.role}).
      </div>
      <Button
        onClick={endImpersonation}
        variant="ghost"
        size="sm"
        className="ml-4 text-yellow-900 hover:bg-yellow-500 hover:text-yellow-900"
      >
        End Impersonation
      </Button>
    </div>
  );
};

export default ImpersonationBanner;