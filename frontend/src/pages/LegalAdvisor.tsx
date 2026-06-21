import { useState, useRef, useEffect } from 'react';
import { Scale, Send, Copy, Download, RotateCcw, Bot, User, ChevronDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '../contexts/AuthContext';

// ── types ──────────────────────────────────────────────────────────────────────
interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    isStreaming?: boolean;
}

// Gemini history format for multi-turn
interface GeminiTurn {
    role: 'user' | 'model';
    parts: { text: string }[];
}

const REGIONS = [
    'Addis Ababa', 'Tigray', 'Oromia', 'Amhara', 'SNNPR',
    'Afar', 'Somali', 'Benishangul-Gumuz', 'Gambella', 'Harari', 'Dire Dawa',
];

const SUGGESTED = [
    'My husband is preventing me from working. What are my rights?',
    'I was dismissed from work after getting pregnant. What can I do?',
    'My in-laws took my land after my husband died. Is this legal?',
    'I want to file for divorce but have no money for a lawyer.',
];

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// ── shared SSE streaming helper ────────────────────────────────────────────────
async function streamSSE(
    url: string,
    body: object,
    token: string | null,
    onChunk: (text: string) => void,
    signal: AbortSignal,
): Promise<void> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal,
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).detail ?? `Server error ${res.status}`);
    }

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
            if (!line.startsWith('data:')) continue;
            const jsonStr = line.replace(/^data:\s*/, '').trim();
            if (!jsonStr) continue;
            const parsed = JSON.parse(jsonStr);
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.done) return;
            if (parsed.chunk) onChunk(parsed.chunk);
        }
    }
}

// ── component ──────────────────────────────────────────────────────────────────
const LegalAdvisor = () => {
    const { token } = useAuth();

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [geminiHistory, setGeminiHistory] = useState<GeminiTurn[]>([]);
    const [input, setInput] = useState('');
    const [region, setRegion] = useState('');
    const [streaming, setStreaming] = useState(false);
    const [error, setError] = useState('');
    const [showRegion, setShowRegion] = useState(false);

    const chatEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const abortRef = useRef<AbortController | null>(null);

    const isFirstMessage = messages.length === 0;

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // auto-resize textarea
    useEffect(() => {
        const el = textareaRef.current;
        if (el) { el.style.height = 'auto'; el.style.height = `${Math.min(el.scrollHeight, 160)}px`; }
    }, [input]);

    // ── send message ──────────────────────────────────────────────────────────────
    const sendMessage = async (text: string) => {
        if (!text.trim() || streaming) return;

        setError('');
        const userMsg: ChatMessage = { role: 'user', content: text };
        const assistantMsg: ChatMessage = { role: 'assistant', content: '', isStreaming: true };
        setMessages(prev => [...prev, userMsg, assistantMsg]);
        setInput('');
        setStreaming(true);

        abortRef.current = new AbortController();
        let fullResponse = '';

        try {
            await streamSSE(
                `${API_BASE}/api/legal-advice-stream`,
                { description: text, region: region || '', history: geminiHistory },
                token,
                (chunk) => {
                    fullResponse += chunk;
                    setMessages(prev => {
                        const updated = [...prev];
                        updated[updated.length - 1] = { ...updated[updated.length - 1], content: updated[updated.length - 1].content + chunk };
                        return updated;
                    });
                },
                abortRef.current.signal,
            );
        } catch (err: any) {
            if (err.name === 'AbortError') return;
            const raw: string = err.message ?? '';
            let friendly = 'Something went wrong. Please try again.';
            if (raw.includes('429') || raw.toLowerCase().includes('quota') || raw.toLowerCase().includes('exceeded')) {
                friendly = 'The AI service is temporarily unavailable due to high demand. Please try again in a minute.';
            } else if (raw.includes('503') || raw.toLowerCase().includes('not available')) {
                friendly = 'AI service is not configured. Please contact the administrator.';
            }
            setError(friendly);
            setMessages(prev => prev.slice(0, -1));
        } finally {
            // mark done + update gemini history for multi-turn
            setMessages(prev => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last?.role === 'assistant') updated[updated.length - 1] = { ...last, isStreaming: false };
                return updated;
            });
            if (fullResponse) {
                setGeminiHistory(prev => [
                    ...prev,
                    { role: 'user', parts: [{ text }] },
                    { role: 'model', parts: [{ text: fullResponse }] },
                ]);
            }
            setStreaming(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
    };

    const handleReset = () => {
        abortRef.current?.abort();
        setMessages([]);
        setGeminiHistory([]);
        setInput('');
        setError('');
        setStreaming(false);
    };

    // ── copy / download ────────────────────────────────────────────────────────────
    const copyMsg = (text: string) => { navigator.clipboard.writeText(text); };
    const downloadMsg = (text: string) => {
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'legal-advice.txt'; a.click(); URL.revokeObjectURL(url);
    };

    // ── render ────────────────────────────────────────────────────────────────────
    return (
        <div className="py-6">
            <div className="max-w-3xl mx-auto px-4 flex flex-col" style={{ height: 'calc(100vh - 88px)' }}>

                {/* Header */}
                <div className="text-center mb-5">
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <Scale className="w-7 h-7 text-primary-500" />
                        <h1 className="text-2xl font-bold text-gray-900">AI Legal Advisor</h1>
                    </div>
                    <p className="text-sm text-gray-500">
                        Personalized legal guidance based on Ethiopian law and women's rights
                    </p>
                </div>

                {/* Chat window */}
                <div className="flex-1 flex flex-col card p-0 overflow-hidden min-h-0">

                    {/* Top bar */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50 flex-shrink-0">
                        <div className="flex items-center gap-2">
                            <Bot className="w-4 h-4 text-primary-500" />
                            <span className="text-sm font-semibold text-gray-700">Netsanet Legal Advisor</span>
                            {streaming && (
                                <span className="flex items-center gap-1 text-xs text-primary-600 font-medium">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75" />
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500" />
                                    </span>
                                    Thinking…
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Region selector */}
                            <button
                                onClick={() => setShowRegion(v => !v)}
                                className="flex items-center gap-1 text-xs text-gray-500 border border-gray-200 rounded-full px-3 py-1 hover:bg-gray-100 transition-colors"
                            >
                                {region || 'Region'}
                                <ChevronDown className="w-3 h-3" />
                            </button>
                            {!isFirstMessage && (
                                <button
                                    onClick={handleReset}
                                    className="flex items-center gap-1 text-xs text-gray-500 border border-gray-200 rounded-full px-3 py-1 hover:bg-gray-100 transition-colors"
                                >
                                    <RotateCcw className="w-3 h-3" />
                                    New chat
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Region dropdown */}
                    {showRegion && (
                        <div className="border-b border-gray-100 px-4 py-2 bg-white flex-shrink-0">
                            <select
                                value={region}
                                onChange={e => { setRegion(e.target.value); setShowRegion(false); }}
                                className="form-select text-sm w-full max-w-xs"
                            >
                                <option value="">All regions</option>
                                {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                    )}

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
                        {/* Welcome state */}
                        {isFirstMessage && (
                            <div className="flex flex-col items-center justify-center h-full text-center py-8">
                                <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center mb-4">
                                    <Scale className="w-7 h-7 text-primary-500" />
                                </div>
                                <h2 className="text-lg font-semibold text-gray-800 mb-1">How can I help you today?</h2>
                                <p className="text-sm text-gray-500 mb-6 max-w-sm">
                                    Ask me anything about your legal situation — I'll give you guidance based on Ethiopian law.
                                </p>
                                {/* Suggested prompts */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                                    {SUGGESTED.map((s, i) => (
                                        <button
                                            key={i}
                                            onClick={() => sendMessage(s)}
                                            className="text-left text-sm border border-gray-200 rounded-xl px-3 py-2.5 hover:border-primary-300 hover:bg-primary-50 transition-colors text-gray-600"
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Message bubbles */}
                        {messages.map((msg, i) => (
                            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                {msg.role === 'assistant' && (
                                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center mt-1">
                                        <Bot className="w-3.5 h-3.5 text-primary-600" />
                                    </div>
                                )}

                                <div className={`group max-w-[82%] ${msg.role === 'user' ? '' : ''}`}>
                                    <div
                                        className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${msg.role === 'user'
                                            ? 'bg-primary-500 text-white rounded-tr-sm'
                                            : 'bg-white border border-gray-200 text-gray-900 rounded-tl-sm'
                                            }`}
                                    >
                                        {msg.role === 'user' ? (
                                            <p className="whitespace-pre-wrap">{msg.content}</p>
                                        ) : (
                                            <div className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-800">
                                                <ReactMarkdown>{msg.content}</ReactMarkdown>
                                                {msg.isStreaming && (
                                                    <span className="inline-block w-2 h-4 ml-0.5 bg-primary-400 animate-pulse rounded-sm align-middle" />
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Action buttons on assistant messages (show on hover, after streaming) */}
                                    {msg.role === 'assistant' && !msg.isStreaming && msg.content && (
                                        <div className="flex gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => copyMsg(msg.content)}
                                                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
                                                title="Copy"
                                            >
                                                <Copy className="w-3 h-3" /> Copy
                                            </button>
                                            <button
                                                onClick={() => downloadMsg(msg.content)}
                                                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
                                                title="Download"
                                            >
                                                <Download className="w-3 h-3" /> Save
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {msg.role === 'user' && (
                                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center mt-1">
                                        <User className="w-3.5 h-3.5 text-gray-600" />
                                    </div>
                                )}
                            </div>
                        ))}

                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                                {error}
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Input bar */}
                    <div className="flex-shrink-0 border-t border-gray-100 bg-white px-4 py-3">
                        <div className="flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2 focus-within:border-primary-400 focus-within:ring-1 focus-within:ring-primary-200 transition-all">
                            <textarea
                                ref={textareaRef}
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                disabled={streaming}
                                rows={1}
                                className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 resize-none outline-none py-1 min-h-[24px]"
                                placeholder="Describe your situation or ask a follow-up question…"
                            />
                            <button
                                onClick={() => sendMessage(input)}
                                disabled={!input.trim() || streaming}
                                className="flex-shrink-0 w-8 h-8 rounded-xl bg-primary-500 hover:bg-primary-600 disabled:bg-gray-200 disabled:cursor-not-allowed flex items-center justify-center transition-colors mb-0.5"
                            >
                                <Send className="w-3.5 h-3.5 text-white" />
                            </button>
                        </div>
                        <p className="text-center text-xs text-gray-400 mt-2">
                            Press <kbd className="bg-gray-100 px-1 rounded text-gray-500">Enter</kbd> to send · <kbd className="bg-gray-100 px-1 rounded text-gray-500">Shift+Enter</kbd> for new line
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LegalAdvisor;
