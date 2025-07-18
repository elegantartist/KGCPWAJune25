import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Gift, Crown, Info, Trophy } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useBadges } from '@/hooks/useBadges';
import { AchievementBadge, BadgeDetails } from '@/components/AchievementBadge';
import BadgeInfoDialog from '@/components/features/BadgeInfoDialog';
import FinancialRewardsDialog from '@/components/features/FinancialRewardsDialog';
import BadgeAwardModal from '@/components/features/BadgeAwardModal';
import { BadgeProgressCard } from '@/components/features/BadgeProgressCard';
import { MilestoneSkeleton } from '@/components/features/MilestoneSkeleton';
import { Skeleton } from '@/components/ui/skeleton';

const ProgressMilestonesPage: React.FC = () => {
  const [isBadgeInfoOpen, setIsBadgeInfoOpen] = useState(false);
  const [isRewardsInfoOpen, setIsRewardsInfoOpen] = useState(false);
  const { user } = useAuth();

  const {
    badges,
    badgeProgress,
    isLoading,
    error,
    newlyAwardedBadge,
    isAwardModalOpen,
    closeAwardModal,
  } = useBadges(user?.id);

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-6">
        <div className="flex flex-col items-center justify-center text-center">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-12 w-full max-w-xs" />
        </div>
        <MilestoneSkeleton />
      </div>
    );
  }

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
           {error instanceof Error ? (
            <p className="text-center text-destructive py-8">Could not load badges.</p>
          ) : badges.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4 py-4">
              {badges.map((badge: BadgeDetails, index: number) => (
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
            {error instanceof Error ? (
              <p className="text-center text-destructive py-8">Could not load progress.</p>
            ) : (
              <>
                <TabsContent value="exercise">
                  {badgeProgress?.exercise && badgeProgress.exercise.progress < 100 ? (
                    <BadgeProgressCard type="exercise" title="Exercise Consistency Champion" description="Maintain your exercise self-scores" {...badgeProgress.exercise} />
                  ) : <p className="text-center text-muted-foreground py-4">All exercise badges earned!</p>}
                </TabsContent>
                <TabsContent value="meal">
                  {badgeProgress?.meal && badgeProgress.meal.progress < 100 ? (
                    <BadgeProgressCard type="meal" title="Healthy Eating Hero" description="Maintain your healthy meal plan scores" {...badgeProgress.meal} />
                  ) : <p className="text-center text-muted-foreground py-4">All nutrition badges earned!</p>}
                </TabsContent>
                <TabsContent value="medication">
                  {badgeProgress?.medication && badgeProgress.medication.progress < 100 ? (
                    <BadgeProgressCard type="medication" title="Medication Maverick" description="Maintain your medication self-scores" {...badgeProgress.medication} />
                  ) : <p className="text-center text-muted-foreground py-4">All medication badges earned!</p>}
                </TabsContent>
              </>
            )}
          </Tabs>
        </CardContent>
      </Card>

      <BadgeInfoDialog isOpen={isBadgeInfoOpen} onClose={() => setIsBadgeInfoOpen(false)} />
      <FinancialRewardsDialog isOpen={isRewardsInfoOpen} onClose={() => setIsRewardsInfoOpen(false)} />

      {/* Badge Award Celebration Modal */}
      {newlyAwardedBadge && (
        <BadgeAwardModal
          badge={newlyAwardedBadge}
          isOpen={isAwardModalOpen}
          onClose={closeAwardModal}
        />
      )}
    </div>
  );
};

export default ProgressMilestonesPage;