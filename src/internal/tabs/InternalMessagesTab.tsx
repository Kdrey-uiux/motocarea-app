import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { readSharedSetting, saveSharedSetting, SHARED_SETTINGS } from '../../lib/sharedSettings';
import { InternalTicket } from '../types/internal';
import { 
  MessageSquare, 
  Send, 
  Loader2, 
  RefreshCw, 
  CheckCheck, 
  Archive, 
  Inbox 
} from 'lucide-react';
import { toast } from '../utils/toast';

interface InternalMessagesTabProps {
  tickets: InternalTicket[];
  currentStaffName?: string;
  /** Customer conversation to open first (e.g. "Reply" from the Action Center) */
  initialUserId?: string;
}

interface ChatMessage {
  id: string;
  ticket_code?: string;
  user_id?: string;
  sender_role: 'customer' | 'staff' | 'admin';
  sender_name?: string;
  message: string;
  created_at: string;
}

interface CustomerConversation {
  userId: string;
  customerName: string;
  customerPhone: string;
  bikeModel?: string;
  latestMessage: string;
  latestTime: string;
  isResolved?: boolean;
  messages: ChatMessage[];
}

const PRESET_REPLIES = [
  'Your motorcycle is on Bay inspection.',
  'Additional parts replacement required. Awaiting your approval.',
  'Service complete! Your motorcycle is ready for pickup.',
  'Our lead technician is currently conducting a road safety test.',
  'Thank you for confirming. Proceeding with parts installation now.',
];


export default function InternalMessagesTab({
  tickets,
  currentStaffName = 'Workshop Reception',
  initialUserId,
}: InternalMessagesTabProps) {
  const [conversations, setConversations] = useState<CustomerConversation[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(initialUserId ?? null);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'ACTIVE' | 'ARCHIVED'>('ACTIVE');
  // Resolved chats are shared across all staff devices via Supabase app_settings
  const [resolvedIds, setResolvedIds] = useState<string[]>(() =>
    readSharedSetting<string[]>(SHARED_SETTINGS.resolvedConversations, [])
  );

  useEffect(() => {
    const handleResolvedChange = () => {
      setResolvedIds(readSharedSetting<string[]>(SHARED_SETTINGS.resolvedConversations, []));
    };
    window.addEventListener(SHARED_SETTINGS.resolvedConversations.event, handleResolvedChange);
    return () => window.removeEventListener(SHARED_SETTINGS.resolvedConversations.event, handleResolvedChange);
  }, []);

  const chatEndRef = useRef<HTMLDivElement>(null);

  const toggleResolved = (userId: string) => {
    const updated = resolvedIds.includes(userId)
      ? resolvedIds.filter((id) => id !== userId)
      : [...resolvedIds, userId];
    setResolvedIds(updated);
    saveSharedSetting(SHARED_SETTINGS.resolvedConversations, updated, currentStaffName).then((res) => {
      if (!res.success) {
        toast.error('Error: ' + (res.error || 'Failed to save conversation status.'));
      }
    });
  };

  // Fetch messages from Supabase
  const fetchMessages = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        return;
      }

      const allMsgs: ChatMessage[] = data || [];
      const userMap = new Map<string, ChatMessage[]>();

      allMsgs.forEach((msg) => {
        const uid = msg.user_id || 'guest-rider';
        if (!userMap.has(uid)) {
          userMap.set(uid, []);
        }
        userMap.get(uid)!.push(msg);
      });

      // Fetch profiles & bikes for chat users to resolve real identity
      const uniqueUserIds = Array.from(userMap.keys()).filter((id) => id && !id.startsWith('guest-'));
      const profileMap = new Map<string, { full_name: string; phone_number: string }>();
      const bikeMap = new Map<string, string>();

      if (uniqueUserIds.length > 0) {
        try {
          const { data: profs } = await supabase
            .from('profiles')
            .select('id, full_name, phone_number')
            .in('id', uniqueUserIds);

          profs?.forEach((p) => {
            if (p.id) {
              profileMap.set(p.id, {
                full_name: p.full_name || 'Rider Customer',
                phone_number: p.phone_number || 'N/A',
              });
            }
          });

          const { data: bikes } = await supabase
            .from('motorcycles')
            .select('user_id, model')
            .in('user_id', uniqueUserIds);

          bikes?.forEach((b) => {
            if (b.user_id && !bikeMap.has(b.user_id)) {
              bikeMap.set(b.user_id, b.model);
            }
          });
        } catch {
          // ignore
        }
      }

      const convList: CustomerConversation[] = [];
      userMap.forEach((msgs, uid) => {
        const matchingTicket = tickets.find((t) => t.user_id === uid);
        const profile = profileMap.get(uid);
        const bikeFromDb = bikeMap.get(uid);

        const name = matchingTicket?.customer_name || profile?.full_name || 'Rider Customer';
        const phone = matchingTicket?.customer_phone || profile?.phone_number || 'N/A';
        const bike = matchingTicket?.motorcycles?.model || bikeFromDb || 'Motorcycle Unit';
        const last = msgs[msgs.length - 1];

        convList.push({
          userId: uid,
          customerName: name,
          customerPhone: phone,
          bikeModel: bike,
          latestMessage: last?.message || '',
          latestTime: last?.created_at || new Date().toISOString(),
          isResolved: resolvedIds.includes(uid),
          messages: msgs,
        });
      });

      convList.sort((a, b) => new Date(b.latestTime).getTime() - new Date(a.latestTime).getTime());
      setConversations(convList);

      if (!selectedUserId && convList.length > 0) {
        setSelectedUserId(convList[0].userId);
      }
    } catch (err) {
      console.error('Failed to load chat:', err);
    } finally {
      setLoading(false);
    }
  }, [tickets, selectedUserId, resolvedIds]);

  useEffect(() => {
    fetchMessages();

    // Realtime chat subscription
    const messageChannel = supabase
      .channel('internal_messages_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        fetchMessages();
      })
      .subscribe();

    // 10s resilient polling fallback (Audit Loophole #7)
    const pollInterval = setInterval(fetchMessages, 10000);

    return () => {
      supabase.removeChannel(messageChannel);
      clearInterval(pollInterval);
    };
  }, [fetchMessages]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedUserId, conversations]);

  const activeConversations = useMemo(() => {
    return conversations.filter((c) => !resolvedIds.includes(c.userId));
  }, [conversations, resolvedIds]);

  const archivedConversations = useMemo(() => {
    return conversations.filter((c) => resolvedIds.includes(c.userId));
  }, [conversations, resolvedIds]);

  const currentConvo = useMemo(() => {
    return conversations.find((c) => c.userId === selectedUserId);
  }, [conversations, selectedUserId]);

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputText;
    if (!textToSend.trim() || !selectedUserId) return;

    setSending(true);
    try {
      // 1. Attempt insert with sender_name
      let { error } = await supabase.from('messages').insert({
        user_id: selectedUserId,
        sender_role: 'staff',
        sender_name: currentStaffName,
        message: textToSend.trim(),
      });

      // 2. Fallback without sender_name if column not in schema cache
      if (error && (error.code === 'PGRST204' || error.message?.includes('sender_name'))) {
        const fallback = await supabase.from('messages').insert({
          user_id: selectedUserId,
          sender_role: 'staff',
          message: textToSend.trim(),
        });
        error = fallback.error;
      }

      if (error) {
        if (error.code === '42501' || error.message?.includes('policy')) {
          throw new Error('Database permission error: Please run migration 20261016_fix_messages_rls_and_columns.sql in Supabase SQL Editor to allow staff replies.');
        }
        throw error;
      }

      setInputText('');
      await fetchMessages();
    } catch (err: unknown) {
      console.error('Failed to send message:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to send message. Please verify network connection.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare className="w-5 h-5 text-orange-600" />
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Reception Desk & Live Rider Support Chat
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            Real-time messaging with bike owners, approval requests, and pickup notifications.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchMessages}
          className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          <span>Sync Chat</span>
        </button>
      </div>

      {/* Main Split Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 h-[650px]">
        {/* Left: Conversations List */}
        <div className="md:col-span-5 bg-white border border-slate-200/90 rounded-2xl shadow-xs flex flex-col overflow-hidden">
          {/* Sub-tabs: Active vs Archived */}
          <div className="p-3 border-b border-slate-100 flex items-center gap-1 bg-slate-50/50">
            <button
              type="button"
              onClick={() => setActiveSubTab('ACTIVE')}
              className={`flex-1 py-1.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                activeSubTab === 'ACTIVE'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Inbox className="w-3.5 h-3.5" />
              <span>Active Inquiries ({activeConversations.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('ARCHIVED')}
              className={`flex-1 py-1.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                activeSubTab === 'ARCHIVED'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Resolved ({archivedConversations.length})</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {loading ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-orange-500" />
                <span>Loading messages...</span>
              </div>
            ) : (activeSubTab === 'ACTIVE' ? activeConversations : archivedConversations).length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs italic">
                {activeSubTab === 'ACTIVE'
                  ? 'No active customer inquiries at the moment.'
                  : 'No archived conversations yet.'}
              </div>
            ) : (
              (activeSubTab === 'ACTIVE' ? activeConversations : archivedConversations).map((c) => {
                const isSelected = selectedUserId === c.userId;

                return (
                  <div
                    key={c.userId}
                    onClick={() => setSelectedUserId(c.userId)}
                    className={`p-3.5 cursor-pointer transition flex items-start gap-3 ${
                      isSelected
                        ? 'bg-orange-50/60 border-l-4 border-l-orange-500'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                      {c.customerName.charAt(0)}
                    </div>

                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-xs text-slate-900 truncate">
                          {c.customerName}
                        </h4>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {new Date(c.latestTime).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">
                        {c.bikeModel} • {c.customerPhone}
                      </p>
                      <p className="text-xs text-slate-600 truncate font-medium pt-0.5">
                        {c.latestMessage || 'No message content'}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Active Chat Window */}
        <div className="md:col-span-7 bg-white border border-slate-200/90 rounded-2xl shadow-xs flex flex-col overflow-hidden">
          {currentConvo ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-sm">
                    {currentConvo.customerName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">
                      {currentConvo.customerName}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {currentConvo.bikeModel} • Phone: {currentConvo.customerPhone}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => toggleResolved(currentConvo.userId)}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1.5 ${
                    resolvedIds.includes(currentConvo.userId)
                      ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>
                    {resolvedIds.includes(currentConvo.userId) ? 'Move to Active' : 'Mark as Resolved'}
                  </span>
                </button>
              </div>

              {/* Messages Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30">
                {currentConvo.messages.map((msg) => {
                  const isStaff = msg.sender_role === 'staff' || msg.sender_role === 'admin';

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isStaff ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                          isStaff
                            ? 'bg-orange-500 text-white rounded-br-xs shadow-xs'
                            : 'bg-white text-slate-900 border border-slate-200 rounded-bl-xs shadow-2xs'
                        }`}
                      >
                        <p>{msg.message}</p>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 px-1">
                        {isStaff ? 'Workshop Staff' : currentConvo.customerName} •{' '}
                        {new Date(msg.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              {/* Quick Preset Replies */}
              <div className="p-2.5 bg-slate-50 border-t border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 px-1">
                  Canned Quick Replies
                </span>
                <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  {PRESET_REPLIES.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendMessage(preset)}
                      className="px-3 py-1 bg-white hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300 border border-slate-200 rounded-lg text-[11px] font-medium whitespace-nowrap transition cursor-pointer shrink-0 shadow-2xs"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat Input */}
              <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Type message to rider customer..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:border-orange-500 transition font-medium"
                />
                <button
                  type="button"
                  disabled={sending || !inputText.trim()}
                  onClick={() => handleSendMessage()}
                  className="p-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl transition cursor-pointer shadow-xs active:scale-95"
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-2">
              <MessageSquare className="w-8 h-8 text-slate-300" />
              <p className="text-xs">Select a customer conversation from the list to begin chatting.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
