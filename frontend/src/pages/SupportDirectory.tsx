import { useState, useEffect } from 'react';
import { Users, Phone, MapPin, Globe, Filter } from 'lucide-react';
import axios from 'axios';
import API_BASE_URL from '../config';

interface Organization {
    name: string;
    region: string;
    services: string[];
    contact: string;
    address: string;
    website: string;
}

const SupportDirectory = () => {
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [filteredOrgs, setFilteredOrgs] = useState<Organization[]>([]);
    const [selectedRegion, setSelectedRegion] = useState('');
    const [loading, setLoading] = useState(true);

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

    useEffect(() => {
        fetchOrganizations();
    }, []);

    useEffect(() => {
        if (selectedRegion === 'All Regions' || selectedRegion === '') {
            setFilteredOrgs(organizations);
        } else {
            setFilteredOrgs(organizations.filter(org => org.region === selectedRegion));
        }
    }, [selectedRegion, organizations]);

    const fetchOrganizations = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/support-organizations`);
            setOrganizations(response.data.organizations);
            setFilteredOrgs(response.data.organizations);
        } catch (error) {
            console.error('Error fetching organizations:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="support-directory">
                <div className="container">
                    <div className="loading">Loading support organizations...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="py-10">
            <div className="max-w-7xl mx-auto px-5">
                <div className="text-center mb-10 py-10">
                    <Users className="w-12 h-12 text-primary-500 mb-4 mx-auto" />
                    <h1 className="text-4xl font-bold text-gray-900 mb-3">Support Directory</h1>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">Find legal aid organizations and support services in your region</p>
                </div>

                <div className="mb-10">
                    <div className="card flex justify-between items-center mb-8">
                        <div className="flex items-center gap-4">
                            <Filter className="w-5 h-5 text-gray-600" />
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
                            {filteredOrgs.length} organization{filteredOrgs.length !== 1 ? 's' : ''} found
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredOrgs.map((org, index) => (
                            <div key={index} className="card">
                                <div className="flex justify-between items-start mb-5">
                                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{org.name}</h3>
                                    <span className="bg-primary-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                                        {org.region}
                                    </span>
                                </div>

                                <div className="mb-5">
                                    <h4 className="font-medium text-gray-900 mb-3">Services Offered:</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {org.services.map((service, serviceIndex) => (
                                            <span key={serviceIndex} className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-medium">
                                                {service}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 text-gray-600">
                                        <Phone className="w-4 h-4 text-primary-500" />
                                        <span>{org.contact}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-gray-600">
                                        <MapPin className="w-4 h-4 text-primary-500" />
                                        <span>{org.address}</span>
                                    </div>
                                    {org.website && (
                                        <div className="flex items-center gap-3">
                                            <Globe className="w-4 h-4 text-primary-500" />
                                            <a href={`https://${org.website}`} target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:underline">
                                                {org.website}
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {filteredOrgs.length === 0 && (
                        <div className="text-center py-10">
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">No organizations found</h3>
                            <p className="text-gray-600">Try selecting a different region or contact us for assistance.</p>
                        </div>
                    )}
                </div>

                <div className="card">
                    <h3 className="text-2xl font-bold mb-5 text-gray-900">Emergency Contacts</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div className="text-center p-5 bg-gray-50 rounded-lg">
                            <h4 className="font-semibold text-gray-900 mb-2">Police Emergency</h4>
                            <p className="text-primary-500 font-bold text-lg">911</p>
                        </div>
                        <div className="text-center p-5 bg-gray-50 rounded-lg">
                            <h4 className="font-semibold text-gray-900 mb-2">Women's Helpline</h4>
                            <p className="text-primary-500 font-bold text-lg">+251 11 123 4567</p>
                        </div>
                        <div className="text-center p-5 bg-gray-50 rounded-lg">
                            <h4 className="font-semibold text-gray-900 mb-2">Legal Aid Hotline</h4>
                            <p className="text-primary-500 font-bold text-lg">+251 11 987 6543</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SupportDirectory; 