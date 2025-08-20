import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Mail, Shield } from 'lucide-react';

interface PinEntryProps {
  sessionId: string;
  dashboardType: string;
  email: string;
  onSuccess: (dashboardType: string, userId: number) => void;
  onBack: () => void;
}

export default function PinEntry({ sessionId, dashboardType, email, onSuccess, onBack }: PinEntryProps) {
  const [pin, setPin] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const { toast } = useToast();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Focus first input on mount
    inputRefs.current[0]?.focus();
  }, []);

  const handlePinChange = (index: number, value: string) => {
    // Only allow numeric input
    if (value && !/^\d$/.test(value)) return;

    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      // Focus previous input on backspace
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'Enter' && pin.every(digit => digit !== '')) {
      handleSubmit();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text').replace(/\D/g, '');
    
    if (pastedText.length === 6) {
      const newPin = pastedText.split('');
      setPin(newPin);
      inputRefs.current[5]?.focus();
    }
  };

  const handleSubmit = async () => {
    const pinString = pin.join('');
    
    if (pinString.length !== 6) {
      toast({
        title: "Invalid PIN",
        description: "Please enter all 6 digits",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/email-auth/verify-pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId,
          pin: pinString
        })
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Authentication Successful",
          description: "Welcome to your dashboard!",
        });
        onSuccess(data.dashboardType, data.userId);
      } else {
        setAttempts(prev => prev + 1);
        setPin(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
        
        toast({
          title: "Authentication Failed",
          description: data.error || 'Invalid PIN',
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error verifying PIN:', error);
      toast({
        title: "Error",
        description: 'Failed to verify PIN',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendPIN = async () => {
    setLoading(true);

    try {
      const response = await fetch('/api/email-auth/send-pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          dashboardType
        })
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "PIN Resent",
          description: `A new 6-digit PIN has been sent to ${email}`,
        });
        setPin(['', '', '', '', '', '']);
        setAttempts(0);
        inputRefs.current[0]?.focus();
      } else {
        toast({
          title: "Error",
          description: data.error || 'Failed to resend PIN',
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error resending PIN:', error);
      toast({
        title: "Error",
        description: 'Failed to resend PIN',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getDashboardDisplayName = () => {
    switch (dashboardType) {
      case 'admin': return 'Administrator Dashboard';
      case 'doctor': return 'Doctor Dashboard';
      case 'patient': return 'Patient Dashboard';
      default: return 'Dashboard';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center gap-2 text-blue-600">
              <Shield className="h-5 w-5" />
              <span className="text-sm font-medium">Secure Access</span>
            </div>
          </div>
          
          <CardTitle className="text-2xl font-bold text-gray-900 mb-2">
            Enter Your PIN
          </CardTitle>
          
          <div className="text-sm text-gray-600 space-y-1">
            <p>Accessing: <span className="font-medium">{getDashboardDisplayName()}</span></p>
            <div className="flex items-center justify-center gap-2 text-blue-600">
              <Mail className="h-4 w-4" />
              <span>{email}</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-4">
            <p className="text-center text-sm text-gray-600">
              Enter the 6-digit PIN sent to your email
            </p>
            
            <div className="flex justify-center gap-2" onPaste={handlePaste}>
              {pin.map((digit, index) => (
                <Input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handlePinChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-12 h-12 text-center text-xl font-bold border-2 focus:border-blue-500"
                  disabled={loading}
                />
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Button 
              onClick={handleSubmit}
              disabled={loading || pin.some(digit => digit === '')}
              className="w-full"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Verifying...
                </div>
              ) : (
                'Access Dashboard'
              )}
            </Button>

            <Button 
              variant="outline" 
              onClick={handleResendPIN}
              disabled={loading}
              className="w-full"
            >
              Resend PIN
            </Button>
          </div>

          <div className="text-center space-y-2">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-center justify-center gap-2 text-amber-800 text-sm">
                <Shield className="h-4 w-4" />
                <span className="font-medium">Security Notice</span>
              </div>
              <ul className="text-xs text-amber-700 mt-2 space-y-1">
                <li>• PIN expires in 15 minutes</li>
                <li>• Maximum 3 attempts allowed</li>
                {attempts > 0 && (
                  <li className="font-medium">• Attempts used: {attempts}/3</li>
                )}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}