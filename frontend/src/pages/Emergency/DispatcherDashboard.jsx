import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ShieldAlert, AlertTriangle, Users, Clock, CheckCircle2, Siren,
    Search, Filter, MapPin, RefreshCw, UserCheck, ArrowRight, X,
    FileText, Layers, AlertCircle, Phone, Compass, ExternalLink,
    ChevronRight, BarChart3, Settings, ShieldCheck, Volume2, VolumeX,
    Radio, Crosshair, Navigation, Locate
} from 'lucide-react';
import {
    getEmergencyQueue, getEmergencyAnalytics, getEligibleResponders,
    assignResponder, overrideTriage, closeEmergency, listResponders,
    sendEmergencyMessage, getEmergencyCategories, updateEmergencyCategory,
    EmergencySocketClient
} from '../../services/emergencyApi';
import { playEmergencyAlarm, playDispatchChime } from '../../utils/emergencyAudio';
import './DispatcherDashboard.css';

const DispatcherDashboard = () => {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('civicai_user') || '{}');

    const [activeTab, setActiveTab] = useState('unassigned'); // unassigned, active, critical, escalated, resolved, responders, analytics, categories, map
    const [cases, setCases] = useState([]);
    const [analytics, setAnalytics] = useState(null);
    const [responders, setResponders] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Real-Time Telemetry & Alert State
    const [wsState, setWsState] = useState('connecting');
    const [audioEnabled, setAudioEnabled] = useState(true);
    const [realtimeAlert, setRealtimeAlert] = useState(null);
    const [selectedMapCase, setSelectedMapCase] = useState(null);
    const socketRef = useRef(null);

    // Modals
    const [selectedCaseForAssign, setSelectedCaseForAssign] = useState(null);
    const [eligibleRespondersData, setEligibleRespondersData] = useState(null);
    const [matchingLoading, setMatchingLoading] = useState(false);
    const [selectedResponderId, setSelectedResponderId] = useState('');
    const [assigning, setAssigning] = useState(false);

    // Triage Override Modal
    const [triageModalCase, setTriageModalCase] = useState(null);
    const [newSeverity, setNewSeverity] = useState('HIGH');
    const [triageReason, setTriageReason] = useState('');
    const [triageSubmitting, setTriageSubmitting] = useState(false);

    // Internal Notes Modal
    const [notesModalCase, setNotesModalCase] = useState(null);
    const [internalNoteText, setInternalNoteText] = useState('');
    const [notesSubmitting, setNotesSubmitting] = useState(false);

    // Close Case Modal
    const [closeModalCase, setCloseModalCase] = useState(null);
    const [closeRemarks, setCloseRemarks] = useState('');
    const [closingSubmitting, setClosingSubmitting] = useState(false);

    const loadData = async (showLoading = true) => {
        if (showLoading) setLoading(true);
        try {
            const [queueRes, analyticsRes, respRes, catRes] = await Promise.all([
                getEmergencyQueue({ status: activeTab, q: searchQuery }),
                getEmergencyAnalytics(),
                listResponders(),
                getEmergencyCategories()
            ]);

            if (queueRes?.cases) setCases(queueRes.cases);
            if (analyticsRes?.metrics) setAnalytics(analyticsRes.metrics);
            if (respRes?.responders) setResponders(respRes.responders);
            if (catRes?.categories) setCategories(catRes.categories);
        } catch (err) {
            console.error('Failed to load operations data:', err);
        } finally {
            if (showLoading) setLoading(false);
        }
    };

    useEffect(() => {
        loadData(true);
    }, [activeTab, searchQuery]);

    // Setup Real-Time WebSocket & Background Auto-Polling
    useEffect(() => {
        const clientId = `dispatcher_${user.id || 'admin'}_${Date.now()}`;
        const wsClient = new EmergencySocketClient({
            clientId,
            role: 'dispatcher',
            userId: user.id || 'admin_01',
            onEvent: (event) => {
                if (event.type === 'emergency.created') {
                    if (audioEnabled) playEmergencyAlarm();
                    const c = event.payload?.case;
                    if (c) {
                        setRealtimeAlert(c);
                        setCases((prev) => [c, ...prev.filter(x => x.case_id !== c.case_id)]);
                    }
                    loadData(false);
                } else if (
                    ['emergency.assigned', 'emergency.accepted', 'emergency.escalated', 'emergency.resolved', 'emergency.status_change'].includes(event.type)
                ) {
                    if (audioEnabled) playDispatchChime();
                    loadData(false);
                }
            },
            onStateChange: (st) => {
                setWsState(st);
            }
        });

        socketRef.current = wsClient;

        // Background 5s live polling fallback to guarantee real-time updates always
        const pollTimer = setInterval(() => {
            loadData(false);
        }, 5000);

        return () => {
            clearInterval(pollTimer);
            wsClient.disconnect();
        };
    }, [audioEnabled]);

    // Handle Open Assign Modal
    const openAssignModal = async (c) => {
        setSelectedCaseForAssign(c);
        setSelectedResponderId('');
        setMatchingLoading(true);
        try {
            const res = await getEligibleResponders(c.case_id);
            setEligibleRespondersData(res);
            if (res.eligible?.length > 0) {
                setSelectedResponderId(res.eligible[0].responder_id);
            }
        } catch (err) {
            alert('Failed to calculate responder matching: ' + err.message);
        } finally {
            setMatchingLoading(false);
        }
    };

    // Execute Assignment
    const handleConfirmAssign = async () => {
        if (!selectedCaseForAssign || !selectedResponderId) return;
        setAssigning(true);
        try {
            await assignResponder(
                selectedCaseForAssign.case_id,
                selectedResponderId,
                user.id || 'admin_01',
                user.name || 'Duty Dispatcher'
            );
            setSelectedCaseForAssign(null);
            loadData();
        } catch (err) {
            alert('Assignment error: ' + err.message);
        } finally {
            setAssigning(false);
        }
    };

    // Execute Triage Override
    const handleConfirmTriage = async (e) => {
        e.preventDefault();
        if (!triageModalCase || !triageReason.trim()) return;
        setTriageSubmitting(true);
        try {
            await overrideTriage(
                triageModalCase.case_id,
                newSeverity,
                triageReason.trim(),
                user.id || 'admin_01',
                user.name || 'Duty Dispatcher'
            );
            setTriageModalCase(null);
            setTriageReason('');
            loadData();
        } catch (err) {
            alert('Triage override error: ' + err.message);
        } finally {
            setTriageSubmitting(false);
        }
    };

    // Execute Internal Note
    const handleSendInternalNote = async (e) => {
        e.preventDefault();
        if (!notesModalCase || !internalNoteText.trim()) return;
        setNotesSubmitting(true);
        try {
            await sendEmergencyMessage(
                notesModalCase.case_id,
                internalNoteText.trim(),
                user.id || 'admin_01',
                user.name || 'Duty Dispatcher',
                'dispatcher',
                true // internal note
            );
            setNotesModalCase(null);
            setInternalNoteText('');
            alert('Internal note recorded in incident audit trail.');
        } catch (err) {
            alert('Error adding note: ' + err.message);
        } finally {
            setNotesSubmitting(false);
        }
    };

    // Execute Close Case
    const handleConfirmClose = async (e) => {
        e.preventDefault();
        if (!closeModalCase) return;
        setClosingSubmitting(true);
        try {
            await closeEmergency(
                closeModalCase.case_id,
                user.id || 'admin_01',
                user.name || 'Duty Dispatcher',
                closeRemarks.trim() || 'Resolution audited and formally verified by dispatcher.'
            );
            setCloseModalCase(null);
            setCloseRemarks('');
            loadData();
        } catch (err) {
            alert('Closure error: ' + err.message);
        } finally {
            setClosingSubmitting(false);
        }
    };

    const metrics = analytics || {
        total_incidents: 0,
        active_incidents: 0,
        unassigned_incidents: 0,
        critical_incidents: 0,
        escalated_count: 0,
        reopened_count: 0,
        resolved_count: 0,
        average_assignment_minutes: null,
        average_resolution_minutes: null,
        categories_breakdown: [],
        priority_breakdown: []
    };

    return (
        <div className="dispatcher-dashboard-page">
            <div className="container operations-container">
                {/* Real-Time Alarm Notification Banner */}
                {realtimeAlert && (
                    <div className="realtime-alarm-banner animate-slide-down">
                        <div className="alarm-banner-content">
                            <span className="alarm-siren-icon"><Siren size={22} /></span>
                            <div>
                                <strong className="alarm-title">🚨 LIVE EMERGENCY REPORTED: {realtimeAlert.reference_no}</strong>
                                <p className="alarm-sub">
                                    {realtimeAlert.category_name} &bull; Severity: <span className="badge-severity">{realtimeAlert.severity}</span>
                                    {realtimeAlert.address ? ` • ${realtimeAlert.address}` : ''}
                                </p>
                            </div>
                        </div>
                        <div className="alarm-banner-actions">
                            <button
                                type="button"
                                className="btn btn-sm btn-light"
                                onClick={() => {
                                    openAssignModal(realtimeAlert);
                                    setRealtimeAlert(null);
                                }}
                            >
                                <Crosshair size={14} /> Triage & Assign Now
                            </button>
                            <button
                                type="button"
                                className="btn btn-sm btn-ghost"
                                onClick={() => setRealtimeAlert(null)}
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>
                )}

                {/* Operations Header */}
                <div className="operations-header-bar">
                    <div className="header-title-box">
                        <div className="ops-shield-badge">
                            <ShieldAlert size={20} />
                        </div>
                        <div>
                            <h1>Emergency Operations Center (EOC)</h1>
                            <p className="text-muted">Real-Time Municipal Triage, Intelligent Dispatch & Escalation</p>
                        </div>
                    </div>
                    <div className="header-actions header-actions-group">
                        <div className={`live-status-pill ${wsState === 'offline' ? 'offline' : ''}`}>
                            <span className={`status-dot ${wsState === 'connected' ? 'dot-live' : 'dot-warn'}`} />
                            <span>{wsState === 'connected' ? 'REAL-TIME ACTIVE' : 'LIVE POLLING (5s)'}</span>
                        </div>
                        <button
                            type="button"
                            className="btn btn-outline btn-sm audio-toggle-btn"
                            onClick={() => setAudioEnabled(!audioEnabled)}
                            title={audioEnabled ? 'Sound alert enabled' : 'Sound muted'}
                        >
                            {audioEnabled ? <Volume2 size={14} className="text-danger" /> : <VolumeX size={14} className="text-muted" />}
                            {audioEnabled ? 'Sound ON' : 'Muted'}
                        </button>
                        <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => loadData(true)}
                        >
                            <RefreshCw size={14} className={loading ? 'spin-icon' : ''} /> Refresh
                        </button>
                    </div>
                </div>

                {/* Real Metrics KPI Grid (Calculated from Real Database Queries) */}
                <div className="kpi-metrics-grid">
                    <div className="kpi-card kpi-danger">
                        <div className="kpi-label">Unassigned Queue</div>
                        <div className="kpi-number">{metrics.unassigned_incidents}</div>
                        <div className="kpi-sub">Awaiting immediate triage / dispatch</div>
                    </div>
                    <div className="kpi-card kpi-primary">
                        <div className="kpi-label">Active Incidents</div>
                        <div className="kpi-number">{metrics.active_incidents}</div>
                        <div className="kpi-sub">Responders en route or on scene</div>
                    </div>
                    <div className="kpi-card kpi-warning">
                        <div className="kpi-label">Critical Acuity</div>
                        <div className="kpi-number">{metrics.critical_incidents}</div>
                        <div className="kpi-sub">High life-safety impact cases</div>
                    </div>
                    <div className="kpi-card kpi-escalated">
                        <div className="kpi-label">Escalations Logged</div>
                        <div className="kpi-number">{metrics.escalated_count}</div>
                        <div className="kpi-sub">SLA breach or rejected response</div>
                    </div>
                    <div className="kpi-card kpi-info">
                        <div className="kpi-label">Avg Assignment Time</div>
                        <div className="kpi-number">
                            {metrics.average_assignment_minutes !== null ? `${metrics.average_assignment_minutes}m` : 'N/A'}
                        </div>
                        <div className="kpi-sub">From creation to verified match</div>
                    </div>
                    <div className="kpi-card kpi-success">
                        <div className="kpi-label">Total Resolved</div>
                        <div className="kpi-number">{metrics.resolved_count}</div>
                        <div className="kpi-sub">Cases successfully concluded</div>
                    </div>
                </div>

                {/* Queue Navigation Tabs */}
                <div className="queue-tabs-card">
                    <div className="queue-tabs-nav">
                        <button
                            type="button"
                            className={`q-tab-btn ${activeTab === 'unassigned' ? 'active' : ''}`}
                            onClick={() => setActiveTab('unassigned')}
                        >
                            Unassigned ({metrics.unassigned_incidents})
                        </button>
                        <button
                            type="button"
                            className={`q-tab-btn ${activeTab === 'active' ? 'active' : ''}`}
                            onClick={() => setActiveTab('active')}
                        >
                            Active Response ({metrics.active_incidents})
                        </button>
                        <button
                            type="button"
                            className={`q-tab-btn ${activeTab === 'critical' ? 'active' : ''}`}
                            onClick={() => setActiveTab('critical')}
                        >
                            Critical Priority ({metrics.critical_incidents})
                        </button>
                        <button
                            type="button"
                            className={`q-tab-btn ${activeTab === 'map' ? 'active' : ''}`}
                            onClick={() => setActiveTab('map')}
                        >
                            <Radio size={14} className="text-danger" /> Live Tactical Radar
                        </button>
                        <button
                            type="button"
                            className={`q-tab-btn ${activeTab === 'escalated' ? 'active' : ''}`}
                            onClick={() => setActiveTab('escalated')}
                        >
                            Escalated Cases
                        </button>
                        <button
                            type="button"
                            className={`q-tab-btn ${activeTab === 'resolved' ? 'active' : ''}`}
                            onClick={() => setActiveTab('resolved')}
                        >
                            Resolved & Closed
                        </button>
                        <button
                            type="button"
                            className={`q-tab-btn ${activeTab === 'responders' ? 'active' : ''}`}
                            onClick={() => setActiveTab('responders')}
                        >
                            Responders Roster ({responders.length})
                        </button>
                        <button
                            type="button"
                            className={`q-tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
                            onClick={() => setActiveTab('analytics')}
                        >
                            <BarChart3 size={14} /> Analytics
                        </button>
                        <button
                            type="button"
                            className={`q-tab-btn ${activeTab === 'categories' ? 'active' : ''}`}
                            onClick={() => setActiveTab('categories')}
                        >
                            <Settings size={14} /> Categories
                        </button>
                    </div>

                    <div className="queue-search-bar">
                        <div className="q-search-wrap">
                            <Search size={15} />
                            <input
                                type="text"
                                placeholder="Search by reference, location, caller phone, or description..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Table View for Incidents */}
                    {['unassigned', 'active', 'critical', 'escalated', 'resolved'].includes(activeTab) && (
                        <div className="queue-table-wrap">
                            {loading ? (
                                <div className="ops-loading-box">
                                    <div className="spinner" />
                                    <span>Updating operations queue...</span>
                                </div>
                            ) : cases.length === 0 ? (
                                <div className="ops-empty-box">
                                    <CheckCircle2 size={36} className="text-success" />
                                    <h4>No Cases in this Queue</h4>
                                    <p className="text-muted">
                                        All emergency incidents in this category have been processed or none have been logged yet.
                                    </p>
                                </div>
                            ) : (
                                <table className="queue-table">
                                    <thead>
                                        <tr>
                                            <th>Reference / Category</th>
                                            <th>Description & Location</th>
                                            <th>Triage Severity</th>
                                            <th>Status</th>
                                            <th>Assigned Unit</th>
                                            <th>Reported Time</th>
                                            <th style={{ textAlign: 'right' }}>Dispatcher Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {cases.map((c) => (
                                            <tr key={c.case_id}>
                                                <td>
                                                    <div className="q-ref-num">{c.reference_no}</div>
                                                    <div className="q-cat-name">{c.category_name}</div>
                                                </td>
                                                <td>
                                                    <div className="q-desc-text" title={c.description}>
                                                        {c.description}
                                                    </div>
                                                    <div className="q-addr-text">
                                                        <MapPin size={12} /> {c.address || 'Location Tagged'}
                                                    </div>
                                                    {c.immediate_hazards?.length > 0 && (
                                                        <div className="q-hazards-pills">
                                                            {c.immediate_hazards.slice(0, 2).map((h, i) => (
                                                                <span key={i} className="q-h-pill">{h}</span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </td>
                                                <td>
                                                    <button
                                                        type="button"
                                                        className={`severity-tag severity-${(c.severity || 'HIGH').toLowerCase()} btn-clickable-tag`}
                                                        onClick={() => {
                                                            setTriageModalCase(c);
                                                            setNewSeverity(c.severity || 'HIGH');
                                                            setTriageReason('');
                                                        }}
                                                        title="Click to override triage priority"
                                                    >
                                                        {c.severity}
                                                    </button>
                                                </td>
                                                <td>
                                                    <span className={`status-pill status-${c.status.toLowerCase()}`}>
                                                        {c.status.replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td>
                                                    {c.assigned_responder_name ? (
                                                        <div className="q-assigned-cell">
                                                            <strong>{c.assigned_responder_name}</strong>
                                                            <button
                                                                type="button"
                                                                className="btn-reassign-link"
                                                                onClick={() => openAssignModal(c)}
                                                            >
                                                                Reassign
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            className="btn btn-primary btn-xs btn-assign-act"
                                                            onClick={() => openAssignModal(c)}
                                                        >
                                                            <UserCheck size={12} /> Assign Unit
                                                        </button>
                                                    )}
                                                </td>
                                                <td className="q-time-cell">
                                                    {c.created_at ? new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}
                                                    <br />
                                                    <small>{c.created_at ? new Date(c.created_at).toLocaleDateString() : ''}</small>
                                                </td>
                                                <td style={{ textAlign: 'right' }}>
                                                    <div className="actions-btn-group">
                                                        <button
                                                            type="button"
                                                            className="btn-action-icon"
                                                            onClick={() => navigate(`/emergency/case/${c.case_id}`)}
                                                            title="Inspect Full Incident Details"
                                                        >
                                                            <ChevronRight size={16} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="btn-action-icon"
                                                            onClick={() => {
                                                                setNotesModalCase(c);
                                                                setInternalNoteText('');
                                                            }}
                                                            title="Add Internal Dispatcher Note"
                                                        >
                                                            <FileText size={15} />
                                                        </button>
                                                        {c.status === 'RESOLVED' && (
                                                            <button
                                                                type="button"
                                                                className="btn btn-success btn-xs"
                                                                onClick={() => {
                                                                    setCloseModalCase(c);
                                                                    setCloseRemarks('Resolution reviewed and verified by Duty Dispatcher.');
                                                                }}
                                                            >
                                                                Verify & Close
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}

                    {/* Live Tactical Radar Map Tab */}
                    {activeTab === 'map' && (
                        <div className="radar-map-wrapper animate-fade-in">
                            <div className="radar-header">
                                <div className="radar-header-title">
                                    <Radio size={20} className="text-danger spin-slow" />
                                    <div>
                                        <h3>Live Geospatial Telemetry Radar</h3>
                                        <p>Real-time plotted emergency coordinates, casualty clusters & deployed response units</p>
                                    </div>
                                </div>
                                <div className="live-status-pill">
                                    <span className="status-dot dot-live" />
                                    <span>LIVE BEACON TRACKING</span>
                                </div>
                            </div>

                            <div className="radar-content-grid">
                                <div className="radar-canvas-container">
                                    <div className="radar-sweep-line" />
                                    
                                    {/* Concentric Radar Grid Rings */}
                                    <svg className="radar-grid-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
                                        <circle cx="50" cy="50" r="15" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="1,1" />
                                        <circle cx="50" cy="50" r="30" fill="none" stroke="#334155" strokeWidth="0.5" />
                                        <circle cx="50" cy="50" r="45" fill="none" stroke="#334155" strokeWidth="0.5" />
                                        <line x1="50" y1="0" x2="50" y2="100" stroke="#1e293b" strokeWidth="0.4" />
                                        <line x1="0" y1="50" x2="100" y2="50" stroke="#1e293b" strokeWidth="0.4" />
                                    </svg>

                                    {/* Plotted Emergency Incident Pins */}
                                    {cases.filter(c => c.latitude && c.longitude).map((c, i) => {
                                        // Normalize lat/lon to percentage relative to Pune center ~ (18.5204, 73.8567)
                                        const deltaLat = (c.latitude - 18.5204) * 500;
                                        const deltaLon = (c.longitude - 73.8567) * 500;
                                        const posX = Math.min(Math.max(50 + deltaLon, 8), 92);
                                        const posY = Math.min(Math.max(50 - deltaLat, 8), 92);
                                        const sev = (c.severity || 'MEDIUM').toLowerCase();

                                        return (
                                            <div
                                                key={c.case_id}
                                                className="radar-marker"
                                                style={{ left: `${posX}%`, top: `${posY}%` }}
                                                onClick={() => setSelectedMapCase(c)}
                                                title={`${c.reference_no}: ${c.category_name} (${c.severity})`}
                                            >
                                                <div className={`radar-beacon ${sev}`}>
                                                    <Siren size={12} />
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* Plotted Responders Pins */}
                                    {responders.filter(r => r.latitude && r.longitude).map((r) => {
                                        const deltaLat = (r.latitude - 18.5204) * 500;
                                        const deltaLon = (r.longitude - 73.8567) * 500;
                                        const posX = Math.min(Math.max(50 + deltaLon, 10), 90);
                                        const posY = Math.min(Math.max(50 - deltaLat, 10), 90);

                                        return (
                                            <div
                                                key={r.responder_id}
                                                className="radar-marker"
                                                style={{ left: `${posX}%`, top: `${posY}%` }}
                                                title={`Verified Unit: ${r.name} (${r.role})`}
                                            >
                                                <div className="radar-beacon responder">
                                                    <Shield size={12} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Tactical Radar Inspector Sidebar */}
                                <div className="radar-sidebar-panel">
                                    <div className="radar-side-header">
                                        <h4>Tactical Incident Inspector</h4>
                                        <p>Select any glowing beacon to inspect coordinates & dispatch units</p>
                                    </div>

                                    {selectedMapCase ? (
                                        <div className="radar-detail-box animate-fade-in">
                                            <div className="radar-field">
                                                <span>Case Ref:</span>
                                                <strong>{selectedMapCase.reference_no}</strong>
                                            </div>
                                            <div className="radar-field">
                                                <span>Category:</span>
                                                <span>{selectedMapCase.category_name}</span>
                                            </div>
                                            <div className="radar-field">
                                                <span>Severity:</span>
                                                <span className={`cat-pill cat-${(selectedMapCase.severity || 'medium').toLowerCase()}`}>
                                                    {selectedMapCase.severity}
                                                </span>
                                            </div>
                                            <div className="radar-field">
                                                <span>Status:</span>
                                                <span className="badge-status">{selectedMapCase.status}</span>
                                            </div>
                                            <div className="radar-field">
                                                <span>Casualties:</span>
                                                <span>{selectedMapCase.affected_people || 'None reported'}</span>
                                            </div>
                                            <div className="radar-field">
                                                <span>Coordinates:</span>
                                                <span className="font-mono">{selectedMapCase.latitude?.toFixed(4)}°N, {selectedMapCase.longitude?.toFixed(4)}°E</span>
                                            </div>
                                            {selectedMapCase.address && (
                                                <div style={{ marginTop: '8px', fontSize: '0.76rem', color: '#cbd5e1' }}>
                                                    📍 {selectedMapCase.address}
                                                </div>
                                            )}
                                            <div style={{ marginTop: '14px', display: 'flex', gap: '8px' }}>
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-primary"
                                                    style={{ flex: 1 }}
                                                    onClick={() => openAssignModal(selectedMapCase)}
                                                >
                                                    <UserCheck size={14} /> Assign Unit
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-outline"
                                                    onClick={() => navigate(`/emergency/case/${selectedMapCase.case_id}`)}
                                                >
                                                    View
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ textAlign: 'center', padding: '30px 10px', color: '#64748b', fontSize: '0.8rem' }}>
                                            <Crosshair size={32} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
                                            <p>No beacon selected.<br />Click on any radar dot to view live telemetry.</p>
                                        </div>
                                    )}

                                    <div className="radar-legend-bar">
                                        <div className="legend-item">
                                            <span className="legend-color-dot" style={{ background: '#ef4444' }} /> Critical
                                        </div>
                                        <div className="legend-item">
                                            <span className="legend-color-dot" style={{ background: '#f59e0b' }} /> High
                                        </div>
                                        <div className="legend-item">
                                            <span className="legend-color-dot" style={{ background: '#3b82f6' }} /> Medium
                                        </div>
                                        <div className="legend-item">
                                            <span className="legend-color-dot" style={{ background: '#10b981' }} /> Responder Unit
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Responders Roster Tab */}
                    {activeTab === 'responders' && (
                        <div className="responders-roster-view animate-fade-in">
                            <div className="roster-grid">
                                {responders.map((r) => (
                                    <div key={r.responder_id} className="responder-card">
                                        <div className="r-card-header">
                                            <div>
                                                <h4>{r.name}</h4>
                                                <span className="r-role">{r.role}</span>
                                            </div>
                                            <span className={`avail-tag avail-${r.availability_status.toLowerCase()}`}>
                                                {r.availability_status}
                                            </span>
                                        </div>
                                        <div className="r-meta-rows">
                                            <div><strong>Department:</strong> {r.department}</div>
                                            <div><strong>Service Sector:</strong> {r.service_area}</div>
                                            <div><strong>Workload:</strong> {r.active_assignments_count} active incidents</div>
                                            {r.phone && <div><strong>Contact:</strong> {r.phone}</div>}
                                            <div className="r-skills-list">
                                                {r.skills?.map((s, idx) => (
                                                    <span key={idx} className="r-skill-tag">{s}</span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Analytics & Geographic Map Tab */}
                    {activeTab === 'analytics' && (
                        <div className="analytics-view animate-fade-in">
                            <div className="analytics-charts-grid">
                                <div className="chart-card">
                                    <h3>Emergency Incidents by Category</h3>
                                    {metrics.categories_breakdown.length === 0 ? (
                                        <p className="text-muted" style={{ padding: '20px', textAlign: 'center' }}>No category data yet.</p>
                                    ) : (
                                        <div className="category-bars-list">
                                            {metrics.categories_breakdown.map((item, idx) => {
                                                const pct = Math.round((item.count / Math.max(1, metrics.total_incidents)) * 100);
                                                return (
                                                    <div key={idx} className="bar-row">
                                                        <div className="bar-labels">
                                                            <span>{item.category}</span>
                                                            <strong>{item.count} ({pct}%)</strong>
                                                        </div>
                                                        <div className="bar-track">
                                                            <div className="bar-fill" style={{ width: `${pct}%` }} />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                <div className="chart-card">
                                    <h3>Priority Severity Breakdown</h3>
                                    {metrics.priority_breakdown.length === 0 ? (
                                        <p className="text-muted" style={{ padding: '20px', textAlign: 'center' }}>No priority data yet.</p>
                                    ) : (
                                        <div className="priority-pie-summary">
                                            {metrics.priority_breakdown.map((item, idx) => (
                                                <div key={idx} className={`prio-stat-box prio-${item.severity.toLowerCase()}`}>
                                                    <span className="prio-title">{item.severity}</span>
                                                    <span className="prio-count">{item.count}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="sla-performance-box">
                                        <h4>Response Performance Metrics</h4>
                                        <div className="sla-metric-row">
                                            <span>Average Assignment Window:</span>
                                            <strong>{metrics.average_assignment_minutes !== null ? `${metrics.average_assignment_minutes} minutes` : 'Data accumulating'}</strong>
                                        </div>
                                        <div className="sla-metric-row">
                                            <span>Average Case Resolution Window:</span>
                                            <strong>{metrics.average_resolution_minutes !== null ? `${metrics.average_resolution_minutes} minutes` : 'Data accumulating'}</strong>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Geographic Incident Pinboard */}
                            <div className="chart-card" style={{ marginTop: '20px' }}>
                                <h3>Active Municipal Incident Grid Map</h3>
                                <p className="text-muted" style={{ fontSize: '0.82rem', marginBottom: '14px' }}>
                                    Geographic clustering of active emergency requests across the metropolitan command area.
                                </p>
                                <div className="geo-incident-map-box">
                                    {cases.filter((c) => c.latitude && c.longitude).length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                                            <MapPin size={32} style={{ marginBottom: '8px' }} />
                                            <p>No active incidents with geo-coordinates currently in this view.</p>
                                        </div>
                                    ) : (
                                        <div className="geo-pins-list">
                                            {cases.filter((c) => c.latitude && c.longitude).map((c) => (
                                                <div key={c.case_id} className="geo-pin-item">
                                                    <span className={`pin-marker pin-${c.severity.toLowerCase()}`} />
                                                    <div className="pin-info">
                                                        <strong>{c.reference_no} — {c.category_name}</strong>
                                                        <small>{c.address}</small>
                                                        <small className="pin-coords">{c.latitude.toFixed(4)}°N, {c.longitude.toFixed(4)}°E</small>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        className="btn btn-xs btn-outline"
                                                        onClick={() => navigate(`/emergency/case/${c.case_id}`)}
                                                    >
                                                        Inspect
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Categories Management Tab */}
                    {activeTab === 'categories' && (
                        <div className="categories-view animate-fade-in">
                            <div className="cat-manage-header">
                                <div>
                                    <h3>Configurable Emergency Categories</h3>
                                    <p className="text-muted" style={{ fontSize: '0.85rem' }}>
                                        Manage category routing departments, SLA targets, and default severity rules.
                                    </p>
                                </div>
                            </div>
                            <div className="categories-admin-grid">
                                {categories.map((cat) => (
                                    <div key={cat.id} className="category-admin-card">
                                        <div className="cat-card-top">
                                            <h4>{cat.name}</h4>
                                            <span className={`cat-pill cat-${cat.default_severity.toLowerCase()}`}>
                                                {cat.default_severity}
                                            </span>
                                        </div>
                                        <p className="cat-desc">{cat.description}</p>
                                        <div className="cat-meta-lines">
                                            <div><strong>Department:</strong> {cat.department}</div>
                                            <div><strong>Target SLA:</strong> {cat.sla_minutes} mins</div>
                                            <div><strong>Photo Required:</strong> {cat.requires_photo ? 'Yes' : 'Optional'}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal: Intelligent Responder Assignment */}
            {selectedCaseForAssign && (
                <div className="modal-backdrop animate-fade-in" onClick={() => setSelectedCaseForAssign(null)} style={{ zIndex: 1200 }}>
                    <div className="modal-content modal-assign" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <h2>Intelligent Responder Assignment</h2>
                                <p className="text-muted" style={{ fontSize: '0.84rem' }}>
                                    Matching for Incident: <strong>{selectedCaseForAssign.reference_no}</strong> ({selectedCaseForAssign.category_name})
                                </p>
                            </div>
                            <button type="button" className="modal-close-btn" onClick={() => setSelectedCaseForAssign(null)}>
                                <X size={20} />
                            </button>
                        </div>

                        {matchingLoading ? (
                            <div style={{ textAlign: 'center', padding: '40px' }}>
                                <div className="spinner" />
                                <p style={{ marginTop: '10px' }}>Calculating skill, proximity, and workload match scores...</p>
                            </div>
                        ) : (
                            <div className="assign-modal-body">
                                <div className="matching-status-banner">
                                    <ShieldCheck size={18} />
                                    <span>{eligibleRespondersData?.message || 'Matching verified response units.'}</span>
                                </div>

                                {eligibleRespondersData?.eligible?.length === 0 ? (
                                    <div className="no-responders-alert">
                                        <AlertCircle size={20} />
                                        <div>
                                            <strong>No verified eligible responders are currently available.</strong>
                                            <p style={{ margin: '4px 0 0', fontSize: '0.8rem' }}>
                                                All nearby responders are either busy at capacity, offline, or lacking certified skills for this category.
                                                You can escalate this incident to senior dispatchers.
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="eligible-responders-list">
                                        {eligibleRespondersData?.eligible.map((r) => (
                                            <label
                                                key={r.responder_id}
                                                className={`responder-match-option ${selectedResponderId === r.responder_id ? 'selected' : ''}`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="assigned_responder"
                                                    value={r.responder_id}
                                                    checked={selectedResponderId === r.responder_id}
                                                    onChange={() => setSelectedResponderId(r.responder_id)}
                                                />
                                                <div className="match-card-content">
                                                    <div className="match-card-header">
                                                        <strong>{r.name}</strong>
                                                        <span className="match-score-pill">
                                                            Match Score: {r.matching_score}%
                                                        </span>
                                                    </div>
                                                    <div className="match-card-details">
                                                        <span>{r.role} · {r.department}</span>
                                                        {r.distance_km !== null && (
                                                            <span className="match-dist">Proximity: {r.distance_km} km away</span>
                                                        )}
                                                    </div>
                                                    <div className="match-reasons-row">
                                                        {r.reasons?.map((reason, idx) => (
                                                            <span key={idx} className="match-reason-tag">{reason}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                )}

                                <div className="modal-footer" style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                    <button
                                        type="button"
                                        className="btn btn-outline"
                                        onClick={() => setSelectedCaseForAssign(null)}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-primary"
                                        disabled={assigning || !selectedResponderId}
                                        onClick={handleConfirmAssign}
                                    >
                                        {assigning ? 'Dispatching...' : 'Confirm Assignment & Alert Unit'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Modal: Triage Override */}
            {triageModalCase && (
                <div className="modal-backdrop animate-fade-in" onClick={() => setTriageModalCase(null)} style={{ zIndex: 1200 }}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
                        <div className="modal-header">
                            <div>
                                <h2>Override Triage Priority</h2>
                                <p className="text-muted" style={{ fontSize: '0.84rem' }}>
                                    Adjusting priority for Case {triageModalCase.reference_no}
                                </p>
                            </div>
                            <button type="button" className="modal-close-btn" onClick={() => setTriageModalCase(null)}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleConfirmTriage}>
                            <div className="form-group">
                                <label className="form-label required">New Severity Level</label>
                                <select
                                    className="form-control"
                                    value={newSeverity}
                                    onChange={(e) => setNewSeverity(e.target.value)}
                                >
                                    <option value="CRITICAL">CRITICAL — Immediate Life Safety Danger</option>
                                    <option value="HIGH">HIGH — Urgent Response Required</option>
                                    <option value="MEDIUM">MEDIUM — Standard Municipal Emergency</option>
                                    <option value="LOW">LOW — Routine Community Assistance</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label required">Mandatory Override Reason</label>
                                <textarea
                                    rows="3"
                                    className="form-control"
                                    value={triageReason}
                                    onChange={(e) => setTriageReason(e.target.value)}
                                    placeholder="State clinical/operational reason for adjusting triage score..."
                                    required
                                />
                                <small className="text-muted" style={{ display: 'block', marginTop: '4px' }}>
                                    All overrides are permanently logged into the immutable audit timeline.
                                </small>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                                <button type="button" className="btn btn-outline" onClick={() => setTriageModalCase(null)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={triageSubmitting || !triageReason.trim()}>
                                    {triageSubmitting ? 'Saving...' : 'Confirm Severity Override'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Internal Dispatcher Note */}
            {notesModalCase && (
                <div className="modal-backdrop animate-fade-in" onClick={() => setNotesModalCase(null)} style={{ zIndex: 1200 }}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
                        <div className="modal-header">
                            <div>
                                <h2>Add Internal Dispatcher Note</h2>
                                <p className="text-muted" style={{ fontSize: '0.84rem' }}>
                                    Case: {notesModalCase.reference_no}
                                </p>
                            </div>
                            <button type="button" className="modal-close-btn" onClick={() => setNotesModalCase(null)}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSendInternalNote}>
                            <div className="form-group">
                                <label className="form-label required">Internal Note (Hidden from citizen)</label>
                                <textarea
                                    rows="4"
                                    className="form-control"
                                    value={internalNoteText}
                                    onChange={(e) => setInternalNoteText(e.target.value)}
                                    placeholder="Operational notes, police liaison coordination, or dispatcher remarks..."
                                    required
                                />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                                <button type="button" className="btn btn-outline" onClick={() => setNotesModalCase(null)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={notesSubmitting || !internalNoteText.trim()}>
                                    {notesSubmitting ? 'Saving...' : 'Record Internal Note'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Formally Close Case */}
            {closeModalCase && (
                <div className="modal-backdrop animate-fade-in" onClick={() => setCloseModalCase(null)} style={{ zIndex: 1200 }}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
                        <div className="modal-header">
                            <div>
                                <h2>Audit & Formally Close Incident</h2>
                                <p className="text-muted" style={{ fontSize: '0.84rem' }}>
                                    Case: {closeModalCase.reference_no}
                                </p>
                            </div>
                            <button type="button" className="modal-close-btn" onClick={() => setCloseModalCase(null)}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleConfirmClose}>
                            <div className="form-group">
                                <label className="form-label">Closure Audit Verification Remarks</label>
                                <textarea
                                    rows="3"
                                    className="form-control"
                                    value={closeRemarks}
                                    onChange={(e) => setCloseRemarks(e.target.value)}
                                    placeholder="Verify resolution evidence and field worker remarks..."
                                />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                                <button type="button" className="btn btn-outline" onClick={() => setCloseModalCase(null)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-success" disabled={closingSubmitting}>
                                    {closingSubmitting ? 'Closing...' : 'Confirm Closure & Archive'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DispatcherDashboard;

