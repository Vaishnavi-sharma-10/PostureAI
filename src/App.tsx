import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { Home } from './pages/Home';
import { LiveAnalysis } from './pages/LiveAnalysis';
import { Results } from './pages/Results';
import { Progress } from './pages/Progress';
import { HowItWorks } from './pages/HowItWorks';
import { Technology } from './pages/Technology';
import { EvaluationMode } from './pages/EvaluationMode';
import { AssessmentSession } from './types';

export default function App() {
  const getInitialRoute = () => {
    const hash = window.location.hash.replace(/^#\/?/, '');
    if (['home', 'how-it-works', 'live-analysis', 'progress', 'technology', 'evaluation', 'results'].includes(hash)) {
      return hash;
    }
    const path = window.location.pathname.replace(/^\//, '');
    if (path === 'evaluation') return 'evaluation';
    return 'home';
  };

  const [currentRoute, setCurrentRoute] = useState<string>(getInitialRoute);
  const [latestSession, setLatestSession] = useState<AssessmentSession | null>(null);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#\/?/, '');
      if (['home', 'how-it-works', 'live-analysis', 'progress', 'technology', 'evaluation', 'results'].includes(hash)) {
        setCurrentRoute(hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleCompleteAssessment = (session: AssessmentSession) => {
    setLatestSession(session);
    navigate('results');
  };

  const handleSelectSession = (session: AssessmentSession) => {
    setLatestSession(session);
    navigate('results');
  };

  const navigate = (route: string) => {
    setCurrentRoute(route);
    window.location.hash = `#/${route}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0e1321] text-[#dee2f6]">
      {/* Top Futuristic Navigation Bar */}
      <Navbar
        currentRoute={currentRoute}
        onNavigate={navigate}
        isEngineActive={true}
      />

      {/* Main Screen Content */}
      <main className="flex-1">
        {currentRoute === 'home' && (
          <Home onNavigate={navigate} />
        )}

        {currentRoute === 'live-analysis' && (
          <LiveAnalysis
            onCompleteAssessment={handleCompleteAssessment}
          />
        )}

        {currentRoute === 'results' && (
          <Results
            session={latestSession}
            onRetake={() => navigate('live-analysis')}
            onViewProgress={() => navigate('progress')}
          />
        )}

        {currentRoute === 'progress' && (
          <Progress
            onStartAssessment={() => navigate('live-analysis')}
            onSelectSession={handleSelectSession}
          />
        )}

        {currentRoute === 'how-it-works' && (
          <HowItWorks
            onStartAssessment={() => navigate('live-analysis')}
          />
        )}

        {currentRoute === 'technology' && (
          <Technology />
        )}

        {currentRoute === 'evaluation' && (
          <EvaluationMode />
        )}
      </main>

      {/* Global Bottom Footer */}
      <Footer onNavigate={navigate} />
    </div>
  );
}
