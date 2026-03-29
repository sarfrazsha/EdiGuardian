import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Button, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';

const Dashboard = () => {
    const navigate = useNavigate();
    const [announcements, setAnnouncements] = useState([]);
    const [adminStats, setAdminStats] = useState({ students: 0, teachers: 0, classes: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [userData, setUserData] = useState({ name: '', role: '', email: '', studentId: '' });
    const [todayAttendance, setTodayAttendance] = useState(null);

    useEffect(() => {
        // 1. Extract session data from localStorage
        const email = localStorage.getItem('userEmail');
        const role = localStorage.getItem('userRole');
        const name = localStorage.getItem('userName');

        // 2. If no email, the user isn't logged in - boot them to login
        if (!email) {
            console.log("No session found, redirecting...");
            navigate('/');
            return;
        }

        // 3. Set user data to state
        setUserData({ name, role, email, studentId: localStorage.getItem('studentId') || '' });

        // 4. Fetch Announcements from backend (filtered by role)
        fetch(`http://localhost:8080/api/announcements?role=${(role || '').toLowerCase()}`)
            .then(res => res.json())
            .then(data => {
                setAnnouncements(data.slice(0, 3));
            })
            .catch(err => {
                console.error("Fetch announcements error:", err);
            });

        // 5. Fetch attendance if parent or student
        const sid = localStorage.getItem('studentId');
        if (sid && (role?.toLowerCase() === 'parent' || role?.toLowerCase() === 'student')) {
            const today = new Date().toISOString().split('T')[0];
            fetch(`http://localhost:8080/api/attendance/student/${sid}`)
                .then(res => res.json())
                .then(data => {
                    // Find record for today
                    const todayRec = data.find(r => new Date(r.date).toISOString().split('T')[0] === today);
                    setTodayAttendance(todayRec ? todayRec.status : 'Pending');
                })
                .catch(err => console.error("Fetch attendance error:", err));
        }

        // 6. Fetch dashboard stats if admin
        if (role?.toLowerCase() === 'admin') {
            fetch('http://localhost:8080/users')
                .then(res => res.json())
                .then(data => {
                    setAdminStats({
                        students: data.totalStudents || 0,
                        teachers: data.totalTeachers || 0,
                        classes: data.totalClasses || 0
                    });
                    setIsLoading(false);
                })
                .catch(err => {
                    console.error("Fetch stats error:", err);
                    setIsLoading(false);
                });
        } else {
            setIsLoading(false);
        }
    }, [navigate]);

    // ROLE-BASED STATS CONFIGURATION
    const getStats = () => {
        const userRole = userData.role?.toLowerCase();
        if (userRole === 'admin') {
            return [
                { label: 'Active Students', value: adminStats.students, icon: 'bi-people', color: 'primary' },
                { label: 'Active Teachers', value: adminStats.teachers, icon: 'bi-person-badge', color: 'success' },
                { label: 'Active Classes', value: adminStats.classes, icon: 'bi-building', color: 'warning' },
                { label: 'Monthly Revenue', value: 'Rs 12,400', icon: 'bi-cash-stack', color: 'info' }
            ];
        } else if (userRole === 'teacher') {
            return [
                { label: 'My Classes', value: '05', icon: 'bi-book', color: 'primary' },
                { label: 'Total Students', value: '180', icon: 'bi-people', color: 'success' },
                { label: 'Pending Gradings', value: '24', icon: 'bi-pencil-square', color: 'warning' },
                { label: 'Attendance %', value: '92%', icon: 'bi-graph-up-arrow', color: 'info' }
            ];
        } else {
            return [
                { label: 'Attendance', value: todayAttendance || '95%', icon: 'bi-calendar-check', color: todayAttendance === 'Absent' ? 'danger' : 'success' },
                { label: 'Current GPA', value: '3.8', icon: 'bi-star', color: 'warning' },
                { label: 'Course Load', value: '06', icon: 'bi-journal-text', color: 'primary' },
                { label: 'Library Books', value: '02', icon: 'bi-book-half', color: 'info' }
            ];
        }
    };

    // Show a loading spinner while checking session
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
                {/* Header Section */}
                <div className="mb-4">
                    <h2 className="fw-bold text-dark">Welcome back, {userData.name}! 👋</h2>
                    <p className="text-muted">You are logged in as <span className="badge bg-primary bg-opacity-10 text-primary text-uppercase">{userData.role}</span></p>
                </div>

                {/* Dynamic Stat Cards */}
                <Row className="g-4 mb-4">
                    {stats.map((stat, i) => (
                        <Col key={i} md={3}>
                            <Card className="border-0 shadow-sm rounded-4 h-100">
                                <Card.Body className="d-flex align-items-center p-4">
                                    <div className={`bg-${stat.color} bg-opacity-10 p-3 rounded-3 text-${stat.color} me-3`}>
                                        <i className={`bi ${stat.icon} fs-3`}></i>
                                    </div>
                                    <div>
                                        <div className="text-muted small fw-bold text-uppercase" style={{ fontSize: '10px' }}>{stat.label}</div>
                                        <h4 className="fw-bold mb-0">{stat.value}</h4>
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>
                    ))}
                </Row>

                <Row className="g-4">
                    {/* Recent Announcements */}
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