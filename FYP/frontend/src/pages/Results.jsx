import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Badge, Table, Spinner, Nav } from 'react-bootstrap';
import { Navigate, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';

const Results = () => {
    const navigate = useNavigate();
    const role = localStorage.getItem('userRole')?.toLowerCase();
    const sid = localStorage.getItem('studentId');
    const selectedChild = localStorage.getItem('selectedChildId');
    const studentId = (role === 'parent' && selectedChild) ? selectedChild : sid;

    const cNo = localStorage.getItem('classNo');
    const selectedChildClass = localStorage.getItem('selectedChildClass');
    const classNo = (role === 'parent' && selectedChildClass) ? selectedChildClass : cNo;
    
    const studentName = localStorage.getItem('userName');

    if (!role || (role !== 'student' && role !== 'parent')) {
        return <Navigate to="/" replace />;
    }

    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTerm, setActiveTerm] = useState('');
    const [result, setResult] = useState(null);

    const fetchResults = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/results/student/${studentId}`);
            if (!res.ok) throw new Error('Unable to retrieve results');
            const data = await res.json();
            const normalizedResults = Array.isArray(data) ? data.map(record => ({
                ...record,
                grade: typeof record.grade === 'string' ? { label: record.grade } : record.grade,
                status: record.status || (['F', 'Fail'].includes(typeof record.grade === 'string' ? record.grade : record.grade?.label) ? 'Failed' : 'Passed')
            })) : [];
            setResults(normalizedResults);
            
            if (normalizedResults.length > 0) {
                // Set default tab to the most recently updated result's type
                setActiveTerm(normalizedResults[0].examType);
                setResult(normalizedResults[0]);
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
        if (studentId) {
            fetchResults();
        }
    }, [studentId]);

    useEffect(() => {
        if (results.length > 0) {
            const match = results.find(r => r.examType === activeTerm);
            setResult(match || null);
        }
    }, [activeTerm, results]);

    return (
        <Layout>
            <Container fluid className="py-4">
              
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

                <Card className="border-0 shadow-sm rounded-4 mb-4 overflow-hidden">
                    <Card.Body className="p-0">
                        <Nav variant="pills" className="nav-fill bg-light p-2" activeKey={activeTerm} onSelect={(k) => setActiveTerm(k)}>
                            {Array.from(new Set(results.map(r => r.examType))).map(type => (
                                <Nav.Item key={type}>
                                    <Nav.Link eventKey={type} className="rounded-pill py-2 fw-bold">{type}</Nav.Link>
                                </Nav.Item>
                            ))}
                            {results.length === 0 && (
                                <Nav.Item>
                                    <Nav.Link eventKey="Mid-Term" className="rounded-pill py-2 fw-bold" disabled>No Results</Nav.Link>
                                </Nav.Item>
                            )}
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
                                                <div className="h4 fw-bold mb-0">{result.grandTotal}/{result.maxTotal}</div>
                                            </Col>
                                            <Col xs={6}>
                                                <div className="small opacity-75">Percentage</div>
                                                <div className="h4 fw-bold mb-0">{result.maxTotal > 0 ? ((result.grandTotal / result.maxTotal) * 100).toFixed(1) : 0}%</div>
                                            </Col>
                                        </Row>
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>

                        <Col lg={8}>
                            <Row className="g-4">
                                {result.subjects.map((subject, idx) => {
                                    const colors = ['primary', 'success', 'info', 'warning', 'danger', 'dark'];
                                    const color = colors[idx % colors.length];
                                    const icons = {
                                        math: 'bi-calculator',
                                        science: 'bi-flask',
                                        english: 'bi-translate',
                                        urdu: 'bi-book',
                                        islamiyat: 'bi-moon-stars',
                                        history: 'bi-bank'
                                    };
                                    const icon = icons[subject.subjectId] || 'bi-journal-text';
                                    const percentage = subject.totalMarks > 0 ? (subject.score / subject.totalMarks) * 100 : 0;

                                    return (
                                        <Col md={12} key={idx}>
                                            <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
                                                <Card.Body className="p-4 d-flex align-items-center">
                                                    <div className={`bg-${color} bg-opacity-10 p-3 rounded-4 text-${color} me-4 shadow-sm`}>
                                                        <i className={`bi ${icon} fs-2`}></i>
                                                    </div>
                                                    <div className="flex-grow-1">
                                                        <h5 className="fw-bold mb-1 text-dark">{subject.name}</h5>
                                                        <div className="progress rounded-pill bg-light" style={{ height: '8px' }}>
                                                            <div 
                                                                className={`progress-bar bg-${color} rounded-pill shadow-sm`} 
                                                                role="progressbar" 
                                                                style={{ width: `${percentage}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                    <div className="ms-4 text-end">
                                                        <div className="h2 fw-bold text-dark mb-0">{subject.score}</div>
                                                        <div className="small text-muted">Out of {subject.totalMarks}</div>
                                                    </div>
                                                </Card.Body>
                                            </Card>
                                        </Col>
                                    );
                                })}
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
                            <h4 className="fw-bold text-dark">Results Not Published</h4>
                            <p className="text-muted">Academic records for this term have not been published by your teacher yet.</p>
                            <Button variant="outline-primary" className="rounded-pill px-4 fw-bold mt-2" onClick={() => fetchResults()}>
                                <i className="bi bi-arrow-clockwise me-2"></i>Refresh Results
                            </Button>
                        </Card.Body>
                    </Card>
                )}
            </Container>
        </Layout>
    );
};

export default Results;
