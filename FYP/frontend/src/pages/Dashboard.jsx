import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Container, Row, Col, Card, Button, Spinner, Modal, Table, Badge, ProgressBar } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import ChildSelector from '../components/ChildSelector';

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// A month picker that visually drops down from its own toggle button, staying
// anchored to the card it lives in - but the menu itself is portaled to
// document.body. This card sits inside a hover-transformed ancestor (for the
// lift-on-hover effect), which makes any menu positioned as a normal DOM
// descendant liable to be clipped or mis-stacked by that transform's new
// containing block. Portaling escapes that entirely while getBoundingClientRect
// keeps the menu visually right under the toggle, so it still reads as part
// of the card.
const MonthPicker = ({ value, onChange }) => {
    const [open, setOpen] = useState(false);
    const [coords, setCoords] = useState(null);
    const toggleRef = useRef(null);
    const menuRef = useRef(null);

    const openMenu = () => {
        const rect = toggleRef.current.getBoundingClientRect();
        setCoords({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
        setOpen(true);
    };

    useEffect(() => {
        if (!open) return;
        const handleClickOutside = (e) => {
            if (toggleRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return;
            setOpen(false);
        };
        const handleKey = (e) => { if (e.key === 'Escape') setOpen(false); };
        const handleReposition = () => setOpen(false); // scroll/resize: just close rather than chase a stale position
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKey);
        window.addEventListener('scroll', handleReposition, true);
        window.addEventListener('resize', handleReposition);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKey);
            window.removeEventListener('scroll', handleReposition, true);
            window.removeEventListener('resize', handleReposition);
        };
    }, [open]);

    return (
        <>
            <Button
                ref={toggleRef}
                variant="outline-primary"
                size="sm"
                onClick={(e) => { e.stopPropagation(); open ? setOpen(false) : openMenu(); }}
                className="rounded-pill px-2 py-1 fw-bold d-flex align-items-center gap-1 shadow-sm bg-white flex-shrink-0"
                style={{ fontSize: '11px', lineHeight: 1.4 }}
                title={`Showing: ${value}`}
            >
                <i className="bi bi-calendar3"></i>
                {value.slice(0, 3)}
                <i className={`bi bi-chevron-${open ? 'up' : 'down'}`} style={{ fontSize: '9px' }}></i>
            </Button>
            {open && coords && createPortal(
                <div
                    ref={menuRef}
                    className="border-0 shadow-lg p-2 rounded-3 bg-white"
                    style={{
                        position: 'fixed', top: coords.top, right: coords.right,
                        minWidth: '160px', maxHeight: '260px', overflowY: 'auto', zIndex: 2000
                    }}
                    // A portal escapes the DOM tree (so it isn't clipped by the
                    // card), but React's synthetic events still bubble through
                    // the *component* tree - so without this, a click in here
                    // would still reach the card's own onClick and navigate
                    // away instead of just picking a month.
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="text-uppercase small fw-bold text-muted px-2 pb-1" style={{ fontSize: '10px', letterSpacing: '0.5px' }}>
                        Select Month
                    </div>
                    {MONTH_NAMES.map(m => (
                        <button
                            key={m}
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onChange(m); setOpen(false); }}
                            className={`btn w-100 text-start rounded-2 py-2 px-2 fw-medium d-flex align-items-center gap-2 border-0 ${m === value ? 'bg-primary bg-opacity-10 text-primary' : ''}`}
                            style={{ fontSize: '13px' }}
                        >
                            {m === value && <i className="bi bi-check-lg"></i>}
                            {m}
                        </button>
                    ))}
                </div>,
                document.body
            )}
        </>
    );
};

const Dashboard = () => {
    const navigate = useNavigate();
    const [announcements, setAnnouncements] = useState([]);
    const [adminStats, setAdminStats] = useState({ 
        students: 0, teachers: 0, classes: 0, 
        monthlyFeeStats: [], 
        pending: 0, review: 0, paid: 0, parents: 0 
    });
    const [selectedFeeMonth, setSelectedFeeMonth] = useState(new Date().toLocaleString('default', { month: 'long' }));
    const [isLoading, setIsLoading] = useState(true);
    const [userData, setUserData] = useState({ name: '', role: '', email: '', studentId: '' });
    const [todayAttendance, setTodayAttendance] = useState(null);
    const [monthlyAttendance, setMonthlyAttendance] = useState('0%');
    const [pendingHomework, setPendingHomework] = useState('0');
    const [isUrgent, setIsUrgent] = useState(false);
    const [upcomingExam, setUpcomingExam] = useState('To Be Announced');

    const [teacherStats, setTeacherStats] = useState({ students: 0, attendanceToday: 0, className: '' });

    // Parent child selection states
    const [children, setChildren] = useState([]);
    const [selectedChildId, setSelectedChildId] = useState('');

    // Teacher modal states
    const [showStudentListModal, setShowStudentListModal] = useState(false);
    const [classStudents, setClassStudents] = useState([]);
    const [loadingStudents, setLoadingStudents] = useState(false);
    const [showAttendanceModal, setShowAttendanceModal] = useState(false);

    useEffect(() => {
        
        const email = localStorage.getItem('userEmail');
        const role = localStorage.getItem('userRole');
        const name = localStorage.getItem('userName');

        
        if (!email) {
            console.log("No session found, redirecting...");
            navigate('/');
            return;
        }

      
        setUserData({ name, role, email, studentId: localStorage.getItem('studentId') || '' });

        // Handle parent children data
        if (role?.toLowerCase() === 'parent') {
            const storedChildren = localStorage.getItem('parentChildren');
            if (storedChildren) {
                const childrenData = JSON.parse(storedChildren);
                setChildren(childrenData);
                const selectedId = localStorage.getItem('selectedChildId') || (childrenData.length > 0 ? childrenData[0].id : '');
                setSelectedChildId(selectedId);
            } else {
                // Fetch children if not in localStorage
                fetch(`/api/parent/children/${email}`)
                    .then(res => res.json())
                    .then(data => {
                        setChildren(data);
                        localStorage.setItem('parentChildren', JSON.stringify(data));
                        const selectedId = localStorage.getItem('selectedChildId') || (data.length > 0 ? data[0].id : '');
                        setSelectedChildId(selectedId);
                    })
                    .catch(err => console.error("Fetch children error:", err));
            }
        }

       
        fetch(`/api/announcements?role=${(role || '').toLowerCase()}`)
            .then(res => res.json())
            .then(data => {
                setAnnouncements(data.slice(0, 3));
            })
            .catch(err => {
                console.error("Fetch announcements error:", err);
            });

      
        const sid = localStorage.getItem('studentId');
        const selectedChild = localStorage.getItem('selectedChildId');
        const effectiveStudentId = (role?.toLowerCase() === 'parent' && selectedChild) ? selectedChild : sid;

        if (effectiveStudentId && (role?.toLowerCase() === 'parent' || role?.toLowerCase() === 'student')) {
            const today = new Date().toISOString().split('T')[0];
            fetch(`/api/attendance/student/${effectiveStudentId}`)
                .then(res => res.json())
                .then(data => {
                    const today = new Date().toISOString().split('T')[0];
                    const todayRec = data.find(r => new Date(r.date).toISOString().split('T')[0] === today);
                    setTodayAttendance(todayRec ? todayRec.status : 'Pending');

                    if (data.length > 0) {
                        const presentCount = data.filter(r => r.status === 'Present').length;
                        const percentage = Math.round((presentCount / data.length) * 100);
                        setMonthlyAttendance(`${percentage}%`);
                    } else {
                        setMonthlyAttendance('Not Marked Yet');
                    }
                })
                .catch(err => console.error("Fetch attendance error:", err));

            // Fetch pending homework count
            fetch(`/api/student/dashboard-stats/${effectiveStudentId}`)
                .then(res => res.json())
                .then(data => {
                    setPendingHomework(data.pendingHomework?.toString().padStart(2, '0') || '00');
                    setIsUrgent(data.isUrgent);
                    setUpcomingExam(data.upcomingExam || 'To Be Announced');
                })
                .catch(err => console.error("Fetch homework stats error:", err));
        }

        if (role?.toLowerCase() === 'admin') {
            fetch('/users')
                .then(res => res.json())
                .then(data => {
                    setAdminStats({
                        students: data.totalStudents || 0,
                        teachers: data.totalTeachers || 0,
                        classes: data.totalClasses || 0,
                        monthlyFeeStats: data.monthlyFeeStats || [],
                        pending: data.feesPendingCount || 0,
                        review: data.feesReviewCount || 0,
                        paid: data.feesPaidCount || 0,
                        parents: data.totalParents || 0
                    });
                    setIsLoading(false);
                })
                .catch(err => {
                    console.error("Fetch stats error:", err);
                    setIsLoading(false);
                });
        } else if (role?.toLowerCase() === 'teacher') {
            fetch(`/api/teacher/stats/${email}`)
                .then(res => res.json())
                .then(data => {
                    setTeacherStats(data);
                    setIsLoading(false);
                })
                .catch(err => {
                    console.error("Fetch teacher stats error:", err);
                    setIsLoading(false);
                });
        } else {
            setIsLoading(false);
        }

    }, [navigate]);

    // Handle child selection for parents
    const handleChildSelect = (child) => {
        setSelectedChildId(child.id);
        localStorage.setItem('selectedChildId', child.id);
        localStorage.setItem('selectedChildClass', child.classNo);
        // Refresh dashboard data for the selected child
        window.location.reload();
    };

    // Fetch students for teacher's class (modal)
    const handleOpenStudentList = async () => {
        const teacherEmail = localStorage.getItem('userEmail');
        if (!teacherEmail) return;
        setLoadingStudents(true);
        setShowStudentListModal(true);
        try {
            const res = await fetch(`/api/students/teacher/${encodeURIComponent(teacherEmail)}`);
            const data = await res.json();
            setClassStudents(data);
        } catch (err) {
            console.error("Error fetching class students:", err);
        }
        setLoadingStudents(false);
    };

    const getStats = () => {
        const userRole = userData.role?.toLowerCase();
        if (userRole === 'admin') {
            return [
                { label: 'Active Students', value: adminStats.students, icon: 'bi-people', color: 'primary', link: '/manage-classes' },
                { label: 'Active Teachers', value: adminStats.teachers, icon: 'bi-person-badge', color: 'success', link: '/manage-teachers' },
                { label: 'Active Classes', value: adminStats.classes, icon: 'bi-building', color: 'warning', link: '/manage-classes' },
                 { label: 'Parent Hub', value: adminStats.parents, icon: 'bi-people-fill', color: 'dark', link: '/parent-hub' },

                { label: 'Under Review', value: adminStats.review, icon: 'bi-hourglass-split', color: 'warning', link: '/all-fees?status=Review' },
                { label: 'Pending Fees', value: adminStats.pending, icon: 'bi-exclamation-circle', color: 'danger', link: '/all-fees?status=Pending' },
                { label: 'Paid Fees', value: adminStats.paid, icon: 'bi-check-circle-fill', color: 'success', link: '/all-fees?status=Paid' },
                {
                    label: `Fees (Monthly Total, ${new Date().getFullYear()})`,
                    value: `Rs ${(adminStats.monthlyFeeStats.find(s => s.month === selectedFeeMonth)?.total || 0).toLocaleString()}`,
                    icon: 'bi-cash-stack', 
                    color: 'info', 
                    link: '/all-fees',
                    isDynamicMonth: true 
                }
            ];
        } else if (userRole === 'teacher') {
            const hasMultipleClasses = teacherStats.classes && teacherStats.classes.length > 1;
            const classDisplay = hasMultipleClasses
                ? teacherStats.classes.join(', ')
                : (teacherStats.className || 'Not Assigned');
            return [
                { label: hasMultipleClasses ? 'My Classes' : 'My Class', value: classDisplay, icon: 'bi-book', color: 'primary', action: 'openStudentList' },
                { label: 'Total Students', value: teacherStats.students, icon: 'bi-people', color: 'success', action: 'openStudentList' },
                { label: 'Today\'s Attendance', value: `${teacherStats.attendanceToday}%`, icon: 'bi-graph-up-arrow', color: 'info', action: 'openAttendance' },
                { label: 'Grade Results', value: 'Manage', icon: 'bi-pencil-square', color: 'warning', link: '/manage-results' },
                { label: 'Exam Schedule', value: 'Manage', icon: 'bi-calendar-event', color: 'info', link: '/manage-datesheet' },
                // { label: 'Monthly Report', value: 'Generate', icon: 'bi-file-earmark-pdf', color: 'dark', link: '/teacher-reports' }
            ];
        } else if (userRole === 'student') {
            return [
                { label: 'Attendance (Month)', value: monthlyAttendance, icon: 'bi-graph-up-arrow', color: 'success', link: '/attendance-history' },
                { label: 'Class Schedule', value: 'View Timetable', icon: 'bi-calendar3', color: 'secondary', link: '/schedule' },
                { label: 'Pending Homework', value: pendingHomework, icon: 'bi-journal-text', color: 'warning', link: '/homework', animate: isUrgent, subValue: isUrgent ? 'Due in < 1 hr' : 'View Tasks' },
                { label: 'Upcoming Exam', value: upcomingExam, icon: 'bi-alarm', color: 'info', link: '/datesheet' }
            ];
        } else if (userRole === 'parent') {
            return [
                { label: 'Child Attendance', value: monthlyAttendance, icon: 'bi-graph-up-arrow', color: 'success', link: '/attendance-history' },
                { label: 'Child Results', value: 'View Grade', icon: 'bi-award-fill', color: 'primary', link: '/results' },
                { label: 'School Fees', value: 'Check Status', icon: 'bi-cash-stack', color: 'info', link: '/my-fees' },
                //{ label: 'Class Schedule', value: 'View Timetable', icon: 'bi-calendar3', color: 'secondary', link: '/schedule' },
                { label: 'Upcoming Exam', value: upcomingExam, icon: 'bi-alarm', color: 'info', link: '/datesheet' }
            ];
        }
        return [];
    };

    
    if (isLoading) {
        return (
            <div className="d-flex justify-content-center align-items-center vh-100 bg-light">
                <div className="text-center">
                    <Spinner animation="border" variant="primary" />
                    <p className="mt-3 fw-bold text-secondary">Securing Session...</p>
                </div>
            </div>
        );
    }

    const stats = getStats();
    const attendancePresent = Math.round((teacherStats.attendanceToday / 100) * teacherStats.students);
    const attendanceAbsent = teacherStats.students - attendancePresent;

    return (
        <Layout>
            <Container fluid className="py-2">
                <div className="mb-4">
                    <h2 className="fw-bold text-dark">Welcome back, {userData.name}!</h2>
                    {/* <p className="text-muted">You are logged in as <span className="badge bg-primary bg-opacity-10 text-primary text-uppercase">{userData.role}</span></p> */}
                </div>

                <div className="dashboard-stat-grid mb-4">
                    {stats.map((stat, i) => (
                        <div key={i} className="dashboard-stat-col">
                            <Card 
                                className={`dashboard-stat-card h-100 ${stat.animate ? 'pulse-warning' : ''}`} 
                                style={{ 
                                    cursor: (stat.link || stat.action || stat.isStatus) ? 'pointer' : 'default', 
                                    transition: 'transform 0.2s',
                                    border: stat.animate ? '2px solid #ffc107' : 'none'
                                }}
                                onClick={() => {
                                    if (stat.action === 'openStudentList') handleOpenStudentList();
                                    else if (stat.action === 'openAttendance') setShowAttendanceModal(true);
                                    else if (stat.link) navigate(stat.link);
                                }}
                                onMouseOver={(e) => (stat.link || stat.action) && (e.currentTarget.style.transform = 'translateY(-5px)')}
                                onMouseOut={(e) => (stat.link || stat.action) && (e.currentTarget.style.transform = 'translateY(0)')}
                            >
                                <Card.Body className="dashboard-stat-body d-flex align-items-center">
                                    <div className={`dashboard-stat-icon stat-icon-${i % 4}`}>
                                        <i className={`bi ${stat.icon} fs-4`}></i>
                                    </div>
                                    {/* overflow-hidden keeps the row (label + month toggle) inside the
                                        card's bounds instead of spilling past its edge. Safe now that
                                        MonthPicker's open menu is portaled to document.body - it's no
                                        longer a descendant of this wrapper, so clipping here doesn't
                                        touch it. */}
                                    <div className="overflow-hidden flex-grow-1">
                                        <div className="d-flex justify-content-between align-items-start mb-1">
                                            <div className="dashboard-stat-label">{stat.label}</div>
                                            {stat.subValue && (
                                                <div className={`fw-bold ${stat.animate ? 'text-danger' : 'text-muted'}`} style={{ fontSize: '9px' }}>
                                                    {stat.subValue}
                                                </div>
                                            )}
                                            {stat.isDynamicMonth && (
                                                <MonthPicker value={selectedFeeMonth} onChange={setSelectedFeeMonth} />
                                            )}
                                        </div>
                                        <h5 
                                            className="fw-bold mb-0 ls-1 pt-1" 
                                            title={stat.value} 
                                            style={{ 
                                                fontSize: '1.1rem', 
                                                lineHeight: '1.2',
                                                color: stat.isDynamicMonth ? '#6d6763' : 'inherit',
                                                wordBreak: 'break-word',
                                                display: '-webkit-box',
                                                WebkitLineClamp: '2',
                                                WebkitBoxOrient: 'vertical',
                                                overflow: 'hidden'
                                            }}
                                        >
                                            {stat.value}
                                        </h5>
                                    </div>
                                </Card.Body>
                            </Card>
                        </div>
                    ))}
                </div>

                <Row className="g-4 dashboard-content-row">
                  
                    <Col lg={12}>
                        <Card className="dashboard-main-panel h-100">
                            <Card.Header className="bg-white py-3 border-0 d-flex justify-content-between align-items-center">
                                <h5 className="fw-bold mb-0">Bulletin Board</h5>
                                <Button variant="link" className="text-decoration-none" onClick={() => navigate('/announcements')}>View All</Button>
                            </Card.Header>
                            <Card.Body>
                                {announcements.length > 0 ? (
                                    announcements.map((ann) => (
                                        <div key={ann._id} className="p-3 mb-3 bg-light rounded-3 border-start border-4 border-primary">
                                            <h6 className="fw-bold mb-1">{ann.title}</h6>
                                            <p className="small text-muted mb-0">{ann.content}</p>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-5">
                                        <div className="dashboard-empty-icon mb-3"><i className="bi bi-list-task"></i></div>
                                        <p className="dashboard-empty-title mb-1">No notices yet</p>
                                        <p className="dashboard-empty-copy mb-3">Announcements you post will show up here for teachers and parents to see.</p>
                                        {userData.role?.toLowerCase() === 'admin' && (
                                            <Button className="dashboard-empty-cta px-3 py-2" onClick={() => navigate('/announcements')}>Post an announcement</Button>
                                        )}
                                    </div>
                                )}
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            </Container>

            {/* Teacher — Student List Modal */}
            <Modal show={showStudentListModal} onHide={() => setShowStudentListModal(false)} size="lg" centered>
                <Modal.Header closeButton className="border-0 pb-0">
                    <Modal.Title className="fw-bold">
                        <i className="bi bi-people-fill text-primary me-2"></i>
                        Class Roster — {teacherStats.classes && teacherStats.classes.length > 1 ? teacherStats.classes.join(', ') : (teacherStats.className || '')}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="pt-2">
                    {loadingStudents ? (
                        <div className="text-center py-5">
                            <Spinner animation="border" variant="primary" />
                            <p className="text-muted mt-2">Loading students...</p>
                        </div>
                    ) : classStudents.length > 0 ? (
                        <div className="table-responsive">
                            <Table hover className="align-middle mb-0">
                                <thead className="bg-light small text-uppercase text-secondary">
                                    <tr>
                                        <th className="ps-3 py-3 border-0">#</th>
                                        <th className="py-3 border-0">Student Name</th>
                                        <th className="py-3 border-0">Class</th>
                                        <th className="py-3 border-0">Roll No.</th>
                                        <th className="py-3 border-0">Gender</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {classStudents.map((s, idx) => (
                                        <tr key={s.studentId || idx}>
                                            <td className="ps-3 text-muted">{idx + 1}</td>
                                            <td className="fw-bold text-dark">{s.studentName}</td>
                                            <td><Badge bg="primary" className="bg-opacity-10 text-primary border">{s.studentClass || s.classNo}</Badge></td>
                                            <td><Badge bg="light" className="text-dark border">{s.studentRollNo}</Badge></td>
                                            <td className="text-secondary">{s.studentGender}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </div>
                    ) : (
                        <div className="text-center py-5 text-muted">
                            <i className="bi bi-inbox fs-1 d-block mb-2"></i>
                            No students found in this class.
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer className="border-0 pt-0">
                    <Badge bg="primary" className="bg-opacity-10 text-primary px-3 py-2 rounded-pill fw-bold me-auto">
                        {classStudents.length} Students
                    </Badge>
                    <Button variant="secondary" className="rounded-pill px-4" onClick={() => setShowStudentListModal(false)}>Close</Button>
                </Modal.Footer>
            </Modal>

            {/* Teacher — Today's Attendance Modal */}
            <Modal show={showAttendanceModal} onHide={() => setShowAttendanceModal(false)} centered>
                <Modal.Header closeButton className="border-0 pb-0">
                    <Modal.Title className="fw-bold">
                        <i className="bi bi-graph-up-arrow text-info me-2"></i>
                        Today's Attendance
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="text-center py-4">
                    <div className="mb-4">
                        <div className="display-3 fw-bold text-primary mb-1">{teacherStats.attendanceToday}%</div>
                        <p className="text-muted mb-0">{teacherStats.className}</p>
                    </div>

                    <ProgressBar 
                        now={teacherStats.attendanceToday} 
                        className="mb-4 rounded-pill" 
                        style={{ height: '12px' }}
                        variant={teacherStats.attendanceToday >= 80 ? 'success' : teacherStats.attendanceToday >= 50 ? 'warning' : 'danger'}
                    />

                    <Row className="g-3 mb-4">
                        <Col xs={4}>
                            <div className="bg-light rounded-3 p-3">
                                <div className="small text-muted fw-bold text-uppercase" style={{ fontSize: '10px' }}>Total</div>
                                <div className="fs-4 fw-bold text-dark">{teacherStats.students}</div>
                            </div>
                        </Col>
                        <Col xs={4}>
                            <div className="bg-success bg-opacity-10 rounded-3 p-3">
                                <div className="small text-success fw-bold text-uppercase" style={{ fontSize: '10px' }}>Present</div>
                                <div className="fs-4 fw-bold text-success">{attendancePresent}</div>
                            </div>
                        </Col>
                        <Col xs={4}>
                            <div className="bg-danger bg-opacity-10 rounded-3 p-3">
                                <div className="small text-danger fw-bold text-uppercase" style={{ fontSize: '10px' }}>Absent</div>
                                <div className="fs-4 fw-bold text-danger">{attendanceAbsent}</div>
                            </div>
                        </Col>
                    </Row>

                    {teacherStats.attendanceToday === 0 && (
                        <p className="text-muted small mb-3">
                            <i className="bi bi-info-circle me-1"></i>
                            Attendance has not been marked today yet.
                        </p>
                    )}
                </Modal.Body>
                <Modal.Footer className="border-0 pt-0 justify-content-center">
                    <Button variant="primary" className="rounded-pill px-5 fw-bold shadow-sm" onClick={() => { setShowAttendanceModal(false); navigate('/attendance'); }}>
                        <i className="bi bi-pencil-square me-2"></i>Mark Attendance
                    </Button>
                </Modal.Footer>
            </Modal>
            <style>{`
                @keyframes blink-red {
                    0% { background-color: #ffffff; }
                    50% { background-color: #ff9999; border: 2px solid #8b0000; }
                    100% { background-color: #ffffff; }
                }
                .pulse-warning {
                    animation: blink-red 1s infinite ease-in-out;
                    border: 2px solid transparent;
                }
            `}</style>
        </Layout>
    );
};

export default Dashboard;
