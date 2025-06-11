// In client/src/pages/Login.tsx
import React, { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/lib/apiRequest';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from "@/components/ui/alert";

const SmsLogin: React.FC<{ role: 'doctor' | 'patient' }> = ({ role }) => {
    const [step, setStep] = useState<'email' | 'code'>('email');
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const { login } = useAuth();

    const handleSendCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            await apiRequest('/api/auth/send-sms', 'POST', { email, role });
            setStep('code');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            const data = await apiRequest('/api/auth/verify-sms', 'POST', { email, code });
            login(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <form onSubmit={step === 'email' ? handleSendCode : handleVerifyCode}>
            <div className="space-y-4">
                {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
                <div className="space-y-2">
                    <Label htmlFor={`${role}-email`}>Email Address</Label>
                    <Input id={`${role}-email`} type="email" value={email} onChange={e => setEmail(e.target.value)} required disabled={step === 'code'} />
                </div>
                {step === 'code' && (
                    <div className="space-y-2">
                        <Label htmlFor={`${role}-code`}>Verification Code</Label>
                        <Input id={`${role}-code`} type="text" value={code} onChange={e => setCode(e.target.value)} required />
                    </div>
                )}
                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Loading...' : (step === 'email' ? 'Send Verification Code' : 'Login')}
                </Button>
            </div>
        </form>
    );
};

const AdminLogin: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const { login } = useAuth();

    const handleAdminLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            const data = await apiRequest('/api/auth/admin-login', 'POST', { username, password });
            login(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleAdminLogin}>
             <div className="space-y-4">
                {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
                <div className="space-y-2">
                    <Label htmlFor="admin-username">Username</Label>
                    <Input id="admin-username" value={username} onChange={e => setUsername(e.target.value)} required />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="admin-password">Password</Label>
                    <Input id="admin-password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Logging In...' : 'Login'}
                </Button>
            </div>
        </form>
    );
};


export default function UnifiedLoginPage() {
    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold">Keep Going Care</CardTitle>
                    <CardDescription>Sign in to your account</CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="doctor" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="patient">Patient</TabsTrigger>
                            <TabsTrigger value="doctor">Doctor</TabsTrigger>
                            <TabsTrigger value="admin">Admin</TabsTrigger>
                        </TabsList>
                        <TabsContent value="patient" className="pt-6">
                            <SmsLogin role="patient" />
                        </TabsContent>
                        <TabsContent value="doctor" className="pt-6">
                            <SmsLogin role="doctor" />
                        </TabsContent>
                        <TabsContent value="admin" className="pt-6">
                            <AdminLogin />
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}