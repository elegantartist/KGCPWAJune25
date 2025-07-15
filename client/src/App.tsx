import { Toaster } from '@/components/ui/toaster';
import AppRouter from './components/AppRouter';
import { AuthProvider } from './hooks/useAuth';
import { MotivationalImageProvider } from './contexts/MotivationalImageContext';
import './styles/globals.css';
import './styles/FoodDatabase.css';

function App() {
  return (
    <AuthProvider>
      <MotivationalImageProvider>
        <AppRouter />
        <Toaster />
      </MotivationalImageProvider>
    </AuthProvider>
  );
}

export default App;
