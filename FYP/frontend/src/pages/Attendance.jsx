import React, { useState, useEffect } from 'react';
import { Container, Card, Table, Button, Form, Badge, Spinner, Alert, Row, Col } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Axios from 'axios';

const SUBJECT_LIST = [
    'Mathematics',
    'English',
    'Urdu',
    'Physics',
    'Chemistry',
    'Computer Science'
];

const Attendance = () => {
    const navigate = useNavigate();
    const [students, setStudents] = useState([]);
    const [attendance, setAttendance] = useState({}); // { studentId: 'Present' | 'Absent' }
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const userRole = (localStorage.getItem('userRole') || '').toLowerCase();
    const teacherEmail = localStorage.getItem('userEmail');

    // Multi-class & subject state
    const [assignedClasses, setAssignedClasses] = useState([]);
    const [assignmentPairs, setAssignmentPairs] = useState([]);
    const [authorizedSubjects, setAuthorizedSubjects] = useState([]);
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');

    useEffect(() => {
        const initData = async () => {
            setIsLoading(true);
            try {
                if (userRole === 'admin') {
                    const clsRes = await Axios.get('/api/classes');
                    const clsList = (clsRes.data || []).map(c => `${c.name} - ${c.section}`);
                    setAssignedClasses(clsList);
                    setAuthorizedSubjects(SUBJECT_LIST);
                    if (clsList.length > 0) setSelectedClass(clsList[0]);
                    setSelectedSubject(SUBJECT_LIST[0]);
                } else {
                    // Teacher role: fetch specific assignments
                    const res = await Axios.get(`/api/teacher/assignments/${encodeURIComponent(teacherEmail)}`);
                    const data = res.data || {};
                    const classes = data.classes || [];
                    const pairs = data.assignments || [];
                    const subjects = data.subjects?.length ? data.subjects : (data.primarySubject ? [data.primarySubject] : ['General']);

                    setAssignedClasses(classes);
                    setAssignmentPairs(pairs);
                    setAuthorizedSubjects(subjects);

                    const defaultClass = classes[0] || localStorage.getItem('teacherClass') || '';
                    setSelectedClass(defaultClass);
                    const classSubjects = pairs.filter(a => a.classNo === defaultClass).map(a => a.subject).filter(Boolean);
                    setSelectedSubject(classSubjects[0] || subjects[0] || 'General');
                }
            } catch (err) {
                console.error("Error initializing teacher assignment data:", err);
                // Fallback to local storage
                const rawTeacherClasses = localStorage.getItem('teacherClasses');
                const teacherClasses = (() => {
                    try { return JSON.parse(rawTeacherClasses) || []; } catch { return []; }
                })();
                const single = localStorage.getItem('teacherClass');
                const list = teacherClasses.length > 0 ? [...new Set(teacherClasses)] : (single ? [single] : []);
                setAssignedClasses(list);
                setSelectedClass(list[0] || '');
                const subj = localStorage.getItem('teacherSubject') || 'General';
                setAuthorizedSubjects([subj]);
                setSelectedSubject(subj);
            } finally {
                setIsLoading(false);
            }
        };

        initData();
    }, [teacherEmail, userRole]);

    const subjectsForSelectedClass = userRole === 'admin'
        ? authorizedSubjects
        : [...new Set(assignmentPairs.filter(a => a.classNo === selectedClass).map(a => a.subject).filter(Boolean))];

    useEffect(() => {
        if (!selectedClass || subjectsForSelectedClass.length === 0) return;
        if (!subjectsForSelectedClass.includes(selectedSubject)) {
            setSelectedSubject(subjectsForSelectedClass[0]);
        }
    }, [selectedClass, assignmentPairs]);

    useEffect(() => {
        if (!selectedClass) {
            setStudents([]);
            if (!isLoading) {
                setMessage({ type: 'danger', text: 'No assigned class found. Please contact admin to schedule periods.' });
            }
            return;
        }
        setMessage({ type: '', text: '' });
        fetchStudentsAndAttendance();
    }, [selectedDate, selectedClass, selectedSubject]);

    const fetchStudentsAndAttendance = async () => {
        setIsLoading(true);
        try {
            const stdRes = await fetch(`/api/students/class/${encodeURIComponent(selectedClass)}`);
            const stdData = await stdRes.json();
            setStudents(Array.isArray(stdData) ? stdData : []);

            const attRes = await fetch(`/api/attendance/class/${encodeURIComponent(selectedClass)}?date=${selectedDate}&subject=${encodeURIComponent(selectedSubject)}`);
            const attData = await attRes.json();

            const attMap = {};
            if (Array.isArray(attData)) {
                attData.forEach(rec => {
                    attMap[rec.studentId] = rec.status;
                });
            }

            const initialAtt = {};
            if (Array.isArray(stdData)) {
                stdData.forEach(s => {
                    initialAtt[s.studentId] = attMap[s.studentId] || 'Present';
                });
            }
            setAttendance(initialAtt);
            setIsLoading(false);
        } catch (err) {
            console.error("Fetch attendance error:", err);
            setMessage({ type: 'danger', text: 'Failed to load class attendance data.' });
            setIsLoading(false);
        }
    };

    const handleStatusChange = (studentId, status) => {
        setAttendance(prev => ({ ...prev, [studentId]: status }));
    };

    const handleSave = async () => {
        if (!selectedSubject) {
            setMessage({ type: 'danger', text: 'Please select a subject to mark attendance.' });
            return;
        }

        setIsSaving(true);
        setMessage({ type: '', text: '' });

        const records = students.map(s => ({
            studentId: s.studentId,
            studentName: s.studentName,
            status: attendance[s.studentId]
        }));

        try {
            const res = await Axios.post('/api/attendance', {
                attendanceRecords: records,
                date: selectedDate,
                classNo: selectedClass,
                subject: selectedSubject,
                markedBy: teacherEmail
            });

            setMessage({ type: 'success', text: res.data.message || `Attendance for ${selectedSubject} saved successfully!` });
        } catch (err) {
            const errText = err.response?.data?.message || 'Failed to save attendance.';
            setMessage({ type: 'danger', text: errText });
        } finally {
            setIsSaving(false);
        }
    };

    const stats = {
        total: students.length,
        present: Object.values(attendance).filter(v => v === 'Present').length,
        absent: Object.values(attendance).filter(v => v === 'Absent').length
    };

    return (
        <Layout>
            <Container fluid className="py-4">
                <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
                    <div>
                        <div className="d-flex align-items-center gap-3">
                            <Button 
                                variant="light" 
                                className="rounded-circle shadow-sm border p-0 d-flex align-items-center justify-content-center" 
                                style={{ width: '40px', height: '40px' }} 
                                onClick={() => navigate(-1)}
                            >
                                <i className="bi bi-arrow-left fs-5"></i>
                            </Button>
                            <div>
                                <h2 className="fw-bold mb-0 text-dark">Subject Attendance</h2>
                                <p className="text-muted small mb-0">Record daily classroom attendance by subject</p>
                            </div>
                        </div>

                        {/* Class & Subject Selector Badges */}
                        <div className="d-flex align-items-center gap-3 flex-wrap mt-3">
                            {assignedClasses.length > 1 ? (
                                <div className="d-flex align-items-center gap-2 flex-wrap">
                                    <span className="text-muted small fw-bold">Class:</span>
                                    {assignedClasses.map(cls => (
                                        <Badge
                                            key={cls}
                                            bg={selectedClass === cls ? 'primary' : 'light'}
                                            className={`px-3 py-2 rounded-pill fw-bold border ${selectedClass === cls ? 'text-white' : 'text-dark'}`}
                                            style={{ cursor: 'pointer' }}
                                            onClick={() => {
                                                setStudents([]);
                                                setAttendance({});
                                                setSelectedClass(cls);
                                            }}
                                        >
                                            {cls}
                                        </Badge>
                                    ))}
                                </div>
                            ) : (
                                <div className="d-flex align-items-center gap-2">
                                    <span className="text-muted small fw-bold">Class:</span>
                                    <Badge bg="primary" className="px-3 py-2 rounded-pill fw-bold">{selectedClass || 'None'}</Badge>
                                </div>
                            )}

                            {/* Subject badge / picker */}
                            <div className="d-flex align-items-center gap-2">
                                <span className="text-muted small fw-bold">Subject:</span>
                                {authorizedSubjects.length > 1 ? (
                                    <Form.Select
                                        size="sm"
                                        value={selectedSubject}
                                        onChange={(e) => setSelectedSubject(e.target.value)}
                                        className="rounded-pill px-3 fw-bold border-success"
                                        style={{ width: 'auto', minWidth: '140px' }}
                                    >
                                        {authorizedSubjects.map(sub => (
                                            <option key={sub} value={sub}>{sub}</option>
                                        ))}
                                    </Form.Select>
                                ) : (
                                    <Badge bg="success" className="px-3 py-2 rounded-pill fw-bold bg-opacity-10 text-success border border-success border-opacity-25">
                                        <i className="bi bi-book-half me-1"></i>{selectedSubject || 'General'}
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="d-flex align-items-center gap-3">
                        <Form.Control 
                            type="date" 
                            value={selectedDate} 
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="border shadow-sm rounded-pill px-4 fw-medium"
                            style={{ width: '180px' }}
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
                    <Alert variant={message.type} dismissible onClose={() => setMessage({ type: '', text: '' })}>
                        <i className={`bi ${message.type === 'danger' ? 'bi-exclamation-triangle-fill' : 'bi-check-circle-fill'} me-2`}></i>
                        {message.text}
                    </Alert>
                )}

                <Row className="mb-4">
                    <Col md={4}>
                        <Card className="border-0 shadow-sm rounded-4 text-center p-3 h-100">
                            <h6 className="text-muted small text-uppercase">Total Enrolled</h6>
                            <h3 className="fw-bold mb-0 text-dark">{stats.total}</h3>
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
                        {isLoading ? (
                            <div className="text-center py-5">
                                <Spinner animation="border" variant="success" />
                                <p className="mt-2 text-muted">Loading class records...</p>
                            </div>
                        ) : (
                            <Table responsive hover className="mb-0 align-middle">
                                <thead className="bg-light text-secondary small text-uppercase">
                                    <tr>
                                        <th className="ps-4 py-3">Student Name</th>
                                        <th className="py-3">Roll Number</th>
                                        <th className="py-3 text-center">Status Action</th>
                                        <th className="py-3 text-end pe-4">Attendance Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {students.length > 0 ? students.map((s) => (
                                        <tr key={s.studentId || s._id} className="align-middle">
                                            <td className="ps-4 py-3 fw-bold text-dark">{s.studentName}</td>
                                            <td className="py-3 text-muted">{s.studentRollNo}</td>
                                            <td className="py-3 text-center">
                                                <div className="btn-group rounded-pill overflow-hidden border shadow-sm" style={{ width: '180px' }}>
                                                    <Button 
                                                        variant={attendance[s.studentId] === 'Present' ? 'success' : 'light'}
                                                        size="sm"
                                                        className="fw-bold"
                                                        onClick={() => handleStatusChange(s.studentId, 'Present')}
                                                    >
                                                        Present
                                                    </Button>
                                                    <Button 
                                                        variant={attendance[s.studentId] === 'Absent' ? 'danger' : 'light'}
                                                        size="sm"
                                                        className="fw-bold"
                                                        onClick={() => handleStatusChange(s.studentId, 'Absent')}
                                                    >
                                                        Absent
                                                    </Button>
                                                </div>
                                            </td>
                                            <td className="py-3 text-end pe-4">
                                                <Badge 
                                                    bg={attendance[s.studentId] === 'Present' ? 'success' : 'danger'}
                                                    className="px-3 py-2 rounded-pill fw-bold"
                                                >
                                                    {attendance[s.studentId]}
                                                </Badge>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="4" className="text-center py-5 text-muted">
                                                No students found in {selectedClass}.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </Table>
                        )}
                    </Card.Body>
                </Card>
            </Container>
        </Layout>
    );
};

export default Attendance;
