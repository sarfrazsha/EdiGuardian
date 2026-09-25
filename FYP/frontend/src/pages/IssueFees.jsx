import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Spinner, Alert, Table, InputGroup, Badge, Modal } from 'react-bootstrap';
import { Navigate, useNavigate, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import Axios from 'axios';

const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

const FINE_REASONS = ['Late fee', 'Lost library book', 'Damage to school property', 'Uniform violation', 'Exam re-sit fee'];

const emptyForm = () => ({
    classNo: '',
    studentId: '', // '' = every student in the class
    month: '',
    year: new Date().getFullYear(),
    dueDay: 10,
    discountPercent: 0,
    fineAmount: '',
    fineReason: ''
});

const IssueFees = () => {
    const navigate = useNavigate();
    const role = localStorage.getItem('userRole');
    const email = localStorage.getItem('userEmail');

    if (!email || (role?.toLowerCase() !== 'admin')) {
        return <Navigate to="/" replace />;
    }

    const [rows, setRows] = useState([]); // one row per (parent, student)
    const [feeStructure, setFeeStructure] = useState([]); // [{ classNo, monthlyFee }]
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [result, setResult] = useState(null);
    const [formData, setFormData] = useState(emptyForm());
    // Per-student discount overrides: { [studentId]: percent }
    const [discounts, setDiscounts] = useState({});
    // Per-student fine overrides: { [studentId]: { amount, reason } }
    const [fines, setFines] = useState({});
    const [previewStudent, setPreviewStudent] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [parentsRes, feeRes] = await Promise.all([
                    Axios.get('/api/parents'),
                    Axios.get('/api/fee-structure')
                ]);
                setRows(parentsRes.data);
                setFeeStructure(feeRes.data);
            } catch (err) {
                console.error("Failed to load issue-fee data", err);
                setError("Failed to load classes and students.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const classesList = feeStructure.map(c => c.classNo);
    const baseFee = feeStructure.find(c => c.classNo === formData.classNo)?.monthlyFee || 0;

    const classStudents = rows
        .filter(r => r.classNo === formData.classNo)
        .sort((a, b) => a.studentName.localeCompare(b.studentName));

    const targetStudents = formData.studentId
        ? classStudents.filter(s => s.studentId === formData.studentId)
        : classStudents;

    const percentFor = (sid) => {
        const o = discounts[sid];
        return o !== undefined && o !== '' ? Number(o) : Number(formData.discountPercent) || 0;
    };
    const discountFor = (sid) => Math.round(baseFee * percentFor(sid) / 100);
    const hasFineOverride = (sid) => fines[sid]?.amount !== undefined && fines[sid]?.amount !== '';
    const fineFor = (sid) => Math.round(hasFineOverride(sid) ? Number(fines[sid].amount) || 0 : Number(formData.fineAmount) || 0);
    const fineReasonFor = (sid) => (hasFineOverride(sid) && fines[sid].reason?.trim()) || formData.fineReason.trim() || 'Fine';
    const netFor = (sid) => baseFee - discountFor(sid) + fineFor(sid);
    const grandTotal = targetStudents.reduce((sum, s) => sum + netFor(s.studentId), 0);
    const totalDiscount = targetStudents.reduce((sum, s) => sum + discountFor(s.studentId), 0);
    const totalFine = targetStudents.reduce((sum, s) => sum + fineFor(s.studentId), 0);
    const setFine = (sid, field, value) => setFines(prev => ({ ...prev, [sid]: { ...prev[sid], [field]: value } }));

    const dueDateLabel = formData.month
        ? new Date(Number(formData.year), MONTHS.indexOf(formData.month), Number(formData.dueDay) || 1)
            .toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        : '—';

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setResult(null);

        if (!baseFee) return setError(`No monthly fee is set for class ${formData.classNo}. Set it in Fee Structure first.`);
        if (!formData.month) return setError('Select the fee month.');
        if (!targetStudents.length) return setError('No students with a linked parent in this class.');

        const pct = Number(formData.discountPercent);
        if (pct < 0 || pct > 100) return setError('Discount must be between 0 and 100%.');
        const classFine = Number(formData.fineAmount) || 0;
        if (classFine < 0) return setError('Fine must be a positive amount.');
        if (classFine > 0 && !formData.fineReason.trim()) return setError('Please enter a reason for the fine.');

        // Only send overrides for students actually being billed.
        const overrides = {};
        targetStudents.forEach(s => {
            if (discounts[s.studentId] !== undefined && discounts[s.studentId] !== '') {
                overrides[s.studentId] = Number(discounts[s.studentId]);
            }
        });

        const fineOverrides = {};
        targetStudents.forEach(s => {
            if (hasFineOverride(s.studentId)) {
                fineOverrides[s.studentId] = { amount: Number(fines[s.studentId].amount) || 0, reason: (fines[s.studentId].reason || '').trim() };
            }
        });

        if (!window.confirm(`Generate ${targetStudents.length} voucher(s) for ${formData.month} ${formData.year} totalling Rs ${grandTotal.toLocaleString()} and email the parents?`)) return;

        setSubmitting(true);
        try {
            const res = await Axios.post('/api/fees/generate', {
                role: 'admin',
                classNo: formData.classNo,
                studentId: formData.studentId || undefined,
                month: formData.month,
                year: Number(formData.year),
                dueDay: Number(formData.dueDay),
                discountPercent: pct,
                discounts: overrides,
                fineAmount: classFine,
                fineReason: formData.fineReason.trim(),
                fines: fineOverrides
            });
            setResult(res.data);
            setFormData(emptyForm());
            setDiscounts({});
            setFines({});
        } catch (err) {
            setError(err.response?.data?.message || err.message || "Failed to generate fee vouchers.");
            if (err.response?.data?.skippedDuplicate || err.response?.data?.skippedNoParent) {
                setResult({ ...err.response.data, created: 0 });
            }
        } finally {
            setSubmitting(false);
        }
    };

    const fineInput = (s, size) => (
        <Form.Control
            size={size}
            type="number"
            min="0"
            step="50"
            placeholder={String(Number(formData.fineAmount) || 0)}
            value={fines[s.studentId]?.amount ?? ''}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => setFine(s.studentId, 'amount', e.target.value)}
        />
    );

    const discountInput = (s, size) => (
        <Form.Control
            size={size}
            type="number"
            min="0"
            max="100"
            step="0.5"
            placeholder={String(Number(formData.discountPercent) || 0)}
            value={discounts[s.studentId] ?? ''}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => setDiscounts(prev => ({ ...prev, [s.studentId]: e.target.value }))}
        />
    );

    return (
        <Layout>
            <Container fluid className="py-4">
                <div className="mb-4 d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <div className="d-flex align-items-center gap-3">
                        <Button variant="light" className="rounded-circle shadow-sm border p-2 d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }} onClick={() => navigate(-1)}>
                            <i className="bi bi-arrow-left fs-5"></i>
                        </Button>
                        <div>
                            <h2 className="fw-bold text-dark mb-0">Issue Fees</h2>
                            <p className="text-muted mb-0">Generate fee vouchers for a class and email them to parents.</p>
                        </div>
                    </div>
                    <div className="d-flex gap-2">
                        <Button variant="outline-secondary" className="rounded-pill" onClick={() => navigate('/fee-structure')}>
                            <i className="bi bi-sliders me-2"></i>Fee Structure
                        </Button>
                        <Button variant="outline-primary" className="rounded-pill" onClick={() => navigate('/all-fees')}>
                            <i className="bi bi-list-ul me-2"></i>View Fee Records
                        </Button>
                    </div>
                </div>

                {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}
                {result && (
                    <Alert variant={result.created ? 'success' : 'warning'} dismissible onClose={() => setResult(null)}>
                        {result.created > 0 && (
                            <div className="fw-bold">
                                <i className="bi bi-check-circle-fill me-2"></i>{result.message} Email notifications are being sent.
                            </div>
                        )}
                        {result.skippedDuplicate?.length > 0 && (
                            <div className="small mt-1">Skipped (voucher already exists): {result.skippedDuplicate.join(', ')}</div>
                        )}
                        {result.skippedNoParent?.length > 0 && (
                            <div className="small mt-1">Skipped (no linked parent): {result.skippedNoParent.join(', ')}</div>
                        )}
                    </Alert>
                )}

                <Form onSubmit={handleSubmit}>
                    <Row className="g-4">
                        <Col lg={5}>
                            <Card className="border-0 shadow-sm rounded-4">
                                <Card.Body className="p-4">
                                    <h5 className="fw-bold mb-4 border-bottom pb-2">Voucher Details</h5>
                                    {loading ? (
                                        <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
                                    ) : (
                                        <>
                                            <Row className="g-3">
                                                <Col md={6}>
                                                    <Form.Group>
                                                        <Form.Label className="small fw-bold text-secondary">Class</Form.Label>
                                                        <Form.Select
                                                            required
                                                            value={formData.classNo}
                                                            onChange={(e) => {
                                                                setFormData(prev => ({ ...prev, classNo: e.target.value, studentId: '' }));
                                                                setDiscounts({});
                                                                setFines({});
                                                            }}
                                                        >
                                                            <option value="">Select Class</option>
                                                            {classesList.map(c => <option key={c} value={c}>{c}</option>)}
                                                        </Form.Select>
                                                    </Form.Group>
                                                </Col>
                                                <Col md={6}>
                                                    <Form.Group>
                                                        <Form.Label className="small fw-bold text-secondary">Monthly Fee</Form.Label>
                                                        <Form.Control
                                                            readOnly
                                                            className="bg-light"
                                                            value={!formData.classNo ? '' : baseFee ? `Rs ${baseFee.toLocaleString()}` : 'Not set'}
                                                            placeholder="Select a class"
                                                        />
                                                    </Form.Group>
                                                </Col>
                                                {formData.classNo && !baseFee && (
                                                    <Col xs={12}>
                                                        <Alert variant="warning" className="small py-2 mb-0">
                                                            No monthly fee set for class {formData.classNo}. <Link to="/fee-structure">Set it in Fee Structure</Link>.
                                                        </Alert>
                                                    </Col>
                                                )}
                                                <Col xs={12}>
                                                    <Form.Group>
                                                        <Form.Label className="small fw-bold text-secondary">Issue To</Form.Label>
                                                        <Form.Select name="studentId" value={formData.studentId} onChange={handleChange} disabled={!formData.classNo}>
                                                            <option value="">All students in class ({classStudents.length})</option>
                                                            {classStudents.map(s => (
                                                                <option key={s.studentId} value={s.studentId}>
                                                                    {s.studentName}{s.studentRollNo ? ` (${s.studentRollNo})` : ''}
                                                                </option>
                                                            ))}
                                                        </Form.Select>
                                                    </Form.Group>
                                                </Col>
                                                <Col md={6}>
                                                    <Form.Group>
                                                        <Form.Label className="small fw-bold text-secondary">Fee Month</Form.Label>
                                                        <Form.Select required name="month" value={formData.month} onChange={handleChange}>
                                                            <option value="">Select Month</option>
                                                            {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                                                        </Form.Select>
                                                    </Form.Group>
                                                </Col>
                                                <Col md={6}>
                                                    <Form.Group>
                                                        <Form.Label className="small fw-bold text-secondary">Fee Year</Form.Label>
                                                        <Form.Select required name="year" value={formData.year} onChange={handleChange}>
                                                            {[new Date().getFullYear(), new Date().getFullYear() + 1].map(y => (
                                                                <option key={y} value={y}>{y}</option>
                                                            ))}
                                                        </Form.Select>
                                                    </Form.Group>
                                                </Col>
                                                <Col md={6}>
                                                    <Form.Group>
                                                        <Form.Label className="small fw-bold text-secondary">Due Day of Month</Form.Label>
                                                        <Form.Control required type="number" min="1" max="28" name="dueDay" value={formData.dueDay} onChange={handleChange} />
                                                        <Form.Text className="text-muted small">Due date: {dueDateLabel}</Form.Text>
                                                    </Form.Group>
                                                </Col>
                                                <Col md={6}>
                                                    <Form.Group>
                                                        <Form.Label className="small fw-bold text-secondary">
                                                            Discount {formData.studentId ? '(this student)' : '(whole class)'}
                                                        </Form.Label>
                                                        <InputGroup>
                                                            <Form.Control type="number" min="0" max="100" step="0.5" name="discountPercent" value={formData.discountPercent} onChange={handleChange} />
                                                            <InputGroup.Text>%</InputGroup.Text>
                                                        </InputGroup>
                                                    </Form.Group>
                                                </Col>
                                                <Col md={5}>
                                                    <Form.Group>
                                                        <Form.Label className="small fw-bold text-secondary">
                                                            Fine {formData.studentId ? '(this student)' : '(whole class)'}
                                                        </Form.Label>
                                                        <InputGroup>
                                                            <InputGroup.Text>Rs</InputGroup.Text>
                                                            <Form.Control type="number" min="0" step="50" name="fineAmount" value={formData.fineAmount} onChange={handleChange} placeholder="0" />
                                                        </InputGroup>
                                                    </Form.Group>
                                                </Col>
                                                <Col md={7}>
                                                    <Form.Group>
                                                        <Form.Label className="small fw-bold text-secondary">Fine Reason</Form.Label>
                                                        <Form.Control
                                                            name="fineReason"
                                                            list="fine-reasons"
                                                            maxLength={100}
                                                            value={formData.fineReason}
                                                            onChange={handleChange}
                                                            placeholder={Number(formData.fineAmount) > 0 ? 'e.g. Late fee' : 'Optional - only if a fine is added'}
                                                            isInvalid={Number(formData.fineAmount) > 0 && !formData.fineReason.trim()}
                                                        />
                                                        <datalist id="fine-reasons">
                                                            {FINE_REASONS.map(r => <option key={r} value={r} />)}
                                                        </datalist>
                                                    </Form.Group>
                                                </Col>
                                            </Row>

                                            <div className="bg-light rounded-3 p-3 mt-4">
                                                <div className="d-flex justify-content-between small"><span className="text-muted">Vouchers to generate</span><span className="fw-bold">{formData.month ? targetStudents.length : 0}</span></div>
                                                <div className="d-flex justify-content-between small"><span className="text-muted">Gross amount</span><span className="fw-bold">Rs {(baseFee * targetStudents.length).toLocaleString()}</span></div>
                                                <div className="d-flex justify-content-between small"><span className="text-muted">Total discount</span><span className="fw-bold text-success">- Rs {totalDiscount.toLocaleString()}</span></div>
                                                <div className="d-flex justify-content-between small"><span className="text-muted">Total fines</span><span className="fw-bold text-danger">+ Rs {totalFine.toLocaleString()}</span></div>
                                                <div className="d-flex justify-content-between mt-1 pt-1 border-top"><span className="fw-bold">Net Billed</span><span className="fw-bold text-primary">Rs {grandTotal.toLocaleString()}</span></div>
                                            </div>

                                            <Button type="submit" variant="primary" className="w-100 rounded-pill py-3 fw-bold shadow-sm mt-4" disabled={submitting || !baseFee || !formData.month || !targetStudents.length}>
                                                {submitting ? <Spinner size="sm" /> : <><i className="bi bi-send-fill me-2"></i>Generate & Send Vouchers</>}
                                            </Button>
                                        </>
                                    )}
                                </Card.Body>
                            </Card>
                        </Col>

                        <Col lg={7}>
                            <Card className="border-0 shadow-sm rounded-4 h-100">
                                <Card.Body className="p-4">
                                    <div className="d-flex justify-content-between align-items-center mb-3 border-bottom pb-2">
                                        <h5 className="fw-bold mb-0">Voucher Preview</h5>
                                        {targetStudents.length > 0 && <span className="small text-muted">Click a student to view the voucher details</span>}
                                    </div>
                                    {!formData.classNo ? (
                                        <p className="text-muted text-center py-5 mb-0">Select a class to see its students.</p>
                                    ) : targetStudents.length === 0 ? (
                                        <p className="text-muted text-center py-5 mb-0">No students with a linked parent in {formData.classNo}.</p>
                                    ) : (
                                        <div className="table-responsive" style={{ maxHeight: '560px' }}>
                                            <Table hover size="sm" className="align-middle mb-0">
                                                <thead className="small text-secondary">
                                                    <tr>
                                                        <th>Student</th>
                                                        <th>Parent</th>
                                                        <th style={{ width: '95px' }}>Discount %</th>
                                                        <th style={{ width: '105px' }}>Fine (Rs)</th>
                                                        <th className="text-end">Net Payable</th>
                                                        <th></th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {targetStudents.map(s => {
                                                        const pct = percentFor(s.studentId);
                                                        return (
                                                            <tr key={s.studentId} style={{ cursor: 'pointer' }} onClick={() => setPreviewStudent(s)}>
                                                                <td>
                                                                    <div className="fw-bold">{s.studentName}</div>
                                                                    {s.studentRollNo && <div className="small text-muted">{s.studentRollNo}</div>}
                                                                </td>
                                                                <td className="small text-muted">{s.parentEmail}</td>
                                                                <td>{formData.studentId ? <span>{pct}%</span> : discountInput(s, 'sm')}</td>
                                                                <td>{formData.studentId ? <span>{fineFor(s.studentId) ? `Rs ${fineFor(s.studentId).toLocaleString()}` : '—'}</span> : fineInput(s, 'sm')}</td>
                                                                <td className="text-end">
                                                                    {(pct > 0 || fineFor(s.studentId) > 0) && baseFee > 0 && (
                                                                        <div className="small text-muted text-decoration-line-through">Rs {baseFee.toLocaleString()}</div>
                                                                    )}
                                                                    <span className="fw-bold">Rs {netFor(s.studentId).toLocaleString()}</span>
                                                                    {pct > 0 && <Badge bg="success" className="ms-1 bg-opacity-75">-{pct}%</Badge>}
                                                                    {fineFor(s.studentId) > 0 && <Badge bg="danger" className="ms-1 bg-opacity-75" title={fineReasonFor(s.studentId)}>+fine</Badge>}
                                                                </td>
                                                                <td className="text-end text-muted"><i className="bi bi-chevron-right"></i></td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </Table>
                                        </div>
                                    )}
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>
                </Form>

                <Modal show={!!previewStudent} onHide={() => setPreviewStudent(null)} centered>
                    {previewStudent && (() => {
                        const s = previewStudent;
                        const pct = percentFor(s.studentId);
                        return (
                            <>
                                <Modal.Header closeButton className="border-0 pb-0">
                                    <Modal.Title className="fw-bold">Voucher Preview</Modal.Title>
                                </Modal.Header>
                                <Modal.Body>
                                    <div className="small text-muted mb-3">This is how the voucher will be generated. The voucher number is assigned on issue.</div>
                                    <Table borderless size="sm" className="mb-3">
                                        <tbody>
                                            <tr><td className="text-muted">Student</td><td className="fw-bold text-end">{s.studentName}</td></tr>
                                            <tr><td className="text-muted">Roll No.</td><td className="text-end">{s.studentRollNo || '—'}</td></tr>
                                            <tr><td className="text-muted">Class</td><td className="text-end">{formData.classNo}</td></tr>
                                            <tr><td className="text-muted">Parent</td><td className="text-end">{s.parentName || '—'}</td></tr>
                                            <tr><td className="text-muted">Parent Email</td><td className="text-end">{s.parentEmail}</td></tr>
                                            <tr><td className="text-muted">Parent Phone</td><td className="text-end">{s.parentPhone || '—'}</td></tr>
                                            <tr><td className="text-muted">Fee Month</td><td className="text-end">{formData.month ? `${formData.month} ${formData.year}` : <span className="text-danger">Not selected</span>}</td></tr>
                                            <tr><td className="text-muted">Due Date</td><td className="fw-bold text-end">{dueDateLabel}</td></tr>
                                        </tbody>
                                    </Table>
                                    <Table bordered size="sm" className="mb-3">
                                        <thead className="bg-light small">
                                            <tr><th>Description</th><th className="text-end">Amount</th></tr>
                                        </thead>
                                        <tbody>
                                            <tr><td>Monthly Tuition Fee</td><td className="text-end">Rs {baseFee.toLocaleString()}</td></tr>
                                            <tr className="text-success"><td>Discount ({pct}%)</td><td className="text-end">- Rs {discountFor(s.studentId).toLocaleString()}</td></tr>
                                            <tr className="text-danger"><td>Fine{fineFor(s.studentId) > 0 ? ` (${fineReasonFor(s.studentId)})` : ''}</td><td className="text-end">+ Rs {fineFor(s.studentId).toLocaleString()}</td></tr>
                                            <tr className="fw-bold"><td>Net Payable</td><td className="text-end">Rs {netFor(s.studentId).toLocaleString()}</td></tr>
                                        </tbody>
                                    </Table>
                                    {!formData.studentId && (
                                        <Form.Group>
                                            <Form.Label className="small fw-bold text-secondary">Discount for {s.studentName}</Form.Label>
                                            <InputGroup size="sm">
                                                {discountInput(s)}
                                                <InputGroup.Text>%</InputGroup.Text>
                                            </InputGroup>
                                            <Form.Text className="text-muted small">Leave empty to use the class discount ({Number(formData.discountPercent) || 0}%).</Form.Text>
                                        </Form.Group>
                                    )}
                                    {!formData.studentId && (
                                        <Row className="g-2 mt-2">
                                            <Col xs={5}>
                                                <Form.Label className="small fw-bold text-secondary">Fine for {s.studentName}</Form.Label>
                                                <InputGroup size="sm">
                                                    <InputGroup.Text>Rs</InputGroup.Text>
                                                    {fineInput(s)}
                                                </InputGroup>
                                            </Col>
                                            <Col xs={7}>
                                                <Form.Label className="small fw-bold text-secondary">Fine Reason</Form.Label>
                                                <Form.Control
                                                    size="sm"
                                                    list="fine-reasons"
                                                    maxLength={100}
                                                    value={fines[s.studentId]?.reason ?? ''}
                                                    onChange={(e) => setFine(s.studentId, 'reason', e.target.value)}
                                                    placeholder={formData.fineReason || 'e.g. Late fee'}
                                                />
                                            </Col>
                                            <Col xs={12}>
                                                <Form.Text className="text-muted small">Leave the amount empty to use the class fine (Rs {Number(formData.fineAmount) || 0}).</Form.Text>
                                            </Col>
                                        </Row>
                                    )}
                                    {netFor(s.studentId) === 0 && baseFee > 0 && (
                                        <Alert variant="info" className="small py-2 mt-3 mb-0">With a 100% discount and no fine, nothing is payable. The voucher will be marked Paid when it is issued.</Alert>
                                    )}
                                </Modal.Body>
                                <Modal.Footer className="border-0 pt-0">
                                    <Button variant="secondary" className="rounded-pill px-4" onClick={() => setPreviewStudent(null)}>Close</Button>
                                </Modal.Footer>
                            </>
                        );
                    })()}
                </Modal>
            </Container>
        </Layout>
    );
};

export default IssueFees;
