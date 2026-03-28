import React, { useState } from 'react';
import Sidebar from './Sidebar';
import TopHeader from './TopHeader';
import Footer from './Footer';

const Layout = ({ children }) => {
    const [showMobileSidebar, setShowMobileSidebar] = useState(false);

    return (
        <div className="d-flex" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh', width: '100%', overflowX: 'hidden' }}>
            {/* Main Sidebar */}
            <Sidebar showMobileSidebar={showMobileSidebar} onHideMobileSidebar={() => setShowMobileSidebar(false)} />

            {/* Content Area */}
            <div className="flex-grow-1 d-flex flex-column" style={{ overflowX: 'hidden', minWidth: 0 }}>
                <TopHeader onToggleSidebar={() => setShowMobileSidebar(true)} />

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