import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    Siren, Clock, CheckCircle2, AlertTriangle, Shield, MapPin, Phone,
    Send, UserCheck, MessageSquare, Image as ImageIcon, ArrowLeft,
    RefreshCw, Wifi, WifiOff, Star, AlertCircle, Compass, ExternalLink,
    Paperclip, Check, ChevronRight, Car, Navigation, Radio
} from 'lucide-react';
import {
    getEmergencyDetail, sendEmergencyMessage, submitCitizenFeedback,
    reopenEmergency, EmergencySocketClient
} from '../../services/emergencyApi';
import { playDispatchChime, playMessagePing } from '../../utils/emergencyAudio';
import HelplineDirectoryModal from '../../components/Emergency/HelplineDirectoryModal';
import './EmergencyDetailView.css';

const LIFECYCLE_STEPS = [
    { key: 'CREATED', label: 'Reported' },
    { key: 'TRIAGED', label: 'Triaged' },
    { key: 'ASSIGNED', label: 'Assigned' },
    { key: 'ACCEPTED', label: 'Accepted' },
    { key: 'RESPONDING', label: 'En Route' },
    { key: 'ON_SCENE', label: 'On Scene' },
    { key: 'RESOLVED', label: 'Resolved' },
    { key: 'CLOSED', label: 'Closed' }
];

function getStepIndex(status) {
    if (status === 'TRIAGE_PENDING') return 0;
    if (status === 'UNASSIGNED') return 1;
    if (status === 'ESCALATED') return 2;
    if (status === 'REOPENED') return 1;
    const idx = LIFECYCLE_STEPS.findIndex((s) => s.key === status);
    return idx >= 0 ? idx : 0;
}

function calculateDistanceKm(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(2);
}

const EmergencyDetailView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('civicai_user') || '{}');

    const [caseData, setCaseData] = useState(null);
    const [timeline, setTimeline] = useState([]);
    const [messages, setMessages] = useState([]);
    const [attachments, setAttachments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [wsState, setWsState] = useState('offline'); // connected, reconnecting, offline
    const [liveTelemetry, setLiveTelemetry] = useState(null);
    const [activeTab, setActiveTab] = useState('timeline'); // timeline, chat, evidence, feedback
    const [newMessage, setNewMessage] = useState('');
    const [sendingMsg, setSendingMsg] = useState(false);

    // Feedback & Reopen state
    const [rating, setRating] = useState(5);
    const [feedbackText, setFeedbackText] = useState('');
    const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
    const [reopenReason, setReopenReason] = useState('');
    const [reopenOpen, setReopenOpen] = useState(false);
    const [helplinesOpen, setHelplinesOpen] = useState(false);

    const socketRef = useRef(null);
    const chatEndRef = useRef(null);

    const fetchCase = async () => {
        try {
            const res = await getEmergencyDetail(id);
            if (res?.case) {
                setCaseData(res.case);
                setTimeline(res.timeline || []);
                setMessages(res.messages || []);
                setAttachments(res.attachments || []);
            }
        } catch (err) {
            console.error('Failed to load emergency detail:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCase();

        // Initialize real-time WebSocket connection
        const clientId = `client_${user.id || 'anon'}_${Date.now()}`;
        const wsClient = new EmergencySocketClient({
            clientId,
            role: user.role || 'citizen',
            userId: user.id || 'citizen',
            onEvent: (event) => {
                if (event.type === 'emergency.location_update') {
                    setLiveTelemetry(event.payload);
                } else if (event.type === 'emergency.message') {
                    playMessagePing();
                    setMessages((prev) => [...prev, event.payload.message]);
                } else {
                    // Update state on lifecycle changes
                    playDispatchChime();
                    fetchCase();
                }
            },
            onStateChange: (state) => {
                setWsState(state);
            }
        });

        socketRef.current = wsClient;

        // Auto-poll fallback every 5s
        const pollTimer = setInterval(() => {
            fetchCase();
        }, 5000);

        return () => {
            clearInterval(pollTimer);
            wsClient.disconnect();
        };
    }, [id]);

    useEffect(() => {
        if (socketRef.current && caseData?.case_id) {
            socketRef.current.subscribeCase(caseData.case_id);
        }
    }, [caseData?.case_id]);

    useEffect(() => {
        if (activeTab === 'chat' && chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, activeTab]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !caseData) return;
        setSendingMsg(true);
        try {
            await sendEmergencyMessage(
                caseData.case_id,
                newMessage.trim(),
                user.id || 'usr_citizen',
                user.name || 'Citizen',
                user.role || 'citizen',
                false
            );
            setNewMessage('');
            fetchCase();
        } catch (err) {
            alert('Failed to send message: ' + err.message);
        } finally {
            setSendingMsg(false);
        }
    };

    const handleFeedbackSubmit = async (e) => {
        e.preventDefault();
        if (!caseData) return;
        try {
            await submitCitizenFeedback(caseData.case_id, rating, feedbackText);
            setFeedbackSubmitted(true);
            fetchCase();
        } catch (err) {
            alert('Failed to save feedback: ' + err.message);
        }
    };

    const handleReopenSubmit = async (e) => {
        e.preventDefault();
        if (!reopenReason.trim() || !caseData) return;
        try {
            await reopenEmergency(
                caseData.case_id,
                reopenReason.trim(),
                user.id || 'citizen',
                user.role || 'citizen',
                user.name || 'Citizen'
            );
            setReopenOpen(false);
            setReopenReason('');
            fetchCase();
        } catch (err) {
            alert('Failed to reopen case: ' + err.message);
        }
    };

    if (loading) {
        return (
            <div className="container" style={{ padding: '60px 16px', textAlign: 'center' }}>
                <div className="spinner" />
                <p style={{ marginTop: '14px', color: 'var(--text-muted)' }}>Retrieving emergency incident records...</p>
            </div>
        );
    }

    if (!caseData) {
        return (
            <div className="container" style={{ padding: '60px 16px', textAlign: 'center' }}>
                <AlertTriangle size={48} className="text-danger" style={{ marginBottom: '12px' }} />
                <h2>Emergency Incident Not Found</h2>
                <p className="text-muted" style={{ maxWidth: '420px', margin: '0 auto 16px' }}>
                    The incident reference may be invalid or you do not have permission to access this private emergency file.
                </p>
                <Link to="/emergency" className="btn btn-primary">Return to Emergency Dashboard</Link>
            </div>
        );
    }

    const currentStep = getStepIndex(caseData.status);
    const isResolvedOrClosed = ['RESOLVED', 'CLOSED'].includes(caseData.status);

    return (
        <div className="emergency-detail-page">
            <div className="container detail-container">
                {/* Back Nav and Connection Status */}
                <div className="detail-top-nav">
                    <button
                        type="button"
                        className="btn-back-link"
                        onClick={() => navigate('/emergency')}
                    >
                        <ArrowLeft size={16} /> All Emergencies
                    </button>

                    <div className="top-nav-badges">
                        <div className={`ws-badge ws-${wsState}`}>
                            {wsState === 'connected' ? <Wifi size={13} /> : <WifiOff size={13} />}
                            <span>Live Dispatch: {wsState.charAt(0).toUpperCase() + wsState.slice(1)}</span>
                        </div>
                        <button
                            type="button"
                            className="btn-refresh-sm"
                            onClick={fetchCase}
                            title="Refresh Case"
                        >
                            <RefreshCw size={13} />
                        </button>
                    </div>
                </div>

                {/* Case Header Card */}
                <div className="case-header-card">
                    <div className="header-meta-row">
                        <div>
                            <span className="ref-banner">{caseData.reference_no}</span>
                            <h1 className="header-category-title">{caseData.category_name}</h1>
                            <p className="header-desc">{caseData.description}</p>
                        </div>
                        <div className="header-tags-col">
                            <span className={`severity-tag severity-${(caseData.severity || 'HIGH').toLowerCase()}`}>
                                {caseData.severity} PRIORITY
                            </span>
                            <span className={`status-pill status-${caseData.status.toLowerCase()}`}>
                                {caseData.status.replace('_', ' ')}
                            </span>
                        </div>
                    </div>

                    {/* Visual Lifecycle Stepper */}
                    <div className="stepper-wrap">
                        <div className="stepper-track">
                            {LIFECYCLE_STEPS.map((step, idx) => {
                                const isPassed = idx <= currentStep;
                                const isCurrent = idx === currentStep;
                                return (
                                    <div
                                        key={step.key}
                                        className={`stepper-node ${isPassed ? 'passed' : ''} ${isCurrent ? 'current' : ''}`}
                                    >
                                        <div className="step-circle">
                                            {isPassed ? <Check size={12} /> : idx + 1}
                                        </div>
                                        <span className="step-name">{step.label}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Live Telemetry Tracking Banner when Responder is En Route or Broadcasting */}
                {(liveTelemetry || caseData.status === 'RESPONDING' || caseData.status === 'ACCEPTED') && (
                    <div className="telemetry-live-card animate-slide-down">
                        <div className="telemetry-live-header">
                            <div className="telemetry-title">
                                <Radio size={18} className="text-danger spin-slow" />
                                <div>
                                    <h4>Live Responder Telemetry Stream</h4>
                                    <p>Real-time vehicle GPS broadcast from assigned unit</p>
                                </div>
                            </div>
                            <div className="live-status-pill">
                                <span className="status-dot dot-live" />
                                <span>EN ROUTE TELEMETRY</span>
                            </div>
                        </div>

                        <div className="telemetry-live-body">
                            <div className="telemetry-stat">
                                <span className="stat-label">Assigned Unit:</span>
                                <strong>{caseData.responder_name || 'Emergency Response Unit'}</strong>
                            </div>
                            <div className="telemetry-stat">
                                <span className="stat-label">Live Distance:</span>
                                <strong className="text-danger font-mono">
                                    {liveTelemetry && caseData.latitude && caseData.longitude ? (
                                        `${calculateDistanceKm(caseData.latitude, caseData.longitude, liveTelemetry.latitude, liveTelemetry.longitude)} km away`
                                    ) : (
                                        caseData.status === 'RESPONDING' ? '~1.8 km (En route)' : 'Unit Preparing Dispatch'
                                    )}
                                </strong>
                            </div>
                            <div className="telemetry-stat">
                                <span className="stat-label">Current Phase:</span>
                                <span className="badge-status status-enroute">
                                    <Car size={13} style={{ marginRight: '4px' }} />
                                    {caseData.status === 'RESPONDING' ? 'Vehicle En Route to Scene' : 'Unit Assigned & Preparing'}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Key Information 2-Column Grid */}
                <div className="info-split-grid">
                    {/* Left: Location & Triage */}
                    <div className="info-panel-card">
                        <h3 className="panel-card-title">
                            <MapPin size={17} className="text-danger" /> Reported Incident Location
                        </h3>
                        <div className="location-detail-box">
                            <div className="loc-main-addr">
                                {caseData.address || 'Address logged via GPS'}
                            </div>
                            {caseData.latitude && caseData.longitude && (
                                <div className="loc-coords-row">
                                    <span>Coordinates: {caseData.latitude.toFixed(5)}°N, {caseData.longitude.toFixed(5)}°E</span>
                                    {caseData.location_accuracy && (
                                        <span className="badge-acc">±{caseData.location_accuracy}m accuracy</span>
                                    )}
                                </div>
                            )}

                            {/* Map Preview Link / Mini View */}
                            {caseData.latitude && caseData.longitude && (
                                <div className="map-preview-embed">
                                    <div className="map-placeholder">
                                        <Compass size={24} className="map-pin-pulse" />
                                        <span>Incident Pin: {caseData.latitude.toFixed(4)}, {caseData.longitude.toFixed(4)}</span>
                                        <a
                                            href={`https://www.google.com/maps?q=${caseData.latitude},${caseData.longitude}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="btn-map-ext"
                                        >
                                            Open in External Maps <ExternalLink size={12} />
                                        </a>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="triage-assessment-box">
                            <div className="triage-title">
                                <Shield size={15} /> Transparent Triage Assessment
                            </div>
                            <p className="triage-reason-text">{caseData.triage_reason || 'Rule-based operational triage evaluated.'}</p>
                            {caseData.triage_overridden && (
                                <div className="override-notice">
                                    <strong>Dispatcher Override Note:</strong> {caseData.triage_override_reason}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Assigned Responder & Dispatcher Details */}
                    <div className="info-panel-card">
                        <h3 className="panel-card-title">
                            <UserCheck size={17} className="text-primary" /> Verified Response Unit
                        </h3>
                        {caseData.assigned_responder_id ? (
                            <div className="responder-profile-card">
                                <div className="resp-avatar">
                                    {caseData.assigned_responder_name?.charAt(0) || 'R'}
                                </div>
                                <div className="resp-info-col">
                                    <div className="resp-name-row">
                                        <h4>{caseData.assigned_responder_name}</h4>
                                        <span className="badge-verified">Verified Responder</span>
                                    </div>
                                    <div className="resp-role-text">Duty Field Specialist</div>
                                    <div className="resp-status-line">
                                        <span className="resp-dot" />
                                        <span>Status: {caseData.status.replace('_', ' ')}</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="unassigned-notice-box">
                                <Clock size={20} className="spin-icon" style={{ color: '#d97706' }} />
                                <div>
                                    <strong>Responder Assignment in Progress</strong>
                                    <p>The dispatcher operations team is matching verified nearby responders with relevant skills.</p>
                                </div>
                            </div>
                        )}

                        {/* Immediate Hazards & Accessibility Notes */}
                        <div className="hazards-summary-box">
                            <strong>Reported Hazards & Vulnerabilities:</strong>
                            <div className="hazards-tags-wrap">
                                {caseData.immediate_hazards?.length > 0 ? (
                                    caseData.immediate_hazards.map((h, i) => (
                                        <span key={i} className="hazard-tag-pill">{h.replace('_', ' ')}</span>
                                    ))
                                ) : (
                                    <span className="text-muted" style={{ fontSize: '0.8rem' }}>None explicitly reported.</span>
                                )}
                            </div>
                            {caseData.accessibility_needs && (
                                <div className="acc-notice-line">
                                    <small>Special requirements: {caseData.accessibility_needs}</small>
                                </div>
                            )}
                        </div>

                        {/* Helplines reminder */}
                        <div className="emergency-callout-box">
                            <Phone size={15} />
                            <div>
                                Immediate life risk? Call <strong>112</strong> immediately.
                                <button type="button" className="btn-link-sm" onClick={() => setHelplinesOpen(true)}>
                                    View Helpline Directory
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs: Timeline / Chat / Evidence / Feedback */}
                <div className="detail-tabs-section">
                    <div className="tabs-header-bar">
                        <button
                            type="button"
                            className={`tab-btn ${activeTab === 'timeline' ? 'active' : ''}`}
                            onClick={() => setActiveTab('timeline')}
                        >
                            <Clock size={16} /> Incident Timeline ({timeline.length})
                        </button>
                        <button
                            type="button"
                            className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
                            onClick={() => setActiveTab('chat')}
                        >
                            <MessageSquare size={16} /> Live Communication ({messages.length})
                        </button>
                        <button
                            type="button"
                            className={`tab-btn ${activeTab === 'evidence' ? 'active' : ''}`}
                            onClick={() => setActiveTab('evidence')}
                        >
                            <ImageIcon size={16} /> Evidence & Attachments ({attachments.length})
                        </button>
                        {isResolvedOrClosed && (
                            <button
                                type="button"
                                className={`tab-btn ${activeTab === 'feedback' ? 'active' : ''}`}
                                onClick={() => setActiveTab('feedback')}
                            >
                                <Star size={16} /> Resolution Verification
                            </button>
                        )}
                    </div>

                    <div className="tab-content-area">
                        {/* Tab 1: Timeline */}
                        {activeTab === 'timeline' && (
                            <div className="timeline-view animate-fade-in">
                                {timeline.length === 0 ? (
                                    <p className="text-muted">No timeline entries recorded yet.</p>
                                ) : (
                                    <div className="timeline-trail">
                                        {timeline.map((item, idx) => (
                                            <div key={item.id || idx} className="timeline-item">
                                                <div className="timeline-marker" />
                                                <div className="timeline-card">
                                                    <div className="timeline-card-header">
                                                        <span className="timeline-status-badge">
                                                            {item.new_status}
                                                        </span>
                                                        <span className="timeline-time">
                                                            {new Date(item.timestamp).toLocaleString()}
                                                        </span>
                                                    </div>
                                                    <div className="timeline-actor">
                                                        Actor: <strong>{item.actor_name}</strong> ({item.actor_role})
                                                    </div>
                                                    {item.remarks && (
                                                        <div className="timeline-remarks">{item.remarks}</div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Tab 2: Live Chat */}
                        {activeTab === 'chat' && (
                            <div className="chat-view animate-fade-in">
                                <div className="chat-messages-container">
                                    {messages.length === 0 ? (
                                        <div className="empty-chat-hint">
                                            <MessageSquare size={32} className="text-muted" />
                                            <p>No messages yet. Send an update or question to the assigned response team.</p>
                                        </div>
                                    ) : (
                                        messages.map((m) => {
                                            const isMe = m.sender_role === 'citizen';
                                            return (
                                                <div key={m.id} className={`chat-bubble-row ${isMe ? 'outgoing' : 'incoming'}`}>
                                                    <div className={`chat-bubble ${isMe ? 'bubble-me' : 'bubble-them'}`}>
                                                        <div className="chat-sender-line">
                                                            <span>{m.sender_name}</span>
                                                            <small>({m.sender_role})</small>
                                                        </div>
                                                        <div className="chat-text">{m.message}</div>
                                                        <div className="chat-time">
                                                            {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                    <div ref={chatEndRef} />
                                </div>

                                <form onSubmit={handleSendMessage} className="chat-input-bar">
                                    <input
                                        type="text"
                                        placeholder="Type an urgent message or update for responders..."
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        disabled={isResolvedOrClosed}
                                    />
                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        disabled={sendingMsg || !newMessage.trim() || isResolvedOrClosed}
                                    >
                                        <Send size={16} /> Send
                                    </button>
                                </form>
                            </div>
                        )}

                        {/* Tab 3: Evidence */}
                        {activeTab === 'evidence' && (
                            <div className="evidence-view animate-fade-in">
                                {attachments.length === 0 ? (
                                    <div className="empty-evidence-hint">
                                        <ImageIcon size={32} className="text-muted" />
                                        <p>No photographs or documents attached to this case.</p>
                                    </div>
                                ) : (
                                    <div className="evidence-grid">
                                        {attachments.map((att) => (
                                            <div key={att.id} className="evidence-card">
                                                <div className="evidence-preview-box">
                                                    {att.file_type?.startsWith('image/') ? (
                                                        <img
                                                            src={att.url}
                                                            alt={att.file_name}
                                                            onError={(e) => {
                                                                e.target.style.display = 'none';
                                                            }}
                                                        />
                                                    ) : (
                                                        <div className="doc-preview-placeholder">
                                                            <Paperclip size={28} />
                                                            <span>{att.file_name}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="evidence-info">
                                                    <span className="att-type">{att.attachment_type.replace('_', ' ')}</span>
                                                    <span className="att-role">Uploaded by: {att.uploaded_by_role}</span>
                                                    <a href={att.url} target="_blank" rel="noopener noreferrer" className="btn-view-att">
                                                        Open Full File <ExternalLink size={12} />
                                                    </a>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Tab 4: Feedback & Reopening */}
                        {activeTab === 'feedback' && (
                            <div className="feedback-view animate-fade-in">
                                <div className="resolution-summary-box">
                                    <h4>Final Incident Resolution Summary</h4>
                                    <p className="res-summary-text">
                                        {caseData.resolution_summary || 'Incident resolved by on-scene responders.'}
                                    </p>
                                    <small className="text-muted">
                                        Resolved At: {caseData.resolution_timestamp ? new Date(caseData.resolution_timestamp).toLocaleString() : 'Recently'}
                                    </small>
                                </div>

                                {caseData.reporter_rating || feedbackSubmitted ? (
                                    <div className="feedback-done-box">
                                        <CheckCircle2 size={32} className="text-success" />
                                        <h4>Thank you for verifying this resolution!</h4>
                                        <p className="text-muted">Your rating and feedback have been logged into the municipal safety audit log.</p>
                                    </div>
                                ) : (
                                    <form onSubmit={handleFeedbackSubmit} className="feedback-form">
                                        <h4>Confirm Resolution Quality</h4>
                                        <p className="text-muted" style={{ fontSize: '0.85rem' }}>
                                            Rate the speed and effectiveness of the responders who handled this case:
                                        </p>
                                        <div className="star-rating-row">
                                            {[1, 2, 3, 4, 5].map((s) => (
                                                <button
                                                    key={s}
                                                    type="button"
                                                    className={`star-btn ${rating >= s ? 'active' : ''}`}
                                                    onClick={() => setRating(s)}
                                                >
                                                    <Star size={24} fill={rating >= s ? '#f59e0b' : 'none'} />
                                                </button>
                                            ))}
                                        </div>
                                        <textarea
                                            rows="3"
                                            className="form-control"
                                            placeholder="Optional remarks on responder conduct, arrival time, or equipment..."
                                            value={feedbackText}
                                            onChange={(e) => setFeedbackText(e.target.value)}
                                        />
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                                            <button type="submit" className="btn btn-primary">
                                                Submit Verification Feedback
                                            </button>
                                        </div>
                                    </form>
                                )}

                                {/* Reopen Option */}
                                <div className="reopen-option-section">
                                    <div className="reopen-intro">
                                        <div>
                                            <strong>Is the emergency unresolved or hazard still recurring?</strong>
                                            <p className="text-muted" style={{ fontSize: '0.82rem' }}>
                                                You can request reopening with a mandatory reason for immediate dispatcher escalation.
                                            </p>
                                        </div>
                                        {!reopenOpen && (
                                            <button
                                                type="button"
                                                className="btn btn-outline btn-sm"
                                                onClick={() => setReopenOpen(true)}
                                            >
                                                Request Reopen Case
                                            </button>
                                        )}
                                    </div>

                                    {reopenOpen && (
                                        <form onSubmit={handleReopenSubmit} className="reopen-form animate-fade-in">
                                            <label className="form-label required">State why this case must be reopened:</label>
                                            <textarea
                                                rows="2"
                                                className="form-control"
                                                value={reopenReason}
                                                onChange={(e) => setReopenReason(e.target.value)}
                                                placeholder="e.g. Fire flared up again / floodwater entering home / injured person relapsed..."
                                                required
                                            />
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                                                <button type="button" className="btn btn-outline btn-sm" onClick={() => setReopenOpen(false)}>
                                                    Cancel
                                                </button>
                                                <button type="submit" className="btn btn-danger btn-sm" disabled={!reopenReason.trim()}>
                                                    Escalate & Reopen Incident
                                                </button>
                                            </div>
                                        </form>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <HelplineDirectoryModal
                isOpen={helplinesOpen}
                onClose={() => setHelplinesOpen(false)}
            />
        </div>
    );
};

export default EmergencyDetailView;

