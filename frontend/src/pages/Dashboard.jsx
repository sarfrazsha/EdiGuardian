import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Button, Spinner, Modal, Table, Badge, Form, Dropdown } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';

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
    const [monthlyAttendance, setMonthlyAttendance] = useState('Checking...');

    const [teacherStats, setTeacherStats] = useState({ students: 0, attendanceToday: 0, className: '' });

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

       
        fetch(`http://localhost:8080/api/announcements?role=${(role || '').toLowerCase()}`)
            .then(res => res.json())
            .then(data => {
                setAnnouncements(data.slice(0, 3));
            })
            .catch(err => {
                console.error("Fetch announcements error:", err);
            });

      
        const sid = localStorage.getItem('studentId');
        if (sid && (role?.toLowerCase() === 'parent' || role?.toLowerCase() === 'student')) {
            const today = new Date().toISOString().split('T')[0];
            fetch(`http://localhost:8080/api/attendance/student/${sid}`)
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
        }

        if (role?.toLowerCase() === 'admin') {
            fetch('http://localhost:8080/users')
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
            fetch(`http://localhost:8080/api/teacher/stats/${email}`)
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

    const getStats = () => {
        const userRole = userData.role?.toLowerCase();
        if (userRole === 'admin') {
            return [
                { label: 'Active Students', value: adminStats.students, icon: 'bi-people', color: 'primary', link: '/manage-classes' },
                { label: 'Active Teachers', value: adminStats.teachers, icon: 'bi-person-badge', color: 'success', link: '/manage-teachers' },
                { label: 'Active Classes', value: adminStats.classes, icon: 'bi-building', color: 'warning', link: '/manage-classes' },
                { label: 'Parent Hub', value: adminStats.parents, icon: 'bi-people-fill', color: 'dark', link: '/parent-hub' },
                { label: 'Pending Fees', value: adminStats.pending, icon: 'bi-hourglass-split', color: 'warning', link: '/all-fees?status=Pending' },
                { label: 'Under Review', value: adminStats.review, icon: 'bi-search', color: 'primary', link: '/all-fees?status=Review' },
                { label: 'Paid Fees', value: adminStats.paid, icon: 'bi-check-circle-fill', color: 'success', link: '/all-fees?status=Paid' },
                { 
                    label: `Fees (Monthly Total)`, 
                    value: `Rs ${(adminStats.monthlyFeeStats.find(s => s.month === selectedFeeMonth)?.total || 0).toLocaleString()}`, 
                    icon: 'bi-cash-stack', 
                    color: 'info', 
                    link: '/all-fees',
                    isDynamicMonth: true 
                }
            ];
        } else if (userRole === 'teacher') {
            return [
                { label: 'My Class', value: teacherStats.className || 'Not Assigned', icon: 'bi-book', color: 'primary', link: '/attendance' },
                { label: 'Total Students', value: teacherStats.students, icon: 'bi-people', color: 'success', link: '/manage-classes' },
                { label: 'Today\'s Attendance', value: `${teacherStats.attendanceToday}%`, icon: 'bi-graph-up-arrow', color: 'info', link: '/attendance' },
                { label: 'Grade Results', value: 'Manage', icon: 'bi-pencil-square', color: 'warning', link: '/manage-results' },
                { label: 'Monthly Report', value: 'Generate', icon: 'bi-file-earmark-pdf', color: 'dark', link: '/teacher-reports' }
            ];

        } else if (userRole === 'student') {
            return [
                { label: 'Attendance (Month)', value: monthlyAttendance, icon: 'bi-graph-up-arrow', color: 'success', link: '/attendance-history' },
                { label: 'Class Schedule', value: 'View Timetable', icon: 'bi-calendar3', color: 'secondary', link: '/schedule' },
                { label: 'Pending Homework', value: '02', icon: 'bi-journal-text', color: 'warning', link: '/homework' },
                { label: 'Upcoming Exam', value: 'To Be Announced', icon: 'bi-alarm', color: 'info', link: '/datesheet' }
            ];
        } else if (userRole === 'parent') {
            return [
                { label: 'Child Attendance', value: monthlyAttendance, icon: 'bi-graph-up-arrow', color: 'success', link: '/attendance-history' },
                { label: 'Child Results', value: 'View Grade', icon: 'bi-award-fill', color: 'primary', link: '/results' },
                { label: 'School Fees', value: 'Check Status', icon: 'bi-cash-stack', color: 'info', link: '/my-fees' },
                { label: 'Class Schedule', value: 'View Timetable', icon: 'bi-calendar3', color: 'warning', link: '/schedule' }
            ];
        } else {
            return [];
        }
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

    return (
        <Layout>
            <Container fluid className="py-2">
              
                <div className="mb-4">
                    <h2 className="fw-bold text-dark">Welcome back, {userData.name}! 👋</h2>
                    <p className="text-muted">You are logged in as <span className="badge bg-primary bg-opacity-10 text-primary text-uppercase">{userData.role}</span></p>
                </div>

                <Row className="g-4 mb-4">
                    {stats.map((stat, i) => (
                        <Col key={i} md={3} sm={6}>
                            <Card 
                                className="border-0 shadow-sm rounded-4 h-100" 
                                style={{ 
                                    cursor: (stat.link || stat.isStatus) ? 'pointer' : 'default', 
                                    transition: 'transform 0.2s' 
                                }}
                                onClick={() => {
                                    if (stat.link) navigate(stat.link);
                                }}
                                onMouseOver={(e) => stat.link && (e.currentTarget.style.transform = 'translateY(-5px)')}
                                onMouseOut={(e) => stat.link && (e.currentTarget.style.transform = 'translateY(0)')}
                            >
                                <Card.Body className="d-flex align-items-center p-3">
                                    <div className={`bg-${stat.color} bg-opacity-10 p-2 rounded-3 text-${stat.color} me-3`}>
                                        <i className={`bi ${stat.icon} fs-4`}></i>
                                    </div>
                                    <div className="overflow-hidden flex-grow-1">
                                        <div className="d-flex justify-content-between align-items-start mb-1">
                                            <div className="text-muted small fw-bold text-uppercase" style={{ fontSize: '10px', letterSpacing: '0.5px' }}>{stat.label}</div>
                                            {stat.isDynamicMonth && (
                                                <div onClick={(e) => e.stopPropagation()}>
                                                    <Dropdown align="end">
                                                        <Dropdown.Toggle 
                                                            variant="link" 
                                                            className="p-0 border-0 text-primary fw-bold text-decoration-none d-flex align-items-center gap-1 shadow-none"
                                                            style={{ fontSize: '10px' }}
                                                        >
                                                            <i className="bi bi-calendar3"></i>
                                                            {selectedFeeMonth.slice(0, 3)}
                                                            <i className="bi bi-chevron-down" style={{ fontSize: '8px' }}></i>
                                                        </Dropdown.Toggle>

                                                        <Dropdown.Menu className="border-0 shadow-lg p-2 rounded-3" style={{ minWidth: '120px', maxHeight: '200px', overflowY: 'auto' }}>
                                                            {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map(m => (
                                                                <Dropdown.Item 
                                                                    key={m} 
                                                                    active={selectedFeeMonth === m}
                                                                    onClick={() => setSelectedFeeMonth(m)}
                                                                    className="rounded-2 py-2 small fw-medium"
                                                                >
                                                                    {m}
                                                                </Dropdown.Item>
                                                            ))}
                                                        </Dropdown.Menu>
                                                    </Dropdown>
                                                </div>
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
                        </Col>
                    ))}
                </Row>

                <Row className="g-4">
                  
                    <Col lg={12}>
                        <Card className="border-0 shadow-sm rounded-4 h-100">
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
                                        <i className="bi bi-mailbox fs-1 text-light mb-2"></i>
                                        <p className="text-muted">No recent notices found.</p>
                                    </div>
                                )}
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            </Container>

        </Layout>

    );
};

export default Dashboard;