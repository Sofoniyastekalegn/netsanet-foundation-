import { useState, useRef, useEffect } from 'react';
import { FileText, Send, Copy, Download, RotateCcw, Bot, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '../contexts/AuthContext';

// ── types ──────────────────────────────────────────────────────────────────────
interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    isStreaming?: boolean;
}

interface GeminiTurn {
    role: 'user' | 'model';
    parts: { text: string }[];
}

interface FormData {
    name: string;
    case_type: string;
    incident_date: string;
    location: string;
    description: string;
    evidence: string;
    contact_info: string;
}

const CASE_TYPE_LABELS: Record<string, string> = {
    domestic_violence: 'Domestic Violence',
    workplace_discrimination: 'Workplace Discrimination',
    property_rights: 'Property Rights',
    inheritance_dispute: 'Inheritance Dispute',
    child_custody: 'Child Custody',
    marital_rights: 'Marital Rights',
};

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
const AppealGenerator = () => {
    const { token } = useAuth();

    const [step, setStep] = useState<'form' | 'chat'>('form');
    const [formData, setFormData] = useState<FormData>({
        name: '', case_type: '', incident_date: '', location: '',
        description: '', evidence: '', contact_info: '',
    });
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [geminiHistory, setGeminiHistory] = useState<GeminiTurn[]>([]);
    const [followUp, setFollowUp] = useState('');
    const [streaming, setStreaming] = useState(false);
    const [error, setError] = useState('');

    const chatEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const abortRef = useRef<AbortController | null>(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // auto-resize textarea
    useEffect(() => {
        const el = textareaRef.current;
        if (el) { el.style.height = 'auto'; el.style.height = `${Math.min(el.scrollHeight, 140)}px`; }
    }, [followUp]);

    // ── core streaming runner ──────────────────────────────────────────────────────
    const runStream = async (body: object, userBubbleText: string) => {
        const userMsg: ChatMessage = { role: 'user', content: userBubbleText };
        const assistantMsg: ChatMessage = { role: 'assistant', content: '', isStreaming: true };
        setMessages(prev => [...prev, userMsg, assistantMsg]);
        setStreaming(true);
        setError('');

        abortRef.current = new AbortController();
        let fullResponse = '';

        try {
            await streamSSE(
                `${API_BASE}/api/generate-appeal-stream`,
                body,
                token,
                (chunk) => {
                    fullResponse += chunk;
                    setMessages(prev => {
                        const updated = [...prev];
                        updated[updated.length - 1] = {
                            ...updated[updated.length - 1],
                            content: updated[updated.length - 1].content + chunk,
                        };
                        return updated;
                    });
                },
                abortRef.current.signal,
            );
        } catch (err: any) {
            if (err.name === 'AbortError') return;
            setError(err.message ?? 'Something went wrong. Please try again.');
            setMessages(prev => prev.slice(0, -1));
        } finally {
            setMessages(prev => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last?.role === 'assistant') updated[updated.length - 1] = { ...last, isStreaming: false };
                return updated;
            });
            if (fullResponse) {
                setGeminiHistory(prev => [
                    ...prev,
                    { role: 'user', parts: [{ text: userBubbleText }] },
                    { role: 'model', parts: [{ text: fullResponse }] },
                ]);
            }
            setStreaming(false);
        }
    };

    // ── initial form submit ────────────────────────────────────────────────────────
    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const userSummary =
            `Generate a formal appeal letter for my case:\n\n` +
            `**Name:** ${formData.name}\n` +
            `**Case Type:** ${CASE_TYPE_LABELS[formData.case_type] ?? formData.case_type}\n` +
            `**Incident Date:** ${formData.incident_date}\n` +
            `**Location:** ${formData.location}\n` +
            `**Description:** ${formData.description}\n` +
            (formData.evidence ? `**Evidence:** ${formData.evidence}\n` : '') +
            `**Contact:** ${formData.contact_info}`;

        setMessages([]);
        setGeminiHistory([]);
        setStep('chat');
        await runStream({ ...formData }, userSummary);
    };

    // ── follow-up send ─────────────────────────────────────────────────────────────
    const handleFollowUp = async () => {
        const text = followUp.trim();
        if (!text || streaming) return;
        setFollowUp('');
        await runStream(
            { followUp: text, history: geminiHistory },
            text,
        );
    };

    const handleFollowUpKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleFollowUp(); }
    };

    // ── utils ──────────────────────────────────────────────────────────────────────
    const stripMarkdown = (text: string) =>
        text
            .replace(/^#{1,6}\s+/gm, '').replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1')
            .replace(/__(.*?)__/g, '$1').replace(/_(.*?)_/g, '$1').replace(/```[\s\S]*?```/g, '')
            .replace(/`([^`]+)`/g, '$1').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
            .replace(/^[\s]*[-*+]\s+/gm, '').replace(/^[\s]*\d+\.\s+/gm, '').replace(/^>\s+/gm, '')
            .replace(/\n\s*\n\s*\n/g, '\n\n').trim();

    const copyText = (text: string) => { navigator.clipboard.writeText(stripMarkdown(text)); };
    const downloadText = (text: string, filename: string) => {
        const blob = new Blob([stripMarkdown(text)], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
    };

    const handleReset = () => {
        abortRef.current?.abort();
        setStep('form');
        setMessages([]); setGeminiHistory([]);
        setFollowUp(''); setError(''); setStreaming(false);
        setFormData({ name: '', case_type: '', incident_date: '', location: '', description: '', evidence: '', contact_info: '' });
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const isFormValid = formData.name && formData.case_type && formData.incident_date &&
        formData.location && formData.description && formData.contact_info;

    const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant');

    // ── render ─────────────────────────────────────────────────────────────────────
    return (
        <div className="py-10">
            <div className="max-w-4xl mx-auto px-5">

                {/* Header */}
                <div className="text-center mb-8">
                    <FileText className="w-12 h-12 text-primary-500 mb-4 mx-auto" />
                    <h1 className="text-4xl font-bold text-gray-900 mb-3">Appeal Letter Generator</h1>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        Fill in your case details — Netsanet will generate a formal appeal letter in English
                        and Amharic, streamed live. Then ask follow-up questions to refine it.
                    </p>
                </div>

                {/* ── FORM STEP ──────────────────────────────────────────────────────── */}
                {step === 'form' && (
                    <div className="card">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Case Information</h2>
                        <form onSubmit={handleFormSubmit} className="space-y-6">

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                                    <input type="text" name="name" value={formData.name} onChange={handleInputChange}
                                        required className="form-input w-full" placeholder="Your full name" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Case Type *</label>
                                    <select name="case_type" value={formData.case_type} onChange={handleInputChange}
                                        required className="form-select w-full">
                                        <option value="">Select case type</option>
                                        {Object.entries(CASE_TYPE_LABELS).map(([val, label]) => (
                                            <option key={val} value={val}>{label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Incident Date *</label>
                                    <input type="text" name="incident_date" value={formData.incident_date}
                                        onChange={handleInputChange} required className="form-input w-full"
                                        placeholder="e.g., January 15, 2024" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Location *</label>
                                    <input type="text" name="location" value={formData.location}
                                        onChange={handleInputChange} required className="form-input w-full"
                                        placeholder="City, Region" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Case Description *</label>
                                <textarea name="description" value={formData.description} onChange={handleInputChange}
                                    required rows={5} className="form-textarea w-full"
                                    placeholder="Describe what happened in detail — include dates, people involved, and any relevant facts…" />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Evidence <span className="text-gray-400">(optional)</span>
                                </label>
                                <textarea name="evidence" value={formData.evidence} onChange={handleInputChange}
                                    rows={3} className="form-textarea w-full"
                                    placeholder="List any evidence — documents, witnesses, photos, medical reports…" />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Contact Information *</label>
                                <input type="text" name="contact_info" value={formData.contact_info}
                                    onChange={handleInputChange} required className="form-input w-full"
                                    placeholder="Phone number, email, or address" />
                            </div>

                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">{error}</div>
                            )}

                            <button type="submit" disabled={!isFormValid} className="btn btn-primary w-full">
                                <Send className="w-4 h-4 mr-2" />
                                Generate Appeal Letter
                            </button>
                        </form>
                    </div>
                )}

                {/* ── CHAT STEP ──────────────────────────────────────────────────────── */}
                {step === 'chat' && (
                    <div className="flex flex-col gap-4">
                        {/* Chat window */}
                        <div className="card p-0 overflow-hidden flex flex-col" style={{ minHeight: '540px', maxHeight: '70vh' }}>

                            {/* Top bar */}
                            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-gray-50 flex-shrink-0">
                                <div className="flex items-center gap-2">
                                    <Bot className="w-5 h-5 text-primary-500" />
                                    <span className="font-semibold text-gray-800 text-sm">Netsanet Appeal Assistant</span>
                                    {streaming && (
                                        <span className="flex items-center gap-1 text-xs text-primary-600 font-medium">
                                            <span className="relative flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75" />
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500" />
                                            </span>
                                            Generating…
                                        </span>
                                    )}
                                </div>
                                <button onClick={handleReset}
                                    className="flex items-center gap-1 text-xs text-gray-500 border border-gray-200 rounded-full px-3 py-1 hover:bg-gray-100 transition-colors">
                                    <RotateCcw className="w-3 h-3" />
                                    New Appeal
                                </button>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5 min-h-0">
                                {messages.map((msg, i) => (
                                    <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        {msg.role === 'assistant' && (
                                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center mt-1">
                                                <Bot className="w-4 h-4 text-primary-600" />
                                            </div>
                                        )}

                                        <div className={`group max-w-[85%]`}>
                                            <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${msg.role === 'user'
                                                ? 'bg-primary-500 text-white rounded-tr-sm'
                                                : 'bg-white border border-gray-200 text-gray-900 rounded-tl-sm'
                                                }`}>
                                                {msg.role === 'user' ? (
                                                    <div className="prose prose-sm prose-invert max-w-none">
                                                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                                                    </div>
                                                ) : (
                                                    <div className="prose prose-sm max-w-none prose-headings:text-gray-900">
                                                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                                                        {msg.isStreaming && (
                                                            <span className="inline-block w-2 h-4 ml-0.5 bg-primary-400 animate-pulse rounded-sm align-middle" />
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Copy/download on assistant bubbles */}
                                            {msg.role === 'assistant' && !msg.isStreaming && msg.content && (
                                                <div className="flex gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => copyText(msg.content)}
                                                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded hover:bg-gray-100 transition-colors">
                                                        <Copy className="w-3 h-3" /> Copy
                                                    </button>
                                                    <button onClick={() => downloadText(msg.content, `appeal-${i}.txt`)}
                                                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded hover:bg-gray-100 transition-colors">
                                                        <Download className="w-3 h-3" /> Save
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {msg.role === 'user' && (
                                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mt-1">
                                                <User className="w-4 h-4 text-gray-600" />
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {error && (
                                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>
                                )}
                                <div ref={chatEndRef} />
                            </div>

                            {/* Follow-up input bar */}
                            <div className="flex-shrink-0 border-t border-gray-100 bg-white px-4 py-3">
                                <div className="flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2 focus-within:border-primary-400 focus-within:ring-1 focus-within:ring-primary-200 transition-all">
                                    <textarea
                                        ref={textareaRef}
                                        value={followUp}
                                        onChange={e => setFollowUp(e.target.value)}
                                        onKeyDown={handleFollowUpKey}
                                        disabled={streaming}
                                        rows={1}
                                        className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 resize-none outline-none py-1 min-h-[24px]"
                                        placeholder="Ask a follow-up — e.g. 'Make it more formal' or 'Translate only the Amharic part'…"
                                    />
                                    <button
                                        onClick={handleFollowUp}
                                        disabled={!followUp.trim() || streaming}
                                        className="flex-shrink-0 w-8 h-8 rounded-xl bg-primary-500 hover:bg-primary-600 disabled:bg-gray-200 disabled:cursor-not-allowed flex items-center justify-center transition-colors mb-0.5"
                                    >
                                        <Send className="w-3.5 h-3.5 text-white" />
                                    </button>
                                </div>
                                <p className="text-center text-xs text-gray-400 mt-1.5">
                                    <kbd className="bg-gray-100 px-1 rounded text-gray-500">Enter</kbd> to send ·{' '}
                                    <kbd className="bg-gray-100 px-1 rounded text-gray-500">Shift+Enter</kbd> for new line
                                </p>
                            </div>
                        </div>

                        {/* Export bar — shown after generation is complete */}
                        {!streaming && lastAssistantMsg && lastAssistantMsg.content && (
                            <div className="card py-4">
                                <p className="text-sm font-medium text-gray-700 mb-3">Export your appeal letter:</p>
                                <div className="flex flex-wrap gap-2">
                                    <button onClick={() => copyText(lastAssistantMsg.content)}
                                        className="btn btn-secondary btn-small">
                                        <Copy className="w-4 h-4 mr-1" /> Copy All
                                    </button>
                                    <button onClick={() => downloadText(lastAssistantMsg.content, 'appeal-letter-full.txt')}
                                        className="btn btn-secondary btn-small">
                                        <Download className="w-4 h-4 mr-1" /> Download (EN+AM)
                                    </button>
                                    <button onClick={() => {
                                        const amMatch = lastAssistantMsg.content.match(/AMHARIC VERSION:\s*([\s\S]*?)$/i);
                                        downloadText(amMatch ? amMatch[1].trim() : lastAssistantMsg.content, 'appeal-letter-amharic.txt');
                                    }} className="btn btn-secondary btn-small">
                                        <Download className="w-4 h-4 mr-1" /> Download (AM only)
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AppealGenerator;
