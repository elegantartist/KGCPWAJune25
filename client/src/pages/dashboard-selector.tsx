import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Users, Shield, Stethoscope } from 'lucide-react';

interface DashboardOption {
  type: 'admin' | 'doctor' | 'patient';
  title: string;
  description: string;
  email: string;
  icon: React.ReactNode;
  color: string;
}

const dashboardOptions: DashboardOption[] = [
  {
    type: 'admin',
    title: 'Administrator Dashboard',
    description: 'System administration and user management',
    email: 'admin@keepgoingcare.com',
    icon: <Shield className="h-8 w-8" />,
    color: 'bg-red-500'
  },
  {
    type: 'doctor',
    title: 'Doctor Dashboard', 
    description: 'Patient management and care coordination',
    email: 'marijke.collins@keepgoingcare.com',
    icon: <Stethoscope className="h-8 w-8" />,
    color: 'bg-blue-500'
  },
  {
    type: 'patient',
    title: 'Patient Dashboard',
    description: 'Personal health tracking and wellness',
    email: 'reuben.collins@keepgoingcare.com',
    icon: <Users className="h-8 w-8" />,
    color: 'bg-green-500'
  }
];

interface DashboardSelectorProps {
  onDashboardSelected: (sessionId: string, dashboardType: string, email: string) => void;
}

export default function DashboardSelector({ onDashboardSelected }: DashboardSelectorProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const { toast } = useToast();

  const handleDashboardSelect = async (option: DashboardOption) => {
    setLoading(option.type);

    try {
      const response = await fetch('/api/email-auth/send-pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: option.email,
          dashboardType: option.type
        })
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Authentication Email Sent",
          description: `A 6-digit PIN has been sent to ${option.email}`,
        });

        onDashboardSelected(data.sessionId, option.type, option.email);
      } else {
        toast({
          title: "Error",
          description: data.error || 'Failed to send authentication email',
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error requesting dashboard access:', error);
      toast({
        title: "Error",
        description: 'Failed to send authentication email',
        variant: "destructive"
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Keep Going Care
          </h1>
          <p className="text-xl text-gray-600 mb-2">Healthcare Platform Access</p>
          <p className="text-sm text-gray-500">
            Select your dashboard to receive a 6-digit authentication PIN via email
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {dashboardOptions.map((option) => (
            <Card 
              key={option.type} 
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleDashboardSelect(option)}
            >
              <CardHeader className="text-center pb-4">
                <div className={`${option.color} text-white p-4 rounded-full w-16 h-16 mx-auto flex items-center justify-center mb-4`}>
                  {option.icon}
                </div>
                <CardTitle className="text-xl mb-2">{option.title}</CardTitle>
                <CardDescription className="text-sm">
                  {option.description}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="text-center">
                <Badge variant="outline" className="mb-4 text-xs">
                  {option.email}
                </Badge>
                
                <Button 
                  className="w-full"
                  disabled={loading === option.type}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDashboardSelect(option);
                  }}
                >
                  {loading === option.type ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Sending PIN...
                    </div>
                  ) : (
                    'Access Dashboard'
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 text-center">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-2xl mx-auto">
            <h3 className="font-semibold text-blue-900 mb-2">🔐 Secure Authentication</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• 6-digit PIN expires in 15 minutes</li>
              <li>• Maximum 3 attempts per PIN</li>
              <li>• New PIN required after logout</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}