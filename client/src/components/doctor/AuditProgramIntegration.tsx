import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExternalLink, ArrowLeft, FileText, Activity } from 'lucide-react';

interface AuditProgramIntegrationProps {
  doctorId: string;
  onReturnToDashboard?: () => void;
}

const AuditProgramIntegration: React.FC<AuditProgramIntegrationProps> = ({ 
  doctorId, 
  onReturnToDashboard 
}) => {
  // Generate secure token for audit program access
  const generateSecureToken = (doctorId: string): string => {
    const timestamp = Date.now();
    const payload = { doctorId, timestamp, source: 'kgc-dashboard' };
    // In production, this should be properly signed with JWT
    return btoa(JSON.stringify(payload));
  };

  const navigateToAuditProgram = () => {
    const token = generateSecureToken(doctorId);
    const auditProgramUrl = process.env.REACT_APP_AUDIT_PROGRAM_URL || 'https://audit.keepgoingcare.com';
    
    // Open audit program in new tab with secure token
    const auditUrl = `${auditProgramUrl}?token=${token}&return_url=${encodeURIComponent(window.location.origin)}`;
    window.open(auditUrl, '_blank', 'noopener,noreferrer');
  };

  const handleReturnToDashboard = () => {
    if (onReturnToDashboard) {
      onReturnToDashboard();
    } else {
      // Default navigation back to main dashboard
      window.location.href = '/doctor-dashboard';
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Mini Clinical Audit Program
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground">
          Access the integrated clinical audit program to review patient outcomes, 
          compliance metrics, and generate audit reports for your KGC patients.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            onClick={navigateToAuditProgram}
            className="flex items-center gap-2"
            size="lg"
          >
            <Activity className="h-4 w-4" />
            Launch Audit Program
            <ExternalLink className="h-4 w-4" />
          </Button>
          
          <Button 
            variant="outline" 
            onClick={handleReturnToDashboard}
            className="flex items-center gap-2"
            size="lg"
          >
            <ArrowLeft className="h-4 w-4" />
            Return to Dashboard
          </Button>
        </div>
        
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Audit Program Features:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Patient compliance tracking</li>
            <li>• Outcome measurement reports</li>
            <li>• TGA compliance documentation</li>
            <li>• Quality improvement metrics</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default AuditProgramIntegration;