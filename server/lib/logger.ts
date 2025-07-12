// Placeholder logger to satisfy imports
// In a real scenario, this would be a more robust logger.

interface LogDetails {
  [key: string]: any;
}

export const logger = {
  info: (message: string, details?: LogDetails): void => {
    console.log(`[INFO] ${message}`, details || '');
  },
  warn: (message: string, details?: LogDetails): void => {
    console.warn(`[WARN] ${message}`, details || '');
  },
  error: (message: string, details?: LogDetails | Error): void => {
    console.error(`[ERROR] ${message}`, details || '');
  },
  debug: (message: string, details?: LogDetails): void => {
    // console.debug(`[DEBUG] ${message}`, details || ''); // console.debug might not be universally available or visible
    console.log(`[DEBUG] ${message}`, details || '');
  },
  // Re-exporting 'log' from vite for specific uses if needed, or implement similar
  // For now, keeping it simple. The 'log' function in index.ts is from vite.
};

// If you want to use the vite log directly here:
// import { log as viteLog } from '../vite'; // Adjust path as needed
// export const logger = {
//   info: (message: string, details?: any) => viteLog(`${message} ${details ? JSON.stringify(details) : ''}`, 'INFO'),
//   warn: (message: string, details?: any) => viteLog(`${message} ${details ? JSON.stringify(details) : ''}`, 'WARN'),
//   error: (message: string, details?: any) => viteLog(`${message} ${details ? JSON.stringify(details) : ''}`, 'ERROR'),
//   debug: (message: string, details?: any) => viteLog(`${message} ${details ? JSON.stringify(details) : ''}`, 'DEBUG'),
// };

export default logger; // Also export as default if some files import it that way
