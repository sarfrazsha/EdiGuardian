import React from 'react';
import { Container, Table, Card, Button, Badge, Row, Col } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';

const AttendanceHistory = () => {
    const navigate = useNavigate();

    const marchAttendance = [
        { date: '2026-03-01', day: 'Monday', status: 'Present' },
        { date: '2026-03-02', day: 'Tuesday', status: 'Present' },
        { date: '2026-03-03', day: 'Wednesday', status: 'Present' },
        { date: '2026-03-04', day: 'Thursday', status: 'Absent' },
        { date: '2026-03-05', day: 'Friday', status: 'Present' },
        { date: '2026-03-08', day: 'Monday', status: 'Present' },
        { date: '2026-03-09', day: 'Tuesday', status: 'Present' },
        { date: '2026-03-10', day: 'Wednesday', status: 'Present' },
        { date: '2026-03-11', day: 'Thursday', status: 'Present' },
        { date: '2026-03-12', day: 'Friday', status: 'Present' },
        { date: '2026-03-15', day: 'Monday', status: 'Present' },
        { date: '2026-03-16', day: 'Tuesday', status: 'Absent' },
        { date: '2026-03-17', day: 'Wednesday', status: 'Present' },
        { date: '2026-03-18', day: 'Thursday', status: 'Present' },
        { date: '2026-03-19', day: 'Friday', status: 'Present' },
        { date: '2026-03-22', day: 'Monday', status: 'Present' },
        { date: '2026-03-23', day: 'Tuesday', status: 'Present' },
        { date: '2026-03-24', day: 'Wednesday', status: 'Present' },
        { date: '2026-03-25', day: 'Thursday', status: 'Present' },
        { date: '2026-03-26', day: 'Friday', status: 'Present' },
    ];

    const stats = {
        total: marchAttendance.length,
        present: marchAttendance.filter(a => a.status === 'Present').length,
        absent: marchAttendance.filter(a => a.status === 'Absent').length,
    };

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
                        <p className="text-muted small mb-0">Monthly Report - March 2026</p>
                    </div>
                </div>

                <Row className="mb-4 g-3">
                    <Col md={4}>
                        <Card className="border-0 shadow-sm rounded-4 p-3 text-center bg-primary bg-opacity-10">
                            <div className="small fw-bold text-primary text-uppercase mb-1">Total Days</div>
                            <h3 className="fw-bold mb-0 text-primary">{stats.total}</h3>
                        </Card>
                    </Col>
                    <Col md={4}>
                        <Card className="border-0 shadow-sm rounded-4 p-3 text-center bg-success bg-opacity-10">
                            <div className="small fw-bold text-success text-uppercase mb-1">Days Present</div>
                            <h3 className="fw-bold mb-0 text-success">{stats.present}</h3>
                        </Card>
                    </Col>
                    <Col md={4}>
                        <Card className="border-0 shadow-sm rounded-4 p-3 text-center bg-danger bg-opacity-10">
                            <div className="small fw-bold text-danger text-uppercase mb-1">Days Absent</div>
                            <h3 className="fw-bold mb-0 text-danger">{stats.absent}</h3>
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
                                {marchAttendance.map((row, i) => (
                                    <tr key={i}>
                                        <td className="ps-4 py-3 fw-bold">{row.date}</td>
                                        <td className="py-3 text-muted">{row.day}</td>
                                        <td className="py-3 text-end pe-4">
                                            <Badge bg={row.status === 'Present' ? 'success' : 'danger'} className="px-3 py-2 rounded-pill fw-normal">
                                                {row.status}
                                            </Badge>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </Card.Body>
                </Card>
            </Container>
        </Layout>
    );
};

export default AttendanceHistory;
