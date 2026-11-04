import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    HardHat, Shield, MapPin, Phone, AlertTriangle, CheckCircle2,
    Clock, Navigation, Camera, X, Send, Compass, ExternalLink,
    RefreshCw, Radio, Check, XCircle, ArrowRight, UserCheck,
    Wifi, WifiOff, BellRing, Volume2, VolumeX, Gauge
} from 'lucide-react';
import {
    getResponderAssignments, acceptAssignment, rejectAssignment,
    updateEmergencyStatus, resolveEmergency, toggleResponderAvailability,
    shareResponderLocation, uploadEmergencyAttachment, sendEmergencyMessage,
    EmergencySocketClient
} from '../../services/emergencyApi';
import './ResponderPortal.css';

// Synthetic Web Audio API Chime for urgent dispatches
const playEmergencyChime = (severity = 'CRITICAL') => {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        if (severity === 'CRITICAL') {
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            osc.frequency.setValueAtTime(1174, ctx.currentTime + 0.12);
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);
            osc.start();
            osc.stop(ctx.currentTime + 0.45);
        } else {
            osc.frequency.setValueAtTime(659.25, ctx.currentTime);
            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
            osc.start();
            osc.stop(ctx.currentTime + 0.35);
        }
    } catch (e) {}
};

const ResponderPortal = () => {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('civicai_user') || '{}');

    const [assignments, setAssignments] = useState([]);
    const [responderProfile, setResponderProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [availabilityStatus, setAvailabilityStatus] = useState('AVAILABLE');
    const [sharingLocation, setSharingLocation] = useState(false);
    const [watchId, setWatchId] = useState(null);

    // Real-Time WebSocket & Dispatch Alerts
    const [wsState, setWsState] = useState('connecting');
    const [incomingDispatchModal, setIncomingDispatchModal] = useState(null);
    const [liveSimData, setLiveSimData] = useState(null);
    const liveSimIntervalRef = useRef(null);
    const socketRef = useRef(null);

    // Reject Modal
    const [rejectModalCase, setRejectModalCase] = useState(null);
    const [rejectReason, setRejectReason] = useState('');
    const [rejectSubmitting, setRejectSubmitting] = useState(false);

    // Resolve Modal
    const [resolveModalCase, setResolveModalCase] = useState(null);
    const [resolutionSummary, setResolutionSummary] = useState('');
    const [resolvePhoto, setResolvePhoto] = useState(null);
    const [resolvePhotoPreview, setResolvePhotoPreview] = useState(null);
    const [resolveSubmitting, setResolveSubmitting] = useState(false);

    const loadAssignments = async () => {
        setLoading(true);
        try {
            const res = await getResponderAssignments(null, user.phone);
            if (res?.assignments) setAssignments(res.assignments);
            if (res?.responder) {
                setResponderProfile(res.responder);
                setAvailabilityStatus(res.responder.availability_status || 'AVAILABLE');
            }
        } catch (err) {
            console.error('Failed to load assignments:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAssignments();
    }, [user.phone]);

    // Live WebSocket Subscription for Immediate Dispatch Directives
    useEffect(() => {
        const respId = responderProfile?.responder_id || 'RSP-001';
        const clientId = `resp_${respId}_${Date.now()}`;
        const ws = new EmergencySocketClient({
            clientId,
            role: 'worker',
            userId: respId,
            onEvent: (event) => {
                console.log('[Responder Live Telemetry Event]', event);
                if (event.type === 'emergency.assigned') {
                    playEmergencyChime('CRITICAL');
                    setIncomingDispatchModal({
                        caseId: event.payload?.case?.case_id || event.payload?.case_id,
                        reference: event.payload?.reference_no || event.payload?.case?.reference_no,
                        category: event.payload?.case?.category_name || 'Emergency Dispatch',
                        severity: event.payload?.case?.severity || 'HIGH',
                        address: event.payload?.case?.address || 'Reported Incident Location',
                        description: event.payload?.case?.description || 'Priority dispatch assigned to your unit.',
                        time: new Date().toLocaleTimeString()
                    });
                    loadAssignments();
                } else if (
                    event.type === 'emergency.triaged' ||
                    event.type === 'emergency.escalated' ||
                    event.type === 'emergency.closed'
                ) {
                    loadAssignments();
                }
            },
            onStateChange: (state) => {
                setWsState(state);
            }
        });

        socketRef.current = ws;

        return () => {
            ws.disconnect();
            if (liveSimIntervalRef.current) clearInterval(liveSimIntervalRef.current);
        };
    }, [responderProfile?.responder_id]);

    // Interactive Real-Time GPS Route Simulator (Drives responder towards incident)
    const handleStartGpsSimulation = (c) => {
        if (liveSimIntervalRef.current) {
            clearInterval(liveSimIntervalRef.current);
            liveSimIntervalRef.current = null;
            setLiveSimData(null);
            return;
        }

        const startLat = responderProfile?.latitude || 18.5204;
        const startLon = responderProfile?.longitude || 73.8567;
        const targetLat = c.latitude || 18.5300;
        const targetLon = c.longitude || 73.8600;
        const totalSteps = 6;
        let step = 0;

        setLiveSimData({
            active: true,
            caseId: c.case_id,
            caseRef: c.reference_no,
            currentLat: startLat,
            currentLon: startLon,
            targetLat,
            targetLon,
            step: 0,
            totalSteps,
            distanceKm: 2.2,
            speedKmh: 45,
            etaMins: 4
        });

        liveSimIntervalRef.current = setInterval(() => {
            step += 1;
            const progress = step / totalSteps;
            const lat = Number((startLat + (targetLat - startLat) * progress).toFixed(6));
            const lon = Number((startLon + (targetLon - startLon) * progress).toFixed(6));
            const remainingDist = Number(Math.max(0, (2.2 * (1 - progress))).toFixed(2));
            const speed = step < totalSteps ? Math.floor(40 + Math.random() * 15) : 0;
            const eta = Math.ceil(remainingDist * 1.5);

            setLiveSimData({
                active: true,
                caseId: c.case_id,
                caseRef: c.reference_no,
                currentLat: lat,
                currentLon: lon,
                targetLat,
                targetLon,
                step,
                totalSteps,
                distanceKm: remainingDist,
                speedKmh: speed,
                etaMins: eta
            });

            // Broadcast real-time location to backend (which informs citizen & dispatcher via WebSocket)
            shareResponderLocation(
                responderProfile?.responder_id || 'RSP-001',
                c.case_id,
                lat,
                lon,
                5.0
            ).catch(() => {});

            if (step >= totalSteps) {
                clearInterval(liveSimIntervalRef.current);
                liveSimIntervalRef.current = null;
                playEmergencyChime('INFO');
            }
        }, 3000);
    };

    // Handle Availability Toggle
    const handleToggleAvailability = async (newStatus) => {
        if (!responderProfile) return;
        try {
            await toggleResponderAvailability(responderProfile.responder_id, newStatus);
            setAvailabilityStatus(newStatus);
        } catch (err) {
            alert('Failed to update availability: ' + err.message);
        }
    };

    // Live Location Sharing
    const handleToggleLocationSharing = (activeCaseId) => {
        if (sharingLocation) {
            if (watchId !== null) navigator.geolocation.clearWatch(watchId);
            setSharingLocation(false);
            setWatchId(null);
        } else {
            if (!navigator.geolocation) {
                alert('Geolocation not supported on this device.');
                return;
            }
            const id = navigator.geolocation.watchPosition(
                (pos) => {
                    if (responderProfile) {
                        shareResponderLocation(
                            responderProfile.responder_id,
                            activeCaseId,
                            pos.coords.latitude,
                            pos.coords.longitude,
                            pos.coords.accuracy
                        ).catch(() => {});
                    }
                },
                (err) => console.warn('Location watch error:', err.message),
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
            );
            setWatchId(id);
            setSharingLocation(true);
        }
    };

    // Accept Assignment
    const handleAccept = async (c) => {
        try {
            await acceptAssignment(
                c.case_id,
                responderProfile?.responder_id || 'RSP-001',
                responderProfile?.name || user.name || 'Duty Responder'
            );
            loadAssignments();
        } catch (err) {
            alert('Error accepting assignment: ' + err.message);
        }
    };

    // Reject Assignment
    const handleConfirmReject = async (e) => {
        e.preventDefault();
        if (!rejectModalCase || !rejectReason.trim()) return;
        setRejectSubmitting(true);
        try {
            await rejectAssignment(
                rejectModalCase.case_id,
                responderProfile?.responder_id || 'RSP-001',
                responderProfile?.name || user.name || 'Duty Responder',
                rejectReason.trim()
            );
            setRejectModalCase(null);
            setRejectReason('');
            loadAssignments();
        } catch (err) {
            alert('Error rejecting assignment: ' + err.message);
        } finally {
            setRejectSubmitting(false);
        }
    };

    // Status Progression: Start Response or Mark On Scene
    const handleProgressStatus = async (caseId, newStatus) => {
        try {
            await updateEmergencyStatus(
                caseId,
                newStatus,
                responderProfile?.responder_id || 'RSP-001',
                'responder',
                responderProfile?.name || user.name || 'Responder',
                newStatus === 'RESPONDING' ? 'Responder is en route with response equipment.' : 'Responder has arrived on scene.'
            );
            loadAssignments();
        } catch (err) {
            alert('Status error: ' + err.message);
        }
    };

    // Execute Resolve
    const handleConfirmResolve = async (e) => {
        e.preventDefault();
        if (!resolveModalCase || !resolutionSummary.trim()) return;
        setResolveSubmitting(true);
        try {
            // Upload resolution evidence if chosen
            if (resolvePhoto) {
                try {
                    await uploadEmergencyAttachment(
                        resolveModalCase.case_id,
                        resolvePhoto,
                        'resolution_evidence',
                        responderProfile?.name || user.name || 'Responder',
                        'responder'
                    );
                } catch (uploadErr) {
                    console.warn('Resolution photo upload failed:', uploadErr.message);
                }
            }

            await resolveEmergency(
                resolveModalCase.case_id,
                resolutionSummary.trim(),
                responderProfile?.responder_id || 'RSP-001',
                responderProfile?.name || user.name || 'Responder'
            );

            setResolveModalCase(null);
            setResolutionSummary('');
            setResolvePhoto(null);
            setResolvePhotoPreview(null);
            loadAssignments();
        } catch (err) {
            alert('Resolution submission error: ' + err.message);
        } finally {
            setResolveSubmitting(false);
        }
    };

    const activeAssignments = assignments.filter((a) => a.case && !['RESOLVED', 'CLOSED', 'CANCELLED'].includes(a.case.status));
    const completedAssignments = assignments.filter((a) => a.case && ['RESOLVED', 'CLOSED'].includes(a.case.status));

    return (
        <div className="responder-portal-page">
            <div className="container responder-container">
                {/* Header Profile Bar */}
                <div className="responder-header-card">
                    <div className="responder-profile-left">
                        <div className="resp-avatar-icon">
                            <HardHat size={26} />
                        </div>
                        <div>
                            <div className="resp-title-row">
                                <h1>{responderProfile?.name || user.name || 'Duty Field Responder'}</h1>
                                <span className="badge-verified">Verified Unit</span>
                            </div>
                            <p className="text-muted" style={{ margin: '2px 0 6px', fontSize: '0.84rem' }}>
                                {responderProfile?.role || 'Paramedic & Emergency Specialist'} · {responderProfile?.department || 'Emergency Operations'}
                            </p>
                            <div className="resp-meta-pills">
                                <span className="pill-area"><MapPin size={12} /> {responderProfile?.service_area || 'Pune Metropolitan Sector'}</span>
                                <span className="pill-active-count">Active Incidents: {activeAssignments.length}</span>
                                <span className={`live-ws-pill ${wsState}`}>
                                    <span className="live-ws-dot" />
                                    {wsState === 'connected' ? 'LIVE DISPATCH FEED' : 'CONNECTING...'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="responder-profile-right">
                        <span className="avail-label">Duty Availability:</span>
                        <div className="availability-btn-group">
                            <button
                                type="button"
                                className={`btn-avail ${availabilityStatus === 'AVAILABLE' ? 'active-avail' : ''}`}
                                onClick={() => handleToggleAvailability('AVAILABLE')}
                            >
                                Available
                            </button>
                            <button
                                type="button"
                                className={`btn-avail ${availabilityStatus === 'BUSY' ? 'active-busy' : ''}`}
                                onClick={() => handleToggleAvailability('BUSY')}
                            >
                                Busy
                            </button>
                            <button
                                type="button"
                                className={`btn-avail ${availabilityStatus === 'OFFLINE' ? 'active-offline' : ''}`}
                                onClick={() => handleToggleAvailability('OFFLINE')}
                            >
                                Off Duty
                            </button>
                        </div>
                    </div>
                </div>

                {/* Active Assignments Queue */}
                <div className="assignments-section">
                    <div className="section-head">
                        <div>
                            <h2>Active Field Deployments ({activeAssignments.length})</h2>
                            <p className="text-muted">Incidents currently assigned to your response unit</p>
                        </div>
                        <button type="button" className="btn btn-outline btn-sm" onClick={loadAssignments}>
                            <RefreshCw size={13} className={loading ? 'spin-icon' : ''} /> Refresh
                        </button>
                    </div>

                    {loading ? (
                        <div className="resp-loading-box">
                            <div className="spinner" />
                            <p>Loading assigned incidents...</p>
                        </div>
                    ) : activeAssignments.length === 0 ? (
                        <div className="resp-empty-box">
                            <CheckCircle2 size={40} className="text-success" />
                            <h3>No Active Assignments</h3>
                            <p className="text-muted">
                                You are currently clear. When the dispatcher operations team matches an emergency to your profile, it will appear here instantly.
                            </p>
                        </div>
                    ) : (
                        <div className="active-cards-list">
                            {activeAssignments.map(({ assignment_id, case: c, status: asgnStatus }) => (
                                <div key={assignment_id} className={`resp-assignment-card animate-fade-in priority-${(c.severity || 'HIGH').toLowerCase()}`}>
                                    <div className="r-card-top-bar">
                                        <div className="r-card-ref">
                                            <span className="ref-tag">{c.reference_no}</span>
                                            <span className="cat-title">{c.category_name}</span>
                                        </div>
                                        <div className="r-card-status-tags">
                                            <span className={`severity-tag severity-${(c.severity || 'HIGH').toLowerCase()}`}>
                                                {c.severity}
                                            </span>
                                            <span className={`status-pill status-${c.status.toLowerCase()}`}>
                                                {c.status.replace('_', ' ')}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="r-card-desc">
                                        <p>{c.description}</p>
                                    </div>

                                    {/* Location & Navigation */}
                                    <div className="r-card-location-row">
                                        <div className="loc-info">
                                            <MapPin size={16} className="text-danger" />
                                            <div>
                                                <strong>{c.address}</strong>
                                                {c.latitude && c.longitude && (
                                                    <small className="coords-text">
                                                        GPS: {c.latitude.toFixed(4)}°N, {c.longitude.toFixed(4)}°E
                                                        {c.location_accuracy && ` (±${c.location_accuracy}m)`}
                                                    </small>
                                                )}
                                            </div>
                                        </div>

                                        {c.latitude && c.longitude && (
                                            <a
                                                href={`https://www.google.com/maps/dir/?api=1&destination=${c.latitude},${c.longitude}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="btn-navigate-scene"
                                            >
                                                <Navigation size={14} /> Start Turn-by-Turn GPS
                                            </a>
                                        )}
                                    </div>

                                    {/* Caller details & immediate hazards */}
                                    <div className="r-card-details-grid">
                                        <div className="r-detail-item">
                                            <span className="label">Citizen Contact:</span>
                                            <div className="val">
                                                {c.reporter_name}
                                                {c.reporter_phone && (
                                                    <a href={`tel:${c.reporter_phone}`} className="btn-call-citizen">
                                                        <Phone size={12} /> {c.reporter_phone}
                                                    </a>
                                                )}
                                            </div>
                                        </div>

                                        <div className="r-detail-item">
                                            <span className="label">Hazards & Vulnerabilities:</span>
                                            <div className="val">
                                                {c.immediate_hazards?.length > 0 ? (
                                                    <div className="hazards-chips-row">
                                                        {c.immediate_hazards.map((h, i) => (
                                                            <span key={i} className="h-chip">{h}</span>
                                                        ))}
                                                    </div>
                                                ) : 'None reported'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Bar for Status Progression */}
                                    <div className="r-card-action-bar">
                                        {asgnStatus === 'OFFERED' || c.status === 'ASSIGNED' ? (
                                            <div className="offer-action-group">
                                                <button
                                                    type="button"
                                                    className="btn btn-outline btn-reject"
                                                    onClick={() => {
                                                        setRejectModalCase(c);
                                                        setRejectReason('');
                                                    }}
                                                >
                                                    <XCircle size={15} /> Decline Assignment
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn btn-primary btn-accept"
                                                    onClick={() => handleAccept(c)}
                                                >
                                                    <Check size={16} /> Accept & Prepare Response
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="in-progress-action-group">
                                                {c.status === 'ACCEPTED' && (
                                                    <button
                                                        type="button"
                                                        className="btn btn-primary"
                                                        onClick={() => handleProgressStatus(c.case_id, 'RESPONDING')}
                                                    >
                                                        <Navigation size={14} /> Start Response (En Route)
                                                    </button>
                                                )}

                                                {c.status === 'RESPONDING' && (
                                                    <button
                                                        type="button"
                                                        className="btn btn-primary"
                                                        onClick={() => handleProgressStatus(c.case_id, 'ON_SCENE')}
                                                    >
                                                        <MapPin size={14} /> Mark Arrival On Scene
                                                    </button>
                                                )}

                                                {/* Live Location Sharing & Route Telemetry Simulator */}
                                                <button
                                                    type="button"
                                                    className={`btn-loc-sharing ${liveSimData?.active && liveSimData?.caseId === c.case_id ? 'active' : ''}`}
                                                    onClick={() => handleStartGpsSimulation(c)}
                                                    title="Stream live real-time GPS telemetry to citizen & dispatcher via WebSocket"
                                                >
                                                    <Radio size={14} className={liveSimData?.active && liveSimData?.caseId === c.case_id ? 'pulse' : ''} />
                                                    <span>
                                                        {liveSimData?.active && liveSimData?.caseId === c.case_id
                                                            ? 'Stop Live GPS Stream'
                                                            : '📡 Stream Live GPS (Drive to Incident)'}
                                                    </span>
                                                </button>

                                                {c.status === 'ON_SCENE' && (
                                                    <button
                                                        type="button"
                                                        className="btn btn-success"
                                                        onClick={() => {
                                                            setResolveModalCase(c);
                                                            setResolutionSummary('');
                                                            setResolvePhoto(null);
                                                            setResolvePhotoPreview(null);
                                                        }}
                                                    >
                                                        <CheckCircle2 size={15} /> Resolve Emergency
                                                    </button>
                                                )}

                                                <button
                                                    type="button"
                                                    className="btn btn-outline btn-sm"
                                                    onClick={() => navigate(`/emergency/case/${c.case_id}`)}
                                                >
                                                    View Chat & Evidence
                                                </button>
                                            </div>
                                        )}

                                        {/* Real-Time Live GPS Telemetry Stream Box */}
                                        {liveSimData?.active && liveSimData?.caseId === c.case_id && (
                                            <div className="live-gps-telemetry-box animate-fade-in" style={{
                                                marginTop: '0.8rem',
                                                padding: '0.75rem',
                                                background: '#f0fdf4',
                                                border: '1px solid #86efac',
                                                borderRadius: '6px'
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600, color: '#166534' }}>
                                                        <span className="live-ws-dot" style={{ background: '#22c55e' }} />
                                                        STREAMING LIVE GPS TELEMETRY
                                                    </span>
                                                    <span style={{ fontSize: '0.78rem', color: '#166534', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                        <Gauge size={13} /> {liveSimData.speedKmh} km/h
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: '#14532d', fontFamily: 'monospace', marginBottom: '0.35rem' }}>
                                                    GPS: <strong>{liveSimData.currentLat}°N, {liveSimData.currentLon}°E</strong> (Broadcasting to Citizen & Dispatcher)
                                                </div>
                                                <div style={{ height: '6px', background: '#dcfce7', borderRadius: '3px', overflow: 'hidden', marginBottom: '0.35rem' }}>
                                                    <div style={{
                                                        height: '100%',
                                                        background: '#22c55e',
                                                        width: `${(liveSimData.step / liveSimData.totalSteps) * 100}%`,
                                                        transition: 'width 1s ease'
                                                    }} />
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#166534' }}>
                                                    <span>Remaining: <strong>{liveSimData.distanceKm} km</strong></span>
                                                    <span>ETA: <strong>{liveSimData.etaMins} mins</strong></span>
                                                    {liveSimData.distanceKm === 0 ? (
                                                        <span style={{ color: '#15803d', fontWeight: 700 }}>ARRIVED ON SCENE</span>
                                                    ) : (
                                                        <span style={{ color: '#15803d' }}>En Route (Waypoint {liveSimData.step}/{liveSimData.totalSteps})</span>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Completed Assignments Section */}
                {completedAssignments.length > 0 && (
                    <div className="completed-section">
                        <h3>Recently Resolved Incidents</h3>
                        <div className="completed-cards-grid">
                            {completedAssignments.map(({ assignment_id, case: c }) => (
                                <div key={assignment_id} className="completed-mini-card">
                                    <div className="mini-head">
                                        <strong>{c.reference_no} — {c.category_name}</strong>
                                        <span className="badge-resolved-sm">Resolved</span>
                                    </div>
                                    <p className="mini-desc">{c.description}</p>
                                    <small className="text-muted">
                                        Summary: {c.resolution_summary || 'Resolved on scene.'}
                                    </small>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Modal: Reject Assignment */}
            {rejectModalCase && (
                <div className="modal-backdrop animate-fade-in" onClick={() => setRejectModalCase(null)} style={{ zIndex: 1200 }}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
                        <div className="modal-header">
                            <div>
                                <h2>Decline Emergency Assignment</h2>
                                <p className="text-muted" style={{ fontSize: '0.84rem' }}>
                                    Case: {rejectModalCase.reference_no}
                                </p>
                            </div>
                            <button type="button" className="modal-close-btn" onClick={() => setRejectModalCase(null)}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleConfirmReject}>
                            <div className="form-group">
                                <label className="form-label required">Reason for Declining</label>
                                <textarea
                                    rows="3"
                                    className="form-control"
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    placeholder="e.g. Currently committed to another trauma victim / equipment fault / out of sector..."
                                    required
                                />
                                <small className="text-muted" style={{ display: 'block', marginTop: '4px' }}>
                                    The dispatcher will immediately be notified to reassign another available unit.
                                </small>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                                <button type="button" className="btn btn-outline" onClick={() => setRejectModalCase(null)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-danger" disabled={rejectSubmitting || !rejectReason.trim()}>
                                    {rejectSubmitting ? 'Declining...' : 'Confirm Rejection'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Mark Resolved */}
            {resolveModalCase && (
                <div className="modal-backdrop animate-fade-in" onClick={() => setResolveModalCase(null)} style={{ zIndex: 1200 }}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
                        <div className="modal-header">
                            <div>
                                <h2>Complete & Resolve Emergency</h2>
                                <p className="text-muted" style={{ fontSize: '0.84rem' }}>
                                    Case: {resolveModalCase.reference_no}
                                </p>
                            </div>
                            <button type="button" className="modal-close-btn" onClick={() => setResolveModalCase(null)}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleConfirmResolve}>
                            <div className="form-group">
                                <label className="form-label required">Resolution Summary</label>
                                <textarea
                                    rows="3"
                                    className="form-control"
                                    value={resolutionSummary}
                                    onChange={(e) => setResolutionSummary(e.target.value)}
                                    placeholder="Detail actions taken: patient stabilized, fire suppressed, hazard isolated, handed over to..."
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Resolution Evidence Photo (Optional)</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer' }}>
                                        <Camera size={14} /> Attach Photo
                                        <input
                                            type="file"
                                            accept="image/*"
                                            capture="environment"
                                            style={{ display: 'none' }}
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    setResolvePhoto(file);
                                                    setResolvePhotoPreview(URL.createObjectURL(file));
                                                }
                                            }}
                                        />
                                    </label>
                                    {resolvePhotoPreview && (
                                        <img
                                            src={resolvePhotoPreview}
                                            alt="Resolution preview"
                                            style={{ width: '48px', height: '48px', borderRadius: '6px', objectFit: 'cover' }}
                                        />
                                    )}
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
                                <button type="button" className="btn btn-outline" onClick={() => setResolveModalCase(null)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-success" disabled={resolveSubmitting || !resolutionSummary.trim()}>
                                    {resolveSubmitting ? 'Filing Resolution...' : 'Submit Resolution'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Urgent Real-Time Incoming Dispatch Directive */}
            {incomingDispatchModal && (
                <div className="modal-backdrop animate-fade-in" style={{ zIndex: 9999 }}>
                    <div className="modal-content" style={{ maxWidth: '480px', borderTop: '4px solid #dc2626' }}>
                        <div className="modal-header" style={{ background: '#fef2f2', borderBottom: '1px solid #fee2e2' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <span style={{ fontSize: '1.5rem', animation: 'pulse 1s infinite' }}>🚨</span>
                                <div>
                                    <h2 style={{ fontSize: '1.15rem', color: '#991b1b', margin: 0 }}>PRIORITY DISPATCH DIRECTIVE</h2>
                                    <p className="text-muted" style={{ margin: 0, fontSize: '0.8rem' }}>
                                        {incomingDispatchModal.reference} • {incomingDispatchModal.time}
                                    </p>
                                </div>
                            </div>
                            <button type="button" className="modal-close-btn" onClick={() => setIncomingDispatchModal(null)}>
                                <X size={18} />
                            </button>
                        </div>
                        <div style={{ padding: '1.2rem' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.8rem' }}>
                                <span className={`severity-tag severity-${incomingDispatchModal.severity.toLowerCase()}`}>
                                    {incomingDispatchModal.severity}
                                </span>
                                <span className="cat-title" style={{ fontSize: '0.88rem', fontWeight: 600 }}>
                                    {incomingDispatchModal.category}
                                </span>
                            </div>
                            <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '0.8rem' }}>
                                <div style={{ marginBottom: '0.4rem' }}>
                                    <strong>Reported Location:</strong> {incomingDispatchModal.address}
                                </div>
                                <div>
                                    <strong>Description:</strong> {incomingDispatchModal.description}
                                </div>
                            </div>
                            <p style={{ fontSize: '0.8rem', color: '#475569', margin: 0 }}>
                                Your unit has been designated based on proximity and qualified capability. Please accept deployment immediately to begin response.
                            </p>
                        </div>
                        <div className="modal-footer" style={{ padding: '0.8rem 1.2rem', display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', background: '#f8fafc' }}>
                            <button
                                type="button"
                                className="btn btn-outline"
                                onClick={() => {
                                    const c = assignments.find(a => a.case_id === incomingDispatchModal.caseId) || { case_id: incomingDispatchModal.caseId, reference_no: incomingDispatchModal.reference };
                                    setRejectModalCase(c);
                                    setIncomingDispatchModal(null);
                                }}
                            >
                                Decline
                            </button>
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={() => {
                                    const c = assignments.find(a => a.case_id === incomingDispatchModal.caseId) || { case_id: incomingDispatchModal.caseId };
                                    handleAccept(c);
                                    setIncomingDispatchModal(null);
                                }}
                            >
                                <Check size={16} /> Accept Deployment
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ResponderPortal;

