import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { ChatMessage } from '../types/admin';
import { AdminTicket } from '../types/admin';
import { 
  MessageSquare, 
  Send, 
  User, 
  Phone, 
  Loader2, 
  Zap, 
  RefreshCw,
  Stamp,
  CheckCircle2
} from 'lucide-react';

interface AdminMessagesTabProps {
  tickets: AdminTicket[];
}

interface CustomerConversation {
  userId: string;
  customerName: string;
  customerPhone: string;
  bikeModel?: string;
  latestMessage: string;
  latestTime: string;
  messages: ChatMessage[];
}

const PRESET_REPLIES = [
  'Kumusta po! Naipasok na po sa Bay ang inyong motor para sa inspeksyon.',
  'Good news! Kumpleto na po ang service at handa na para sa pickup sa aming reception.',
  'Paalala: May nakita kaming pudpod na brake pads. Gusto niyo po bang palitan (₱450)?',
  'On-going na po ang road test at safety QA inspection ng inyong unit.',
];

function formatMessageTimestamp(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();

  const timeStr = date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isToday) return `Today, ${timeStr}`;
  if (isYesterday) return `Yesterday, ${timeStr}`;
  if (date.getFullYear() === now.getFullYear()) {
    const monthDay = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    return `${monthDay}, ${timeStr}`;
  }
  const fullDate = date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  return `${fullDate}, ${timeStr}`;
}

function getDateDividerLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isToday) return 'Today';
  if (isYesterday) return 'Yesterday';
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function AdminMessagesTab({ tickets }: AdminMessagesTabProps) {
  const [conversations, setConversations] = useState<CustomerConversation[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load all messages from Supabase
  const fetchAllMessages = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;

      const allMessages = (data || []) as ChatMessage[];

      // Group messages by user_id
      const map = new Map<string, ChatMessage[]>();
      allMessages.forEach((msg) => {
        const uid = msg.user_id;
        if (!map.has(uid)) map.set(uid, []);
        map.get(uid)!.push(msg);
      });

      // Build conversation objects
      const convList: CustomerConversation[] = [];
      map.forEach((userMsgs, uid) => {
        const lastMsg = userMsgs[userMsgs.length - 1];
        const matchingTicket = (tickets as AdminTicket[])?.find((t) => t.user_id === uid);
        const name = matchingTicket?.profiles?.full_name || matchingTicket?.customer_name || 'Rider Customer';
        const phone = matchingTicket?.profiles?.phone_number || matchingTicket?.customer_phone || 'N/A';
        const bike = matchingTicket?.motorcycles?.model;

        convList.push({
          userId: uid,
          customerName: name,
          customerPhone: phone,
          bikeModel: bike,
          latestMessage: lastMsg?.message || '',
          latestTime: lastMsg?.created_at || new Date().toISOString(),
          messages: userMsgs,
        });
      });

      // Sort conversations by latest message time descending
      convList.sort(
        (a, b) => new Date(b.latestTime).getTime() - new Date(a.latestTime).getTime()
      );

      setConversations(convList);
      if (convList.length > 0 && !selectedUserId) {
        setSelectedUserId(convList[0].userId);
      }
    } catch (err) {
      console.error('Failed to load messages in Admin:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllMessages();

    // Realtime Postgres subscription for all messages
    const channel = supabase
      .channel('admin_global_messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          setConversations((prev) => {
            const copy = [...prev];
            const foundIndex = copy.findIndex((c) => c.userId === newMsg.user_id);

            if (foundIndex >= 0) {
              const updatedConv = {
                ...copy[foundIndex],
                latestMessage: newMsg.message,
                latestTime: newMsg.created_at,
                messages: [...copy[foundIndex].messages, newMsg],
              };
              copy.splice(foundIndex, 1);
              return [updatedConv, ...copy];
            } else {
              copy.unshift({
                userId: newMsg.user_id,
                customerName: 'New Rider Customer',
                customerPhone: 'N/A',
                latestMessage: newMsg.message,
                latestTime: newMsg.created_at,
                messages: [newMsg],
              });
              return copy;
            }
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tickets]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedUserId, conversations]);

  const activeConversation = conversations.find((c) => c.userId === selectedUserId);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || !selectedUserId || sending) return;

    setSending(true);
    if (!textToSend) setInputText('');

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          user_id: selectedUserId,
          sender_role: 'admin',
          message: text,
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        const sent = data as ChatMessage;
        setConversations((prev) =>
          prev.map((c) => {
            if (c.userId === selectedUserId) {
              return {
                ...c,
                latestMessage: sent.message,
                latestTime: sent.created_at,
                messages: [...c.messages, sent],
              };
            }
            return c;
          })
        );
      }
    } catch (err) {
      console.error('Admin message send error:', err);
      if (!textToSend) setInputText(text);
    } finally {
      setSending(false);
    }
  };

  const renderMessageContent = (text: string) => {
    if (text.startsWith('[HARDCOPY_REQUEST]')) {
      try {
        const data = JSON.parse(text.replace('[HARDCOPY_REQUEST]', '').trim());
        return (
          <div className="space-y-1 text-left">
            <div className="flex items-center gap-1.5 font-bold text-xs text-amber-700">
              <Stamp className="w-3.5 h-3.5 shrink-0" />
              <span>OFFICIAL HARDCOPY REQUEST</span>
            </div>
            <div className="text-[11px] font-semibold text-slate-800">
              Unit: {data.bikeModel} ({data.plateNumber})
            </div>
            <div className="text-[10px] text-slate-600">
              Purpose: {data.purpose} • Ref #{data.id}
            </div>
          </div>
        );
      } catch {
        return text;
      }
    }

    if (text.startsWith('[HARDCOPY_STATUS_UPDATE]')) {
      try {
        const data = JSON.parse(text.replace('[HARDCOPY_STATUS_UPDATE]', '').trim());
        const isReady = data.status === 'READY_FOR_PICKUP';
        return (
          <div className="space-y-1 text-left">
            <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-600">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>{isReady ? 'Hardcopy Ready for Pickup' : 'Hardcopy Status Updated'}</span>
            </div>
            <div className="text-[11px] text-slate-800">
              {data.message || `Official stamped copy for ${data.bikeModel} is ready at Santa Maria Front Desk.`}
            </div>
            <div className="text-[10px] text-slate-500 font-mono">
              Claim Ref: #{data.requestId}
            </div>
          </div>
        );
      } catch {
        return text;
      }
    }

    return text;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">Workshop Helpdesk & Live Chat Console</h2>
          </div>
          <p className="text-xs text-slate-500">
            Real-time two-way communication between Service Advisor and active motorcycle owners.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchAllMessages}
          className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 transition"
          title="Refresh Messages"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
        </button>
      </div>

      {/* Two Pane Chat Box */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs grid grid-cols-1 md:grid-cols-12 min-h-[580px]">
        {/* Left Pane: Conversation List */}
        <div className="md:col-span-4 border-r border-slate-200 flex flex-col bg-slate-50/70">
          <div className="p-3.5 border-b border-slate-200 font-bold text-xs uppercase tracking-wider text-slate-500 flex items-center justify-between">
            <span>Rider Threads ({conversations.length})</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {loading && conversations.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                Loading rider conversations...
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs space-y-1">
                <div className="font-semibold text-slate-700">No active chats found.</div>
                <p className="text-[11px] text-slate-400">
                  Kapag nagpadala ang rider ng message sa Workshop Chat, lilitaw ito rito.
                </p>
              </div>
            ) : (
              conversations.map((conv) => {
                const isSelected = conv.userId === selectedUserId;
                const formattedTime = new Date(conv.latestTime).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <button
                    key={conv.userId}
                    type="button"
                    onClick={() => setSelectedUserId(conv.userId)}
                    className={`w-full text-left p-3.5 transition-all flex items-start gap-3 ${
                      isSelected
                        ? 'bg-white border-l-4 border-blue-600 text-slate-900 shadow-2xs'
                        : 'hover:bg-slate-100/60 text-slate-600'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0 border border-blue-200">
                      <User className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs truncate text-slate-900">
                          {conv.customerName}
                        </span>
                        <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                          {formattedTime}
                        </span>
                      </div>

                      {conv.bikeModel && (
                        <div className="text-[10px] text-blue-600 font-medium truncate mt-0.5">
                          {conv.bikeModel}
                        </div>
                      )}

                      <p className="text-xs text-slate-500 truncate mt-1">
                        {conv.latestMessage || 'No messages'}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Pane: Active Thread */}
        <div className="md:col-span-8 flex flex-col justify-between bg-white">
          {activeConversation ? (
            <>
              {/* Thread Header */}
              <div className="px-5 py-3.5 border-b border-slate-100 bg-white flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    {activeConversation.customerName}
                  </h3>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      {activeConversation.customerPhone}
                    </span>
                    {activeConversation.bikeModel && (
                      <>
                        <span>•</span>
                        <span className="text-blue-700 font-medium">
                          {activeConversation.bikeModel}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Rider Online</span>
                </div>
              </div>

              {/* Chat Messages Feed */}
              <div className="flex-1 overflow-y-auto p-5 space-y-2.5 bg-slate-50/60 max-h-[420px]">
                {activeConversation.messages.map((msg, idx) => {
                  const isAdmin = msg.sender_role === 'admin';
                  const timeFormatted = formatMessageTimestamp(msg.created_at);

                  const prevMsg = idx > 0 ? activeConversation.messages[idx - 1] : null;
                  const isNewDay =
                    !prevMsg ||
                    new Date(msg.created_at).toDateString() !== new Date(prevMsg.created_at).toDateString();
                  const dividerLabel = getDateDividerLabel(msg.created_at);

                  return (
                    <div key={msg.id} className="space-y-1">
                      {isNewDay && (
                        <div className="flex items-center justify-center my-2.5">
                          <span className="text-[10px] font-semibold bg-slate-200/80 text-slate-600 px-3 py-0.5 rounded-full shadow-2xs">
                            {dividerLabel}
                          </span>
                        </div>
                      )}

                      <div className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}>
                        <div className="text-[10px] text-slate-400 mb-0.5 px-1 font-medium">
                          {isAdmin ? 'Workshop Advisor (You)' : activeConversation.customerName} • {timeFormatted}
                        </div>

                        <div
                          className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed ${
                            isAdmin
                              ? 'bg-blue-600 text-white font-medium rounded-br-xs shadow-xs'
                              : 'bg-white text-slate-800 border border-slate-200 rounded-bl-xs shadow-2xs'
                          }`}
                        >
                          {renderMessageContent(msg.message)}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              {/* Quick Preset Response Chips */}
              <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex items-center gap-1.5 overflow-x-auto">
                <span className="text-[10px] text-slate-500 uppercase font-semibold shrink-0 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-blue-600" /> Presets:
                </span>
                {PRESET_REPLIES.map((reply, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSendMessage(reply)}
                    className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-[10px] whitespace-nowrap transition border border-slate-200 shadow-2xs font-medium"
                  >
                    {reply.slice(0, 32)}...
                  </button>
                ))}
              </div>

              {/* Input Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
              >
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Send an official workshop update to rider..."
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 transition"
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={sending || !inputText.trim()}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 shadow-sm"
                >
                  {sending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>Reply</span>
                </button>
              </form>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-500 space-y-2">
              <MessageSquare className="w-8 h-8 text-slate-300" />
              <div className="text-sm font-semibold text-slate-800">Pumili ng Rider Conversation</div>
              <p className="text-xs text-slate-500 max-w-sm">
                I-click ang customer sa kaliwang listahan para buksan ang real-time messaging thread.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
