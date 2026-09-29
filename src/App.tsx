import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import TrackStatus from './pages/TrackStatus';
import Login from './pages/Login';
import AdminRedirect from './pages/AdminRedirect';
import ResetPassword from './pages/ResetPassword';
import CustomerDashboard from './customer/CustomerDashboard';
import ProtectedRoute from './components/auth/ProtectedRoute';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-100/60 text-slate-900 font-sans">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/track" element={<TrackStatus />} />
          <Route path="/track/:ticketCode" element={<TrackStatus />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin/login" element={<AdminRedirect />} />
          <Route path="/admin" element={<AdminRedirect />} />
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
      </div>
    </BrowserRouter>
  );
}