import React, { useState, useEffect, useMemo } from 'react';
import { Container, Table, Card, Button, Badge, Row, Col, Spinner, Form, Nav, ProgressBar } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';

const AttendanceHistory = () => {
    const navigate = useNavigate();
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('daily'); // 'daily' | 'subjects' | 'table'
    const [selectedSubject, setSelectedSubject] = useState('ALL');
    const [searchDate, setSearchDate] = useState('');

    const role = localStorage.getItem('userRole')?.toLowerCase();
    const sid = localStorage.getItem('studentId');
    const selectedChild = localStorage.getItem('selectedChildId');
    const studentId = (role === 'parent' && selectedChild) ? selectedChild : sid;
    const child = (() => {
        if (role !== 'parent') return null;
        try { return JSON.parse(localStorage.getItem('parentChildren') || '[]').find(c => c.id === selectedChild) || null; } catch { return null; }
    })();
    const studentName = child?.name || localStorage.getItem('userName') || 'Student';
    const studentClass = role === 'parent'
        ? (child?.classNo || localStorage.getItem('selectedChildClass'))
        : localStorage.getItem('classNo');

    useEffect(() => {
        if (!studentId) {
            setLoading(false);
            return;
        }
        fetch(`/api/attendance/student/${studentId}`)
            .then(res => res.json())
            .then(data => {
                setRecords(Array.isArray(data) ? data : []);
                setLoading(false);
            })
            .catch(err => {
                console.error("Attendance fetch error:", err);
                setLoading(false);
            });
    }, [studentId]);

    const getDayName = (dateStr) => {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return days[new Date(dateStr).getDay()];
    };

    const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('en-PK', {
        year: 'numeric', month: 'short', day: 'numeric'
    });

    const formatISODate = (dateStr) => {
        const d = new Date(dateStr);
        if (Number.isNaN(d.getTime())) return String(dateStr).split('T')[0];
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    // Extract unique subjects
    const uniqueSubjects = useMemo(() => {
        const set = new Set();
        records.forEach(r => {
            if (r.subject) set.add(r.subject);
        });
        return Array.from(set).sort();
    }, [records]);

    // Overall stats
    const stats = useMemo(() => {
        const total = records.length;
        const present = records.filter(r => r.status === 'Present').length;
        const absent = records.filter(r => r.status === 'Absent').length;
        const pct = total > 0 ? Math.round((present / total) * 100) : null;
        return { total, present, absent, pct };
    }, [records]);

    // Records matching the subject + date filters (used by every view)
    const filteredRecords = useMemo(() => {
        return records.filter(r => {
            const matchesSubject = selectedSubject === 'ALL' || (r.subject || '').toLowerCase() === selectedSubject.toLowerCase();
            const matchesDate = !searchDate || formatISODate(r.date) === searchDate;
            return matchesSubject && matchesDate;
        });
    }, [records, selectedSubject, searchDate]);

    // Subject breakdown analytics
    const subjectAnalytics = useMemo(() => {
        const map = {};
        filteredRecords.forEach(r => {
            const sub = r.subject || 'General';
            if (!map[sub]) {
                map[sub] = { total: 0, present: 0, absent: 0 };
            }
            map[sub].total += 1;
            if (r.status === 'Present') map[sub].present += 1;
            else if (r.status === 'Absent') map[sub].absent += 1;
        });

        return Object.entries(map).map(([subject, data]) => ({
            subject,
            total: data.total,
            present: data.present,
            absent: data.absent,
            pct: data.total > 0 ? Math.round((data.present / data.total) * 100) : 0
        })).sort((a, b) => b.total - a.total);
    }, [filteredRecords]);

    // Group records by calendar day (for daily all-subjects view)
    const dailyGroups = useMemo(() => {
        const groups = {};
        records.forEach(r => {
            const iso = formatISODate(r.date);
            if (!groups[iso]) {
                groups[iso] = {
                    date: r.date,
                    isoDate: iso,
                    dayName: getDayName(r.date),
                    records: []
                };
            }
            groups[iso].records.push(r);
        });

        // Convert to array sorted by date descending
        let arr = Object.values(groups).sort((a, b) => new Date(b.date) - new Date(a.date));

        // Filter by date if searchDate is applied
        if (searchDate) {
            arr = arr.filter(g => g.isoDate === searchDate);
        }

        // Filter by subject if selected
        if (selectedSubject !== 'ALL') {
            arr = arr.map(g => ({
                ...g,
                records: g.records.filter(r => (r.subject || '').toLowerCase() === selectedSubject.toLowerCase())
            })).filter(g => g.records.length > 0);
        }

        return arr;
    }, [records, searchDate, selectedSubject]);


    const getSubjectIcon = (subName = '') => {
        const lower = subName.toLowerCase();
        if (lower.includes('math')) return 'bi-calculator';
        if (lower.includes('comp') || /\bit\b|ict/.test(lower)) return 'bi-laptop';
        if (lower.includes('chem')) return 'bi-droplet-half';
        if (lower.includes('phy')) return 'bi-lightning-charge';
        if (lower.includes('bio')) return 'bi-flower1';
        if (lower.includes('sci')) return 'bi-lightbulb';
        if (lower.includes('eng')) return 'bi-translate';
        if (lower.includes('urdu') || lower.includes('isl')) return 'bi-book';
        if (lower.includes('his') || lower.includes('geo') || lower.includes('pst')) return 'bi-globe-americas';
        return 'bi-journal-check';
    };

    return (
        <Layout>
            <Container fluid className="py-4">
                {/* Header */}
                <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
                    <div className="d-flex align-items-center gap-3">
                        <Button
                            variant="light"
                            className="rounded-circle shadow-sm border p-0 d-flex align-items-center justify-content-center"
                            style={{ width: '42px', height: '42px' }}
                            onClick={() => navigate(-1)}
                        >
                            <i className="bi bi-arrow-left fs-5"></i>
                        </Button>
                        <div>
                            <h2 className="fw-bold mb-0 text-dark">Subject-Wise Attendance History</h2>
                            <p className="text-muted small mb-0 d-flex flex-wrap align-items-center gap-2">
                                <span>{role === 'parent' ? `Daily subject attendance for ${studentName}` : `Daily attendance for ${studentName}`}</span>
                                {studentClass && (
                                    <span className="badge rounded-pill fw-semibold px-3 py-1" style={{ background: '#F3ECEA', color: '#7A5358' }}>
                                        <i className="bi bi-mortarboard me-1"></i>Class {studentClass}
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>

                    {/* Quick navigation pill tabs */}
                    <Nav variant="pills" className="bg-light p-1 rounded-pill shadow-sm results-term-tabs">
                        <Nav.Item>
                            <Nav.Link
                                active={viewMode === 'daily'}
                                onClick={() => setViewMode('daily')}
                                className="rounded-pill px-3 py-1 small fw-bold"
                            >
                                <i className="bi bi-calendar3 me-1"></i>Daily Schedule View
                            </Nav.Link>
                        </Nav.Item>
                        <Nav.Item>
                            <Nav.Link
                                active={viewMode === 'subjects'}
                                onClick={() => setViewMode('subjects')}
                                className="rounded-pill px-3 py-1 small fw-bold"
                            >
                                <i className="bi bi-pie-chart me-1"></i>Subject Analytics
                            </Nav.Link>
                        </Nav.Item>
                        <Nav.Item>
                            <Nav.Link
                                active={viewMode === 'table'}
                                onClick={() => setViewMode('table')}
                                className="rounded-pill px-3 py-1 small fw-bold"
                            >
                                <i className="bi bi-table me-1"></i>Full Table
                            </Nav.Link>
                        </Nav.Item>
                    </Nav>
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
                            <p className="text-muted small mb-0">Attendance has not been recorded yet. Please check back after scheduled classes.</p>
                        </Card.Body>
                    </Card>
                ) : (
                    <>
                        {/* Summary Metrics */}
                        <Row className="mb-4 g-3">
                            <Col xs={6} md={3}>
                                <Card className="border-0 shadow-sm rounded-4 p-3 text-center bg-primary bg-opacity-10 border-start border-4 border-primary">
                                    <div className="small fw-bold text-primary text-uppercase mb-1">Total Classes Marked</div>
                                    <h3 className="fw-bold mb-0 text-primary">{stats.total}</h3>
                                </Card>
                            </Col>
                            <Col xs={6} md={3}>
                                <Card className="border-0 shadow-sm rounded-4 p-3 text-center bg-success bg-opacity-10 border-start border-4 border-success">
                                    <div className="small fw-bold text-success text-uppercase mb-1">Periods Attended</div>
                                    <h3 className="fw-bold mb-0 text-success">{stats.present}</h3>
                                </Card>
                            </Col>
                            <Col xs={6} md={3}>
                                <Card className="border-0 shadow-sm rounded-4 p-3 text-center bg-danger bg-opacity-10 border-start border-4 border-danger">
                                    <div className="small fw-bold text-danger text-uppercase mb-1">Periods Absent</div>
                                    <h3 className="fw-bold mb-0 text-danger">{stats.absent}</h3>
                                </Card>
                            </Col>
                            <Col xs={6} md={3}>
                                <Card className={`border-0 shadow-sm rounded-4 p-3 text-center ${stats.pct >= 75 ? 'bg-info' : 'bg-warning'} bg-opacity-10 border-start border-4 ${stats.pct >= 75 ? 'border-info' : 'border-warning'}`}>
                                    <div className="small fw-bold text-dark text-uppercase mb-1">Overall Attendance</div>
                                    <h3 className={`fw-bold mb-0 ${stats.pct >= 75 ? 'text-info' : 'text-warning'}`}>
                                        {stats.pct !== null ? `${stats.pct}%` : 'N/A'}
                                    </h3>
                                </Card>
                            </Col>
                        </Row>

                        {/* Filters Bar */}
                        <Card className="border-0 shadow-sm rounded-4 mb-4">
                            <Card.Body className="p-3 d-flex flex-wrap align-items-center justify-content-between gap-3">
                                <div className="d-flex flex-wrap align-items-center gap-2">
                                    <span className="small fw-bold text-secondary text-uppercase me-1">Filter Subject:</span>
                                    <Button
                                        variant={selectedSubject === 'ALL' ? 'primary' : 'light'}
                                        size="sm"
                                        className="rounded-pill px-3 fw-bold"
                                        onClick={() => setSelectedSubject('ALL')}
                                    >
                                        All Subjects
                                    </Button>
                                    {uniqueSubjects.map(sub => (
                                        <Button
                                            key={sub}
                                            variant={selectedSubject.toLowerCase() === sub.toLowerCase() ? 'primary' : 'light'}
                                            size="sm"
                                            className="rounded-pill px-3 fw-semibold"
                                            onClick={() => setSelectedSubject(sub)}
                                        >
                                            <i className={`bi ${getSubjectIcon(sub)} me-1`}></i>{sub}
                                        </Button>
                                    ))}
                                </div>

                                <div className="d-flex align-items-center gap-2">
                                    <Form.Control
                                        type="date"
                                        size="sm"
                                        className="rounded-pill px-3"
                                        value={searchDate}
                                        onChange={(e) => setSearchDate(e.target.value)}
                                        placeholder="Filter by date"
                                        style={{ width: '180px' }}
                                    />
                                    {searchDate && (
                                        <Button variant="outline-secondary" size="sm" className="rounded-circle p-1" onClick={() => setSearchDate('')}>
                                            <i className="bi bi-x"></i>
                                        </Button>
                                    )}
                                </div>
                            </Card.Body>
                        </Card>

                        {/* MODE 1: DAILY ALL-SUBJECTS TIMELINE VIEW */}
                        {viewMode === 'daily' && (
                            <div className="d-flex flex-column gap-3">
                                {dailyGroups.length === 0 ? (
                                    <Card className="border-0 shadow-sm rounded-4 text-center py-5 text-muted">
                                        <Card.Body>
                                            <i className="bi bi-search fs-1 d-block mb-2 text-muted opacity-50"></i>
                                            <h6 className="fw-bold">No attendance records match the selected filter.</h6>
                                            <p className="small mb-0">Try clearing the date or subject filter.</p>
                                        </Card.Body>
                                    </Card>
                                ) : (
                                    dailyGroups.map(group => {
                                        const totalPeriods = group.records.length;
                                        const presentPeriods = group.records.filter(r => r.status === 'Present').length;
                                        const dayPercentage = totalPeriods > 0 ? Math.round((presentPeriods / totalPeriods) * 100) : 0;
                                        const isAllPresent = presentPeriods === totalPeriods;
                                        const isAllAbsent = presentPeriods === 0;

                                        return (
                                            <Card key={group.isoDate} className="border-0 shadow-sm rounded-4 overflow-hidden">
                                                <Card.Header className="bg-white border-bottom p-3 px-4 d-flex flex-wrap align-items-center justify-content-between gap-2">
                                                    <div className="d-flex align-items-center gap-2">
                                                        <div className="bg-primary bg-opacity-10 p-2 rounded-circle text-primary d-flex align-items-center justify-content-center" style={{ width: '38px', height: '38px' }}>
                                                            <i className="bi bi-calendar-event fs-5"></i>
                                                        </div>
                                                        <div>
                                                            <h5 className="fw-bold mb-0 text-dark">{formatDate(group.date)}</h5>
                                                            <span className="text-muted small">{group.dayName}</span>
                                                        </div>
                                                    </div>

                                                    <div className="d-flex align-items-center gap-2">
                                                        <span className="px-3 py-2 rounded-pill fw-bold small"
                                                            style={isAllPresent ? { background: '#E8F6EE', color: '#1E9E5A' } : isAllAbsent ? { background: '#FDEEEA', color: '#C4472B' } : { background: '#FDF4E3', color: '#B7791F' }}>
                                                            <i className={`bi ${isAllPresent ? 'bi-check-circle-fill' : isAllAbsent ? 'bi-x-circle-fill' : 'bi-exclamation-circle-fill'} me-1`}></i>
                                                            {isAllPresent ? 'Full Day Present' : isAllAbsent ? 'Absent All Day' : 'Partial Attendance'}
                                                        </span>
                                                        <Badge bg="light" text="dark" className="border px-3 py-2 rounded-pill fw-semibold">
                                                            {presentPeriods} / {totalPeriods} Subjects Attended ({dayPercentage}%)
                                                        </Badge>
                                                    </div>
                                                </Card.Header>

                                                <Card.Body className="p-4 bg-light bg-opacity-25">
                                                    <Row className="g-3">
                                                        {group.records.map((rec, idx) => {
                                                            const isPresent = rec.status === 'Present';
                                                            return (
                                                                <Col key={idx} xs={12} sm={6} xl={4}>
                                                                    <div className="h-100 p-3 rounded-4 bg-white shadow-sm d-flex flex-column"
                                                                        style={{ border: `1px solid ${isPresent ? '#BFE5CE' : '#F2C4B8'}`, borderLeft: `4px solid ${isPresent ? '#1E9E5A' : '#C4472B'}` }}>
                                                                        {/* Row 1: icon + status */}
                                                                        <div className="d-flex align-items-center justify-content-between gap-2 mb-2">
                                                                            <div className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
                                                                                style={{ width: 40, height: 40, background: isPresent ? '#E8F6EE' : '#FDEEEA', color: isPresent ? '#1E9E5A' : '#C4472B' }}>
                                                                                <i className={`bi ${getSubjectIcon(rec.subject)} fs-5`}></i>
                                                                            </div>
                                                                            <span className="rounded-pill px-3 py-1 fw-semibold small text-nowrap"
                                                                                style={{ background: isPresent ? '#E8F6EE' : '#FDEEEA', color: isPresent ? '#1E9E5A' : '#C4472B' }}>
                                                                                <i className={`bi ${isPresent ? 'bi-check-circle-fill' : 'bi-x-circle-fill'} me-1`}></i>{rec.status}
                                                                            </span>
                                                                        </div>
                                                                        {/* Row 2: subject */}
                                                                        <div className="fw-bold text-dark" style={{ wordBreak: 'normal', overflowWrap: 'normal' }}>{rec.subject || 'Period'}</div>
                                                                        {/* Row 3: teacher (one line, truncated) */}
                                                                        {rec.markedBy && (
                                                                            <div className="small text-muted text-truncate mt-1" title={rec.markedBy}>
                                                                                <i className="bi bi-person-check me-1"></i>Marked by {rec.markedBy.split('@')[0]}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </Col>
                                                            );
                                                        })}
                                                    </Row>
                                                </Card.Body>
                                            </Card>
                                        );
                                    })
                                )}
                            </div>
                        )}

                        {/* MODE 2: SUBJECT-WISE ANALYTICS VIEW */}
                        {viewMode === 'subjects' && (
                            <Row className="g-3">
                                {subjectAnalytics.length === 0 && (
                                    <Col xs={12}>
                                        <Card className="border-0 shadow-sm rounded-4 text-center py-5 text-muted">
                                            <Card.Body>
                                                <i className="bi bi-search fs-1 d-block mb-2 opacity-50"></i>
                                                <h6 className="fw-bold">No attendance records match the selected filter.</h6>
                                                <p className="small mb-0">Try clearing the date or subject filter.</p>
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                )}
                                {subjectAnalytics.map(sub => {
                                    const tone = sub.pct >= 75
                                        ? { color: '#1E9E5A', bg: '#E8F6EE', label: 'Safe Standing', icon: 'bi-shield-check' }
                                        : sub.pct >= 50
                                            ? { color: '#B7791F', bg: '#FDF4E3', label: 'At Risk', icon: 'bi-exclamation-triangle' }
                                            : { color: '#C4472B', bg: '#FDEEEA', label: 'Low Attendance', icon: 'bi-exclamation-octagon' };
                                    return (
                                    <Col key={sub.subject} md={6} xl={4}>
                                        <Card className="border-0 shadow-sm rounded-4 h-100">
                                            <Card.Body className="p-4 d-flex flex-column">
                                                {/* Row 1: icon + status */}
                                                <div className="d-flex align-items-center justify-content-between gap-2 mb-3">
                                                    <div className="rounded-4 d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: 48, height: 48, background: '#F3ECEA', color: '#91696E' }}>
                                                        <i className={`bi ${getSubjectIcon(sub.subject)} fs-4`}></i>
                                                    </div>
                                                    <span className="rounded-pill px-3 py-1 fw-semibold text-nowrap small" style={{ background: tone.bg, color: tone.color }}>
                                                        <i className={`bi ${tone.icon} me-1`}></i>{tone.label}
                                                    </span>
                                                </div>

                                                {/* Row 2: subject name (full width, never broken mid-word) */}
                                                <h5 className="fw-bold text-dark mb-1 lh-sm" style={{ wordBreak: 'normal', overflowWrap: 'normal', hyphens: 'none' }}>{sub.subject}</h5>
                                                <div className="text-muted small mb-3">{sub.total} scheduled period{sub.total !== 1 ? 's' : ''}</div>

                                                {/* Row 3: percentage + bar */}
                                                <div className="d-flex align-items-baseline justify-content-between gap-2 mb-2">
                                                    <span className="fw-bold text-dark lh-1" style={{ fontSize: '2rem' }}>{sub.pct}%</span>
                                                    <span className="small text-muted text-nowrap">{sub.present} of {sub.total} attended</span>
                                                </div>
                                                <div className="rounded-pill mb-4" style={{ height: 8, background: '#EEE8E3' }}>
                                                    <div className="rounded-pill h-100" style={{ width: `${sub.pct}%`, background: tone.color, transition: 'width 0.6s ease' }}></div>
                                                </div>

                                                {/* Row 4: present / absent */}
                                                <div className="row g-2 mt-auto">
                                                    <div className="col-6">
                                                        <div className="rounded-3 px-3 py-2 h-100" style={{ background: '#F4FAF6' }}>
                                                            <div className="small text-muted text-nowrap"><i className="bi bi-check-circle-fill me-1" style={{ color: '#1E9E5A' }}></i>Present</div>
                                                            <div className="fw-bold text-dark fs-5 lh-sm">{sub.present}</div>
                                                        </div>
                                                    </div>
                                                    <div className="col-6">
                                                        <div className="rounded-3 px-3 py-2 h-100" style={{ background: '#FDF5F3' }}>
                                                            <div className="small text-muted text-nowrap"><i className="bi bi-x-circle-fill me-1" style={{ color: '#C4472B' }}></i>Absent</div>
                                                            <div className="fw-bold text-dark fs-5 lh-sm">{sub.absent}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                    );
                                })}
                            </Row>
                        )}

                        {/* MODE 3: FULL TABLE VIEW */}
                        {viewMode === 'table' && (
                            <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
                                <Card.Body className="p-0">
                                    <Table responsive hover className="mb-0 align-middle">
                                        <thead className="bg-light small text-uppercase">
                                            <tr>
                                                <th className="ps-4 py-3">Date</th>
                                                <th className="py-3">Day</th>
                                                <th className="py-3">Subject / Period</th>
                                                <th className="py-3">Marked By</th>
                                                <th className="py-3 text-end pe-4">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredRecords.length === 0 && (
                                                <tr><td colSpan="5" className="text-center text-muted py-5">No attendance records match the selected filter.</td></tr>
                                            )}
                                            {filteredRecords.map((row, i) => (
                                                <tr key={i}>
                                                    <td className="ps-4 py-3 fw-bold">{formatDate(row.date)}</td>
                                                    <td className="py-3 text-muted">{getDayName(row.date)}</td>
                                                    <td className="py-3 fw-bold text-dark">
                                                        <i className={`bi ${getSubjectIcon(row.subject)} text-primary me-2`}></i>
                                                        {row.subject || 'General Period'}
                                                    </td>
                                                    <td className="py-3 text-muted small">{row.markedBy || 'Teacher'}</td>
                                                    <td className="py-3 text-end pe-4">
                                                        <Badge
                                                            bg={row.status === 'Present' ? 'success' : 'danger'}
                                                            className="px-3 py-2 rounded-pill fw-normal"
                                                        >
                                                            <i className={`bi ${row.status === 'Present' ? 'bi-check-circle' : 'bi-x-circle'} me-1`}></i>
                                                            {row.status}
                                                        </Badge>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                </Card.Body>
                            </Card>
                        )}
                    </>
                )}
            </Container>
        </Layout>
    );
};

export default AttendanceHistory;

