import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, FileText, ClipboardList, BarChart3, Users, Bell, Sparkles, LogOut, User, Menu, X, Sprout, CloudSun, Landmark, Siren, ShieldAlert, Radio } from 'lucide-react';
import './Sidebar.css';
const citizenNav = [
  { to: '/', icon: <Home size={18} />, label: 'Home' },
  { to: '/emergency', icon: <Siren size={18} className="text-danger" />, label: 'Emergency SOS' },
  { to: '/submit', icon: <FileText size={18} />, label: 'Report Issue' },
  { to: '/my-complaints', icon: <ClipboardList size={18} />, label: 'My Cases' },
];
const adminNav = [
  { to: '/emergency/operations', icon: <ShieldAlert size={18} className="text-danger" />, label: 'Emergency Ops' },
  { to: '/dashboard', icon: <Home size={18} />, label: 'Dashboard' },
  { to: '/complaints', icon: <ClipboardList size={18} />, label: 'Cases' },
  { to: '/analytics', icon: <BarChart3 size={18} />, label: 'Analytics' },
  { to: '/worker', icon: <Users size={18} />, label: 'Workers' },
];
const farmerNav = [
  { to: '/dashboard/farmer', icon: <Home size={18} />, label: 'Dashboard' },
  { to: '/dashboard/farmer', icon: <Sprout size={18} />, label: 'My Farm' },
  { to: '/dashboard/farmer', icon: <CloudSun size={18} />, label: 'Weather' },
  { to: '/dashboard/farmer', icon: <Landmark size={18} />, label: 'Schemes' },
  { to: '/emergency', icon: <Siren size={18} className="text-danger" />, label: 'Emergency SOS' },
];
const workerNav = [
  { to: '/responder', icon: <Radio size={18} className="text-danger" />, label: 'Responder Portal' },
  { to: '/worker', icon: <Home size={18} />, label: 'My Tasks' },
  { to: '/complaints', icon: <ClipboardList size={18} />, label: 'Complaints' },
];
const Sidebar = ({ role = 'citizen', user, onLogout }) => {
  const location = useLocation();
  const nav = role === 'admin' ? adminNav : role === 'worker' ? workerNav : role === 'farmer' ? farmerNav : citizenNav;
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <>
      <button className="mobile-menu-btn" onClick={() => setMobileOpen(true)}>
        <Menu size={22} />
      </button>
      {mobileOpen && <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />}
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/5/55/Emblem_of_India.svg"
            alt="Emblem of India"
            className="sidebar-emblem-img"
          />
          <div className="sidebar-brand-text">
            <h2>SAHAYA AI</h2>
            <span>Connected community</span>
          </div>
          <button className="mobile-close-btn" onClick={() => setMobileOpen(false)}>
            <X size={18} />
          </button>
        </div>
        <p className="sidebar-section-label">Navigation</p>
        <nav className="sidebar-nav">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`sidebar-link ${location.pathname === item.to ? 'active' : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-user">
          <div className="sidebar-avatar">
            <User size={16} />
          </div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.name || 'User'}</div>
            <div className="sidebar-user-role">{role.charAt(0).toUpperCase() + role.slice(1)}</div>
          </div>
        </div>
        <button className="sidebar-logout" onClick={onLogout}>
          <LogOut size={14} />
          Logout
        </button>
      </aside>
    </>
  );
};
export default Sidebar;
