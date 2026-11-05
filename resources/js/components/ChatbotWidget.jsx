import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  MessageSquare,
  Bot,
  X,
  Send,
  RotateCcw,
  Sparkles,
  ChevronDown,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';

const QUICK_QUESTIONS = [
  'Bagaimana cara membaca peta DBD?',
  'Kecamatan mana yang memiliki kasus tertinggi?',
  'Apa itu Wilayah Prioritas Pemantauan?',
  'Bagaimana cara mencegah DBD?',
  'Apa saja gejala DBD?',
];

const INITIAL_MESSAGE = {
  id: 'welcome',
  role: 'assistant',
  content:
    'Halo, Kak! Selamat datang di Asisten WebGIS DBD Banyumas. Aku siap membantu menjelaskan informasi persebaran kasus DBD, penggunaan peta, grafik tren, serta edukasi pencegahan DBD. Ada yang ingin Kakak ketahui?',
  timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
};

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastUserMessage, setLastUserMessage] = useState('');
  const [conversationId, setConversationId] = useState(() => 'conv_' + Math.random().toString(36).substring(2, 11));
  const [status, setStatus] = useState({
    is_online: false,
    is_configured: false,
    state: 'UNCONFIGURED',
    status_label: 'Offline (Belum Terhubung)',
    model: 'openai/gpt-oss-120b',
    message: '',
  });
  const [hasUnread, setHasUnread] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Fetch status on mount
  useEffect(() => {
    axios
      .get('/api/public/chatbot/status')
      .then((res) => {
        if (res.data?.success) {
          setStatus({
            is_online: Boolean(res.data.is_online),
            is_configured: Boolean(res.data.is_configured),
            state: res.data.state || (res.data.is_online ? 'ONLINE' : 'UNCONFIGURED'),
            status_label: res.data.status_label || (res.data.is_online ? 'Online' : 'Offline'),
            model: res.data.model || 'openai/gpt-oss-120b',
            message: res.data.message || '',
          });
        }
      })
      .catch(() => {
        setStatus({
          is_online: false,
          is_configured: false,
          state: 'UNAVAILABLE',
          status_label: 'Offline',
          model: 'openai/gpt-oss-120b',
          message: '',
        });
      });
  }, []);

  // Auto-scroll when messages change or panel opens
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setHasUnread(false);
    }
  }, [messages, isOpen]);

  // Focus input when opening panel
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  const handleSendMessage = async (textToSend) => {
    const message = (textToSend || inputValue).trim();
    if (!message || isLoading) return;

    setLastUserMessage(message);
    const userMsgId = 'usr_' + Date.now();
    const newMsg = {
      id: userMsgId,
      role: 'user',
      content: message,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    };

    // Prepare history payload (last 4 items excluding welcome and errors)
    const historyPayload = messages
      .filter((m) => m.id !== 'welcome' && !m.isError)
      .slice(-4)
      .map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [...prev, newMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      const res = await axios.post('/api/public/chatbot/message', {
        message: message,
        conversation_id: conversationId,
        history: historyPayload,
      });

      if (res.data?.success) {
        const aiMsg = {
          id: 'ai_' + Date.now(),
          role: 'assistant',
          content: res.data.answer,
          source: res.data.source,
          model: res.data.model,
          timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, aiMsg]);
        if (!isOpen) setHasUnread(true);
      } else {
        const errorMsg = {
          id: 'err_' + Date.now(),
          role: 'assistant',
          content:
            res.data?.message ||
            'Maaf, Kak, asisten sedang belum dapat dihubungi. Silakan coba kembali beberapa saat lagi.',
          isError: true,
          timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } catch (err) {
      const errorResponse = err.response?.data;
      const errorMsg = {
        id: 'err_' + Date.now(),
        role: 'assistant',
        content:
          errorResponse?.message ||
          'Maaf, Kak, asisten sedang belum dapat dihubungi. Silakan coba kembali beberapa saat lagi.',
        isError: true,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        ...INITIAL_MESSAGE,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setConversationId('conv_' + Math.random().toString(36).substring(2, 11));
    setInputValue('');
    setLastUserMessage('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Formatter for bullets, numbered lists, bold, italics and paragraph spacing
  const renderFormattedContent = (content) => {
    const lines = content.split('\n');
    return lines.map((line, idx) => {
      // Bold formatting: **text**
      const parts = line.split(/(\*\*.*?\*\*)/g);
      const formattedLine = parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={pIdx} className="font-semibold text-slate-900">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return part;
      });

      // Bullet points: '- ' or '* '
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        return (
          <div key={idx} className="flex items-start gap-1.5 my-1 pl-1">
            <span className="text-rose-500 font-bold leading-relaxed">•</span>
            <span className="flex-1">{formattedLine}</span>
          </div>
        );
      }

      // Numbered points: '1. ', '2. ', etc.
      const numMatch = line.trim().match(/^(\d+)\.\s+(.*)$/);
      if (numMatch) {
        return (
          <div key={idx} className="flex items-start gap-1.5 my-1 pl-1">
            <span className="text-rose-600 font-semibold text-xs leading-relaxed min-w-[14px]">
              {numMatch[1]}.
            </span>
            <span className="flex-1">{formattedLine}</span>
          </div>
        );
      }

      // Empty line / paragraph spacing
      if (!line.trim()) {
        return <div key={idx} className="h-1.5" />;
      }

      return (
        <p key={idx} className="my-0.5 leading-relaxed">
          {formattedLine}
        </p>
      );
    });
  };

  return (
    <>
      {/* FLOATING ACTION BUTTON (BOTTOM-RIGHT) */}
      <div className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-50">
        {!isOpen ? (
          <button
            type="button"
            data-testid="chatbot-floating-toggle"
            onClick={() => setIsOpen(true)}
            aria-label="Buka Asisten WebGIS DBD Banyumas"
            className="group relative flex items-center gap-2.5 px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-full bg-[#123027] hover:bg-[#194337] text-white border border-[#1e5243] transition-colors duration-150 cursor-pointer"
          >
            <div className="relative">
              <Bot className="w-5 h-5 stroke-[2.2] text-emerald-400" />
              <span
                className={`absolute -top-1 -right-1 w-2 h-2 rounded-full border border-[#123027] ${status.is_configured && status.is_online ? 'bg-emerald-400' : 'bg-slate-400'
                  }`}
              />
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-bold leading-none">Asisten WebGIS</span>
              <span className="text-[10px] text-emerald-200/80 leading-tight">Epidemiologi & 3M+</span>
            </div>

            {hasUnread && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full ring-2 ring-white" />
            )}
          </button>
        ) : null}
      </div>

      {/* CHATBOT DIALOG PANEL */}
      {isOpen && (
        <div
          data-testid="chatbot-panel"
          role="dialog"
          aria-labelledby="chatbot-header-title"
          className="fixed inset-x-2 bottom-3 top-16 sm:inset-auto sm:bottom-6 sm:right-6 sm:top-auto sm:w-[410px] sm:h-[580px] z-50 flex flex-col bg-white rounded-lg border border-[#c5d1cb] shadow-xl overflow-hidden" /* taste-skill-ignore */
        >
          {/* HEADER */}
          <div className="bg-[#0c201a] text-white px-4 py-3 sm:px-4.5 flex items-center justify-between border-b border-[#193a30] shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-md bg-[#194337] flex items-center justify-center text-emerald-400">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 id="chatbot-header-title" className="font-bold text-xs sm:text-sm text-white tracking-tight">
                    Asisten WebGIS DBD
                  </h3>
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border ${status.state === 'ONLINE'
                        ? 'bg-[#122e25] text-emerald-300 border-[#1b4337]'
                        : status.state === 'UNCONFIGURED'
                          ? 'bg-[#2a2415] text-amber-300 border-[#4a3b1a]'
                          : status.state === 'QUOTA_EXCEEDED'
                            ? 'bg-[#2a2415] text-amber-300 border-[#4a3b1a]'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${status.state === 'ONLINE'
                          ? 'bg-emerald-400'
                          : status.state === 'UNCONFIGURED'
                            ? 'bg-amber-400'
                            : status.state === 'QUOTA_EXCEEDED'
                              ? 'bg-amber-400'
                              : 'bg-slate-400'
                        }`}
                    />
                    {status.status_label || (status.is_online ? 'Online' : 'Offline')}
                  </span>
                </div>
                <p className="text-[11px] text-[#8ea39b]">Surveilans Epidemiologi Banyumas</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                data-testid="chatbot-reset-btn"
                onClick={handleResetChat}
                title="Mulai percakapan baru"
                aria-label="Mulai percakapan baru"
                className="p-1.5 rounded text-[#8ea39b] hover:text-white hover:bg-[#194337] transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                data-testid="chatbot-close-btn"
                onClick={() => setIsOpen(false)}
                title="Tutup asisten"
                aria-label="Tutup asisten"
                className="p-1.5 rounded text-[#8ea39b] hover:text-white hover:bg-[#194337] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* MESSAGES SCROLL AREA */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#fbfbfa] text-xs sm:text-[13px]">
            {!status.is_configured && (
              <div className="p-3 rounded-md bg-[#fffbeb] border border-[#fde68a] text-[#78350f] text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertCircle className="w-4 h-4 text-[#b45309] shrink-0" />
                  <span>API Belum Dikonfigurasi</span>
                </div>
                <p className="text-[11px] leading-relaxed text-[#92400e]">
                  Koneksi AI Groq belum aktif karena <code>GROQ_API_KEY</code> masih kosong di file <code>.env</code>. Tambahkan API Key Anda untuk mengaktifkan asisten cerdas ini.
                </p>
              </div>
            )}
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div key={msg.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-end gap-2 max-w-[88%]">
                    {!isUser && (
                      <div className="w-6 h-6 rounded bg-[#f0f6f4] text-[#123027] flex items-center justify-center shrink-0 mb-1 border border-[#dbe4df]">
                        <Bot className="w-3.5 h-3.5" />
                      </div>
                    )}
                    <div
                      className={`px-3.5 py-2.5 rounded-md ${isUser
                        ? 'bg-[#123027] text-white'
                        : msg.isError
                          ? 'bg-[#fef2f2] text-[#991b1b] border border-[#fecaca]'
                          : 'bg-white text-[#17221e] border border-[#e2e8e5]'
                        }`}
                    >
                      {isUser ? (
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      ) : (
                        <div className="space-y-0.5">
                          {renderFormattedContent(msg.content)}
                          {msg.isError && lastUserMessage && (
                            <button
                              type="button"
                              data-testid="chatbot-retry-btn"
                              onClick={() => handleSendMessage(lastUserMessage)}
                              className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded bg-[#fee2e2] hover:bg-[#fecaca] text-[#991b1b] text-xs font-semibold transition-colors cursor-pointer"
                            >
                              <RefreshCw className="w-3 h-3" />
                              <span>Coba Kirim Ulang</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] text-[#7d8f87] mt-1 px-1">{msg.timestamp}</span>
                </div>
              );
            })}

            {/* TYPING INDICATOR */}
            {isLoading && (
              <div className="flex items-end gap-2 max-w-[85%]">
                <div className="w-6 h-6 rounded bg-[#f0f6f4] text-[#123027] flex items-center justify-center shrink-0 mb-1 border border-[#dbe4df]">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className="bg-white border border-[#e2e8e5] px-3.5 py-2 rounded-md flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#123027]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#123027]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#123027]" />
                </div>
              </div>
            )}

            {/* QUICK QUESTION CHIPS (SHOWN WHEN ONLY INITIAL MESSAGE) */}
            {messages.length === 1 && (
              <div className="pt-2 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#4e6057] px-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#123027]" />
                  <span>Pertanyaan Cepat:</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {QUICK_QUESTIONS.map((q, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendMessage(q)}
                      disabled={isLoading}
                      className="text-left px-3 py-2 rounded-md bg-white hover:bg-[#f0f6f4] border border-[#e2e8e5] hover:border-[#123027] text-[#17221e] text-xs font-medium transition-colors cursor-pointer"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* INPUT FORM */}
          <div className="p-3 bg-white border-t border-[#e2e8e5] shrink-0 space-y-2">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  data-testid="chatbot-input-field"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value.slice(0, 500))}
                  onKeyDown={handleKeyDown}
                  placeholder="Ketik pertanyaan seputar WebGIS & DBD..."
                  disabled={isLoading}
                  maxLength={500}
                  className="w-full pl-3 pr-12 py-2 rounded-md border border-[#c5d1cb] focus:border-[#123027] text-xs sm:text-sm text-[#17221e] placeholder-[#7d8f87] outline-none"
                />
                {inputValue.length > 0 && (
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-[#7d8f87] tabular-nums">
                    {inputValue.length}/500
                  </span>
                )}
              </div>

              <button
                type="submit"
                data-testid="chatbot-send-btn"
                disabled={isLoading || !inputValue.trim()}
                aria-label="Kirim pertanyaan"
                className="p-2 rounded-md bg-[#123027] hover:bg-[#194337] disabled:bg-[#f3f6f4] disabled:text-[#7d8f87] text-white font-semibold transition-colors cursor-pointer shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

            {/* MEDICAL DISCLAIMER NOTICE */}
            <p className="text-[10px] text-[#7d8f87] text-center leading-tight">
              Informasi bersifat edukasi kesehatan & panduan WebGIS. Bukan pengganti konsultasi medis darurat.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
