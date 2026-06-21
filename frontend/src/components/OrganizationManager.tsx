import { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE_URL from '../config';
import {
    Building,
    Plus,
    Edit,
    Trash2,
    Save,
    X,
    MapPin,
    Phone,
    Globe,
    Users
} from 'lucide-react';

interface Organization {
    id: number;
    name: string;
    region: string;
    services: string[];
    contact: string;
    address: string;
    website?: string;
    is_active: boolean;
    created_at: string;
}

interface OrganizationForm {
    name: string;
    region: string;
    services: string[];
    contact: string;
    address: string;
    website: string;
}

const OrganizationManager = () => {
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
    const [formData, setFormData] = useState<OrganizationForm>({
        name: '',
        region: '',
        services: [],
        contact: '',
        address: '',
        website: ''
    });
    const [newService, setNewService] = useState('');

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

    const commonServices = [
        'Legal Aid',
        'Counseling',
        'Shelter',
        'Rights Education',
        'Advocacy',
        'Rehabilitation',
        'Community Support',
        'Training',
        'Emergency Support',
        'Medical Assistance'
    ];

    useEffect(() => {
        fetchOrganizations();
    }, []);

    const fetchOrganizations = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/admin/organizations`);
            setOrganizations(response.data.organizations);
        } catch (error) {
            console.error('Error fetching organizations:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const addService = () => {
        if (newService.trim() && !formData.services.includes(newService.trim())) {
            setFormData(prev => ({
                ...prev,
                services: [...prev.services, newService.trim()]
            }));
            setNewService('');
        }
    };

    const removeService = (service: string) => {
        setFormData(prev => ({
            ...prev,
            services: prev.services.filter(s => s !== service)
        }));
    };

    const addCommonService = (service: string) => {
        if (!formData.services.includes(service)) {
            setFormData(prev => ({
                ...prev,
                services: [...prev.services, service]
            }));
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            region: '',
            services: [],
            contact: '',
            address: '',
            website: ''
        });
        setNewService('');
        setEditingOrg(null);
        setShowForm(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name || !formData.region || !formData.contact || !formData.address || formData.services.length === 0) {
            alert('Please fill in all required fields including at least one service');
            return;
        }

        // Format website URL if provided
        let formattedWebsite = formData.website;
        if (formattedWebsite && !formattedWebsite.startsWith('http://') && !formattedWebsite.startsWith('https://')) {
            formattedWebsite = 'https://' + formattedWebsite;
        }

        try {
            const submitData = {
                ...formData,
                website: formattedWebsite
            };

            if (editingOrg) {
                await axios.put(`${API_BASE_URL}/admin/organizations/${editingOrg.id}`, submitData);
                alert('Organization updated successfully!');
            } else {
                await axios.post(`${API_BASE_URL}/admin/organizations`, submitData);
                alert('Organization created successfully!');
            }

            fetchOrganizations();
            resetForm();
        } catch (error) {
            console.error('Error saving organization:', error);
            alert('Error saving organization. Please try again.');
        }
    };

    const handleEdit = (org: Organization) => {
        setEditingOrg(org);
        setFormData({
            name: org.name,
            region: org.region,
            services: org.services,
            contact: org.contact,
            address: org.address,
            website: org.website || ''
        });
        setShowForm(true);
    };

    const handleDelete = async (orgId: number) => {
        if (!confirm('Are you sure you want to delete this organization? This action cannot be undone.')) {
            return;
        }

        try {
            await axios.delete(`${API_BASE_URL}/admin/organizations/${orgId}`);
            alert('Organization deleted successfully!');
            fetchOrganizations();
        } catch (error) {
            console.error('Error deleting organization:', error);
            alert('Error deleting organization. Please try again.');
        }
    };

    const toggleActive = async (org: Organization) => {
        try {
            await axios.put(`${API_BASE_URL}/admin/organizations/${org.id}`, {
                ...org,
                is_active: !org.is_active
            });
            fetchOrganizations();
        } catch (error) {
            console.error('Error updating organization:', error);
            alert('Error updating organization. Please try again.');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading organizations...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Support Organizations</h2>
                    <p className="text-gray-600 mt-1">Manage support organizations and their information</p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Organization
                </button>
            </div>

            {/* Organization Form */}
            {showForm && (
                <div className="bg-white shadow-lg rounded-lg p-6 border">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-semibold text-gray-900">
                            {editingOrg ? 'Edit Organization' : 'Add New Organization'}
                        </h3>
                        <button
                            onClick={resetForm}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Organization Name *
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    required
                                    className="form-input w-full"
                                    placeholder="Enter organization name"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Region *
                                </label>
                                <select
                                    name="region"
                                    value={formData.region}
                                    onChange={handleInputChange}
                                    required
                                    className="form-select w-full"
                                >
                                    <option value="">Select region</option>
                                    {regions.map((region) => (
                                        <option key={region} value={region}>{region}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Contact Information *
                            </label>
                            <input
                                type="text"
                                name="contact"
                                value={formData.contact}
                                onChange={handleInputChange}
                                required
                                className="form-input w-full"
                                placeholder="Phone number or email"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Address *
                            </label>
                            <textarea
                                name="address"
                                value={formData.address}
                                onChange={handleInputChange}
                                required
                                rows={3}
                                className="form-textarea w-full"
                                placeholder="Enter full address"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Website (Optional)
                            </label>
                            <input
                                type="text"
                                name="website"
                                value={formData.website}
                                onChange={handleInputChange}
                                className="form-input w-full"
                                placeholder="https://example.com"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Services *
                            </label>

                            {/* Common Services */}
                            <div className="mb-4">
                                <p className="text-sm text-gray-600 mb-2">Common services (click to add):</p>
                                <div className="flex flex-wrap gap-2">
                                    {commonServices.map((service) => (
                                        <button
                                            key={service}
                                            type="button"
                                            onClick={() => addCommonService(service)}
                                            disabled={formData.services.includes(service)}
                                            className={`px-3 py-1 rounded-full text-xs font-medium ${formData.services.includes(service)
                                                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                                }`}
                                        >
                                            {service}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Custom Service Input */}
                            <div className="flex gap-2 mb-4">
                                <input
                                    type="text"
                                    value={newService}
                                    onChange={(e) => setNewService(e.target.value)}
                                    placeholder="Add custom service"
                                    className="form-input flex-1"
                                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addService())}
                                />
                                <button
                                    type="button"
                                    onClick={addService}
                                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm"
                                >
                                    Add
                                </button>
                            </div>

                            {/* Selected Services */}
                            {formData.services.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-sm text-gray-600">Selected services:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {formData.services.map((service) => (
                                            <span
                                                key={service}
                                                className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                                            >
                                                {service}
                                                <button
                                                    type="button"
                                                    onClick={() => removeService(service)}
                                                    className="text-green-600 hover:text-green-800"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-4 justify-end">
                            <button
                                type="button"
                                onClick={resetForm}
                                className="btn btn-secondary"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary"
                            >
                                <Save className="w-4 h-4 mr-2" />
                                {editingOrg ? 'Update Organization' : 'Create Organization'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Organizations List */}
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
                {organizations.length === 0 ? (
                    <div className="text-center py-12">
                        <Building className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No organizations</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            Get started by creating a new support organization.
                        </p>
                        <div className="mt-6">
                            <button
                                onClick={() => setShowForm(true)}
                                className="btn btn-primary"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Add Organization
                            </button>
                        </div>
                    </div>
                ) : (
                    <ul className="divide-y divide-gray-200">
                        {organizations.map((org) => (
                            <li key={org.id} className="px-6 py-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h4 className="text-lg font-medium text-gray-900">{org.name}</h4>
                                                <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                                                    <span className="flex items-center">
                                                        <MapPin className="w-4 h-4 mr-1" />
                                                        {org.region}
                                                    </span>
                                                    <span className="flex items-center">
                                                        <Phone className="w-4 h-4 mr-1" />
                                                        {org.contact}
                                                    </span>
                                                    {org.website && (
                                                        <span className="flex items-center">
                                                            <Globe className="w-4 h-4 mr-1" />
                                                            <a href={org.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                                                                Website
                                                            </a>
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${org.is_active
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-red-100 text-red-800'
                                                    }`}>
                                                    {org.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="mt-3">
                                            <p className="text-sm text-gray-600 mb-2">{org.address}</p>
                                            <div className="flex flex-wrap gap-1">
                                                {org.services.map((service) => (
                                                    <span
                                                        key={service}
                                                        className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs"
                                                    >
                                                        {service}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="ml-4 flex-shrink-0 flex space-x-2">
                                        <button
                                            onClick={() => handleEdit(org)}
                                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm flex items-center"
                                        >
                                            <Edit className="w-4 h-4 mr-1" />
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => toggleActive(org)}
                                            className={`px-3 py-1 rounded text-sm flex items-center ${org.is_active
                                                ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                                                : 'bg-green-600 hover:bg-green-700 text-white'
                                                }`}
                                        >
                                            {org.is_active ? 'Deactivate' : 'Activate'}
                                        </button>
                                        <button
                                            onClick={() => handleDelete(org.id)}
                                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm flex items-center"
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
        </div>
    );
};

export default OrganizationManager; 