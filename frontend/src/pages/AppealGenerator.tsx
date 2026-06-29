import { useState, useRef, useEffect } from 'react';
import { FileText, Send, Copy, Download, RotateCcw, Bot, User, Calendar, MapPin, Paperclip, Phone, Mail, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

interface ChatMessage { role: 'user' | 'assistant'; content: string; isStreaming?: boolean; }
interface GeminiTurn { role: 'user' | 'model'; parts: { text: string }[]; }
interface FormData {
    name: string; case_type: string; incident_date: string; location: string;
    description: string; evidence: string; phone: string; email: string;
}

const CASE_TYPE_LABELS: Record<string, Record<string, string>> = {
    en: {
        domestic_violence: 'Domestic Violence', workplace_discrimination: 'Workplace Discrimination',
        property_rights: 'Property Rights', inheritance_dispute: 'Inheritance Dispute',
        child_custody: 'Child Custody', marital_rights: 'Marital Rights',
    },
    am: {
        domestic_violence: 'የቤት ውስጥ ጥቃት', workplace_discrimination: 'የሥራ ቦታ አድሎ',
        property_rights: 'የንብረት መብቶች', inheritance_dispute: 'የውርስ ክርክር',
        child_custody: 'የልጅ ምስጋና', marital_rights: 'የጋብቻ መብቶች',
    },
};

const ETHIOPIAN_CITIES = [
    'Addis Ababa', 'Dire Dawa', 'Mekelle', 'Gondar', 'Hawassa', 'Bahir Dar', 'Adama', 'Jimma',
    'Jijiga', 'Shashamane', 'Bishoftu', 'Sodo', 'Arba Minch', 'Hosaena', 'Harar', 'Dilla',
    'Nekemte', 'Debre Birhan', 'Asella', 'Axum', 'Adigrat', 'Dessie', 'Kombolcha', 'Woldia',
];

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://netsanet-foundation.onrender.com';

async function streamSSE(url: string, body: object, token: string | null, onChunk: (t: string) => void, signal: AbortSignal) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), signal });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error((e as any).detail ?? `Error ${res.status}`); }
    const reader = res.body!.getReader(); const dec = new TextDecoder(); let buf = '';
    while (true) {
        const { done, value } = await reader.read(); if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n\n'); buf = lines.pop() ?? '';
        for (const line of lines) {
            if (!line.startsWith('data:')) continue;
            const s = line.replace(/^data:\s*/, '').trim(); if (!s) continue;
            const p = JSON.parse(s);
            if (p.error) throw new Error(p.error); if (p.done) return; if (p.chunk) onChunk(p.chunk);
        }
    }
}

const AppealGenerator = () => {
    const { token } = useAuth();
    const { lang, t } = useLanguage();
    const caseLabels = CASE_TYPE_LABELS[lang] || CASE_TYPE_LABELS.en;

    const [step, setStep] = useState<'form' | 'chat'>('form');
    const [formData, setFormData] = useState<FormData>({
        name: '', case_type: '', incident_date: '', location: '', description: '', evidence: '', phone: '', email: '',
    });
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [geminiHistory, setGeminiHistory] = useState<GeminiTurn[]>([]);
    const [followUp, setFollowUp] = useState('');
    const [streaming, setStreaming] = useState(false);
    const [error, setError] = useState('');
    const [citySearch, setCitySearch] = useState('');
    const [showCityDropdown, setShowCityDropdown] = useState(false);
    const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
    const [driveLink, setDriveLink] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const abortRef = useRef<AbortController | null>(null);
    const cityRef = useRef<HTMLDivElement>(null);

    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
    useEffect(() => {
        const el = textareaRef.current;
        if (el) { el.style.height = 'auto'; el.style.height = `${Math.min(el.scrollHeight, 140)}px`; }
    }, [followUp]);
    useEffect(() => {
        const h = (e: MouseEvent) => { if (cityRef.current && !cityRef.current.contains(e.target as Node)) setShowCityDropdown(false); };
        document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
    }, []);

    const filteredCities = ETHIOPIAN_CITIES.filter(c => c.toLowerCase().includes(citySearch.toLowerCase()));

    const handleInput = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) setEvidenceFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    };

    const removeFile = (i: number) => setEvidenceFiles(prev => prev.filter((_, idx) => idx !== i));

    const buildEvidenceText = () => {
        const parts: string[] = [];
        if (formData.evidence) parts.push(formData.evidence);
        if (driveLink) parts.push(`Google Drive: ${driveLink}`);
        if (evidenceFiles.length) parts.push(`Files: ${evidenceFiles.map(f => f.name).join(', ')}`);
        return parts.join(' | ');
    };

    const runStream = async (body: object, userBubbleText: string) => {
        setMessages(prev => [...prev, { role: 'user', content: userBubbleText }, { role: 'assistant', content: '', isStreaming: true }]);
        setStreaming(true); setError('');
        abortRef.current = new AbortController();
        let full = '';
        try {
            await streamSSE(`${API_BASE}/api/generate-appeal-stream`, body, token, chunk => {
                full += chunk;
                setMessages(prev => { const u = [...prev]; u[u.length - 1] = { ...u[u.length - 1], content: u[u.length - 1].content + chunk }; return u; });
            }, abortRef.current.signal);
        } catch (err: any) {
            if (err.name === 'AbortError') return;
            const raw: string = err.message ?? '';
            setError(raw.includes('429') || raw.toLowerCase().includes('quota') ? t('general.quota') : t('general.error'));
            setMessages(prev => prev.slice(0, -1));
        } finally {
            setMessages(prev => { const u = [...prev]; const l = u[u.length - 1]; if (l?.role === 'assistant') u[u.length - 1] = { ...l, isStreaming: false }; return u; });
            if (full) setGeminiHistory(prev => [...prev, { role: 'user', parts: [{ text: userBubbleText }] }, { role: 'model', parts: [{ text: full }] }]);
            setStreaming(false);
        }
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const evidenceText = buildEvidenceText();
        const summary = `Generate a formal appeal letter for my case:\n\n**Name:** ${formData.name}\n**Case Type:** ${caseLabels[formData.case_type]}\n**Incident Date:** ${formData.incident_date}\n**Location:** ${formData.location}\n**Description:** ${formData.description}\n${evidenceText ? `**Evidence:** ${evidenceText}\n` : ''}**Contact:** ${formData.phone}${formData.email ? ` / ${formData.email}` : ''}`;
        setMessages([]); setGeminiHistory([]); setStep('chat');
        await runStream({ ...formData, contact_info: `${formData.phone}${formData.email ? ' / ' + formData.email : ''}`, evidence: evidenceText }, summary);
    };

    const handleFollowUp = async () => {
        const text = followUp.trim(); if (!text || streaming) return;
        setFollowUp('');
        await runStream({ followUp: text, history: geminiHistory }, text);
    };

    const handleReset = () => {
        abortRef.current?.abort(); setStep('form'); setMessages([]); setGeminiHistory([]);
        setFollowUp(''); setError(''); setStreaming(false);
        setFormData({ name: '', case_type: '', incident_date: '', location: '', description: '', evidence: '', phone: '', email: '' });
        setEvidenceFiles([]); setDriveLink('');
    };

    const stripMd = (t: string) => t.replace(/^#{1,6}\s+/gm, '').replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1').replace(/```[\s\S]*?```/g, '').replace(/`([^`]+)`/g, '$1').trim();
    const copyText = (text: string) => navigator.clipboard.writeText(stripMd(text));
    const dlText = (text: string, name: string) => { const b = new Blob([stripMd(text)], { type: 'text/plain' }); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = name; a.click(); URL.revokeObjectURL(u); };

    const isValid = formData.name && formData.case_type && formData.incident_date && formData.location && formData.description && formData.phone;
    const lastAI = [...messages].reverse().find(m => m.role === 'assistant');

    return (
        <div className="py-10 min-h-screen bg-gray-50">
            <div className="max-w-4xl mx-auto px-4 sm:px-6">
                <div className="text-center mb-8">
                    <FileText className="w-10 h-10 text-primary-500 mb-3 mx-auto" />
                    <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">{t('appeal.title')}</h1>
                    <p className="text-gray-600 max-w-2xl mx-auto text-sm sm:text-base">{t('appeal.subtitle')}</p>
                </div>

                {step === 'form' && (
                    <div className="card shadow-md">
                        <h2 className="text-xl font-bold text-gray-900 mb-6">{t('appeal.form.title')}</h2>
                        <form onSubmit={handleFormSubmit} className="space-y-5">
                            {/* Name + Case Type */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('appeal.name')} *</label>
                                    <input type="text" name="name" value={formData.name} onChange={handleInput} required className="form-input" placeholder="Tigist Bekele" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('appeal.caseType')} *</label>
                                    <select name="case_type" value={formData.case_type} onChange={handleInput} required className="form-select">
                                        <option value="">{t('appeal.selectCase')}</option>
                                        {Object.entries(caseLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Date + Location */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1"><Calendar className="w-4 h-4 inline mr-1" />{t('appeal.date')} *</label>
                                    <input type="date" name="incident_date" value={formData.incident_date} onChange={handleInput} required className="form-input" max={new Date().toISOString().split('T')[0]} />
                                </div>
                                <div ref={cityRef} className="relative">
                                    <label className="block text-sm font-medium text-gray-700 mb-1"><MapPin className="w-4 h-4 inline mr-1" />{t('appeal.location')} *</label>
                                    <input type="text" name="location" value={formData.location} onChange={e => { handleInput(e); setCitySearch(e.target.value); setShowCityDropdown(true); }}
                                        onFocus={() => setShowCityDropdown(true)} required className="form-input" placeholder={t('support.searchCity')} autoComplete="off" />
                                    {showCityDropdown && filteredCities.length > 0 && (
                                        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                            {filteredCities.map(c => (
                                                <button key={c} type="button" onClick={() => { setFormData(p => ({ ...p, location: c })); setCitySearch(c); setShowCityDropdown(false); }}
                                                    className="block w-full text-left px-4 py-2.5 text-sm hover:bg-primary-50 hover:text-primary-700 transition-colors">{c}</button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{t('appeal.description')} *</label>
                                <textarea name="description" value={formData.description} onChange={handleInput} required rows={4} className="form-textarea"
                                    placeholder="Describe what happened in detail..." />
                            </div>

                            {/* Evidence */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{t('appeal.evidenceOptional')}</label>
                                <textarea name="evidence" value={formData.evidence} onChange={handleInput} rows={2} className="form-textarea mb-2"
                                    placeholder={t('appeal.evidenceHint')} />
                                <div className="flex flex-wrap gap-2 items-center">
                                    <button type="button" onClick={() => fileInputRef.current?.click()}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-600">
                                        <Paperclip className="w-3.5 h-3.5" /> Upload file / PDF / DOCX
                                    </button>
                                    <input ref={fileInputRef} type="file" multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" className="hidden" onChange={handleFileChange} />
                                    <input type="url" value={driveLink} onChange={e => setDriveLink(e.target.value)}
                                        className="flex-1 min-w-0 px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-primary-500 bg-white"
                                        placeholder="Or paste Google Drive / Dropbox link..." />
                                </div>
                                {evidenceFiles.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                        {evidenceFiles.map((f, i) => (
                                            <span key={i} className="flex items-center gap-1 bg-primary-50 text-primary-700 text-xs px-2 py-1 rounded-full border border-primary-200">
                                                {f.name.length > 20 ? f.name.substring(0, 20) + '...' : f.name}
                                                <button type="button" onClick={() => removeFile(i)}><X className="w-3 h-3" /></button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Phone + Email */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1"><Phone className="w-4 h-4 inline mr-1" />{t('appeal.phone')} *</label>
                                    <div className="flex">
                                        <span className="inline-flex items-center px-3 bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg text-sm text-gray-600 font-medium">+251</span>
                                        <input type="tel" name="phone" value={formData.phone} onChange={handleInput} required
                                            className="form-input rounded-l-none border-l-0 flex-1" placeholder="91 234 5678" pattern="[0-9]{9,10}" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1"><Mail className="w-4 h-4 inline mr-1" />{t('appeal.email')} <span className="text-gray-400 text-xs">({t('general.optional')})</span></label>
                                    <input type="email" name="email" value={formData.email} onChange={handleInput} className="form-input" placeholder="tigist@example.com" />
                                </div>
                            </div>

                            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

                            <button type="submit" disabled={!isValid}
                                className="btn btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed justify-center text-base py-3">
                                <Send className="w-4 h-4" /> {t('appeal.generate')}
                            </button>
                        </form>
                    </div>
                )}

                {step === 'chat' && (
                    <div className="flex flex-col gap-4">
                        {/* Chat window */}
                        <div className="card p-0 overflow-hidden flex flex-col" style={{ minHeight: '500px', maxHeight: '70vh' }}>
                            {/* Top bar */}
                            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50 flex-shrink-0">
                                <div className="flex items-center gap-2">
                                    <Bot className="w-5 h-5 text-primary-500" />
                                    <span className="font-semibold text-gray-800 text-sm">Netsanet Appeal Assistant</span>
                                    {streaming && (
                                        <span className="flex items-center gap-1 text-xs text-primary-600 font-medium">
                                            <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500" /></span>
                                            {t('appeal.generating')}
                                        </span>
                                    )}
                                </div>
                                <button onClick={handleReset} className="flex items-center gap-1 text-xs text-gray-500 border border-gray-200 rounded-full px-3 py-1 hover:bg-gray-100 transition-colors">
                                    <RotateCcw className="w-3 h-3" /> {t('appeal.newAppeal')}
                                </button>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
                                {messages.map((msg, i) => (
                                    <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        {msg.role === 'assistant' && <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center mt-1"><Bot className="w-4 h-4 text-primary-600" /></div>}
                                        <div className="group max-w-[85%]">
                                            <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-primary-500 text-white rounded-tr-sm' : 'bg-white border border-gray-200 text-gray-900 rounded-tl-sm'}`}>
                                                {msg.role === 'user' ? <div className="prose prose-sm prose-invert max-w-none"><ReactMarkdown>{msg.content}</ReactMarkdown></div> : <div className="prose prose-sm max-w-none prose-headings:text-gray-900"><ReactMarkdown>{msg.content}</ReactMarkdown>{msg.isStreaming && <span className="inline-block w-2 h-4 ml-0.5 bg-primary-400 animate-pulse rounded-sm align-middle" />}</div>}
                                            </div>
                                            {msg.role === 'assistant' && !msg.isStreaming && msg.content && (
                                                <div className="flex gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => copyText(msg.content)} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded hover:bg-gray-100 transition-colors"><Copy className="w-3 h-3" />{t('general.copy')}</button>
                                                    <button onClick={() => dlText(msg.content, `appeal-${i}.txt`)} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded hover:bg-gray-100 transition-colors"><Download className="w-3 h-3" />{t('general.save')}</button>
                                                </div>
                                            )}
                                        </div>
                                        {msg.role === 'user' && <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mt-1"><User className="w-4 h-4 text-gray-600" /></div>}
                                    </div>
                                ))}
                                {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>}
                                <div ref={chatEndRef} />
                            </div>

                            {/* Follow-up input */}
                            <div className="flex-shrink-0 border-t border-gray-100 bg-white px-4 py-3">
                                <div className="flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2 focus-within:border-primary-400 focus-within:ring-1 focus-within:ring-primary-200 transition-all">
                                    <textarea ref={textareaRef} value={followUp} onChange={e => setFollowUp(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleFollowUp(); } }} disabled={streaming} rows={1}
                                        className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 resize-none outline-none py-1 min-h-[24px]" placeholder={t('appeal.followUpPlaceholder')} />
                                    <button onClick={handleFollowUp} disabled={!followUp.trim() || streaming} className="flex-shrink-0 w-8 h-8 rounded-xl bg-primary-500 hover:bg-primary-600 disabled:bg-gray-200 disabled:cursor-not-allowed flex items-center justify-center transition-colors mb-0.5">
                                        <Send className="w-3.5 h-3.5 text-white" />
                                    </button>
                                </div>
                                <p className="text-center text-xs text-gray-400 mt-1.5"><kbd className="bg-gray-100 px-1 rounded text-gray-500">Enter</kbd> to send · <kbd className="bg-gray-100 px-1 rounded text-gray-500">Shift+Enter</kbd> for new line</p>
                            </div>
                        </div>

                        {/* Export bar */}
                        {!streaming && lastAI?.content && (
                            <div className="card py-4">
                                <p className="text-sm font-medium text-gray-700 mb-3">{t('appeal.export')}</p>
                                <div className="flex flex-wrap gap-2">
                                    <button onClick={() => copyText(lastAI.content)} className="btn btn-secondary btn-small"><Copy className="w-4 h-4" />{t('appeal.copyAll')}</button>
                                    <button onClick={() => dlText(lastAI.content, 'appeal-full.txt')} className="btn btn-secondary btn-small"><Download className="w-4 h-4" />{t('appeal.downloadFull')}</button>
                                    <button onClick={() => { const m = lastAI.content.match(/AMHARIC VERSION:\s*([\s\S]*?)$/i); dlText(m ? m[1].trim() : lastAI.content, 'appeal-amharic.txt'); }} className="btn btn-secondary btn-small"><Download className="w-4 h-4" />{t('appeal.downloadAm')}</button>
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
