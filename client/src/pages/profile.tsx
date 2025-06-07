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

export default function DailyScoresPage() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [scores, setScores] = useState({ medicationScore: 5, dietScore: 5, exerciseScore: 5 });

    // This query now fetches all data, including CPDs, from the secure unified endpoint
    const { data, isLoading, error } = useQuery({
        queryKey: ['patientDashboardData', user?.id],
        queryFn: () => apiRequest('/api/patients/me/dashboard'),
        enabled: !!user,
    });

    // This mutation now submits scores to a secure endpoint
    const submitScoresMutation = useMutation({
        mutationFn: (newScores: typeof scores) => apiRequest('/api/patients/me/scores', 'POST', newScores),
        onSuccess: () => {
            toast({ title: "Scores Submitted Successfully!" });
            queryClient.invalidateQueries({ queryKey: ['patientDashboardData', user?.id] });
        },
        onError: (err: Error) => toast({ title: "Submission Failed", description: err.message, variant: "destructive" }),
    });

    if (isLoading) return <div><Skeleton className="h-48 w-full" /></div>;
    if (error) return <Alert variant="destructive"><AlertDescription>Error loading data: {(error as Error).message}</AlertDescription></Alert>;

    const handleScoreChange = (type: string, value: string) => setScores(prev => ({ ...prev, [type]: parseInt(value) }));
    const handleSubmit = () => submitScoresMutation.mutate(scores);

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Daily Self-Scores for {user?.name}</h1>
            <Card>
                <CardHeader><CardTitle>Log Today's Scores</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                    <div>
                        <label>Medication Score: {scores.medicationScore}/10</label>
                        <Input type="range" min="1" max="10" value={scores.medicationScore} onChange={(e) => handleScoreChange('medicationScore', e.target.value)} />
                    </div>
                    <div>
                        <label>Diet Score: {scores.dietScore}/10</label>
                        <Input type="range" min="1" max="10" value={scores.dietScore} onChange={(e) => handleScoreChange('dietScore', e.target.value)} />
                    </div>
                    <div>
                        <label>Exercise Score: {scores.exerciseScore}/10</label>
                        <Input type="range" min="1" max="10" value={scores.exerciseScore} onChange={(e) => handleScoreChange('exerciseScore', e.target.value)} />
                    </div>
                    <Button onClick={handleSubmit} disabled={submitScoresMutation.isPending}>
                        {submitScoresMutation.isPending ? 'Saving...' : 'Save Today\'s Scores'}
                    </Button>
                </CardContent>
            </Card>
            
            <Card className="mt-6">
                <CardHeader><CardTitle>Your Care Plan Directives</CardTitle></CardHeader>
                <CardContent>
                    {data?.carePlanDirectives?.length > 0 ? (
                        <ul>
                            {data.carePlanDirectives.map((cpd: any) => (
                                <li key={cpd.id}><strong>{cpd.category}:</strong> {cpd.directive}</li>
                            ))}
                        </ul>
                    ) : (
                        <p>No active Care Plan Directives found.</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}