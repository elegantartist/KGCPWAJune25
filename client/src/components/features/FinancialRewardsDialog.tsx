import React, { useState } from 'react';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Activity, Utensils, Pill, Gift, Award, Heart, Repeat, Trophy } from 'lucide-react';

interface FinancialRewardsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const FinancialRewardsDialog: React.FC<FinancialRewardsDialogProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(0);

  const handleNext = () => setStep(prev => prev + 1);
  const handleClose = () => {
    setStep(0);
    onClose();
  };

  const steps = [
    // Step 0: Overview
    <>
      <AlertDialogHeader>
        <AlertDialogTitle className="text-2xl text-center text-blue-700">Achievement Badges Reward Program</AlertDialogTitle>
        <AlertDialogDescription className="text-center">Earn valuable rewards by consistently maintaining good health habits</AlertDialogDescription>
      </AlertDialogHeader>
      <div className="grid grid-cols-3 gap-4 my-6">
        <div className="text-center bg-purple-100 p-4 rounded-lg"><Activity className="h-8 w-8 text-purple-700 mx-auto mb-2" /><h3 className="font-semibold text-purple-700">Exercise</h3></div>
        <div className="text-center bg-green-100 p-4 rounded-lg"><Utensils className="h-8 w-8 text-green-700 mx-auto mb-2" /><h3 className="font-semibold text-green-700">Healthy Eating</h3></div>
        <div className="text-center bg-blue-100 p-4 rounded-lg"><Pill className="h-8 w-8 text-blue-700 mx-auto mb-2" /><h3 className="font-semibold text-blue-700">Medication</h3></div>
      </div>
      <AlertDialogFooter><Button onClick={handleNext}>Next: Badge Levels</Button></AlertDialogFooter>
    </>,
    // Step 1: Badge Levels
    <>
      <AlertDialogHeader><AlertDialogTitle className="text-2xl text-center">Badge Levels</AlertDialogTitle></AlertDialogHeader>
      <div className="space-y-4 my-6">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50"><div className="bg-[#CD7F32] w-8 h-8 rounded-full flex-shrink-0"></div><div><h3 className="font-bold text-amber-900">Bronze</h3><p className="text-sm text-amber-800">Maintain score (5-10) for 2 weeks</p></div></div>
        <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50"><div className="bg-[#C0C0C0] w-8 h-8 rounded-full flex-shrink-0"></div><div><h3 className="font-bold text-slate-700">Silver</h3><p className="text-sm text-slate-600">Maintain score (7-10) for 4 weeks</p></div></div>
        <div className="flex items-center gap-3 p-3 rounded-lg bg-yellow-50"><div className="bg-[#FFD700] w-8 h-8 rounded-full flex-shrink-0"></div><div><h3 className="font-bold text-yellow-800">Gold</h3><p className="text-sm text-yellow-700">Maintain score (8-10) for 16 weeks</p></div></div>
        <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50"><div className="bg-[#E5E4E2] w-8 h-8 rounded-full flex-shrink-0"></div><div><h3 className="font-bold text-blue-900">Platinum</h3><p className="text-sm text-blue-800">Maintain score (9-10) for 24 weeks</p></div></div>
      </div>
      <AlertDialogFooter><Button onClick={handleNext}>Next: Financial Rewards</Button></AlertDialogFooter>
    </>,
    // Step 2: Financial Rewards
    <>
      <AlertDialogHeader><AlertDialogTitle className="text-2xl text-center text-emerald-700">Financial Rewards</AlertDialogTitle></AlertDialogHeader>
      <div className="space-y-6 my-6">
        <div className="bg-emerald-50 p-5 rounded-lg border border-emerald-200">
          <h3 className="font-bold text-lg text-emerald-800 flex items-center gap-2"><Gift className="h-5 w-5" />$100 Voucher</h3>
          <p className="mt-2 text-emerald-700">Achieve <span className="font-bold">Platinum badges in all three categories</span> to receive a $100 voucher.</p>
        </div>
        <div className="bg-violet-50 p-5 rounded-lg border border-violet-200">
          <h3 className="font-bold text-lg text-violet-800 flex items-center gap-2"><Award className="h-5 w-5" />$250 Monthly Lottery</h3>
          <p className="mt-2 text-violet-700">Everyone who earns the $100 voucher is <span className="font-bold">automatically entered</span> into a monthly lottery to win a $250 voucher!</p>
        </div>
      </div>
      <AlertDialogFooter><Button onClick={handleNext}>Next: Why Rewards Matter</Button></AlertDialogFooter>
    </>,
    // Step 3: Why Rewards Matter
    <>
      <AlertDialogHeader><AlertDialogTitle className="text-2xl text-center">Why Rewards Matter</AlertDialogTitle></AlertDialogHeader>
      <div className="space-y-4 my-6">
        <p className="text-center text-muted-foreground">Our rewards program is designed to:</p>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="bg-blue-50 p-4 rounded-lg"><div className="flex items-center gap-2 mb-2"><Heart className="h-5 w-5 text-red-500" /><h3 className="font-semibold">Improve Health</h3></div><p className="text-sm">Encourage consistent behaviors that lead to better health outcomes.</p></div>
          <div className="bg-green-50 p-4 rounded-lg"><div className="flex items-center gap-2 mb-2"><Repeat className="h-5 w-5 text-green-600" /><h3 className="font-semibold">Build Habits</h3></div><p className="text-sm">Help you establish long-term healthy habits that stick.</p></div>
          <div className="bg-yellow-50 p-4 rounded-lg"><div className="flex items-center gap-2 mb-2"><Trophy className="h-5 w-5 text-yellow-600" /><h3 className="font-semibold">Celebrate Success</h3></div><p className="text-sm">Recognize and reward your commitment to your health journey.</p></div>
          <div className="bg-purple-50 p-4 rounded-lg"><div className="flex items-center gap-2 mb-2"><Gift className="h-5 w-5 text-purple-600" /><h3 className="font-semibold">Reinvest in Health</h3></div><p className="text-sm">Use rewards to further invest in your wellness journey.</p></div>
        </div>
      </div>
      <AlertDialogFooter><AlertDialogAction onClick={handleClose}>Close</AlertDialogAction></AlertDialogFooter>
    </>
  ];

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-3xl">
        {steps[step]}
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default FinancialRewardsDialog;