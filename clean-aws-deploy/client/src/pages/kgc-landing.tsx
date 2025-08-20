import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Mail, Shield, Heart, Activity, Users, Award } from 'lucide-react';
import kgcLogoPath from "@assets/KGC Logo2 Nov24_1744113864434.jpg";

interface KGCLandingProps {
  onAuthSuccess: (dashboardType: string, userId: number) => void;
}

export default function KGCLanding({ onAuthSuccess }: KGCLandingProps) {
  const [step, setStep] = useState<'landing' | 'email-entry' | 'pin-entry'>('landing');
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState(['', '', '', '', '', '']);
  const [sessionId, setSessionId] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/email-auth/send-pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          dashboardType: 'auto' // Let server determine dashboard type from email
        })
      });

      const data = await response.json();

      if (data.success) {
        setSessionId(data.sessionId);
        setStep('pin-entry');
        toast({
          title: "PIN Sent",
          description: `A 6-digit PIN has been sent to your email`,
        });
      } else {
        toast({
          title: "Access Denied",
          description: data.error || 'Email not authorized for KGC access',
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error sending PIN:', error);
      toast({
        title: "Error",
        description: 'Failed to send PIN. Please try again.',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePinSubmit = async () => {
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
          title: "Welcome to KGC",
          description: "Authentication successful",
        });
        onAuthSuccess(data.dashboardType, data.userId);
      } else {
        setPin(['', '', '', '', '', '']);
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
        description: 'Authentication failed. Please try again.',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePinChange = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return;

    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`pin-${index + 1}`) as HTMLInputElement;
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      const prevInput = document.getElementById(`pin-${index - 1}`) as HTMLInputElement;
      prevInput?.focus();
    } else if (e.key === 'Enter' && pin.every(digit => digit !== '')) {
      handlePinSubmit();
    }
  };

  if (step === 'email-entry') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-6">
              <img 
                src={kgcLogoPath} 
                alt="Keep Going Care Logo" 
                className="h-32 w-32 rounded-full object-cover border-4 border-blue-200 shadow-lg"
              />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              Keep Going Care
            </CardTitle>
            <p className="text-gray-600">Enter your authorized email address</p>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  disabled={loading}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Sending PIN...
                  </div>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Send Authentication PIN
                  </>
                )}
              </Button>

              <Button 
                type="button" 
                variant="outline" 
                className="w-full"
                onClick={() => setStep('landing')}
                disabled={loading}
              >
                Back to Home
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'pin-entry') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-6">
              <img 
                src={kgcLogoPath} 
                alt="Keep Going Care Logo" 
                className="h-32 w-32 rounded-full object-cover border-4 border-green-200 shadow-lg"
              />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              Enter Your PIN
            </CardTitle>
            <p className="text-gray-600">
              Check your email for the 6-digit authentication code
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="flex justify-center gap-2">
              {pin.map((digit, index) => (
                <Input
                  key={index}
                  id={`pin-${index}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handlePinChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-12 h-12 text-center text-xl font-bold"
                  disabled={loading}
                />
              ))}
            </div>

            <div className="space-y-3">
              <Button 
                onClick={handlePinSubmit}
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
                onClick={() => setStep('email-entry')}
                disabled={loading}
                className="w-full"
              >
                Use Different Email
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Landing page
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col items-center justify-center text-center">
            <img 
              src={kgcLogoPath} 
              alt="Keep Going Care Logo" 
              className="h-20 w-20 rounded-lg object-cover mb-3"
            />
            <h1 className="text-3xl font-bold mb-1 text-[#2463eb]">Keep Going Care</h1>
          </div>
        </div>
      </header>
      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex justify-center mb-8">
            <img 
              src={kgcLogoPath} 
              alt="Keep Going Care Logo" 
              className="h-40 w-40 rounded-2xl object-cover shadow-2xl border-4 border-blue-100"
            />
          </div>
          <h2 className="md:text-5xl font-bold mb-6 text-[29px] text-[#2463eb]">
            Extending Care Beyond The Consultation
          </h2>
          
          <Button 
            size="lg" 
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg"
            onClick={() => setStep('email-entry')}
          >
            <Shield className="h-5 w-5 mr-2" />
            Secure Access
          </Button>
        </div>
      </section>
      {/* Features Grid */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h3 className="font-bold text-center mb-12 text-[#2463eb] text-[27px]">
            Doctor Prescribed Software as a Medical Device
          </h3>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center p-6">
              <div className="bg-green-100 p-3 rounded-full w-fit mx-auto mb-4">
                <Activity className="h-8 w-8 text-green-600" />
              </div>
              <h4 className="text-xl font-semibold mb-3 text-[#2463eb]">Patient Empowerment Through Assisted Self-Management</h4>
            </Card>

            <Card className="text-center p-6">
              <div className="bg-blue-100 p-3 rounded-full w-fit mx-auto mb-4">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <h4 className="text-xl font-semibold mb-3 text-[#2463eb]">Doctor and Patient Collaboration on Care Plans</h4>
              <p className="text-gray-600">
                Personalised care plan directives based on where you are at in your health journey
              </p>
            </Card>

            <Card className="text-center p-6">
              <div className="bg-purple-100 p-3 rounded-full w-fit mx-auto mb-4">
                <Award className="h-8 w-8 text-purple-600" />
              </div>
              <h4 className="text-xl font-semibold mb-3 text-[#2463eb]">Evidence Based Engaging Features</h4>
            </Card>
          </div>
        </div>
      </section>
      {/* Security Notice */}
      <section className="py-12 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Shield className="h-6 w-6 text-blue-600" />
          </div>
          <p className="text-gray-600 max-w-2xl mx-auto">Your health data is protected with enterprise-grade security. Access is restricted to authorised healthcare professionals and patients only. All communications are encrypted and comply with healthcare privacy regulations.</p>
        </div>
      </section>
      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex flex-col items-center justify-center mb-4">
            <img 
              src={kgcLogoPath} 
              alt="Keep Going Care Logo" 
              className="h-16 w-16 rounded-lg object-cover mb-2"
            />
            <span className="text-lg font-semibold">Keep Going Care</span>
          </div>
          <p className="text-gray-400">
            Class I Software as a Medical Device • Australian TGA Compliant
          </p>
        </div>
      </footer>
    </div>
  );
}