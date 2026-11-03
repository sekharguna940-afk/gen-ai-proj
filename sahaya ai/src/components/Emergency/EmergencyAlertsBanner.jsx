import { useState, useEffect } from 'react';
import { AlertTriangle, PhoneCall, ShieldAlert, X, CloudSun, ExternalLink } from 'lucide-react';
import { getEmergencyAlerts } from '../../services/emergencyApi';
import './EmergencyAlertsBanner.css';

const EmergencyAlertsBanner = ({ onOpenHelplines }) => {
    const [alertData, setAlertData] = useState(null);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        getEmergencyAlerts(18.5204, 73.8567)
            .then((res) => {
                if (res?.success) setAlertData(res);
            })
            .catch(() => {});
    }, []);

    if (dismissed || !alertData) return null;

    const hasAlerts = alertData.has_active_alerts && alertData.alerts?.length > 0;

    return (
        <div className={`emergency-alerts-banner ${hasAlerts ? 'has-critical-warning' : 'info-bar'}`}>
            <div className="container alerts-banner-inner">
                <div className="alerts-banner-left">
                    {hasAlerts ? (
                        <>
                            <span className="alert-pulse-icon"><ShieldAlert size={18} /></span>
                            <div className="alert-text-block">
                                <strong>Official Disaster / Weather Alert:</strong>
                                <span>{alertData.alerts[0].headline}</span>
                                <small className="alert-source">Source: {alertData.alerts[0].source}</small>
                            </div>
                        </>
                    ) : (
                        <>
                            <span className="alert-info-icon"><CloudSun size={17} /></span>
                            <div className="alert-text-block">
                                <strong>National Emergency Helpline:</strong> Dial <strong>112</strong> for immediate Police, Fire, or Ambulance dispatch across India.
                                <small className="alert-source">SAHAYA AI coordinates internal community responders in parallel.</small>
                            </div>
                        </>
                    )}
                </div>

                <div className="alerts-banner-right">
                    <button
                        type="button"
                        className="helpline-quick-btn"
                        onClick={onOpenHelplines}
                        title="View Official Government Helplines"
                    >
                        <PhoneCall size={14} />
                        <span>Helplines</span>
                    </button>
                    <button
                        type="button"
                        className="banner-close-btn"
                        onClick={() => setDismissed(true)}
                        aria-label="Dismiss alert banner"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EmergencyAlertsBanner;

