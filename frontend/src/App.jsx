import { useState } from 'react';
import { HashRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { Landmark, Siren, ShieldAlert } from 'lucide-react';
import AppLayout from './components/Layout/AppLayout';
import CitizenLayout from './components/Layout/CitizenLayout';
import Home from './pages/Home/Home';
import SubmitComplaint from './pages/SubmitComplaint/SubmitComplaint';
import MyComplaints from './pages/MyComplaints/MyComplaints';
import ComplaintDetail from './pages/ComplaintDetail/ComplaintDetail';
import Dashboard from './pages/Dashboard/Dashboard';
import Analytics from './pages/Analytics/Analytics';
import AdminComplaints from './pages/AdminComplaints/AdminComplaints';
import Worker from './pages/Worker/Worker';
import FarmerDashboard from './pages/Farmer/FarmerDashboard';
import Login from './pages/Login/Login';

// Emergency Response Module Pages
import CitizenEmergency from './pages/Emergency/CitizenEmergency';
import EmergencyDetailView from './pages/Emergency/EmergencyDetailView';
import DispatcherDashboard from './pages/Emergency/DispatcherDashboard';
import ResponderPortal from './pages/Emergency/ResponderPortal';

function App() {
    const [user, setUser] = useState(() => {
        const saved = localStorage.getItem('civicai_user');
        return saved ? JSON.parse(saved) : null;
    });

    const handleLogin = (userData) => {
        setUser(userData);
    };

    const handleLogout = () => {
        localStorage.removeItem('civicai_user');
        localStorage.removeItem('civicai_token');
        localStorage.removeItem('civicai_demo_mode');
        setUser(null);
        window.location.href = '/';
    };

    const userRole = user?.role || 'citizen';

    return (
        <HashRouter>
            {!user ? (
                <Routes>
                    <Route path="/" element={<Login onLogin={handleLogin} />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            ) : userRole === 'citizen' ? (
                <CitizenLayout user={user} onLogout={handleLogout}>
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/emergency" element={<CitizenEmergency />} />
                        <Route path="/emergency/case/:id" element={<EmergencyDetailView />} />
                        <Route path="/submit" element={<SubmitComplaint />} />
                        <Route path="/my-complaints" element={<MyComplaints />} />
                        <Route path="/complaint/:id" element={<ComplaintDetail />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                    <footer className="app-footer">
                        <div className="container footer-inner">
                            <div className="footer-brand">
                                <Landmark size={16} />
                                <span>SAHAYA AI</span>
                                <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>— Intelligent Community Assistance & Emergency Response</span>
                            </div>
                            <div className="footer-links">
                                <Link to="/">Home</Link>
                                <Link to="/emergency">Emergency SOS</Link>
                                <Link to="/submit">Report Issue</Link>
                                <Link to="/my-complaints">My Cases</Link>
                            </div>
                            <div className="footer-credit">
                                Connected community · Rapid emergency dispatch · Powered by AI
                            </div>
                        </div>
                    </footer>
                </CitizenLayout>
            ) : userRole === 'farmer' ? (
                <AppLayout role={userRole} user={user} onLogout={handleLogout}>
                    <Routes>
                        <Route path="/dashboard/farmer" element={<FarmerDashboard />} />
                        <Route path="/emergency" element={<CitizenEmergency />} />
                        <Route path="/emergency/case/:id" element={<EmergencyDetailView />} />
                        <Route path="/complaint/:id" element={<ComplaintDetail />} />
                        <Route path="*" element={<Navigate to="/dashboard/farmer" replace />} />
                    </Routes>
                    <footer className="app-footer">
                        <div className="container footer-inner">
                            <div className="footer-brand">
                                <Landmark size={16} />
                                <span>SAHAYA AI</span>
                                <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>— Intelligent Farming & Rural Support</span>
                            </div>
                            <div className="footer-links">
                                <Link to="/dashboard/farmer">Dashboard</Link>
                                <Link to="/emergency">Emergency SOS</Link>
                                <Link to="/complaint/1">My Cases</Link>
                            </div>
                            <div className="footer-credit">
                                Farm intelligence · Real-time guidance · Guided emergency response
                            </div>
                        </div>
                    </footer>
                </AppLayout>
            ) : (
                <AppLayout role={userRole} user={user} onLogout={handleLogout}>
                    <Routes>
                        <Route path="/emergency/operations" element={<DispatcherDashboard />} />
                        <Route path="/emergency/case/:id" element={<EmergencyDetailView />} />
                        <Route path="/responder" element={<ResponderPortal />} />
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/complaints" element={<AdminComplaints />} />
                        <Route path="/analytics" element={<Analytics />} />
                        <Route path="/worker" element={<Worker />} />
                        <Route path="/complaint/:id" element={<ComplaintDetail />} />
                        <Route
                            path="*"
                            element={
                                <Navigate
                                    to={
                                        userRole === 'admin'
                                            ? '/emergency/operations'
                                            : userRole === 'worker'
                                            ? '/responder'
                                            : '/dashboard'
                                    }
                                    replace
                                />
                            }
                        />
                    </Routes>
                    <footer className="app-footer">
                        <div className="container footer-inner">
                            <div className="footer-brand">
                                <Landmark size={16} />
                                <span>SAHAYA AI</span>
                                <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>— Operations & Command Dispatch</span>
                            </div>
                            <div className="footer-links">
                                <Link to="/emergency/operations">Emergency Operations</Link>
                                <Link to="/responder">Responder Portal</Link>
                                <Link to="/dashboard">Dashboard</Link>
                                <Link to="/complaints">Complaints</Link>
                            </div>
                            <div className="footer-credit">
                                Integrated command · Fast emergency dispatch · Transparent audit trail
                            </div>
                        </div>
                    </footer>
                </AppLayout>
            )}
        </HashRouter>
    );
}

export default App;
