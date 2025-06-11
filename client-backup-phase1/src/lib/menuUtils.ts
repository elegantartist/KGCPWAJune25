import { createMenuFeedback } from './hapticFeedback';

/**
 * Slide in the menu when it's opened
 * Also triggers haptic and sound feedback as requested
 * @param menuElement The menu element to slide in
 */
export const slideInMenu = async (menuElement: HTMLElement | null) => {
  if (!menuElement) return;
  
  // Play menu interaction sound and haptic feedback
  await createMenuFeedback();
  
  // Slide the menu in
  menuElement.style.transform = 'translateX(0)';
  menuElement.style.visibility = 'visible';
  menuElement.style.opacity = '1';
};

/**
 * Slide out the menu when a selection is made or it's closed
 * @param menuElement The menu element to slide out
 */
export const slideOutMenu = (menuElement: HTMLElement | null) => {
  if (!menuElement) return;
  
  // Slide the menu out
  menuElement.style.transform = 'translateX(-100%)';
  menuElement.style.opacity = '0';
  
  // Hide it after the animation completes
  setTimeout(() => {
    if (menuElement) {
      menuElement.style.visibility = 'hidden';
    }
  }, 300); // Matches the CSS transition duration
};

/**
 * Handle a menu item selection
 * Plays feedback and slides the menu away
 * @param menuElement The menu element to close
 * @param callback Optional callback to execute after selection
 */
export const handleMenuSelection = async (
  menuElement: HTMLElement | null, 
  callback?: () => void
) => {
  // Play menu selection feedback
  await createMenuFeedback();
  
  // Automatically slide the menu back in as requested
  slideOutMenu(menuElement);
  
  // Execute any additional callback
  if (callback) {
    callback();
  }
};