import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Badge, Table, Spinner, Nav } from 'react-bootstrap';
import { Navigate, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';

// Same thresholds as result publishing on the server.
const gradeFor = (pct) => {
    const label = pct >= 80 ? 'A+' : pct >= 70 ? 'A' : pct >= 60 ? 'B' : pct >= 50 ? 'C' : pct >= 40 ? 'D' : 'F';
    const tone = pct >= 70 ? { color: '#1E7A4A', bg: '#E4F4EA' } : pct >= 50 ? { color: '#8A5A00', bg: '#FBF0DA' } : { color: '#B4381C', bg: '#FDEEEA' };
    return { label, ...tone };
};

const SUBJECT_ICONS = [
    [/math/, 'bi-calculator'], [/phys/, 'bi-lightning-charge'], [/chem/, 'bi-droplet-half'],
    [/bio/, 'bi-flower1'], [/computer|ict|it\b/, 'bi-laptop'], [/english/, 'bi-translate'],
    [/urdu/, 'bi-book'], [/islam/, 'bi-moon-stars'], [/pak|social|history/, 'bi-bank'],
    [/geo/, 'bi-globe-americas'], [/science/, 'bi-lightbulb'], [/art|draw/, 'bi-palette']
];
const subjectIcon = (name) => (SUBJECT_ICONS.find(([re]) => re.test(String(name).toLowerCase())) || [null, 'bi-journal-text'])[1];

const Results = () => {
    const navigate = useNavigate();
    const role = localStorage.getItem('userRole')?.toLowerCase();
    const sid = localStorage.getItem('studentId');
    const selectedChild = localStorage.getItem('selectedChildId');
    const studentId = (role === 'parent' && selectedChild) ? selectedChild : sid;

    const cNo = localStorage.getItem('classNo');
    const selectedChildClass = localStorage.getItem('selectedChildClass');
    const classNo = (role === 'parent' && selectedChildClass) ? selectedChildClass : cNo;
    
    const studentName = (() => {
        if (role === 'parent') {
            try {
                const kids = JSON.parse(localStorage.getItem('parentChildren') || '[]');
                const kid = kids.find(k => k.id === selectedChild);
                if (kid?.name) return kid.name;
            } catch { /* fall through */ }
        }
        return localStorage.getItem('userName');
    })();

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
                        <Nav variant="pills" className="nav-fill bg-light p-2 results-term-tabs" activeKey={activeTerm} onSelect={(k) => setActiveTerm(k)}>
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
                ) : result ? (() => {
                    const overallPct = result.maxTotal > 0 ? Math.round((result.grandTotal / result.maxTotal) * 1000) / 10 : 0;
                    const subjects = result.subjects.map(s => ({
                        ...s,
                        pct: s.totalMarks > 0 ? Math.round((s.score / s.totalMarks) * 1000) / 10 : 0
                    }));
                    const ranked = [...subjects].sort((a, b) => b.pct - a.pct);
                    const best = ranked[0];
                    const lowest = ranked[ranked.length - 1];
                    const passed = result.status === 'Passed';
                    const ringR = 62;
                    const ringC = 2 * Math.PI * ringR;

                    return (
                        <Row className="g-4">
                            <Col lg={4}>
                                <Card className="border-0 shadow-sm rounded-4 h-100 text-white overflow-hidden position-relative" style={{ background: 'linear-gradient(160deg, #7A5358 0%, #91696E 55%, #A98286 100%)' }}>
                                    <i className="bi bi-award-fill position-absolute" style={{ fontSize: '9rem', top: -20, right: -18, opacity: 0.12 }}></i>
                                    <Card.Body className="p-4 p-xl-5 position-relative d-flex flex-column text-center">
                                        <div className="small text-uppercase fw-semibold text-white-50 mb-3" style={{ letterSpacing: '1.5px' }}>{result.examType} Result</div>

                                        {/* Percentage ring with the grade in the middle */}
                                        <div className="mx-auto mb-3" style={{ width: 150, height: 150 }}>
                                            <svg width="150" height="150" viewBox="0 0 150 150" role="img" aria-label={`Grade ${result.grade.label}, ${overallPct}%`}>
                                                <circle cx="75" cy="75" r={ringR} fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.22)" strokeWidth="11" />
                                                <circle cx="75" cy="75" r={ringR} fill="none" stroke="#FFFFFF" strokeWidth="11" strokeLinecap="round"
                                                    strokeDasharray={`${(overallPct / 100) * ringC} ${ringC}`} transform="rotate(-90 75 75)"
                                                    style={{ transition: 'stroke-dasharray 0.9s ease' }} />
                                                <text x="75" y="72" textAnchor="middle" dominantBaseline="middle" fill="#FFFFFF" style={{ font: '700 44px Fraunces, Georgia, serif' }}>{result.grade.label}</text>
                                                <text x="75" y="104" textAnchor="middle" fill="rgba(255,255,255,0.85)" style={{ font: '600 14px Inter, sans-serif' }}>{overallPct}%</text>
                                            </svg>
                                        </div>

                                        <h4 className="fw-bold mb-2" style={{ fontFamily: 'Fraunces, Georgia, serif' }}>Final Outcome</h4>
                                        <div className="mb-4">
                                            <span className="d-inline-flex align-items-center gap-2 rounded-pill px-4 py-2 fw-bold shadow-sm"
                                                style={{ background: '#FFFFFF', color: passed ? '#1E9E5A' : '#C4472B' }}>
                                                <i className={`bi ${passed ? 'bi-patch-check-fill' : 'bi-x-octagon-fill'}`}></i>{result.status}
                                            </span>
                                        </div>

                                        <Row className="g-2 mt-auto text-start">
                                            {[
                                                ['Total Marks', `${result.grandTotal} / ${result.maxTotal}`, 'bi-123'],
                                                ['Percentage', `${overallPct}%`, 'bi-percent'],
                                                ['Top Subject', best ? `${best.name} (${best.pct}%)` : '—', 'bi-trophy', true]
                                            ].map(([label, value, icon, wide]) => (
                                                <Col xs={wide ? 12 : 6} key={label}>
                                                    <div className="rounded-3 p-2 px-3 h-100" style={{ background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.18)' }}>
                                                        <div className="small text-white-50"><i className={`bi ${icon} me-1`}></i>{label}</div>
                                                        <div className="fw-bold text-truncate" style={{ fontSize: '1.15rem', whiteSpace: 'nowrap' }} title={String(value)}>{value}</div>
                                                    </div>
                                                </Col>
                                            ))}
                                        </Row>

                                        {role === 'parent' && (
                                            <Button variant="light" className="rounded-pill fw-bold mt-4" style={{ color: '#7A5358' }} onClick={() => navigate('/progress-report')}>
                                                <i className="bi bi-clipboard-data me-2"></i>View Full Progress Report
                                            </Button>
                                        )}
                                    </Card.Body>
                                </Card>
                            </Col>

                            <Col lg={8}>
                                {/* Quick summary */}
                                {subjects.length > 1 && (
                                    <Row className="g-3 mb-3">
                                        {[
                                            ['Highest', best, 'bi-arrow-up-circle-fill', '#1E9E5A'],
                                            ['Lowest', lowest, 'bi-arrow-down-circle-fill', '#C4472B'],
                                            ['Average', { name: 'All subjects', pct: Math.round(subjects.reduce((s, x) => s + x.pct, 0) / subjects.length * 10) / 10 }, 'bi-bar-chart-fill', '#91696E']
                                        ].map(([label, s, icon, color]) => (
                                            <Col sm={4} key={label}>
                                                <Card className="border-0 shadow-sm rounded-4 h-100">
                                                    <Card.Body className="p-3 d-flex align-items-center gap-3">
                                                        <i className={`bi ${icon} fs-3`} style={{ color }}></i>
                                                        <div className="min-w-0">
                                                            <div className="small text-muted">{label}</div>
                                                            <div className="fw-bold text-dark">{s.pct}%</div>
                                                            <div className="small text-muted text-truncate">{s.name}</div>
                                                        </div>
                                                    </Card.Body>
                                                </Card>
                                            </Col>
                                        ))}
                                    </Row>
                                )}

                                <Card className="border-0 shadow-sm rounded-4">
                                    <Card.Body className="p-2 p-md-3">
                                        {subjects.map((subject, idx) => {
                                            const g = gradeFor(subject.pct);
                                            return (
                                                <div key={idx} className={`d-flex align-items-center gap-3 p-3 rounded-4 result-subject-row ${idx < subjects.length - 1 ? 'border-bottom' : ''}`}>
                                                    <div className="rounded-4 d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: 52, height: 52, background: '#F3ECEA', color: '#91696E' }}>
                                                        <i className={`bi ${subjectIcon(subject.name)} fs-4`}></i>
                                                    </div>
                                                    <div className="flex-grow-1 min-w-0">
                                                        <div className="d-flex align-items-center gap-2 mb-2">
                                                            <h6 className="fw-bold mb-0 text-dark text-truncate" style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: '1.1rem' }}>{subject.name}</h6>
                                                            <span className="badge rounded-pill fw-bold" style={{ background: g.bg, color: g.color }}>{g.label}</span>
                                                            {best && best.name === subject.name && subjects.length > 1 && <i className="bi bi-trophy-fill text-warning" title="Top subject"></i>}
                                                        </div>
                                                        <div className="rounded-pill" style={{ height: 8, background: '#EEE8E3' }} title={`${subject.name}: ${subject.pct}%`}>
                                                            <div className="rounded-pill h-100" style={{ width: `${subject.pct}%`, background: '#91696E', transition: 'width 0.8s ease' }}></div>
                                                        </div>
                                                    </div>
                                                    <div className="text-end flex-shrink-0" style={{ minWidth: 86 }}>
                                                        <div className="fw-bold text-dark lh-1" style={{ fontSize: '1.6rem' }}>{subject.score}<span className="text-muted fw-normal" style={{ fontSize: '0.95rem' }}> / {subject.totalMarks}</span></div>
                                                        <div className="small text-muted mt-1">{subject.pct}%</div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </Card.Body>
                                </Card>

                                <div className="mt-3 px-4 py-3 rounded-4 d-flex align-items-center gap-3" style={{ background: '#F6F0EE' }}>
                                    <i className="bi bi-shield-check fs-4" style={{ color: '#91696E' }}></i>
                                    <p className="small text-muted mb-0">
                                        System-generated report card based on marks published by the class teacher for Grade {classNo}.
                                        {result.updatedAt && <> Last updated {new Date(result.updatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}.</>}
                                    </p>
                                </div>
                            </Col>
                        </Row>
                    );
                })() : (
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
