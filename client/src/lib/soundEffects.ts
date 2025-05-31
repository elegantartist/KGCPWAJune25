// Audio haptic feedback utility for iOS devices
import { createHapticFeedback as baseHapticFeedback } from "@/lib/hapticFeedback";

/**
 * Creates a deeper, more soothing sound effect for haptic feedback that plays for 2 seconds
 */
export const createHapticFeedback = (duration: number = 2000, playSound: boolean = false): boolean => {
  // Use the base haptic feedback module from hapticFeedback.ts
  return baseHapticFeedback(duration, playSound);
};