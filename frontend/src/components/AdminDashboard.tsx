import { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE_URL from '../config';
import {
    Users,
    FileText,
    Building,
    TrendingUp,
    CheckCircle,
    Clock,
    Trash2,
    Plus,
    Edit
} from 'lucide-react';
import OrganizationManager from './OrganizationManager';

interface Stats {
    total_stories: number;
    approved_stories: number;
    pending_stories: number;
    legal_requests: number;
    appeal_letters: number;
    active_organizations: number;
    total_users: number;
    admin_users: number;
}

interface PendingStory {
    id: number;
    title: string;
    content: string;
    category: string;
    region: string;
    user_id: number;
    created_at: string;
}

const AdminDashboard = () => {
    const [stats, setStats] = useState<Stats | null>(null);
    const [pendingStories, setPendingStories] = useState<PendingStory[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [statsResponse, pendingResponse] = await Promise.all([
                axios.get(`${API_BASE_URL}/admin/stats`),
                axios.get(`${API_BASE_URL}/admin/stories/pending`)
            ]);

            setStats(statsResponse.data);
            setPendingStories(pendingResponse.data.pending_stories);
        } catch (error) {
            console.error('Error fetching admin data:', error);
        } finally {
            setLoading(false);
        }
    };

    const approveStory = async (storyId: number) => {
        try {
            await axios.post(`${API_BASE_URL}/admin/stories/approve`, {
                story_id: storyId,
                approved: true
            });

            // Remove from pending list and update stats
            setPendingStories(prev => prev.filter(story => story.id !== storyId));
            if (stats) {
                setStats({
                    ...stats,
                    approved_stories: stats.approved_stories + 1,
                    pending_stories: stats.pending_stories - 1
                });
            }

            alert('Story approved successfully!');
        } catch (error) {
            console.error('Error approving story:', error);
            alert('Error approving story. Please try again.');
        }
    };

    const rejectStory = async (storyId: number) => {
        try {
            await axios.post(`${API_BASE_URL}/admin/stories/approve`, {
                story_id: storyId,
                approved: false
            });

            // Remove from pending list and update stats
            setPendingStories(prev => prev.filter(story => story.id !== storyId));
            if (stats) {
                setStats({
                    ...stats,
                    pending_stories: stats.pending_stories - 1
                });
            }

            alert('Story rejected successfully!');
        } catch (error) {
            console.error('Error rejecting story:', error);
            alert('Error rejecting story. Please try again.');
        }
    };

    const deleteStory = async (storyId: number) => {
        if (!confirm('Are you sure you want to delete this story? This action cannot be undone.')) {
            return;
        }

        try {
            await axios.delete(`${API_BASE_URL}/admin/stories/${storyId}`);

            // Remove from pending list and update stats
            setPendingStories(prev => prev.filter(story => story.id !== storyId));
            if (stats) {
                setStats({
                    ...stats,
                    pending_stories: stats.pending_stories - 1
                });
            }

            alert('Story deleted successfully!');
        } catch (error) {
            console.error('Error deleting story:', error);
            alert('Error deleting story. Please try again.');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-12">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
                    <p className="text-gray-600 mt-2">Manage stories, organizations, and view statistics</p>
                </div>

                {/* Navigation Tabs */}
                <div className="border-b border-gray-200 mb-8">
                    <nav className="-mb-px flex space-x-8">
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'overview'
                                ? 'border-primary-500 text-primary-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            Overview
                        </button>
                        <button
                            onClick={() => setActiveTab('stories')}
                            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'stories'
                                ? 'border-primary-500 text-primary-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            Pending Stories ({pendingStories.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('organizations')}
                            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'organizations'
                                ? 'border-primary-500 text-primary-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            Organizations
                        </button>
                    </nav>
                </div>

                {/* Overview Tab */}
                {activeTab === 'overview' && stats && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <div className="bg-white overflow-hidden shadow rounded-lg">
                            <div className="p-5">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <FileText className="h-6 w-6 text-gray-400" />
                                    </div>
                                    <div className="ml-5 w-0 flex-1">
                                        <dl>
                                            <dt className="text-sm font-medium text-gray-500 truncate">Total Stories</dt>
                                            <dd className="text-lg font-medium text-gray-900">{stats.total_stories}</dd>
                                        </dl>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white overflow-hidden shadow rounded-lg">
                            <div className="p-5">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <Clock className="h-6 w-6 text-yellow-400" />
                                    </div>
                                    <div className="ml-5 w-0 flex-1">
                                        <dl>
                                            <dt className="text-sm font-medium text-gray-500 truncate">Pending Stories</dt>
                                            <dd className="text-lg font-medium text-gray-900">{stats.pending_stories}</dd>
                                        </dl>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white overflow-hidden shadow rounded-lg">
                            <div className="p-5">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <Users className="h-6 w-6 text-blue-400" />
                                    </div>
                                    <div className="ml-5 w-0 flex-1">
                                        <dl>
                                            <dt className="text-sm font-medium text-gray-500 truncate">Total Users</dt>
                                            <dd className="text-lg font-medium text-gray-900">{stats.total_users}</dd>
                                        </dl>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white overflow-hidden shadow rounded-lg">
                            <div className="p-5">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <Building className="h-6 w-6 text-green-400" />
                                    </div>
                                    <div className="ml-5 w-0 flex-1">
                                        <dl>
                                            <dt className="text-sm font-medium text-gray-500 truncate">Organizations</dt>
                                            <dd className="text-lg font-medium text-gray-900">{stats.active_organizations}</dd>
                                        </dl>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Pending Stories Tab */}
                {activeTab === 'stories' && (
                    <div className="bg-white shadow overflow-hidden sm:rounded-md">
                        <div className="px-4 py-5 sm:px-6">
                            <h3 className="text-lg leading-6 font-medium text-gray-900">Pending Stories</h3>
                            <p className="mt-1 max-w-2xl text-sm text-gray-500">
                                Review and approve stories before they are published
                            </p>
                        </div>

                        {pendingStories.length === 0 ? (
                            <div className="text-center py-12">
                                <CheckCircle className="mx-auto h-12 w-12 text-green-400" />
                                <h3 className="mt-2 text-sm font-medium text-gray-900">No pending stories</h3>
                                <p className="mt-1 text-sm text-gray-500">All stories have been reviewed.</p>
                            </div>
                        ) : (
                            <ul className="divide-y divide-gray-200">
                                {pendingStories.map((story) => (
                                    <li key={story.id} className="px-4 py-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-sm font-medium text-gray-900 truncate">{story.title}</h4>
                                                <p className="text-sm text-gray-500 truncate">{story.content.substring(0, 100)}...</p>
                                                <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                                                    <span className="bg-gray-100 px-2 py-1 rounded">{story.category}</span>
                                                    <span>{story.region}</span>
                                                    <span>User ID: {story.user_id}</span>
                                                </div>
                                            </div>
                                            <div className="ml-4 flex-shrink-0 flex space-x-2">
                                                <button
                                                    onClick={() => approveStory(story.id)}
                                                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm flex items-center"
                                                >
                                                    <CheckCircle className="w-4 h-4 mr-1" />
                                                    Approve
                                                </button>
                                                <button
                                                    onClick={() => rejectStory(story.id)}
                                                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                                                >
                                                    Reject
                                                </button>
                                                <button
                                                    onClick={() => deleteStory(story.id)}
                                                    className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm flex items-center"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}

                {/* Organizations Tab */}
                {activeTab === 'organizations' && (
                    <OrganizationManager />
                )}
            </div>
        </div>
    );
};

export default AdminDashboard; 