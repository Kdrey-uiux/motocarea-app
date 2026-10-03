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
import ConfirmLogoutModal from './modals/ConfirmLogoutModal';
import CancelBookingModal from './modals/CancelBookingModal';

import { Wrench, Loader2, MessageSquare, CheckCircle2 } from 'lucide-react';
import { HardcopyRequest, fetchHardcopyRequests } from '../lib/hardcopyService';

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
  const [hardcopyRequests, setHardcopyRequests] = useState<HardcopyRequest[]>([]);

  // Modals & Actions
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isMessagesModalOpen, setIsMessagesModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [cancellingTicket, setCancellingTicket] = useState<ServiceTicket | null>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isCancellingTicket, setIsCancellingTicket] = useState(false);
  const [cancelSuccessMsg, setCancelSuccessMsg] = useState<string | null>(null);
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

      // 4. Kunin ang certified hardcopy requests
      const hardcopies = await fetchHardcopyRequests(uid);
      setHardcopyRequests(hardcopies);
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

  // Realtime subscription para sa hardcopy status updates
  useEffect(() => {
    if (!userId) return;

    const hardcopyChannel = supabase
      .channel(`customer_hardcopy_realtime_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchHardcopyRequests(userId).then(setHardcopyRequests);
        }
      )
      .on(
        'broadcast',
        { event: 'HARDCOPY_STATUS_CHANGED' },
        () => {
          fetchHardcopyRequests(userId).then(setHardcopyRequests);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(hardcopyChannel);
    };
  }, [userId]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isMobileMenuOpen]);

  const handleLogout = () => {
    setIsLogoutModalOpen(true);
  };

  const executeLogout = async () => {
    setIsLoggingOut(true);
    await supabase.auth.signOut();
    navigate('/login', { replace: true });
  };

  const handleRequestCancelTicket = (ticket: ServiceTicket) => {
    if (ticket.stage > 1) {
      alert(
        `Ticket #${ticket.ticket_code} is already in active workshop service (Stage ${ticket.stage}). Direct cancellation is disabled once inspection or repairs commence. Please message the workshop advisor to modify your service.`
      );
      setIsMessagesModalOpen(true);
      return;
    }
    setCancellingTicket(ticket);
    setIsCancelModalOpen(true);
  };

  const executeCancelTicket = async () => {
    if (!cancellingTicket) return;
    setIsCancellingTicket(true);
    try {
      // Attempt status update to CANCELLED first, fallback to delete
      const { error: updateErr } = await supabase
        .from('service_tickets')
        .update({ status: 'CANCELLED' })
        .eq('id', cancellingTicket.id);

      if (updateErr) {
        const { error: delErr } = await supabase
          .from('service_tickets')
          .delete()
          .eq('id', cancellingTicket.id);
        if (delErr) throw delErr;
      }

      if (userId) await loadDashboardData(userId);
      setIsCancelModalOpen(false);
      const code = cancellingTicket.ticket_code;
      setCancellingTicket(null);
      setCancelSuccessMsg(`Booking #${code} has been cancelled. Vehicle slot is now released.`);
      setTimeout(() => setCancelSuccessMsg(null), 4000);
    } catch (err: unknown) {
      console.error('Error cancelling ticket:', err);
      alert('Failed to cancel service ticket. Please try again or contact shop support.');
    } finally {
      setIsCancellingTicket(false);
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

      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          userProfile={userProfile}
          activeTickets={activeTickets}
          serviceHistory={serviceHistory}
          hardcopyRequests={hardcopyRequests}
          onToggleMobileMenu={() => setIsMobileMenuOpen(true)}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebarCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
          onOpenSettings={() => setActiveTab('settings')}
          onOpenPasswordModal={() => setIsPasswordModalOpen(true)}
          onLogout={handleLogout}
        />

        <main className="p-3 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6 pb-36 sm:pb-16">
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
              onRequestCancelTicket={handleRequestCancelTicket}
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
              onNavigateTab={(tab) => setActiveTab(tab)}
              onOpenChat={() => setIsMessagesModalOpen(true)}
              onRequestCancelTicket={handleRequestCancelTicket}
            />
          )}

          {activeTab === 'history' && (
            <ServiceHistoryTab 
              serviceHistory={serviceHistory} 
              userProfile={userProfile} 
              userId={userId}
              hardcopyRequests={hardcopyRequests}
              onRefreshHardcopy={() => {
                if (userId) fetchHardcopyRequests(userId).then(setHardcopyRequests);
              }}
              onNavigateTab={(tab) => setActiveTab(tab)}
              onOpenHelpdesk={() => setIsMessagesModalOpen(true)}
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
        className={`fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 bg-orange-500 hover:bg-orange-600 text-white p-3 sm:px-4 sm:py-3 rounded-full shadow-lg shadow-orange-500/25 hover:shadow-xl items-center gap-2.5 transition-transform duration-150 hover:scale-105 active:scale-95 border-2 border-white/90 group transform-gpu ${
          isMobileMenuOpen ? 'hidden' : 'flex'
        }`}
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

      {/* Cancellation Success Feedback Toast */}
      {cancelSuccessMsg && (
        <div className="fixed bottom-20 right-4 sm:bottom-6 sm:right-24 z-50 bg-slate-900/95 backdrop-blur-md text-white border border-emerald-500/50 shadow-2xl px-4 py-3 rounded-2xl flex items-center gap-2.5 text-xs animate-in slide-in-from-bottom duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-semibold text-emerald-100">{cancelSuccessMsg}</span>
        </div>
      )}

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

      <ConfirmLogoutModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={executeLogout}
        loading={isLoggingOut}
      />

      <CancelBookingModal
        isOpen={isCancelModalOpen}
        onClose={() => {
          setIsCancelModalOpen(false);
          setCancellingTicket(null);
        }}
        onConfirm={executeCancelTicket}
        ticket={cancellingTicket}
        loading={isCancellingTicket}
      />
    </div>
  );
}
