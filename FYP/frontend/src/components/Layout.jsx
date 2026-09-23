import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import TopHeader from './TopHeader';
import AnnouncementMarquee from './AnnouncementMarquee';
import ChildSelector from './ChildSelector';

const Layout = ({ children }) => {
    const [showMobileSidebar, setShowMobileSidebar] = useState(false);
    const role = localStorage.getItem('userRole') || '';
    const email = localStorage.getItem('userEmail') || '';
    const [childrenData, setChildrenData] = useState([]);
    const [selectedChildId, setSelectedChildId] = useState('');

    useEffect(() => {
        if (role?.toLowerCase() === 'parent') {
            const storedChildren = localStorage.getItem('parentChildren');
            if (storedChildren) {
                const parsed = JSON.parse(storedChildren);
                setChildrenData(parsed);
                setSelectedChildId(localStorage.getItem('selectedChildId') || (parsed.length > 0 ? parsed[0].id : ''));
            } else if (email) {
                fetch(`/api/parent/children/${email}`)
                    .then(res => res.json())
                    .then(data => {
                        setChildrenData(data);
                        localStorage.setItem('parentChildren', JSON.stringify(data));
                        const selectedId = localStorage.getItem('selectedChildId') || (data.length > 0 ? data[0].id : '');
                        setSelectedChildId(selectedId);
                    })
                    .catch(err => console.error("Fetch children error:", err));
            }
        }
    }, [role, email]);

    const handleChildSelect = (child) => {
        setSelectedChildId(child.id);
        localStorage.setItem('selectedChildId', child.id);
        localStorage.setItem('selectedChildClass', child.classNo);
        window.location.reload();
    };

    return (
        <div className="dashboard-shell d-flex" style={{ backgroundColor: '#F6F3EC', minHeight: '100vh', width: '100%', overflowX: 'auto' }}>
            {/* Main Sidebar */}
            <Sidebar showMobileSidebar={showMobileSidebar} onHideMobileSidebar={() => setShowMobileSidebar(false)} />

            {/* Content Area – offset so it doesn't hide under the fixed sidebar */}
            <div className="app-content-shell flex-grow-1 d-flex flex-column" style={{ overflowX: 'visible', minWidth: 0 }}>
                <TopHeader role={role} onToggleSidebar={() => setShowMobileSidebar(true)} />

                {/* Announcement Marquee Banner – shown to non-admin users only */}
                <AnnouncementMarquee role={role} />

                {/* Global Child Selector for Parents */}
                {role?.toLowerCase() === 'parent' && childrenData.length > 0 && (
                    <div className="px-4 pt-3">
                        <ChildSelector
                            children={childrenData}
                            selectedChildId={selectedChildId}
                            onChildSelect={handleChildSelect}
                        />
                    </div>
                )}

                {/* Page Content */}
                <main className="app-main p-4 flex-grow-1" style={{ marginBottom: '2rem' }}>
                    {children}
                </main>

            </div>
        </div>
    );
};

export default Layout;
