import React from 'react';
import { Container, Table, Card, Button, Badge } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';

const Schedule = () => {
    const navigate = useNavigate();

    const timetable = [
        { time: '08:00 - 08:45', mon: 'Mathematics', tue: 'English', wed: 'Mathematics', thu: 'Science', fri: 'English' },
        { time: '08:45 - 09:30', mon: 'English', tue: 'Mathematics', wed: 'Urdu', thu: 'Mathematics', fri: 'Mathematics' },
        { time: '09:30 - 10:15', mon: 'Urdu', tue: 'Islamiyat', wed: 'English', thu: 'English', fri: 'Science' },
        { time: '10:15 - 10:45', mon: 'Break', tue: 'Break', wed: 'Break', thu: 'Break', fri: 'Break' },
        { time: '10:45 - 11:30', mon: 'Science', tue: 'Science', wed: 'Social Studies', thu: 'Urdu', fri: 'Art' },
        { time: '11:30 - 12:15', mon: 'Art', tue: 'P.E.', wed: 'Library', thu: 'Islamiyat', fri: 'Dismissal' },
        { time: '12:15 - 01:00', mon: 'Islamiyat', tue: 'Urdu', wed: 'Art', thu: 'Social Studies', fri: '-' },
    ];

    const getSubjectClass = (subject) => {
        const s = subject?.toLowerCase() || '';
        if (s.includes('math')) return 'subject-math';
        if (s.includes('english')) return 'subject-english';
        if (s.includes('science')) return 'subject-science';
        if (s.includes('urdu')) return 'subject-urdu';
        if (s.includes('islami')) return 'subject-islami';
        if (s.includes('social')) return 'subject-social';
        if (s.includes('art')) return 'subject-art';
        if (s.includes('break')) return 'subject-break';
        if (s.includes('p.e.')) return 'subject-pe';
        if (s.includes('lib')) return 'subject-library';
        return 'subject-default';
    };

    return (
        <Layout>
            <Container fluid className="py-4">
                <div className="d-flex align-items-center gap-3 mb-4">
                    <Button 
                        variant="light" 
                        className="rounded-circle shadow-sm border p-0 d-flex align-items-center justify-content-center" 
                        style={{ width: '40px', height: '40px' }} 
                        onClick={() => navigate(-1)}
                    >
                        <i className="bi bi-arrow-left fs-5"></i>
                    </Button>
                    <div>
                        <h2 className="fw-bold mb-0 text-dark">Class Timetable</h2>
                        <p className="text-muted small mb-0">Grade 1-5 Primary Schedule</p>
                    </div>
                </div>

                <Card className="border-0 shadow-sm rounded-4 overflow-hidden mb-4">
                    <Card.Header className="bg-primary bg-opacity-10 border-0 py-3">
                        <h5 className="fw-bold text-primary mb-0">Weekly Subjects</h5>
                    </Card.Header>
                    <Card.Body className="p-0">
                        <Table responsive bordered className="mb-0 text-center align-middle">
                            <thead className="bg-light small text-uppercase">
                                <tr>
                                    <th className="py-3">Time</th>
                                    <th className="py-3">Monday</th>
                                    <th className="py-3">Tuesday</th>
                                    <th className="py-3">Wednesday</th>
                                    <th className="py-3">Thursday</th>
                                    <th className="py-3">Friday</th>
                                </tr>
                            </thead>
                            <tbody>
                                {timetable.map((row, index) => (
                                    <tr key={index}>
                                        <td className="fw-bold text-secondary py-3 small">{row.time}</td>
                                        <td>{row.mon !== '-' && <div className={`subject-badge ${getSubjectClass(row.mon)}`}>{row.mon}</div>}</td>
                                        <td>{row.tue !== '-' && <div className={`subject-badge ${getSubjectClass(row.tue)}`}>{row.tue}</div>}</td>
                                        <td>{row.wed !== '-' && <div className={`subject-badge ${getSubjectClass(row.wed)}`}>{row.wed}</div>}</td>
                                        <td>{row.thu !== '-' && <div className={`subject-badge ${getSubjectClass(row.thu)}`}>{row.thu}</div>}</td>
                                        <td>{row.fri !== '-' && <div className={`subject-badge ${getSubjectClass(row.fri)}`}>{row.fri}</div>}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </Card.Body>
                </Card>

                <div className="text-center">
                    <p className="text-muted small">
                        <i className="bi bi-info-circle me-1"></i>
                        Note: Friday is a half-day with dismissal at 12:15 PM.
                    </p>
                </div>
            </Container>

            <style>{`
                .table-responsive { border-radius: 12px; }
                .subject-badge {
                    padding: 8px 12px;
                    border-radius: 12px;
                    font-size: 0.85rem;
                    font-weight: 600;
                    letter-spacing: 0.3px;
                    display: inline-block;
                    min-width: 100px;
                    transition: all 0.2s ease;
                    border: 1px solid transparent;
                }
                .subject-badge:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
                }
                
                /* Soft-tone color palette */
                .subject-math { background-color: #eef2ff; color: #4338ca; border-color: #e0e7ff; }
                .subject-english { background-color: #ecfdf5; color: #047857; border-color: #d1fae5; }
                .subject-science { background-color: #f0f9ff; color: #0369a1; border-color: #e0f2fe; }
                .subject-urdu { background-color: #fffbeb; color: #b45309; border-color: #fef3c7; }
                .subject-islami { background-color: #f5f3ff; color: #7c3aed; border-color: #ede9fe; }
                .subject-social { background-color: #fff7ed; color: #c2410c; border-color: #ffedd5; }
                .subject-art { background-color: #fdf2f8; color: #be185d; border-color: #fce7f3; }
                .subject-pe { background-color: #f8fafc; color: #334155; border-color: #f1f5f9; }
                .subject-break { background-color: #fff1f2; color: #e11d48; border-color: #ffe4e6; font-weight: 700; }
                .subject-library { background-color: #f0fdfa; color: #0f766e; border-color: #ccfbf1; }
                .subject-default { background-color: #f9fafb; color: #6b7280; border-color: #f3f4f6; }
                
                .ls-1 { letter-spacing: 1px; }
            `}</style>
        </Layout>
    );
};

export default Schedule;
