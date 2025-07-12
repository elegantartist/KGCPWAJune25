import 'express-session';

declare module 'express-session' {
  interface SessionData {
    user?: {
      userId: number;
      role: string;
      name: string;
    };
  }
}
