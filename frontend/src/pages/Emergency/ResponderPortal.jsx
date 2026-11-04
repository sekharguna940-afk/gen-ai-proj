import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    HardHat, Shield, MapPin, Phone, AlertTriangle, CheckCircle2,
    Clock, Navigation, Camera, X, Send, Compass, ExternalLink,
    RefreshCw, Radio, Check, XCircle, ArrowRight, UserCheck,
    Volume2, VolumeX, Car, LocateFixed, Navigation2
} from 'lucide-react';
import {
    getResponderAssignments, acceptAssignment, rejectAssignment,
    updateEmergencyStatus, resolveEmergency, toggleResponderAvailability,
    shareResponderLocation, uploadEmergencyAttachment, sendEmergencyMessage,
    EmergencySocketClient
} from '../../services/emergencyApi';
import { playEmergencyAlarm, playDispatchChime } from '../../utils/emergencyAudio';
import './ResponderPortal.css';

const ResponderPortal = () => {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('civicai_user') || '{}');

    const [assignments, setAssignments] = useState([]);
    const [responderProfile, setResponderProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [availabilityStatus, setAvailabilityStatus] = useState('AVAILABLE');
    const [sharingLocation, setSharingLocation] = useState(false);
    const [watchId, setWatchId] = useState(null);

    // Real-time Telemetry & Alert State
    const [wsState, setWsState] = useState('connecting');
    const [audioEnabled, setAudioEnabled] = useState(true);
    const [incomingDispatchAlert, setIncomingDispatchAlert] = useState(null);
    const [simulatingCaseId, setSimulatingCaseId] = useState(null);
    const [simProgress, setSimProgress] = useState(0);
    const [simDistance, setSimDistance] = useState(null);
    const simTimerRef = useRef(null);

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

    const loadAssignments = async (showLoading = true) => {
        if (showLoading) setLoading(true);
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
            if (showLoading) setLoading(false);
        }
    };

    useEffect(() => {
        loadAssignments(true);
    }, [user.phone]);

    // WebSocket real-time listener & 5s auto-poll fallback
    useEffect(() => {
        const clientId = `worker_${user.id || 'rsp'}_${Date.now()}`;
        const wsClient = new EmergencySocketClient({
            clientId,
            role: 'worker',
            userId: responderProfile?.responder_id || user.phone || 'usr_worker',
            onEvent: (event) => {
                if (event.type === 'emergency.assigned') {
                    if (audioEnabled) playEmergencyAlarm();
                    const c = event.payload?.case;
                    if (c) setIncomingDispatchAlert(c);
                    loadAssignments(false);
                } else if (['emergency.status_change', 'emergency.resolved', 'emergency.closed'].includes(event.type)) {
                    if (audioEnabled) playDispatchChime();
                    loadAssignments(false);
                }
            },
            onStateChange: (st) => {
                setWsState(st);
            }
        });

        const pollTimer = setInterval(() => {
            loadAssignments(false);
        }, 5000);

        return () => {
            clearInterval(pollTimer);
            wsClient.disconnect();
            if (simTimerRef.current) clearInterval(simTimerRef.current);
        };
    }, [responderProfile?.responder_id, audioEnabled]);

    // Simulated En-Route GPS Telemetry Movement
    const handleStartGpsSimulation = (c) => {
        if (simulatingCaseId === c.case_id) {
            // Stop simulation
            if (simTimerRef.current) clearInterval(simTimerRef.current);
            setSimulatingCaseId(null);
            setSimProgress(0);
            setSimDistance(null);
            return;
        }

        const startLat = responderProfile?.latitude || 18.5204;
        const startLon = responderProfile?.longitude || 73.8567;
        const targetLat = c.latitude || 18.5284;
        const targetLon = c.longitude || 73.8742;

        setSimulatingCaseId(c.case_id);
        setSimProgress(10);
        let step = 1;
        const totalSteps = 10;

        simTimerRef.current = setInterval(async () => {
            step += 1;
            const progress = (step / totalSteps);
            setSimProgress(Math.min(Math.round(progress * 100), 100));

            const curLat = startLat + (targetLat - startLat) * progress;
            const curLon = startLon + (targetLon - startLon) * progress;

            // Approximate remaining distance
            const dLat = (targetLat - curLat) * 111;
            const dLon = (targetLon - curLon) * 111;
            const distKm = Math.sqrt(dLat * dLat + dLon * dLon).toFixed(2);
            setSimDistance(distKm);

            try {
                await shareResponderLocation(
                    responderProfile?.responder_id || 'RSP-001',
                    c.case_id,
                    curLat,
                    curLon,
                    8.0
                );
            } catch (err) {
                // Ignore transient network errors
            }

            if (step >= totalSteps) {
                clearInterval(simTimerRef.current);
                if (audioEnabled) playDispatchChime();
                setSimDistance('0.00 (Arrived)');
            }
        }, 2200);
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
                {/* Immediate Deployment Alert Banner */}
                {incomingDispatchAlert && (
                    <div className="incoming-dispatch-banner animate-slide-down">
                        <div className="incoming-banner-left">
                            <div className="dispatch-badge-icon">
                                <Radio size={24} />
                            </div>
                            <div>
                                <h3>🚨 IMMEDIATE DEPLOYMENT ASSIGNED: {incomingDispatchAlert.reference_no}</h3>
                                <p>
                                    {incomingDispatchAlert.category_name} &bull; Priority: {incomingDispatchAlert.severity}
                                    {incomingDispatchAlert.address ? ` • ${incomingDispatchAlert.address}` : ''}
                                </p>
                            </div>
                        </div>
                        <div className="incoming-banner-actions">
                            <button
                                type="button"
                                className="btn btn-sm btn-light"
                                onClick={() => {
                                    handleAccept(incomingDispatchAlert);
                                    setIncomingDispatchAlert(null);
                                }}
                            >
                                <Check size={15} /> Accept Dispatch
                            </button>
                            <button
                                type="button"
                                className="btn btn-sm btn-ghost"
                                onClick={() => setIncomingDispatchAlert(null)}
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>
                )}

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
                                <div className={`live-status-pill ${wsState === 'offline' ? 'offline' : ''}`} style={{ marginLeft: '4px' }}>
                                    <span className={`status-dot ${wsState === 'connected' ? 'dot-live' : 'dot-warn'}`} />
                                    <span>{wsState === 'connected' ? 'LIVE GPS STREAM' : 'AUTO-POLL (5s)'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="responder-profile-right">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <span className="avail-label">Duty Availability:</span>
                            <button
                                type="button"
                                className="btn btn-ghost btn-xs audio-toggle-btn"
                                onClick={() => setAudioEnabled(!audioEnabled)}
                                title={audioEnabled ? 'Sound alert enabled' : 'Sound muted'}
                            >
                                {audioEnabled ? <Volume2 size={13} className="text-danger" /> : <VolumeX size={13} className="text-muted" />}
                                {audioEnabled ? 'Sound ON' : 'Muted'}
                            </button>
                        </div>
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

                                    {/* Real-time En-Route Telemetry Controller */}
                                    {(c.status === 'ACCEPTED' || c.status === 'RESPONDING') && (
                                        <div className="gps-telemetry-controller">
                                            <div className="telemetry-header">
                                                <div className="telemetry-header-title">
                                                    <Navigation2 size={15} /> Real-Time Telemetry Stream
                                                </div>
                                                <button
                                                    type="button"
                                                    className={`btn btn-xs ${simulatingCaseId === c.case_id ? 'btn-danger' : 'btn-primary'}`}
                                                    onClick={() => handleStartGpsSimulation(c)}
                                                >
                                                    {simulatingCaseId === c.case_id ? (
                                                        <>Stop Telemetry</>
                                                    ) : (
                                                        <><Car size={13} /> Stream Live Movement</>
                                                    )}
                                                </button>
                                            </div>
                                            {simulatingCaseId === c.case_id ? (
                                                <div className="animate-fade-in">
                                                    <div className="telemetry-progress-track">
                                                        <div className="telemetry-progress-fill" style={{ width: `${simProgress}%` }} />
                                                    </div>
                                                    <div className="telemetry-stats-row">
                                                        <span><span className="enroute-pulse" /> Live Telemetry Broadcasting to Dispatcher & Citizen</span>
                                                        <strong>Remaining: {simDistance ? `${simDistance} km` : 'Broadcasting...'} ({simProgress}%)</strong>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                                                    Click <strong>Stream Live Movement</strong> to simulate vehicles advancing en route. Coordinates update live on the Citizen and Dispatcher screens.
                                                </div>
                                            )}
                                        </div>
                                    )}

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

                                                {/* Live Location Sharing Toggle */}
                                                <button
                                                    type="button"
                                                    className={`btn-loc-sharing ${sharingLocation ? 'active' : ''}`}
                                                    onClick={() => handleToggleLocationSharing(c.case_id)}
                                                    title="Share live responder GPS coordinates with citizen & dispatcher"
                                                >
                                                    <Radio size={14} className={sharingLocation ? 'pulse' : ''} />
                                                    <span>{sharingLocation ? 'Broadcasting Live Location' : 'Share Live GPS'}</span>
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
        </div>
    );
};

export default ResponderPortal;

