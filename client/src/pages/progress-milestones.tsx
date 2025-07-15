import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Trophy, Crown, Gift, Activity, Utensils, Pill,
  Info
} from 'lucide-react';
import { useBadges } from '@/hooks/useBadges';
import { AchievementBadge, BadgeDetails } from '@/components/achievement-badge';
import { BadgeProgressCard } from '@/components/features/BadgeProgressCard';
import { AwardCeremony } from '@/components/features/AwardCeremony';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/hooks/useAuth';

const badgeTitles = {
  exercise: "Exercise Champion",
  meal: "Meal Planning Master",
  medication: "Medication Maverick"
};

const ProgressMilestones: React.FC = () => {
  const [showRewardsDialog, setShowRewardsDialog] = useState(false);
  const [showBadgeInfo, setShowBadgeInfo] = useState(false);
  const [showAwardCeremony, setShowAwardCeremony] = useState(false);
  const [ceremonyBadge, setCeremonyBadge] = useState<BadgeDetails | null>(null);
  const { user } = useAuth();

  const {
    badges,
    badgeProgress,
    loading,
    newBadge,
    clearNewBadge
  } = useBadges(user?.id);

  useEffect(() => {
    if (newBadge) {
      setCeremonyBadge(newBadge);
      setShowAwardCeremony(true);
    }
  }, [newBadge]);

  const handleAwardCeremonyComplete = () => {
    setShowAwardCeremony(false);
    setCeremonyBadge(null);
    clearNewBadge();
  };

  const hasAllPlatinumBadges = ['exercise', 'meal', 'medication'].every(type =>
    badges.some(badge => badge.type === type && badge.level === 'platinum')
  );

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2E8BC0]"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 max-w-4xl mx-auto p-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#2E8BC0] mb-4">Progress Milestones</h1>
          <p className="text-[#676767] mb-6">
            Track your achievements and earn rewards for consistent health habits
          </p>
          
          <Button
            onClick={() => setShowRewardsDialog(true)}
            className={`px-8 py-3 text-lg font-semibold rounded-lg shadow-lg transition-all duration-200 ${
              hasAllPlatinumBadges
                ? 'bg-green-600 hover:bg-green-700 animate-pulse'
                : 'bg-green-600 hover:bg-green-700'
            }`}
            disabled={!hasAllPlatinumBadges}
          >
            <Gift className="h-5 w-5 mr-2" />
            {hasAllPlatinumBadges ? 'Claim Your $100!' : 'Earn $100'}
          </Button>
        </div>

        <Card className="bg-[#fdfdfd] border-[#2E8BC0]/20 shadow-lg">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-[#676767] flex items-center text-xl">
                  <Crown className="w-6 h-6 text-[#2E8BC0] mr-2" />
                  Achievement Badges
                </CardTitle>
                <CardDescription className="text-[#a4a4a4] mt-1">
                  Badges earned for consistently maintaining good health habits
                </CardDescription>
              </div>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowBadgeInfo(true)}
                className="rounded-full h-8 w-8 hover:bg-[#2E8BC0]/10"
              >
                <Info className="h-4 w-4 text-[#2E8BC0]" />
              </Button>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="grid grid-cols-3 gap-6 mb-8">
              {['exercise', 'meal', 'medication'].map((type) => {
                const userBadges = badges.filter(b => b.type === (type as BadgeDetails['type']));
                const highestBadge = userBadges.length > 0
                  ? userBadges.reduce((highest, current) => {
                      const levels = ['bronze', 'silver', 'gold', 'platinum'];
                      return levels.indexOf(current.level) > levels.indexOf(highest.level)
                        ? current : highest;
                    })
                  : null;

                return (
                  <div key={type} className="text-center">
                    <div className="mb-3">
                      {highestBadge ? (
                        <AchievementBadge
                          badge={highestBadge}
                          size="lg"
                        />
                      ) : (
                        <div
                          className="w-32 h-32 mx-auto rounded-full border-4 border-dashed border-gray-300 flex items-center justify-center"
                        >
                          <span className="text-gray-400 text-xs">Not yet<br/>earned</span>
                        </div>
                      )}
                    </div>
                    <h3 className="font-medium text-[#676767] capitalize">
                      {badgeTitles[type as keyof typeof badgeTitles]}
                    </h3>
                    <p className="text-sm text-[#a4a4a4]">
                      {highestBadge ? `${highestBadge.level} level` : 'Start scoring daily'}
                    </p>
                  </div>
                );
              })}
            </div>

            <Tabs defaultValue="exercise" className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-gray-100">
                <TabsTrigger value="exercise" className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Exercise
                </TabsTrigger>
                <TabsTrigger value="meal" className="flex items-center gap-2">
                  <Utensils className="h-4 w-4" />
                  Meal Plan
                </TabsTrigger>
                <TabsTrigger value="medication" className="flex items-center gap-2">
                  <Pill className="h-4 w-4" />
                  Medication
                </TabsTrigger>
              </TabsList>

              {['exercise', 'meal', 'medication'].map((type) => (
                <TabsContent key={type} value={type} className="mt-6">
                  <BadgeProgressCard
                    type={type as any}
                    title={badgeTitles[type as keyof typeof badgeTitles]}
                    description={`Consistently maintain your ${type} self-scores`}
                    currentLevel={badgeProgress?.[type as keyof typeof badgeProgress]?.currentLevel || null}
                    nextLevel={badgeProgress?.[type as keyof typeof badgeProgress]?.nextLevel || 'bronze'}
                    progress={badgeProgress?.[type as keyof typeof badgeProgress]?.progress || 0}
                    weeksCompleted={badgeProgress?.[type as keyof typeof badgeProgress]?.weeksCompleted || 0}
                    weeksRequired={badgeProgress?.[type as keyof typeof badgeProgress]?.weeksRequired || 2}
                  />
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {showAwardCeremony && ceremonyBadge && (
        <AwardCeremony
          badge={ceremonyBadge}
          onComplete={handleAwardCeremonyComplete}
        />
      )}
    </>
  );
};

export default ProgressMilestones;