import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

export function HierarchicalLogin() {
  const [step, setStep] = useState<'login' | 'verify'>('login');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [userType, setUserType] = useState<'admin' | 'doctor' | 'patient'>('patient');
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSendCode = async () => {
    if (!phoneNumber) {
      toast({
        title: "Error",
        description: "Please enter your phone number",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/sms-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, userType })
      });

      const data = await response.json();
      
      if (response.ok) {
        setStep('verify');
        toast({
          title: "Code Sent",
          description: "Check your phone for the verification code"
        });
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to send verification code",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Network error occurred",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode) {
      toast({
        title: "Error",
        description: "Please enter the verification code",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/sms-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, code: verificationCode })
      });

      const data = await response.json();
      
      if (response.ok) {
        toast({
          title: "Login Successful",
          description: `Welcome ${data.user?.name || 'User'}!`
        });
        // Redirect or update app state
        window.location.reload();
      } else {
        toast({
          title: "Invalid Code",
          description: data.message || "Please check your verification code",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Network error occurred",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getExampleUsers = () => {
    switch (userType) {
      case 'admin':
        return 'Admin: +61400000001 (X1)';
      case 'doctor':
        return 'Doctor A: +61400000002, Doctor B: +61400000003, etc.';
      case 'patient':
        return 'Patient A1: +61400000012, Patient A2: +61400000013, etc.';
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">KGC Healthcare Login</CardTitle>
          <CardDescription>
            Hierarchical Dashboard System - SMS Authentication
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 'login' ? (
            <>
              <div className="space-y-2">
                <label htmlFor="userType" className="text-sm font-medium">
                  User Type
                </label>
                <Select value={userType} onValueChange={(value: any) => setUserType(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select user type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin (X1)</SelectItem>
                    <SelectItem value="doctor">Doctor (A-J)</SelectItem>
                    <SelectItem value="patient">Patient (A1-J5)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label htmlFor="phoneNumber" className="text-sm font-medium">
                  Phone Number
                </label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  placeholder="+61400000001"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
                <p className="text-xs text-gray-500">
                  Examples: {getExampleUsers()}
                </p>
              </div>

              <Button 
                onClick={handleSendCode} 
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Sending...' : 'Send Verification Code'}
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <label htmlFor="verificationCode" className="text-sm font-medium">
                  Verification Code
                </label>
                <Input
                  id="verificationCode"
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  maxLength={6}
                />
                <p className="text-xs text-gray-500">
                  Code sent to {phoneNumber}
                </p>
              </div>

              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => setStep('login')}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button 
                  onClick={handleVerifyCode} 
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? 'Verifying...' : 'Verify'}
                </Button>
              </div>
            </>
          )}

          <div className="mt-6 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
              Hierarchical System Overview
            </h4>
            <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
              <li>• 1 Admin (X1) manages all users</li>
              <li>• 10 Doctors (A-J) manage assigned patients</li>
              <li>• 50 Patients (A1-J5) access personal health tools</li>
              <li>• All users authenticate via SMS only</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}