import { useState, useEffect } from 'react';

export interface Milestone {
  id: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  completed: boolean;
  category: 'diet' | 'exercise' | 'medication' | 'general';
}

export function useMilestones() {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock data for now - replace with actual API call
    const mockMilestones: Milestone[] = [
      {
        id: '1',
        title: '7-Day Streak',
        description: 'Complete daily scores for 7 consecutive days',
        progress: 3,
        target: 7,
        completed: false,
        category: 'general'
      },
      {
        id: '2',
        title: 'Diet Champion',
        description: 'Achieve diet score of 8+ for 5 days',
        progress: 2,
        target: 5,
        completed: false,
        category: 'diet'
      }
    ];
    
    setMilestones(mockMilestones);
    setLoading(false);
  }, []);

  return { milestones, loading };
}