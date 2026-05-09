import React, { useState, useEffect } from 'react';
import { Container, Card, Table, Button, Spinner, Badge, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Axios from 'axios';

const TeacherReports = () => {
    const navigate = useNavigate();
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const email = localStorage.getItem('userEmail');

    useEffect(() => {
        const fetchReport = async () => {
            try {
                const res = await Axios.get(`http://localhost:8080/api/reports/teacher/${email}`);
                setReport(res.data);
                setLoading(false);
            } catch (err) {
                console.error("Report fetch error:", err);
                setLoading(false);
            }
        };
        fetchReport();
    }, [email]);

    const handlePrint = () => {
        window.print();
    };

    if (loading) return (
        <Layout>
            <Container className="text-center py-5">
                <Spinner animation="border" variant="primary" />
                <p className="mt-3">Generating Academic Report...</p>
            </Container>
        </Layout>
    );

    if (!report) return (
        <Layout>
            <Container className="py-5 text-center">
                <Alert variant="info">No report data available for your class.</Alert>
                <Button onClick={() => navigate(-1)}>Back</Button>
            </Container>
        </Layout>
    );

    return (
        <Layout>
            <Container fluid className="py-4">
                <div className="d-flex justify-content-between align-items-center mb-4 no-print">
                    <div className="d-flex align-items-center gap-3">
                        <Button variant="light" className="rounded-circle shadow-sm border p-2" onClick={() => navigate(-1)}>
                            <i className="bi bi-arrow-left"></i>
                        </Button>
                        <div>
                            <h2 className="fw-bold mb-0">Monthly Progress Report</h2>
                            <p className="text-muted mb-0">{report.month} Report for {report.className}</p>
                        </div>
                    </div>
                    <Button variant="primary" className="rounded-pill px-4 shadow" onClick={handlePrint}>
                        <i className="bi bi-printer me-2"></i>Print Report
                    </Button>
                </div>

                <Card className="border-0 shadow-sm rounded-4 overflow-hidden report-card">
                    <Card.Header className="bg-white border-bottom p-4 text-center">
                        <h3 className="fw-bold text-primary mb-1">EduGuardian Academic System</h3>
                        <p className="text-muted mb-0 text-uppercase ls-1 small fw-bold">Official Monthly Class Performance Record</p>
                    </Card.Header>
                    <Card.Body className="p-4">
                        <div className="d-flex justify-content-between mb-4 border-bottom pb-3">
                            <div>
                                <span className="text-muted small text-uppercase fw-bold">Class Section</span>
                                <h5 className="fw-bold">{report.className}</h5>
                            </div>
                            <div className="text-end">
                                <span className="text-muted small text-uppercase fw-bold">Reporting Month</span>
                                <h5 className="fw-bold">{report.month}</h5>
                            </div>
                        </div>

                        <Table responsive className="align-middle">
                            <thead className="bg-light small text-uppercase fw-bold">
                                <tr>
                                    <th>Student Name</th>
                                    <th>Roll No.</th>
                                    <th className="text-center">Attendance Avg.</th>
                                    <th className="text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {report.stats.map((s, i) => (
                                    <tr key={i}>
                                        <td className="fw-bold">{s.name}</td>
                                        <td>{s.rollNo}</td>
                                        <td className="text-center">
                                            <div className="d-flex align-items-center justify-content-center gap-2">
                                                <div className="progress flex-grow-1" style={{ height: '6px', maxWidth: '100px' }}>
                                                    <div 
                                                        className={`progress-bar bg-${s.percentage > 75 ? 'success' : s.percentage > 50 ? 'warning' : 'danger'}`} 
                                                        style={{ width: `${s.percentage}%` }}
                                                    ></div>
                                                </div>
                                                <span className="small fw-bold">{s.percentage}%</span>
                                            </div>
                                        </td>
                                        <td className="text-center">
                                            {s.percentage > 75 ? (
                                                <Badge bg="success" className="rounded-pill px-3">Excellent</Badge>
                                            ) : s.percentage > 50 ? (
                                                <Badge bg="warning" className="text-dark rounded-pill px-3">Good</Badge>
                                            ) : (
                                                <Badge bg="danger" className="rounded-pill px-3">Low</Badge>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </Card.Body>
                    <Card.Footer className="bg-light text-center py-3">
                        <p className="text-muted small mb-0">Generated on {new Date().toLocaleDateString()} | System Verified</p>
                    </Card.Footer>
                </Card>
            </Container>

            <style>
                {`
                    @media print {
                        .no-print { display: none !important; }
                        body { background: white !important; }
                        .report-card { border: 1px solid #ddd !important; box-shadow: none !important; }
                        .container-fluid { padding: 0 !important; }
                    }
                    .ls-1 { letter-spacing: 1px; }
                `}
            </style>
        </Layout>
    );
};

export default TeacherReports;
