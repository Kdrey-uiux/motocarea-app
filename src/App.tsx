import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/auth/ProtectedRoute';
import InternalProtectedRoute from './internal/components/InternalProtectedRoute';
import { startSharedSettingsSync } from './lib/sharedSettings';

// Code-split route components for fast initial page load & low bundle size
const Home = lazy(() => import('./pages/Home'));
const TrackStatus = lazy(() => import('./pages/TrackStatus'));
const Login = lazy(() => import('./pages/Login'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const CustomerDashboard = lazy(() => import('./customer/CustomerDashboard'));
const InternalConsole = lazy(() => import('./internal/InternalConsole'));
const InternalLogin = lazy(() => import('./internal/pages/InternalLogin'));

function PageFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-medium tracking-wider uppercase text-slate-400">Loading MotoCare...</p>
      </div>
    </div>
  );
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
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/track" element={<TrackStatus />} />
            <Route path="/track/:ticketCode" element={<TrackStatus />} />
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
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <CustomerDashboard />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Suspense>
      </div>
    </BrowserRouter>
  );
}