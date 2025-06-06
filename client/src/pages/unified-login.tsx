import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useAuth } from "@/context/auth-context";
import { User, Stethoscope, Shield, Loader2 } from "lucide-react";

export default function UnifiedLogin() {
  const [email, setEmail] = useState("");
  const [smsCode, setSmsCode] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState<"email" | "sms">("email");
  const [userType, setUserType] = useState<"patient" | "doctor" | "admin">("patient");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { login } = useAuth();

  const handleSendSMS = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    setError("");

    try {
      let endpoint = "";
      switch (userType) {
        case "patient":
          endpoint = "/api/patient/login/send-sms";
          break;
        case "doctor":
          endpoint = "/api/doctor/login/send-sms";
          break;
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setStep("sms");
        toast({
          title: "SMS Sent",
          description: `Verification code sent to your phone`,
        });
      } else {
        setError(data.message || "Failed to send SMS");
      }
    } catch (error) {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifySMS = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smsCode) return;

    setIsLoading(true);
    setError("");

    try {
      let endpoint = "";
      switch (userType) {
        case "patient":
          endpoint = "/api/patient/login/verify-sms";
          break;
        case "doctor":
          endpoint = "/api/doctor/login/verify-sms";
          break;
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: smsCode }),
      });

      const data = await response.json();

      if (response.ok && data.access_token) {
        login(data);
        toast({
          title: "Login Successful",
          description: `Welcome to your KGC ${userType} dashboard!`,
        });
        
        // Navigate to appropriate dashboard
        switch (userType) {
          case "patient":
            setLocation('/patient-dashboard');
            break;
          case "doctor":
            setLocation('/doctor-dashboard');
            break;
        }
      } else {
        setError(data.message || "Invalid verification code");
      }
    } catch (error) {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok && data.access_token) {
        login(data);
        toast({
          title: "Login Successful",
          description: "Welcome to the admin dashboard!",
        });
        setLocation('/admin-dashboard');
      } else {
        setError(data.message || "Invalid credentials");
      }
    } catch (error) {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setStep("email");
    setEmail("");
    setSmsCode("");
    setUsername("");
    setPassword("");
    setError("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-20 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">KGC</span>
          </div>
          <CardTitle className="text-2xl">Keep Going Care</CardTitle>
          <CardDescription>
            Choose your role to access your dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={userType} onValueChange={(value) => {
            setUserType(value as "patient" | "doctor" | "admin");
            resetForm();
          }}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="patient" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Patient
              </TabsTrigger>
              <TabsTrigger value="doctor" className="flex items-center gap-2">
                <Stethoscope className="w-4 h-4" />
                Doctor
              </TabsTrigger>
              <TabsTrigger value="admin" className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Admin
              </TabsTrigger>
            </TabsList>

            {/* Patient Login */}
            <TabsContent value="patient" className="space-y-4">
              {step === "email" ? (
                <form onSubmit={handleSendSMS} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="patient-email" className="text-sm font-medium">
                      Email Address
                    </label>
                    <Input
                      id="patient-email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending SMS...
                      </>
                    ) : (
                      "Send Verification Code"
                    )}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleVerifySMS} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="patient-sms" className="text-sm font-medium">
                      Verification Code
                    </label>
                    <Input
                      id="patient-sms"
                      type="text"
                      placeholder="Enter 6-digit code"
                      value={smsCode}
                      onChange={(e) => setSmsCode(e.target.value)}
                      maxLength={6}
                      required
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep("email")}
                      className="flex-1"
                    >
                      Back
                    </Button>
                    <Button type="submit" className="flex-1" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        "Verify & Login"
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </TabsContent>

            {/* Doctor Login */}
            <TabsContent value="doctor" className="space-y-4">
              {step === "email" ? (
                <form onSubmit={handleSendSMS} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="doctor-email" className="text-sm font-medium">
                      Email Address
                    </label>
                    <Input
                      id="doctor-email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending SMS...
                      </>
                    ) : (
                      "Send Verification Code"
                    )}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleVerifySMS} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="doctor-sms" className="text-sm font-medium">
                      Verification Code
                    </label>
                    <Input
                      id="doctor-sms"
                      type="text"
                      placeholder="Enter 6-digit code"
                      value={smsCode}
                      onChange={(e) => setSmsCode(e.target.value)}
                      maxLength={6}
                      required
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep("email")}
                      className="flex-1"
                    >
                      Back
                    </Button>
                    <Button type="submit" className="flex-1" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        "Verify & Login"
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </TabsContent>

            {/* Admin Login */}
            <TabsContent value="admin" className="space-y-4">
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="admin-username" className="text-sm font-medium">
                    Username
                  </label>
                  <Input
                    id="admin-username"
                    type="text"
                    placeholder="Enter username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="admin-password" className="text-sm font-medium">
                    Password
                  </label>
                  <Input
                    id="admin-password"
                    type="password"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Logging in...
                    </>
                  ) : (
                    "Login"
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}