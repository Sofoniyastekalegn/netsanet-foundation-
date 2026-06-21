import { useState, useEffect } from 'react';
import { BookOpen, Filter, Heart, CheckCircle, Clock } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import API_BASE_URL from '../config';

interface Story {
    id: number;
    title: string;
    content: string;
    category: string;
    region: string;
    outcome: string;
    is_approved?: boolean;
}

const CaseStories = () => {
    const { isAdmin } = useAuth();
    const [stories, setStories] = useState<Story[]>([]);
    const [filteredStories, setFilteredStories] = useState<Story[]>([]);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedRegion, setSelectedRegion] = useState('');
    const [loading, setLoading] = useState(true);

    const categories = [
        'All Categories',
        'domestic_violence',
        'workplace_discrimination',
        'property_rights',
        'inheritance_dispute',
        'child_custody',
        'marital_rights'
    ];

    const regions = [
        'All Regions',
        'Addis Ababa',
        'Tigray',
        'Oromia',
        'Amhara',
        'SNNPR',
        'Afar',
        'Somali',
        'Benishangul-Gumuz',
        'Gambella',
        'Harari',
        'Dire Dawa'
    ];

    const categoryLabels = {
        domestic_violence: 'Domestic Violence',
        workplace_discrimination: 'Workplace Discrimination',
        property_rights: 'Property Rights',
        inheritance_dispute: 'Inheritance Dispute',
        child_custody: 'Child Custody',
        marital_rights: 'Marital Rights'
    };

    useEffect(() => {
        fetchStories();
    }, []);

    useEffect(() => {
        let filtered = stories;

        if (selectedCategory && selectedCategory !== 'All Categories') {
            filtered = filtered.filter(story => story.category === selectedCategory);
        }

        if (selectedRegion && selectedRegion !== 'All Regions') {
            filtered = filtered.filter(story => story.region === selectedRegion);
        }

        setFilteredStories(filtered);
    }, [selectedCategory, selectedRegion, stories]);

    const fetchStories = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/case-stories`);
            setStories(response.data.stories);
            setFilteredStories(response.data.stories);
        } catch (error) {
            console.error('Error fetching stories:', error);
        } finally {
            setLoading(false);
        }
    };

    const approveStory = async (storyId: number) => {
        try {
            await axios.post(`${API_BASE_URL}/api/approve-story/${storyId}`);
            // Refresh stories after approval
            fetchStories();
            alert('Story approved successfully!');
        } catch (error) {
            console.error('Error approving story:', error);
            alert('Error approving story. Please try again.');
        }
    };

    if (loading) {
        return (
            <div className="case-stories">
                <div className="container">
                    <div className="loading">Loading inspiring stories...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="py-10">
            <div className="max-w-7xl mx-auto px-5">
                <div className="text-center mb-10 py-10">
                    <BookOpen className="w-12 h-12 text-primary-500 mb-4 mx-auto" />
                    <h1 className="text-4xl font-bold text-gray-900 mb-3">Case Stories</h1>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">Read inspiring stories from other women who have overcome similar challenges</p>
                </div>

                <div className="mb-10">
                    <div className="card flex justify-between items-center mb-8">
                        <div className="flex items-center gap-4">
                            <Filter className="w-5 h-5 text-gray-600" />
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-lg bg-white"
                            >
                                {categories.map((category) => (
                                    <option key={category} value={category}>
                                        {category === 'All Categories' ? 'All Categories' : categoryLabels[category as keyof typeof categoryLabels]}
                                    </option>
                                ))}
                            </select>
                            <select
                                value={selectedRegion}
                                onChange={(e) => setSelectedRegion(e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-lg bg-white"
                            >
                                {regions.map((region) => (
                                    <option key={region} value={region}>{region}</option>
                                ))}
                            </select>
                        </div>
                        <p className="text-gray-600 font-medium">
                            {filteredStories.length} story{filteredStories.length !== 1 ? 'ies' : 'y'} found
                        </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {filteredStories.map((story) => (
                            <div key={story.id} className={`card ${story.is_approved === false ? 'border-l-4 border-yellow-500' : ''}`}>
                                <div className="mb-5">
                                    <div className="flex justify-between items-start mb-3">
                                        <h3 className="text-xl font-semibold text-gray-900">{story.title}</h3>
                                        {story.is_approved === false && (
                                            <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                Pending
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex gap-3">
                                        <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-medium">
                                            {categoryLabels[story.category as keyof typeof categoryLabels]}
                                        </span>
                                        <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-medium">
                                            {story.region}
                                        </span>
                                    </div>
                                </div>

                                <div className="mb-5">
                                    <p className="text-gray-600 leading-relaxed">{story.content}</p>
                                </div>

                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2 text-green-600">
                                        <Heart className="w-4 h-4" />
                                        <span className="font-medium">
                                            {story.outcome === 'positive' ? 'Positive Outcome' : 'Case Resolved'}
                                        </span>
                                    </div>

                                    {story.is_approved === false && (
                                        <button
                                            onClick={() => approveStory(story.id)}
                                            className="btn btn-primary btn-small"
                                        >
                                            <CheckCircle className="w-4 h-4" />
                                            Approve
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {filteredStories.length === 0 && (
                        <div className="text-center py-10">
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">No stories found</h3>
                            <p className="text-gray-600">Try selecting different filters or check back later for new stories.</p>
                        </div>
                    )}
                </div>

                {!isAdmin && (
                    <div className="card text-center">
                        <h3 className="text-2xl font-bold mb-4 text-gray-900">Share Your Story</h3>
                        <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
                            Your experience can inspire and help other women. Share your story anonymously
                            on our Story Wall to support the community.
                        </p>
                        <a href="/story-wall" className="btn btn-primary">
                            Share Your Story
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CaseStories; 