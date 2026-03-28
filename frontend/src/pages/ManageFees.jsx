import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Table, Badge, Spinner, Alert, Modal } from 'react-bootstrap';
import { Navigate, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Axios from 'axios';

const ManageFees = () => {
    const navigate = useNavigate();
    const role = localStorage.getItem('userRole');
    const email = localStorage.getItem('userEmail');

    if (!email || (role?.toLowerCase() !== 'admin')) {
        return <Navigate to="/" replace />;
    }

    const [fees, setFees] = useState([]);
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
        adminVoucherBase64: ''
    });

    const downloadBase64File = (base64Data, filename) => {
        const linkSource = base64Data;
        const downloadLink = document.createElement("a");
        downloadLink.href = linkSource;
        downloadLink.download = filename;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const [feesRes, parentsRes] = await Promise.all([
                Axios.get(`http://localhost:8080/api/fees?role=admin`),
                Axios.get('http://localhost:8080/api/parents')
            ]);
            setFees(feesRes.data);
            setParents(parentsRes.data);
            setLoading(false);
        } catch (err) {
            console.error("Failed to fetch data", err);
            setError("Failed to load fee records. Please try again.");
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
            const payload = { ...formData, role: 'admin' };

            // Check if issuing bulk fees
            if (formData.parentEmail === 'ALL') {
                const parentsInClass = parents.filter(p => p.classNo === formData.classNo);
                if (parentsInClass.length === 0) {
                    throw new Error("No parent records found for this class.");
                }
                payload.parents = parentsInClass;
                await Axios.post('http://localhost:8080/api/fees/bulk', payload);
                setSuccessMsg(`Fee alerts sent successfully to all ${parentsInClass.length} students in class!`);
            } else {
                // Issue single fee
                await Axios.post('http://localhost:8080/api/fees', payload);
                setSuccessMsg("Fee alert sent successfully!");
            }

            setFormData({ classNo: '', studentName: '', parentEmail: '', amount: '', dueDate: '', month: '', adminVoucherBase64: '' });
            document.getElementById('fee-voucher-upload').value = '';
            fetchData();
        } catch (err) {
            setError(err.response?.data?.message || err.message || "Failed to send fee alert.");
        } finally {
            setSubmitting(false);
            if (successMsg) setTimeout(() => setSuccessMsg(''), 3000);
        }
    };

    // Calculate unique classes strictly from DB
    const classesList = [...new Set([
        ...parents.map(p => p.classNo).filter(Boolean)
    ])].sort();

    // Filter parents by class
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
                            <h2 className="fw-bold text-dark mb-0">Fee Management</h2>
                            <p className="text-muted mb-0">Generate fee alerts and invoices for students.</p>
                        </div>
                    </div>
                </div>

                {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}
                {successMsg && <Alert variant="success" dismissible onClose={() => setSuccessMsg('')}>{successMsg}</Alert>}

                <Row className="g-4">
                    {/* Create Fee Alert Form */}
                    <Col lg={4}>
                        <Card className="border-0 shadow-sm rounded-4 h-100">
                            <Card.Body className="p-4">
                                <h5 className="fw-bold mb-4 border-bottom pb-2">Issue New Fee</h5>
                                <Form onSubmit={handleSubmit}>
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

                                    <Form.Group className="mb-3">
                                        <Form.Label className="small fw-bold text-secondary">Fee Month</Form.Label>
                                        <Form.Select required name="month" value={formData.month} onChange={handleChange}>
                                            <option value="">Select Month</option>
                                            {months.map(m => <option key={m} value={m}>{m}</option>)}
                                        </Form.Select>
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

                                    <Form.Group className="mb-3">
                                        <Form.Label className="small fw-bold text-secondary">Upload Fee Voucher (Required)</Form.Label>
                                        <Form.Control
                                            required
                                            id="fee-voucher-upload"
                                            type="file"
                                            accept="image/*,.pdf"
                                            onChange={(e) => {
                                                const file = e.target.files[0];
                                                if (file) {
                                                    const reader = new FileReader();
                                                    reader.onloadend = () => setFormData({ ...formData, adminVoucherBase64: reader.result });
                                                    reader.readAsDataURL(file);
                                                }
                                            }}
                                        />
                                    </Form.Group>

                                    <div className="mt-4">
                                        <Button type="submit" variant="primary" className="w-100 rounded-pill fw-bold shadow-sm" disabled={submitting}>
                                            {submitting ? <Spinner size="sm" /> : <><i className="bi bi-send-fill me-2"></i>Send Fee Alert</>}
                                        </Button>
                                    </div>
                                </Form>
                            </Card.Body>
                        </Card>
                    </Col>

                    {/* Fee Records Table */}
                    <Col lg={8}>
                        <Card className="border-0 shadow-sm rounded-4 h-100 d-flex flex-column">
                            <Card.Body className="p-0 d-flex flex-column">
                                <div className="p-4 border-bottom d-flex justify-content-between align-items-center">
                                    <h5 className="fw-bold mb-0">Fee Records Hub</h5>
                                    {loading && <Spinner size="sm" variant="primary" />}
                                </div>
                                <div className="table-responsive flex-grow-1">
                                    <Table hover className="align-middle mb-0 custom-table">
                                        <thead className="bg-light">
                                            <tr>
                                                <th className="ps-4">Student</th>
                                                <th>Parent Email</th>
                                                <th>Month</th>
                                                <th>Amount</th>
                                                <th>Due Date</th>
                                                <th className="text-center">Status / Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {fees.length > 0 ? fees.map((f) => (
                                                <tr key={f._id}>
                                                    <td className="ps-4 fw-medium text-dark">{f.studentName}</td>
                                                    <td className="small text-muted">{f.parentEmail}</td>
                                                    <td>{f.month}</td>
                                                    <td className="fw-bold text-primary">Rs {f.amount}</td>
                                                    <td className="small">{new Date(f.dueDate).toLocaleDateString()}</td>
                                                    <td className="text-center">
                                                        {f.status === 'Paid' && (
                                                            <Badge bg="success" className="bg-opacity-10 text-success px-3 py-2 rounded-pill">Paid</Badge>
                                                        )}
                                                        {f.status === 'Pending' && (
                                                            <Badge bg="warning" className="bg-opacity-10 text-warning px-3 py-2 rounded-pill">Pending</Badge>
                                                        )}
                                                        {f.status === 'Review' && (
                                                            <div className="d-flex align-items-center justify-content-center gap-2">
                                                                <Badge bg="info" className="bg-opacity-10 text-info px-2 py-1 rounded-pill">In Review</Badge>
                                                                <Button size="sm" variant="outline-primary" className="rounded-pill p-1 px-2" onClick={() => downloadBase64File(f.parentReceiptBase64, `Receipt_${f.studentName}.png`)} title="View Receipt">
                                                                    <i className="bi bi-download"></i>
                                                                </Button>
                                                                <Button size="sm" variant="success" className="rounded-pill p-1 px-2" onClick={async () => {
                                                                    try {
                                                                        await Axios.put(`http://localhost:8080/api/fees/${f._id}/approve`);
                                                                        fetchData();
                                                                    } catch (e) {
                                                                        alert("Approval failed!");
                                                                    }
                                                                }} title="Approve">
                                                                    <i className="bi bi-check-lg"></i>
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            )) : (
                                                <tr>
                                                    <td colSpan="6" className="text-center py-5 text-muted">
                                                        {loading ? "Loading records..." : "No fee records found in the database."}
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </Table>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            </Container>

            <style>
                {`
                    .custom-table thead th {
                        font-size: 0.75rem;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        font-weight: 700;
                        color: #6c757d;
                        border: none;
                        padding: 1.2rem 1rem;
                    }
                    .custom-table tbody td {
                        padding: 1rem;
                        border-bottom: 1px solid #f8f9fa;
                    }
                `}
            </style>
        </Layout>
    );
};

export default ManageFees;
