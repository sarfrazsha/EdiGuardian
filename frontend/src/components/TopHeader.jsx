import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const TopHeader = ({ onToggleSidebar }) => {
    const navigate = useNavigate();
    const [unreadCount, setUnreadCount] = useState(0);

    const checkUnreadAnnouncements = async () => {
        try {
            const email = localStorage.getItem('userEmail');
            const role = localStorage.getItem('userRole') || '';
            if (!email) return;

            const res = await fetch(`http://localhost:8080/api/announcements?role=${role.toLowerCase()}`);
            if (res.ok) {
                const data = await res.json();
                // Filter announcements where current user's email is NOT in readBy array
                const unread = data.filter(a => !a.readBy || !a.readBy.includes(email));
                setUnreadCount(unread.length);
            }
        } catch (error) {
            console.error("Failed to fetch announcements for notification bell", error);
        }
    };

    useEffect(() => {
        checkUnreadAnnouncements();
        // Listen for the announcements-read event dispatched by Announcements.jsx
        const handleRead = () => setUnreadCount(0);
        window.addEventListener('announcements-read', handleRead);
        // Poll every 30 seconds for new announcements
        const intervalId = setInterval(checkUnreadAnnouncements, 30000);
        return () => {
            clearInterval(intervalId);
            window.removeEventListener('announcements-read', handleRead);
        };
    }, []);

    const handleLogout = () => {
        localStorage.clear();
        navigate('/');
    };

    // Clear the badge immediately when the user clicks the bell, then navigate
    const handleBellClick = async () => {
        const email = localStorage.getItem('userEmail');
        setUnreadCount(0); // instant visual clear
        if (email) {
            try {
                await fetch('http://localhost:8080/api/announcements/mark-all-read', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });
            } catch (_) { /* silent */ }
        }
        window.dispatchEvent(new Event('announcements-read'));
        navigate('/announcements');
    };

    return (
        <div className="px-3 py-2 sticky-top" style={{ zIndex: 1000 }}>
            <div
                className="rounded-pill px-4 py-2 d-flex justify-content-between align-items-center shadow-sm border border-light"
                style={{
                    background: 'linear-gradient(to right, #e0e7ff, #ffffff)',
                    maxWidth: '1200px',
                    margin: '0 auto'
                }}
            >
                <div className="d-flex align-items-center">
                    <button
                        className="btn btn-light d-md-none me-2 rounded-circle shadow-sm border d-flex align-items-center justify-content-center"
                        onClick={onToggleSidebar}
                        style={{ width: '40px', height: '40px' }}
                    >
                        <i className="bi bi-list fs-5 text-secondary"></i>
                    </button>
                </div>

                <div className="d-flex align-items-center gap-4">
                    <div
                        className="position-relative cursor-pointer"
                        onClick={handleBellClick}
                        style={{ cursor: 'pointer' }}
                        title="View Announcements"
                    >
                        <i className="bi bi-bell-fill fs-5 text-primary"></i>
                        {unreadCount > 0 && (
                            <span className="position-absolute top-0 start-100 translate-middle badge border border-light rounded-circle bg-warning text-dark p-1" style={{ fontSize: '0.65rem' }}>
                                {unreadCount}
                            </span>
                        )}
                    </div>

                    <div className="ps-3 border-start border-secondary-subtle">
                        <button
                            onClick={handleLogout}
                            className="btn btn-danger btn-sm d-flex align-items-center gap-2 rounded-pill px-4 fw-bold shadow-sm transition-all"
                            style={{ transition: 'all 0.3s' }}
                        >
                            <i className="bi bi-power"></i>
                            <span className="d-none d-sm-inline">Logout</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TopHeader;

