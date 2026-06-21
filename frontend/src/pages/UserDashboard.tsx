import { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE_URL from '../config';
import {
    FileText,
    MessageSquare,
    FileEdit,
    Clock,
    CheckCircle,
    Copy,
    Download
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface MyStory {
    id: number;
    title: string;
    content: string;
    category: string;
    region: string;
    is_approved: boolean;
    created_at: string;
}

interface LegalAdvice {
    id: number;
    description: string;
    region: string;
    advice_generated: string;
    case_type: string;
    created_at: string;
}

interface AppealLetter {
    id: number;
    name: string;
    case_type: string;
    location: string;
    english_letter: string;
    amharic_letter: string;
    created_at: string;
}

const UserDashboard = () => {
    const { user } = useAuth();
    const [myStories, setMyStories] = useState<MyStory[]>([]);
    const [legalAdvice, setLegalAdvice] = useState<LegalAdvice[]>([]);
    const [appealLetters, setAppealLetters] = useState<AppealLetter[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('stories');

    useEffect(() => {
        fetchUserData();
    }, []);

    const fetchUserData = async () => {
        try {
            const [storiesResponse, legalResponse, appealsResponse] = await Promise.all([
                axios.get(`${API_BASE_URL}/api/my/stories`),
                axios.get(`${API_BASE_URL}/api/my/legal-advice`),
                axios.get(`${API_BASE_URL}/api/my/appeal-letters`)
            ]);

            setMyStories(storiesResponse.data.stories);
            setLegalAdvice(legalResponse.data.legal_advice);
            setAppealLetters(appealsResponse.data.appeal_letters);
        } catch (error) {
            console.error('Error fetching user data:', error);
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text: string, type: string) => {
        navigator.clipboard.writeText(text);
        alert(`${type} copied to clipboard!`);
    };

    const downloadText = (text: string, filename: string) => {
        const blob = new Blob([text], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading your dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">My Dashboard</h1>
                    <p className="text-gray-600 mt-2">Welcome back, {user?.username}!</p>
                </div>

                {/* Navigation Tabs */}
                <div className="border-b border-gray-200 mb-8">
                    <nav className="-mb-px flex space-x-8">
                        <button
                            onClick={() => setActiveTab('stories')}
                            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'stories'
                                ? 'border-primary-500 text-primary-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            My Stories ({myStories.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('legal-advice')}
                            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'legal-advice'
                                ? 'border-primary-500 text-primary-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            Legal Advice ({legalAdvice.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('appeal-letters')}
                            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'appeal-letters'
                                ? 'border-primary-500 text-primary-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            Appeal Letters ({appealLetters.length})
                        </button>
                    </nav>
                </div>

                {/* My Stories Tab */}
                {activeTab === 'stories' && (
                    <div className="space-y-6">
                        {myStories.length === 0 ? (
                            <div className="text-center py-12">
                                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                                <h3 className="mt-2 text-sm font-medium text-gray-900">No stories yet</h3>
                                <p className="mt-1 text-sm text-gray-500">Share your story to help others.</p>
                                <div className="mt-6">
                                    <a href="/story-wall" className="btn btn-primary">
                                        Share Your Story
                                    </a>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {myStories.map((story) => (
                                    <div key={story.id} className="card">
                                        <div className="flex justify-between items-start mb-4">
                                            <h3 className="text-xl font-semibold text-gray-900">{story.title}</h3>
                                            {story.is_approved ? (
                                                <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                                                    <CheckCircle className="w-3 h-3" />
                                                    Approved
                                                </span>
                                            ) : (
                                                <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    Pending
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-gray-600 mb-4">{story.content}</p>
                                        <div className="flex gap-2 text-sm text-gray-500">
                                            <span className="bg-gray-100 px-2 py-1 rounded">{story.category}</span>
                                            <span>{story.region}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Legal Advice Tab */}
                {activeTab === 'legal-advice' && (
                    <div className="space-y-6">
                        {legalAdvice.length === 0 ? (
                            <div className="text-center py-12">
                                <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
                                <h3 className="mt-2 text-sm font-medium text-gray-900">No legal advice requests yet</h3>
                                <p className="mt-1 text-sm text-gray-500">Get AI-powered legal advice for your situation.</p>
                                <div className="mt-6">
                                    <a href="/legal-advisor" className="btn btn-primary">
                                        Get Legal Advice
                                    </a>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {legalAdvice.map((advice) => (
                                    <div key={advice.id} className="card">
                                        <div className="mb-4">
                                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Legal Advice Request</h3>
                                            <p className="text-gray-600 mb-4">{advice.description}</p>
                                            <div className="flex gap-2 text-sm text-gray-500 mb-4">
                                                <span className="bg-gray-100 px-2 py-1 rounded">{advice.case_type}</span>
                                                <span>{advice.region}</span>
                                            </div>
                                        </div>
                                        <div className="bg-gray-50 p-4 rounded-lg">
                                            <h4 className="font-medium text-gray-900 mb-2">AI Response:</h4>
                                            <div className="prose prose-sm max-w-none text-gray-700">
                                                <pre className="whitespace-pre-wrap font-sans">{advice.advice_generated}</pre>
                                            </div>
                                        </div>
                                        <div className="mt-4 flex gap-2">
                                            <button
                                                onClick={() => copyToClipboard(advice.advice_generated, 'Legal advice')}
                                                className="btn btn-secondary btn-small"
                                            >
                                                <Copy className="w-4 h-4" />
                                                Copy
                                            </button>
                                            <button
                                                onClick={() => downloadText(advice.advice_generated, `legal-advice-${advice.id}.txt`)}
                                                className="btn btn-secondary btn-small"
                                            >
                                                <Download className="w-4 h-4" />
                                                Download
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Appeal Letters Tab */}
                {activeTab === 'appeal-letters' && (
                    <div className="space-y-6">
                        {appealLetters.length === 0 ? (
                            <div className="text-center py-12">
                                <FileEdit className="mx-auto h-12 w-12 text-gray-400" />
                                <h3 className="mt-2 text-sm font-medium text-gray-900">No appeal letters yet</h3>
                                <p className="mt-1 text-sm text-gray-500">Generate formal appeal letters for your case.</p>
                                <div className="mt-6">
                                    <a href="/appeal-generator" className="btn btn-primary">
                                        Generate Appeal Letter
                                    </a>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {appealLetters.map((appeal) => (
                                    <div key={appeal.id} className="card">
                                        <div className="mb-4">
                                            <h3 className="text-lg font-semibold text-gray-900">{appeal.name}</h3>
                                            <p className="text-gray-600 mb-2">{appeal.case_type} - {appeal.location}</p>
                                        </div>

                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            <div>
                                                <h4 className="font-medium text-gray-900 mb-2">English Version</h4>
                                                <div className="bg-gray-50 p-4 rounded-lg max-h-64 overflow-y-auto">
                                                    <pre className="whitespace-pre-wrap font-sans text-sm">{appeal.english_letter}</pre>
                                                </div>
                                                <div className="mt-2 flex gap-2">
                                                    <button
                                                        onClick={() => copyToClipboard(appeal.english_letter, 'English letter')}
                                                        className="btn btn-secondary btn-small"
                                                    >
                                                        <Copy className="w-4 h-4" />
                                                        Copy
                                                    </button>
                                                    <button
                                                        onClick={() => downloadText(appeal.english_letter, `appeal-english-${appeal.id}.txt`)}
                                                        className="btn btn-secondary btn-small"
                                                    >
                                                        <Download className="w-4 h-4" />
                                                        Download
                                                    </button>
                                                </div>
                                            </div>

                                            <div>
                                                <h4 className="font-medium text-gray-900 mb-2">Amharic Version</h4>
                                                <div className="bg-gray-50 p-4 rounded-lg max-h-64 overflow-y-auto">
                                                    <pre className="whitespace-pre-wrap font-sans text-sm">{appeal.amharic_letter}</pre>
                                                </div>
                                                <div className="mt-2 flex gap-2">
                                                    <button
                                                        onClick={() => copyToClipboard(appeal.amharic_letter, 'Amharic letter')}
                                                        className="btn btn-secondary btn-small"
                                                    >
                                                        <Copy className="w-4 h-4" />
                                                        Copy
                                                    </button>
                                                    <button
                                                        onClick={() => downloadText(appeal.amharic_letter, `appeal-amharic-${appeal.id}.txt`)}
                                                        className="btn btn-secondary btn-small"
                                                    >
                                                        <Download className="w-4 h-4" />
                                                        Download
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserDashboard; 