import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import AlertBadge from './AlertBadge';

// Types for doctor alerts
interface DoctorAlert {
  id: number;
  patientId: number;
  patientName: string;
  patientUin: string;
  alertType: string;
  message: string;
  createdAt: string;
  read?: boolean;
}

const PatientAlertsPanel: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  
  // Fetch alert count
  const { data: alertCount = 0, isLoading: isCountLoading } = useQuery<{count: number}>({
    queryKey: ['/api/doctor/alerts/count'],
    refetchInterval: 60000, // Refetch every minute
  });
  
  // Fetch alerts when panel is open
  const { data: alerts = [], isLoading: isAlertsLoading } = useQuery<DoctorAlert[]>({
    queryKey: ['/api/doctor/alerts'],
    enabled: isOpen, // Only fetch when panel is open
    refetchOnWindowFocus: true,
  });
  
  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (alertId: number) => {
      await apiRequest('PATCH', `/api/doctor/alerts/${alertId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/doctor/alerts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/doctor/alerts/count'] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to mark alert as read: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
  
  // Delete alert mutation
  const deleteAlertMutation = useMutation({
    mutationFn: async (alertId: number) => {
      await apiRequest('DELETE', `/api/doctor/alerts/${alertId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/doctor/alerts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/doctor/alerts/count'] });
      toast({
        title: 'Success',
        description: 'Alert deleted successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to delete alert: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
  
  // Handle mark as read
  const handleMarkAsRead = (alertId: number) => {
    markAsReadMutation.mutate(alertId);
  };
  
  // Handle delete alert
  const handleDeleteAlert = (alertId: number) => {
    deleteAlertMutation.mutate(alertId);
  };
  
  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };
  
  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <div>
          <AlertBadge count={typeof alertCount === 'number' ? alertCount : (alertCount?.count || 0)} onClick={() => setIsOpen(true)} />
        </div>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:w-[400px] p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle>Patient Alerts</SheetTitle>
        </SheetHeader>
        <div className="p-4 overflow-y-auto max-h-[calc(100vh-100px)]">
          {isAlertsLoading ? (
            <div className="flex justify-center p-4">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : alerts.length === 0 ? (
            <p className="text-center text-gray-500 p-4">No unread alerts</p>
          ) : (
            <div className="space-y-4">
              {alerts.map((alert: DoctorAlert) => (
                <div 
                  key={alert.id} 
                  className="p-4 rounded-lg border shadow-sm bg-white hover:bg-gray-50"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{alert.patientName} ({alert.patientUin})</h3>
                      <p className="text-sm text-gray-500">{formatTimestamp(alert.createdAt)}</p>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => handleMarkAsRead(alert.id)}>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteAlert(alert.id)}>
                        <XCircle className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                  <p className="mt-2 text-sm">{alert.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default PatientAlertsPanel;