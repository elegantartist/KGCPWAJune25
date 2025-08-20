import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface PatientAlert {
  id: number;
  patientId: number;
  doctorId: number;
  alertType: string;
  alertMessage: string;
  daysMissed: number;
  isRead: boolean;
  isResolved: boolean;
  createdAt: string;
}

interface PatientAlertBadgeProps {
  doctorId: number;
  patientId: number;
  patientName: string;
}

export function PatientAlertBadge({ doctorId, patientId, patientName }: PatientAlertBadgeProps) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Fetch all alerts for this doctor
  const { data: allAlerts = [], refetch: refetchAlerts } = useQuery<PatientAlert[]>({
    queryKey: [`/api/doctor/${doctorId}/alerts`],
    refetchInterval: 60000, // Refresh every minute
  });

  // Filter alerts for this specific patient
  const patientAlerts = allAlerts.filter(
    alert => alert.patientId === patientId && !alert.isResolved
  );
  const unreadCount = patientAlerts.filter(alert => !alert.isRead).length;

  // If no alerts, don't show anything
  if (patientAlerts.length === 0) {
    return null;
  }

  const handleMarkAsRead = async (alertId: number) => {
    try {
      await apiRequest('PUT', `/api/alerts/${alertId}/read`);
      await refetchAlerts();
      toast({
        title: "Alert marked as read",
        description: "Alert notification has been acknowledged.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to mark alert as read.",
        variant: "destructive",
      });
    }
  };

  const handleResolveAlert = async (alertId: number) => {
    try {
      await apiRequest('PUT', `/api/alerts/${alertId}/resolve`);
      await refetchAlerts();
      toast({
        title: "Alert resolved",
        description: "Alert has been marked as resolved.",
      });
    } catch (error) {
      toast({
        title: "Error", 
        description: "Failed to resolve alert.",
        variant: "destructive",
      });
    }
  };

  const getAlertIcon = (alertType: string) => {
    switch (alertType) {
      case 'daily_scores_missing':
        return <Clock className="h-4 w-4" />;
      case 'extended_inactivity':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getAlertColor = (daysMissed: number) => {
    if (daysMissed >= 7) return 'destructive';
    if (daysMissed >= 3) return 'secondary'; 
    return 'default';
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost" 
          size="sm"
          className="relative p-1 h-auto min-w-0"
          onClick={() => setIsDialogOpen(true)}
        >
          <Badge 
            variant={getAlertColor(Math.max(...patientAlerts.map(a => a.daysMissed)))}
            className="animate-pulse"
          >
            {unreadCount > 0 ? unreadCount : patientAlerts.length}
          </Badge>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            Alerts for {patientName}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {patientAlerts.map((alert) => (
            <div 
              key={alert.id} 
              className={`border rounded-lg p-4 ${
                !alert.isRead ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  {getAlertIcon(alert.alertType)}
                  <div className="flex-1">
                    <h4 className="font-medium text-sm mb-1">
                      {alert.alertType === 'daily_scores_missing' && 'Missing Daily Scores'}
                      {alert.alertType === 'extended_inactivity' && 'Extended Inactivity'}
                    </h4>
                    <p className="text-sm text-gray-700 mb-2">{alert.alertMessage}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>Created: {new Date(alert.createdAt).toLocaleDateString()}</span>
                      <span>Days missed: {alert.daysMissed}</span>
                      {!alert.isRead && (
                        <Badge variant="secondary" className="text-xs">New</Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col gap-2">
                  {!alert.isRead && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleMarkAsRead(alert.id)}
                    >
                      Mark Read
                    </Button>
                  )}
                  <Button 
                    variant="default" 
                    size="sm"
                    onClick={() => handleResolveAlert(alert.id)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Resolve
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {patientAlerts.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <p>No active alerts for this patient</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}