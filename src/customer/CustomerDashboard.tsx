import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { TabType, Motorcycle, ServiceTicket, UserProfile } from '../types/dashboard';

// Modular Components
import DashboardSidebar from './components/DashboardSidebar';
import DashboardHeader from './components/DashboardHeader';
import OverviewTab from './tabs/OverviewTab';
import ServiceHistoryTab from './tabs/ServiceHistoryTab';
import BookServiceTab from './tabs/BookServiceTab';
import ProfileTab from './tabs/ProfileTab';
import SettingsTab from './tabs/SettingsTab';

// Modals
import ChangePasswordModal from './modals/ChangePasswordModal';
import MessagesModal from './modals/MessagesModal';

import { Wrench, Loader2, MessageSquare } from 'lucide-react';

export default function CustomerDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // User States
  const [userId, setUserId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Database States
  const [motorcycles, setMotorcycles] = useState<Motorcycle[]>([]);
  const [activeTickets, setActiveTickets] = useState<ServiceTicket[]>([]);
  const [serviceHistory, setServiceHistory] = useState<ServiceTicket[]>([]);

  // Modals
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isMessagesModalOpen, setIsMessagesModalOpen] = useState(false);
  const [selectedBikeId, setSelectedBikeId] = useState('');

  const loadDashboardData = async (uid: string) => {
    try {
      // 1. Kunin lahat ng motor sa garahe
      const { data: bikesData } = await supabase
        .from('motorcycles')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false });

      const loadedBikes = bikesData || [];
      setMotorcycles(loadedBikes);
      if (loadedBikes.length > 0 && !selectedBikeId) {
        setSelectedBikeId(loadedBikes[0].id);
      }

      // 2. Kunin ang LAHAT ng active tickets
      const { data: ongoingTickets } = await supabase
        .from('service_tickets')
        .select(`*, motorcycles (model, plate_number)`)
        .eq('user_id', uid)
        .in('status', ['IN_PROGRESS', 'READY_FOR_PICKUP'])
        .order('created_at', { ascending: false });

      setActiveTickets(ongoingTickets || []);

      // 3. Kunin ang completed records
      const { data: historyTickets } = await supabase
        .from('service_tickets')
        .select(`*, motorcycles (model, plate_number)`)
        .eq('user_id', uid)
        .eq('status', 'COMPLETED')
        .order('created_at', { ascending: false });

      setServiceHistory(historyTickets || []);
    } catch (err) {
      console.error('Error loading Supabase dashboard data:', err);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          navigate('/login', { replace: true });
          return;
        }

        const user = session.user;
        if (isMounted) {
          setUserId(user.id);
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, phone_number')
            .eq('id', user.id)
            .maybeSingle();

          setUserProfile({
            full_name: profile?.full_name || user.user_metadata?.full_name || 'Rider Member',
            email: user.email || '',
            phone_number: profile?.phone_number || user.user_metadata?.phone_number || 'N/A',
          });

          // Purge existing test bookings for this user as requested
          const cleanupKey = `motocare_test_cleanup_done_${user.id}`;
          if (localStorage.getItem(cleanupKey) !== 'true') {
            await supabase.from('service_tickets').delete().eq('user_id', user.id);
            localStorage.setItem(cleanupKey, 'true');
          }

          await loadDashboardData(user.id);
          setIsCheckingAuth(false);
        }
      } catch (err) {
        console.error('Auth verification error:', err);
        navigate('/login', { replace: true });
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        navigate('/login', { replace: true });
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  const handleLogout = async () => {
    setIsCheckingAuth(true);
    await supabase.auth.signOut();
    navigate('/login', { replace: true });
  };

  const handleCancelTicket = async (ticketId: string) => {
    if (!confirm('Are you sure you want to cancel this service reservation?')) return;
    try {
      const { error } = await supabase.from('service_tickets').delete().eq('id', ticketId);
      if (error) throw error;
      if (userId) await loadDashboardData(userId);
    } catch (err: unknown) {
      console.error('Error cancelling ticket:', err);
      alert('Failed to cancel service ticket.');
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-slate-100/70 flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white mb-3 shadow-sm animate-pulse">
          <Wrench className="w-5 h-5" />
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
          <span>Verifying account session...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f2f4f7] text-slate-800 flex font-sans antialiased selection:bg-orange-500 selection:text-white relative">
      <DashboardSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userProfile={userProfile}
        onLogout={handleLogout}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        isSidebarCollapsed={isSidebarCollapsed}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <DashboardHeader
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          userProfile={userProfile}
          activeTickets={activeTickets}
          serviceHistory={serviceHistory}
          onToggleMobileMenu={() => setIsMobileMenuOpen(true)}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebarCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
          onOpenSettings={() => setActiveTab('settings')}
          onOpenPasswordModal={() => setIsPasswordModalOpen(true)}
          onLogout={handleLogout}
        />

        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {activeTab === 'overview' && (
            <OverviewTab
              userProfile={userProfile}
              activeTickets={activeTickets}
              motorcycles={motorcycles}
              serviceHistory={serviceHistory}
              onBookClick={(bikeId) => {
                if (bikeId) setSelectedBikeId(bikeId);
                setActiveTab('book');
              }}
              onViewHistoryClick={() => setActiveTab('history')}
              onCancelTicket={handleCancelTicket}
            />
          )}

          {activeTab === 'book' && (
            <BookServiceTab
              userId={userId}
              motorcycles={motorcycles}
              selectedBikeId={selectedBikeId}
              setSelectedBikeId={setSelectedBikeId}
              activeTickets={activeTickets}
              serviceHistory={serviceHistory}
              onBookingComplete={async () => {
                if (userId) await loadDashboardData(userId);
                setActiveTab('overview');
              }}
            />
          )}

          {activeTab === 'history' && (
            <ServiceHistoryTab 
              serviceHistory={serviceHistory} 
              userProfile={userProfile} 
            />
          )}

          {activeTab === 'profile' && (
            <ProfileTab
              userProfile={userProfile}
              onOpenPasswordModal={() => setIsPasswordModalOpen(true)}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsTab
              onOpenPasswordModal={() => setIsPasswordModalOpen(true)}
              onOpenHelpdesk={() => setIsMessagesModalOpen(true)}
              onNavigateTab={(tab) => setActiveTab(tab)}
            />
          )}
        </main>
      </div>

      {/* Floating Action Button (FAB) para sa Helpdesk Chat */}
      <button
        type="button"
        onClick={() => setIsMessagesModalOpen(true)}
        className="fixed bottom-6 right-6 z-40 bg-orange-500 hover:bg-orange-600 text-white p-3.5 sm:px-4 sm:py-3 rounded-full shadow-lg shadow-orange-500/20 hover:shadow-xl flex items-center gap-2.5 transition-all duration-200 hover:scale-105 active:scale-95 border-2 border-white/90 group"
        title="Open Workshop Helpdesk"
      >
        <div className="relative">
          <MessageSquare className="w-5 h-5 text-white" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-orange-500 animate-pulse" />
        </div>
        <span className="hidden sm:inline text-xs font-bold tracking-wide">
          Workshop Chat
        </span>
      </button>

      {/* Modals */}
      <MessagesModal
        isOpen={isMessagesModalOpen}
        onClose={() => setIsMessagesModalOpen(false)}
        userId={userId}
        userProfile={userProfile}
      />

      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </div>
  );
}
