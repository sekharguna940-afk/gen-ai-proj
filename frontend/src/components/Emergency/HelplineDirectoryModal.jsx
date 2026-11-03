import { useState, useEffect } from 'react';
import { Phone, Shield, ExternalLink, X, HeartPulse, Flame, CarFront, Users, AlertCircle } from 'lucide-react';
import { getVerifiedHelplines } from '../../services/emergencyApi';

const HelplineDirectoryModal = ({ isOpen, onClose }) => {
    const [data, setData] = useState(null);

    useEffect(() => {
        if (isOpen) {
            getVerifiedHelplines()
                .then((res) => {
                    if (res?.success) setData(res);
                })
                .catch(() => {});
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const helplines = data?.helplines || [
        { service: 'National Integrated Emergency', number: '112', description: 'Unified 24/7 Police, Fire & Medical Response', type: 'ALL' },
        { service: 'Police Control Room', number: '100', description: 'Immediate law enforcement & crime prevention', type: 'POLICE' },
        { service: 'Fire & Rescue Service', number: '101', description: 'Fire emergencies, toxic leaks & rescue operations', type: 'FIRE' },
        { service: 'Ambulance / Emergency Medical', number: '108', description: 'Free 24/7 trauma & emergency ambulance service', type: 'MEDICAL' },
        { service: 'Disaster Management Helpline', number: '1077', description: 'District disaster control room & flood management', type: 'DISASTER' },
        { service: 'Women Safety Helpline', number: '1091', description: 'Toll-free 24/7 assistance for women in distress', type: 'WOMEN' },
        { service: 'Childline Support', number: '1098', description: 'Immediate emergency care for children in crisis', type: 'CHILD' }
    ];

    return (
        <div className="modal-backdrop animate-fade-in" onClick={onClose} style={{ zIndex: 1100 }}>
            <div className="modal-content helpline-modal-card" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <div>
                        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1e3a8a', fontSize: '1.25rem' }}>
                            <Shield size={22} style={{ color: '#ea580c' }} />
                            Official Emergency Helplines Directory
                        </h2>
                        <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                            Direct national government emergency contact lines. All calls are toll-free and active 24/7.
                        </p>
                    </div>
                    <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close modal">
                        <X size={20} />
                    </button>
                </div>

                <div className="national-banner" style={{
                    background: 'linear-gradient(135deg, #1e3a8a 0%, #0369a1 100%)',
                    color: '#fff',
                    padding: '16px',
                    borderRadius: '8px',
                    margin: '16px 0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <div>
                        <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#fed7aa', fontWeight: 700 }}>
                            All-India Integrated Emergency
                        </span>
                        <h3 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '2px 0' }}>112</h3>
                        <p style={{ fontSize: '0.82rem', color: '#e0f2fe' }}>
                            Unified emergency response for Police, Fire, Ambulance, and Disaster rescue.
                        </p>
                    </div>
                    <a
                        href="tel:112"
                        className="btn"
                        style={{
                            background: '#ea580c',
                            color: '#fff',
                            fontWeight: 700,
                            padding: '10px 18px',
                            borderRadius: '9999px',
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        <Phone size={16} /> Call 112
                    </a>
                </div>

                <div className="helplines-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px', maxHeight: '420px', overflowY: 'auto' }}>
                    {helplines.map((h) => (
                        <div
                            key={h.number}
                            style={{
                                border: '1px solid var(--border)',
                                borderRadius: '8px',
                                padding: '12px 14px',
                                background: '#fafbfc',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}
                        >
                            <div>
                                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.92rem' }}>
                                    {h.service}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                    {h.description}
                                </div>
                            </div>
                            <a
                                href={`tel:${h.number}`}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    background: '#e0f2fe',
                                    color: '#0369a1',
                                    padding: '6px 14px',
                                    borderRadius: '6px',
                                    fontWeight: 700,
                                    fontSize: '0.9rem',
                                    textDecoration: 'none',
                                    border: '1px solid #bae6fd'
                                }}
                            >
                                <Phone size={13} /> {h.number}
                            </a>
                        </div>
                    ))}
                </div>

                <div style={{ marginTop: '16px', padding: '10px 14px', background: '#fef3c7', borderRadius: '6px', border: '1px solid #fde68a', fontSize: '0.8rem', color: '#92400e', display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <AlertCircle size={16} style={{ flexShrink: 0 }} />
                    <span>
                        <strong>Note:</strong> Calling these numbers connects to official Government dispatch centres. SAHAYA AI operates internally and does not intercept official 112 calls.
                    </span>
                </div>
            </div>
        </div>
    );
};

export default HelplineDirectoryModal;

