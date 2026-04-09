import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Badge, Table, Spinner, Nav } from 'react-bootstrap';
import { Navigate, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';

const Results = () => {
    const navigate = useNavigate();
    const role = localStorage.getItem('userRole')?.toLowerCase();
    const studentId = localStorage.getItem('studentId');
    const classNo = localStorage.getItem('classNo');
    const studentName = localStorage.getItem('userName');

    if (!role || (role !== 'student' && role !== 'parent')) {
        return <Navigate to="/" replace />;
    }

    const [activeTerm, setActiveTerm] = useState('Mid-Term');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(true);

    const getGradeBadge = (total) => {
        const percentage = (total / 300) * 100;
        if (percentage >= 80) return { label: 'A+', color: 'success text-white' };
        if (percentage >= 70) return { label: 'A', color: 'primary' };
        if (percentage >= 60) return { label: 'B', color: 'info' };
        if (percentage >= 50) return { label: 'C', color: 'warning text-dark' };
        if (total === 0) return { label: 'N/A', color: 'secondary' };
        return { label: 'F', color: 'danger' };
    };

    const fetchResult = () => {
        setLoading(true);
        try {
            const allResults = JSON.parse(localStorage.getItem('school_academic_results') || '{}');
            const classResults = allResults[`${classNo}_${activeTerm}`] || {};
            
            // Find specific student marks
            const marks = classResults[studentId];
            if (marks) {
                const math = parseInt(marks.math || 0);
                const science = parseInt(marks.science || 0);
                const english = parseInt(marks.english || 0);
                const total = math + science + english;
                const percentage = ((total / 300) * 100).toFixed(1);
                
                setResult({
                    math, science, english, total, percentage,
                    grade: getGradeBadge(total),
                    status: percentage >= 50 ? 'Passed' : 'Failed'
                });
            } else {
                setResult(null);
            }
        } catch (err) {
            console.error("Error loading results:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (studentId && classNo) {
            fetchResult();
        }
    }, [activeTerm, studentId, classNo]);

    return (
        <Layout>
            <Container fluid className="py-4">
                {/* Header */}
                <div className="mb-4 d-flex justify-content-between align-items-center">
                    <div className="d-flex align-items-center gap-3">
                        <Button 
                            variant="light" 
                            className="rounded-circle shadow-sm border p-2 d-flex align-items-center justify-content-center" 
                            style={{ width: '40px', height: '40px' }} 
                            onClick={() => navigate(-1)}
                        >
                            <i className="bi bi-arrow-left fs-5"></i>
                        </Button>
                        <div>
                            <h2 className="fw-bold text-dark mb-0">Academic Performance</h2>
                            <p className="text-muted mb-0">Official academic report card for {studentName}.</p>
                        </div>
                    </div>
                </div>

                {/* Term Toggle */}
                <Card className="border-0 shadow-sm rounded-4 mb-4 overflow-hidden">
                    <Card.Body className="p-0">
                        <Nav variant="pills" className="nav-fill bg-light p-2" activeKey={activeTerm} onSelect={(k) => setActiveTerm(k)}>
                            <Nav.Item>
                                <Nav.Link eventKey="Mid-Term" className="rounded-pill py-2 fw-bold">Mid-Term Exams</Nav.Link>
                            </Nav.Item>
                            <Nav.Item>
                                <Nav.Link eventKey="Finals" className="rounded-pill py-2 fw-bold">Final Examinations</Nav.Link>
                            </Nav.Item>
                            <Nav.Item>
                                <Nav.Link eventKey="Monthly Test" className="rounded-pill py-2 fw-bold">Monthly Tests</Nav.Link>
                            </Nav.Item>
                        </Nav>
                    </Card.Body>
                </Card>

                {loading ? (
                    <div className="text-center py-5">
                        <Spinner animation="border" variant="primary" />
                        <p className="mt-3 text-muted">Retrieving your academic record...</p>
                    </div>
                ) : result ? (
                    <Row className="g-4">
                        {/* Summary Card */}
                        <Col lg={4}>
                            <Card className="border-0 shadow-sm rounded-4 h-100 bg-primary text-white text-center position-relative overflow-hidden">
                                <div className="position-absolute top-0 end-0 p-3 opacity-25">
                                    <i className="bi bi-award-fill" style={{ fontSize: '8rem' }}></i>
                                </div>
                                <Card.Body className="p-5 position-relative">
                                    <div className="bg-white bg-opacity-20 rounded-circle d-inline-flex p-4 mb-4">
                                        <h1 className="fw-bold mb-0" style={{ fontSize: '3rem' }}>{result.grade.label}</h1>
                                    </div>
                                    <h4 className="fw-bold mb-1">Final Outcome</h4>
                                    <Badge bg={result.status === 'Passed' ? 'success' : 'danger'} className="px-4 py-2 rounded-pill fs-6 mb-4 shadow-sm">
                                        {result.status}
                                    </Badge>
                                    
                                    <div className="mt-4 pt-4 border-top border-white border-opacity-25">
                                        <Row>
                                            <Col xs={6} className="border-end border-white border-opacity-25">
                                                <div className="small opacity-75">Total Marks</div>
                                                <div className="h4 fw-bold mb-0">{result.total}/300</div>
                                            </Col>
                                            <Col xs={6}>
                                                <div className="small opacity-75">Percentage</div>
                                                <div className="h4 fw-bold mb-0">{result.percentage}%</div>
                                            </Col>
                                        </Row>
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>

                        {/* Subject Breakdown */}
                        <Col lg={8}>
                            <Row className="g-4">
                                {[
                                    { name: 'Mathematics', score: result.math, icon: 'bi-calculator', color: 'primary' },
                                    { name: 'General Science', score: result.science, icon: 'bi-flask', color: 'success' },
                                    { name: 'English Language', score: result.english, icon: 'bi-translate', color: 'info' }
                                ].map((subject, idx) => (
                                    <Col md={12} key={idx}>
                                        <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
                                            <Card.Body className="p-4 d-flex align-items-center">
                                                <div className={`bg-${subject.color} bg-opacity-10 p-3 rounded-4 text-${subject.color} me-4 shadow-sm`}>
                                                    <i className={`bi ${subject.icon} fs-2`}></i>
                                                </div>
                                                <div className="flex-grow-1">
                                                    <h5 className="fw-bold mb-1 text-dark">{subject.name}</h5>
                                                    <div className="progress rounded-pill bg-light" style={{ height: '8px' }}>
                                                        <div 
                                                            className={`progress-bar bg-${subject.color} rounded-pill shadow-sm`} 
                                                            role="progressbar" 
                                                            style={{ width: `${subject.score}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                                <div className="ms-4 text-end">
                                                    <div className="h2 fw-bold text-dark mb-0">{subject.score}</div>
                                                    <div className="small text-muted">Out of 100</div>
                                                </div>
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                ))}
                            </Row>
                            
                            <div className="mt-4 p-4 bg-light rounded-4 border border-dashed border-secondary border-opacity-25 text-center">
                                <p className="small text-muted mb-0">
                                    <i className="bi bi-info-circle me-2 text-primary"></i>
                                    This is a system-generated academic report based on the marks published by the class teacher for Grade {classNo}.
                                </p>
                            </div>
                        </Col>
                    </Row>
                ) : (
                    <Card className="border-0 shadow-sm rounded-4">
                        <Card.Body className="p-5 text-center">
                            <i className="bi bi-journal-x text-muted mb-3" style={{ fontSize: '4rem' }}></i>
                            <h4 className="fw-bold text-dark">Results Not Found</h4>
                            <p className="text-muted">Academic records for <strong>{activeTerm}</strong> have not been published by your teacher yet.</p>
                            <Button variant="outline-primary" className="rounded-pill px-4 fw-bold mt-2" onClick={() => setActiveTerm('Mid-Term')}>
                                Check Mid-Term Results
                            </Button>
                        </Card.Body>
                    </Card>
                )}
            </Container>
        </Layout>
    );
};

export default Results;
