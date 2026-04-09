import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Spinner, Alert } from 'react-bootstrap';
import { Navigate, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Axios from 'axios';

const IssueFees = () => {
    const navigate = useNavigate();
    const role = localStorage.getItem('userRole');
    const email = localStorage.getItem('userEmail');

    if (!email || (role?.toLowerCase() !== 'admin')) {
        return <Navigate to="/" replace />;
    }

    const [parents, setParents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState('');

    const [formData, setFormData] = useState({
        classNo: '',
        studentName: '',
        parentEmail: '',
        amount: '',
        dueDate: '',
        month: '',
        adminVoucher: null
    });

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await Axios.get('http://localhost:8080/api/parents');
            setParents(res.data);
            setLoading(false);
        } catch (err) {
            console.error("Failed to fetch parents", err);
            setError("Failed to load parent records.");
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);
        setSuccessMsg('');

        try {
            const data = new FormData();
            data.append("classNo", formData.classNo);
            data.append("studentName", formData.studentName);
            data.append("parentEmail", formData.parentEmail);
            data.append("amount", formData.amount);
            data.append("dueDate", formData.dueDate);
            data.append("month", formData.month);
            data.append("role", 'admin');

            if (formData.adminVoucher) {
                data.append("adminVoucher", formData.adminVoucher);
            }

            if (formData.parentEmail === 'ALL') {
                const parentsInClass = parents.filter(p => p.classNo === formData.classNo);
                if (parentsInClass.length === 0) {
                    throw new Error("No parent records found for this class.");
                }
                // Append parents as a stringified JSON for the backend to parse
                data.append("parents", JSON.stringify(parentsInClass));
                await Axios.post('http://localhost:8080/api/fees/bulk', data);
                setSuccessMsg(`Fee alerts sent successfully to all ${parentsInClass.length} students!`);
            } else {
                await Axios.post('http://localhost:8080/api/fees', data);
                setSuccessMsg("Fee alert sent successfully!");
            }

            setFormData({ classNo: '', studentName: '', parentEmail: '', amount: '', dueDate: '', month: '', adminVoucher: null });
            document.getElementById('fee-voucher-upload').value = '';
        } catch (err) {
            setError(err.response?.data?.message || err.message || "Failed to send fee alert.");
        } finally {
            setSubmitting(false);
            if (successMsg) setTimeout(() => setSuccessMsg(''), 3000);
        }
    };

    const classesList = [...new Set([
        ...parents.map(p => p.classNo).filter(Boolean)
    ])].sort();

    const filteredParents = formData.classNo
        ? parents.filter(p => p.classNo === formData.classNo)
        : parents;

    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    return (
        <Layout>
            <Container fluid className="py-4">
                <div className="mb-4 d-flex justify-content-between align-items-center">
                    <div className="d-flex align-items-center gap-3">
                        <Button variant="light" className="rounded-circle shadow-sm border p-2 d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }} onClick={() => navigate(-1)}>
                            <i className="bi bi-arrow-left fs-5"></i>
                        </Button>
                        <div>
                            <h2 className="fw-bold text-dark mb-0">Issue Fees</h2>
                            <p className="text-muted mb-0">Generate new fee alerts for students.</p>
                        </div>
                    </div>
                    <Button variant="outline-primary" className="rounded-pill" onClick={() => navigate('/all-fees')}>
                        <i className="bi bi-list-ul me-2"></i>View Fee Records
                    </Button>
                </div>

                {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}
                {successMsg && <Alert variant="success" dismissible onClose={() => setSuccessMsg('')}>{successMsg}</Alert>}

                <Row className="justify-content-center">
                    <Col lg={6}>
                        <Card className="border-0 shadow-sm rounded-4">
                            <Card.Body className="p-4">
                                <h5 className="fw-bold mb-4 border-bottom pb-2">Issue New Fee Alert</h5>
                                {loading ? (
                                    <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
                                ) : (
                                    <Form onSubmit={handleSubmit}>
                                        <Row className="g-3">
                                            <Col md={6}>
                                                <Form.Group className="mb-3">
                                                    <Form.Label className="small fw-bold text-secondary">Class No</Form.Label>
                                                    <Form.Select
                                                        name="classNo"
                                                        value={formData.classNo}
                                                        onChange={(e) => {
                                                            setFormData({ ...formData, classNo: e.target.value, parentEmail: '' });
                                                        }}
                                                    >
                                                        <option value="">All Classes</option>
                                                        {classesList.map(c => (
                                                            <option key={c} value={c}>{c}</option>
                                                        ))}
                                                    </Form.Select>
                                                </Form.Group>
                                            </Col>
                                            <Col md={6}>
                                                <Form.Group className="mb-3">
                                                    <Form.Label className="small fw-bold text-secondary">Fee Month</Form.Label>
                                                    <Form.Select required name="month" value={formData.month} onChange={handleChange}>
                                                        <option value="">Select Month</option>
                                                        {months.map(m => <option key={m} value={m}>{m}</option>)}
                                                    </Form.Select>
                                                </Form.Group>
                                            </Col>
                                        </Row>

                                        <Form.Group className="mb-3">
                                            <Form.Label className="small fw-bold text-secondary">Select Parent / Guardian</Form.Label>
                                            <Form.Select required name="parentEmail" value={formData.parentEmail} onChange={handleChange}>
                                                <option value="">Choose Parent...</option>
                                                {formData.classNo && (
                                                    <option value="ALL" className="fw-bold text-primary">Issue to All Students in {formData.classNo}</option>
                                                )}
                                                {filteredParents.map((p, idx) => (
                                                    <option key={idx} value={p.parentEmail}>Parent of {p.studentName} ({p.parentEmail})</option>
                                                ))}
                                            </Form.Select>
                                        </Form.Group>

                                        <Form.Group className="mb-3">
                                            <Form.Label className="small fw-bold text-secondary">Student Name</Form.Label>
                                            <Form.Control
                                                required={formData.parentEmail !== 'ALL'}
                                                disabled={formData.parentEmail === 'ALL'}
                                                name="studentName"
                                                value={formData.parentEmail === 'ALL' ? 'Bulk Class Members' : formData.studentName}
                                                onChange={handleChange}
                                                placeholder="e.g. John Doe"
                                            />
                                        </Form.Group>

                                        <Row>
                                            <Col md={6}>
                                                <Form.Group className="mb-3">
                                                    <Form.Label className="small fw-bold text-secondary">Amount (Rs)</Form.Label>
                                                    <Form.Control required type="number" min="1" name="amount" value={formData.amount} onChange={handleChange} placeholder="0" />
                                                </Form.Group>
                                            </Col>
                                            <Col md={6}>
                                                <Form.Group className="mb-3">
                                                    <Form.Label className="small fw-bold text-secondary">Due Date</Form.Label>
                                                    <Form.Control required type="date" name="dueDate" value={formData.dueDate} onChange={handleChange} />
                                                </Form.Group>
                                            </Col>
                                        </Row>

                                        <Form.Group className="mb-4">
                                            <Form.Label className="small fw-bold text-secondary">Upload Fee Voucher (Required)</Form.Label>
                                            <Form.Control
                                                required
                                                id="fee-voucher-upload"
                                                type="file"
                                                accept="image/*,.pdf"
                                                onChange={(e) => {
                                                    const file = e.target.files[0];
                                                    if (file) {
                                                        setFormData({ ...formData, adminVoucher: file });
                                                    }
                                                }}
                                            />
                                        </Form.Group>

                                        <div className="mt-4">
                                            <Button type="submit" variant="primary" className="w-100 rounded-pill py-3 fw-bold shadow-sm" disabled={submitting}>
                                                {submitting ? <Spinner size="sm" /> : <><i className="bi bi-send-fill me-2"></i>Send Fee Alert</>}
                                            </Button>
                                        </div>
                                    </Form>
                                )}
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            </Container>
        </Layout>
    );
};

export default IssueFees;
