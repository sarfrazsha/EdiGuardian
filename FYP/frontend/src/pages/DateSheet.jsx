import React, { useState, useEffect } from 'react';
import { Container, Card, Table, Button, Badge, Spinner, Row, Col } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Axios from 'axios';

const DateSheet = () => {
    const navigate = useNavigate();
    const userRole = localStorage.getItem('userRole');
    const userEmail = localStorage.getItem('userEmail');
    const cNo = localStorage.getItem('classNo');
    const selectedChildClass = localStorage.getItem('selectedChildClass');
    const userClass = (userRole?.toLowerCase() === 'parent' && selectedChildClass) ? selectedChildClass : (cNo || localStorage.getItem('userClass'));
    
    const [datesheets, setDatesheets] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDatesheets();
    }, []);

    const fetchDatesheets = async () => {
        let targetClass = userClass || localStorage.getItem('teacherClass');
        const sid = localStorage.getItem('studentId');
        const selectedChildId = localStorage.getItem('selectedChildId');
        const studentId = (userRole?.toLowerCase() === 'parent' && selectedChildId) ? selectedChildId : sid;
        
        // If we still don't have a class and we have a studentId, try fetching from backend
        if (!targetClass && studentId && (userRole === 'student' || userRole === 'parent')) {
            try {
                const stats = await Axios.get(`/api/student/dashboard-stats/${studentId}`);
                targetClass = stats.data.studentClass;
                console.log("Fetched class from backend:", targetClass);
            } catch (err) {
                console.error("Error fetching student class from stats:", err);
            }
        }

        if (userRole === 'teacher' && !targetClass) {
            try {
                const stats = await Axios.get(`/api/teacher/stats/${userEmail}`);
                targetClass = stats.data.className;
            } catch (err) {
                console.error("Error fetching teacher class:", err);
            }
        }

        console.log("Final target class for datesheet:", targetClass);

        if (targetClass && targetClass !== 'Not Assigned' && targetClass !== 'Unknown') {
            try {
                const res = await Axios.get(`/api/datesheet/${encodeURIComponent(targetClass)}`);
                console.log("Datesheet response data:", res.data);
                setDatesheets(res.data);
            } catch (err) {
                console.error("Error fetching datesheets:", err);
            } finally {
                setLoading(false);
            }
        } else {
            console.warn("No valid target class found. Datesheet cannot be displayed.");
            setLoading(false);
        }
    };

    return (
        <Layout>
            <Container fluid className="datesheet-page py-4">
                <div className="d-flex align-items-center gap-3 mb-4">
                    <Button 
                        variant="light" 
                        className="rounded-circle shadow-sm border p-0 d-flex align-items-center justify-content-center" 
                        style={{ width: '40px', height: '40px' }} 
                        onClick={() => navigate(-1)}
                    >
                        <i className="bi bi-arrow-left fs-5"></i>
                    </Button>
                    <div>
                        <h2 className="fw-bold mb-0 text-dark">Examination Date Sheet</h2>
                        <p className="text-muted small mb-0">Academic Session 2025-26 
                            {datesheets.length === 0 && userRole !== 'teacher' && (
                                <Badge bg="warning" text="dark" className="ms-2 opacity-75 fw-normal">
                                    Checking Class: {localStorage.getItem('classNo') || 'Not Set'}
                                </Badge>
                            )}
                        </p>
                    </div>
                    <Button 
                        variant="light" 
                        className="ms-auto rounded-pill px-3 shadow-sm"
                        onClick={() => { setLoading(true); fetchDatesheets(); }}
                        disabled={loading}
                    >
                        <i className={`bi bi-arrow-clockwise me-2 datesheet-black-text ${loading ? 'spin' : ''}`}></i>
                        <span className="datesheet-black-text">Refresh</span>
                    </Button>
                </div>

                {loading ? (
                    <div className="text-center py-5">
                        <Spinner animation="border" className="datesheet-spinner" />
                    </div>
                ) : datesheets.length > 0 ? (
                    <Row>
                        {datesheets.map((ds, idx) => (
                            <Col key={ds._id} lg={12} className="mb-5">
                                <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
                                    <Card.Header className="datesheet-exam-header text-white py-3 border-0 d-flex justify-content-between align-items-center">
                                        <div>
                                            <h5 className="fw-bold mb-0">{ds.examType}</h5>
                                            <div className="small opacity-75">Class: {ds.classNo}</div>
                                        </div>
                                        <Badge bg="white" className="datesheet-published-badge rounded-pill px-3 py-2">
                                            <i className="bi bi-clock-history me-1 datesheet-black-text"></i> <span className="datesheet-black-text">Published: {new Date(ds.updatedAt).toLocaleDateString()}</span>
                                        </Badge>
                                    </Card.Header>
                                    <Card.Body className="p-0">
                                        <Table responsive hover className="mb-0 align-middle">
                                            <thead className="bg-light small text-uppercase text-secondary">
                                                <tr>
                                                    <th className="ps-4 py-3">Subject</th>
                                                    <th className="py-3">Examination Date</th>
                                                    <th className="py-3">Timing</th>
                                                    <th className="py-3">Room / Venue</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {ds.exams.map((exam, index) => (
                                                    <tr key={index}>
                                                        <td className="ps-4 py-3">
                                                            <div className="d-flex align-items-center">
                                                                <div className="datesheet-subject-icon p-2 rounded-3 me-3">
                                                                    <i className="bi bi-journal-text"></i>
                                                                </div>
                                                                <div className="fw-bold">{exam.subject}</div>
                                                            </div>
                                                        </td>
                                                        <td className="text-secondary fw-medium datesheet-date-text">
                                                            <i className="bi bi-calendar-event me-2 datesheet-accent-icon"></i>
                                                            {new Date(exam.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                                                        </td>
                                                        <td className="text-secondary fw-medium">
                                                            <i className="bi bi-clock me-2 datesheet-accent-icon"></i>
                                                            {exam.startTime} - {exam.endTime}
                                                        </td>
                                                        <td>
                                                            <Badge bg="light" className="text-dark border px-3 py-2 rounded-pill fw-normal">
                                                                <i className="bi bi-geo-alt me-1 text-danger"></i> {exam.room || 'Main Hall'}
                                                            </Badge>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </Table>
                                    </Card.Body>
                                </Card>
                            </Col>
                        ))}
                    </Row>
                ) : (
                    <Card className="border-0 shadow-lg rounded-4 overflow-hidden text-center py-5 bg-white mt-4">
                        <Card.Body className="py-5">
                            <div className="mb-4">
                                <i className="bi bi-calendar-x text-warning display-1"></i>
                            </div>
                            <h3 className="fw-bold text-dark mb-3">Not Yet Announced</h3>
                            <p className="text-muted mx-auto mb-4" style={{ maxWidth: '400px' }}>
                                The examination schedule for the upcoming term has not been published for your class yet. Please check back later or wait for an official announcement.
                            </p>
                            <Button className="datesheet-return-button rounded-pill px-5 py-2 shadow-sm" onClick={() => navigate('/dashboard')}>
                                Return to Dashboard
                            </Button>
                        </Card.Body>
                    </Card>
                )}
            </Container>
        </Layout>
    );
};

export default DateSheet;
