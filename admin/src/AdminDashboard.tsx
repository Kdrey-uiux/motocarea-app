import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { AdminTab, AdminTicket, UserRole } from './types/admin';
import { getAuditLogs } from './utils/auditLogger';
import { canAccessTab } from './utils/permissions';

// Modular Components
import AdminHeader from './components/AdminHeader';
import AdminSidebar from './components/AdminSidebar';
import JobOrderPrintModal from './components/JobOrderPrintModal';

// Modals
import DispatchTicketModal from './modals/DispatchTicketModal';

// 7 Operation Tabs
import AdminQueueTab from './tabs/AdminQueueTab';
import AdminBaysTab from './tabs/AdminBaysTab';
import AdminAuditTab from './tabs/AdminAuditTab';
import AdminAnalyticsTab from './tabs/AdminAnalyticsTab';
import AdminFleetTab from './tabs/AdminFleetTab';
import AdminMessagesTab from './tabs/AdminMessagesTab';
import AdminServicesTab from './tabs/AdminServicesTab';
import AdminStaffTab from './tabs/AdminStaffTab';
import { getStaffMembers } from './utils/staffManager';
import HardcopyRequestsModal from './modals/HardcopyRequestsModal';
import HardcopyAlertToast from './components/HardcopyAlertToast';
import { 
  HardcopyRequest, 
  fetchHardcopyRequests, 
  updateHardcopyStatus 
} from './utils/hardcopyService';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AdminTab>('queue');
  const [tickets, setTickets] = useState<AdminTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // User Role State: Default to saved override or 'admin'
  const [currentRole, setCurrentRole] = useState<UserRole>(() => {
    const saved = localStorage.getItem('motocare_workshop_auth_override');
    return (saved === 'staff' || saved === 'admin') ? (saved as UserRole) : 'admin';
  });

  // Modals state
  const [dispatchTicket, setDispatchTicket] = useState<AdminTicket | null>(null);
  const [isDispatchOpen, setIsDispatchOpen] = useState(false);

  const [printTicket, setPrintTicket] = useState<AdminTicket | null>(null);
  const [isPrintOpen, setIsPrintOpen] = useState(false);

  // Messages count
  const [messagesCount, setMessagesCount] = useState(0);

  // Hardcopy Requests state
  const [hardcopyRequests, setHardcopyRequests] = useState<HardcopyRequest[]>([]);
  const [isHardcopyModalOpen, setIsHardcopyModalOpen] = useState(false);
  const [toastRequest, setToastRequest] = useState<HardcopyRequest | null>(null);

  const loadHardcopyData = useCallback(async () => {
    const data = await fetchHardcopyRequests();
    setHardcopyRequests(data);
  }, []);

  // Tab Guard: Kapag Staff at sinubukang buksan ang analytics, i-balik sa queue
  useEffect(() => {
    if (!canAccessTab(currentRole, activeTab)) {
      setActiveTab('queue');
    }
  }, [currentRole, activeTab]);

  // Quick toggle between Admin & Staff para sa pag-test
  const handleToggleRole = () => {
    setCurrentRole((prev) => {
      const next = prev === 'admin' ? 'staff' : 'admin';
      localStorage.setItem('motocare_workshop_auth_override', next);
      return next;
    });
  };

  // Fetch all tickets with attached motorcycles and customer profiles
  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Fetch tickets with attached motorcycles
      const { data: ticketData, error: ticketError } = await supabase
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
          motorcycles (
            id,
            model,
            plate_number,
            year_model,
            odometer
          )
        `)
        .order('created_at', { ascending: false });

      if (ticketError) {
        console.error('Error fetching service tickets:', ticketError);
      }

      const rawTickets = ticketData || [];

      // 2. Fetch profiles to resolve customer full_name and phone_number
      const userIds = Array.from(new Set(rawTickets.map((t) => t.user_id).filter(Boolean)));
      const profileMap = new Map<string, { full_name: string; phone_number: string }>();

      if (userIds.length > 0) {
        try {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('id, full_name, phone_number')
            .in('id', userIds);

          profileData?.forEach((p) => {
            profileMap.set(p.id, {
              full_name: p.full_name || 'Rider Customer',
              phone_number: p.phone_number || 'N/A',
            });
          });
        } catch {
          // Ignore profile error
        }
      }

      // 3. Attach profile info to each ticket
      const populatedTickets: AdminTicket[] = rawTickets.map((t: any) => {
        const prof = t.user_id ? profileMap.get(t.user_id) : undefined;
        return {
          ...t,
          customer_name: prof?.full_name || 'Rider Member',
          customer_phone: prof?.phone_number || 'N/A',
          profiles: prof || null,
        };
      });

      setTickets(populatedTickets);
    } catch (err) {
      console.error('Failed to load tickets:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch unread / latest messages count
  const fetchMessagesCount = useCallback(async () => {
    try {
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('sender_role', 'customer');

      setMessagesCount(count || 0);
    } catch {
      // Ignore count error
    }
  }, []);

  useEffect(() => {
    fetchTickets();
    fetchMessagesCount();
    loadHardcopyData();

    // Check user profile for existing role
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle()
          .then(({ data }) => {
            if (data?.role && (data.role === 'staff' || data.role === 'admin')) {
              setCurrentRole(data.role as UserRole);
            }
          });
      }
    });

    // Realtime Postgres subscription on service_tickets
    const ticketChannel = supabase
      .channel('admin_tickets_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'service_tickets' },
        () => {
          fetchTickets();
        }
      )
      .subscribe();

    // Realtime Postgres subscription on messages
    const messageChannel = supabase
      .channel('admin_messages_counter')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          if (payload.new && (payload.new as any).sender_role === 'customer') {
            setMessagesCount((prev) => prev + 1);
            const msgText = (payload.new as any).message || '';
            if (msgText.startsWith('[HARDCOPY_REQUEST]')) {
              loadHardcopyData();
              try {
                const parsed = JSON.parse(msgText.replace('[HARDCOPY_REQUEST]', '').trim());
                if (parsed.id) {
                  setToastRequest(parsed);
                }
              } catch {
                // ignore
              }
            }
          }
        }
      )
      .subscribe();

    // Realtime broadcast channel for instant pop-out alerts
    const hardcopyBroadcastChannel = supabase
      .channel('motocare_hardcopy_realtime')
      .on(
        'broadcast',
        { event: 'NEW_HARDCOPY_REQUEST' },
        (payload) => {
          if (payload.payload) {
            const newReq = payload.payload as HardcopyRequest;
            setHardcopyRequests((prev) => [newReq, ...prev.filter((r) => r.id !== newReq.id)]);
            setToastRequest(newReq);
          }
        }
      )
      .on(
        'broadcast',
        { event: 'HARDCOPY_STATUS_CHANGED' },
        () => {
          loadHardcopyData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ticketChannel);
      supabase.removeChannel(messageChannel);
      supabase.removeChannel(hardcopyBroadcastChannel);
    };
  }, [fetchTickets, fetchMessagesCount, loadHardcopyData]);

  const handleLogout = async () => {
    localStorage.removeItem('motocare_workshop_auth_override');
    await supabase.auth.signOut();
    navigate('/admin/login', { replace: true });
  };

  const handleOpenDispatch = (ticket: AdminTicket) => {
    setDispatchTicket(ticket);
    setIsDispatchOpen(true);
  };

  const handleOpenPrint = (ticket: AdminTicket) => {
    setPrintTicket(ticket);
    setIsPrintOpen(true);
  };

  const handleMarkHardcopyReady = async (req: HardcopyRequest) => {
    await updateHardcopyStatus({
      requestId: req.id,
      userId: req.userId,
      bikeModel: req.bikeModel,
      status: 'READY_FOR_PICKUP',
    });
    setToastRequest(null);
    loadHardcopyData();
  };

  const handleMarkHardcopyClaimed = async (req: HardcopyRequest) => {
    await updateHardcopyStatus({
      requestId: req.id,
      userId: req.userId,
      bikeModel: req.bikeModel,
      status: 'CLAIMED',
    });
    loadHardcopyData();
  };

  const handlePrintHardcopy = (req: HardcopyRequest) => {
    const match = tickets.find(
      (t) =>
        t.user_id === req.userId ||
        (t.motorcycles?.plate_number &&
          req.plateNumber &&
          t.motorcycles.plate_number.toLowerCase().includes(req.plateNumber.toLowerCase()))
    );
    if (match) {
      handleOpenPrint(match);
    } else if (tickets.length > 0) {
      handleOpenPrint(tickets[0]);
    }
  };

  // Badge calculations
  const queueCount = useMemo(
    () => tickets.filter((t) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED').length,
    [tickets]
  );

  const hardcopyPendingCount = useMemo(
    () => hardcopyRequests.filter((r) => r.status === 'PENDING').length,
    [hardcopyRequests]
  );

  const occupiedBaysCount = useMemo(() => {
    const bays = new Set<string>();
    tickets
      .filter((t) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED')
      .forEach((t) => {
        if (t.assigned_bay && t.assigned_bay.toLowerCase().includes('bay')) {
          bays.add(t.assigned_bay.toLowerCase().slice(0, 6));
        }
      });
    return Math.min(bays.size, 4);
  }, [tickets]);

  const auditCount = useMemo(() => getAuditLogs().length, [tickets]);

  const fleetCount = useMemo(() => {
    const plates = new Set(
      tickets.map((t) => t.motorcycles?.plate_number?.toUpperCase()).filter(Boolean)
    );
    return plates.size;
  }, [tickets]);

  const staffCount = useMemo(() => getStaffMembers().length, [activeTab]);

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 flex flex-col font-sans antialiased selection:bg-blue-600 selection:text-white">
      {/* Top Operations Header */}
      <AdminHeader
        tickets={tickets}
        loading={loading}
        onRefresh={fetchTickets}
        onLogout={handleLogout}
        onToggleMobileMenu={() => setIsMobileSidebarOpen(true)}
        currentRole={currentRole}
        onToggleRole={handleToggleRole}
        hardcopyPendingCount={hardcopyPendingCount}
        onOpenHardcopyRequests={() => setIsHardcopyModalOpen(true)}
      />

      {/* Main Body with Sticky Sidebar & Dynamic Tabs */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <AdminSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          queueCount={queueCount}
          occupiedBaysCount={occupiedBaysCount}
          auditCount={auditCount}
          fleetCount={fleetCount}
          messagesCount={messagesCount}
          staffCount={staffCount}
          currentRole={currentRole}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* Dynamic Tab Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 overflow-y-auto">
          {activeTab === 'queue' && (
            <AdminQueueTab
              tickets={tickets}
              loading={loading}
              onRefresh={fetchTickets}
              onOpenDispatch={handleOpenDispatch}
              onOpenPrint={handleOpenPrint}
              currentRole={currentRole}
            />
          )}

          {activeTab === 'bays' && (
            <AdminBaysTab
              tickets={tickets}
              onOpenDispatch={handleOpenDispatch}
            />
          )}

          {activeTab === 'audit' && <AdminAuditTab />}

          {/* Staff Management is strictly guarded for admin / manager / owner only */}
          {activeTab === 'staff' && canAccessTab(currentRole, 'staff') && (
            <AdminStaffTab currentRole={currentRole} />
          )}

          {/* Analytics is strictly guarded for admin only */}
          {activeTab === 'analytics' && canAccessTab(currentRole, 'analytics') && (
            <AdminAnalyticsTab tickets={tickets} />
          )}

          {activeTab === 'fleet' && <AdminFleetTab tickets={tickets} />}

          {activeTab === 'messages' && (
            <AdminMessagesTab tickets={tickets} />
          )}

          {activeTab === 'services' && <AdminServicesTab />}
        </main>
      </div>

      {/* Modals */}
      <DispatchTicketModal
        ticket={dispatchTicket}
        isOpen={isDispatchOpen}
        onClose={() => setIsDispatchOpen(false)}
        onSaved={fetchTickets}
      />

      <JobOrderPrintModal
        ticket={printTicket}
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
      />

      {/* Real-time Pop-out Toast Alert for Admin */}
      <HardcopyAlertToast
        request={toastRequest}
        onDismiss={() => setToastRequest(null)}
        onOpenRequestsModal={() => {
          setToastRequest(null);
          setIsHardcopyModalOpen(true);
        }}
        onMarkReady={handleMarkHardcopyReady}
        onPrint={handlePrintHardcopy}
      />

      {/* Hardcopy Requests Modal */}
      <HardcopyRequestsModal
        isOpen={isHardcopyModalOpen}
        onClose={() => setIsHardcopyModalOpen(false)}
        requests={hardcopyRequests}
        onMarkReady={handleMarkHardcopyReady}
        onMarkClaimed={handleMarkHardcopyClaimed}
        onPrint={handlePrintHardcopy}
      />
    </div>
  );
}