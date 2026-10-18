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
import SpotlightTour from '../components/tutorial/SpotlightTour';

import { Wrench, MessageSquare, CheckCircle2 } from 'lucide-react';
import { HardcopyRequest, fetchHardcopyRequests } from '../lib/hardcopyService';
import { runMissedBookingScanInBackground, checkAndSendBookingReminders } from '../utils/bookingLifecycle';
import { TICKET_SYNC_CHANNEL, TICKET_SYNC_EVENT, broadcastTicketSync, debounce } from '../lib/realtimeSync';

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
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [rescheduleTicket, setRescheduleTicket] = useState<ServiceTicket | null>(null);

  const handleOpenReschedule = (ticket: ServiceTicket) => {
    setRescheduleTicket(ticket);
    setActiveTab('book');
  };

  const loadDashboardData = async (uid: string) => {
    try {
      // Non-blocking background health checks
      runMissedBookingScanInBackground();
      checkAndSendBookingReminders(uid).catch(() => {});

      // Parallelize customer dashboard queries
      const [bikesRes, ongoingRes, historyRes, hardcopies] = await Promise.all([
        supabase
          .from('motorcycles')
          .select('*')
          .eq('user_id', uid)
          .order('created_at', { ascending: false }),
        supabase
          .from('service_tickets')
          .select(`*, motorcycles (model, plate_number)`)
          .eq('user_id', uid)
          .in('status', ['PENDING_CONFIRMATION', 'PENDING_DROPOFF', 'CONFIRMED_APPOINTMENT', 'IN_PROGRESS', 'READY_FOR_PICKUP'])
          .order('created_at', { ascending: false }),
        supabase
          .from('service_tickets')
          .select(`*, motorcycles (model, plate_number)`)
          .eq('user_id', uid)
          .in('status', ['COMPLETED', 'MISSED', 'NO_SHOW', 'CANCELLED_BY_ADMIN', 'CANCELLED'])
          .order('created_at', { ascending: false }),
        fetchHardcopyRequests(uid),
      ]);

      const loadedBikes = bikesRes.data || [];
      setMotorcycles(loadedBikes);
      if (loadedBikes.length > 0 && !selectedBikeId) {
        setSelectedBikeId(loadedBikes[0].id);
      }

      setActiveTickets(ongoingRes.data || []);
      setServiceHistory(historyRes.data || []);
      setHardcopyRequests(hardcopies || []);
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

  // Realtime subscription for ticket stage/dispatch updates and hardcopy status
  useEffect(() => {
    if (!userId) return;

    const debouncedReload = debounce(() => {
      loadDashboardData(userId);
    }, 400);

    // 1. Service tickets broadcast (stage changes, bay moves, confirmations from Admin/Staff)
    const dispatchChannel = supabase
      .channel(TICKET_SYNC_CHANNEL)
      .on('broadcast', { event: TICKET_SYNC_EVENT }, () => {
        debouncedReload();
      })
      .subscribe();

    // 2. Direct database level changes for current user
    const dbChangesChannel = supabase
      .channel(`customer_db_sync_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'service_tickets',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          debouncedReload();
        }
      )
      .subscribe();

    // 3. Hardcopy certified requests realtime
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
      debouncedReload.cancel();
      supabase.removeChannel(dispatchChannel);
      supabase.removeChannel(dbChangesChannel);
      supabase.removeChannel(hardcopyChannel);
    };
  }, [userId]);

  // Automatically launch streamlined guided walkthrough for NEW USERS upon entering dashboard
  useEffect(() => {
    if (!userId) return;
    try {
      const hasCompleted = localStorage.getItem(`motocare_tour_seen_${userId}`);
      if (!hasCompleted) {
        // Brand new account detected: launch streamlined guided tab walkthrough
        setIsTourOpen(true);
      }
    } catch {
      // ignore
    }
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

  // BFCache Interceptor: Disallows viewing dashboard via browser Back button after logout
  useEffect(() => {
    const handlePageShow = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          window.location.replace('/login');
        }
      } catch {
        window.location.replace('/login');
      }
    };

    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, []);

  const handleLogout = () => {
    setIsLogoutModalOpen(true);
  };

  const executeLogout = async () => {
    setIsLoggingOut(true);
    await supabase.auth.signOut();
    // Hard cache flush: burns the browser history snapshot so Back button cannot return
    window.location.replace('/login');
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
      // Soft cancel only (history stays). cancelled_by stays empty so the shop sees it as a customer cancellation.
      const { data: cancelledRows, error: updateErr } = await supabase
        .from('service_tickets')
        .update({
          status: 'CANCELLED',
          cancelled_at: new Date().toISOString(),
          cancellation_reason: 'Cancelled by customer',
        })
        .eq('id', cancellingTicket.id)
        .eq('user_id', userId)
        .eq('stage', 1)
        .select('id');

      if (updateErr) throw updateErr;
      if (!cancelledRows || cancelledRows.length === 0) {
        throw new Error('This booking can no longer be cancelled online.');
      }

      // Broadcast real-time cancellation to Admin and Staff consoles live
      broadcastTicketSync({ action: 'CANCELLED', id: cancellingTicket.id, ticket_code: cancellingTicket.ticket_code });

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
      <div className="min-h-screen bg-slate-50/80 flex flex-col items-center justify-center p-4 font-sans select-none animate-in fade-in duration-150">
        <div className="relative flex items-center justify-center">
          {/* Active Spinning Ring */}
          <div className="w-16 h-16 rounded-full border-3 border-orange-200 border-t-orange-500 animate-spin" />
          {/* Centered MotoCare Icon */}
          <div className="absolute w-9 h-9 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-md shadow-orange-500/25">
            <Wrench className="w-4 h-4 animate-pulse" />
          </div>
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

      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          isSidebarCollapsed ? 'md:pl-0' : 'md:pl-24'
        }`}
      >
        <DashboardHeader
          userId={userId}
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
          onOpenTutorial={() => setIsTourOpen(true)}
        />

        <main className="p-3 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6 pb-36 sm:pb-32 md:pt-32 lg:pt-36">
          {activeTab === 'overview' && (
            <OverviewTab
              userProfile={userProfile}
              activeTickets={activeTickets}
              motorcycles={motorcycles}
              serviceHistory={serviceHistory}
              onBookClick={(bikeId) => {
                if (bikeId) setSelectedBikeId(bikeId);
                setRescheduleTicket(null);
                setActiveTab('book');
              }}
              onViewHistoryClick={() => setActiveTab('history')}
              onRequestCancelTicket={handleRequestCancelTicket}
              onRescheduleClick={handleOpenReschedule}
              onRefreshData={() => {
                if (userId) loadDashboardData(userId);
              }}
            />
          )}

          {activeTab === 'book' && (
            <BookServiceTab
              userId={userId}
              userProfile={userProfile}
              motorcycles={motorcycles}
              selectedBikeId={selectedBikeId}
              setSelectedBikeId={setSelectedBikeId}
              activeTickets={activeTickets}
              serviceHistory={serviceHistory}
              rescheduleTicket={rescheduleTicket}
              onCancelReschedule={() => setRescheduleTicket(null)}
              onBookingComplete={async () => {
                setRescheduleTicket(null);
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
              onRescheduleTicket={handleOpenReschedule}
              onRefreshData={() => {
                if (userId) loadDashboardData(userId);
              }}
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
        id="tour-helpdesk-chat"
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
        onRescheduleTicket={(code) => {
          const match =
            serviceHistory.find((t) => t.ticket_code === code) ||
            activeTickets.find((t) => t.ticket_code === code);
          if (match) {
            handleOpenReschedule(match);
          } else {
            setActiveTab('book');
          }
        }}
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

      {/* Streamlined Interactive Guided Tab Walkthrough */}
      <SpotlightTour
        isOpen={isTourOpen}
        onClose={() => {
          setIsTourOpen(false);
          setActiveTab('overview');
        }}
        userId={userId}
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
      />
    </div>
  );
}
