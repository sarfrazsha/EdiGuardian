import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Badge, Table, Spinner, Alert } from 'react-bootstrap';
import { Navigate, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Axios from 'axios';

// Auto-generated progress report for the selected child: combines published
// results, attendance, homework and fees (incl. fines) from the backend.

const BRAND = '#91696E';
const TRACK = '#EEE8E3';
// Status colours always travel with an icon + label (never colour alone).
const STATUS = {
    good: { color: '#1E9E5A', bg: '#E8F6EE', icon: 'bi-check-circle-fill', label: 'On track' },
    watch: { color: '#B7791F', bg: '#FDF4E3', icon: 'bi-exclamation-circle-fill', label: 'Keep an eye on' },
    low: { color: '#C4472B', bg: '#FDEEEA', icon: 'bi-x-circle-fill', label: 'Needs attention' }
};
const statusOf = (v) => (v === null || v === undefined ? null : v >= 75 ? STATUS.good : v >= 50 ? STATUS.watch : STATUS.low);

const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='90' height='90' viewBox='0 0 90 90'%3E%3Ccircle cx='45' cy='45' r='45' fill='%23E9E1DC'/%3E%3Ccircle cx='45' cy='34' r='17' fill='%23B9A5A7'/%3E%3Cellipse cx='45' cy='80' rx='28' ry='22' fill='%23B9A5A7'/%3E%3C/svg%3E";

// Circular gauge for a single 0-100 value.
const ScoreRing = ({ value, size = 150, stroke = 12, label }) => {
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const v = Math.max(0, Math.min(100, value || 0));
    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${label}: ${value}%`}>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth={stroke} />
            <circle
                cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#FFFFFF" strokeWidth={stroke} strokeLinecap="round"
                strokeDasharray={`${(v / 100) * c} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`}
                style={{ transition: 'stroke-dasharray 0.8s ease' }}
            />
            <text x="50%" y="48%" textAnchor="middle" dominantBaseline="middle" fill="#FFFFFF" style={{ font: `700 ${size * 0.26}px Fraunces, Georgia, serif` }}>
                {value ?? '—'}
            </text>
            <text x="50%" y="68%" textAnchor="middle" fill="rgba(255,255,255,0.8)" style={{ font: `600 ${size * 0.085}px Inter, sans-serif`, letterSpacing: '1px' }}>
                {label}
            </text>
        </svg>
    );
};

// Thin horizontal meter; value text stays in text colour.
const Meter = ({ value, color = BRAND, height = 8, title }) => (
    <div className="rounded-pill" style={{ height, background: TRACK }} title={title}>
        <div className="rounded-pill h-100" style={{ width: `${Math.max(0, Math.min(100, value || 0))}%`, background: color, transition: 'width 0.8s ease' }}></div>
    </div>
);

const StatusPill = ({ value }) => {
    const s = statusOf(value);
    if (!s) return null;
    return (
        <span className="d-inline-flex align-items-center gap-1 rounded-pill px-2 py-1 fw-semibold" style={{ background: s.bg, color: s.color, fontSize: '0.72rem' }}>
            <i className={`bi ${s.icon}`}></i>{s.label}
        </span>
    );
};

const SectionTitle = ({ icon, title, subtitle }) => (
    <div className="d-flex align-items-center gap-3 mb-3">
        <div className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: 40, height: 40, background: '#F3ECEA', color: BRAND }}>
            <i className={`bi ${icon} fs-5`}></i>
        </div>
        <div>
            <h5 className="fw-bold mb-0 text-dark">{title}</h5>
            {subtitle && <div className="small text-muted">{subtitle}</div>}
        </div>
    </div>
);

const EmptyNote = ({ children }) => (
    <div className="text-center text-muted small py-4 bg-light rounded-3"><i className="bi bi-inbox me-2"></i>{children}</div>
);

const ProgressReport = () => {
    const navigate = useNavigate();
    const role = localStorage.getItem('userRole')?.toLowerCase();
    const email = localStorage.getItem('userEmail');
    const studentId = role === 'parent' ? localStorage.getItem('selectedChildId') : localStorage.getItem('studentId');

    if (!email || (role !== 'parent' && role !== 'student')) {
        return <Navigate to="/" replace />;
    }

    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchReport = async () => {
        if (!studentId) {
            setError('No student selected.');
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const res = await Axios.get(`/api/reports/student/${studentId}`, { params: { role, email } });
            setReport(res.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Could not generate the report. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchReport(); }, [studentId]);

    const r = report;

    return (
        <Layout>
            <Container fluid className="py-4 progress-report">
                <div className="mb-4 d-flex justify-content-between align-items-center flex-wrap gap-3 no-print">
                    <div className="d-flex align-items-center gap-3">
                        <Button variant="light" className="rounded-circle shadow-sm border p-2 d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }} onClick={() => navigate(-1)}>
                            <i className="bi bi-arrow-left fs-5"></i>
                        </Button>
                        <div>
                            <h2 className="fw-bold text-dark mb-0">Progress Report</h2>
                            <p className="text-muted mb-0">Generated automatically from results, attendance, homework and fees.</p>
                        </div>
                    </div>
                    <div className="d-flex gap-2">
                        <Button variant="outline-secondary" className="rounded-pill px-3" onClick={fetchReport} disabled={loading}>
                            <i className="bi bi-arrow-clockwise me-2"></i>Refresh
                        </Button>
                        <Button variant="primary" className="rounded-pill px-4 fw-bold" onClick={() => window.print()} disabled={!r}>
                            <i className="bi bi-printer me-2"></i>Print / Save PDF
                        </Button>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-5">
                        <Spinner animation="border" variant="primary" />
                        <p className="mt-3 text-muted">Generating the latest report...</p>
                    </div>
                ) : error ? (
                    <Alert variant="danger" className="rounded-4">{error}</Alert>
                ) : r && (
                    <>
                        {/* ---------- Hero ---------- */}
                        <Card className="border-0 shadow-sm rounded-4 overflow-hidden mb-4 report-hero">
                            <Card.Body className="p-4 p-lg-5 text-white" style={{ background: `linear-gradient(135deg, #7A5358 0%, ${BRAND} 55%, #B08A8E 100%)` }}>
                                <Row className="g-4 align-items-center">
                                    <Col lg={5} className="d-flex align-items-center gap-3">
                                        <img
                                            src={r.student.image || DEFAULT_AVATAR}
                                            onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR; }}
                                            alt=""
                                            className="rounded-circle border border-3 border-white shadow"
                                            style={{ width: 88, height: 88, objectFit: 'cover' }}
                                        />
                                        <div>
                                            <div className="small text-white-50 text-uppercase fw-semibold" style={{ letterSpacing: '1px' }}>Student Progress Report</div>
                                            <h3 className="fw-bold mb-1" style={{ fontFamily: 'Fraunces, Georgia, serif' }}>{r.student.name}</h3>
                                            <div className="small">
                                                <span className="me-3"><i className="bi bi-mortarboard me-1"></i>Class {r.student.classNo}</span>
                                                {r.student.rollNo && <span><i className="bi bi-person-badge me-1"></i>Roll {r.student.rollNo}</span>}
                                            </div>
                                            <div className="small text-white-50 mt-1">Generated {new Date(r.generatedAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</div>
                                        </div>
                                    </Col>
                                    <Col lg={3} className="text-center">
                                        <ScoreRing value={r.overall.score} label="OVERALL" />
                                        {r.overall.rating && (
                                            <div className="mt-2">
                                                <span className="badge rounded-pill bg-white px-3 py-2 fw-bold" style={{ color: BRAND }}>
                                                    <i className="bi bi-stars me-1"></i>{r.overall.rating}
                                                </span>
                                            </div>
                                        )}
                                    </Col>
                                    <Col lg={4}>
                                        <div className="small text-white-50 fw-semibold mb-2">How the overall score is made</div>
                                        {r.overall.components.length ? r.overall.components.map(c => (
                                            <div key={c.key} className="mb-2">
                                                <div className="d-flex justify-content-between small mb-1">
                                                    <span>{c.label} <span className="text-white-50">({c.weight}%)</span></span>
                                                    <span className="fw-bold">{c.score}%</span>
                                                </div>
                                                <div className="rounded-pill" style={{ height: 6, background: 'rgba(255,255,255,0.22)' }}>
                                                    <div className="rounded-pill h-100 bg-white" style={{ width: `${c.score}%` }}></div>
                                                </div>
                                            </div>
                                        )) : <div className="small text-white-50">Not enough activity recorded yet.</div>}
                                    </Col>
                                </Row>
                            </Card.Body>
                        </Card>

                        {/* ---------- Stat tiles ---------- */}
                        <Row className="g-3 mb-4">
                            {[
                                { icon: 'bi-award', label: 'Academic Average', value: r.academics.hasData ? `${r.academics.average}%` : '—', sub: r.academics.hasData ? `Grade ${r.academics.grade} · ${r.academics.exams.length} exam${r.academics.exams.length === 1 ? '' : 's'}` : 'No results yet', status: r.academics.hasData ? r.academics.average : null },
                                { icon: 'bi-calendar-check', label: 'Attendance', value: r.attendance.hasData ? `${r.attendance.percentage}%` : '—', sub: r.attendance.hasData ? `${r.attendance.present}/${r.attendance.total} classes attended` : 'No records yet', status: r.attendance.hasData ? r.attendance.percentage : null },
                                { icon: 'bi-journal-check', label: 'Homework', value: r.homework.hasData && r.homework.completionRate !== null ? `${r.homework.completionRate}%` : '—', sub: r.homework.hasData ? `${r.homework.submitted} submitted · ${r.homework.missed} missed` : 'No homework yet', status: r.homework.hasData ? r.homework.completionRate : null },
                                { icon: 'bi-wallet2', label: 'Fees & Fines', value: r.fees.hasData ? `Rs ${r.fees.outstandingAmount.toLocaleString()}` : '—', sub: r.fees.hasData ? `${r.fees.overdue ? `${r.fees.overdue} overdue · ` : ''}${r.fees.fines.count} fine${r.fees.fines.count === 1 ? '' : 's'} (Rs ${r.fees.fines.total.toLocaleString()})` : 'No vouchers yet', status: r.fees.hasData ? (r.fees.overdue ? 0 : r.fees.pending ? 60 : 100) : null, valueNote: 'outstanding' }
                            ].map(t => (
                                <Col sm={6} xl={3} key={t.label}>
                                    <Card className="border-0 shadow-sm rounded-4 h-100">
                                        <Card.Body className="p-3 p-xl-4">
                                            <div className="d-flex justify-content-between align-items-start mb-2">
                                                <div className="rounded-3 d-flex align-items-center justify-content-center" style={{ width: 40, height: 40, background: '#F3ECEA', color: BRAND }}>
                                                    <i className={`bi ${t.icon} fs-5`}></i>
                                                </div>
                                                <StatusPill value={t.status} />
                                            </div>
                                            <div className="small text-muted fw-semibold">{t.label}</div>
                                            <div className="fw-bold text-dark" style={{ fontSize: '1.7rem', lineHeight: 1.2 }}>
                                                {t.value}{t.valueNote && t.value !== '—' && <span className="small text-muted fw-normal ms-1" style={{ fontSize: '0.8rem' }}>{t.valueNote}</span>}
                                            </div>
                                            <div className="small text-muted">{t.sub}</div>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            ))}
                        </Row>

                        {/* ---------- Remarks ---------- */}
                        <Card className="border-0 shadow-sm rounded-4 mb-4">
                            <Card.Body className="p-4">
                                <SectionTitle icon="bi-chat-square-quote" title="Report Summary" subtitle="Written automatically from this student's records" />
                                {r.remarks.summary && <p className="mb-4 text-dark" style={{ lineHeight: 1.7 }}>{r.remarks.summary}</p>}
                                <Row className="g-3">
                                    {[
                                        { title: 'Strengths', items: r.remarks.strengths, icon: 'bi-hand-thumbs-up-fill', s: STATUS.good, empty: 'Strengths will appear as more activity is recorded.' },
                                        { title: 'Areas to Improve', items: r.remarks.improvements, icon: 'bi-flag-fill', s: STATUS.low, empty: 'Nothing flagged - great!' },
                                        { title: 'Recommendations', items: r.remarks.recommendations, icon: 'bi-lightbulb-fill', s: { color: BRAND, bg: '#F6F0EE' }, empty: '' }
                                    ].map(b => (
                                        <Col md={4} key={b.title}>
                                            <div className="h-100 rounded-4 p-3" style={{ background: b.s.bg }}>
                                                <div className="fw-bold mb-2" style={{ color: b.s.color }}><i className={`bi ${b.icon} me-2`}></i>{b.title}</div>
                                                {b.items.length ? (
                                                    <ul className="mb-0 ps-3 small text-dark" style={{ lineHeight: 1.6 }}>
                                                        {b.items.map((x, i) => <li key={i} className="mb-1">{x}</li>)}
                                                    </ul>
                                                ) : <div className="small text-muted">{b.empty}</div>}
                                            </div>
                                        </Col>
                                    ))}
                                </Row>
                            </Card.Body>
                        </Card>

                        <Row className="g-4 mb-4">
                            {/* ---------- Academics ---------- */}
                            <Col lg={7}>
                                <Card className="border-0 shadow-sm rounded-4 h-100">
                                    <Card.Body className="p-4">
                                        <SectionTitle icon="bi-graph-up-arrow" title="Academic Performance" subtitle="Published exam results" />
                                        {!r.academics.hasData ? <EmptyNote>No results have been published yet.</EmptyNote> : (
                                            <>
                                                {/* Latest exam highlight */}
                                                <div className="rounded-4 p-3 mb-4 d-flex align-items-center gap-3" style={{ background: '#F6F0EE' }}>
                                                    <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 fw-bold text-white"
                                                        style={{ width: 56, height: 56, background: BRAND, fontFamily: 'Fraunces, Georgia, serif', fontSize: '1.3rem' }}>
                                                        {r.academics.latest.grade}
                                                    </div>
                                                    <div className="flex-grow-1" style={{ minWidth: 0 }}>
                                                        <div className="small text-muted">Latest exam</div>
                                                        <div className="fw-bold text-dark">{r.academics.latest.examType}</div>
                                                        <div className="small text-muted">{r.academics.latest.grandTotal} / {r.academics.latest.maxTotal} marks</div>
                                                    </div>
                                                    <div className="text-end flex-shrink-0">
                                                        <div className="fw-bold text-dark lh-1" style={{ fontSize: '1.8rem' }}>{r.academics.latest.percentage}%</div>
                                                        {r.academics.trend !== null ? (
                                                            <div className="small fw-semibold mt-1" style={{ color: r.academics.trend >= 0 ? STATUS.good.color : STATUS.low.color }}>
                                                                <i className={`bi ${r.academics.trend >= 0 ? 'bi-arrow-up-right' : 'bi-arrow-down-right'} me-1`}></i>
                                                                {r.academics.trend >= 0 ? '+' : ''}{r.academics.trend}% vs {r.academics.previousExam}
                                                            </div>
                                                        ) : (
                                                            <div className="small text-muted mt-1">Only exam so far</div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* All exams, oldest to newest */}
                                                {r.academics.exams.length > 1 && (
                                                    <>
                                                        <div className="small fw-semibold text-muted mb-2">Exam history</div>
                                                        {r.academics.exams.map((e, i) => {
                                                            const isLatest = i === r.academics.exams.length - 1;
                                                            return (
                                                                <div key={i} className="d-flex align-items-center gap-3 mb-2 small" title={`${e.examType}: ${e.percentage}% (${e.grandTotal}/${e.maxTotal}, grade ${e.grade})`}>
                                                                    <span className={`text-truncate ${isLatest ? 'fw-bold text-dark' : 'text-muted'}`} style={{ width: 110 }}>{e.examType}</span>
                                                                    <div className="flex-grow-1"><Meter value={e.percentage} color={isLatest ? BRAND : '#C9B3B5'} /></div>
                                                                    <span className="text-end text-nowrap" style={{ width: 80 }}><strong className="text-dark">{e.percentage}%</strong> <span className="text-muted">· {e.grade}</span></span>
                                                                </div>
                                                            );
                                                        })}
                                                        <div className="mb-4"></div>
                                                    </>
                                                )}

                                                <div className="small fw-semibold text-muted mb-2">Subject averages</div>
                                                {r.academics.subjects.map(s => (
                                                    <div key={s.name} className="mb-3">
                                                        <div className="d-flex justify-content-between align-items-center small mb-1">
                                                            <span className="fw-semibold text-dark">
                                                                {s.name}
                                                                {r.academics.strongest?.name === s.name && <i className="bi bi-trophy-fill ms-2 text-warning" title="Strongest subject"></i>}
                                                            </span>
                                                            <span><span className="fw-bold text-dark">{s.average}%</span> <span className="text-muted">· {s.grade}</span></span>
                                                        </div>
                                                        <Meter value={s.average} title={`${s.name}: ${s.average}% average over ${s.exams} exam(s)`} />
                                                    </div>
                                                ))}
                                            </>
                                        )}
                                    </Card.Body>
                                </Card>
                            </Col>

                            {/* ---------- Attendance ---------- */}
                            <Col lg={5}>
                                <Card className="border-0 shadow-sm rounded-4 h-100">
                                    <Card.Body className="p-4">
                                        <SectionTitle icon="bi-calendar2-week" title="Attendance" subtitle="Class-by-class records" />
                                        {!r.attendance.hasData ? <EmptyNote>No attendance recorded yet.</EmptyNote> : (
                                            <>
                                                <Row className="g-2 mb-3 text-center">
                                                    {[
                                                        ['Present', r.attendance.present],
                                                        ['Absent', r.attendance.absent],
                                                        ['Days missed', r.attendance.absentDays]
                                                    ].map(([l, v]) => (
                                                        <Col xs={4} key={l}>
                                                            <div className="bg-light rounded-3 py-2">
                                                                <div className="fw-bold text-dark fs-5">{v}</div>
                                                                <div className="small text-muted">{l}</div>
                                                            </div>
                                                        </Col>
                                                    ))}
                                                </Row>
                                                <div className="d-flex justify-content-between small mb-1">
                                                    <span className="text-muted">Overall</span><span className="fw-bold text-dark">{r.attendance.percentage}%</span>
                                                </div>
                                                <Meter value={r.attendance.percentage} height={10} />
                                                {r.attendance.last30.total > 0 && (
                                                    <>
                                                        <div className="d-flex justify-content-between small mb-1 mt-3">
                                                            <span className="text-muted">Last 30 days</span><span className="fw-bold text-dark">{r.attendance.last30.percentage}%</span>
                                                        </div>
                                                        <Meter value={r.attendance.last30.percentage} height={10} />
                                                    </>
                                                )}

                                                <div className="small fw-semibold text-muted mt-4 mb-2">By subject</div>
                                                {r.attendance.bySubject.map(s => (
                                                    <div key={s.subject} className="d-flex align-items-center gap-2 mb-2 small" title={`${s.subject}: ${s.present}/${s.total} classes`}>
                                                        <span className="text-dark text-truncate" style={{ width: 110 }}>{s.subject}</span>
                                                        <div className="flex-grow-1"><Meter value={s.percentage} height={6} /></div>
                                                        <span className="fw-semibold text-dark text-end" style={{ width: 44 }}>{s.percentage}%</span>
                                                    </div>
                                                ))}

                                                {r.attendance.recentAbsences.length > 0 && (
                                                    <>
                                                        <div className="small fw-semibold text-muted mt-4 mb-2">Recent absences</div>
                                                        <div className="d-flex flex-wrap gap-2">
                                                            {r.attendance.recentAbsences.map((a, i) => (
                                                                <span key={i} className="badge rounded-pill fw-normal px-3 py-2" style={{ background: STATUS.low.bg, color: STATUS.low.color }}>
                                                                    <i className="bi bi-x-circle me-1"></i>{fmtDate(a.date)} · {a.subject}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </>
                                                )}
                                            </>
                                        )}
                                    </Card.Body>
                                </Card>
                            </Col>
                        </Row>

                        <Row className="g-4">
                            {/* ---------- Homework ---------- */}
                            <Col lg={7}>
                                <Card className="border-0 shadow-sm rounded-4 h-100">
                                    <Card.Body className="p-4">
                                        <SectionTitle icon="bi-journal-text" title="Homework" subtitle="Assignments given to the class" />
                                        {!r.homework.hasData ? <EmptyNote>No homework has been assigned yet.</EmptyNote> : (
                                            <>
                                                {/* Stacked composition bar with a legend (3 parts). */}
                                                <div className="d-flex rounded-pill overflow-hidden mb-2" style={{ height: 12, gap: 2, background: '#fff' }}>
                                                    {[
                                                        ['Submitted', r.homework.submitted, STATUS.good.color],
                                                        ['Missed', r.homework.missed, STATUS.low.color],
                                                        ['Upcoming', r.homework.upcoming, '#9AA3B5']
                                                    ].filter(([, n]) => n > 0).map(([l, n, c]) => (
                                                        <div key={l} style={{ width: `${(n / r.homework.assigned) * 100}%`, background: c }} title={`${l}: ${n}`}></div>
                                                    ))}
                                                </div>
                                                <div className="d-flex flex-wrap gap-3 small mb-4">
                                                    {[
                                                        ['Submitted', r.homework.submitted, STATUS.good.color, 'bi-check-circle-fill'],
                                                        ['Missed', r.homework.missed, STATUS.low.color, 'bi-x-circle-fill'],
                                                        ['Upcoming', r.homework.upcoming, '#9AA3B5', 'bi-clock-fill']
                                                    ].map(([l, n, c, ic]) => (
                                                        <span key={l} className="text-dark"><i className={`bi ${ic} me-1`} style={{ color: c }}></i>{l} <strong>{n}</strong></span>
                                                    ))}
                                                    <span className="text-muted ms-auto">{r.homework.assigned} assigned</span>
                                                </div>
                                                <div className="table-responsive">
                                                    <Table size="sm" className="align-middle small mb-0">
                                                        <thead className="text-muted"><tr><th>Assignment</th><th>Subject</th><th>Due</th><th className="text-end">Status</th></tr></thead>
                                                        <tbody>
                                                            {r.homework.recent.map((h, i) => {
                                                                const st = h.status === 'Submitted' ? STATUS.good : h.status === 'Missed' ? STATUS.low : { color: '#5B6478', bg: '#EEF0F4', icon: 'bi-clock-fill' };
                                                                return (
                                                                    <tr key={i}>
                                                                        <td className="fw-semibold text-dark">{h.title}</td>
                                                                        <td className="text-muted">{h.subject}</td>
                                                                        <td className="text-muted text-nowrap">{fmtDate(h.dueDate)}</td>
                                                                        <td className="text-end">
                                                                            <span className="badge rounded-pill fw-semibold" style={{ background: st.bg, color: st.color }}><i className={`bi ${st.icon} me-1`}></i>{h.status}</span>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </Table>
                                                </div>
                                            </>
                                        )}
                                    </Card.Body>
                                </Card>
                            </Col>

                            {/* ---------- Fees & fines ---------- */}
                            <Col lg={5}>
                                <Card className="border-0 shadow-sm rounded-4 h-100">
                                    <Card.Body className="p-4">
                                        <SectionTitle icon="bi-receipt" title="Fees & Fines" subtitle="Vouchers issued to date" />
                                        {!r.fees.hasData ? <EmptyNote>No fee vouchers issued yet.</EmptyNote> : (
                                            <>
                                                <Row className="g-2 mb-3 text-center">
                                                    {[
                                                        ['Paid', r.fees.paid],
                                                        ['In review', r.fees.underReview],
                                                        ['Unpaid', r.fees.pending],
                                                        ['Overdue', r.fees.overdue]
                                                    ].map(([l, v]) => (
                                                        <Col xs={3} key={l}>
                                                            <div className="bg-light rounded-3 py-2">
                                                                <div className={`fw-bold fs-5 ${l === 'Overdue' && v > 0 ? 'text-danger' : 'text-dark'}`}>{v}</div>
                                                                <div className="text-muted" style={{ fontSize: '0.72rem' }}>{l}</div>
                                                            </div>
                                                        </Col>
                                                    ))}
                                                </Row>
                                                <div className="d-flex justify-content-between small py-2 border-bottom">
                                                    <span className="text-muted">Outstanding amount</span><span className="fw-bold text-dark">Rs {r.fees.outstandingAmount.toLocaleString()}</span>
                                                </div>
                                                <div className="d-flex justify-content-between small py-2 border-bottom">
                                                    <span className="text-muted">Discounts received</span><span className="fw-bold" style={{ color: STATUS.good.color }}>Rs {r.fees.totalDiscount.toLocaleString()}</span>
                                                </div>
                                                <div className="d-flex justify-content-between small py-2 mb-3">
                                                    <span className="text-muted">Fines charged</span><span className="fw-bold text-danger">Rs {r.fees.fines.total.toLocaleString()}</span>
                                                </div>

                                                <div className="small fw-semibold text-muted mb-2">Fines</div>
                                                {r.fees.fines.items.length ? r.fees.fines.items.map((f, i) => (
                                                    <div key={i} className="d-flex justify-content-between align-items-center rounded-3 px-3 py-2 mb-2 small" style={{ background: STATUS.low.bg }}>
                                                        <div>
                                                            <div className="fw-semibold text-dark"><i className="bi bi-exclamation-triangle-fill me-2" style={{ color: STATUS.low.color }}></i>{f.reason}</div>
                                                            <div className="text-muted">{f.month} {f.year} · {f.status === 'Paid' ? 'Paid' : f.status === 'Review' ? 'In review' : 'Unpaid'}</div>
                                                        </div>
                                                        <span className="fw-bold text-dark">Rs {f.amount.toLocaleString()}</span>
                                                    </div>
                                                )) : (
                                                    <div className="small rounded-3 px-3 py-2" style={{ background: STATUS.good.bg, color: STATUS.good.color }}>
                                                        <i className="bi bi-check-circle-fill me-2"></i>No fines - well done!
                                                    </div>
                                                )}
                                                <Button variant="light" size="sm" className="rounded-pill w-100 mt-3 no-print fw-semibold" style={{ color: BRAND, border: `1px solid ${BRAND}` }} onClick={() => navigate('/my-fees')}>
                                                    <i className="bi bi-wallet2 me-2"></i>Go to My Fees
                                                </Button>
                                            </>
                                        )}
                                    </Card.Body>
                                </Card>
                            </Col>
                        </Row>

                        <p className="text-center text-muted small mt-4 mb-0">
                            <i className="bi bi-info-circle me-1"></i>
                            This report is generated automatically from records entered by teachers and the school office. Overall score weights: academics 50%, attendance 30%, homework 20%.
                        </p>
                    </>
                )}
            </Container>
        </Layout>
    );
};

export default ProgressReport;
