import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, Shield, Loader2, User, BarChart3, HardHat, Sprout, CheckCircle2, Zap, ArrowRight } from 'lucide-react';
import { login, verifyOtp } from '../../services/api';
import './Login.css';

const roles = [
    { id: 'citizen', label: 'Citizen', icon: <User size={18} />, desc: 'Report & track civic & emergency issues' },
    { id: 'farmer', label: 'Farmer', icon: <Sprout size={18} />, desc: 'Farm management & crop assistance' },
    { id: 'admin', label: 'Dispatcher / Admin', icon: <BarChart3 size={18} />, desc: 'Emergency command & dispatch queue' },
    { id: 'worker', label: 'Field Responder', icon: <HardHat size={18} />, desc: 'Accept & resolve emergency dispatches' },
];

const Login = ({ onLogin }) => {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('9876543210');
    const [otp, setOtp] = useState('');
    const [selectedRole, setSelectedRole] = useState('citizen');
    const [otpSent, setOtpSent] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [demoOtpCode, setDemoOtpCode] = useState('123456');
    const navigate = useNavigate();

    const getRedirectPath = (role) => {
        if (role === 'citizen') return '/';
        if (role === 'farmer') return '/dashboard/farmer';
        if (role === 'admin') return '/emergency/operations';
        return '/responder';
    };

    const handleQuickLogin = (role) => {
        const targetRole = role || selectedRole;
        const defaultNames = {
            citizen: 'Citizen User',
            farmer: 'Registered Farmer',
            admin: 'Emergency Operations Dispatcher',
            worker: 'Emergency Response Lead (RSP-001)'
        };
        const defaultPhones = {
            citizen: '+919822114477',
            farmer: '+919822998811',
            admin: '+919822001100',
            worker: '+919822011111'
        };

        const userData = {
            id: `usr_${targetRole}_${Date.now().toString().slice(-4)}`,
            name: name || defaultNames[targetRole] || 'Sahaya User',
            phone: phone.length === 10 ? `+91${phone}` : defaultPhones[targetRole],
            role: targetRole,
            token: `sahaya_demo_${Date.now()}`
        };

        localStorage.setItem('civicai_token', userData.token);
        localStorage.setItem('civicai_user', JSON.stringify(userData));
        onLogin(userData);
        navigate(getRedirectPath(targetRole));
    };

    const handleSendOtp = async (e) => {
        e.preventDefault();
        setError(null);
        if (phone.length < 10) {
            setError('Please enter a valid 10-digit mobile number.');
            return;
        }

        setLoading(true);
        try {
            const res = await login('+91' + phone);
            if (res && res.otp) {
                setDemoOtpCode(res.otp);
            }
            setOtpSent(true);
        } catch (err) {
            console.warn('Backend live SMS endpoint not configured or offline; using demo authentication code 123456:', err.message);
            setDemoOtpCode('123456');
            setOtpSent(true);
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async (e) => {
        e.preventDefault();
        setError(null);
        if (otp.length < 4) {
            setError('Please enter the 6-digit verification code.');
            return;
        }

        setLoading(true);
        try {
            let res = null;
            try {
                res = await verifyOtp('+91' + phone, otp);
            } catch (apiErr) {
                // If offline or dev mode, accept 123456 or any 6-digit code
                if (otp === '123456' || otp === demoOtpCode || otp.length === 6) {
                    res = {
                        success: true,
                        token: 'demo_token_' + Date.now(),
                        user: { id: `usr_${phone.slice(-10)}`, phone: '+91' + phone, role: selectedRole }
                    };
                    localStorage.setItem('civicai_token', res.token);
                } else {
                    throw apiErr;
                }
            }

            if (res && res.success) {
                const defaultName = selectedRole === 'farmer' ? 'Ramesh Patil' : selectedRole === 'admin' ? 'Dispatcher Deshmukh' : selectedRole === 'worker' ? 'Dr. Ananya Sharma' : 'Citizen';
                const userData = {
                    ...res.user,
                    name: name.trim() || defaultName,
                    phone: '+91' + phone,
                    role: selectedRole
                };
                localStorage.setItem('civicai_user', JSON.stringify(userData));
                onLogin(userData);
                navigate(getRedirectPath(selectedRole));
            } else {
                setError('Invalid code. For instant access, use demo OTP: 123456');
            }
        } catch (err) {
            if (otp === '123456' || otp === demoOtpCode || otp.length === 6) {
                const defaultName = selectedRole === 'farmer' ? 'Ramesh Patil' : selectedRole === 'admin' ? 'Dispatcher Deshmukh' : selectedRole === 'worker' ? 'Dr. Ananya Sharma' : 'Citizen';
                const userData = {
                    id: `usr_${phone.slice(-10)}`,
                    name: name.trim() || defaultName,
                    phone: '+91' + phone,
                    role: selectedRole
                };
                localStorage.setItem('civicai_token', 'demo_token_' + Date.now());
                localStorage.setItem('civicai_user', JSON.stringify(userData));
                onLogin(userData);
                navigate(getRedirectPath(selectedRole));
            } else {
                setError('Invalid verification code. Please enter demo OTP: 123456');
                console.error(err);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-card card animate-fade-in">
                <div className="login-brand">
                    <img
                        src="https://upload.wikimedia.org/wikipedia/commons/5/55/Emblem_of_India.svg"
                        alt="Emblem of India"
                        className="login-emblem-img"
                    />
                    <h1>SAHAYA AI</h1>
                    <p className="text-muted">Intelligent Community Assistance & Emergency Coordination</p>
                    <p className="login-gov-tag">Citizen SOS · Verified Responders · Dispatch Command</p>
                </div>

                <div className="login-role-section">
                    <label className="login-role-label">Select Your Role</label>
                    <div className="login-roles">
                        {roles.map((role) => (
                            <button
                                key={role.id}
                                type="button"
                                className={`login-role-card ${selectedRole === role.id ? 'active' : ''}`}
                                onClick={() => setSelectedRole(role.id)}
                            >
                                <span className="login-role-icon">{role.icon}</span>
                                <span className="login-role-name">{role.label}</span>
                                <span className="login-role-desc">{role.desc}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {error && (
                    <div className="login-error">
                        {error}
                    </div>
                )}

                {!otpSent ? (
                    <form onSubmit={handleSendOtp}>
                        <div className="input-group">
                            <label>Your Name <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(Optional)</span></label>
                            <input
                                type="text"
                                className="input"
                                placeholder={selectedRole === 'farmer' ? 'e.g. Ramesh Patil' : selectedRole === 'admin' ? 'e.g. Dispatcher Officer' : selectedRole === 'worker' ? 'e.g. Dr. Ananya Sharma' : 'e.g. Sanjay Rao'}
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>
                        <div className="input-group">
                            <label>Mobile Number <span style={{ color: '#dc2626' }}>*</span></label>
                            <div className="phone-input">
                                <span className="phone-prefix">+91</span>
                                <input
                                    type="tel"
                                    className="input"
                                    placeholder="9876543210"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                    maxLength={10}
                                    required
                                    autoFocus
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary login-btn"
                            disabled={phone.length < 10 || loading}
                        >
                            {loading ? <Loader2 size={16} className="spin-icon" /> : <><Phone size={16} /> Send Verification Code</>}
                        </button>

                        <div className="quick-access-divider">
                            <span>OR INSTANT DEMO ACCESS</span>
                        </div>

                        <button
                            type="button"
                            className="btn btn-outline login-btn btn-quick-login"
                            onClick={() => handleQuickLogin()}
                        >
                            <Zap size={16} color="#eab308" />
                            1-Click Sign In as {roles.find(r => r.id === selectedRole)?.label || 'User'}
                            <ArrowRight size={14} />
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleVerify}>
                        <div className="otp-dispatched-box">
                            <div className="otp-dispatched-header">
                                <CheckCircle2 size={18} color="#16a34a" />
                                <div>
                                    <strong>Verification Code Generated</strong>
                                    <p className="text-muted text-xs">For mobile: +91 {phone}</p>
                                </div>
                            </div>
                            <div className="otp-code-highlight">
                                <span>Demo / Prototype OTP:</span>
                                <strong className="otp-badge">{demoOtpCode}</strong>
                            </div>
                            <button
                                type="button"
                                className="btn-autofill-otp"
                                onClick={() => setOtp(demoOtpCode)}
                            >
                                <Zap size={14} /> Auto-Fill Code ({demoOtpCode})
                            </button>
                        </div>

                        <div className="input-group" style={{ marginTop: '16px' }}>
                            <label>Enter 6-Digit OTP Code</label>
                            <input
                                type="text"
                                className="input otp-input"
                                placeholder={demoOtpCode}
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                maxLength={6}
                                autoFocus
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary login-btn"
                            disabled={otp.length < 4 || loading}
                        >
                            {loading ? <Loader2 size={16} className="spin-icon" /> : <><Shield size={16} /> Verify & Log In</>}
                        </button>

                        <button
                            type="button"
                            className="btn btn-secondary login-btn"
                            onClick={() => { setOtpSent(false); setOtp(''); setError(null); }}
                            style={{ marginTop: '8px' }}
                        >
                            Change Number
                        </button>
                    </form>
                )}

                <p className="login-demo text-sm text-muted">
                    Academic / Prototype Evaluation Notice: SMS gateways require telecom DLT registration in India. For testing, any mobile number with code <code>123456</code> is accepted.
                </p>
            </div>
        </div>
    );
};

export default Login;
