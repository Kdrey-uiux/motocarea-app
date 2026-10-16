import { useState, useEffect, useCallback, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  InternalTab, 
  InternalTicket, 
  UserRole, 
  InternalStaffMember, 
  NotificationAlert 
} from './types/internal';
import { getInternalSession, clearInternalSession, getInternalAuthedClient } from './utils/internalAuth';
import { canAccessTab } from './utils/permissions';
import { fetchDatabaseStaffMembers } from './utils/databaseStaffManager';
import { runMissedBookingScanInBackground } from '../utils/bookingLifecycle';
import { parseTicketNotes } from '../utils/ticketNotesParser';
import { TICKET_SYNC_CHANNEL, TICKET_SYNC_EVENT, debounce } from '../lib/realtimeSync';
import { AlertCircle } from 'lucide-react';

// Components
import InternalHeader from './components/InternalHeader';
import InternalSidebar from './components/InternalSidebar';

// Modals
import DispatchTicketModal from './modals/DispatchTicketModal';
import Stage5BillingModal from './modals/Stage5BillingModal';
import OfficialReceiptPrintModal from './modals/OfficialReceiptPrintModal';
import JobOrderPrintModal from './modals/JobOrderPrintModal';
import HardcopyRequestsModal from './modals/HardcopyRequestsModal';
import { HardcopyRequest, fetchHardcopyRequests } from '../lib/hardcopyService';

// Tabs
import InternalDashboardTab from './tabs/InternalDashboardTab';
import InternalQueueTab from './tabs/InternalQueueTab';
import InternalBaysTab from './tabs/InternalBaysTab';
import InternalBillingTab from './tabs/InternalBillingTab';
import InternalAnalyticsTab from './tabs/InternalAnalyticsTab';
import InternalStaffTab from './tabs/InternalStaffTab';
import InternalAuditTab from './tabs/InternalAuditTab';
import InternalMessagesTab from './tabs/InternalMessagesTab';
import InternalFleetTab from './tabs/InternalFleetTab';
import InternalServicesTab from './tabs/InternalServicesTab';

export default function InternalConsole() {
  // Auth Session
  const session = getInternalSession();
  const currentRole: UserRole = session?.role || 'staff';

  const sanitizeName = (rawName?: string | null, role: UserRole = 'staff') => {
    if (role === 'admin') return 'Admin';
    if (!rawName) return 'Staff Member';
    const trimmed = rawName.trim();
    if (trimmed.toLowerCase().includes('kuya') || trimmed.toLowerCase().includes('jun') || trimmed.toLowerCase() === 'shop owner') {
      return 'Staff Member';
    }
    return trimmed;
  };

  const initialName = useMemo(() => {
    return sanitizeName(session?.fullName, currentRole);
  }, [session, currentRole]);

  const [currentUserName, setCurrentUserName] = useState<string>(initialName);

  // Fetch live dynamic user profile from Supabase profiles table
  useEffect(() => {
    if (!session?.userId) return;

    let isMounted = true;
    const fetchLiveProfile = async () => {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, role')
          .eq('id', session.userId)
          .maybeSingle();

        if (profile && isMounted) {
          const cleanName = sanitizeName(profile.full_name, currentRole);
          setCurrentUserName(cleanName);

          // Proactively heal Supabase profile if it still contains 'Kuya' or 'Jun'
          if (profile.full_name && (profile.full_name.toLowerCase().includes('kuya') || profile.full_name.toLowerCase().includes('jun'))) {
            supabase
              .from('profiles')
              .update({ full_name: cleanName })
              .eq('id', session.userId)
              .then(() => {});
          }
        }
      } catch (err) {
        console.warn('Could not fetch live staff profile:', err);
      }
    };

    fetchLiveProfile();
    return () => {
      isMounted = false;
    };
  }, [session?.userId, currentRole]);

  const [activeTab, setActiveTab] = useState<InternalTab>(
    currentRole === 'admin' ? 'dashboard' : 'queue'
  );
  const [tickets, setTickets] = useState<InternalTicket[]>([]);
  const [staffList, setStaffList] = useState<InternalStaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [ticketsError, setTicketsError] = useState<string | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [messagesCount, setMessagesCount] = useState(0);

  // Live Notifications
  const [notifications, setNotifications] = useState<NotificationAlert[]>([
    {
      id: 'notif-welcome',
      title: 'Console Initialized',
      message: `Workshop console session initialized. Active user: ${currentUserName}.`,
      timestamp: new Date().toISOString(),
      type: 'system',
      read: false,
    },
  ]);

  // Modals state
  const [dispatchTicket, setDispatchTicket] = useState<InternalTicket | null>(null);
  const [isDispatchOpen, setIsDispatchOpen] = useState(false);

  const [billingTicket, setBillingTicket] = useState<InternalTicket | null>(null);
  const [isBillingOpen, setIsBillingOpen] = useState(false);

  const [receiptTicket, setReceiptTicket] = useState<InternalTicket | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  const [jobOrderTicket, setJobOrderTicket] = useState<InternalTicket | null>(null);
  const [isJobOrderOpen, setIsJobOrderOpen] = useState(false);

  const [hardcopyRequests, setHardcopyRequests] = useState<HardcopyRequest[]>([]);
  const [isHardcopyOpen, setIsHardcopyOpen] = useState(false);

  // BFCache Interceptor: Disallows viewing console via browser Back button after logout
  useEffect(() => {
    const handlePageShow = () => {
      const activeSession = getInternalSession();
      if (!activeSession || activeSession.isActive === false) {
        window.location.replace('/internal/login');
      }
    };

    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, []);

  // 1. Session Guard & Resilient Wi-Fi Heartbeat
  useEffect(() => {
    if (!session || session.isActive === false) {
      window.location.replace('/internal/login');
      return;
    }

    // Check reactive status every 15s in Supabase database
    const checkDeactivated = async () => {
      try {
        if (session.userId && !session.userId.startsWith('seed-')) {
          const { data: prof, error } = await supabase
            .from('profiles')
            .select('is_active, role')
            .eq('id', session.userId)
            .maybeSingle();

          // Resilient Wi-Fi check: DO NOT logout if simple network drop or offline error
          if (!error && prof && (prof.is_active === false || prof.role === 'customer')) {
            clearInternalSession();
            alert('Session Terminated: Your account has been suspended or deactivated by the Shop Owner.');
            window.location.replace('/internal/login');
          }
        }
      } catch {
        // Network drop or temporary timeout - do NOT logout
      }
    };

    const interval = setInterval(checkDeactivated, 15000);
    return () => clearInterval(interval);
  }, [session]);

  // Tab Guard: If Staff tries to access admin-only tab, redirect to queue
  useEffect(() => {
    if (!canAccessTab(currentRole, activeTab)) {
      setActiveTab('queue');
    }
  }, [currentRole, activeTab]);

  // Load staff list
  const loadStaff = useCallback(async () => {
    const list = await fetchDatabaseStaffMembers();
    setStaffList(list);
  }, []);

  // Fetch tickets with attached motorcycles and profile data
  const fetchTickets = useCallback(async (options?: { silent?: boolean }) => {
    try {
      if (!options?.silent) {
        setLoading(true);
      }
      setTicketsError(null);

      // Automated missed booking check runs in background (throttled to at most once per 5 mins)
      runMissedBookingScanInBackground();

      // Query only columns verified to exist in public.service_tickets
      const { data: ticketData, error } = await supabase
        .from('service_tickets')
        .select(`
          id,
          ticket_code,
          service_type,
          stage,
          assigned_bay,
          assigned_mechanic,
          estimated_pickup,
          total_estimate,
          status,
          notes,
          dropoff_date,
          created_at,
          user_id,
          parts_cost,
          labor_cost,
          total_amount,
          billing_breakdown,
          payment_method,
          payment_status,
          paid_at,
          released_by,
          cancellation_reason,
          cancelled_by,
          cancelled_at,
          discount_amount,
          discount_type,
          is_walk_in,
          motorcycles (
            id,
            model,
            plate_number,
            year_model,
            odometer
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching tickets:', error);
        setTicketsError(error.message || 'Failed to load tickets from workshop database.');
        return;
      }

      const rawTickets = ticketData || [];

      // Resolve profile names using staff client if available (to bypass RLS restriction on profiles)
      const userIds = Array.from(new Set(rawTickets.map((t) => t.user_id).filter(Boolean)));
      const profileMap = new Map<string, { full_name: string; phone_number: string }>();

      if (userIds.length > 0) {
        try {
          const authedClient = await getInternalAuthedClient();
          const clientToUse = authedClient || supabase;
          const { data: profs } = await clientToUse
            .from('profiles')
            .select('id, full_name, phone_number')
            .in('id', userIds);

          profs?.forEach((p) => {
            profileMap.set(p.id, {
              full_name: p.full_name || 'Rider Customer',
              phone_number: p.phone_number || 'N/A',
            });
          });
        } catch {
          // ignore
        }
      }

      const populated: InternalTicket[] = rawTickets.map((t: any) => {
        const prof = t.user_id ? profileMap.get(t.user_id) : undefined;
        const parsed = parseTicketNotes(t.notes);

        const resolvedName = prof?.full_name || parsed.customerName || 'Rider Customer';
        const resolvedPhone = (prof?.phone_number && prof.phone_number !== 'N/A') ? prof.phone_number : (parsed.phone || 'N/A');

        return {
          ...t,
          customer_name: resolvedName,
          customer_phone: resolvedPhone,
          dropoff_window: t.dropoff_window || parsed.arrivalWindow || undefined,
          profiles: {
            full_name: resolvedName,
            phone_number: resolvedPhone,
          },
        };
      });

      setTickets(populated);
    } catch (err: unknown) {
      console.error('Failed to load tickets:', err);
      setTicketsError(err instanceof Error ? err.message : 'Failed to load tickets from workshop database.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMessagesCount = useCallback(async () => {
    try {
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('sender_role', 'customer');
      setMessagesCount(count || 0);
    } catch {
      // ignore
    }
  }, []);

  const loadHardcopies = useCallback(async () => {
    try {
      const list = await fetchHardcopyRequests();
      setHardcopyRequests(list);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchTickets();
    fetchMessagesCount();
    loadStaff();
    loadHardcopies();

    // Debounced silent ticket refresher for rapid broadcasts / postgres events
    const debouncedTicketRefresh = debounce(() => {
      fetchTickets({ silent: true });
    }, 400);

    // Realtime channel subscriptions
    const ticketChannel = supabase
      .channel('internal_tickets_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'service_tickets' }, (payload) => {
        debouncedTicketRefresh();
        if (payload.eventType === 'INSERT') {
          const newCode = payload.new?.ticket_code || 'TICKET';
          setNotifications((prev) => [
            {
              id: `notif-${Date.now()}`,
              title: 'New Service Ticket',
              message: `New ticket #${newCode} entered Stage 1 intake queue.`,
              timestamp: new Date().toISOString(),
              type: 'ticket',
              read: false,
              ticketCode: newCode,
            },
            ...prev,
          ]);
        }
      })
      .subscribe();

    const dispatchBroadcast = supabase
      .channel(TICKET_SYNC_CHANNEL)
      .on('broadcast', { event: TICKET_SYNC_EVENT }, () => {
        debouncedTicketRefresh();
      })
      .subscribe();

    const messageChannel = supabase
      .channel('internal_messages_notif')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        fetchMessagesCount();
        if (payload.new?.sender_role === 'customer') {
          setNotifications((prev) => [
            {
              id: `notif-${Date.now()}`,
              title: 'Customer Message',
              message: payload.new?.message || 'New customer inquiry received.',
              timestamp: new Date().toISOString(),
              type: 'chat',
              read: false,
            },
            ...prev,
          ]);
        }
      })
      .subscribe();

    const hardcopyChannel = supabase
      .channel('internal_hardcopy_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        loadHardcopies();
      })
      .on('broadcast', { event: 'NEW_HARDCOPY_REQUEST' }, (payload: any) => {
        loadHardcopies();
        const req = payload?.payload as HardcopyRequest;
        if (req?.id) {
          setNotifications((prev) => [
            {
              id: `notif-hc-${Date.now()}`,
              title: 'New Certified Hardcopy Request',
              message: `Official record requested by ${req.customerName} for ${req.bikeModel} (${req.plateNumber}).`,
              timestamp: new Date().toISOString(),
              type: 'system',
              read: false,
            },
            ...prev,
          ]);
        }
      })
      .on('broadcast', { event: 'HARDCOPY_STATUS_CHANGED' }, () => {
        loadHardcopies();
      })
      .subscribe();

    // 30s Polling Fallback (silent background check)
    const pollInterval = setInterval(() => {
      fetchTickets({ silent: true });
      fetchMessagesCount();
      loadHardcopies();
    }, 30000);

    return () => {
      debouncedTicketRefresh.cancel();
      supabase.removeChannel(ticketChannel);
      supabase.removeChannel(dispatchBroadcast);
      supabase.removeChannel(messageChannel);
      supabase.removeChannel(hardcopyChannel);
      clearInterval(pollInterval);
    };
  }, [fetchTickets, fetchMessagesCount, loadStaff, loadHardcopies]);

  // Derived counts for sidebar badges
  const queueCount = useMemo(() => {
    return tickets.filter(
      (t) =>
        t.status !== 'COMPLETED' &&
        t.status !== 'CANCELLED' &&
        t.status !== 'CANCELLED_BY_ADMIN' &&
        t.status !== 'MISSED' &&
        t.status !== 'NO_SHOW'
    ).length;
  }, [tickets]);

  const readyBillingCount = useMemo(() => {
    return tickets.filter(
      (t) =>
        t.stage === 5 &&
        t.status !== 'COMPLETED' &&
        t.status !== 'CANCELLED' &&
        t.status !== 'CANCELLED_BY_ADMIN'
    ).length;
  }, [tickets]);

  const occupiedBaysCount = useMemo(() => {
    const bays = new Set<string>();
    tickets
      .filter(
        (t) =>
          t.status !== 'COMPLETED' &&
          t.status !== 'CANCELLED' &&
          t.status !== 'CANCELLED_BY_ADMIN' &&
          t.status !== 'MISSED' &&
          t.status !== 'NO_SHOW' &&
          t.assigned_bay
      )
      .forEach((t) => {
        const b = t.assigned_bay?.toLowerCase().slice(0, 6);
        if (b) bays.add(b);
      });
    return bays.size;
  }, [tickets]);

  const fleetCount = useMemo(() => {
    const plates = new Set<string>();
    tickets.forEach((t) => {
      if (t.motorcycles?.plate_number) {
        plates.add(t.motorcycles.plate_number.toUpperCase());
      }
    });
    return plates.size;
  }, [tickets]);

  const pendingHardcopyCount = useMemo(() => {
    return hardcopyRequests.filter((r) => r.status === 'PENDING').length;
  }, [hardcopyRequests]);

  // Logout handler: Hard location replace burns the session and history snapshot
  const handleLogout = () => {
    clearInternalSession();
    window.location.replace('/internal/login');
  };

  // Modal open handlers
  const handleOpenDispatch = (ticket: InternalTicket) => {
    setDispatchTicket(ticket);
    setIsDispatchOpen(true);
  };

  const handleOpenStage5Billing = (ticket: InternalTicket) => {
    setBillingTicket(ticket);
    setIsBillingOpen(true);
  };

  const handleOpenReceiptPrint = (ticket: InternalTicket) => {
    setReceiptTicket(ticket);
    setIsReceiptOpen(true);
  };

  const handleOpenJobOrderPrint = (ticket: InternalTicket) => {
    setJobOrderTicket(ticket);
    setIsJobOrderOpen(true);
  };

  // Notification actions
  const handleMarkNotifRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const handleClearNotifs = () => {
    setNotifications([]);
  };

  // Zero-render security gate: If no valid session, bounce immediately without rendering DOM
  if (!session || session.isActive === false) {
    return <Navigate to="/internal/login" replace />;
  }

  return (
    <div className="min-h-screen bg-[#f2f4f7] text-slate-800 font-sans antialiased selection:bg-orange-500 selection:text-white relative">
      {/* Slim Floating Left Dock (Fixed on Desktop) */}
      <InternalSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        queueCount={queueCount}
        occupiedBaysCount={occupiedBaysCount}
        readyBillingCount={readyBillingCount}
        messagesCount={messagesCount}
        fleetCount={fleetCount}
        staffCount={staffList.length}
        currentRole={currentRole}
        currentUserName={currentUserName}
        onLogout={handleLogout}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area (Offset by lg:pl-28 for the floating dock) */}
      <div className="lg:pl-28 flex flex-col min-h-screen">
        {/* Floating Capsule Top Navbar */}
        <InternalHeader
          loading={loading}
          onRefresh={fetchTickets}
          onLogout={handleLogout}
          onToggleMobileMenu={() => setIsMobileSidebarOpen(true)}
          currentRole={currentRole}
          currentUserName={currentUserName}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          notifications={notifications}
          onMarkNotificationRead={handleMarkNotifRead}
          onClearNotifications={handleClearNotifs}
          pendingHardcopyCount={pendingHardcopyCount}
          onOpenHardcopyModal={() => setIsHardcopyOpen(true)}
        />

        {/* Content View */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 lg:px-8 pb-12">
          {ticketsError && (
            <div className="mb-4 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center justify-between gap-3 text-xs animate-in fade-in">
              <div className="flex items-center gap-2 min-w-0">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="truncate">Database Notice: {ticketsError}</span>
              </div>
              <button
                type="button"
                onClick={() => fetchTickets()}
                className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg cursor-pointer shrink-0 transition"
              >
                Retry
              </button>
            </div>
          )}

          {activeTab === 'dashboard' && canAccessTab(currentRole, 'dashboard') && (
            <InternalDashboardTab
              tickets={tickets}
              staffList={staffList}
              loading={loading}
              onRefresh={fetchTickets}
              onOpenDispatch={handleOpenDispatch}
              onOpenStage5Billing={handleOpenStage5Billing}
              setActiveTab={setActiveTab}
              currentRole={currentRole}
              currentUserName={currentUserName}
            />
          )}

          {activeTab === 'queue' && (
            <InternalQueueTab
              tickets={tickets}
              loading={loading}
              onRefresh={fetchTickets}
              onOpenDispatch={handleOpenDispatch}
              onOpenStage5Billing={handleOpenStage5Billing}
              onOpenReceiptPrint={handleOpenReceiptPrint}
              onOpenJobOrderPrint={handleOpenJobOrderPrint}
              currentRole={currentRole}
              currentStaffName={currentUserName}
              onOpenHardcopyModal={() => setIsHardcopyOpen(true)}
              pendingHardcopyCount={pendingHardcopyCount}
              onNavigateTab={setActiveTab}
              staffList={staffList}
            />
          )}

          {activeTab === 'bays' && (
            <InternalBaysTab
              tickets={tickets}
              onOpenDispatch={handleOpenDispatch}
              onRefresh={fetchTickets}
            />
          )}

          {activeTab === 'billing' && (
            <InternalBillingTab
              tickets={tickets}
              onOpenStage5Billing={handleOpenStage5Billing}
              onOpenReceiptPrint={handleOpenReceiptPrint}
              currentRole={currentRole}
            />
          )}

          {activeTab === 'analytics' && canAccessTab(currentRole, 'analytics') && (
            <InternalAnalyticsTab
              tickets={tickets}
              currentRole={currentRole}
            />
          )}

          {activeTab === 'staff' && canAccessTab(currentRole, 'staff') && (
            <InternalStaffTab
              currentRole={currentRole}
              currentStaffName={currentUserName}
            />
          )}

          {activeTab === 'audit' && canAccessTab(currentRole, 'audit') && (
            <InternalAuditTab
              currentRole={currentRole}
            />
          )}

          {activeTab === 'messages' && (
            <InternalMessagesTab
              tickets={tickets}
              currentStaffName={currentUserName}
            />
          )}

          {activeTab === 'fleet' && (
            <InternalFleetTab
              tickets={tickets}
            />
          )}

          {activeTab === 'services' && (
            <InternalServicesTab
              currentRole={currentRole}
            />
          )}
        </main>
      </div>

      {/* Modals */}
      <DispatchTicketModal
        ticket={dispatchTicket}
        isOpen={isDispatchOpen}
        onClose={() => setIsDispatchOpen(false)}
        onSaved={() => { fetchTickets(); }}
        allTickets={tickets}
        staffList={staffList}
        onOpenStage5Billing={handleOpenStage5Billing}
        currentStaffName={currentUserName}
      />

      <Stage5BillingModal
        ticket={billingTicket}
        isOpen={isBillingOpen}
        onClose={() => setIsBillingOpen(false)}
        onPaymentConfirmed={() => { fetchTickets(); }}
        onOpenReceiptPrint={handleOpenReceiptPrint}
        currentStaffName={currentUserName}
      />

      <OfficialReceiptPrintModal
        ticket={receiptTicket}
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
      />

      <JobOrderPrintModal
        ticket={jobOrderTicket}
        isOpen={isJobOrderOpen}
        onClose={() => setIsJobOrderOpen(false)}
      />

      <HardcopyRequestsModal
        isOpen={isHardcopyOpen}
        onClose={() => setIsHardcopyOpen(false)}
        requests={hardcopyRequests}
        onRefresh={loadHardcopies}
        currentStaffName={currentUserName}
      />
    </div>
  );
}
