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
    const studentName = localStorage.getItem('userName') || 'Student';

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
        try {
            return new Date(dateStr).toISOString().split('T')[0];
        } catch {
            return String(dateStr).split('T')[0];
        }
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

    // Subject breakdown analytics
    const subjectAnalytics = useMemo(() => {
        const map = {};
        records.forEach(r => {
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
    }, [records]);

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
            arr = arr.filter(g => g.isoDate.includes(searchDate));
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

    // Filtered records for table view
    const filteredRecords = useMemo(() => {
        return records.filter(r => {
            const matchesSubject = selectedSubject === 'ALL' || (r.subject || '').toLowerCase() === selectedSubject.toLowerCase();
            const matchesDate = !searchDate || formatISODate(r.date).includes(searchDate);
            return matchesSubject && matchesDate;
        });
    }, [records, selectedSubject, searchDate]);

    const getSubjectIcon = (subName = '') => {
        const lower = subName.toLowerCase();
        if (lower.includes('math')) return 'bi-calculator';
        if (lower.includes('sci') || lower.includes('chem') || lower.includes('phy') || lower.includes('bio')) return 'bi-flask';
        if (lower.includes('eng')) return 'bi-translate';
        if (lower.includes('urdu') || lower.includes('isl')) return 'bi-book';
        if (lower.includes('comp') || lower.includes('it')) return 'bi-laptop';
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
                            <p className="text-muted small mb-0">
                                {role === 'parent' ? `Daily subject attendance breakdown for ${studentName}` : 'View your daily attendance across all scheduled subjects'}
                            </p>
                        </div>
                    </div>

                    {/* Quick navigation pill tabs */}
                    <Nav variant="pills" className="bg-light p-1 rounded-pill shadow-sm">
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
                                                        <Badge bg={isAllPresent ? 'success' : isAllAbsent ? 'danger' : 'warning'} className="px-3 py-2 rounded-pill fw-bold">
                                                            {isAllPresent ? 'Full Day Present' : isAllAbsent ? 'Absent All Day' : 'Partial Attendance'}
                                                        </Badge>
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
                                                                <Col key={idx} xs={12} sm={6} lg={4}>
                                                                    <div className={`p-3 rounded-4 bg-white border shadow-sm d-flex align-items-center justify-content-between ${isPresent ? 'border-success border-opacity-50' : 'border-danger border-opacity-50'}`}>
                                                                        <div className="d-flex align-items-center gap-3">
                                                                            <div className={`rounded-3 p-2 text-white d-flex align-items-center justify-content-center ${isPresent ? 'bg-success' : 'bg-danger'}`} style={{ width: '36px', height: '36px' }}>
                                                                                <i className={`bi ${getSubjectIcon(rec.subject)}`}></i>
                                                                            </div>
                                                                            <div>
                                                                                <div className="fw-bold text-dark">{rec.subject || 'Period'}</div>
                                                                                {rec.markedBy && (
                                                                                    <div className="small text-muted" style={{ fontSize: '0.75rem' }}>
                                                                                        <i className="bi bi-person-check me-1"></i>{rec.markedBy.split('@')[0]}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>

                                                                        <Badge
                                                                            bg={isPresent ? 'success' : 'danger'}
                                                                            className="px-3 py-2 rounded-pill fw-semibold"
                                                                        >
                                                                            <i className={`bi ${isPresent ? 'bi-check-circle-fill' : 'bi-x-circle-fill'} me-1`}></i>
                                                                            {rec.status}
                                                                        </Badge>
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
                                {subjectAnalytics.map(sub => (
                                    <Col key={sub.subject} md={6} lg={4}>
                                        <Card className="border-0 shadow-sm rounded-4 h-100">
                                            <Card.Body className="p-4">
                                                <div className="d-flex align-items-center justify-content-between mb-3">
                                                    <div className="d-flex align-items-center gap-3">
                                                        <div className="bg-primary bg-opacity-10 p-3 rounded-4 text-primary">
                                                            <i className={`bi ${getSubjectIcon(sub.subject)} fs-4`}></i>
                                                        </div>
                                                        <div>
                                                            <h5 className="fw-bold text-dark mb-0">{sub.subject}</h5>
                                                            <span className="text-muted small">{sub.total} Scheduled Period{sub.total !== 1 ? 's' : ''}</span>
                                                        </div>
                                                    </div>
                                                    <h3 className={`fw-bold mb-0 ${sub.pct >= 75 ? 'text-success' : 'text-danger'}`}>
                                                        {sub.pct}%
                                                    </h3>
                                                </div>

                                                <ProgressBar
                                                    now={sub.pct}
                                                    variant={sub.pct >= 75 ? 'success' : sub.pct >= 50 ? 'warning' : 'danger'}
                                                    className="rounded-pill mb-3"
                                                    style={{ height: '8px' }}
                                                />

                                                <div className="d-flex justify-content-between small text-muted pt-2 border-top">
                                                    <span><i className="bi bi-check-circle text-success me-1"></i>Present: <strong>{sub.present}</strong></span>
                                                    <span><i className="bi bi-x-circle text-danger me-1"></i>Absent: <strong>{sub.absent}</strong></span>
                                                    <Badge bg={sub.pct >= 75 ? 'success' : 'danger'} className="rounded-pill px-2 py-1">
                                                        {sub.pct >= 75 ? 'Safe Standing' : 'Low Attendance'}
                                                    </Badge>
                                                </div>
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                ))}
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

