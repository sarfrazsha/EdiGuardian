import React, { useRef, useState } from 'react';
import { Nav, Offcanvas } from 'react-bootstrap';
import { useNavigate, useLocation } from 'react-router-dom';
import logo from '../assets/logo.png';

const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='90' height='90' viewBox='0 0 90 90'%3E%3Ccircle cx='45' cy='45' r='45' fill='%23374151'/%3E%3Ccircle cx='45' cy='34' r='18' fill='%236B7280'/%3E%3Cellipse cx='45' cy='80' rx='28' ry='22' fill='%236B7280'/%3E%3C/svg%3E";

const Sidebar = ({ showMobileSidebar, onHideMobileSidebar }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const fileInputRef = useRef(null);

    // Get user data from location state OR fallback to localStorage for persistence
    const role = location.state?.role || localStorage.getItem('userRole');
    const email = location.state?.email || localStorage.getItem('userEmail');
    const uname = location.state?.uname || localStorage.getItem('userName');

    // Profile picture: stored in localStorage as base64
    const [profilePic, setProfilePic] = useState(
        () => localStorage.getItem('userProfilePic') || DEFAULT_AVATAR
    );
    const [showPicMenu, setShowPicMenu] = useState(false);

    const handlePicClick = (e) => {
        e.stopPropagation();
        setShowPicMenu(prev => !prev);
    };

    const handleUpdatePic = () => {
        fileInputRef.current.click();
        setShowPicMenu(false);
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const base64 = ev.target.result;
            setProfilePic(base64);
            localStorage.setItem('userProfilePic', base64);
        };
        reader.readAsDataURL(file);
        // reset so same file can be re-selected later
        e.target.value = '';
    };

    const handleDeletePic = () => {
        setProfilePic(DEFAULT_AVATAR);
        localStorage.removeItem('userProfilePic');
        setShowPicMenu(false);
    };



    const navLink = (path, icon, label) => {
        const isActive = location.pathname === path;
        return (
            <Nav.Link
                onClick={() => {
                    navigate(path, { state: { email, role, uname } });
                    if (onHideMobileSidebar) onHideMobileSidebar();
                }}
                className={`d-flex align-items-center px-4 py-3 mb-2 rounded-3 text-white transition-all ${isActive ? 'bg-primary shadow-lg active' : 'opacity-75 hover-bg-dark'}`}
                style={{ cursor: 'pointer', transition: 'all 0.3s' }}
            >
                <i className={`bi ${icon} me-3 fs-5`}></i>
                <span className="fw-medium">{label}</span>
            </Nav.Link>
        );
    };

    const sidebarContent = (
        <>
            {/* Sidebar Branding & Back Button */}
            <div className="p-3 mb-2 d-flex align-items-center border-bottom border-secondary">
                <div className="d-flex gap-1 me-2">
                    <button
                        onClick={() => navigate(-1)}
                        className="btn btn-sm btn-outline-secondary text-white border-0 p-1"
                        title="Go Back"
                    >
                        <i className="bi bi-arrow-left fs-5"></i>
                    </button>
                    <button
                        onClick={() => navigate(1)}
                        className="btn btn-sm btn-outline-secondary text-white border-0 p-1"
                        title="Go Forward"
                    >
                        <i className="bi bi-arrow-right fs-5"></i>
                    </button>
                </div>
                <div className="d-flex align-items-center cursor-pointer" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
                    <img src={logo} alt="EduGuardian" height="40" className="me-2 rounded-circle shadow-sm" />
                    <h5 className="mb-0 fw-bold text-white ls-1" style={{ fontSize: '1.1rem' }}>EduGuardian</h5>
                </div>
            </div>

            {/* Profile Picture Section */}
            <div className="px-4 py-3 border-bottom border-secondary mb-2" style={{ position: 'relative' }}>
                <div className="d-flex align-items-center gap-3">
                    {/* Avatar with click trigger */}
                    <div
                        style={{ position: 'relative', cursor: 'pointer', flexShrink: 0 }}
                        onClick={handlePicClick}
                        title="Click to update photo"
                    >
                        <img
                            src={profilePic}
                            alt="Profile"
                            className="rounded-circle border border-2 border-secondary shadow"
                            style={{ width: '52px', height: '52px', objectFit: 'cover' }}
                        />
                        {/* Camera overlay badge */}
                        <div
                            className="rounded-circle d-flex align-items-center justify-content-center bg-primary"
                            style={{
                                position: 'absolute', bottom: 0, right: 0,
                                width: '18px', height: '18px',
                                border: '2px solid #212529'
                            }}
                        >
                            <i className="bi bi-camera-fill text-white" style={{ fontSize: '8px' }}></i>
                        </div>
                    </div>

                    {/* Name & Role */}
                    <div className="overflow-hidden">
                        <p className="mb-0 fw-bold text-white text-truncate" style={{ fontSize: '0.95rem' }}>{uname || 'User'}</p>
                        <span
                            className="badge bg-primary bg-opacity-25 text-primary small text-uppercase"
                            style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}
                        >
                            {role}
                        </span>
                    </div>
                </div>

                {/* Dropdown Menu */}
                {showPicMenu && (
                    <div
                        className="bg-white border rounded-3 shadow-lg overflow-hidden"
                        style={{
                            position: 'absolute',
                            top: '100%',
                            left: '16px',
                            width: '180px',
                            zIndex: 9999,
                            animation: 'fadeInDown 0.15s ease'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            className="w-100 text-start px-4 py-3 border-0 bg-white text-dark d-flex align-items-center gap-2"
                            style={{ fontSize: '0.9rem', transition: 'background 0.2s' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f0f4ff'}
                            onMouseLeave={e => e.currentTarget.style.background = 'white'}
                            onClick={handleUpdatePic}
                        >
                            <i className="bi bi-upload text-primary"></i>
                            Update Photo
                        </button>
                        <div style={{ height: '1px', background: '#e9ecef', margin: '0 16px' }}></div>
                        <button
                            className="w-100 text-start px-4 py-3 border-0 bg-white text-danger d-flex align-items-center gap-2"
                            style={{ fontSize: '0.9rem', transition: 'background 0.2s' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#fff5f5'}
                            onMouseLeave={e => e.currentTarget.style.background = 'white'}
                            onClick={handleDeletePic}
                        >
                            <i className="bi bi-trash3"></i>
                            Delete Photo
                        </button>
                    </div>
                )}

                {/* Hidden file input */}
                <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                />
            </div>

            {/* Navigation Links */}
            <Nav className="flex-column flex-nowrap px-3 flex-grow-1 overflow-auto" style={{ overflowX: 'hidden', minHeight: 0 }}>
                {navLink('/dashboard', 'bi-grid-1x2-fill', 'Dashboard')}
                {navLink('/announcements', 'bi-megaphone-fill', 'Announcements')}

                {/* Role-Based Links (Admin Only) */}
                {(role?.toLowerCase() === 'admin') && (
                    <>
                        <div className="text-uppercase text-secondary x-small fw-bold mt-4 mb-2 ps-2" style={{ fontSize: '0.7rem', letterSpacing: '1px' }}>
                            Management
                        </div>
                        {navLink('/manage-users', 'bi-people-fill', 'Users Hub')}
                        {navLink('/manage-students', 'bi-person-badge-fill', 'Students')}
                        {navLink('/manage-teachers', 'bi-person-workspace', 'Teachers')}
                        {navLink('/manage-classes', 'bi-building-fill', 'Classes')}
                        {navLink('/manage-fees', 'bi-cash-coin', 'Manage Fees')}
                    </>
                )}

                {/* Role-Based Links (Teacher) */}
                {(role?.toLowerCase() === 'teacher') && (
                    <>
                        <div className="text-uppercase text-secondary x-small fw-bold mt-4 mb-2 ps-2" style={{ fontSize: '0.7rem', letterSpacing: '1px' }}>
                            Academic
                        </div>
                        {navLink('/attendance', 'bi-calendar-check-fill', 'Attendance')}
                        {navLink('/manage-results', 'bi-award-fill', 'Manage Results')}
                        {navLink('/homework', 'bi-book-fill', 'Homework')}
                    </>
                )}

                {/* Role-Based Links (Student) */}
                {(role?.toLowerCase() === 'student') && (
                    <>
                        <div className="text-uppercase text-secondary x-small fw-bold mt-4 mb-2 ps-2" style={{ fontSize: '0.7rem', letterSpacing: '1px' }}>
                            Academic
                        </div>
                        {navLink('/results', 'bi-award-fill', 'Results')}
                        {navLink('/homework', 'bi-book-fill', 'Homework')}
                    </>
                )}

                {/* Role-Based Links (Parent) */}
                {(role?.toLowerCase() === 'parent') && (
                    <>
                        <div className="text-uppercase text-secondary x-small fw-bold mt-4 mb-2 ps-2" style={{ fontSize: '0.7rem', letterSpacing: '1px' }}>
                            Parent Portal
                        </div>
                        {navLink('/results', 'bi-award-fill', 'Results')}
                        {navLink('/my-fees', 'bi-cash-stack', 'My Fees')}
                    </>
                )}
            </Nav>
        </>
    );

    return (
        <>
            {/* Desktop Static Sidebar */}
            <div
                className="bg-dark vh-100 d-none d-md-flex flex-column shadow flex-shrink-0"
                style={{ width: '280px', position: 'sticky', top: 0 }}
                onClick={() => setShowPicMenu(false)}
            >
                {sidebarContent}
            </div>

            {/* Mobile Offcanvas Sidebar */}
            <Offcanvas show={showMobileSidebar} onHide={onHideMobileSidebar} className="bg-dark text-white shadow" style={{ width: '280px' }}>
                <Offcanvas.Body className="p-0 d-flex flex-column h-100" onClick={() => setShowPicMenu(false)}>
                    {sidebarContent}
                </Offcanvas.Body>
            </Offcanvas>

            <style>{`
                @keyframes fadeInDown {
                    from { opacity: 0; transform: translateY(-6px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </>
    );
};

export default Sidebar;