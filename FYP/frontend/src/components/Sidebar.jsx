import React, { useRef, useState, useEffect } from 'react';
import { Nav, Offcanvas, Modal, Button, Form, Spinner } from 'react-bootstrap';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import reversedLogo from '../assets/eduguardian-logo-reversed.svg';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='90' height='90' viewBox='0 0 90 90'%3E%3Ccircle cx='45' cy='45' r='45' fill='%23374151'/%3E%3Ccircle cx='45' cy='34' r='18' fill='%236B7280'/%3E%3Cellipse cx='45' cy='80' rx='28' ry='22' fill='%236B7280'/%3E%3C/svg%3E";

const entityThemes = {
    Students: {
        gradient: 'linear-gradient(135deg, rgb(125, 78, 84) 0%, rgb(160, 125, 130) 100%)',
        soft: 'rgba(145, 105, 110, 0.1)',
        accent: 'rgb(125, 78, 84)',
        iconBg: 'rgba(145, 105, 110, 0.14)',
        button: 'linear-gradient(135deg, rgb(125, 78, 84) 0%, rgb(160, 125, 130) 100%)',
        buttonText: '#ffffff'
    },
    Teachers: {
        gradient: 'linear-gradient(135deg, rgb(145, 105, 110) 0%, rgb(180, 150, 154) 100%)',
        soft: 'rgba(145, 105, 110, 0.1)',
        accent: 'rgb(125, 78, 84)',
        iconBg: 'rgba(145, 105, 110, 0.14)',
        button: 'linear-gradient(135deg, rgb(145, 105, 110) 0%, rgb(180, 150, 154) 100%)',
        buttonText: '#ffffff'
    },
    Parents: {
        gradient: 'linear-gradient(135deg, rgb(160, 125, 130) 0%, rgb(205, 185, 188) 100%)',
        soft: 'rgba(160, 125, 130, 0.12)',
        accent: 'rgb(125, 78, 84)',
        iconBg: 'rgba(160, 125, 130, 0.16)',
        button: 'linear-gradient(135deg, rgb(160, 125, 130) 0%, rgb(205, 185, 188) 100%)',
        buttonText: '#ffffff'
    }
};

const Sidebar = ({ showMobileSidebar, onHideMobileSidebar }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const fileInputRef = useRef(null);

    // Get user data from location state OR fallback to localStorage for persistence
    const role = location.state?.role || localStorage.getItem('userRole');
    const email = location.state?.email || localStorage.getItem('userEmail');
    const uname = location.state?.uname || localStorage.getItem('userName');
    
    const [profilePic, setProfilePic] = useState(() => {
        const stored = localStorage.getItem('userProfilePic');
        if (!stored) return location.state?.profilePic || DEFAULT_AVATAR;
        if (stored.startsWith('/') || stored.startsWith('http') || stored.startsWith('data:')) return stored;
        
        // Handle relative paths from DB (e.g. 'images/abc.jpg' or 'abc.jpg')
        const prefix = stored.startsWith('images/') ? '' : 'images/';
        return `/uploads/${prefix}${stored}`;
    });
    const [showPicMenu, setShowPicMenu] = useState(false);
    // Entity action dialog: { label, addPath, managePath, step: 'action' | 'class' }
    const [entityDialog, setEntityDialog] = useState(null);
    const [classes, setClasses] = useState([]);
    const [loadingClasses, setLoadingClasses] = useState(false);

    useEffect(() => {
        if (entityDialog && (entityDialog.label === 'Students' || entityDialog.label === 'Parents')) {
            const fetchClasses = async () => {
                setLoadingClasses(true);
                try {
                    const res = await axios.get('/api/classes');
                    setClasses(res.data);
                } catch (err) {
                    console.error("Error fetching classes:", err);
                } finally {
                    setLoadingClasses(false);
                }
            };
            fetchClasses();
        }
    }, [entityDialog?.label]);

    const openEntityDialog = (label, addPath, managePath) => {
        setShowPicMenu(false);
        setEntityDialog({ label, addPath, managePath, step: 'action' });
    };

    const handlePicClick = (e) => {
        e.stopPropagation();
        setShowPicMenu(prev => !prev);
    };

    const handleUpdatePic = () => {
        fileInputRef.current.click();
        setShowPicMenu(false);
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('profilePic', file);
        formData.append('email', email);
        formData.append('role', role);

        try {
            const res = await axios.post('/api/user/profile-picture', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            const newPicUrl = `/uploads/images/${res.data.profilePic}`;
            setProfilePic(newPicUrl);
            localStorage.setItem('userProfilePic', newPicUrl);
            alert("Profile picture updated successfully!");
        } catch (err) {
            console.error("Error uploading profile pic:", err);
            alert("Failed to update profile picture.");
        }
        
        e.target.value = '';
    };

    const handleDeletePic = async () => {
        if (!window.confirm("Are you sure you want to delete your profile picture?")) return;
        
        try {
            await axios.delete('/api/user/profile-picture', {
                data: { email, role }
            });
            setProfilePic(DEFAULT_AVATAR);
            localStorage.removeItem('userProfilePic');
            setShowPicMenu(false);
            alert("Profile picture deleted successfully!");
        } catch (err) {
            console.error("Error deleting profile pic:", err);
            alert("Failed to delete profile picture.");
        }
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
                <div className="me-2">
                    <button
                        onClick={() => navigate(-1)}
                        className="btn btn-sm btn-outline-secondary text-white border-0 p-1"
                        title="Go Back"
                    >
                        <i className="bi bi-arrow-left fs-5"></i>
                    </button>
                </div>
                <div className="d-flex align-items-center cursor-pointer" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
                    <img src={reversedLogo} alt="EduGuardian" className="sidebar-wordmark" />
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
                    onChange={(e) => {
                        const file = e.target.files[0];
                        if (file && file.size > MAX_FILE_SIZE) {
                            alert('System supports only up to 10 MB for uploads.');
                            e.target.value = '';
                            return;
                        }
                        handleFileChange(e);
                    }}
                />
            </div>

            {/* Navigation Links */}
            <Nav className="flex-column flex-nowrap px-3 flex-grow-1 overflow-auto" style={{ overflowX: 'hidden', minHeight: 0 }}>
                {navLink('/dashboard', 'bi-grid-1x2-fill', 'Dashboard')}
                {navLink('/announcements', 'bi-megaphone-fill', 'Announcements')}

                {(role?.toLowerCase() === 'admin') && (
                    <>
                        <div className="text-uppercase text-secondary x-small fw-bold mt-4 mb-2 ps-2" style={{ fontSize: '0.7rem', letterSpacing: '1px' }}>
                            Management
                        </div>
                        {navLink('/manage-users', 'bi-people-fill', 'Users Hub')}

                        {/* Students — opens action dialog */}
                        <Nav.Link
                            onClick={() => openEntityDialog('Students', '/manage-students', '/manage-students')}
                            className={`d-flex align-items-center px-4 py-3 mb-2 rounded-3 text-white transition-all ${
                                location.pathname === '/manage-students' ? 'bg-primary shadow-lg active' : 'opacity-75 hover-bg-dark'
                            }`}
                            style={{ cursor: 'pointer', transition: 'all 0.3s' }}
                        >
                            <i className="bi bi-person-badge-fill me-3 fs-5"></i>
                            <span className="fw-medium">Students</span>
                        </Nav.Link>

                        {/* Teachers — opens action dialog */}
                        <Nav.Link
                            onClick={() => openEntityDialog('Teachers', '/manage-teachers', '/manage-teachers')}
                            className={`d-flex align-items-center px-4 py-3 mb-2 rounded-3 text-white transition-all ${
                                location.pathname === '/manage-teachers' ? 'bg-primary shadow-lg active' : 'opacity-75 hover-bg-dark'
                            }`}
                            style={{ cursor: 'pointer', transition: 'all 0.3s' }}
                        >
                            <i className="bi bi-person-workspace me-3 fs-5"></i>
                            <span className="fw-medium">Teachers</span>
                        </Nav.Link>

                        {/* Parents — opens action dialog (shares ManageStudents page) */}
                        <Nav.Link
                            onClick={() => openEntityDialog('Parents', '/manage-students', '/manage-students')}
                            className="d-flex align-items-center px-4 py-3 mb-2 rounded-3 text-white transition-all opacity-75 hover-bg-dark"
                            style={{ cursor: 'pointer', transition: 'all 0.3s' }}
                        >
                            <i className="bi bi-people me-3 fs-5"></i>
                            <span className="fw-medium">Parents</span>
                        </Nav.Link>

                        {navLink('/manage-classes', 'bi-building-fill', 'Classes')}
                        {navLink('/manage-timetable', 'bi-calendar3-week', 'Manage Timetable')}
                        {navLink('/issue-fees', 'bi-plus-circle-fill', 'Issue Fees')}
                        {navLink('/all-fees', 'bi-cash-coin', 'Fee Records')}
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
                        {navLink('/manage-datesheet', 'bi-calendar-event', 'Manage Exams')}
                        {navLink('/homework', 'bi-book-fill', 'Homework')}
                        {navLink('/schedule', 'bi-calendar3', 'My Timetable')}
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
                        {navLink('/schedule', 'bi-calendar3', 'Class Schedule')}
                        {navLink('/datesheet', 'bi-calendar-event', 'Datesheet')}
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
                        {navLink('/datesheet', 'bi-calendar-event', 'Datesheet')}
                    </>
                )}
            </Nav>
        </>
    );

    return (
        <>
            {/* Desktop Static Sidebar */}
            <div
                className="app-sidebar bg-dark d-flex flex-column shadow flex-shrink-0"
                style={{ width: '248px', position: 'fixed', top: 0, left: 0, height: '100vh', overflowY: 'auto', zIndex: 1050 }}
                onClick={() => setShowPicMenu(false)}
            >
                {sidebarContent}
            </div>

            {/* Mobile Offcanvas Sidebar */}
            <Offcanvas show={false} onHide={onHideMobileSidebar} className="mobile-sidebar bg-dark text-white shadow">
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

            {/* Entity Action Dialog */}
            <Modal
                show={!!entityDialog}
                onHide={() => setEntityDialog(null)}
                centered
                size="sm"
                dialogClassName="entity-dialog"
            >
                {entityDialog && (
                    <>
                        <Modal.Body className="p-0 overflow-hidden rounded-4 border-0">
                            <div style={{ background: entityThemes[entityDialog.label]?.gradient || entityThemes.Students.gradient, color: '#fff' }} className="px-4 py-3">
                                <div className="d-flex align-items-center justify-content-between gap-3">
                                    <div className="d-flex align-items-center gap-3">
                                        <div
                                            className="rounded-circle d-flex align-items-center justify-content-center"
                                            style={{ width: '42px', height: '42px', background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)' }}
                                        >
                                            <i className={`bi ${entityDialog.step === 'class' ? 'bi-filter-circle-fill' : 'bi-grid-3x3-gap-fill'} fs-5`}></i>
                                        </div>
                                        <div>
                                            <div className="small text-white-50 text-uppercase fw-semibold" style={{ letterSpacing: '1px' }}>
                                                {entityDialog.step === 'class' ? 'Class Selection' : 'Quick Action'}
                                            </div>
                                            <div className="fw-bold fs-5 mb-0">
                                                {entityDialog.step === 'class' ? 'Select Class' : entityDialog.label}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        className="btn-close btn-close-white"
                                        aria-label="Close"
                                        onClick={() => setEntityDialog(null)}
                                        style={{ opacity: 1 }}
                                    />
                                </div>
                            </div>

                            <div className="px-4 pb-4 pt-3" style={{ background: '#f9fafb' }}>
                                {entityDialog.step === 'action' ? (
                                    <>
                                        <p className="text-muted small mb-4">Choose the next step for {entityDialog.label.toLowerCase()} management.</p>
                                        <div className="d-flex flex-column gap-3">
                                            <Button
                                                className="rounded-4 py-3 fw-bold d-flex align-items-center gap-3 border-0 shadow-sm"
                                                style={{
                                                    background: entityThemes[entityDialog.label]?.button || entityThemes.Students.button,
                                                    color: entityThemes[entityDialog.label]?.buttonText || '#fff',
                                                    boxShadow: '0 12px 30px rgba(31, 41, 55, 0.12)'
                                                }}
                                                onClick={() => {
                                                    const path = entityDialog.addPath;
                                                    setEntityDialog(null);
                                                    navigate(path, { state: { email, role, uname, openAdd: true } });
                                                }}
                                            >
                                                <div className="rounded-3 d-flex align-items-center justify-content-center" style={{ width: '38px', height: '38px', background: 'rgba(255,255,255,0.18)' }}>
                                                    <i className="bi bi-person-plus-fill fs-5"></i>
                                                </div>
                                                <div className="text-start flex-grow-1">
                                                    <div>Add New</div>
                                                    <div className="fw-normal" style={{ fontSize: '0.75rem', opacity: 0.8 }}>Register a new {entityDialog.label.slice(0, -1)}</div>
                                                </div>
                                            </Button>
                                            <Button
                                                variant="outline-light"
                                                className="rounded-4 py-3 fw-bold d-flex align-items-center gap-3 border"
                                                style={{
                                                    background: entityThemes[entityDialog.label]?.soft || '#eef2ff',
                                                    color: entityThemes[entityDialog.label]?.accent || 'rgb(125, 78, 84)',
                                                    borderColor: entityThemes[entityDialog.label]?.accent || 'rgb(125, 78, 84)',
                                                    boxShadow: '0 10px 20px rgba(15, 23, 42, 0.04)'
                                                }}
                                                onClick={() => {
                                                    if (entityDialog.label === 'Teachers') {
                                                        setEntityDialog(null);
                                                        navigate(entityDialog.managePath, { state: { email, role, uname } });
                                                    } else if (entityDialog.label === 'Students') {
                                                        setEntityDialog(null);
                                                        navigate('/manage-classes', { state: { email, role, uname } });
                                                    } else if (entityDialog.label === 'Parents') {
                                                        setEntityDialog(null);
                                                        navigate('/parent-hub', { state: { email, role, uname } });
                                                    } else {
                                                        setEntityDialog(prev => ({ ...prev, step: 'class' }));
                                                    }
                                                }}
                                            >
                                                <div className="rounded-3 d-flex align-items-center justify-content-center" style={{ width: '38px', height: '38px', background: entityThemes[entityDialog.label]?.iconBg || '#e0e7ff' }}>
                                                    <i className="bi bi-list-ul fs-5"></i>
                                                </div>
                                                <div className="text-start flex-grow-1">
                                                    <div>Manage Existing</div>
                                                    <div className="fw-normal" style={{ fontSize: '0.75rem', opacity: 0.8 }}>View & edit all {entityDialog.label}</div>
                                                </div>
                                            </Button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <p className="text-muted small mb-3">Which class would you like to view?</p>
                                        {loadingClasses ? (
                                            <div className="text-center py-4">
                                                <Spinner animation="border" variant="primary" size="sm" />
                                                <p className="mt-2 small text-muted">Loading classes...</p>
                                            </div>
                                        ) : classes.length === 0 ? (
                                            <div className="text-center py-3">
                                                <p className="small text-warning mb-3">No classes found in records.</p>
                                                <Button variant="secondary" size="sm" onClick={() => setEntityDialog(prev => ({ ...prev, step: 'action' }))}>Back</Button>
                                            </div>
                                        ) : (
                                            <div className="d-flex flex-column gap-2" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                                                {classes.map(cls => (
                                                    <Button
                                                        key={cls}
                                                        variant="light"
                                                        className="text-start border-0 py-2 px-3 rounded-3"
                                                        style={{ background: '#ffffff', border: '1px solid #edf2f7', color: '#1f2937' }}
                                                        onClick={() => {
                                                            setEntityDialog(null);
                                                            navigate('/manage-classes', { state: { email, role, uname, classFilter: cls } });
                                                        }}
                                                    >
                                                        <i className="bi bi-arrow-right-short me-2" style={{ color: entityThemes[entityDialog.label]?.accent || 'rgb(125, 78, 84)' }}></i>
                                                        {cls}
                                                    </Button>
                                                ))}
                                                <hr className="my-2 opacity-10" />
                                                <Button
                                                    variant="link"
                                                    className="text-decoration-none small p-0 fw-bold"
                                                    style={{ color: entityThemes[entityDialog.label]?.accent || 'rgb(125, 78, 84)' }}
                                                    onClick={() => setEntityDialog(prev => ({ ...prev, step: 'action' }))}
                                                >
                                                    <i className="bi bi-chevron-left me-1"></i>Back
                                                </Button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </Modal.Body>
                    </>
                )}
            </Modal>

            <style>{`
                @keyframes fadeInDown {
                    from { opacity: 0; transform: translateY(-6px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                .entity-dialog .modal-content {
                    border: 0;
                    border-radius: 24px;
                    overflow: hidden;
                    box-shadow: 0 20px 50px rgba(15, 23, 42, 0.18);
                }
                .entity-dialog .btn-close:focus {
                    box-shadow: none;
                }
            `}</style>
        </>
    );
};

export default Sidebar;
