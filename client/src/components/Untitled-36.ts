/**
 * Creates a haptic feedback effect.
 * @param duration The duration of the vibration in milliseconds.
 * @param withSound (Not implemented) A placeholder for adding sound effects.
 */
export const createHapticFeedback = (duration: number, withSound: boolean) => {
  console.log(`Haptic feedback triggered: duration=${duration}, withSound=${withSound}`);
  if (navigator.vibrate) {
    navigator.vibrate(duration);
  }
};