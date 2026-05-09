import React, { useState, useEffect } from 'react';
import { Container, Table, Card, Button, Badge, Row, Col, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';

const AttendanceHistory = () => {
    const navigate = useNavigate();
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const studentId = localStorage.getItem('studentId');
        if (!studentId) {
            setLoading(false);
            return;
        }
        fetch(`http://localhost:8080/api/attendance/student/${studentId}`)
            .then(res => res.json())
            .then(data => {
                setRecords(Array.isArray(data) ? data : []);
                setLoading(false);
            })
            .catch(err => {
                console.error("Attendance fetch error:", err);
                setLoading(false);
            });
    }, []);

    const getDayName = (dateStr) => {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return days[new Date(dateStr).getDay()];
    };

    const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('en-PK', {
        year: 'numeric', month: 'short', day: 'numeric'
    });

    const stats = {
        total: records.length,
        present: records.filter(r => r.status === 'Present').length,
        absent: records.filter(r => r.status === 'Absent').length,
    };

    const percentage = stats.total > 0
        ? Math.round((stats.present / stats.total) * 100)
        : null;

    return (
        <Layout>
            <Container fluid className="py-4">
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
                        <h2 className="fw-bold mb-0 text-dark">Attendance History</h2>
                        <p className="text-muted small mb-0">Full attendance record from the school database</p>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-5">
                        <Spinner animation="border" variant="primary" />
                        <p className="text-muted mt-3">Loading attendance records...</p>
                    </div>
                ) : records.length === 0 ? (
                    <Card className="border-0 shadow-sm rounded-4">
                        <Card.Body className="text-center py-5">
                            <i className="bi bi-calendar-x fs-1 text-muted mb-3 d-block"></i>
                            <h5 className="text-muted fw-bold">No Attendance Records Found</h5>
                            <p className="text-muted small mb-0">Your attendance has not been marked yet. Please check back later.</p>
                        </Card.Body>
                    </Card>
                ) : (
                    <>
                        <Row className="mb-4 g-3">
                            <Col md={3}>
                                <Card className="border-0 shadow-sm rounded-4 p-3 text-center bg-primary bg-opacity-10">
                                    <div className="small fw-bold text-primary text-uppercase mb-1">Total Days</div>
                                    <h3 className="fw-bold mb-0 text-primary">{stats.total}</h3>
                                </Card>
                            </Col>
                            <Col md={3}>
                                <Card className="border-0 shadow-sm rounded-4 p-3 text-center bg-success bg-opacity-10">
                                    <div className="small fw-bold text-success text-uppercase mb-1">Days Present</div>
                                    <h3 className="fw-bold mb-0 text-success">{stats.present}</h3>
                                </Card>
                            </Col>
                            <Col md={3}>
                                <Card className="border-0 shadow-sm rounded-4 p-3 text-center bg-danger bg-opacity-10">
                                    <div className="small fw-bold text-danger text-uppercase mb-1">Days Absent</div>
                                    <h3 className="fw-bold mb-0 text-danger">{stats.absent}</h3>
                                </Card>
                            </Col>
                            <Col md={3}>
                                <Card className="border-0 shadow-sm rounded-4 p-3 text-center bg-info bg-opacity-10">
                                    <div className="small fw-bold text-info text-uppercase mb-1">Overall %</div>
                                    <h3 className="fw-bold mb-0 text-info">
                                        {percentage !== null ? `${percentage}%` : 'N/A'}
                                    </h3>
                                </Card>
                            </Col>
                        </Row>

                        <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
                            <Card.Body className="p-0">
                                <Table responsive hover className="mb-0 align-middle">
                                    <thead className="bg-light small text-uppercase">
                                        <tr>
                                            <th className="ps-4 py-3">Date</th>
                                            <th className="py-3">Day</th>
                                            <th className="py-3 text-end pe-4">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {records.map((row, i) => (
                                            <tr key={i}>
                                                <td className="ps-4 py-3 fw-bold">{formatDate(row.date)}</td>
                                                <td className="py-3 text-muted">{getDayName(row.date)}</td>
                                                <td className="py-3 text-end pe-4">
                                                    <Badge
                                                        bg={row.status === 'Present' ? 'success' : 'danger'}
                                                        className="px-3 py-2 rounded-pill fw-normal"
                                                    >
                                                        {row.status}
                                                    </Badge>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </Card.Body>
                        </Card>
                    </>
                )}
            </Container>
        </Layout>
    );
};

export default AttendanceHistory;
