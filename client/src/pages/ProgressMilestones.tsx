import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Crown, Info, Gift, Trophy, Star, Heart, Dumbbell } from "lucide-react";
import { useMilestones, EarnedBadge, BadgeProgress, BadgeCategory } from "@/hooks/useMilestones";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import MilestoneAwardModal from "@/components/features/MilestoneAwardModal";

// Badge component for the list of earned badges
const AchievementBadge: React.FC<{ badge: EarnedBadge }> = ({ badge }) => {
  const tierColors: Record<string, string> = {
    bronze: 'bg-amber-700 text-white',
    silver: 'bg-slate-400 text-white',
    gold: 'bg-yellow-400 text-gray-900',
    platinum: 'bg-white text-gray-900 border-2 border-blue-300',
  };
  return (
    <div className="flex flex-col items-center text-center gap-2">
      <div className={`w-20 h-20 rounded-full flex items-center justify-center shadow-md ${tierColors[badge.tier]}`}>
        <Trophy className="w-10 h-10" />
      </div>
      <p className="text-sm font-semibold capitalize">{badge.tier} {badge.category}</p>
      <p className="text-xs text-muted-foreground">{new Date(badge.earnedDate).toLocaleDateString()}</p>
    </div>
  );
};

// Progress card for the tabs section
const BadgeProgressCard: React.FC<{ progressData: BadgeProgress | undefined, category: BadgeCategory }> = ({ progressData, category }) => {
  const categoryIcons = {
    diet: <Heart className="w-8 h-8 text-red-500" />,
    exercise: <Dumbbell className="w-8 h-8 text-blue-500" />,
    medication: <Star className="w-8 h-8 text-yellow-500" />,
  };

  if (!progressData) {
    return <p className="text-center text-muted-foreground py-8">No progress data available.</p>;
  }

  if (!progressData.nextTier) {
    return (
      <div className="text-center py-8">
        <p className="text-lg font-semibold">Congratulations!</p>
        <p className="text-muted-foreground">You've earned all available badges in this category!</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <div className="flex items-center gap-4">
        {categoryIcons[category]}
        <div>
          <p className="font-bold text-lg capitalize">Next Goal: {progressData.nextTier} Tier</p>
          <p className="text-sm text-muted-foreground">Complete {progressData.weeksRequired} weeks of consistent scores.</p>
        </div>
      </div>
      <div className="w-full">
        <div className="flex justify-between mb-1">
          <span className="text-sm font-medium text-primary">Progress</span>
          <span className="text-sm font-medium text-primary">{progressData.progressPercentage}%</span>
        </div>
        <Progress value={progressData.progressPercentage} className="w-full" />
        <p className="text-xs text-muted-foreground text-right mt-1">{progressData.weeksCompleted} of {progressData.weeksRequired} weeks completed</p>
      </div>
    </div>
  );
};

const ProgressMilestonesPage: React.FC = () => {
  const { data, isLoading, error } = useMilestones();
  const [isRewardsInfoOpen, setIsRewardsInfoOpen] = useState(false);
  const [isBadgeInfoOpen, setIsBadgeInfoOpen] = useState(false);

  // State for the badge award modal
  const [previousBadgeCount, setPreviousBadgeCount] = useState<number | null>(null);
  const [newlyAwardedBadge, setNewlyAwardedBadge] = useState<EarnedBadge | null>(null);
  const [isAwardModalOpen, setIsAwardModalOpen] = useState(false);

  const renderBadgeContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }
    if (error) {
      return <p className="text-center text-destructive py-8">Could not load badges. Please try again later.</p>;
    }
    if (!data || data.earnedBadges.length === 0) {
      return <p className="text-center text-muted-foreground py-8">No badges earned yet. Keep up the great work!</p>;
    }
    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4 py-4">
        {data.earnedBadges.map((badge, index) => (
          <AchievementBadge key={index} badge={badge} />
        ))}
      </div>
    );
  };

  return (
    <>
      <div className="space-y-6 p-4 md:p-6">
        {/* Page Header */}
        <div className="flex flex-col items-center justify-center mb-6">
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

        {/* Achievement Badges Card */}
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
            {renderBadgeContent()}
          </CardContent>
        </Card>

        {/* Progress to Next Badge Level Card */}
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
            <Tabs defaultValue="diet" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="diet" className="text-[#676767]">Nutrition</TabsTrigger>
                <TabsTrigger value="exercise" className="text-[#676767]">Exercise</TabsTrigger>
                <TabsTrigger value="medication" className="text-[#676767]">Medication</TabsTrigger>
              </TabsList>
              
              <TabsContent value="diet">
                <BadgeProgressCard progressData={data?.badgeProgress.diet} category="diet" />
              </TabsContent>
              <TabsContent value="exercise">
                <BadgeProgressCard progressData={data?.badgeProgress.exercise} category="exercise" />
              </TabsContent>
              <TabsContent value="medication">
                <BadgeProgressCard progressData={data?.badgeProgress.medication} category="medication" />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Rewards Info Dialog */}
      <AlertDialog open={isRewardsInfoOpen} onOpenChange={setIsRewardsInfoOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><Gift className="text-green-600" /> Earn Rewards!</AlertDialogTitle>
            <AlertDialogDescription>
              Achieve the Platinum badge in all three categories (Nutrition, Exercise, and Medication) to earn a $100 voucher for healthy experiences and products!
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Got it!</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Badge Info Dialog */}
      <AlertDialog open={isBadgeInfoOpen} onOpenChange={setIsBadgeInfoOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><Info className="text-blue-500" /> How Badges Work</AlertDialogTitle>
            <AlertDialogDescription className="pt-2 text-sm text-muted-foreground">
              You earn badges by consistently maintaining high self-scores over time. There are four tiers for each category:
              <ul className="list-disc pl-5 mt-2 space-y-1 text-foreground">
                <li><b>Bronze:</b> Maintain a score of 5-10 for 2 consecutive weeks.</li>
                <li><b>Silver:</b> Maintain a score of 7-10 for 4 consecutive weeks.</li>
                <li><b>Gold:</b> Maintain a score of 8-10 for 16 consecutive weeks.</li>
                <li><b>Platinum:</b> Maintain a score of 9-10 for 24 consecutive weeks.</li>
              </ul>
              <p className="mt-4">Keep up the great work to collect them all and unlock special rewards!</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Badge Award Modal */}
      <MilestoneAwardModal
        isOpen={isAwardModalOpen}
        onClose={() => setIsAwardModalOpen(false)}
        badge={newlyAwardedBadge}
      />
    </>
  );
};

export default ProgressMilestonesPage;