import React, { useState, useEffect } from 'react';
import { Container, Card, Table, Button, Form, Badge, Spinner, Alert, Row, Col } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';

const Attendance = () => {
    const navigate = useNavigate();
    const [students, setStudents] = useState([]);
    const [attendance, setAttendance] = useState({}); // { studentId: 'Present' | 'Absent' }
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const teacherClass = localStorage.getItem('teacherClass');
    const teacherEmail = localStorage.getItem('userEmail');

    useEffect(() => {
        if (!teacherClass) {
            setMessage({ type: 'danger', text: 'No class assigned to this teacher. Please contact admin.' });
            setIsLoading(false);
            return;
        }
        fetchStudentsAndAttendance();
    }, [selectedDate]);

    const fetchStudentsAndAttendance = async () => {
        setIsLoading(true);
        try {
            
            const stdRes = await fetch(`http://localhost:8080/api/students/class/${teacherClass}`);
            const stdData = await stdRes.json();
            setStudents(stdData);

           
            const attRes = await fetch(`http://localhost:8080/api/attendance/class/${teacherClass}?date=${selectedDate}`);
            const attData = await attRes.json();

            const attMap = {};
            attData.forEach(rec => {
                attMap[rec.studentId] = rec.status;
            });
            
            
            const initialAtt = {};
            stdData.forEach(s => {
                initialAtt[s.studentId] = attMap[s.studentId] || 'Present';
            });
            setAttendance(initialAtt);

            setIsLoading(false);
        } catch (err) {
            console.error("Fetch error:", err);
            setMessage({ type: 'danger', text: 'Failed to load class data.' });
            setIsLoading(false);
        }
    };

    const handleStatusChange = (studentId, status) => {
        setAttendance(prev => ({ ...prev, [studentId]: status }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        setMessage({ type: '', text: '' });

        const records = students.map(s => ({
            studentId: s.studentId,
            studentName: s.studentName,
            status: attendance[s.studentId]
        }));

        try {
            const res = await fetch('http://localhost:8080/api/attendance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    attendanceRecords: records,
                    date: selectedDate,
                    classNo: teacherClass,
                    markedBy: teacherEmail
                })
            });

            if (res.ok) {
                setMessage({ type: 'success', text: 'Attendance saved successfully!' });
            } else {
                setMessage({ type: 'danger', text: 'Failed to save attendance.' });
            }
        } catch (err) {
            setMessage({ type: 'danger', text: 'Server error while saving.' });
        } finally {
            setIsSaving(false);
        }
    };

    const stats = {
        total: students.length,
        present: Object.values(attendance).filter(v => v === 'Present').length,
        absent: Object.values(attendance).filter(v => v === 'Absent').length
    };

    if (isLoading) {
        return (
            <Layout>
                <div className="d-flex justify-content-center align-items-center vh-100">
                    <Spinner animation="border" variant="primary" />
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <Container fluid className="py-4">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h2 className="fw-bold text-dark mb-1">Class Attendance</h2>
                        <p className="text-muted mb-0">Managing <Badge bg="primary">{teacherClass}</Badge></p>
                    </div>
                    <div className="d-flex align-items-center gap-3">
                        <Form.Control 
                            type="date" 
                            value={selectedDate} 
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="border-0 shadow-sm rounded-pill px-4"
                            style={{ width: '200px' }}
                        />
                        <Button 
                            variant="success" 
                            className="rounded-pill px-4 shadow-sm fw-bold"
                            onClick={handleSave}
                            disabled={isSaving || students.length === 0}
                        >
                            {isSaving ? <Spinner size="sm" /> : <i className="bi bi-check2-circle me-2"></i>}
                            Save Attendance
                        </Button>
                    </div>
                </div>

                {message.text && (
                    <Alert variant={message.type} dismissible onClose={() => setMessage({type:'', text:''})}>
                        {message.text}
                    </Alert>
                )}

                <Row className="mb-4">
                    <Col md={4}>
                        <Card className="border-0 shadow-sm rounded-4 text-center p-3 h-100">
                            <h6 className="text-muted small text-uppercase">Total Students</h6>
                            <h3 className="fw-bold mb-0">{stats.total}</h3>
                        </Card>
                    </Col>
                    <Col md={4}>
                        <Card className="border-0 shadow-sm rounded-4 text-center p-3 h-100 border-start border-4 border-success">
                            <h6 className="text-success small text-uppercase">Present</h6>
                            <h3 className="fw-bold mb-0 text-success">{stats.present}</h3>
                        </Card>
                    </Col>
                    <Col md={4}>
                        <Card className="border-0 shadow-sm rounded-4 text-center p-3 h-100 border-start border-4 border-danger">
                            <h6 className="text-danger small text-uppercase">Absent</h6>
                            <h3 className="fw-bold mb-0 text-danger">{stats.absent}</h3>
                        </Card>
                    </Col>
                </Row>

                <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
                    <Card.Body className="p-0">
                        <Table responsive hover className="mb-0">
                            <thead className="bg-light">
                                <tr>
                                    <th className="ps-4 py-3">Student Name</th>
                                    <th className="py-3">Roll Number</th>
                                    <th className="py-3 text-center">Action</th>
                                    <th className="py-3 text-end pe-4">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {students.length > 0 ? students.map((s) => (
                                    <tr key={s.studentId} className="align-middle">
                                        <td className="ps-4 py-3 fw-bold">{s.studentName}</td>
                                        <td className="py-3 text-muted">{s.studentRollNo}</td>
                                        <td className="py-3 text-center">
                                            <div className="btn-group rounded-pill overflow-hidden border shadow-sm" style={{ width: '180px' }}>
                                                <Button 
                                                    variant={attendance[s.studentId] === 'Present' ? 'success' : 'light'}
                                                    size="sm"
                                                    className="border-0"
                                                    onClick={() => handleStatusChange(s.studentId, 'Present')}
                                                >
                                                    Present
                                                </Button>
                                                <Button 
                                                    variant={attendance[s.studentId] === 'Absent' ? 'danger' : 'light'}
                                                    size="sm"
                                                    className="border-0"
                                                    onClick={() => handleStatusChange(s.studentId, 'Absent')}
                                                >
                                                    Absent
                                                </Button>
                                            </div>
                                        </td>
                                        <td className="py-3 text-end pe-4">
                                            {attendance[s.studentId] === 'Present' ? (
                                                <Badge bg="success" className="rounded-pill px-3 py-2">P</Badge>
                                            ) : (
                                                <Badge bg="danger" className="rounded-pill px-3 py-2">A</Badge>
                                            )}
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="4" className="text-center py-5 text-muted">No students found for class {teacherClass}</td>
                                    </tr>
                                )}
                            </tbody>
                        </Table>
                    </Card.Body>
                </Card>
            </Container>
        </Layout>
    );
};

export default Attendance;
