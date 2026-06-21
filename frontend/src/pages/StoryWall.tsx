import { useState } from 'react';
import { Heart, Send } from 'lucide-react';
import axios from 'axios';
import API_BASE_URL from '../config';

const StoryWall = () => {
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        category: '',
        region: ''
    });
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const categories = [
        'domestic_violence',
        'workplace_discrimination',
        'property_rights',
        'inheritance_dispute',
        'child_custody',
        'marital_rights'
    ];

    const categoryLabels = {
        domestic_violence: 'Domestic Violence',
        workplace_discrimination: 'Workplace Discrimination',
        property_rights: 'Property Rights',
        inheritance_dispute: 'Inheritance Dispute',
        child_custody: 'Child Custody',
        marital_rights: 'Marital Rights'
    };

    const regions = [
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

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await axios.post(`${API_BASE_URL}/api/submit-story`, formData);
            setIsSubmitted(true);
        } catch (error: any) {
            console.error('Error submitting story:', error);
            if (error.response?.status === 500) {
                setError('Error submitting story. Please try again.');
            } else if (error.code === 'ERR_NETWORK') {
                setError('Network error. Please check your connection and try again.');
            } else {
                setError('Error submitting story. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    if (isSubmitted) {
        return (
            <div className="py-10">
                <div className="max-w-2xl mx-auto px-5">
                    <div className="card text-center">
                        <Heart className="w-12 h-12 text-green-500 mb-4 mx-auto" />
                        <h3 className="text-2xl font-bold mb-3 text-gray-900">Thank You for Sharing</h3>
                        <p className="text-gray-600 mb-6 leading-relaxed">
                            Your story has been submitted successfully and is now pending review.
                            Our team will review it to ensure it meets our community guidelines,
                            and it will be posted to help other women in similar situations.
                            This usually takes 24-48 hours. Your courage inspires us all.
                        </p>
                        <button
                            onClick={() => setIsSubmitted(false)}
                            className="btn btn-primary"
                        >
                            Share Another Story
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="py-10">
            <div className="max-w-4xl mx-auto px-5">
                <div className="text-center mb-10">
                    <Heart className="w-12 h-12 text-primary-500 mb-4 mx-auto" />
                    <h1 className="text-4xl font-bold text-gray-900 mb-3">Story Wall</h1>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        Share your experiences anonymously and connect with others.
                        Your story can inspire and help other women facing similar challenges.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Features */}
                    <div className="space-y-6">
                        <div className="card">
                            <h3 className="text-xl font-bold text-gray-900 mb-3">Anonymous & Safe</h3>
                            <p className="text-gray-600">
                                Share your story completely anonymously. Your privacy and safety are our top priority.
                                All stories are moderated to ensure a supportive environment.
                            </p>
                        </div>

                        <div className="card">
                            <h3 className="text-xl font-bold text-gray-900 mb-3">Support Community</h3>
                            <p className="text-gray-600">
                                Your story can inspire and help other women facing similar challenges.
                                Together, we create a community of strength and solidarity.
                            </p>
                        </div>

                        <div className="card">
                            <h3 className="text-xl font-bold text-gray-900 mb-3">Share Your Story</h3>
                            <p className="text-gray-600">
                                Your experience matters. Share your story to help others and find support
                                from women who understand what you've been through.
                            </p>
                        </div>
                    </div>

                    {/* Submission Form */}
                    <div className="lg:col-span-2">
                        <div className="card">
                            <h2 className="text-2xl font-bold text-gray-900 mb-6">Share Your Story</h2>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                                        Story Title *
                                    </label>
                                    <input
                                        type="text"
                                        id="title"
                                        name="title"
                                        value={formData.title}
                                        onChange={handleInputChange}
                                        required
                                        className="form-input w-full"
                                        placeholder="Give your story a meaningful title"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
                                        Your Story *
                                    </label>
                                    <textarea
                                        id="content"
                                        name="content"
                                        value={formData.content}
                                        onChange={handleInputChange}
                                        required
                                        rows={8}
                                        className="form-textarea w-full"
                                        placeholder="Share your experience, how you overcame challenges, and any advice you have for others..."
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                                            Category *
                                        </label>
                                        <select
                                            id="category"
                                            name="category"
                                            value={formData.category}
                                            onChange={handleInputChange}
                                            required
                                            className="form-select w-full"
                                        >
                                            <option value="">Select category</option>
                                            {categories.map((category) => (
                                                <option key={category} value={category}>
                                                    {categoryLabels[category as keyof typeof categoryLabels]}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label htmlFor="region" className="block text-sm font-medium text-gray-700 mb-2">
                                            Region (Optional)
                                        </label>
                                        <select
                                            id="region"
                                            name="region"
                                            value={formData.region}
                                            onChange={handleInputChange}
                                            className="form-select w-full"
                                        >
                                            <option value="">Select region</option>
                                            {regions.map((region) => (
                                                <option key={region} value={region}>{region}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading || !formData.title || !formData.content || !formData.category}
                                    className="btn btn-primary w-full"
                                >
                                    {loading ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                            Submitting Story...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-4 h-4 mr-2" />
                                            Share Your Story
                                        </>
                                    )}
                                </button>
                            </form>

                            {error && (
                                <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                                    {error}
                                </div>
                            )}
                        </div>

                        {/* Community Guidelines */}
                        <div className="card mt-6">
                            <h3 className="text-xl font-bold text-gray-900 mb-4">Community Guidelines</h3>
                            <ul className="space-y-2 text-gray-600">
                                <li>• Share your story respectfully and honestly</li>
                                <li>• Focus on your experience and how you overcame challenges</li>
                                <li>• Avoid sharing identifying information about others</li>
                                <li>• Be supportive and encouraging to others</li>
                                <li>• All stories are moderated before being posted</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StoryWall; 