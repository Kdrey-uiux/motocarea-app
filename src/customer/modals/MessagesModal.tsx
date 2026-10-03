import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { ChatMessage, UserProfile } from '../../types/dashboard';
import { Send, MessageSquare, Loader2, X, Wrench, ShieldCheck, Stamp, CheckCircle2 } from 'lucide-react';

interface MessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
  userProfile: UserProfile | null;
}

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

  if (isToday) {
    return `Today, ${timeStr}`;
  }
  if (isYesterday) {
    return `Yesterday, ${timeStr}`;
  }
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

export default function MessagesModal({
  isOpen,
  onClose,
  userId,
  userProfile,
}: MessagesModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  useEffect(() => {
    if (!userId || !isOpen) return;

    const fetchMessages = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (!error && data) {
        setMessages(data as ChatMessage[]);
      }
      setLoading(false);
    };

    fetchMessages();

    const channel = supabase
      .channel(`chat_${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, isOpen]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanText = inputText.trim();
    if (!cleanText || !userId || sending) return;

    setSending(true);
    setInputText('');

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          user_id: userId,
          sender_role: 'customer',
          message: cleanText,
        })
        .select()
        .single();

      if (error) throw error;
      if (data) {
        const sentMsg = data as ChatMessage;
        setMessages((prev) =>
          prev.some((m) => m.id === sentMsg.id) ? prev : [...prev, sentMsg]
        );
      }
    } catch (err: unknown) {
      console.error('Failed to send message:', err);
      setInputText(cleanText);
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
            <div className="flex items-center gap-1.5 font-bold text-xs">
              <Stamp className="w-3.5 h-3.5 shrink-0" />
              <span>Official Hardcopy Requested</span>
            </div>
            <div className="text-[11px] opacity-95">
              Unit: <span className="font-semibold">{data.bikeModel}</span> ({data.plateNumber})
            </div>
            <div className="text-[10px] opacity-80 pt-0.5">
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
            <div className="flex items-center gap-1.5 font-bold text-xs">
              <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${isReady ? 'text-emerald-300' : ''}`} />
              <span>{isReady ? 'Hardcopy Ready for Pickup!' : 'Hardcopy Status Update'}</span>
            </div>
            <div className="text-[11px] opacity-95">
              {data.message || `Official stamped copy for ${data.bikeModel} is ready at Santa Maria Front Desk.`}
            </div>
            <div className="text-[10px] opacity-80 font-mono">
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-end sm:justify-end sm:p-6 transition-all duration-200">
      <div className="bg-white w-full sm:w-[420px] h-[580px] max-h-[90vh] rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
        
        {/* Header Bar (Light Green Theme, Clean & Harmonious) */}
        <div className="px-5 py-3.5 border-b border-emerald-100 bg-emerald-50/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-emerald-100 text-emerald-700 border border-emerald-200/80 flex items-center justify-center shadow-2xs">
              <Wrench className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 leading-tight tracking-tight">
                  MotoCare Workshop Helpdesk
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <span className="text-[11px] text-slate-500 font-medium block">
                Santa Maria Hub • Service Advisor On Duty
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-emerald-100/70 transition cursor-pointer"
            title="Close Helpdesk Chat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message Feed Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#f8fafc]">
          {loading ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-xs gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
              <span>Connecting to workshop advisor...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-100 shadow-xs">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="text-sm font-bold text-slate-800">
                  Welcome, {userProfile?.full_name?.split(' ')[0] || 'Rider'}!
                </div>
                <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                  Have a question about your motorcycle service, bay queue, or parts quotation? Send a message directly to our workshop desk.
                </p>
              </div>
              <div className="pt-2 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Typical response time: under 5 minutes</span>
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isMe = msg.sender_role === 'customer';
              const timeFormatted = formatMessageTimestamp(msg.created_at);

              const prevMsg = idx > 0 ? messages[idx - 1] : null;
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

                  <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className="text-[10px] text-slate-400 mb-0.5 px-1.5 font-medium">
                      {isMe ? 'You' : 'Advisor'} • {timeFormatted}
                    </div>
                    <div
                      className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed ${
                        isMe
                          ? 'bg-orange-500 text-white rounded-br-xs shadow-xs font-medium'
                          : 'bg-white border border-slate-200/80 text-slate-800 rounded-bl-xs shadow-2xs font-normal'
                      }`}
                    >
                      {renderMessageContent(msg.message)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Footer Bar */}
        <form
          onSubmit={handleSendMessage}
          className="p-3.5 bg-white border-t border-slate-100 flex items-center gap-2 shrink-0"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type your message to workshop..."
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/10 transition"
            disabled={sending || loading}
          />
          <button
            type="submit"
            disabled={sending || !inputText.trim()}
            className="bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shrink-0 shadow-sm shadow-orange-500/20 cursor-pointer active:scale-95"
            title="Send Message"
          >
            {sending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
      </div>
    </div>
  );
}
