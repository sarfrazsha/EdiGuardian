import React, { useState, useEffect } from 'react';
import { Container, Card, Table, Form, Button, Row, Col, Badge, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Axios from 'axios';

const ManageDateSheet = () => {
    const navigate = useNavigate();
    const userRole = localStorage.getItem('userRole');
    const isTeacher = userRole?.toLowerCase() === 'teacher';
    const userEmail = localStorage.getItem('userEmail');

    // Admin: full free-form control over every subject's exam row.
    const [datesheet, setDatesheet] = useState({
        classNo: '',
        examType: '',
        exams: []
    });

    // Teacher: locked to their own subject's single exam row. Every other
    // subject already on the datesheet is shown but read-only, clearly
    // labelled so it's obvious whose exam it is.
    const [teacherSubject, setTeacherSubject] = useState('');
    const [myExam, setMyExam] = useState({ date: '', startTime: '', endTime: '', room: '' });
    const [otherExams, setOtherExams] = useState([]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [classes, setClasses] = useState([]);

    // Multi-class support for teachers
    const rawTeacherClasses = localStorage.getItem('teacherClasses');
    const teacherClasses = (() => {
        try { return JSON.parse(rawTeacherClasses) || []; } catch { return []; }
    })();
    const teacherClassSingle = localStorage.getItem('teacherClass');
    const allTeacherClasses = teacherClasses.length > 0
        ? [...new Set(teacherClasses)]
        : (teacherClassSingle ? [teacherClassSingle] : []);

    useEffect(() => {
        const initializeData = async () => {
            if (isTeacher) {
                try {
                    const assignRes = await Axios.get(`/api/teacher/assignments/${encodeURIComponent(userEmail || '')}`);
                    const mySubject = assignRes.data?.primarySubject || localStorage.getItem('teacherSubject') || '';
                    setTeacherSubject(mySubject);

                    let classesToUse = allTeacherClasses;
                    if (classesToUse.length === 0) {
                        const stats = await Axios.get(`/api/teacher/stats/${userEmail?.trim()}`);
                        const fetchedClasses = stats.data.classes || [];
                        const fetchedClass = stats.data.className;
                        classesToUse = fetchedClasses.length > 0 ? fetchedClasses : (fetchedClass && fetchedClass !== 'Not Assigned' ? [fetchedClass] : []);
                        if (classesToUse.length > 0) {
                            localStorage.setItem('teacherClasses', JSON.stringify(classesToUse));
                            localStorage.setItem('teacherClass', classesToUse[0]);
                        }
                    }

                    if (classesToUse.length > 0) {
                        const firstClass = classesToUse[0];
                        setDatesheet(prev => ({ ...prev, classNo: firstClass }));
                        await fetchTeacherInfo(firstClass, mySubject);
                    } else {
                        setDatesheet(prev => ({ ...prev, classNo: '' }));
                        setLoading(false);
                    }
                } catch (err) {
                    console.error("[ManageDateSheet] Error fetching teacher class:", err);
                    setLoading(false);
                }
            } else if (userRole === 'admin') {
                await fetchClasses();
                setLoading(false);
            } else {
                setLoading(false);
            }
        };

        initializeData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);


    const fetchClasses = async () => {
        try {
            const res = await Axios.get('/api/classes');
            setClasses(res.data);
        } catch (err) {
            console.error("Error fetching classes:", err);
        }
    };

    const fetchTeacherInfo = async (className, subjectOverride) => {
        const mySubject = (subjectOverride ?? teacherSubject).toLowerCase().trim();
        try {
            const dsRes = await Axios.get(`/api/datesheet/${className}`);
            if (dsRes.data && dsRes.data.length > 0) {
                const latest = dsRes.data[0];
                const examsList = latest.exams.map(ex => ({
                    ...ex,
                    date: ex.date ? ex.date.split('T')[0] : ''
                }));
                setDatesheet({
                    classNo: latest.classNo,
                    examType: latest.examType,
                    exams: examsList
                });

                if (isTeacher) {
                    const mine = examsList.find(ex => (ex.subject || '').toLowerCase().trim() === mySubject);
                    setMyExam(mine
                        ? { date: mine.date, startTime: mine.startTime || '', endTime: mine.endTime || '', room: mine.room || '' }
                        : { date: '', startTime: '', endTime: '', room: '' });
                    setOtherExams(examsList.filter(ex => (ex.subject || '').toLowerCase().trim() !== mySubject));
                }
            } else {
                setDatesheet(prev => ({ ...prev, classNo: className, examType: prev.examType || '', exams: [] }));
                if (isTeacher) {
                    setMyExam({ date: '', startTime: '', endTime: '', room: '' });
                    setOtherExams([]);
                }
            }
        } catch (err) {
            console.error("Error fetching existing datesheet:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddExam = () => {
        setDatesheet({
            ...datesheet,
            exams: [...datesheet.exams, { subject: '', date: '', startTime: '', endTime: '', room: '' }]
        });
    };

    const handleUpdateExam = (index, field, value) => {
        const updatedExams = [...datesheet.exams];
        updatedExams[index][field] = value;
        setDatesheet({
            ...datesheet,
            exams: updatedExams
        });
    };

    const handleRemoveExam = (index) => {
        const updatedExams = datesheet.exams.filter((_, i) => i !== index);
        setDatesheet({
            ...datesheet,
            exams: updatedExams
        });
    };

    const handleUpdateMyExam = (field, value) => {
        setMyExam(prev => ({ ...prev, [field]: value }));
    };

    const handleClearMyExam = () => {
        if (!window.confirm(`Remove your ${teacherSubject} exam entry for this class?`)) return;
        setMyExam({ date: '', startTime: '', endTime: '', room: '' });
    };

    const handleSave = async () => {
        if (!datesheet.examType || !datesheet.examType.trim()) {
            alert("Please provide an exam type.");
            return;
        }
        if (isTeacher && !teacherSubject) {
            alert("No subject is on file for your account - contact admin before publishing an exam entry.");
            return;
        }
        if (!isTeacher && datesheet.exams.length === 0) {
            alert("Please add at least one subject schedule.");
            return;
        }

        let classNo = datesheet.classNo;

        // If it's empty, try one last desperation fetch
        if (!classNo || classNo === 'Not Assigned' || classNo === 'null' || classNo === 'undefined') {
            try {
                const stats = await Axios.get(`/api/teacher/stats/${userEmail?.trim()}`);
                classNo = stats.data.className;
            } catch (err) {
                console.error("Final fetch failed", err);
            }
        }

        if (!classNo || classNo === 'Not Assigned' || classNo === 'null' || classNo === 'undefined') {
            alert("No valid class assigned to You. Please ensure the Admin has assigned a class to you.");
            return;
        }

        // Teachers can only ever publish their own subject's row - leaving
        // the date blank removes it (the backend deletes an omitted row
        // rather than treating it as "no change").
        const exams = isTeacher
            ? (myExam.date ? [{ subject: teacherSubject, ...myExam }] : [])
            : datesheet.exams;

        const payload = { classNo, examType: datesheet.examType, exams, markedBy: userEmail };
        console.log("Publishing datesheet with payload:", payload);

        setSaving(true);
        try {
            await Axios.post('/api/datesheet', payload);
            alert(isTeacher
                ? `Your ${teacherSubject} exam entry has been published.`
                : "Examination datesheet published successfully!");
            if (isTeacher) await fetchTeacherInfo(classNo, teacherSubject);
        } catch (err) {
            console.error("Error saving datesheet:", err);
            alert(err.response?.data?.message || "Failed to publish datesheet.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <Layout><div className="text-center py-5"><Spinner animation="border" variant="primary" /></div></Layout>;

    return (
        <Layout>
            <Container fluid className="py-4">
                <div className="d-flex align-items-center justify-content-between mb-4">
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
                            <h2 className="fw-bold text-dark mb-0">Manage Datesheets</h2>
                            <p className="text-muted mb-0">
                                {isTeacher ? `Publish your ${teacherSubject || 'subject'} exam for` : 'Publish and manage exam schedules for'}
                                <Badge bg="primary" className="ms-2">{datesheet.classNo || ""}</Badge>
                            </p>
                        </div>
                    </div>
                    <Button
                        variant="success"
                        className="rounded-pill px-4 shadow-sm fw-bold"
                        onClick={handleSave}
                        disabled={saving}
                    >
                        {saving ? <Spinner size="sm" className="me-2" /> : <i className="bi bi-cloud-arrow-up me-2"></i>}
                        {isTeacher ? 'Publish My Exam' : 'Publish Datesheet'}
                    </Button>
                </div>

                <Row>
                    <Col lg={4}>
                        <Card className="border-0 shadow-sm rounded-4 mb-4">
                            <Card.Body className="p-4">
                                <h5 className="fw-bold mb-3">Exam Details</h5>
                                <Form.Group className="mb-3">
                                    <Form.Label className="small fw-bold text-muted">Exam Type</Form.Label>
                                    <Form.Control
                                        type="text"
                                        placeholder="e.g. Mid-Term, Monthly Test"
                                        value={datesheet.examType}
                                        onChange={(e) => setDatesheet({ ...datesheet, examType: e.target.value })}
                                        className="rounded-3"
                                    />
                                    <Form.Text className="text-muted">Enter the name of the exam term.</Form.Text>
                                </Form.Group>
                                <Form.Group>
                                    {userRole === 'admin' && (
                                        <>
                                            <Form.Label className="small fw-bold text-muted">Target Class</Form.Label>
                                            <Form.Select
                                                value={datesheet.classNo}
                                                onChange={(e) => {
                                                    const cls = e.target.value;
                                                    setDatesheet({ ...datesheet, classNo: cls });
                                                    if (cls) fetchTeacherInfo(cls);
                                                }}
                                                className="rounded-3"
                                            >
                                                <option value="">Select a Class...</option>
                                                {classes.map(c => {
                                                    const label = `${c.name} - ${c.section}`;
                                                    return <option key={c.id || c._id} value={label}>{label}</option>
                                                })}
                                            </Form.Select>
                                            <Form.Text className="text-muted">Select the class for this datesheet.</Form.Text>
                                        </>
                                    )}
                                    {isTeacher && allTeacherClasses.length > 1 && (
                                        <>
                                            <Form.Label className="small fw-bold text-muted">Select Class</Form.Label>
                                            <Form.Select
                                                value={datesheet.classNo}
                                                onChange={(e) => {
                                                    const cls = e.target.value;
                                                    setDatesheet(prev => ({ classNo: cls, examType: '', exams: [] }));
                                                    if (cls) fetchTeacherInfo(cls, teacherSubject);
                                                }}
                                                className="rounded-3"
                                            >
                                                {allTeacherClasses.map(cls => (
                                                    <option key={cls} value={cls}>{cls}</option>
                                                ))}
                                            </Form.Select>
                                            <Form.Text className="text-muted">Select which class to manage datesheet for.</Form.Text>
                                        </>
                                    )}
                                </Form.Group>

                            </Card.Body>
                        </Card>
                    </Col>

                    <Col lg={8}>
                        {isTeacher ? (
                            <>
                                <Card className="border-0 shadow-sm rounded-4 mb-4 overflow-hidden">
                                    <Card.Header className="bg-primary bg-opacity-10 border-0 py-3">
                                        <h6 className="fw-bold text-primary mb-0">
                                            <i className="bi bi-person-check-fill me-2"></i>Your Subject: {teacherSubject || 'Not set'}
                                        </h6>
                                    </Card.Header>
                                    <Card.Body className="p-4">
                                        {teacherSubject ? (
                                            <Row className="g-3 align-items-end">
                                                <Col md={3}>
                                                    <Form.Label className="small fw-bold text-secondary text-uppercase">Date</Form.Label>
                                                    <Form.Control
                                                        type="date"
                                                        value={myExam.date}
                                                        onChange={(e) => handleUpdateMyExam('date', e.target.value)}
                                                        className="rounded-2"
                                                    />
                                                </Col>
                                                <Col md={3}>
                                                    <Form.Label className="small fw-bold text-secondary text-uppercase">Start Time</Form.Label>
                                                    <Form.Control
                                                        placeholder="Start"
                                                        value={myExam.startTime}
                                                        onChange={(e) => handleUpdateMyExam('startTime', e.target.value)}
                                                        className="rounded-2"
                                                    />
                                                </Col>
                                                <Col md={3}>
                                                    <Form.Label className="small fw-bold text-secondary text-uppercase">End Time</Form.Label>
                                                    <Form.Control
                                                        placeholder="End"
                                                        value={myExam.endTime}
                                                        onChange={(e) => handleUpdateMyExam('endTime', e.target.value)}
                                                        className="rounded-2"
                                                    />
                                                </Col>
                                                <Col md={3}>
                                                    <Form.Label className="small fw-bold text-secondary text-uppercase">Room</Form.Label>
                                                    <Form.Control
                                                        placeholder="e.g. Room 102"
                                                        value={myExam.room}
                                                        onChange={(e) => handleUpdateMyExam('room', e.target.value)}
                                                        className="rounded-2"
                                                    />
                                                </Col>
                                                {myExam.date && (
                                                    <Col xs={12}>
                                                        <Button variant="outline-danger" size="sm" className="rounded-pill" onClick={handleClearMyExam}>
                                                            <i className="bi bi-trash-fill me-1"></i>Remove My Exam Entry
                                                        </Button>
                                                    </Col>
                                                )}
                                            </Row>
                                        ) : (
                                            <div className="text-muted small">
                                                No subject is on file for your account. Contact admin to have a subject assigned before publishing an exam entry.
                                            </div>
                                        )}
                                    </Card.Body>
                                </Card>

                                <Card className="border-0 shadow-sm rounded-4 mb-4 overflow-hidden">
                                    <Card.Header className="bg-light border-0 py-3">
                                        <h6 className="fw-bold text-secondary mb-0">
                                            <i className="bi bi-lock-fill me-2"></i>Other Subjects (Read-only)
                                        </h6>
                                    </Card.Header>
                                    <Card.Body className="p-0">
                                        <Table responsive hover className="mb-0 align-middle">
                                            <thead className="bg-light small text-uppercase text-secondary">
                                                <tr>
                                                    <th className="ps-4">Subject</th>
                                                    <th>Date</th>
                                                    <th>Time</th>
                                                    <th>Room / Location</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {otherExams.map((ex, idx) => (
                                                    <tr key={idx} className="text-muted" title={`Locked: reserved for the ${ex.subject} teacher`}>
                                                        <td className="ps-4 fw-bold">
                                                            {ex.subject}
                                                            <Badge bg="secondary" className="bg-opacity-10 text-secondary border ms-2 fw-normal">
                                                                <i className="bi bi-lock-fill me-1"></i>Locked
                                                            </Badge>
                                                        </td>
                                                        <td>{ex.date || '-'}</td>
                                                        <td>{ex.startTime && ex.endTime ? `${ex.startTime} - ${ex.endTime}` : '-'}</td>
                                                        <td>{ex.room || '-'}</td>
                                                    </tr>
                                                ))}
                                                {otherExams.length === 0 && (
                                                    <tr>
                                                        <td colSpan="4" className="text-center py-4 text-muted small fst-italic">
                                                            No other subjects have published an exam for this class/exam type yet.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </Table>
                                    </Card.Body>
                                </Card>
                            </>
                        ) : (
                            <Card className="border-0 shadow-sm rounded-4 mb-4 overflow-hidden">
                                <Card.Header className="bg-primary bg-opacity-10 border-0 py-3 d-flex justify-content-between align-items-center">
                                    <h6 className="fw-bold text-primary mb-0">Subject Schedule</h6>
                                    <Button
                                        variant="primary"
                                        size="sm"
                                        className="rounded-pill px-3 py-1"
                                        onClick={handleAddExam}
                                    >
                                        <i className="bi bi-plus-lg me-1"></i> Add Subject
                                    </Button>
                                </Card.Header>
                                <Card.Body className="p-0">
                                    <Table responsive hover className="mb-0 align-middle">
                                        <thead className="bg-light small text-uppercase text-secondary">
                                            <tr>
                                                <th className="ps-4">Subject</th>
                                                <th>Date</th>
                                                <th>Time</th>
                                                <th>Room / Location</th>
                                                <th className="text-center">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {datesheet.exams.map((ex, idx) => (
                                                <tr key={idx}>
                                                    <td className="ps-4">
                                                        <Form.Control
                                                            size="sm"
                                                            placeholder="e.g. Mathematics"
                                                            value={ex.subject}
                                                            onChange={(e) => handleUpdateExam(idx, 'subject', e.target.value)}
                                                            className="rounded-2"
                                                        />
                                                    </td>
                                                    <td>
                                                        <Form.Control
                                                            type="date"
                                                            size="sm"
                                                            value={ex.date}
                                                            onChange={(e) => handleUpdateExam(idx, 'date', e.target.value)}
                                                            className="rounded-2"
                                                        />
                                                    </td>
                                                    <td>
                                                        <div className="d-flex gap-1">
                                                            <Form.Control
                                                                size="sm"
                                                                placeholder="Start"
                                                                value={ex.startTime}
                                                                onChange={(e) => handleUpdateExam(idx, 'startTime', e.target.value)}
                                                                className="rounded-2"
                                                            />
                                                            <Form.Control
                                                                size="sm"
                                                                placeholder="End"
                                                                value={ex.endTime}
                                                                onChange={(e) => handleUpdateExam(idx, 'endTime', e.target.value)}
                                                                className="rounded-2"
                                                            />
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <Form.Control
                                                            size="sm"
                                                            placeholder="e.g. Room 102"
                                                            value={ex.room}
                                                            onChange={(e) => handleUpdateExam(idx, 'room', e.target.value)}
                                                            className="rounded-2"
                                                        />
                                                    </td>
                                                    <td className="text-center">
                                                        <Button
                                                            variant="outline-danger"
                                                            size="sm"
                                                            className="rounded-circle border-0 p-1"
                                                            onClick={() => handleRemoveExam(idx)}
                                                        >
                                                            <i className="bi bi-trash-fill"></i>
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {datesheet.exams.length === 0 && (
                                                <tr>
                                                    <td colSpan="5" className="text-center py-5 text-muted">
                                                        No subjects added yet. Click "Add Subject" to begin.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </Table>
                                </Card.Body>
                            </Card>
                        )}
                    </Col>
                </Row>
            </Container>
        </Layout>
    );
};

export default ManageDateSheet;
