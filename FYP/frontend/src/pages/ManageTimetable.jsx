import React, { useState, useEffect } from 'react';
import { Container, Card, Table, Form, Button, Row, Col, Badge, Spinner, Alert } from 'react-bootstrap';
import { useNavigate, useLocation } from 'react-router-dom';
import Layout from '../components/Layout';
import Axios from 'axios';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const SUBJECT_PRESETS = [
    'Mathematics',
    'English',
    'Urdu',
    'Physics',
    'Chemistry',
    'Computer Science'
];

function parseTimeToMinutes(timeStr) {
    if (!timeStr) return null;
    const parts = String(timeStr).trim().split(':');
    if (parts.length < 2) return null;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
}

function parsePeriodInterval(period) {
    let startMin = null;
    let endMin = null;

    if (period.startTime && period.endTime) {
        startMin = parseTimeToMinutes(period.startTime);
        endMin = parseTimeToMinutes(period.endTime);
    } else if (period.time && period.time.includes('-')) {
        const [s, e] = period.time.split('-');
        startMin = parseTimeToMinutes(s);
        endMin = parseTimeToMinutes(e);
    }

    return { startMin, endMin };
}

function doIntervalsOverlap(start1, end1, start2, end2) {
    if (start1 === null || end1 === null || start2 === null || end2 === null) return false;
    return start1 < end2 && start2 < end1;
}

const ManageTimetable = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const classFilter = location.state?.classFilter;
    const [classes, setClasses] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [allSchedules, setAllSchedules] = useState([]);
    const [selectedClass, setSelectedClass] = useState('');
    const [schedule, setSchedule] = useState({});
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [alertMsg, setAlertMsg] = useState({ type: '', text: '' });

    useEffect(() => {
        const initData = async () => {
            try {
                const [clsRes, tchRes, schRes] = await Promise.all([
                    Axios.get('/api/classes'),
                    Axios.get('/api/teachers'),
                    Axios.get('/api/schedules')
                ]);
                setClasses(clsRes.data || []);
                setTeachers(tchRes.data || []);
                setAllSchedules(schRes.data || []);
            } catch (err) {
                console.error("Error loading timetable prerequisites:", err);
            }
        };
        initData();
    }, []);

    useEffect(() => {
        if (classFilter && classes.some(c => `${c.name} - ${c.section}` === classFilter)) {
            setSelectedClass(classFilter);
        }
    }, [classFilter, classes]);

    useEffect(() => {
        if (selectedClass) {
            fetchSchedule();
        }
    }, [selectedClass]);

    const fetchSchedule = async () => {
        setLoading(true);
        setAlertMsg({ type: '', text: '' });
        try {
            const res = await Axios.get(`/api/schedule/${selectedClass}`);
            if (res.data && res.data.days) {
                const scheduleMap = {};
                res.data.days.forEach(d => {
                    scheduleMap[d.day] = (d.periods || []).map(p => {
                        let start = p.startTime || '';
                        let end = p.endTime || '';
                        let time = p.time || '';
                        if ((!start || !end) && time.includes('-')) {
                            const [s, e] = time.split('-');
                            start = s.trim();
                            end = e.trim();
                        } else if (start && end && !time) {
                            time = `${start} - ${end}`;
                        }
                        return {
                            ...p,
                            startTime: start,
                            endTime: end,
                            time: time
                        };
                    });
                });
                setSchedule(scheduleMap);
            } else {
                setSchedule({});
            }
        } catch (err) {
            console.error("Error fetching schedule:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddPeriod = (day) => {
        const currentPeriods = schedule[day] || [];
        setSchedule({
            ...schedule,
            [day]: [
                ...currentPeriods,
                { startTime: '09:00', endTime: '10:00', time: '09:00 - 10:00', subject: '', teacher: '', teacherEmail: '' }
            ]
        });
    };

    const handleUpdatePeriod = (day, index, field, value) => {
        const updatedPeriods = [...(schedule[day] || [])];
        const period = { ...updatedPeriods[index], [field]: value };

        // Keep time string updated
        if (field === 'startTime' || field === 'endTime') {
            const s = field === 'startTime' ? value : period.startTime;
            const e = field === 'endTime' ? value : period.endTime;
            if (s && e) period.time = `${s} - ${e}`;
        }

        // If teacher is selected, auto-fill teacherName and default subject if not set
        if (field === 'teacherEmail') {
            const foundTeacher = teachers.find(t => t.email.toLowerCase() === value.toLowerCase());
            if (foundTeacher) {
                period.teacher = foundTeacher.teacherName;
                if (!period.subject && foundTeacher.subject) {
                    period.subject = foundTeacher.subject;
                }
            } else {
                period.teacher = '';
            }
        }

        updatedPeriods[index] = period;
        setSchedule({
            ...schedule,
            [day]: updatedPeriods
        });
    };

    const handleRemovePeriod = (day, index) => {
        const updatedPeriods = schedule[day].filter((_, i) => i !== index);
        setSchedule({
            ...schedule,
            [day]: updatedPeriods
        });
    };

    // Client-side conflict checker to warn admin immediately
    const checkConflicts = () => {
        for (const day of DAYS) {
            const periods = schedule[day] || [];

            // In-class overlaps
            for (let i = 0; i < periods.length; i++) {
                const p1 = periods[i];
                const { startMin: s1, endMin: e1 } = parsePeriodInterval(p1);
                if (s1 === null || e1 === null) continue;

                for (let j = i + 1; j < periods.length; j++) {
                    const p2 = periods[j];
                    const { startMin: s2, endMin: e2 } = parsePeriodInterval(p2);
                    if (s2 === null || e2 === null) continue;

                    if (doIntervalsOverlap(s1, e1, s2, e2)) {
                        return `Internal Conflict: Overlapping periods on ${day} (${p1.time} and ${p2.time}) in Class ${selectedClass}.`;
                    }
                }
            }

            // Cross-class teacher collision
            for (const p of periods) {
                if (!p.teacherEmail) continue;
                const { startMin: pStart, endMin: pEnd } = parsePeriodInterval(p);
                if (pStart === null || pEnd === null) continue;

                for (const otherSch of allSchedules) {
                    if (otherSch.classNo === selectedClass) continue;
                    const otherDay = (otherSch.days || []).find(od => od.day === day);
                    if (!otherDay) continue;

                    for (const op of (otherDay.periods || [])) {
                        if (op.teacherEmail && op.teacherEmail.toLowerCase() === p.teacherEmail.toLowerCase()) {
                            const { startMin: opStart, endMin: opEnd } = parsePeriodInterval(op);
                            if (opStart !== null && opEnd !== null && doIntervalsOverlap(pStart, pEnd, opStart, opEnd)) {
                                return `Scheduling Conflict: Teacher "${p.teacher || p.teacherEmail}" is already assigned to Class ${otherSch.classNo} on ${day} during ${op.time || (op.startTime + ' - ' + op.endTime)}. System stopped this assignment.`;
                            }
                        }
                    }
                }
            }
        }
        return null;
    };

    const handleSave = async () => {
        if (!selectedClass) return;

        // Run pre-validation
        const conflict = checkConflicts();
        if (conflict) {
            setAlertMsg({ type: 'danger', text: conflict });
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        setSaving(true);
        setAlertMsg({ type: '', text: '' });
        try {
            const formattedDays = Object.keys(schedule).map(day => ({
                day,
                periods: schedule[day]
            }));

            const res = await Axios.post('/api/schedule', {
                classNo: selectedClass,
                days: formattedDays
            });

            setAlertMsg({ type: 'success', text: res.data.message || 'Timetable schedule saved successfully!' });

            // Refresh all schedules so other classes reflect the updated bookings
            const schRes = await Axios.get('/api/schedules');
            setAllSchedules(schRes.data || []);
        } catch (err) {
            console.error("Error saving schedule:", err);
            const errText = err.response?.data?.message || 'Failed to save timetable.';
            setAlertMsg({ type: 'danger', text: errText });
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Layout>
            <Container fluid className="py-4">
                <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
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
                            <h2 className="fw-bold mb-0 text-dark">Period & Timetable Management</h2>
                            <p className="text-muted small mb-0">Assign teachers to classes by periods with automated conflict detection</p>
                        </div>
                    </div>
                    {selectedClass && (
                        <Button 
                            variant="primary" 
                            className="rounded-pill px-4 shadow-sm fw-bold" 
                            onClick={handleSave}
                            disabled={saving}
                        >
                            {saving ? <Spinner size="sm" className="me-2" /> : <i className="bi bi-check-circle me-2"></i>}
                            Save Schedule
                        </Button>
                    )}
                </div>

                {alertMsg.text && (
                    <Alert variant={alertMsg.type} dismissible onClose={() => setAlertMsg({ type: '', text: '' })}>
                        <i className={`bi ${alertMsg.type === 'danger' ? 'bi-exclamation-triangle-fill' : 'bi-check-circle-fill'} me-2 fs-5`}></i>
                        <strong>{alertMsg.type === 'danger' ? 'Conflict Detected: ' : 'Success: '}</strong>
                        {alertMsg.text}
                    </Alert>
                )}

                <Card className="border-0 shadow-sm rounded-4 mb-4">
                    <Card.Body className="p-4">
                        <Form.Group>
                            <Form.Label className="fw-bold text-secondary mb-2">Select Class to Manage Timetable</Form.Label>
                            <Row>
                                <Col md={5}>
                                    <Form.Select 
                                        size="lg" 
                                        className="rounded-3 border-2 fw-medium" 
                                        value={selectedClass} 
                                        onChange={(e) => setSelectedClass(e.target.value)}
                                    >
                                        <option value="">Choose a Class...</option>
                                        {classes.map(c => {
                                            const classLabel = `${c.name} - ${c.section}`;
                                            return <option key={c.id || c._id} value={classLabel}>{classLabel}</option>;
                                        })}
                                    </Form.Select>
                                </Col>
                            </Row>
                        </Form.Group>
                    </Card.Body>
                </Card>

                {selectedClass ? (
                    loading ? (
                        <div className="text-center py-5">
                            <Spinner animation="border" variant="primary" />
                            <p className="mt-3 text-muted">Loading timetable...</p>
                        </div>
                    ) : (
                        <Row>
                            {DAYS.map(day => (
                                <Col key={day} lg={6} className="mb-4">
                                    <Card className="border-0 shadow-sm rounded-4 h-100 overflow-hidden">
                                        <Card.Header className="bg-light border-0 py-3 d-flex justify-content-between align-items-center">
                                            <h6 className="fw-bold text-dark mb-0">
                                                <i className="bi bi-calendar3 me-2 text-primary"></i>{day}
                                            </h6>
                                            <Button 
                                                variant="outline-primary" 
                                                size="sm" 
                                                className="rounded-pill px-3 py-1 fw-bold"
                                                onClick={() => handleAddPeriod(day)}
                                            >
                                                <i className="bi bi-plus-lg me-1"></i> Add Period
                                            </Button>
                                        </Card.Header>
                                        <Card.Body className="p-3">
                                            {schedule[day] && schedule[day].length > 0 ? (
                                                <Table borderless responsive className="align-middle mb-0">
                                                    <thead>
                                                        <tr className="text-muted small border-bottom">
                                                            <th style={{ minWidth: '160px' }}>Start & End Time</th>
                                                            <th style={{ minWidth: '130px' }}>Subject</th>
                                                            <th style={{ minWidth: '160px' }}>Assigned Teacher</th>
                                                            <th style={{ width: '35px' }}></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {schedule[day].map((p, idx) => (
                                                            <tr key={idx} className="border-bottom">
                                                                <td className="py-2">
                                                                    <div className="d-flex align-items-center gap-1">
                                                                        <Form.Control 
                                                                            size="sm" 
                                                                            type="time"
                                                                            value={p.startTime || ''}
                                                                            onChange={(e) => handleUpdatePeriod(day, idx, 'startTime', e.target.value)}
                                                                            className="rounded-2 p-1"
                                                                            title="Period Start Time"
                                                                        />
                                                                        <span className="text-muted small">-</span>
                                                                        <Form.Control 
                                                                            size="sm" 
                                                                            type="time"
                                                                            value={p.endTime || ''}
                                                                            onChange={(e) => handleUpdatePeriod(day, idx, 'endTime', e.target.value)}
                                                                            className="rounded-2 p-1"
                                                                            title="Period End Time"
                                                                        />
                                                                    </div>
                                                                </td>
                                                                <td className="py-2">
                                                                    <Form.Select 
                                                                        size="sm" 
                                                                        value={p.subject || ''}
                                                                        onChange={(e) => handleUpdatePeriod(day, idx, 'subject', e.target.value)}
                                                                        className="rounded-2"
                                                                    >
                                                                        <option value="">Select Subject...</option>
                                                                        {SUBJECT_PRESETS.map(s => (
                                                                            <option key={s} value={s}>{s}</option>
                                                                        ))}
                                                                    </Form.Select>
                                                                </td>
                                                                <td className="py-2">
                                                                    <Form.Select 
                                                                        size="sm" 
                                                                        value={p.teacherEmail || ''}
                                                                        onChange={(e) => handleUpdatePeriod(day, idx, 'teacherEmail', e.target.value)}
                                                                        className="rounded-2"
                                                                    >
                                                                        <option value="">Select Teacher...</option>
                                                                        {teachers.map(t => (
                                                                            <option key={t.email} value={t.email}>
                                                                                {t.teacherName} ({t.subject || 'General'})
                                                                            </option>
                                                                        ))}
                                                                    </Form.Select>
                                                                </td>
                                                                <td className="py-2 text-end">
                                                                    <Button 
                                                                        variant="light" 
                                                                        size="sm" 
                                                                        className="rounded-circle text-danger border p-1"
                                                                        onClick={() => handleRemovePeriod(day, idx)}
                                                                        title="Delete Period"
                                                                    >
                                                                        <i className="bi bi-trash3"></i>
                                                                    </Button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </Table>
                                            ) : (
                                                <div className="text-center py-4 text-muted small fst-italic">
                                                    No periods defined for {day}. Click "Add Period" to schedule a lecture.
                                                </div>
                                            )}
                                        </Card.Body>
                                    </Card>
                                </Col>
                            ))}
                        </Row>
                    )
                ) : (
                    <Card className="border-0 shadow-sm rounded-4 text-center py-5 bg-light opacity-75">
                        <Card.Body>
                            <i className="bi bi-calendar-range display-4 text-primary opacity-50 mb-3 d-block"></i>
                            <h5 className="text-muted">Please select a class above to configure its weekly timetable</h5>
                        </Card.Body>
                    </Card>
                )}
            </Container>
        </Layout>
    );
};

export default ManageTimetable;
