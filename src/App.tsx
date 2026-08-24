/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useContext } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { SignIn, SignUp, useUser } from '@clerk/clerk-react';

// Context
import { AuthContext, AuthProvider } from './context/AuthContext';

// Shared Components
import { TopHeaderNav, MainTab } from './components/shared/Navigation';
import { DayOneLogo } from './components/shared/DayOneLogo';

// Pages
import { LandingPage } from './components/main/LandingPage';
import { OnboardingScreen } from './components/onboarding/OnboardingScreen';

// Core Screens
import { HomeScreen } from './components/main/HomeScreen';
import { RoadmapScreen } from './components/main/RoadmapScreen';
import { ProjectsScreen } from './components/main/ProjectsScreen';
import { AssignmentsScreen } from './components/main/AssignmentsScreen';
import { InterviewScreen } from './components/main/InterviewScreen';
import { CareerCenterScreen } from './components/main/CareerCenterScreen';

// ─── Clerk sign-in / sign-up appearance ───────────────────────────────────────
const clerkAppearance = {
  variables: {
    colorPrimary: '#4d8eff',
    colorBackground: '#1c1f2a',
    colorText: '#dfe2f1',
    colorInputBackground: '#262a35',
    colorInputText: '#dfe2f1',
    colorDanger: '#ffb4ab',
    colorTextSecondary: '#c2c6d6',
    fontFamily: '"Inter", sans-serif',
    borderRadius: '0.75rem',
  },
  elements: {
    rootBox: 'w-full',
    card: 'bg-surface-container border border-outline-variant rounded-3xl shadow-2xl',
    headerTitle: 'font-headline text-on-surface text-2xl font-bold',
    headerSubtitle: 'font-body text-on-surface-variant',
    formFieldLabel: 'font-body text-on-surface-variant font-medium',
    formFieldInput:
      'font-body bg-surface-container-high border border-outline-variant text-on-surface placeholder-on-surface-variant focus:border-primary-container transition-colors shadow-sm',
    formButtonPrimary:
      'font-body bg-primary-container text-white hover:bg-[#3b78f0] font-semibold transition-colors shadow-md',
  },
};

// ─── Auth page wrapper (sign-in / sign-up) ────────────────────────────────────
function AuthPageWrapper({ mode }: { mode: 'signin' | 'signup' }) {
  const navigate = useNavigate();
  const { isLoaded, isSignedIn } = useUser();

  if (isLoaded && isSignedIn) {
    return <Navigate to="/app" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-transparent p-6">
      <div className="mb-8 text-center">
        <div
          className="mx-auto mb-6 w-fit cursor-pointer"
          onClick={() => navigate('/')}
        >
          <DayOneLogo
            size={80}
            alt="DayOne logo"
            className="rounded-[2rem] shadow-[0_16px_50px_rgba(13,21,38,0.6),0_0_60px_rgba(72,114,245,0.18)]"
          />
        </div>
        <h1 className="text-4xl font-bold text-on-surface font-headline mb-2 flex items-center gap-1.5 justify-center">
          Day<span className="text-primary italic">One</span>
        </h1>
        <p className="text-on-surface-variant font-body text-base">Your AI-powered learning journey</p>
      </div>

      <div className="w-full max-w-md">
        {mode === 'signin' ? (
          <SignIn
            appearance={clerkAppearance}
            routing="path"
            path="/signin"
            fallbackRedirectUrl="/app"
            forceRedirectUrl="/app"
          />
        ) : (
          <SignUp
            appearance={clerkAppearance}
            routing="path"
            path="/signup"
            fallbackRedirectUrl="/app"
            forceRedirectUrl="/app"
          />
        )}
      </div>

      <div className="mt-6 text-center">
        {mode === 'signin' ? (
          <p className="text-on-surface-variant font-body text-sm">
            Don't have an account?{' '}
            <button onClick={() => navigate('/signup')} className="text-primary font-medium ml-1">
              Sign up
            </button>
          </p>
        ) : (
          <p className="text-on-surface-variant font-body text-sm">
            Already have an account?{' '}
            <button onClick={() => navigate('/signin')} className="text-primary font-medium ml-1">
              Sign in
            </button>
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Protected app shell ───────────────────────────────────────────────────────
function AppShell() {
  const [activeTab, setActiveTab] = useState<MainTab>('home');
  const [practiceSubTab, setPracticeSubTab] = useState<'sandbox' | 'quizzes' | 'interview'>('sandbox');

  const { user, setUser, refreshUser, logout } = useContext(AuthContext);
  const { isLoaded, isSignedIn } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoaded && isSignedIn) refreshUser();
  }, [isLoaded, isSignedIn, refreshUser]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  // Not loaded yet
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Not signed in → redirect to landing
  if (!isSignedIn) return <Navigate to="/" replace />;

  // Signed in but no goal → onboarding
  if (isLoaded && isSignedIn && !user?.goal) {
    return (
      <OnboardingScreen
        onComplete={async () => {
          await refreshUser();
          // stays at /app after onboarding completes
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-on-surface flex flex-col">
      <TopHeaderNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
        user={user}
        onChangeGoal={() => {
          // Immediately clear goal so OnboardingScreen renders without waiting for API
          if (user) setUser({ ...user, goal: null });
        }}
      />

      <main className="flex-1 pt-20 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl w-full mx-auto">

        {/* Practice sub-tabs */}
        {activeTab === 'practice' && (
          <div className="flex gap-2 mb-6 bg-surface-container-low p-1.5 rounded-xl border border-outline-variant/10 w-fit">
            {(['sandbox', 'quizzes', 'interview'] as const).map(t => (
              <button
                key={t}
                onClick={() => setPracticeSubTab(t)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all capitalize ${
                  practiceSubTab === t ? 'bg-primary text-white shadow-md' : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {t === 'sandbox' ? 'Code Sandboxes' : t === 'quizzes' ? 'Quizzes & Exams' : 'Mock Interview'}
              </button>
            ))}
          </div>
        )}

        {activeTab === 'home' && <HomeScreen key="home" onNavigateTab={setActiveTab} />}
        {activeTab === 'learning' && <RoadmapScreen key="learning" />}
        {activeTab === 'practice' && (
          <>
            {practiceSubTab === 'sandbox' && <ProjectsScreen key="sandbox" />}
            {practiceSubTab === 'quizzes' && <AssignmentsScreen key="quizzes" />}
            {practiceSubTab === 'interview' && <InterviewScreen key="interview" />}
          </>
        )}
        {activeTab === 'career' && <CareerCenterScreen key="career" />}
      </main>
    </div>
  );
}

// ─── Root component with routes ────────────────────────────────────────────────
function AppContent() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/signin/*" element={<AuthPageWrapper mode="signin" />} />
      <Route path="/signup/*" element={<AuthPageWrapper mode="signup" />} />

      {/* Protected app */}
      <Route path="/app" element={<AppShell />} />
      <Route path="/app/*" element={<AppShell />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
