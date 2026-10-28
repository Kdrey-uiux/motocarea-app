import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/auth/ProtectedRoute';
import InternalProtectedRoute from './internal/components/InternalProtectedRoute';
import AppErrorBoundary from './components/AppErrorBoundary';
import OfflineBanner from './components/OfflineBanner';
import { startSharedSettingsSync } from './lib/sharedSettings';
import LoadingScreen, { LoadingOverlayHost } from './components/brand/LoadingScreen';

// Code-split route components for fast initial page load & low bundle size
const Home = lazy(() => import('./pages/Home'));
const TrackStatus = lazy(() => import('./pages/TrackStatus'));
const WalkIn = lazy(() => import('./pages/WalkIn'));
const Login = lazy(() => import('./pages/Login'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const CompleteProfile = lazy(() => import('./pages/CompleteProfile'));
const CustomerDashboard = lazy(() => import('./customer/CustomerDashboard'));
const InternalConsole = lazy(() => import('./internal/InternalConsole'));
const InternalLogin = lazy(() => import('./internal/pages/InternalLogin'));
const NotFound = lazy(() => import('./pages/NotFound'));

// Shown for a moment while a page's code downloads: a plain white screen, so it
// blends into the (white) page instead of flashing a dark loading screen
function PageFallback() {
  return <LoadingScreen />;
}

function AuthHashRedirectHandler() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;

    if (hash.includes('type=recovery') && location.pathname !== '/reset-password') {
      navigate(`/reset-password${hash}`, { replace: true });
    } else if (
      (hash.includes('type=signup') || hash.includes('type=email_verification')) &&
      location.pathname !== '/login'
    ) {
      navigate(`/login?verified=true${hash}`, { replace: true });
    }
  }, [location, navigate]);

  return null;
}

export default function App() {
  // Workshop-wide settings (service catalog, bay maintenance, resolved chats) shared across all devices
  useEffect(() => {
    startSharedSettingsSync();
  }, []);

  return (
    <BrowserRouter>
      <AuthHashRedirectHandler />
      <div className="min-h-screen bg-slate-100/60 text-slate-900 font-sans">
        <OfflineBanner />
        {/* One loading overlay for every loading step (page download, login check, data load) */}
        <LoadingOverlayHost />
        <AppErrorBoundary>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/track" element={<TrackStatus />} />
            <Route path="/track/:ticketCode" element={<TrackStatus />} />
            <Route path="/walk-in" element={<WalkIn />} />
            <Route path="/login" element={<Login />} />
            
            {/* Internal Enterprise Console (Shop Owner & Floor Staff) */}
            <Route path="/internal/login" element={<InternalLogin />} />
            <Route
              path="/internal"
              element={
                <InternalProtectedRoute>
                  <InternalConsole />
                </InternalProtectedRoute>
              }
            />
            <Route
              path="/internal/*"
              element={
                <InternalProtectedRoute>
                  <InternalConsole />
                </InternalProtectedRoute>
              }
            />

            {/* GHOST ROUTES: Legacy /admin paths redirect seamlessly to Home */}
            <Route path="/admin" element={<Navigate to="/" replace />} />
            <Route path="/admin/*" element={<Navigate to="/" replace />} />

            <Route path="/reset-password" element={<ResetPassword />} />
            {/* Riders missing a name, mobile number or Terms consent (e.g. Google sign-ups) finish here first */}
            <Route
              path="/complete-profile"
              element={
                <ProtectedRoute>
                  <CompleteProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/*"
              element={
                <ProtectedRoute>
                  <CustomerDashboard />
                </ProtectedRoute>
              }
            />

            {/* Unknown links: a 404 page with ways back, instead of a blank screen */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        </AppErrorBoundary>
      </div>
    </BrowserRouter>
  );
}