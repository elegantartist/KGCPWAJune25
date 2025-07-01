import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import EnhancedChatbot from './pages/enhanced-chatbot';
import DailyScoresPage from './pages/daily-scores';
import ProgressMilestones from './pages/progress-milestones';
import { BadgeAwardProvider } from './context/BadgeAwardContext';

function App() {
  return (
    <BadgeAwardProvider>
      <Router>
        <Routes>
          {/* Define other routes like login, dashboard etc. here */}
          <Route path="/" element={<EnhancedChatbot />} />
          <Route path="/dashboard" element={<EnhancedChatbot />} />
          <Route path="/daily-scores" element={<DailyScoresPage />} />
          <Route path="/progress-milestones" element={<ProgressMilestones />} />
        </Routes>
      </Router>
    </BadgeAwardProvider>
  );
}
export default App
