import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { db } from '../../lib/supabase';
import { readSharedSetting, saveSharedSetting, SHARED_SETTINGS } from '../../lib/sharedSettings';
import { InternalTicket } from '../types/internal';
import {
  MessageSquare,
  Send,
  Loader2,
  RefreshCw,
  CheckCheck,
  Archive,
  Inbox,
  Search,
  ArrowLeft,
  Bell,
  Zap,
  Phone,
} from '../../components/icons';
import { toast } from '../utils/toast';
import { isSystemMessage, summarizeMessage } from '../../utils/systemMessages';

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


interface ChatData {
  messages: ChatMessage[];
  profiles: Map<string, { full_name: string; phone_number: string }>;
  bikes: Map<string, string>;
}

/** All chat messages plus the customer names/phones and first bike for each conversation */
async function queryChatData(): Promise<ChatData> {
  const { data, error } = await db().from('messages').select('*').order('created_at', { ascending: true });
  if (error) throw error;
  const messages: ChatMessage[] = data || [];

  const userIds = Array.from(new Set(messages.map((m) => m.user_id).filter(Boolean)));
  const profiles = new Map<string, { full_name: string; phone_number: string }>();
  const bikes = new Map<string, string>();
  if (userIds.length > 0) {
    const [{ data: profs }, { data: bikeRows }] = await Promise.all([
      db().from('profiles').select('id, full_name, phone_number').in('id', userIds),
      db().from('motorcycles').select('user_id, model').in('user_id', userIds),
    ]);
    profs?.forEach((p) =>
      profiles.set(p.id, { full_name: p.full_name || 'Rider Customer', phone_number: p.phone_number || 'N/A' })
    );
    bikeRows?.forEach((b) => {
      if (b.user_id && !bikes.has(b.user_id)) bikes.set(b.user_id, b.model);
    });
  }
  return { messages, profiles, bikes };
}

/** "10:01 PM" for today, "Oct 18" for older messages */
function shortTime(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toDateString() === new Date().toDateString()
    ? d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Divider label between days in a chat: Today, Yesterday, or the date */
function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function InternalMessagesTab({
  tickets,
  currentStaffName = 'Workshop Reception',
  initialUserId,
}: InternalMessagesTabProps) {
  const [chatData, setChatData] = useState<ChatData | null>(null);
  const [pickedUserId, setSelectedUserId] = useState<string | null>(initialUserId ?? null);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'ACTIVE' | 'ARCHIVED'>('ACTIVE');
  const [listSearch, setListSearch] = useState('');
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

  // Fetch messages (+ names and bikes) from Supabase; conversations are built below
  const fetchMessages = useCallback(() => {
    return queryChatData()
      .then(setChatData)
      .catch((err) => console.error('Failed to load chat:', err))
      .finally(() => setLoading(false));
  }, []);

  const conversations = useMemo<CustomerConversation[]>(() => {
    if (!chatData) return [];
    const userMap = new Map<string, ChatMessage[]>();
    chatData.messages.forEach((msg) => {
      const uid = msg.user_id || 'guest-rider';
      if (!userMap.has(uid)) userMap.set(uid, []);
      userMap.get(uid)!.push(msg);
    });

    const convList: CustomerConversation[] = [];
    userMap.forEach((msgs, uid) => {
      const matchingTicket = tickets.find((t) => t.user_id === uid);
      const profile = chatData.profiles.get(uid);
      const last = msgs[msgs.length - 1];
      convList.push({
        userId: uid,
        customerName: matchingTicket?.customer_name || profile?.full_name || 'Rider Customer',
        customerPhone: matchingTicket?.customer_phone || profile?.phone_number || 'N/A',
        bikeModel: matchingTicket?.motorcycles?.model || chatData.bikes.get(uid) || 'Motorcycle Unit',
        latestMessage: last?.message || '',
        latestTime: last?.created_at || '',
        isResolved: resolvedIds.includes(uid),
        messages: msgs,
      });
    });
    return convList.sort((x, y) => new Date(y.latestTime).getTime() - new Date(x.latestTime).getTime());
  }, [chatData, tickets, resolvedIds]);

  // Until staff pick a chat, the newest conversation is open
  const selectedUserId = pickedUserId ?? conversations[0]?.userId ?? null;

  useEffect(() => {
    fetchMessages();

    // Realtime chat subscription
    const realtimeClient = db();
    const messageChannel = realtimeClient
      .channel('internal_messages_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        fetchMessages();
      })
      .subscribe();

    // 10s resilient polling fallback (Audit Loophole #7)
    const pollInterval = setInterval(fetchMessages, 10000);

    return () => {
      realtimeClient.removeChannel(messageChannel);
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
      let { error } = await db().from('messages').insert({
        user_id: selectedUserId,
        sender_role: 'staff',
        sender_name: currentStaffName,
        message: textToSend.trim(),
      });

      // 2. Fallback without sender_name if column not in schema cache
      if (error && (error.code === 'PGRST204' || error.message?.includes('sender_name'))) {
        const fallback = await db().from('messages').insert({
          user_id: selectedUserId,
          sender_role: 'staff',
          message: textToSend.trim(),
        });
        error = fallback.error;
      }

      if (error) {
        if (error.code === '42501' || error.message?.includes('policy')) {
          throw new Error('Database permission error: Please run migration 04_messages.sql in Supabase SQL Editor to allow staff replies.');
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

  const listedConversations = (activeSubTab === 'ACTIVE' ? activeConversations : archivedConversations).filter((c) => {
    const q = listSearch.trim().toLowerCase();
    if (!q) return true;
    return [c.customerName, c.bikeModel, c.customerPhone].some((f) => (f || '').toLowerCase().includes(q));
  });

  // Messages grouped by calendar day, for the date dividers in the chat
  const messageGroups = useMemo(() => {
    if (!currentConvo) return [];
    const groups: { day: string; messages: ChatMessage[] }[] = [];
    currentConvo.messages.forEach((msg) => {
      const day = new Date(msg.created_at).toDateString();
      const last = groups[groups.length - 1];
      if (last && last.day === day) last.messages.push(msg);
      else groups.push({ day, messages: [msg] });
    });
    return groups;
  }, [currentConvo]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 h-[calc(100dvh-9rem)] min-h-[32rem]">
      {/* Left: conversations (hidden on phones while a chat is open) */}
      <div
        className={`md:col-span-5 lg:col-span-4 bg-white border border-slate-200/70 rounded-2xl sm:rounded-[1.75rem] card-elevated flex-col overflow-hidden min-h-0 ${
          pickedUserId ? 'hidden md:flex' : 'flex'
        }`}
      >
        <div className="px-4 pt-4 pb-3 space-y-3 border-b border-slate-100">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-lg font-bold tracking-tight text-slate-900">Conversations</h2>
            <button
              type="button"
              onClick={fetchMessages}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              title="Refresh"
              aria-label="Refresh conversations"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center p-1 bg-slate-100 rounded-full">
            {(
              [
                { id: 'ACTIVE', label: 'Active', icon: Inbox, count: activeConversations.length },
                { id: 'ARCHIVED', label: 'Resolved', icon: Archive, count: archivedConversations.length },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              const selected = activeSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveSubTab(tab.id)}
                  aria-pressed={selected}
                  className={`flex-1 py-1.5 rounded-full text-sm flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    selected ? 'bg-white text-slate-900 font-semibold shadow-xs' : 'text-slate-500 hover:text-slate-900 font-medium'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${selected ? 'text-orange-500' : 'text-slate-400'}`} />
                  {tab.label}
                  <span className="text-xs text-slate-400 tabular-nums">{tab.count}</span>
                </button>
              );
            })}
          </div>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={listSearch}
              onChange={(e) => setListSearch(e.target.value)}
              placeholder="Search name, motorcycle, phone"
              className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-full pl-9 pr-3 py-2 text-sm text-slate-900 placeholder:not-italic placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-orange-500" />
              Loading conversations…
            </div>
          ) : listedConversations.length === 0 ? (
            <div className="p-8 text-center">
              <MessageSquare className="w-6 h-6 text-slate-300 mx-auto" />
              <p className="mt-2 text-sm text-slate-500">
                {listSearch.trim()
                  ? 'No conversation matches your search.'
                  : activeSubTab === 'ACTIVE'
                  ? 'No open conversations.'
                  : 'No resolved conversations yet.'}
              </p>
            </div>
          ) : (
            listedConversations.map((c) => {
              const isSelected = selectedUserId === c.userId;
              const lastIsSystem = isSystemMessage(c.latestMessage);
              const lastFromCustomer = c.messages[c.messages.length - 1]?.sender_role === 'customer';
              return (
                <button
                  key={c.userId}
                  type="button"
                  onClick={() => setSelectedUserId(c.userId)}
                  className={`w-full text-left px-3 py-3 rounded-2xl flex items-start gap-3 transition cursor-pointer ${
                    isSelected ? 'bg-orange-50' : 'hover:bg-slate-50'
                  }`}
                >
                  <span
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                      isSelected ? 'bg-gradient-to-tr from-orange-500 to-amber-400 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {c.customerName.charAt(0).toUpperCase()}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm text-slate-900 truncate">{c.customerName}</span>
                      <span className="text-[11px] text-slate-400 shrink-0">{shortTime(c.latestTime)}</span>
                    </span>
                    <span className="block text-xs text-slate-400 truncate">{c.bikeModel}</span>
                    <span className="mt-0.5 flex items-center gap-1.5 min-w-0">
                      {lastFromCustomer && !c.isResolved && (
                        <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" title="Waiting for your reply" />
                      )}
                      {lastIsSystem && <Bell className="w-3 h-3 text-slate-400 shrink-0" />}
                      <span
                        className={`text-sm truncate ${
                          lastFromCustomer && !c.isResolved ? 'text-slate-900 font-medium' : 'text-slate-500'
                        }`}
                      >
                        {summarizeMessage(c.latestMessage) || 'No message yet'}
                      </span>
                    </span>
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right: the open conversation (on phones only when one is picked) */}
      <div
        className={`md:col-span-7 lg:col-span-8 bg-white border border-slate-200/70 rounded-2xl sm:rounded-[1.75rem] card-elevated flex-col overflow-hidden min-h-0 ${
          pickedUserId ? 'flex' : 'hidden md:flex'
        }`}
      >
        {currentConvo ? (
          <>
            {/* Chat header */}
            <div className="px-4 sm:px-5 py-3.5 border-b border-slate-100 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setSelectedUserId(null)}
                  className="md:hidden w-9 h-9 -ml-1 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 cursor-pointer shrink-0"
                  aria-label="Back to conversations"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <span className="w-10 h-10 rounded-full bg-gradient-to-tr from-orange-500 to-amber-400 text-white flex items-center justify-center font-bold shrink-0">
                  {currentConvo.customerName.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <h3 className="font-display text-base font-bold tracking-tight text-slate-900 truncate">
                    {currentConvo.customerName}
                  </h3>
                  <p className="text-xs text-slate-500 truncate flex items-center gap-1.5">
                    <span className="truncate">{currentConvo.bikeModel}</span>
                    {currentConvo.customerPhone && currentConvo.customerPhone !== 'N/A' && (
                      <>
                        <span className="text-slate-300">·</span>
                        <a
                          href={`tel:${currentConvo.customerPhone}`}
                          className="inline-flex items-center gap-1 hover:text-orange-600 shrink-0"
                          title="Call the customer"
                        >
                          <Phone className="w-3 h-3" />
                          {currentConvo.customerPhone}
                        </a>
                      </>
                    )}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => toggleResolved(currentConvo.userId)}
                className={`shrink-0 px-3.5 py-2 rounded-full text-sm font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  resolvedIds.includes(currentConvo.userId)
                    ? 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    : 'border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                }`}
              >
                <CheckCheck className="w-4 h-4" />
                <span className="hidden sm:inline">{resolvedIds.includes(currentConvo.userId) ? 'Reopen' : 'Mark resolved'}</span>
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4 bg-slate-50/50">
              {messageGroups.map((group) => (
                <div key={group.day} className="space-y-3">
                  <div className="flex items-center gap-3 py-1">
                    <span className="h-px flex-1 bg-slate-200/80" />
                    <span className="text-[11px] font-medium text-slate-400">{dayLabel(group.messages[0].created_at)}</span>
                    <span className="h-px flex-1 bg-slate-200/80" />
                  </div>

                  {group.messages.map((msg) => {
                    const time = new Date(msg.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

                    // Automatic notices (reminders, hardcopy updates, reschedules): a quiet line, not a chat bubble
                    if (isSystemMessage(msg.message)) {
                      return (
                        <div key={msg.id} className="flex justify-center">
                          <span className="inline-flex items-start gap-2 max-w-[90%] px-3.5 py-2 rounded-2xl bg-white border border-slate-200/80 text-xs text-slate-500">
                            <Bell className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-px" />
                            <span>
                              {summarizeMessage(msg.message)}
                              <span className="text-slate-300"> · {time}</span>
                            </span>
                          </span>
                        </div>
                      );
                    }

                    const isStaff = msg.sender_role === 'staff' || msg.sender_role === 'admin';
                    return (
                      <div key={msg.id} className={`flex flex-col ${isStaff ? 'items-end' : 'items-start'}`}>
                        <div
                          className={`max-w-[80%] px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                            isStaff
                              ? 'bg-orange-500 text-white rounded-2xl rounded-br-md shadow-sm shadow-orange-500/20'
                              : 'bg-white text-slate-900 border border-slate-200/80 rounded-2xl rounded-bl-md'
                          }`}
                        >
                          {msg.message}
                        </div>
                        <span className="text-[11px] text-slate-400 mt-1 px-1">
                          {isStaff ? msg.sender_name || 'Workshop staff' : currentConvo.customerName} · {time}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Quick replies + composer */}
            <div className="border-t border-slate-100 bg-white px-3 sm:px-4 pt-3 pb-3 space-y-2.5">
              <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <span className="flex items-center gap-1 text-xs text-slate-400 shrink-0 pr-1">
                  <Zap className="w-3.5 h-3.5 text-orange-400" />
                  Quick replies
                </span>
                {PRESET_REPLIES.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    disabled={sending}
                    onClick={() => setInputText(preset)}
                    className="px-3 py-1.5 rounded-full border border-slate-200 bg-white hover:bg-orange-50 hover:border-orange-200 hover:text-orange-700 text-xs text-slate-600 whitespace-nowrap transition cursor-pointer shrink-0 disabled:opacity-50"
                    title="Put this in the message box"
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder={`Message ${currentConvo.customerName.split(' ')[0]}…`}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  className="flex-1 bg-slate-50 focus:bg-white border border-slate-200 rounded-full px-4 py-2.5 text-sm text-slate-900 placeholder:not-italic placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition"
                />
                <button
                  type="button"
                  disabled={sending || !inputText.trim()}
                  onClick={() => handleSendMessage()}
                  className="w-11 h-11 rounded-full bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white flex items-center justify-center transition cursor-pointer shadow-md shadow-orange-500/25 active:scale-95 shrink-0"
                  aria-label="Send message"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <span className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center">
              <MessageSquare className="w-6 h-6" />
            </span>
            <p className="mt-3 font-display font-bold text-slate-900">No conversation open</p>
            <p className="text-sm text-slate-500">Pick a customer on the left to read and reply.</p>
          </div>
        )}
      </div>
    </div>
  );
}
