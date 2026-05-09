import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Table, Badge, Spinner, Alert } from 'react-bootstrap';
import { Navigate, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Axios from 'axios';

const ManageResults = () => {
    const navigate = useNavigate();
    const role = localStorage.getItem('userRole');
    const email = localStorage.getItem('userEmail');

    
    if (!email || (role?.toLowerCase() !== 'teacher' && role?.toLowerCase() !== 'admin')) {
        return <Navigate to="/" replace />;
    }

    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');

    const [selectedClass, setSelectedClass] = useState('');
    const [examType, setExamType] = useState('Mid-Term');
    
    const [grades, setGrades] = useState({});

    const fetchStudents = async () => {
        try {
            setLoading(true);
            const res = await Axios.get('http://localhost:8080/api/parents');
            const uniqueStudents = res.data.map(p => ({
                id: p.studentId,
                name: p.studentName,
                classNo: p.classNo
            })).filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i); // unique by studentId
            
            setStudents(uniqueStudents);
            setLoading(false);
        } catch (err) {
            console.error("Failed to fetch students", err);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStudents();
    }, []);

    useEffect(() => {
        if (selectedClass && examType) {
            const allResults = JSON.parse(localStorage.getItem('school_academic_results') || '{}');
            const classResults = allResults[`${selectedClass}_${examType}`] || {};
            setGrades(classResults);
        } else {
            setGrades({});
        }
    }, [selectedClass, examType]);

    
    const teacherClass = localStorage.getItem('teacherClass');
    const classesList = role?.toLowerCase() === 'teacher' && teacherClass
        ? [teacherClass]
        : [...new Set(students.map(s => s.classNo).filter(Boolean))].sort();

    const filteredStudents = selectedClass 
        ? students.filter(s => s.classNo === selectedClass)
        : [];

    const handleGradeChange = (studentId, subject, value) => {
        setGrades(prev => ({
            ...prev,
            [studentId]: {
                ...(prev[studentId] || {}),
                [subject]: value
            }
        }));
    };

    const handleSaveResults = () => {
        if (!selectedClass || !examType) return;
        
        setSaving(true);
        
        const allResults = JSON.parse(localStorage.getItem('school_academic_results') || '{}');
        allResults[`${selectedClass}_${examType}`] = grades;
        localStorage.setItem('school_academic_results', JSON.stringify(allResults));

        setTimeout(() => {
            setSaving(false);
            setSuccessMsg(`Results for ${selectedClass} (${examType}) successfully published!`);
            setTimeout(() => setSuccessMsg(''), 3000);
        }, 1200);
    };

    const calculateTotal = (studentId) => {
        const studentGrades = grades[studentId] || {};
        const math = parseInt(studentGrades.math || 0);
        const science = parseInt(studentGrades.science || 0);
        const english = parseInt(studentGrades.english || 0);
        return math + science + english;
    };

    const getGradeBadge = (total) => {
        const percentage = (total / 300) * 100;
        if (percentage >= 80) return <Badge bg="success" className="px-3 py-2 rounded-pill">A+</Badge>;
        if (percentage >= 70) return <Badge bg="primary" className="px-3 py-2 rounded-pill">A</Badge>;
        if (percentage >= 60) return <Badge bg="info" className="px-3 py-2 rounded-pill">B</Badge>;
        if (percentage >= 50) return <Badge bg="warning" className="px-3 py-2 rounded-pill text-dark">C</Badge>;
        if (total === 0) return <Badge bg="secondary" className="px-3 py-2 rounded-pill text-white shadow-sm disabled">N/A</Badge>;
        return <Badge bg="danger" className="px-3 py-2 rounded-pill">F</Badge>;
    };

    return (
        <Layout>
            <Container fluid className="py-4">
                <div className="mb-4 d-flex justify-content-between align-items-center">
                    <div className="d-flex align-items-center gap-3">
                        <Button variant="light" className="rounded-circle shadow-sm border p-2 d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }} onClick={() => navigate(-1)}>
                            <i className="bi bi-arrow-left fs-5"></i>
                        </Button>
                        <div>
                            <h2 className="fw-bold text-dark mb-0">Manage Results</h2>
                            <p className="text-muted mb-0">Grade papers and publish academic reports.</p>
                        </div>
                    </div>
                </div>

                {successMsg && <Alert variant="success" className="shadow-sm fw-bold border-0"><i className="bi bi-check-circle-fill me-2"></i>{successMsg}</Alert>}

                <Row className="g-4">
                
                    <Col lg={12}>
                        <Card className="border-0 shadow-sm rounded-4">
                            <Card.Body className="p-4 d-flex flex-column flex-md-row gap-4 align-items-end">
                                <Form.Group className="flex-grow-1">
                                    <Form.Label className="small fw-bold text-secondary text-uppercase ls-1">Select Class section</Form.Label>
                                    <Form.Select className="shadow-sm border-0 bg-light p-3" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
                                        <option value="">-- Choose a class to grade --</option>
                                        {classesList.map(c => <option key={c} value={c}>{c}</option>)}
                                    </Form.Select>
                                </Form.Group>
                                
                                <Form.Group className="flex-grow-1">
                                    <Form.Label className="small fw-bold text-secondary text-uppercase ls-1">Exam Term</Form.Label>
                                    <Form.Select className="shadow-sm border-0 bg-light p-3" value={examType} onChange={(e) => setExamType(e.target.value)}>
                                        <option>Mid-Term</option>
                                        <option>Finals</option>
                                        <option>Monthly Test</option>
                                    </Form.Select>
                                </Form.Group>
                            </Card.Body>
                        </Card>
                    </Col>

                   
                    {selectedClass && (
                    <Col lg={12}>
                        <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
                            <Card.Header className="bg-white border-bottom p-4 d-flex justify-content-between align-items-center">
                                <h5 className="fw-bold mb-0 text-dark">Student Grading Roster - {selectedClass}</h5>
                                <Badge bg="primary" className="bg-opacity-10 text-primary px-3 py-2 rounded-pill fw-bold border border-primary border-opacity-25">
                                    {filteredStudents.length} Students
                                </Badge>
                            </Card.Header>
                            <Card.Body className="p-0">
                                <div className="table-responsive">
                                    <Table hover className="align-middle mb-0 custom-table">
                                        <thead className="bg-light text-secondary small text-uppercase" style={{ letterSpacing: '0.5px' }}>
                                            <tr>
                                                <th className="ps-4 py-3 border-0">Student Name</th>
                                                <th className="py-3 border-0" style={{ width: '120px' }}>Math (/100)</th>
                                                <th className="py-3 border-0" style={{ width: '120px' }}>Science (/100)</th>
                                                <th className="py-3 border-0" style={{ width: '120px' }}>English (/100)</th>
                                                <th className="py-3 border-0 text-center">Total Grade</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredStudents.length > 0 ? filteredStudents.map(student => {
                                                const total = calculateTotal(student.id);
                                                return (
                                                    <tr key={student.id}>
                                                        <td className="ps-4 py-3 fw-bold text-dark">{student.name}</td>
                                                        <td>
                                                            <Form.Control type="number" min="0" max="100" className="text-center shadow-sm border-light bg-light" placeholder="0" 
                                                                value={grades[student.id]?.math || ''} onChange={(e) => handleGradeChange(student.id, 'math', e.target.value)} />
                                                        </td>
                                                        <td>
                                                            <Form.Control type="number" min="0" max="100" className="text-center shadow-sm border-light bg-light" placeholder="0" 
                                                                value={grades[student.id]?.science || ''} onChange={(e) => handleGradeChange(student.id, 'science', e.target.value)} />
                                                        </td>
                                                        <td>
                                                            <Form.Control type="number" min="0" max="100" className="text-center shadow-sm border-light bg-light" placeholder="0" 
                                                                value={grades[student.id]?.english || ''} onChange={(e) => handleGradeChange(student.id, 'english', e.target.value)} />
                                                        </td>
                                                        <td className="text-center">
                                                            {getGradeBadge(total)}
                                                        </td>
                                                    </tr>
                                                );
                                            }) : (
                                                <tr>
                                                    <td colSpan="5" className="text-center py-5 text-muted">No students found in this class.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </Table>
                                </div>
                            </Card.Body>
                            {filteredStudents.length > 0 && (
                                <Card.Footer className="bg-white p-4 border-top d-flex justify-content-end">
                                    <Button variant="primary" className="rounded-pill px-5 py-2 fw-bold shadow" onClick={handleSaveResults} disabled={saving}>
                                        {saving ? <Spinner size="sm" className="me-2" /> : <i className="bi bi-cloud-arrow-up-fill me-2"></i>}
                                        {saving ? 'Publishing...' : 'Publish Results'}
                                    </Button>
                                </Card.Footer>
                            )}
                        </Card>
                    </Col>
                    )}
                </Row>
            </Container>

            <style>
                {`
                    .custom-table tbody tr {
                        transition: all 0.2s ease;
                    }
                    .custom-table tbody tr:hover {
                        background-color: #f8fafc !important;
                    }
                    .ls-1 {
                        letter-spacing: 1px;
                    }
                `}
            </style>
        </Layout>
    );
};

export default ManageResults;
