import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Siren, Clock, CheckCircle2, AlertTriangle, Shield, PhoneCall,
    Search, Filter, ChevronRight, MapPin, Sparkles, RefreshCw, Eye
} from 'lucide-react';
import { getMyEmergencies } from '../../services/emergencyApi';
import EmergencySOSModal from '../../components/Emergency/EmergencySOSModal';
import HelplineDirectoryModal from '../../components/Emergency/HelplineDirectoryModal';
import EmergencyAlertsBanner from '../../components/Emergency/EmergencyAlertsBanner';
import './CitizenEmergency.css';

const CitizenEmergency = () => {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('civicai_user') || '{}');

    const [cases, setCases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [sosModalOpen, setSosModalOpen] = useState(false);
    const [helplinesOpen, setHelplinesOpen] = useState(false);

    const loadCases = (showLoading = true) => {
        if (showLoading) setLoading(true);
        getMyEmergencies(user.phone, user.id)
            .then((res) => {
                if (res?.cases) setCases(res.cases);
            })
            .catch(() => {})
            .finally(() => {
                if (showLoading) setLoading(false);
            });
    };

    useEffect(() => {
        loadCases(true);

        // Auto-refresh cases every 5 seconds for real-time lifecycle tracking
        const pollTimer = setInterval(() => {
            loadCases(false);
        }, 5000);

        return () => clearInterval(pollTimer);
    }, [user.phone, user.id]);

    const activeCases = cases.filter(
        (c) => !['RESOLVED', 'CLOSED', 'CANCELLED', 'REJECTED'].includes(c.status)
    );

    const filteredCases = cases.filter((c) => {
        if (filterStatus === 'active') {
            if (['RESOLVED', 'CLOSED', 'CANCELLED', 'REJECTED'].includes(c.status)) return false;
        } else if (filterStatus === 'resolved') {
            if (!['RESOLVED', 'CLOSED'].includes(c.status)) return false;
        }
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            return (
                c.reference_no.toLowerCase().includes(q) ||
                c.category_name.toLowerCase().includes(q) ||
                c.description.toLowerCase().includes(q) ||
                (c.address && c.address.toLowerCase().includes(q))
            );
        }
        return true;
    });

    return (
        <div className="citizen-emergency-page">
            <EmergencyAlertsBanner onOpenHelplines={() => setHelplinesOpen(true)} />

            <div className="container emergency-container">
                {/* Header Action Banner */}
                <div className="emergency-hero-banner">
                    <div className="hero-left">
                        <div className="emergency-badge">
                            <Siren size={15} /> Emergency Response Center
                        </div>
                        <h1>Rapid Community Assistance & Emergency Coordination</h1>
                        <p>
                            Report life safety, fire, accident, or hazard emergencies. Connect directly with
                            verified internal response personnel and track progress in real time.
                        </p>
                        <div className="hero-disclaimer">
                            <Shield size={14} />
                            <span>
                                In life-threatening emergencies, also dial <strong>112</strong> for primary government response.
                            </span>
                        </div>
                    </div>
                    <div className="hero-right">
                        <button
                            type="button"
                            className="btn-trigger-sos"
                            onClick={() => setSosModalOpen(true)}
                        >
                            <Siren size={22} className="siren-pulse" />
                            <span>EMERGENCY SOS</span>
                        </button>
                    </div>
                </div>

                {/* Active Incident Banner (if any) */}
                {activeCases.length > 0 && (
                    <div className="active-incident-card animate-fade-in">
                        <div className="active-incident-header">
                            <span className="live-pulse-dot" />
                            <div className="active-incident-title">
                                <strong>Active Incident in Progress</strong>
                                <span>Reference: {activeCases[0].reference_no}</span>
                            </div>
                            <span className={`severity-tag severity-${(activeCases[0].severity || 'HIGH').toLowerCase()}`}>
                                {activeCases[0].severity}
                            </span>
                        </div>
                        <div className="active-incident-body">
                            <div className="active-meta-item">
                                <span className="meta-label">Category:</span>
                                <strong>{activeCases[0].category_name}</strong>
                            </div>
                            <div className="active-meta-item">
                                <span className="meta-label">Status:</span>
                                <strong className="text-primary">{activeCases[0].status}</strong>
                            </div>
                            <div className="active-meta-item">
                                <span className="meta-label">Location:</span>
                                <span>{activeCases[0].address || 'Coordinates logged'}</span>
                            </div>
                            <div className="active-meta-item">
                                <span className="meta-label">Responder:</span>
                                <span>{activeCases[0].assigned_responder_name || 'Matching nearest verified responder...'}</span>
                            </div>
                        </div>
                        <div className="active-incident-footer">
                            <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                onClick={() => navigate(`/emergency/case/${activeCases[0].case_id}`)}
                            >
                                Track Progress & Chat with Responders <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>
                )}

                {/* Case History Section */}
                <div className="emergency-history-section">
                    <div className="section-title-row">
                        <div>
                            <h2>My Emergency Incidents</h2>
                            <p className="text-muted">Private record of your reported community emergencies</p>
                        </div>
                        <div className="filter-controls">
                            <div className="search-input-wrap">
                                <Search size={14} className="search-icon" />
                                <input
                                    type="text"
                                    placeholder="Search by reference or keyword..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <div className="status-filter-pills">
                                <button
                                    type="button"
                                    className={`pill-btn ${filterStatus === 'all' ? 'active' : ''}`}
                                    onClick={() => setFilterStatus('all')}
                                >
                                    All ({cases.length})
                                </button>
                                <button
                                    type="button"
                                    className={`pill-btn ${filterStatus === 'active' ? 'active' : ''}`}
                                    onClick={() => setFilterStatus('active')}
                                >
                                    Active ({activeCases.length})
                                </button>
                                <button
                                    type="button"
                                    className={`pill-btn ${filterStatus === 'resolved' ? 'active' : ''}`}
                                    onClick={() => setFilterStatus('resolved')}
                                >
                                    Resolved
                                </button>
                            </div>
                            <button
                                type="button"
                                className="btn-refresh"
                                onClick={loadCases}
                                title="Refresh Cases"
                            >
                                <RefreshCw size={14} className={loading ? 'spin-icon' : ''} />
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="empty-state-card">
                            <div className="spinner" />
                            <p>Loading your emergency cases...</p>
                        </div>
                    ) : filteredCases.length === 0 ? (
                        <div className="empty-state-card">
                            <Shield size={40} className="empty-icon text-muted" />
                            <h3>No Emergency Cases Found</h3>
                            <p className="text-muted">
                                {searchQuery || filterStatus !== 'all'
                                    ? 'No cases match your filter criteria.'
                                    : 'You have not submitted any emergency reports. In case of need, use the Emergency SOS button.'}
                            </p>
                            <button
                                type="button"
                                className="btn btn-danger btn-sm"
                                onClick={() => setSosModalOpen(true)}
                                style={{ marginTop: '12px' }}
                            >
                                <Siren size={15} /> Emergency SOS
                            </button>
                        </div>
                    ) : (
                        <div className="cases-grid">
                            {filteredCases.map((item) => (
                                <div
                                    key={item.case_id}
                                    className="case-card animate-fade-in"
                                    onClick={() => navigate(`/emergency/case/${item.case_id}`)}
                                >
                                    <div className="case-card-header">
                                        <div className="case-ref-col">
                                            <span className="case-ref-tag">{item.reference_no}</span>
                                            <span className="case-category">{item.category_name}</span>
                                        </div>
                                        <span className={`severity-tag severity-${(item.severity || 'HIGH').toLowerCase()}`}>
                                            {item.severity}
                                        </span>
                                    </div>

                                    <p className="case-desc">{item.description}</p>

                                    <div className="case-card-meta">
                                        <div className="meta-line">
                                            <MapPin size={13} />
                                            <span>{item.address || 'Location Tagged'}</span>
                                        </div>
                                        <div className="meta-line">
                                            <Clock size={13} />
                                            <span>
                                                {item.created_at ? new Date(item.created_at).toLocaleString() : 'Recent'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="case-card-footer">
                                        <div className="status-indicator">
                                            <span className={`status-dot status-${item.status.toLowerCase()}`} />
                                            <strong>{item.status.replace('_', ' ')}</strong>
                                        </div>
                                        <span className="view-case-link">
                                            View Details <ChevronRight size={14} />
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <EmergencySOSModal
                isOpen={sosModalOpen}
                onClose={() => {
                    setSosModalOpen(false);
                    loadCases();
                }}
            />

            <HelplineDirectoryModal
                isOpen={helplinesOpen}
                onClose={() => setHelplinesOpen(false)}
            />
        </div>
    );
};

export default CitizenEmergency;

