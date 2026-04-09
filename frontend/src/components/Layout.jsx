import React, { useState, useEffect } from 'react';
import { Toast, ToastContainer } from 'react-bootstrap';
import Sidebar from './Sidebar';
import TopHeader from './TopHeader';
import Footer from './Footer';
import AnnouncementMarquee from './AnnouncementMarquee';

const Layout = ({ children }) => {
    const [showMobileSidebar, setShowMobileSidebar] = useState(false);
    const role = localStorage.getItem('userRole') || '';
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState({ title: '', content: '' });

    // Polling for Transient Admin Alerts (In-Memory)
    useEffect(() => {
        if (role?.toLowerCase() !== 'admin') return;

        const checkAlerts = async () => {
            try {
                const res = await fetch(`http://localhost:8080/api/notifications/admin`);
                if (!res.ok) return;
                const data = await res.json();
                
                // Show each alert in the queue
                if (data && data.length > 0) {
                    const latest = data[0]; // For now, show the first if multiple arrive
                    setToastMessage({ title: latest.title, content: latest.content });
                    setShowToast(true);
                    
                    // Auto-hide after 2 seconds
                    setTimeout(() => setShowToast(false), 2000);
                }
            } catch (err) {
                console.error("Alert polling error:", err);
            }
        };

        // Initial check
        checkAlerts();

        // Poll every 5 seconds for a responsive feel
        const interval = setInterval(checkAlerts, 5000);
        return () => clearInterval(interval);
    }, [role]);

    return (
        <div className="d-flex" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh', width: '100%', overflowX: 'hidden' }}>
            {/* Main Sidebar */}
            <Sidebar showMobileSidebar={showMobileSidebar} onHideMobileSidebar={() => setShowMobileSidebar(false)} />

            {/* Content Area – offset so it doesn't hide under the fixed sidebar */}
            <div className="flex-grow-1 d-flex flex-column" style={{ overflowX: 'hidden', minWidth: 0, marginLeft: '280px' }}>
                <TopHeader onToggleSidebar={() => setShowMobileSidebar(true)} />

                {/* Announcement Marquee Banner – shown to non-admin users only */}
                <AnnouncementMarquee role={role} />

                {/* Page Content */}
                <main className="p-4 flex-grow-1" style={{ marginBottom: '2rem' }}>
                    {children}
                </main>

                {/* --- THE NEW FOOTER --- */}
                <Footer />

                {/* --- GLOBAL TOAST SYSTEM (Admin Alerts) --- */}
                <ToastContainer position="top-end" className="p-3" style={{ zIndex: 9999 }}>
                    <Toast show={showToast} onClose={() => setShowToast(false)} bg="primary" className="border-0 shadow-lg text-white" autohide delay={2000}>
                        <Toast.Header closeButton={false} className="bg-primary text-white border-0 py-2">
                            <i className="bi bi-bell-fill me-2"></i>
                            <strong className="me-auto">{toastMessage.title}</strong>
                            <small className="text-white text-opacity-75">Just now</small>
                        </Toast.Header>
                        <Toast.Body className="bg-white text-dark py-3">
                            {toastMessage.content}
                        </Toast.Body>
                    </Toast>
                </ToastContainer>
            </div>
        </div>
    );
};

export default Layout;