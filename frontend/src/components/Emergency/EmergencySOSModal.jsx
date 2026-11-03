import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Siren, X, MapPin, Camera, AlertTriangle, Users, Accessibility, Phone,
    CheckCircle2, Loader2, Sparkles, LocateFixed, Eye, ChevronDown, ChevronUp,
    ShieldAlert, Info, Crosshair
} from 'lucide-react';
import { getEmergencyCategories, submitEmergency, uploadEmergencyAttachment } from '../../services/emergencyApi';
import EmergencyAIModal from './EmergencyAIModal';
import './EmergencySOSModal.css';

const HAZARD_OPTIONS = [
    { id: 'fire', label: 'Active Fire / Smoke' },
    { id: 'live_wire', label: 'Live Wire / Electrical Arc' },
    { id: 'unconscious', label: 'Person Unconscious' },
    { id: 'severe_bleeding', label: 'Severe Bleeding' },
    { id: 'trapped_person', label: 'Person Trapped' },
    { id: 'gas_leak', label: 'Gas Leak / Toxic Odor' },
    { id: 'flood_water', label: 'Rising Floodwaters' },
    { id: 'active_violence', label: 'Active Threat / Violence' },
];

const ACCESSIBILITY_OPTIONS = [
    'Wheelchair user / Mobility impaired',
    'Elderly individuals needing assistance',
    'Infants / Small children present',
    'Non-verbal / Hearing impaired',
    'Requires continuous oxygen supply'
];

const EmergencySOSModal = ({ isOpen, onClose, defaultCategory = null }) => {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('civicai_user') || '{}');

    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('medical');
    const [description, setDescription] = useState('');
    const [callbackPhone, setCallbackPhone] = useState(user.phone || '');
    const [reporterName, setReporterName] = useState(user.name || 'Citizen');

    // Location state
    const [location, setLocation] = useState({
        latitude: null,
        longitude: null,
        accuracy: null,
        address: '',
        status: 'idle', // idle, locating, success, denied, error
        errorMessage: ''
    });
    const [manualAddress, setManualAddress] = useState('');
    const [locationCorrected, setLocationCorrected] = useState(false);

    // Additional info
    const [affectedCount, setAffectedCount] = useState('');
    const [selectedHazards, setSelectedHazards] = useState([]);
    const [selectedAccessibility, setSelectedAccessibility] = useState([]);
    const [emergencyContact, setEmergencyContact] = useState('');
    const [consentLocation, setConsentLocation] = useState(true);
    const [showAdvanced, setShowAdvanced] = useState(false);

    // Attachment
    const [photoFile, setPhotoFile] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);

    // Submission states
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState(null);
    const [successResult, setSuccessResult] = useState(null);
    const [aiModalOpen, setAiModalOpen] = useState(false);

    useEffect(() => {
        if (isOpen) {
            getEmergencyCategories()
                .then((res) => {
                    if (res?.categories?.length > 0) {
                        setCategories(res.categories);
                        if (defaultCategory) setSelectedCategory(defaultCategory);
                        else if (!selectedCategory) setSelectedCategory(res.categories[0].id);
                    }
                })
                .catch(() => {});

            // Auto-trigger browser geolocation on modal open with explicit user permission
            detectCurrentLocation();
        }
    }, [isOpen]);

    const detectCurrentLocation = () => {
        if (!navigator.geolocation) {
            setLocation({
                latitude: null,
                longitude: null,
                accuracy: null,
                address: '',
                status: 'error',
                errorMessage: 'Geolocation is not supported by your browser.'
            });
            return;
        }

        setLocation((prev) => ({ ...prev, status: 'locating', errorMessage: '' }));

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = pos.coords.latitude;
                const lon = pos.coords.longitude;
                const acc = Math.round(pos.coords.accuracy);

                // Reverse geocode via OpenStreetMap Nominatim
                fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`, {
                    headers: { 'Accept': 'application/json' }
                })
                    .then((r) => r.json())
                    .then((geo) => {
                        const addr = geo.display_name || `${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E`;
                        setLocation({
                            latitude: lat,
                            longitude: lon,
                            accuracy: acc,
                            address: addr,
                            status: 'success',
                            errorMessage: ''
                        });
                        if (!manualAddress) setManualAddress(addr);
                    })
                    .catch(() => {
                        setLocation({
                            latitude: lat,
                            longitude: lon,
                            accuracy: acc,
                            address: `Near ${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E (Pune Region)`,
                            status: 'success',
                            errorMessage: ''
                        });
                    });
            },
            (err) => {
                let msg = 'Location detection unavailable.';
                if (err.code === 1) msg = 'Location permission denied by user. Please enter address manually below.';
                else if (err.code === 2) msg = 'Location signal unavailable. Please enter address manually.';
                else if (err.code === 3) msg = 'Location request timed out. Retrying or enter manually.';

                setLocation({
                    latitude: null,
                    longitude: null,
                    accuracy: null,
                    address: '',
                    status: err.code === 1 ? 'denied' : 'error',
                    errorMessage: msg
                });
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
        );
    };

    const handleHazardToggle = (hazardId) => {
        setSelectedHazards((prev) =>
            prev.includes(hazardId) ? prev.filter((h) => h !== hazardId) : [...prev, hazardId]
        );
    };

    const handlePhotoChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            setPhotoFile(file);
            setPhotoPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitError(null);

        if (!description.trim()) {
            setSubmitError('Please enter a brief description of the emergency.');
            return;
        }

        setSubmitting(true);
        try {
            const idempotencyKey = `sos_${user.phone || 'guest'}_${Date.now()}`;
            const finalAddress = manualAddress.trim() || location.address || (location.latitude ? `${location.latitude.toFixed(4)}°N, ${location.longitude.toFixed(4)}°E` : 'Location not provided');

            const payload = {
                category_id: selectedCategory,
                description: description.trim(),
                reporter_name: reporterName || user.name || 'Citizen',
                reporter_phone: callbackPhone || user.phone || '+919876543210',
                reporter_id: user.id || `usr_${(callbackPhone || '9876543210').slice(-10)}`,
                latitude: location.latitude,
                longitude: location.longitude,
                location_accuracy: location.accuracy,
                address: finalAddress,
                location_corrected: locationCorrected,
                affected_count: affectedCount ? parseInt(affectedCount, 10) : null,
                immediate_hazards: selectedHazards,
                accessibility_needs: selectedAccessibility.join('; '),
                emergency_contact: emergencyContact,
                consent_location_sharing: consentLocation,
                idempotency_key: idempotencyKey,
            };

            const res = await submitEmergency(payload);

            // Upload photo evidence if provided
            if (photoFile && res?.case_id) {
                try {
                    await uploadEmergencyAttachment(
                        res.case_id,
                        photoFile,
                        'incident_evidence',
                        payload.reporter_name,
                        'citizen'
                    );
                } catch (uploadErr) {
                    console.warn('Evidence upload failed:', uploadErr.message);
                }
            }

            setSuccessResult(res);
        } catch (err) {
            setSubmitError(err.message || 'Failed to submit emergency report. Please try again or call 112 directly.');
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-backdrop animate-fade-in" onClick={onClose} style={{ zIndex: 1050 }}>
            <div className="modal-content emergency-sos-modal" onClick={(e) => e.stopPropagation()}>
                {successResult ? (
                    <div className="sos-success-view animate-fade-in">
                        <div className="sos-success-icon-wrap">
                            <CheckCircle2 size={48} className="text-success" />
                        </div>
                        <h2>Emergency Case Registered</h2>
                        <div className="reference-badge-box">
                            <span className="ref-label">Official Case Reference</span>
                            <span className="ref-number">{successResult.reference_no}</span>
                        </div>
                        <p className="sos-success-msg">
                            Your emergency has been placed in the priority dispatcher queue.
                            Internal verified responders are being matched and dispatched.
                        </p>

                        <div className="sos-summary-card">
                            <div className="summary-row">
                                <span>Initial Triage Severity:</span>
                                <strong className={`severity-tag severity-${(successResult.severity || 'HIGH').toLowerCase()}`}>
                                    {successResult.severity}
                                </strong>
                            </div>
                            <div className="summary-row">
                                <span>Reported Location:</span>
                                <span>{successResult.reported_location?.address || 'Location Tagged'}</span>
                            </div>
                            <div className="summary-row">
                                <span>Current Status:</span>
                                <strong className="text-primary">{successResult.status}</strong>
                            </div>
                            <div className="summary-row">
                                <span>Triage Assessment:</span>
                                <small>{successResult.triage_reason}</small>
                            </div>
                        </div>

                        <div className="official-disclaimer-box">
                            <Info size={16} />
                            <span>
                                <strong>Safety Reminder:</strong> In life-threatening emergencies, dial <strong>112</strong> immediately.
                                SAHAYA AI operates internal community coordination.
                            </span>
                        </div>

                        <div className="sos-success-actions">
                            <button
                                type="button"
                                className="btn btn-primary btn-lg"
                                onClick={() => {
                                    onClose();
                                    navigate(`/emergency/case/${successResult.case_id}`);
                                }}
                            >
                                Track Incident Live & View Timeline
                            </button>
                            <button
                                type="button"
                                className="btn btn-outline"
                                onClick={onClose}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="modal-header sos-modal-header">
                            <div className="sos-header-title">
                                <span className="sos-siren-badge">
                                    <Siren size={20} />
                                </span>
                                <div>
                                    <h2>SAHAYA AI — Emergency SOS</h2>
                                    <p className="text-muted">Instant Community Emergency Reporting & Dispatch</p>
                                </div>
                            </div>
                            <div className="sos-header-tools">
                                <button
                                    type="button"
                                    className="btn-ai-assist"
                                    onClick={() => setAiModalOpen(true)}
                                    title="AI Category & Safety Advice"
                                >
                                    <Sparkles size={15} /> AI Assistant
                                </button>
                                <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close modal">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Critical Disclaimer Notice */}
                        <div className="sos-disclaimer-banner">
                            <ShieldAlert size={18} className="disclaimer-icon" />
                            <div>
                                <strong>Notice:</strong> Submitting to SAHAYA AI coordinates internal verified responders and community teams.
                                It does <em>not</em> automatically call public 112 police/ambulance services.
                                For immediate life-critical danger, call <strong>112</strong> directly.
                            </div>
                        </div>

                        {submitError && (
                            <div className="sos-error-alert animate-fade-in">
                                <AlertTriangle size={16} />
                                <span>{submitError}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="sos-form">
                            {/* 1. Category Selection */}
                            <div className="form-group">
                                <label className="form-label required">
                                    Emergency Category
                                </label>
                                <div className="category-chips-grid">
                                    {categories.map((cat) => (
                                        <button
                                            type="button"
                                            key={cat.id}
                                            className={`category-chip ${selectedCategory === cat.id ? 'active' : ''}`}
                                            onClick={() => setSelectedCategory(cat.id)}
                                        >
                                            <span className="cat-name">{cat.name}</span>
                                            <span className={`cat-pill cat-${cat.default_severity.toLowerCase()}`}>
                                                {cat.default_severity}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 2. Description */}
                            <div className="form-group">
                                <label className="form-label required" htmlFor="sos-desc">
                                    What is the emergency? (Short description)
                                </label>
                                <textarea
                                    id="sos-desc"
                                    rows="2"
                                    className="form-control"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Briefly state what happened, visible injuries, or immediate dangers..."
                                    required
                                />
                            </div>

                            {/* 3. Location Detection & GPS */}
                            <div className="form-group location-block">
                                <div className="location-label-row">
                                    <label className="form-label required">Incident Location</label>
                                    <button
                                        type="button"
                                        className="btn-link-locate"
                                        onClick={detectCurrentLocation}
                                        disabled={location.status === 'locating'}
                                    >
                                        {location.status === 'locating' ? (
                                            <><Loader2 size={13} className="spin-icon" /> Detecting...</>
                                        ) : (
                                            <><Crosshair size={13} /> Detect GPS</>
                                        )}
                                    </button>
                                </div>

                                <div className={`location-status-card ${location.status}`}>
                                    <MapPin size={18} className="loc-pin-icon" />
                                    <div className="loc-text-col">
                                        {location.status === 'locating' && (
                                            <span className="loc-loading">Requesting browser GPS with high accuracy...</span>
                                        )}
                                        {location.status === 'success' && (
                                            <>
                                                <div className="loc-address-text">{location.address}</div>
                                                <div className="loc-coords-sub">
                                                    GPS: {location.latitude.toFixed(5)}°N, {location.longitude.toFixed(5)}°E
                                                    {location.accuracy && (
                                                        <span className="acc-tag">Accuracy: ±{location.accuracy}m</span>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                        {(location.status === 'denied' || location.status === 'error') && (
                                            <span className="loc-error-text">{location.errorMessage}</span>
                                        )}
                                        {location.status === 'idle' && (
                                            <span className="loc-idle-text">Click Detect GPS or enter landmark manually below.</span>
                                        )}
                                    </div>
                                </div>

                                <div className="manual-address-input-wrap">
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={manualAddress}
                                        onChange={(e) => {
                                            setManualAddress(e.target.value);
                                            setLocationCorrected(true);
                                        }}
                                        placeholder="Add exact landmark, room/floor, or manual cross street..."
                                    />
                                </div>
                            </div>

                            {/* 4. Quick Photo / Video Evidence */}
                            <div className="form-group">
                                <label className="form-label">
                                    Photograph or Evidence (Optional)
                                </label>
                                <div className="photo-upload-row">
                                    <label className="photo-picker-label">
                                        <Camera size={16} />
                                        <span>{photoFile ? photoFile.name : 'Take photo or choose file'}</span>
                                        <input
                                            type="file"
                                            accept="image/*,video/mp4"
                                            capture="environment"
                                            onChange={handlePhotoChange}
                                        />
                                    </label>
                                    {photoPreview && (
                                        <div className="photo-preview-wrap">
                                            <img src={photoPreview} alt="Preview" className="photo-preview-thumb" />
                                            <button
                                                type="button"
                                                className="btn-remove-photo"
                                                onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Quick Submit or Expand More Details */}
                            <div className="advanced-toggle-row">
                                <button
                                    type="button"
                                    className="btn-toggle-advanced"
                                    onClick={() => setShowAdvanced(!showAdvanced)}
                                >
                                    {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    <span>{showAdvanced ? 'Hide additional emergency details' : 'Add details (hazards, affected count, accessibility)'}</span>
                                </button>
                            </div>

                            {showAdvanced && (
                                <div className="advanced-fields-box animate-fade-in">
                                    {/* Immediate Hazards */}
                                    <div className="form-group">
                                        <label className="form-label">Immediate Hazards Present</label>
                                        <div className="hazards-checkbox-grid">
                                            {HAZARD_OPTIONS.map((h) => (
                                                <label key={h.id} className={`hazard-checkbox-card ${selectedHazards.includes(h.id) ? 'checked' : ''}`}>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedHazards.includes(h.id)}
                                                        onChange={() => handleHazardToggle(h.id)}
                                                    />
                                                    <span>{h.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Number of affected people */}
                                    <div className="form-row-2">
                                        <div className="form-group">
                                            <label className="form-label">Affected People (if known)</label>
                                            <input
                                                type="number"
                                                min="1"
                                                className="form-control"
                                                value={affectedCount}
                                                onChange={(e) => setAffectedCount(e.target.value)}
                                                placeholder="e.g. 2"
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label">Callback Phone</label>
                                            <input
                                                type="tel"
                                                className="form-control"
                                                value={callbackPhone}
                                                onChange={(e) => setCallbackPhone(e.target.value)}
                                                placeholder="+91..."
                                            />
                                        </div>
                                    </div>

                                    {/* Accessibility or assistance requirements */}
                                    <div className="form-group">
                                        <label className="form-label">Special Vulnerability or Accessibility Requirements</label>
                                        <div className="accessibility-chips">
                                            {ACCESSIBILITY_OPTIONS.map((opt) => (
                                                <button
                                                    type="button"
                                                    key={opt}
                                                    className={`acc-chip ${selectedAccessibility.includes(opt) ? 'active' : ''}`}
                                                    onClick={() => {
                                                        setSelectedAccessibility((prev) =>
                                                            prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt]
                                                        );
                                                    }}
                                                >
                                                    {opt}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Emergency contact */}
                                    <div className="form-group">
                                        <label className="form-label">Optional Emergency Contact Name & Phone</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={emergencyContact}
                                            onChange={(e) => setEmergencyContact(e.target.value)}
                                            placeholder="e.g. Ramesh Sharma (Brother) - 9822012345"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Consent Checkbox */}
                            <div className="consent-row">
                                <label className="consent-label">
                                    <input
                                        type="checkbox"
                                        checked={consentLocation}
                                        onChange={(e) => setConsentLocation(e.target.checked)}
                                    />
                                    <span>
                                        I consent to sharing my GPS location and incident details with verified responders and authorized dispatchers.
                                    </span>
                                </label>
                            </div>

                            {/* Submit Button */}
                            <div className="sos-modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-outline"
                                    onClick={onClose}
                                    disabled={submitting}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-danger btn-lg sos-submit-btn"
                                    disabled={submitting || !description.trim()}
                                >
                                    {submitting ? (
                                        <><Loader2 size={18} className="spin-icon" /> Sending SOS...</>
                                    ) : (
                                        <><Siren size={18} /> Submit Emergency SOS</>
                                    )}
                                </button>
                            </div>
                        </form>
                    </>
                )}
            </div>

            <EmergencyAIModal
                isOpen={aiModalOpen}
                onClose={() => setAiModalOpen(false)}
                onApplyCategory={(cat) => setSelectedCategory(cat)}
            />
        </div>
    );
};

export default EmergencySOSModal;

