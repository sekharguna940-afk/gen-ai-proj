/**
 * emergencyApi.js — Client API service for SAHAYA AI Emergency Response & Coordination.
 * Provides REST calls and robust WebSocket subscriptions with auto-reconnect and REST fallbacks.
 */

const BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api').replace(/\/$/, '');
const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8000/api/ws/emergency';

async function request(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (options.body instanceof FormData) {
        delete headers['Content-Type'];
    }

    try {
        const res = await fetch(url, {
            ...options,
            headers,
        });
        if (!res.ok) {
            const errBody = await res.json().catch(() => ({}));
            const err = new Error(errBody.detail || errBody.message || `HTTP ${res.status}`);
            err.status = res.status;
            err.data = errBody;
            throw err;
        }
        return await res.json();
    } catch (err) {
        console.warn(`Emergency API call failed for ${endpoint}:`, err.message);
        throw err;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// REST APIs
// ─────────────────────────────────────────────────────────────────────────────

export async function getEmergencyCategories() {
    return request('/emergency/categories');
}

export async function updateEmergencyCategory(catId, payload) {
    return request(`/admin/emergency/categories/${catId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
    });
}

export async function submitEmergency(data) {
    return request('/emergency', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export async function getMyEmergencies(phone, reporterId) {
    const params = new URLSearchParams();
    if (phone) params.set('phone', phone);
    if (reporterId) params.set('reporter_id', reporterId);
    return request(`/emergency/mine?${params.toString()}`);
}

export async function getEmergencyDetail(identifier) {
    return request(`/emergency/${identifier}`);
}

export async function overrideTriage(caseId, severity, reason, dispatcherId, dispatcherName) {
    return request(`/emergency/${caseId}/triage`, {
        method: 'POST',
        body: JSON.stringify({ severity, reason, dispatcher_id: dispatcherId, dispatcher_name: dispatcherName }),
    });
}

export async function getEligibleResponders(caseId) {
    return request(`/emergency/${caseId}/eligible-responders`);
}

export async function assignResponder(caseId, responderId, dispatcherId, dispatcherName) {
    return request(`/emergency/${caseId}/assign`, {
        method: 'POST',
        body: JSON.stringify({ responder_id: responderId, dispatcher_id: dispatcherId, dispatcher_name: dispatcherName }),
    });
}

export async function acceptAssignment(caseId, responderId, responderName) {
    return request(`/emergency/${caseId}/accept`, {
        method: 'POST',
        body: JSON.stringify({ responder_id: responderId, responder_name: responderName }),
    });
}

export async function rejectAssignment(caseId, responderId, responderName, reason) {
    return request(`/emergency/${caseId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ responder_id: responderId, responder_name: responderName, reason }),
    });
}

export async function updateEmergencyStatus(caseId, status, actorId, actorRole, actorName, remarks) {
    return request(`/emergency/${caseId}/status`, {
        method: 'POST',
        body: JSON.stringify({ status, actor_id: actorId, actor_role: actorRole, actor_name: actorName, remarks }),
    });
}

export async function resolveEmergency(caseId, resolutionSummary, responderId, responderName) {
    return request(`/emergency/${caseId}/resolve`, {
        method: 'POST',
        body: JSON.stringify({ resolution_summary: resolutionSummary, responder_id: responderId, responder_name: responderName }),
    });
}

export async function closeEmergency(caseId, dispatcherId, dispatcherName, remarks) {
    return request(`/emergency/${caseId}/close`, {
        method: 'POST',
        body: JSON.stringify({ dispatcher_id: dispatcherId, dispatcher_name: dispatcherName, remarks }),
    });
}

export async function reopenEmergency(caseId, reason, actorId, actorRole, actorName) {
    return request(`/emergency/${caseId}/reopen`, {
        method: 'POST',
        body: JSON.stringify({ reason, actor_id: actorId, actor_role: actorRole, actor_name: actorName }),
    });
}

export async function submitCitizenFeedback(caseId, rating, feedback) {
    return request(`/emergency/${caseId}/feedback`, {
        method: 'POST',
        body: JSON.stringify({ rating, feedback }),
    });
}

export async function uploadEmergencyAttachment(caseId, file, attachmentType = 'incident_evidence', uploadedBy = 'user', uploadedByRole = 'citizen') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('attachment_type', attachmentType);
    formData.append('uploaded_by', uploadedBy);
    formData.append('uploaded_by_role', uploadedByRole);

    return request(`/emergency/${caseId}/attachments`, {
        method: 'POST',
        body: formData,
    });
}

export async function getEmergencyMessages(caseId, role = 'citizen') {
    return request(`/emergency/${caseId}/messages?role=${encodeURIComponent(role)}`);
}

export async function sendEmergencyMessage(caseId, message, senderId, senderName, senderRole, isInternal = false) {
    return request(`/emergency/${caseId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ message, sender_id: senderId, sender_name: senderName, sender_role: senderRole, is_internal: isInternal }),
    });
}

export async function getEmergencyQueue(filters = {}) {
    const params = new URLSearchParams();
    if (filters.status) params.set('status', filters.status);
    if (filters.severity) params.set('severity', filters.severity);
    if (filters.category_id) params.set('category_id', filters.category_id);
    if (filters.q) params.set('q', filters.q);
    if (filters.page) params.set('page', filters.page);
    return request(`/admin/emergency/queue?${params.toString()}`);
}

export async function getEmergencyAnalytics() {
    return request('/admin/emergency/analytics');
}

export async function listResponders(filters = {}) {
    const params = new URLSearchParams();
    if (filters.verification) params.set('verification', filters.verification);
    if (filters.availability) params.set('availability', filters.availability);
    return request(`/admin/responders?${params.toString()}`);
}

export async function createResponder(data) {
    return request('/admin/responders', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export async function updateResponder(responderId, data) {
    return request(`/admin/responders/${responderId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
    });
}

export async function getResponderAssignments(responderId, phone) {
    const params = new URLSearchParams();
    if (responderId) params.set('responder_id', responderId);
    if (phone) params.set('phone', phone);
    return request(`/responders/assignments?${params.toString()}`);
}

export async function toggleResponderAvailability(responderId, status) {
    return request('/responders/availability', {
        method: 'POST',
        body: JSON.stringify({ responder_id: responderId, status }),
    });
}

export async function shareResponderLocation(responderId, caseId, latitude, longitude, accuracy = 0) {
    return request('/responders/location', {
        method: 'POST',
        body: JSON.stringify({ responder_id: responderId, case_id: caseId, latitude, longitude, accuracy }),
    });
}

export async function getEmergencyAlerts(lat = 18.5204, lon = 73.8567) {
    return request(`/emergency/alerts/weather?lat=${lat}&lon=${lon}`);
}

export async function getVerifiedHelplines() {
    return request('/emergency/helplines');
}

export async function getNearbyFacilities(lat = 18.5204, lon = 73.8567, facilityType = 'all') {
    return request(`/emergency/facilities/nearby?lat=${lat}&lon=${lon}&facility_type=${facilityType}`);
}

export async function askEmergencyAI(text) {
    return request('/emergency/ai/assist', {
        method: 'POST',
        body: JSON.stringify({ text }),
    });
}

export async function getEmergencyNotifications(userId, role) {
    const params = new URLSearchParams();
    if (userId) params.set('user_id', userId);
    if (role) params.set('role', role);
    return request(`/notifications?${params.toString()}`);
}

export async function markNotificationRead(notifId) {
    return request(`/notifications/${notifId}/read`, {
        method: 'PATCH',
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Real-Time WebSocket Manager
// ─────────────────────────────────────────────────────────────────────────────

export class EmergencySocketClient {
    constructor({ clientId, role = 'citizen', userId = '', onEvent = () => {}, onStateChange = () => {} }) {
        this.clientId = clientId || `client_${Date.now()}`;
        this.role = role;
        this.userId = userId || this.clientId;
        this.onEvent = onEvent;
        this.onStateChange = onStateChange;
        this.socket = null;
        this.subscribedCases = new Set();
        this.reconnectTimer = null;
        this.reconnectAttempts = 0;
        this.maxAttempts = 10;
        this.isClosedManually = false;
        this.connect();
    }

    connect() {
        if (this.isClosedManually) return;
        this.onStateChange('connecting');

        const wsUrl = `${WS_BASE_URL}/${this.clientId}?role=${encodeURIComponent(this.role)}&user_id=${encodeURIComponent(this.userId)}`;
        try {
            this.socket = new WebSocket(wsUrl);

            this.socket.onopen = () => {
                this.reconnectAttempts = 0;
                this.onStateChange('connected');
                // Re-subscribe to any active cases
                for (const caseId of this.subscribedCases) {
                    this.subscribeCase(caseId);
                }
            };

            this.socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.onEvent(data);
                } catch (e) {
                    console.warn('Malformed WS message:', event.data);
                }
            };

            this.socket.onclose = () => {
                if (!this.isClosedManually) {
                    this.onStateChange('offline');
                    this.scheduleReconnect();
                }
            };

            this.socket.onerror = () => {
                this.onStateChange('offline');
            };
        } catch (err) {
            this.onStateChange('offline');
            this.scheduleReconnect();
        }
    }

    scheduleReconnect() {
        if (this.isClosedManually || this.reconnectTimer) return;
        this.reconnectAttempts += 1;
        const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 15000);
        this.onStateChange('reconnecting');
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect();
        }, delay);
    }

    subscribeCase(caseId) {
        this.subscribedCases.add(caseId);
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({ action: 'subscribe_case', case_id: caseId }));
        }
    }

    sendPing() {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({ action: 'ping' }));
        }
    }

    disconnect() {
        this.isClosedManually = true;
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
        this.onStateChange('offline');
    }
}

