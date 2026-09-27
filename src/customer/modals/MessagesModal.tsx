import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { ChatMessage, UserProfile } from '../../types/dashboard';
import { Send, MessageSquare, Loader2, X, Wrench } from 'lucide-react';

interface MessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
  userProfile: UserProfile | null;
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-end sm:justify-end sm:p-6 transition-all duration-200">
      <div className="bg-white w-full sm:w-[420px] h-[580px] max-h-[90vh] rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
        
        {/* Header Bar */}
        <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white">
              <Wrench className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold leading-tight">
                  MotoCare Workshop Helpdesk
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <span className="text-[10px] text-slate-400 font-medium block">
                Santa Maria Hub • Service Advisor
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Close Chat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message Feed Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/70">
          {loading ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-xs gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <span>Connecting to workshop...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-4 space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div className="text-xs font-bold text-slate-800">
                Kumusta, {userProfile?.full_name?.split(' ')[0] || 'Rider'}!
              </div>
              <p className="text-[11px] text-slate-500 max-w-xs leading-relaxed">
                May katanungan ka ba tungkol sa iyong motorcycle service o parts availability? Magpadala ng mensahe rito.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.sender_role === 'customer';
              const time = new Date(msg.created_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <div className="text-[10px] text-slate-400 mb-0.5 px-1">
                    {isMe ? 'You' : 'Advisor'} • {time}
                  </div>
                  <div
                    className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                      isMe
                        ? 'bg-blue-600 text-white rounded-br-xs shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-800 rounded-bl-xs shadow-2xs'
                    }`}
                  >
                    {msg.message}
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
          className="p-3 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type your message to the workshop..."
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white transition"
            disabled={sending || loading}
          />
          <button
            type="submit"
            disabled={sending || !inputText.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shrink-0 shadow-xs"
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
