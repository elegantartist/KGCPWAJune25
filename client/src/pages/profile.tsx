// In client/src/pages/profile.tsx
import React, { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/apiRequest';
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Home, TrendingUp, Calendar, Target } from "lucide-react";
import { LogoutButton } from "@/components/ui/LogoutButton";
import { useLocation } from "wouter";
import Layout from "@/components/layout/Layout";

export default function DailyScoresPage() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [, setLocation] = useLocation();
    const [scores, setScores] = useState({ medicationScore: 5, dietScore: 5, exerciseScore: 5 });

    // Fetch patient dashboard data including health metrics
    const { data, isLoading, error } = useQuery({
        queryKey: ['patientDashboardData', user?.id],
        queryFn: () => apiRequest('/api/patients/me/dashboard'),
        enabled: !!user,
    });

    // Submit daily scores mutation
    const submitScoresMutation = useMutation({
        mutationFn: (newScores: typeof scores) => 
            apiRequest('/api/patients/me/scores', { method: 'POST', body: JSON.stringify(newScores) }),
        onSuccess: () => {
            toast({ title: "Success", description: "Daily scores submitted successfully!" });
            queryClient.invalidateQueries({ queryKey: ['patientDashboardData'] });
        },
        onError: () => {
            toast({ title: "Error", description: "Failed to submit scores. Please try again.", variant: "destructive" });
        }
    });

    const handleScoreChange = (type: string, value: string) => setScores(prev => ({ ...prev, [type]: parseInt(value) }));
    const handleSubmit = () => submitScoresMutation.mutate(scores);

    if (isLoading) {
        return (
            <Layout>
                <div className="p-6">
                    <Skeleton className="h-8 w-64 mb-6" />
                    <div className="space-y-4">
                        <Skeleton className="h-32 w-full" />
                        <Skeleton className="h-32 w-full" />
                    </div>
                </div>
            </Layout>
        );
    }

    if (error) {
        return (
            <Layout>
                <div className="p-6">
                    <Alert variant="destructive">
                        <AlertDescription>Failed to load daily scores data. Please refresh the page.</AlertDescription>
                    </Alert>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="p-6">
                {/* Navigation Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setLocation('/')}
                            className="flex items-center gap-2"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back to Dashboard
                        </Button>
                        <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setLocation('/')}
                            className="flex items-center gap-2"
                        >
                            <Home className="h-4 w-4" />
                            Home
                        </Button>
                    </div>
                    <LogoutButton userRole="patient" variant="outline" size="sm" />
                </div>
            
                <h1 className="text-3xl font-bold mb-6 text-[#2E8BC0]">Daily Self-Scores for {user?.name}</h1>
                
                {/* Today's Score Input Card */}
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Target className="h-5 w-5 text-[#2E8BC0]" />
                            Log Today's Scores
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid md:grid-cols-3 gap-6">
                            <div className="space-y-3">
                                <label className="text-sm font-medium">Medication Score: {scores.medicationScore}/10</label>
                                <Input 
                                    type="range" 
                                    min="1" 
                                    max="10" 
                                    value={scores.medicationScore} 
                                    onChange={(e) => handleScoreChange('medicationScore', e.target.value)}
                                    className="w-full"
                                />
                                <p className="text-xs text-gray-600">How well did you follow your medication plan?</p>
                            </div>
                            
                            <div className="space-y-3">
                                <label className="text-sm font-medium">Diet Score: {scores.dietScore}/10</label>
                                <Input 
                                    type="range" 
                                    min="1" 
                                    max="10" 
                                    value={scores.dietScore} 
                                    onChange={(e) => handleScoreChange('dietScore', e.target.value)}
                                    className="w-full"
                                />
                                <p className="text-xs text-gray-600">How well did you stick to your diet plan?</p>
                            </div>
                            
                            <div className="space-y-3">
                                <label className="text-sm font-medium">Exercise Score: {scores.exerciseScore}/10</label>
                                <Input 
                                    type="range" 
                                    min="1" 
                                    max="10" 
                                    value={scores.exerciseScore} 
                                    onChange={(e) => handleScoreChange('exerciseScore', e.target.value)}
                                    className="w-full"
                                />
                                <p className="text-xs text-gray-600">How well did you follow your exercise routine?</p>
                            </div>
                        </div>
                        
                        <Button 
                            onClick={handleSubmit} 
                            disabled={submitScoresMutation.isPending}
                            className="w-full bg-[#2E8BC0] hover:bg-[#1E6B8F] text-white"
                        >
                            {submitScoresMutation.isPending ? "Submitting..." : "Submit Today's Scores"}
                        </Button>
                    </CardContent>
                </Card>

                {/* Historical Scores Display */}
                {data?.healthMetrics && data.healthMetrics.length > 0 && (
                    <Card className="mb-6">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-[#2E8BC0]" />
                                Recent Scores History
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {data.healthMetrics.slice(0, 5).map((metric: any, index: number) => (
                                    <div key={metric.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4 text-[#2E8BC0]" />
                                            <span className="font-medium">{new Date(metric.date).toLocaleDateString()}</span>
                                        </div>
                                        <div className="flex gap-4 text-sm">
                                            <span>Med: {metric.medicationScore}/10</span>
                                            <span>Diet: {metric.dietScore}/10</span>
                                            <span>Exercise: {metric.exerciseScore}/10</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Care Plan Directives */}
                {data?.carePlanDirectives && data.carePlanDirectives.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Your Active Care Plan Directives</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {data.carePlanDirectives.map((cpd: any) => (
                                    <div key={cpd.id} className="p-3 border-l-4 border-[#2E8BC0] bg-blue-50">
                                        <div className="font-medium text-[#2E8BC0]">{cpd.category}</div>
                                        <div className="text-sm text-gray-700">{cpd.directive}</div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* No data states */}
                {(!data?.healthMetrics || data.healthMetrics.length === 0) && (
                    <Card>
                        <CardContent className="text-center py-8">
                            <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-600 mb-2">No Previous Scores</h3>
                            <p className="text-gray-500">Start tracking your daily health scores to see progress over time.</p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </Layout>
    );
}