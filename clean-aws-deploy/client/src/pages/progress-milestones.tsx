import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Star, Award, Calendar, Target, Plus, Loader2, Crown, Info, Gift, Activity, Utensils, Pill, Heart, Repeat } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useProgressMilestones, ProgressMilestone } from "@/hooks/useProgressMilestones";
import { useToast } from "@/hooks/use-toast";
import { AchievementBadge, BadgeCollection, BadgeDetails, BadgeType, BadgeLevel, getBadgeFilter } from "@/components/achievement-badge";

// Define badge ring colors
const badgeRingColors = {
  bronze: "#CD7F32",   // Brown
  silver: "#C0C0C0",   // Grey
  gold: "#FFD700",     // Yellow
  platinum: "#FFFFFF"  // White
};

// Icon mapping function
const getIconComponent = (iconType?: string) => {
  switch (iconType) {
    case 'Medal':
      return <Medal className="h-6 w-6 text-[#2E8BC0]" />;
    case 'Star':
      return <Star className="h-6 w-6 text-[#2E8BC0]" />;
    case 'Award':
      return <Award className="h-6 w-6 text-[#2E8BC0]" />;
    case 'Target':
      return <Target className="h-6 w-6 text-[#2E8BC0]" />;
    case 'Calendar':
      return <Calendar className="h-6 w-6 text-[#2E8BC0]" />;
    case 'Trophy':
    default:
      return <Trophy className="h-6 w-6 text-[#2E8BC0]" />;
  }
};

// Form validation schema
const milestoneFormSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters" }),
  description: z.string().min(5, { message: "Description must be at least 5 characters" }),
  category: z.string().min(1, { message: "Please select a category" }),
  progress: z.number().min(0).max(100),
  iconType: z.string().optional(),
});

// Milestone creation/edit form
const MilestoneForm: React.FC<{
  userId: number;
  existingMilestone?: ProgressMilestone;
  onComplete: () => void;
}> = ({ userId, existingMilestone, onComplete }) => {
  const { createMilestone, updateMilestone } = useProgressMilestones(userId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  // Initialize form with default values or existing milestone
  const form = useForm<z.infer<typeof milestoneFormSchema>>({
    resolver: zodResolver(milestoneFormSchema),
    defaultValues: existingMilestone ? {
      title: existingMilestone.title,
      description: existingMilestone.description || "",
      category: existingMilestone.category,
      progress: existingMilestone.progress,
      iconType: existingMilestone.iconType || "Trophy"
    } : {
      title: "",
      description: "",
      category: "Health",
      progress: 0,
      iconType: "Trophy"
    }
  });
  
  // Handle form submission
  const onSubmit = async (data: z.infer<typeof milestoneFormSchema>) => {
    setIsSubmitting(true);
    
    try {
      if (existingMilestone) {
        // Update existing milestone
        await updateMilestone({
          ...existingMilestone,
          ...data,
          completed: data.progress >= 100 ? true : existingMilestone.completed,
          completedDate: data.progress >= 100 && !existingMilestone.completedDate ? new Date() : existingMilestone.completedDate
        });
        toast({
          title: "Milestone updated",
          description: "Your progress milestone has been updated successfully.",
        });
      } else {
        // Create new milestone
        await createMilestone({
          userId,
          ...data,
          completed: data.progress >= 100,
          completedDate: data.progress >= 100 ? new Date() : null,
        });
        toast({
          title: "Milestone created",
          description: "New progress milestone has been created successfully.",
        });
      }
      
      onComplete();
    } catch (error) {
      console.error("Error saving milestone:", error);
      toast({
        title: "Error",
        description: "There was a problem saving your milestone. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Enter milestone title..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Describe this milestone..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Health">Health</SelectItem>
                  <SelectItem value="Diet">Diet</SelectItem>
                  <SelectItem value="Exercise">Exercise</SelectItem>
                  <SelectItem value="Medication">Medication</SelectItem>
                  <SelectItem value="Wellness">Wellness</SelectItem>
                  <SelectItem value="Engagement">Engagement</SelectItem>
                  <SelectItem value="Goal">Goal</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="iconType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Icon</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                defaultValue={field.value || "Trophy"}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select icon" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Trophy">Trophy</SelectItem>
                  <SelectItem value="Medal">Medal</SelectItem>
                  <SelectItem value="Star">Star</SelectItem>
                  <SelectItem value="Award">Award</SelectItem>
                  <SelectItem value="Target">Target</SelectItem>
                  <SelectItem value="Calendar">Calendar</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="progress"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Progress: {field.value}%</FormLabel>
              <FormControl>
                <Slider
                  max={100}
                  step={5}
                  value={[field.value]}
                  onValueChange={(vals) => field.onChange(vals[0])}
                  className="py-4"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <DialogFooter>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {existingMilestone ? "Update Milestone" : "Create Milestone"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};

// REMOVED: getSampleBadges - now using LIVE database badges only

// Sample badge progress
const getBadgeProgress = (type: BadgeType, level: BadgeLevel): number => {
  switch(level) {
    case 'bronze':
      return type === 'exercise' ? 100 : 80;  // Exercise has reached bronze
    case 'silver':
      return type === 'exercise' ? 55 : 0;    // Exercise halfway to silver
    case 'gold':
      return 0;                               // No badges have gold progress yet
    case 'platinum':
      return 0;                               // No badges have platinum progress
    default:
      return 0;
  }
};

// Progress Badge Card component
interface BadgeProgressCardProps {
  type: BadgeType;
  title: string;
  description: string;
  currentLevel: BadgeLevel | null;
  nextLevel: BadgeLevel;
  progress: number;
  weeksCompleted: number;
  weeksRequired: number;
}

const BadgeProgressCard: React.FC<BadgeProgressCardProps> = ({
  type,
  title,
  description,
  currentLevel,
  nextLevel,
  progress,
  weeksCompleted,
  weeksRequired
}) => {
  // Determine the required weeks based on the next level
  const getWeeksForLevel = (level: BadgeLevel): number => {
    switch(level) {
      case 'bronze': return 2;
      case 'silver': return 4;
      case 'gold': return 16;
      case 'platinum': return 24;
      default: return 2;
    }
  };
  
  // Get the color for the badge type
  const getTypeColor = (badgeType: BadgeType): string => {
    switch(badgeType) {
      case 'meal': return "#4CAF50";      // Green
      case 'exercise': return "#9C27B0";  // Purple
      case 'medication': return "#2196F3"; // Blue
      default: return "#2E8BC0";          // Default blue
    }
  };
  
  // Get the color for the badge level
  const getLevelColor = (level: BadgeLevel): string => {
    return badgeRingColors[level];
  };
  
  return (
    <Card className="border-[#2E8BC0]/20 hover:border-[#2E8BC0]/10 transition-all">
      <CardContent className="p-4">
        <div className="flex items-start mb-3">
          <div className="flex-shrink-0 mr-4">
            <div 
              className="w-16 h-16 rounded-full overflow-hidden"
              style={{ 
                backgroundColor: getTypeColor(type),
                border: `3px solid ${getLevelColor(nextLevel)}`,
                boxShadow: `0 0 10px ${getLevelColor(nextLevel)}`
              }}
            >
              <img 
                src="/assets/kgc-logo.jpg" 
                alt={`${title} - ${nextLevel}`} 
                className="w-full h-full object-cover"
                style={{ filter: getBadgeFilter(type, nextLevel) }}
              />
            </div>
          </div>
          
          <div className="flex-1">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-medium text-[#676767]">{title}</h3>
                <p className="text-sm text-[#a4a4a4]">{description}</p>
              </div>
              {currentLevel && (
                <Badge className="bg-primary">
                  {currentLevel.charAt(0).toUpperCase() + currentLevel.slice(1)}
                </Badge>
              )}
            </div>
            
            <div className="mt-3">
              <div className="flex justify-between items-center text-sm mb-1">
                <span className="text-[#676767]">Progress to {nextLevel.charAt(0).toUpperCase() + nextLevel.slice(1)}</span>
                <span className="text-[#2E8BC0] font-medium">{progress}%</span>
              </div>
              <Progress 
                value={progress} 
                className="h-3"
                style={{ 
                  backgroundColor: "#f0f0f0",
                  "--progress-background": getTypeColor(type)
                } as any} 
              />
            </div>
            
            <div className="mt-3 text-sm text-[#676767] flex items-center justify-between">
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                <span>{weeksCompleted} of {weeksRequired} weeks completed</span>
              </div>
              
              <div className="text-xs text-muted-foreground">
                {Math.round((weeksRequired - weeksCompleted) * 7)} days remaining
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-2 text-xs text-muted-foreground text-center">
          <p>Maintain a self-score of {nextLevel === 'bronze' ? '5-10' : 
             nextLevel === 'silver' ? '7-10' : 
             nextLevel === 'gold' ? '8-10' : '9-10'} 
             to achieve {nextLevel} level</p>
        </div>
      </CardContent>
    </Card>
  );
};

// Main component
import { useBadges } from '@/hooks/useBadges';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const ProgressMilestones: React.FC = () => {
  const userId = 2; // Reuben Collins - Patient
  const { 
    badges: fetchedBadges, 
    badgeProgress, 
    loading
  } = useBadges(userId);
  
  const [rewardsInfoOpen, setRewardsInfoOpen] = useState(false);
  const [badgeInfoOpen, setBadgeInfoOpen] = useState(false);
  const [rewardSequenceStep, setRewardSequenceStep] = useState(0);
  
  // Use LIVE badges from database - NO MOCK DATA!
  const badges = fetchedBadges || [];
  
  // Debug logging to verify badge data
  console.log('[Progress Milestones] fetchedBadges:', fetchedBadges);
  console.log('[Progress Milestones] badges array length:', badges.length);
  console.log('[Progress Milestones] loading state:', loading);
  
  // Track if all platinum badges are achieved
  const hasPlatinumExercise = badges.some(b => b.type === 'exercise' && b.level === 'platinum');
  const hasPlatinumMeal = badges.some(b => b.type === 'meal' && b.level === 'platinum');
  const hasPlatinumMedication = badges.some(b => b.type === 'medication' && b.level === 'platinum');
  const hasAllPlatinumBadges = hasPlatinumExercise && hasPlatinumMeal && hasPlatinumMedication;
  
  // Separate badges by type for display
  const getMealBadges = () => badges.filter(b => b.type === 'meal');
  const getExerciseBadges = () => badges.filter(b => b.type === 'exercise');
  const getMedicationBadges = () => badges.filter(b => b.type === 'medication');
  
  // No need to handle badge animation from hook as we removed those features
  
  // Badge reward sequence animation
  const advanceRewardSequence = () => {
    if (rewardSequenceStep < 3) {
      setRewardSequenceStep(prev => prev + 1);
    } else {
      // Reset and close dialog when sequence is complete
      setRewardSequenceStep(0);
      setRewardsInfoOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title and Earn $100 Button */}
      <div className="flex flex-col items-center justify-center mb-6">
        <h1 className="text-2xl font-bold text-[#2E8BC0] mb-4">Progress Milestones</h1>
        
        {/* Prominent Earn $100 Button */}
        <Button 
          variant="default" 
          size="lg" 
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2 rounded-lg shadow-md w-full max-w-xs justify-center"
          onClick={() => {
            setRewardSequenceStep(0);
            setRewardsInfoOpen(true);
          }}
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
          
          <Dialog open={badgeInfoOpen} onOpenChange={setBadgeInfoOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full h-8 w-8">
                <Info className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>About Achievement Badges</DialogTitle>
                <DialogDescription>
                  KGC achievement badges are awarded for maintaining consistent health scores over time.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 mt-4">
                <h3 className="font-semibold text-lg">Badge Levels</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="bg-[#CD7F32] w-4 h-4 rounded-full"></div>
                    <p className="text-sm"><span className="font-medium">Bronze:</span> Maintain target Self-Score (5-10) for 2 consecutive weeks</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="bg-[#C0C0C0] w-4 h-4 rounded-full"></div>
                    <p className="text-sm"><span className="font-medium">Silver:</span> Maintain target Self-Score (7-10) for 4 consecutive weeks</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="bg-[#FFD700] w-4 h-4 rounded-full"></div>
                    <p className="text-sm"><span className="font-medium">Gold:</span> Maintain target Self-Score (8-10) for 16 consecutive weeks</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="bg-[#E5E4E2] w-4 h-4 rounded-full"></div>
                    <p className="text-sm"><span className="font-medium">Platinum:</span> Maintain target Self-Score (9-10) for 24 consecutive weeks</p>
                  </div>
                </div>
                
                <h3 className="font-semibold text-lg mt-2">Badge Categories</h3>
                <div className="space-y-2">
                  <p className="text-sm"><span className="font-medium">Healthy Meal Plan Hero:</span> Awarded for consistent healthy eating habits.</p>
                  <p className="text-sm"><span className="font-medium">E&W Consistency Champion:</span> Awarded for maintaining regular exercise routines.</p>
                  <p className="text-sm"><span className="font-medium">Medication Maverick:</span> Awarded for consistency with medication adherence.</p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-[#a4a4a4]">
              <Trophy className="h-12 w-12 mx-auto mb-2 text-[#2E8BC0]/30 animate-pulse" />
              <p>Loading your achievement badges...</p>
            </div>
          ) : badges.length === 0 ? (
            <div className="text-center py-8 text-[#a4a4a4]">
              <Trophy className="h-12 w-12 mx-auto mb-2 text-[#2E8BC0]/30" />
              <p>No achievement badges yet. Maintain consistent health scores to earn badges!</p>
              <p className="text-xs mt-2">Debug: fetched {fetchedBadges?.length || 0} badges from API</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center mb-4">
                <p className="text-lg font-semibold text-[#2E8BC0]">🏆 {badges.length} Achievement Badges Earned!</p>
              </div>
              <BadgeCollection badges={badges} size="md" />
              
              <div className="text-center text-sm text-muted-foreground">
                <p>Continue maintaining your health scores to earn more badges and upgrade to higher levels!</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Badge celebration will be handled by the badges hook */}
      
      {/* Financial Rewards Information Dialog */}
      <AlertDialog open={rewardsInfoOpen} onOpenChange={setRewardsInfoOpen}>
        <AlertDialogContent className="max-w-3xl">
          {rewardSequenceStep === 0 && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle className="text-2xl text-center text-blue-700">
                  Achievement Badges Reward Program
                </AlertDialogTitle>
                <AlertDialogDescription className="text-center">
                  Earn valuable rewards by consistently maintaining good health habits
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="grid grid-cols-3 gap-4 my-6">
                <div className="text-center bg-purple-100 p-4 rounded-lg">
                  <div className="bg-purple-200 rounded-full p-3 inline-flex mx-auto mb-2">
                    <Activity className="h-8 w-8 text-purple-700" />
                  </div>
                  <h3 className="font-semibold text-purple-700">Exercise</h3>
                  <p className="text-sm text-purple-800 mt-1">Purple Badges</p>
                </div>
                <div className="text-center bg-green-100 p-4 rounded-lg">
                  <div className="bg-green-200 rounded-full p-3 inline-flex mx-auto mb-2">
                    <Utensils className="h-8 w-8 text-green-700" />
                  </div>
                  <h3 className="font-semibold text-green-700">Healthy Eating</h3>
                  <p className="text-sm text-green-800 mt-1">Green Badges</p>
                </div>
                <div className="text-center bg-blue-100 p-4 rounded-lg">
                  <div className="bg-blue-200 rounded-full p-3 inline-flex mx-auto mb-2">
                    <Pill className="h-8 w-8 text-blue-700" />
                  </div>
                  <h3 className="font-semibold text-blue-700">Mindfulness</h3>
                  <p className="text-sm text-blue-800 mt-1">Blue Badges</p>
                </div>
              </div>
              <div className="text-center mb-6">
                <Button onClick={advanceRewardSequence} className="mx-auto">Next: Badge Levels</Button>
              </div>
            </>
          )}
          
          {rewardSequenceStep === 1 && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle className="text-2xl text-center">
                  Badge Levels
                </AlertDialogTitle>
                <AlertDialogDescription className="text-center">
                  Earn progressively higher badge levels by consistently maintaining your health scores
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="space-y-4 my-6">
                <div className="flex items-center gap-3 bg-gradient-to-r from-amber-50 to-amber-100 p-3 rounded-lg">
                  <div className="bg-[#CD7F32] w-8 h-8 rounded-full flex-shrink-0"></div>
                  <div>
                    <h3 className="font-bold text-amber-900">Bronze</h3>
                    <p className="text-sm text-amber-800">Maintain target Self-Score (5-10) for 2 consecutive weeks</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-gradient-to-r from-slate-50 to-slate-100 p-3 rounded-lg">
                  <div className="bg-[#C0C0C0] w-8 h-8 rounded-full flex-shrink-0"></div>
                  <div>
                    <h3 className="font-bold text-slate-700">Silver</h3>
                    <p className="text-sm text-slate-600">Maintain target Self-Score (7-10) for 4 consecutive weeks</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-gradient-to-r from-yellow-50 to-yellow-100 p-3 rounded-lg">
                  <div className="bg-[#FFD700] w-8 h-8 rounded-full flex-shrink-0"></div>
                  <div>
                    <h3 className="font-bold text-yellow-800">Gold</h3>
                    <p className="text-sm text-yellow-700">Maintain target Self-Score (8-10) for 16 consecutive weeks</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-gradient-to-r from-slate-50 to-blue-50 p-3 rounded-lg">
                  <div className="bg-[#E5E4E2] w-8 h-8 rounded-full flex-shrink-0"></div>
                  <div>
                    <h3 className="font-bold text-blue-900">Platinum</h3>
                    <p className="text-sm text-blue-800">Maintain target Self-Score (9-10) for 24 consecutive weeks</p>
                  </div>
                </div>
              </div>
              <div className="text-center mb-6">
                <Button onClick={advanceRewardSequence} className="mx-auto">Next: Financial Rewards</Button>
              </div>
            </>
          )}
          
          {rewardSequenceStep === 2 && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle className="text-2xl text-center text-emerald-700">
                  Financial Rewards
                </AlertDialogTitle>
                <AlertDialogDescription className="text-center">
                  Your achievement badges are worth real value!
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="space-y-6 my-6">
                <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 p-5 rounded-lg border border-emerald-200">
                  <h3 className="font-bold text-lg text-emerald-800 flex items-center gap-2">
                    <Gift className="h-5 w-5" />
                    $100 Voucher
                  </h3>
                  <p className="mt-2 text-emerald-700">
                    Achieve <span className="font-bold">Platinum badges in all three categories</span> to receive a $100 voucher to spend on healthy experiences in your local area.
                  </p>
                  <div className="mt-3 p-2 bg-white/70 rounded text-sm text-emerald-800">
                    <p>Vouchers can be used at local gyms, health spas, yoga studios, pilates studios, health food stores, Coles, and Woolworths.</p>
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-violet-50 to-violet-100 p-5 rounded-lg border border-violet-200">
                  <h3 className="font-bold text-lg text-violet-800 flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    $250 Monthly Lottery
                  </h3>
                  <p className="mt-2 text-violet-700">
                    Everyone who has achieved the $100 voucher level is <span className="font-bold">automatically entered</span> into a monthly lottery to win a $250 voucher!
                  </p>
                  <div className="mt-3 p-2 bg-white/70 rounded text-sm text-violet-800">
                    <p>The lottery is drawn on the first day of each month. Winners are notified by email and announced in the app.</p>
                  </div>
                </div>
              </div>
              <div className="text-center mb-6">
                <Button onClick={advanceRewardSequence} className="mx-auto">Next: Why Rewards Matter</Button>
              </div>
            </>
          )}
          
          {rewardSequenceStep === 3 && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle className="text-2xl text-center">
                  Why Rewards Matter
                </AlertDialogTitle>
              </AlertDialogHeader>
              <div className="space-y-4 my-6">
                <p className="text-center text-muted-foreground">
                  At Keep Going Care, we know that consistent health habits lead to better outcomes. Our rewards program is designed to:
                </p>
                
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Heart className="h-5 w-5 text-red-500" />
                      <h3 className="font-semibold">Improve Health</h3>
                    </div>
                    <p className="text-sm">Encourage the consistent behaviors that lead to better health outcomes.</p>
                  </div>
                  
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Repeat className="h-5 w-5 text-green-600" />
                      <h3 className="font-semibold">Build Habits</h3>
                    </div>
                    <p className="text-sm">Help you establish long-term healthy habits that stick.</p>
                  </div>
                  
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Trophy className="h-5 w-5 text-yellow-600" />
                      <h3 className="font-semibold">Celebrate Success</h3>
                    </div>
                    <p className="text-sm">Recognize and reward your commitment to your health journey.</p>
                  </div>
                  
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Gift className="h-5 w-5 text-purple-600" />
                      <h3 className="font-semibold">Reinvest in Health</h3>
                    </div>
                    <p className="text-sm">Use rewards to further invest in your wellness journey.</p>
                  </div>
                </div>
              </div>
              <AlertDialogFooter>
                <AlertDialogAction onClick={() => setRewardSequenceStep(0)}>
                  Close
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Badge Progress Sections */}
      <Card className="bg-[#fdfdfd] border-[#2E8BC0]/20">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-[#676767] flex items-center">
              <Trophy className="w-6 h-6 text-[#2E8BC0] mr-2" />
              <span>Progress to Next Badge Level</span>
            </CardTitle>
            <CardDescription className="text-[#a4a4a4]">
              Track your progress toward achieving the next level badge
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent>
          <Tabs defaultValue="exercise" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="exercise" className="text-[#676767]">
                Exercise
              </TabsTrigger>
              <TabsTrigger value="meal" className="text-[#676767]">
                Nutrition
              </TabsTrigger>
              <TabsTrigger value="medication" className="text-[#676767]">
                Medication
              </TabsTrigger>
            </TabsList>

            <TabsContent value="exercise">
              <div className="space-y-4">
                <BadgeProgressCard 
                  type="exercise"
                  title="Exercise Consistency Champion"
                  description="Consistently maintain your exercise self-scores"
                  currentLevel="bronze"
                  nextLevel="silver"
                  progress={55}
                  weeksCompleted={2}
                  weeksRequired={4}
                />
              </div>
            </TabsContent>

            <TabsContent value="meal">
              <div className="space-y-4">
                <BadgeProgressCard 
                  type="meal"
                  title="Healthy Eating Hero"
                  description="Consistently maintain your healthy meal plan self-scores"
                  currentLevel={null}
                  nextLevel="bronze"
                  progress={80}
                  weeksCompleted={1.5}
                  weeksRequired={2}
                />
              </div>
            </TabsContent>

            <TabsContent value="medication">
              <div className="space-y-4">
                <BadgeProgressCard 
                  type="medication"
                  title="Medication Maverick"
                  description="Consistently maintain your medication self-scores"
                  currentLevel={null}
                  nextLevel="bronze"
                  progress={45}
                  weeksCompleted={1}
                  weeksRequired={2}
                />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
export default ProgressMilestones;