import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Camera, MapPin, Zap, Shield, TrendingUp, Cpu, Send, BarChart3,
    ArrowRight, ImagePlus, FileText, LocateFixed, Siren, FileWarning,
    Sprout, Building2, Users, Sparkles, CheckCircle2, Clock, ClipboardList,
    X, Loader2, PhoneCall
} from 'lucide-react';
import { getNearbyComplaints } from '../../services/api';
import EmergencySOSModal from '../../components/Emergency/EmergencySOSModal';
import HelplineDirectoryModal from '../../components/Emergency/HelplineDirectoryModal';
import EmergencyAlertsBanner from '../../components/Emergency/EmergencyAlertsBanner';
import heroImage from '../../assets/hero-ai-city.png';
import './Home.css';

const Home = () => {
    const navigate = useNavigate();
    const [nearby, setNearby] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sosOpen, setSosOpen] = useState(false);
    const [helplinesOpen, setHelplinesOpen] = useState(false);

    useEffect(() => {
        getNearbyComplaints(18.52, 73.85)
            .then((res) => {
                if (res?.complaints) setNearby(res.complaints);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    return (
        <div className="home-page">
            <EmergencyAlertsBanner onOpenHelplines={() => setHelplinesOpen(true)} />

            {/* Hero Section */}
            <section className="hero">
                <div className="container">
                    <div className="hero-inner">
                        <div className="hero-text animate-fade-in">
                            <div className="hero-badge">
                                <Sparkles size={14} /> AI-powered community assistance & emergency response
                            </div>
                            <h1>Community care,<br /><span>intelligently connected.</span></h1>
                            <p className="hero-desc">
                                Report civic problems, request emergency response with precise GPS, connect with verified
                                responders, and track case progress in real time.
                            </p>
                            <div className="hero-actions">
                                <Link to="/submit" className="btn btn-primary btn-lg">
                                    <Camera size={16} /> Report an Issue
                                </Link>
                                <button
                                    type="button"
                                    className="btn btn-danger btn-lg btn-sos-hero"
                                    onClick={() => setSosOpen(true)}
                                    style={{ background: '#dc2626', borderColor: '#dc2626', color: '#fff', fontWeight: 700 }}
                                >
                                    <Siren size={18} /> Emergency SOS
                                </button>
                                <Link to="/emergency" className="btn btn-outline btn-lg">
                                    <Shield size={16} /> Emergency Center
                                </Link>
                            </div>
                        </div>
                        <div className="hero-image animate-fade-in">
                            <img
                                src={heroImage}
                                alt="Pune Smart City"
                                className="hero-img"
                                onError={(e) => {
                                    e.target.src = 'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=600&h=400&fit=crop';
                                }}
                            />
                        </div>
                    </div>
                    <div className="hero-trust animate-fade-in">
                        {[
                            { icon: <Sparkles size={15} />, label: 'AI powered' },
                            { icon: <Clock size={15} />, label: 'Real-time updates' },
                            { icon: <CheckCircle2 size={15} />, label: 'Verified responders' },
                            { icon: <Shield size={15} />, label: 'Secure & role-based' },
                        ].map((item) => (
                            <span key={item.label}>{item.icon}{item.label}</span>
                        ))}
                    </div>
                </div>
            </section>

            {/* Quick Report Section */}
            <section className="quick-report-section">
                <div className="container">
                    <div className="quick-report-card">
                        <div className="quick-report-copy">
                            <span className="quick-report-kicker">Quick assistance</span>
                            <h2>Report a problem</h2>
                            <p>Tell SAHAYA what you need help with.</p>
                        </div>
                        <div className="quick-report-actions">
                            <button
                                type="button"
                                className="quick-report-action quick-report-action-danger"
                                onClick={() => setSosOpen(true)}
                                style={{ background: '#fee2e2', borderColor: '#fca5a5' }}
                            >
                                <span className="quick-report-action-icon" style={{ background: '#ef4444', color: '#fff' }}>
                                    <Siren size={19} />
                                </span>
                                <span>
                                    <strong style={{ color: '#991b1b' }}>Emergency SOS</strong>
                                    <small style={{ color: '#b91c1c' }}>Urgent danger or medical help</small>
                                </span>
                                <ArrowRight size={16} style={{ color: '#991b1b' }} />
                            </button>
                            <Link to="/submit" className="quick-report-action quick-report-action-primary">
                                <span className="quick-report-action-icon"><ImagePlus size={19} /></span>
                                <span><strong>Upload Photo</strong><small>Show us the problem</small></span>
                                <ArrowRight size={16} />
                            </Link>
                            <Link to="/emergency" className="quick-report-action">
                                <span className="quick-report-action-icon"><Shield size={19} /></span>
                                <span><strong>Emergency Tracking</strong><small>Track active emergencies</small></span>
                                <ArrowRight size={16} />
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Capabilities Section */}
            <section className="capabilities-section">
                <div className="container">
                    <div className="section-header">
                        <span className="section-kicker">One connected platform</span>
                        <h2>Support for everyday needs and urgent moments.</h2>
                        <p>SAHAYA brings civic services, assistance and emergency response into one clear experience.</p>
                    </div>
                    <div className="capabilities-grid">
                        {[
                            { icon: <Siren size={20} />, title: 'Emergency Response', desc: '12 emergency categories, GPS auto-detect, verified responders matching, and real-time live dispatch.', action: () => navigate('/emergency') },
                            { icon: <FileWarning size={20} />, title: 'Civic Issues', desc: 'Report potholes, garbage, streetlights, road damage and municipal issues with AI classification.', action: () => navigate('/submit') },
                            { icon: <Sprout size={20} />, title: 'Farmer Support', desc: 'Get AI-powered crop health diagnostics, water footprint calculation and government schemes.', soon: false, action: () => navigate('/dashboard/farmer') },
                            { icon: <Building2 size={20} />, title: 'Government Helplines', desc: 'Direct access to official 112, Police, Fire, Ambulance and Disaster helplines.', action: () => setHelplinesOpen(true) },
                            { icon: <Users size={20} />, title: 'Verified Responders', desc: 'Trained first aiders, firefighters, linemen, and disaster personnel assigned by location and skill.', action: () => navigate('/emergency') },
                            { icon: <Sparkles size={20} />, title: 'Emergency AI Assistant', desc: 'Transparent rule-based triage and AI category guidance without clinical claims.', action: () => setSosOpen(true) },
                        ].map((item) => (
                            <div key={item.title} className="capability-card" onClick={item.action} style={{ cursor: 'pointer' }}>
                                <div className="capability-icon">{item.icon}</div>
                                <div>
                                    <div className="capability-title-row">
                                        <h3>{item.title}</h3>
                                        {item.soon && <span>Coming soon</span>}
                                    </div>
                                    <p>{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How It Works Section */}
            <section className="how-section">
                <div className="container">
                    <div className="section-header">
                        <span className="section-kicker">Connected response</span>
                        <h2>How SAHAYA AI works</h2>
                        <p>From the moment an emergency or civic request is submitted to resolution, SAHAYA keeps citizens and authorized responders coordinated.</p>
                    </div>
                    <div className="steps-grid">
                        {[
                            { num: '01', title: 'SOS Report', desc: 'Submit emergency with browser GPS, photo, and reported hazards.' },
                            { num: '02', title: 'Triage Engine', desc: 'Transparent priority assessment (Critical, High, Medium, Low).' },
                            { num: '03', title: 'Smart Dispatch', desc: 'Dispatcher matches verified eligible responders by skills and proximity.' },
                            { num: '04', title: 'Responder Deployment', desc: 'Assigned responder accepts, navigates to scene, and provides on-site care.' },
                            { num: '05', title: 'Live Tracking', desc: 'Live status transitions, timeline audit log, and direct communication.' },
                            { num: '06', title: 'Resolution & Audit', desc: 'Responders file resolution evidence, audited and verified by dispatchers.' },
                        ].map((s, i) => (
                            <div key={i} className="step-card animate-fade-in" style={{ animationDelay: `${i * 0.1}s` }}>
                                <div className="step-num">{s.num}</div>
                                <h3>{s.title}</h3>
                                <p>{s.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <EmergencySOSModal
                isOpen={sosOpen}
                onClose={() => setSosOpen(false)}
            />

            <HelplineDirectoryModal
                isOpen={helplinesOpen}
                onClose={() => setHelplinesOpen(false)}
            />
        </div>
    );
};

export default Home;
