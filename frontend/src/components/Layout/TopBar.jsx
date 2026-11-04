import { useState, useEffect } from 'react';
import { Bell, Search, User, X, CheckCircle2, Siren, Shield } from 'lucide-react';
import { getEmergencyNotifications, markNotificationRead } from '../../services/emergencyApi';
import './TopBar.css';

const TopBar = ({ user }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const fetchNotifs = () => {
    getEmergencyNotifications(user?.id, user?.role || 'citizen')
      .then((res) => {
        if (res?.notifications) {
          setNotifications(res.notifications);
          setUnreadCount(res.unread_count || 0);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 15000);
    return () => clearInterval(interval);
  }, [user?.id, user?.role]);

  const handleMarkAsRead = async (id) => {
    try {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (e) {}
  };

  return (
    <header className="topbar-wrapper">
      <div className="gov-marquee">
        <div className="marquee-track">
          <span className="marquee-content">
            SAHAYA AI — Intelligent Community Assistance &nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;
            Connected communities. Faster resolution. &nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;
            AI-powered support for citizens and responders &nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;
          </span>
          <span className="marquee-content" aria-hidden="true">
            SAHAYA AI — Intelligent Community Assistance &nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;
            Connected communities. Faster resolution. &nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;
            AI-powered support for citizens and responders &nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;
          </span>
        </div>
      </div>
      <div className="topbar">
        <div className="topbar__left">
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/5/55/Emblem_of_India.svg"
            alt="Emblem of India"
            className="topbar__emblem"
          />
          <div className="topbar__gov-text">
            <span className="topbar__gov-title">SAHAYA AI</span>
            <span className="topbar__gov-sub">Intelligent Community Assistance & Emergency Response</span>
          </div>
        </div>
        <div className="topbar__right">
          <div className="topbar__live-indicator" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '4px 10px',
            background: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            borderRadius: '20px',
            fontSize: '0.72rem',
            fontWeight: 600,
            color: '#166534',
            letterSpacing: '0.03em'
          }} title="SAHAYA AI Live Bidirectional WebSocket Active">
            <span style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: '#22c55e',
              display: 'inline-block',
              boxShadow: '0 0 0 2px rgba(34, 197, 94, 0.25)'
            }} />
            REAL-TIME
          </div>

          <div className="topbar__search">
            <Search size={15} className="topbar__search-icon" />
            <input type="text" placeholder="Search complaints or emergency cases..." />
          </div>

          {/* Real Notification Bell with Interactive Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              className="topbar__bell"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              title="Notifications"
            >
              <Bell size={18} />
              {unreadCount > 0 && <span className="topbar__bell-dot" />}
            </button>

            {dropdownOpen && (
              <div className="notif-dropdown-menu animate-fade-in" style={{
                position: 'absolute',
                right: 0,
                top: '40px',
                width: '320px',
                background: '#ffffff',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
                zIndex: 1000,
                padding: '12px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px', marginBottom: '8px' }}>
                  <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>Emergency Notifications</strong>
                  <span style={{ fontSize: '0.75rem', background: '#e0f2fe', color: '#0369a1', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                    {unreadCount} unread
                  </span>
                </div>

                <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {notifications.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '0.8rem' }}>
                      No new notifications.
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => handleMarkAsRead(n.id)}
                        style={{
                          padding: '8px 10px',
                          borderRadius: '6px',
                          background: n.is_read ? '#f8fafc' : '#eff6ff',
                          border: n.is_read ? '1px solid #e2e8f0' : '1px solid #bfdbfe',
                          cursor: 'pointer',
                          fontSize: '0.8rem'
                        }}
                      >
                        <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Siren size={13} style={{ color: '#dc2626' }} />
                          {n.title}
                        </div>
                        <div style={{ color: '#475569', lineHeight: 1.35 }}>{n.message}</div>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '4px', textAlign: 'right' }}>
                          {n.created_at ? new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="topbar__user">
            <div className="topbar__user-avatar">
              <User size={14} />
            </div>
            <div>
              <div className="topbar__user-name">{user?.name || 'User'}</div>
              <div className="topbar__user-role">{user?.role || 'citizen'}</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopBar;
