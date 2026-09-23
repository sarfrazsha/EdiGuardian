import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const TopHeader = ({ role }) => {
    const navigate = useNavigate();
    const [unreadCount, setUnreadCount] = useState(0);
    const [adminNotice, setAdminNotice] = useState(null);
    const [showAdminAlert, setShowAdminAlert] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchIndex, setSearchIndex] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);

    const checkUnreadAnnouncements = async () => {
        try {
            const email = localStorage.getItem('userEmail');
            const role = localStorage.getItem('userRole') || '';
            if (!email) return;

            const res = await fetch(`/api/announcements?role=${role.toLowerCase()}`);
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

    useEffect(() => {
        if (role?.toLowerCase() !== 'admin') return;

        const fetchAdminNotice = async () => {
            try {
                const response = await fetch('/api/notifications/admin');
                if (!response.ok) return;
                const data = await response.json();
                if (Array.isArray(data) && data.length > 0) {
                    setAdminNotice(data[0]);
                    setShowAdminAlert(true);
                    window.setTimeout(() => setShowAdminAlert(false), 5000);
                }
            } catch (error) {
                console.error('Admin notification marquee error:', error);
            }
        };

        fetchAdminNotice();
        const intervalId = setInterval(fetchAdminNotice, 5000);
        return () => clearInterval(intervalId);
    }, [role]);

    useEffect(() => {
        let active = true;
        const loadSearchIndex = async () => {
            setSearchLoading(true);
            try {
                const [studentsResponse, teachersResponse, parentsResponse, classesResponse] = await Promise.all([
                    fetch('/api/students-detailed'),
                    fetch('/api/teachers'),
                    fetch('/api/parents'),
                    fetch('/api/classes')
                ]);
                const [students, teachers, parents, classes] = await Promise.all([
                    studentsResponse.json(), teachersResponse.json(), parentsResponse.json(), classesResponse.json()
                ]);
                if (!active) return;
                setSearchIndex([
                    ...(Array.isArray(students) ? students.map(student => ({
                        type: 'Student', label: student.studentName, detail: student.studentEmail || `Roll No. ${student.studentRollNo}`,
                        searchText: `${student.studentName} ${student.studentEmail || ''} ${student.studentRollNo || ''}`.toLowerCase().replace(/\s+/g, ''), path: '/manage-classes'
                    })) : []),
                    ...(Array.isArray(teachers) ? teachers.map(teacher => ({
                        type: 'Teacher', label: teacher.teacherName, detail: teacher.email || teacher.teacherEmail,
                        searchText: `${teacher.teacherName} ${teacher.email || teacher.teacherEmail || ''}`.toLowerCase().replace(/\s+/g, ''), path: '/manage-teachers'
                    })) : []),
                    ...(Array.isArray(parents) ? parents.map(parent => ({
                        type: 'Parent', label: parent.parentName, detail: parent.parentEmail,
                        searchText: `${parent.parentName} ${parent.parentEmail || ''}`.toLowerCase().replace(/\s+/g, ''), path: '/parent-hub'
                    })) : []),
                    ...(Array.isArray(classes) ? classes.map(classItem => ({
                        type: 'Class', label: `${classItem.name}-${classItem.section || ''}`.replace(/-$/, ''), detail: `Section ${classItem.section || 'N/A'}`,
                        searchText: `${classItem.name}-${classItem.section || ''} ${classItem.name} ${classItem.section || ''}`.toLowerCase().replace(/\s+/g, ''), path: '/manage-classes'
                    })) : []),
                    { type: 'Fees', label: 'Pending Fees', detail: 'Fee records requiring attention', path: '/all-fees?status=Pending', searchText: 'pendingfeesfeerecordsrequiringattention' },
                    { type: 'Fees', label: 'Paid Fees', detail: 'Completed fee records', path: '/all-fees?status=Paid', searchText: 'paidfeescompletedfeerecords' },
                    { type: 'Fees', label: 'Under Review', detail: 'Fees awaiting review', path: '/all-fees?status=Review', searchText: 'underreviewfeesawaitingreview' }
                ]);
            } catch (error) {
                console.error('Global search index error:', error);
            } finally {
                if (active) setSearchLoading(false);
            }
        };

        loadSearchIndex();
        return () => { active = false; };
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
                await fetch('/api/announcements/mark-all-read', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });
            } catch (_) { /* silent */ }
        }
        window.dispatchEvent(new Event('announcements-read'));
        navigate('/announcements');
    };

    const normalizedSearchTerm = searchTerm.trim().toLowerCase().replace(/\s+/g, '');
        const searchResults = normalizedSearchTerm.length > 0
        ? searchIndex.filter(item => item.searchText.includes(normalizedSearchTerm)).slice(0, 8)
        : [];

    const handleSearchResult = (result) => {
        setSearchTerm('');
        navigate(result.path);
    };

    return (
        <div className="dashboard-toolbar sticky-top" style={{ zIndex: 1000 }}>
            {role?.toLowerCase() === 'admin' && showAdminAlert && adminNotice && (
                <div className="dashboard-admin-alert" role="alert">
                    <i className="bi bi-bell-fill"></i>
                    <span><strong>{adminNotice.title}</strong>{adminNotice.content}</span>
                    <button type="button" onClick={() => setShowAdminAlert(false)} aria-label="Dismiss notification">&times;</button>
                </div>
            )}
            <div className="dashboard-search-wrap">
                <div className="dashboard-search">
                <i className="bi bi-search"></i>
                    <input type="search" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search students, teachers, classes..." aria-label="Search" />
                </div>
                {searchTerm.trim() && (
                    <div className="dashboard-search-results">
                        {searchLoading ? <div className="dashboard-search-empty">Searching...</div> : searchResults.length > 0 ? searchResults.map((result, index) => (
                            <button type="button" key={`${result.type}-${result.label}-${index}`} onClick={() => handleSearchResult(result)}>
                                <span className="dashboard-search-result-type">{result.type}</span>
                                <span><strong>{result.label}</strong><small>{result.detail}</small></span>
                            </button>
                        )) : <div className="dashboard-search-empty">No matching profiles found.</div>}
                    </div>
                )}
            </div>

            {role?.toLowerCase() === 'admin' && adminNotice && (
                <div className="dashboard-notice-marquee" aria-live="polite">
                    <span className="dashboard-notice-label"><i className="bi bi-megaphone-fill"></i> Notice</span>
                    <div className="dashboard-notice-viewport">
                        <span>{adminNotice.title}: {adminNotice.content}</span>
                    </div>
                </div>
            )}

                <div className="dashboard-toolbar-actions">
                    <button
                        className="dashboard-notification"
                        onClick={handleBellClick}
                        title="View Announcements"
                    >
                        <i className="bi bi-bell"></i>
                        {unreadCount > 0 && (
                            <span className="dashboard-notification-dot">
                                {unreadCount}
                            </span>
                        )}
                    </button>

                    <button onClick={handleLogout} className="dashboard-logout"><i className="bi bi-box-arrow-right"></i> Logout</button>
                </div>
        </div>
    );
};

export default TopHeader;

