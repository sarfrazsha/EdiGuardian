import React, { useState } from 'react';
import Sidebar from './Sidebar';
import TopHeader from './TopHeader';
import Footer from './Footer';
import AnnouncementMarquee from './AnnouncementMarquee';

const Layout = ({ children }) => {
    const [showMobileSidebar, setShowMobileSidebar] = useState(false);
    const role = localStorage.getItem('userRole') || '';

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
            </div>
        </div>
    );
};

export default Layout;