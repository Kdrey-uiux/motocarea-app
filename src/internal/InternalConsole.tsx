import { useState, useEffect, useCallback, useMemo } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { db } from '../lib/supabase';
import { 
  InternalTab, 
  InternalTicket, 
  UserRole, 
  InternalStaffMember, 
  NotificationAlert 
} from './types/internal';
import { getInternalSession, clearInternalSession } from './utils/internalAuth';

const SIDEBAR_COLLAPSED_KEY = 'motocare_internal_sidebar_collapsed';
import { canAccessTab } from './utils/permissions';
import { normalizeBayNumber } from './utils/bays';
import { internalTabFromSlug, internalTabPath } from './utils/tabTitles';
import { fetchDatabaseStaffMembers } from './utils/databaseStaffManager';
import { runMissedBookingScanInBackground } from '../utils/bookingLifecycle';
import { parseTicketNotes } from '../utils/ticketNotesParser';
import { TICKET_SYNC_CHANNEL, TICKET_SYNC_EVENT, debounce } from '../lib/realtimeSync';
import { AlertCircle } from '../components/icons';
import { useThemePreference, rememberConsoleScope } from '../utils/theme';

// Components
import InternalHeader from './components/InternalHeader';
import { isPendingOnlineBooking } from './utils/ticketActions';
import InternalSidebar from './components/InternalSidebar';
import ConfirmLogoutModal from '../components/auth/ConfirmLogoutModal';
import ToastViewport from './components/ToastViewport';

// Modals
import DispatchTicketModal from './modals/DispatchTicketModal';
import Stage5BillingModal from './modals/Stage5BillingModal';
import OfficialReceiptPrintModal from './modals/OfficialReceiptPrintModal';
import JobOrderPrintModal from './modals/JobOrderPrintModal';
import HardcopyRequestsModal from './modals/HardcopyRequestsModal';
import InternalReviewsTab from './tabs/InternalReviewsTab';
import { HardcopyRequest, fetchHardcopyRequests, HARDCOPY_BROADCAST_CHANNEL } from '../lib/hardcopyService';

// Tabs
import { useActionCenterData } from './hooks/useActionCenterData';
import InternalDashboardTab from './tabs/InternalDashboardTab';
import InternalQueueTab, { type OperationalView } from './tabs/InternalQueueTab';
import InternalBaysTab from './tabs/InternalBaysTab';
import InternalStaffTab from './tabs/InternalStaffTab';
import InternalAuditTab from './tabs/InternalAuditTab';
import InternalMessagesTab from './tabs/InternalMessagesTab';
import InternalFleetTab from './tabs/InternalFleetTab';
import InternalServicesTab from './tabs/InternalServicesTab';

/**
 * Every ticket with its motorcycle and the customer's name/phone.
 * Also kicks off the (throttled) missed-booking scan.
 */
async function queryWorkshopTickets(): Promise<InternalTicket[]> {
  runMissedBookingScanInBackground();

  const { data: ticketData, error } = await db()
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
      dropoff_window,
      created_at,
      updated_at,
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

  if (error) throw error;

  const rawTickets = ticketData || [];

  // Resolve profile names using staff client if available (to bypass RLS restriction on profiles)
  const userIds = Array.from(new Set(rawTickets.map((t) => t.user_id).filter(Boolean)));
  const profileMap = new Map<string, { full_name: string; phone_number: string }>();

  if (userIds.length > 0) {
    try {
      const { data: profs } = await db()
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

  // Supabase returns the joined motorcycle as a single object here (many-to-one)
  const populated: InternalTicket[] = (rawTickets as unknown as InternalTicket[]).map((t) => {
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

  return populated;
}

export default function InternalConsole() {
  // Auth Session
  const session = getInternalSession();
  const currentRole: UserRole = session?.role || 'staff';

  // Light / dark appearance (saved on this device; dark only applies inside the console)
  // Owner and staff each keep their own light/dark choice
  const themeScope = currentRole === 'admin' ? 'admin' : 'staff';
  const [themePreference, setThemePreference, isDarkTheme] = useThemePreference(themeScope);
  useEffect(() => rememberConsoleScope(themeScope), [themeScope]);

  // iOS look (system font, softer cards) for the console and its pop-ups, which render outside it
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('ios-ui');
    return () => root.classList.remove('ios-ui');
  }, []);

  const displayName = (rawName?: string | null) =>
    rawName?.trim() || (currentRole === 'admin' ? 'Shop Owner' : 'Staff Member');

  const [currentUserName, setCurrentUserName] = useState<string>(() => displayName(session?.fullName));

  // Keep the shown name in sync with the live profile (e.g. after the admin renames a staff member)
  const sessionUserId = session?.userId;
  useEffect(() => {
    if (!sessionUserId) return;

    let isMounted = true;
    db()
      .from('profiles')
      .select('full_name')
      .eq('id', sessionUserId)
      .maybeSingle()
      .then(({ data: profile }) => {
        if (profile?.full_name && isMounted) setCurrentUserName(profile.full_name.trim());
      });
    return () => {
      isMounted = false;
    };
  }, [sessionUserId]);

  // Home tab: owner and staff both land on the Dashboard
  const homeTab: InternalTab = 'dashboard';
  // The page comes from the URL (/internal/queue, /internal/team, ...) so refresh and Back work
  const location = useLocation();
  const navigate = useNavigate();
  const urlTab = internalTabFromSlug(location.pathname.replace(/^\/internal\/?/, '').split('/')[0]);
  const requestedTab: InternalTab = urlTab ?? homeTab;
  const setRequestedTab = useCallback((tab: InternalTab) => navigate(internalTabPath(tab)), [navigate]);
  // Tab Guard: staff asking for an admin-only tab see the queue instead
  const activeTab: InternalTab = canAccessTab(currentRole, requestedTab) ? requestedTab : 'queue';

  // Bare /internal, unknown pages and blocked pages get the URL of the page actually shown
  useEffect(() => {
    if (urlTab !== activeTab) navigate(internalTabPath(activeTab), { replace: true });
  }, [urlTab, activeTab, navigate]);
  // One-shot focus targets used when the Dashboard deep-links into another tab
  const [queueFocusView, setQueueFocusView] = useState<OperationalView | undefined>(undefined);
  const [messagesFocusUserId, setMessagesFocusUserId] = useState<string | undefined>(undefined);

  // Regular navigation (sidebar/header) always opens tabs in their default state
  const navigateToTab = useCallback((tab: InternalTab) => {
    setQueueFocusView(undefined);
    setMessagesFocusUserId(undefined);
    setRequestedTab(tab);
  }, [setRequestedTab]);
  const [tickets, setTickets] = useState<InternalTicket[]>([]);
  const [staffList, setStaffList] = useState<InternalStaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [ticketsError, setTicketsError] = useState<string | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  // Sign out from the sidebar or the account menu asks first
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const closeLogoutConfirm = useCallback(() => setIsLogoutConfirmOpen(false), []);
  // Desktop sidebar: full or a slim icon rail (remembered on this device)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1';
    } catch {
      return false;
    }
  });
  const toggleSidebarCollapsed = useCallback(() => {
    setIsSidebarCollapsed((prev) => {
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, prev ? '0' : '1');
      } catch {
        // Private mode: the choice just isn't remembered
      }
      return !prev;
    });
  }, []);

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

  // 1. Session Guard & heartbeat: sign out at once if the owner deactivates this account
  useEffect(() => {
    if (!sessionUserId) {
      window.location.replace('/internal/login');
      return;
    }

    const checkDeactivated = async () => {
      try {
        const { data: prof, error } = await db()
          .from('profiles')
          .select('is_active, role')
          .eq('id', sessionUserId)
          .maybeSingle();

        // A network drop (error) never logs anyone out
        if (!error && prof && (prof.is_active === false || prof.role === 'customer')) {
          clearInternalSession();
          alert('Session Terminated: Your account has been suspended or deactivated by the Shop Owner.');
          window.location.replace('/internal/login');
        }
      } catch {
        // Network drop or temporary timeout - do NOT logout
      }
    };

    checkDeactivated();
    const interval = setInterval(checkDeactivated, 15000);
    return () => clearInterval(interval);
  }, [sessionUserId]);


  // Load staff list
  const loadStaff = useCallback(() => {
    return fetchDatabaseStaffMembers().then(setStaffList);
  }, []);

  // Load tickets; the header Refresh / Retry buttons also show the spinner
  const loadTickets = useCallback(() => {
    return queryWorkshopTickets()
      .then((list) => {
        setTickets(list);
        setTicketsError(null);
      })
      .catch((err: unknown) => {
        console.error('Failed to load tickets:', err);
        const message = err && typeof err === 'object' && 'message' in err ? String(err.message) : '';
        setTicketsError(message || 'Failed to load tickets from workshop database.');
      })
      .finally(() => setLoading(false));
  }, []);
  const refreshTickets = useCallback(() => {
    setLoading(true);
    return loadTickets();
  }, [loadTickets]);

  const loadHardcopies = useCallback(() => {
    return fetchHardcopyRequests()
      .then(setHardcopyRequests)
      .catch(() => {});
  }, []);

  // Staff added/changed on the Team page also refresh the dashboard's staff list
  useEffect(() => {
    window.addEventListener('motocare_staff_updated', loadStaff);
    return () => window.removeEventListener('motocare_staff_updated', loadStaff);
  }, [loadStaff]);

  useEffect(() => {
    loadTickets();
    loadStaff();
    loadHardcopies();

    // Debounced silent ticket refresher for rapid broadcasts / postgres events
    const debouncedTicketRefresh = debounce(() => {
      loadTickets();
    }, 400);

    // Realtime channel subscriptions
    const realtimeClient = db();
    const ticketChannel = realtimeClient
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

    const dispatchBroadcast = realtimeClient
      .channel(TICKET_SYNC_CHANNEL)
      .on('broadcast', { event: TICKET_SYNC_EVENT }, () => {
        debouncedTicketRefresh();
      })
      .subscribe();

    const messageChannel = realtimeClient
      .channel('internal_messages_notif')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
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

    const hardcopyChannel = realtimeClient
      .channel(HARDCOPY_BROADCAST_CHANNEL)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        loadHardcopies();
      })
      .on('broadcast', { event: 'NEW_HARDCOPY_REQUEST' }, (message) => {
        loadHardcopies();
        const req = message.payload as HardcopyRequest | undefined;
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
      loadTickets();
      loadHardcopies();
    }, 30000);

    return () => {
      debouncedTicketRefresh.cancel();
      realtimeClient.removeChannel(ticketChannel);
      realtimeClient.removeChannel(dispatchBroadcast);
      realtimeClient.removeChannel(messageChannel);
      realtimeClient.removeChannel(hardcopyChannel);
      clearInterval(pollInterval);
    };
  }, [loadTickets, loadStaff, loadHardcopies]);

  // Derived counts for sidebar badges
  // Sidebar Queue badge: new online booking requests waiting to be accepted or declined
  const queueCount = useMemo(() => {
    return tickets.filter(
      (t) =>
        isPendingOnlineBooking(t) &&
        !['COMPLETED', 'CANCELLED', 'CANCELLED_BY_ADMIN', 'MISSED', 'NO_SHOW'].includes(t.status)
    ).length;
  }, [tickets]);


  const occupiedBaysCount = useMemo(() => {
    const bays = new Set<number>();
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
        const bayNum = normalizeBayNumber(t.assigned_bay);
        if (bayNum) bays.add(bayNum);
      });
    return bays.size;
  }, [tickets]);

  const pendingHardcopyCount = useMemo(() => {
    return hardcopyRequests.filter((r) => r.status === 'PENDING').length;
  }, [hardcopyRequests]);

  // Pending or ready-for-pickup requests; the header button only shows while some are open
  const openHardcopyCount = useMemo(() => {
    return hardcopyRequests.filter((r) => r.status !== 'CLAIMED').length;
  }, [hardcopyRequests]);

  // Everything customers did that needs a response (live sidebar badges)
  const actionData = useActionCenterData(tickets, hardcopyRequests);

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
    <div className="theme-page isolate min-h-screen bg-page text-slate-800 font-sans antialiased selection:bg-orange-500 selection:text-white relative">
      {/* Soft color fades so the gray background isn't flat (no shapes in the work console).
          Dark mode uses its own violet haze instead (theme.css .theme-page) */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -z-10 -top-40 -right-40 w-[42rem] h-[42rem] rounded-full bg-[radial-gradient(circle,rgba(249,115,22,0.10)_0%,rgba(249,115,22,0)_65%)] print:hidden dark:hidden"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -z-10 -bottom-48 left-24 lg:left-[16rem] w-[40rem] h-[40rem] rounded-full bg-[radial-gradient(circle,rgba(251,191,36,0.10)_0%,rgba(251,191,36,0)_65%)] print:hidden dark:hidden"
      />

      {/* Slim Floating Left Dock (Fixed on Desktop) */}
      <InternalSidebar
        activeTab={activeTab}
        setActiveTab={navigateToTab}
        queueCount={queueCount}
        occupiedBaysCount={occupiedBaysCount}
        messagesCount={actionData.chatsToAnswer.length}
        pendingReviewsCount={actionData.pendingReviews.length}
        currentRole={currentRole}
        onLogout={() => setIsLogoutConfirmOpen(true)}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        isCollapsed={isSidebarCollapsed}
      />

      {/* Main Content Area (offset for the fixed desktop sidebar) */}
      <div className={`${isSidebarCollapsed ? 'lg:pl-[6.25rem]' : 'lg:pl-[17rem]'} flex flex-col min-h-screen transition-[padding] duration-300`}>
        {/* Floating Capsule Top Navbar */}
        <InternalHeader
          loading={loading}
          onRefresh={refreshTickets}
          onLogout={() => setIsLogoutConfirmOpen(true)}
          onToggleMobileMenu={() => setIsMobileSidebarOpen(true)}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebarCollapse={toggleSidebarCollapsed}
          currentRole={currentRole}
          currentUserName={currentUserName}
          activeTab={activeTab}
          setActiveTab={navigateToTab}
          notifications={notifications}
          onMarkNotificationRead={handleMarkNotifRead}
          onClearNotifications={handleClearNotifs}
          pendingHardcopyCount={pendingHardcopyCount}
          onOpenHardcopyModal={openHardcopyCount > 0 ? () => setIsHardcopyOpen(true) : undefined}
          themePreference={themePreference}
          isDarkTheme={isDarkTheme}
          onChangeTheme={setThemePreference}
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
                onClick={() => refreshTickets()}
                className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg cursor-pointer shrink-0 transition"
              >
                Retry
              </button>
            </div>
          )}

          {activeTab === 'reviews' && (
            <InternalReviewsTab
              tickets={tickets}
              currentStaffName={currentUserName}
              onChanged={actionData.reloadReviews}
            />
          )}

          {activeTab === 'dashboard' && canAccessTab(currentRole, 'dashboard') && (
            <InternalDashboardTab
              tickets={tickets}
              loading={loading}
              onRefresh={refreshTickets}
              onOpenDispatch={handleOpenDispatch}
              onOpenStage5Billing={handleOpenStage5Billing}
              setActiveTab={navigateToTab}
              onOpenQueueView={(view) => {
                setQueueFocusView(view);
                setRequestedTab('queue');
              }}
              currentRole={currentRole}
              currentUserName={currentUserName}
            />
          )}

          {activeTab === 'queue' && (
            <InternalQueueTab
              tickets={tickets}
              loading={loading}
              onRefresh={refreshTickets}
              onOpenDispatch={handleOpenDispatch}
              onOpenStage5Billing={handleOpenStage5Billing}
              onOpenReceiptPrint={handleOpenReceiptPrint}
              onOpenJobOrderPrint={handleOpenJobOrderPrint}
              currentRole={currentRole}
              currentStaffName={currentUserName}
              onNavigateTab={navigateToTab}
              staffList={staffList}
              initialView={queueFocusView}
            />
          )}

          {activeTab === 'bays' && (
            <InternalBaysTab
              tickets={tickets}
              onOpenDispatch={handleOpenDispatch}
              onOpenStage5Billing={handleOpenStage5Billing}
              currentStaffName={currentUserName}
              onRefresh={refreshTickets}
              isOwner={currentRole === 'admin'}
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
              initialUserId={messagesFocusUserId}
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
        onSaved={() => { loadTickets(); }}
        allTickets={tickets}
        staffList={staffList}
        onOpenStage5Billing={handleOpenStage5Billing}
        currentStaffName={currentUserName}
      />

      <Stage5BillingModal
        ticket={billingTicket}
        isOpen={isBillingOpen}
        onClose={() => setIsBillingOpen(false)}
        onPaymentConfirmed={() => { loadTickets(); }}
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

      <ConfirmLogoutModal isOpen={isLogoutConfirmOpen} onClose={closeLogoutConfirm} onConfirm={handleLogout} />

      <ToastViewport />
    </div>
  );
}
