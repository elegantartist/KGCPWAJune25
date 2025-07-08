import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Gift, Crown, Info, Trophy, Loader2 } from 'lucide-react';
import { Link } from 'wouter';
import { AchievementBadge, BadgeDetails, BadgeType } from '@/components/AchievementBadge';
import BadgeInfoDialog from '@/components/features/BadgeInfoDialog';
import FinancialRewardsDialog from '@/components/features/FinancialRewardsDialog';
import { BadgeProgressCard } from '@/components/features/BadgeProgressCard';

const ProgressMilestonesPage: React.FC = () => {
  const [isBadgeInfoOpen, setIsBadgeInfoOpen] = useState(false);
  const [isRewardsInfoOpen, setIsRewardsInfoOpen] = useState(false);

  const { data: milestoneData, isLoading, error } = useQuery({
    queryKey: ['progressMilestones'],
    queryFn: async () => {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/patient/milestones', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch milestone data.');
      }
      return response.json();
    }
  });

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col items-center justify-center text-center">
        <h1 className="text-2xl font-bold text-[#2E8BC0] mb-4">Progress Milestones</h1>
        <Button
          onClick={() => setIsRewardsInfoOpen(true)}
          size="lg"
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-lg shadow-md w-full max-w-xs justify-center"
        >
          <span className="text-lg">Earn $100</span>
          <Gift className="h-5 w-5" />
        </Button>
      </div>

      {/* Achievement Badges Section */}
      <Card className="bg-[#fdfdfd] border-[#2E8BC0]/20">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-[#676767] flex items-center">
              <Crown className="w-6 h-6 text-[#2E8BC0] mr-2" />
              <span>Achievement Badges</span>
            </CardTitle>
            <CardDescription className="text-[#a4a4a4]">
              Badges earned for consistently maintaining good health habits
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" className="rounded-full h-8 w-8" onClick={() => setIsBadgeInfoOpen(true)}>
            <Info className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <p className="text-center text-destructive py-8">Could not load badges.</p>
          ) : milestoneData?.earnedBadges?.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4 py-4">
              {milestoneData.earnedBadges.map((badge: BadgeDetails, index: number) => (
                <AchievementBadge key={index} badge={badge} />
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No badges earned yet. Keep up the great work!</p>
          )}
        </CardContent>
      </Card>

      {/* Badge Progress Section */}
      <Card className="bg-[#fdfdfd] border-[#2E8BC0]/20">
        <CardHeader>
          <CardTitle className="text-[#676767] flex items-center">
            <Trophy className="w-6 h-6 text-[#2E8BC0] mr-2" />
            <span>Progress to Next Badge Level</span>
          </CardTitle>
          <CardDescription className="text-[#a4a4a4]">
            Track your progress toward achieving the next level badge
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="exercise" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="exercise" className="text-[#676767]">Exercise</TabsTrigger>
              <TabsTrigger value="meal" className="text-[#676767]">Nutrition</TabsTrigger>
              <TabsTrigger value="medication" className="text-[#676767]">Medication</TabsTrigger>
            </TabsList>
            {isLoading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : error ? (
              <p className="text-center text-destructive py-8">Could not load progress.</p>
            ) : (
              <>
                <TabsContent value="exercise">
                  {milestoneData?.badgeProgress?.exercise ? (
                    <BadgeProgressCard type="exercise" title="Exercise Consistency Champion" description="Maintain your exercise self-scores" {...milestoneData.badgeProgress.exercise} />
                  ) : <p className="text-center text-muted-foreground py-4">All exercise badges earned!</p>}
                </TabsContent>
                <TabsContent value="meal">
                  {milestoneData?.badgeProgress?.meal ? (
                    <BadgeProgressCard type="meal" title="Healthy Eating Hero" description="Maintain your healthy meal plan scores" {...milestoneData.badgeProgress.meal} />
                  ) : <p className="text-center text-muted-foreground py-4">All nutrition badges earned!</p>}
                </TabsContent>
                <TabsContent value="medication">
                  {milestoneData?.badgeProgress?.medication ? (
                    <BadgeProgressCard type="medication" title="Medication Maverick" description="Maintain your medication self-scores" {...milestoneData.badgeProgress.medication} />
                  ) : <p className="text-center text-muted-foreground py-4">All medication badges earned!</p>}
                </TabsContent>
              </>
            )}
          </Tabs>
        </CardContent>
      </Card>

      <BadgeInfoDialog isOpen={isBadgeInfoOpen} onClose={() => setIsBadgeInfoOpen(false)} />
      <FinancialRewardsDialog isOpen={isRewardsInfoOpen} onClose={() => setIsRewardsInfoOpen(false)} />
    </div>
  );
};

export default ProgressMilestonesPage;