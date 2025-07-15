import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Trophy } from 'lucide-react';
import { BadgeDetails } from '@/components/achievement-badge';

interface AwardCeremonyProps {
  badge: BadgeDetails;
  onComplete: () => void;
}

const badgeBaseColors = {
  exercise: "#4CAF50",
  meal: "#2196F3",
  medication: "#FF9800"
};

const badgeRingColors = {
  bronze: "#CD7F32",
  silver: "#C0C0C0",
  gold: "#FFD700",
  platinum: "#E5E4E2"
};

const badgeTitles = {
  exercise: "Exercise Champion",
  meal: "Meal Planning Master",
  medication: "Medication Maverick"
};

export function AwardCeremony({ badge, onComplete }: AwardCeremonyProps) {
  const [animationStep, setAnimationStep] = useState(0);

  useEffect(() => {
    // Play celebration sound
    try {
      const audio = new Audio('/assets/sounds/achievement-fanfare.mp3');
      audio.volume = 0.6;
      audio.play().catch(console.log);
    } catch (error) {
      console.log('Achievement sound not available');
    }

    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200, 100, 200]);
    }

    // Animation sequence
    const timers = [
      setTimeout(() => setAnimationStep(1), 500),
      setTimeout(() => setAnimationStep(2), 1500),
      setTimeout(() => setAnimationStep(3), 2500)
    ];

    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center">
      <div className="text-center text-white max-w-md mx-4">
        {/* Header */}
        <div className="mb-8">
          <Trophy className="h-16 w-16 mx-auto mb-4 text-yellow-400 animate-bounce" />
          <h1 className="text-4xl font-bold mb-2">Congratulations!</h1>
          <p className="text-xl opacity-90">You've earned a new achievement badge!</p>
        </div>

        {/* Animated Badge */}
        <div className="mb-8 relative">
          <div
            className={`relative w-40 h-40 mx-auto rounded-full transition-all duration-1000 ${
              animationStep > 0 ? 'scale-110' : 'scale-100'
            } ${animationStep > 1 ? 'animate-pulse' : ''}`}
            style={{
              backgroundColor: badgeBaseColors[badge.type],
              boxShadow: `0 0 40px ${badgeRingColors[badge.level]}`,
              border: `6px solid ${badgeRingColors[badge.level]}`
            }}
          >
            <img
              src="/assets/kgc-logo.jpg"
              alt={`${badge.type} ${badge.level} badge`}
              className="w-full h-full object-cover rounded-full"
            />

            {/* Sparkle Effects */}
            {animationStep > 2 && (
              <div className="absolute inset-0">
                {[...Array(12)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-3 h-3 bg-yellow-400 rounded-full animate-ping opacity-75"
                    style={{
                      top: `${10 + Math.random() * 80}%`,
                      left: `${10 + Math.random() * 80}%`,
                      animationDelay: `${i * 0.15}s`,
                      animationDuration: '2s'
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Badge Details */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-3 capitalize"
              style={{ color: badgeRingColors[badge.level] }}>
            {badge.level} {badgeTitles[badge.type]}
          </h2>
          <p className="text-lg text-gray-300 leading-relaxed">
            Outstanding commitment to your {badge.type === 'exercise' ? 'physical wellness' :
            badge.type === 'meal' ? 'nutritional health' : 'medication adherence'}!
          </p>
        </div>

        {/* Action Button */}
        <Button
          onClick={onComplete}
          className="bg-[#2E8BC0] hover:bg-[#2E8BC0]/90 text-white px-8 py-4 text-lg font-semibold rounded-lg shadow-lg transition-all duration-200 hover:scale-105"
        >
          Continue Your Journey
        </Button>
      </div>
    </div>
  );
}
