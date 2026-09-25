import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Table, Badge, Spinner, Alert, InputGroup, Modal } from 'react-bootstrap';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import Axios from 'axios';

const AllFees = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const role = localStorage.getItem('userRole');
    const email = localStorage.getItem('userEmail');

    if (!email || (role?.toLowerCase() !== 'admin')) {
        return <Navigate to="/" replace />;
    }

    const [fees, setFees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filterStatus, setFilterStatus] = useState(searchParams.get('status') || '');
    const [filterMonth, setFilterMonth] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedVoucher, setSelectedVoucher] = useState(null);

    // Online payments
    const [activeTab, setActiveTab] = useState(searchParams.get('tab') === 'payments' ? 'payments' : 'fees');
    const [payments, setPayments] = useState([]);
    const [paymentsLoading, setPaymentsLoading] = useState(false);
    const [paySearch, setPaySearch] = useState('');
    const [payStatus, setPayStatus] = useState('');
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [rejectReason, setRejectReason] = useState('');
    const [processing, setProcessing] = useState(false);
    const [paymentError, setPaymentError] = useState(null);

    const handleViewVoucher = (filename) => {
        // If it already has /uploads or starts with images/, handle correctly
        let path = filename;
        if (!path.startsWith('/') && !path.startsWith('http')) {
            const prefix = path.startsWith('images/') ? '' : 'images/';
            path = `/uploads/${prefix}${path}`;
        }
        setSelectedVoucher(path);
        setShowViewModal(true);
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await Axios.get(`/api/fees?role=admin`);
            setFees(res.data);
            setLoading(false);
        } catch (err) {
            console.error("Failed to fetch data", err);
            setError("Failed to load fee records.");
            setLoading(false);
        }
    };

    const fetchPayments = async () => {
        try {
            setPaymentsLoading(true);
            const params = new URLSearchParams({ role: 'admin', email });
            if (payStatus) params.set('status', payStatus);
            if (paySearch.trim()) params.set('search', paySearch.trim());
            const res = await Axios.get(`/api/payments?${params.toString()}`);
            setPayments(res.data);
        } catch (err) {
            console.error("Failed to fetch payments", err);
            setError(err.response?.data?.message || "Failed to load payment requests.");
        } finally {
            setPaymentsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        const t = setTimeout(fetchPayments, 300);
        return () => clearTimeout(t);
    }, [payStatus, paySearch]);

    const openPayment = (p) => {
        setSelectedPayment(p);
        setRejectReason('');
        setPaymentError(null);
    };

    const handlePaymentAction = async (action) => {
        if (action === 'reject' && !window.confirm("Reject this payment? The voucher will remain unpaid.")) return;
        setProcessing(true);
        setPaymentError(null);
        try {
            const body = { role: 'admin', email };
            if (action === 'reject') body.reason = rejectReason;
            const res = await Axios.put(`/api/payments/${selectedPayment._id}/${action}`, body);
            setSelectedPayment(res.data.payment);
            fetchPayments();
            fetchData();
        } catch (err) {
            setPaymentError(err.response?.data?.message || `Failed to ${action} payment.`);
        } finally {
            setProcessing(false);
        }
    };

    const paymentBadge = (status) => {
        const map = {
            Successful: ['info', 'Under Review'],
            Approved: ['success', 'Approved'],
            Failed: ['danger', 'Failed'],
            Rejected: ['danger', 'Rejected'],
            Pending: ['warning', 'Awaiting Approval']
        };
        const [color, label] = map[status] || ['secondary', status];
        return <Badge bg={color} className={`bg-opacity-10 text-${color} px-3 py-2 rounded-pill`}>{label}</Badge>;
    };

    // Online payments waiting for the admin's verification.
    const isReviewable = (p) => p.status === 'Successful' || p.status === 'Pending';
    const reviewablePaymentFor = (feeId) => payments.find(p => p.voucher?._id === feeId && isReviewable(p));

    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const filteredFees = fees.filter(fee => {
        const matchesStatus = filterStatus ? fee.status === filterStatus : true;
        const matchesMonth = filterMonth ? fee.month === filterMonth : true;
        const matchesSearch = searchTerm ? 
            (fee.studentName.toLowerCase().includes(searchTerm.toLowerCase()) || 
             fee.parentEmail.toLowerCase().includes(searchTerm.toLowerCase())) : true;
        return matchesStatus && matchesMonth && matchesSearch;
    });

    const handleApprove = async (id) => {
        try {
            await Axios.put(`/api/fees/${id}/approve`);
            fetchData();
        } catch (e) {
            alert("Approval failed!");
        }
    };

    const handleReject = async (id) => {
        if (!window.confirm("Are you sure you want to reject this payment voucher? The student will be notified to re-upload.")) return;
        try {
            await Axios.put(`/api/fees/${id}/reject`);
            fetchData();
        } catch (e) {
            alert("Rejection failed!");
        }
    };

    return (
        <Layout>
            <Container fluid className="py-4">
                <div className="mb-4 d-flex justify-content-between align-items-center flex-wrap gap-3">
                    <div className="d-flex align-items-center gap-3">
                        <Button variant="light" className="rounded-circle shadow-sm border p-2 d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }} onClick={() => navigate(-1)}>
                            <i className="bi bi-arrow-left fs-5"></i>
                        </Button>
                        <div>
                            <h2 className="fw-bold text-dark mb-0">Fee Records Hub</h2>
                            <p className="text-muted mb-0">View, search, and manage all student fee records.</p>
                        </div>
                    </div>
                    <Button variant="primary" className="rounded-pill px-4 fw-bold shadow-sm" onClick={() => navigate('/issue-fees')}>
                        <i className="bi bi-plus-lg me-2"></i>Issue New Fee
                    </Button>
                </div>

                {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}

                <div className="d-flex gap-2 mb-4">
                    <Button variant={activeTab === 'fees' ? 'primary' : 'light'} className="rounded-pill px-4 fw-bold shadow-sm" onClick={() => setActiveTab('fees')}>
                        <i className="bi bi-cash-coin me-2"></i>Fee Vouchers
                    </Button>
                    <Button variant={activeTab === 'payments' ? 'primary' : 'light'} className="rounded-pill px-4 fw-bold shadow-sm" onClick={() => setActiveTab('payments')}>
                        <i className="bi bi-credit-card me-2"></i>Online Payments
                    </Button>
                </div>

                {activeTab === 'payments' && (
                    <>
                        <Card className="border-0 shadow-sm rounded-4 mb-4">
                            <Card.Body className="p-3 p-md-4">
                                <Row className="g-3 align-items-end">
                                    <Col md={6}>
                                        <Form.Label className="small fw-bold text-secondary">Search</Form.Label>
                                        <InputGroup>
                                            <InputGroup.Text className="bg-light border-0"><i className="bi bi-search"></i></InputGroup.Text>
                                            <Form.Control
                                                className="bg-light border-0"
                                                placeholder="Student name or transaction ID..."
                                                value={paySearch}
                                                onChange={(e) => setPaySearch(e.target.value)}
                                            />
                                        </InputGroup>
                                    </Col>
                                    <Col md={4}>
                                        <Form.Label className="small fw-bold text-secondary">Payment Status</Form.Label>
                                        <Form.Select className="bg-light border-0" value={payStatus} onChange={(e) => setPayStatus(e.target.value)}>
                                            <option value="">All Statuses</option>
                                            <option value="Successful">Under Review</option>
                                            <option value="Failed">Failed</option>
                                            <option value="Pending">Awaiting Approval</option>
                                            <option value="Approved">Approved</option>
                                            <option value="Rejected">Rejected</option>
                                        </Form.Select>
                                    </Col>
                                    <Col md={2}>
                                        <Button variant="outline-secondary" className="w-100 rounded-pill" onClick={() => { setPaySearch(''); setPayStatus(''); }}>
                                            Reset
                                        </Button>
                                    </Col>
                                </Row>
                            </Card.Body>
                        </Card>

                        <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
                            <Card.Body className="p-0">
                                <div className="table-responsive">
                                    <Table hover className="align-middle mb-0 custom-table">
                                        <thead className="bg-light text-secondary small fw-bold">
                                            <tr>
                                                <th className="ps-4">Transaction ID</th>
                                                <th>Student</th>
                                                <th>Voucher</th>
                                                <th>Amount</th>
                                                <th>Method</th>
                                                <th>Date</th>
                                                <th className="text-center">Status</th>
                                                <th className="text-center">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {paymentsLoading && payments.length === 0 ? (
                                                <tr><td colSpan="8" className="text-center py-5"><Spinner animation="border" variant="primary" /></td></tr>
                                            ) : payments.length > 0 ? payments.map(p => (
                                                <tr key={p._id}>
                                                    <td className="ps-4 fw-bold small">{p.transactionId}</td>
                                                    <td>
                                                        <div className="fw-bold text-dark">{p.studentName}</div>
                                                        <div className="small text-muted">{p.parentEmail}</div>
                                                    </td>
                                                    <td className="small">{p.voucher ? `${p.voucher.month} ${p.voucher.year}` : '—'}</td>
                                                    <td className="fw-bold text-primary">Rs {p.amount.toLocaleString()}</td>
                                                    <td className="small">
                                                        {p.paymentMethod}
                                                        {p.accountLast4 && <div className="text-muted">•••• {p.accountLast4}</div>}
                                                    </td>
                                                    <td className="small">{new Date(p.createdAt).toLocaleString()}</td>
                                                    <td className="text-center">
                                                        {paymentBadge(p.status)}
                                                        {p.failureReason && <div className="small text-danger mt-1" style={{ maxWidth: '200px', margin: '0 auto' }}>{p.failureReason}</div>}
                                                    </td>
                                                    <td className="text-center">
                                                        <Button size="sm" variant={isReviewable(p) ? 'primary' : 'outline-primary'} className="rounded-pill px-3" onClick={() => openPayment(p)}>
                                                            {isReviewable(p) ? 'Review' : 'View'}
                                                        </Button>
                                                    </td>
                                                </tr>
                                            )) : (
                                                <tr>
                                                    <td colSpan="8" className="text-center py-5 text-muted">No payment requests match your filters.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </Table>
                                </div>
                            </Card.Body>
                        </Card>
                    </>
                )}

                {activeTab === 'fees' && (<>
                <Card className="border-0 shadow-sm rounded-4 mb-4">
                    <Card.Body className="p-3 p-md-4">
                        <Row className="g-3 align-items-end">
                            <Col md={4}>
                                <Form.Label className="small fw-bold text-secondary">Search Student</Form.Label>
                                <InputGroup>
                                    <InputGroup.Text className="bg-light border-0"><i className="bi bi-search"></i></InputGroup.Text>
                                    <Form.Control 
                                        className="bg-light border-0" 
                                        placeholder="Name or email..." 
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </InputGroup>
                            </Col>
                            <Col md={3}>
                                <Form.Label className="small fw-bold text-secondary">Fee Month</Form.Label>
                                <Form.Select className="bg-light border-0" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}>
                                    <option value="">All Months</option>
                                    {months.map(m => <option key={m} value={m}>{m}</option>)}
                                </Form.Select>
                            </Col>
                            <Col md={3}>
                                <Form.Label className="small fw-bold text-secondary">Status</Form.Label>
                                <Form.Select className="bg-light border-0" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                                    <option value="">All Statuses</option>
                                    <option value="Pending">Pending</option>
                                    <option value="Review">Under Review</option>
                                    <option value="Paid">Paid</option>
                                </Form.Select>
                            </Col>
                            <Col md={2}>
                                <Button variant="outline-secondary" className="w-100 rounded-pill" onClick={() => { setFilterStatus(''); setFilterMonth(''); setSearchTerm(''); }}>
                                    Reset
                                </Button>
                            </Col>
                        </Row>
                    </Card.Body>
                </Card>

              
                <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
                    <Card.Body className="p-0">
                        <div className="table-responsive">
                            <Table hover className="align-middle mb-0 custom-table">
                                <thead className="bg-light text-secondary small fw-bold">
                                    <tr>
                                        <th className="ps-4">Month</th>
                                        <th>Student</th>
                                        <th>Amount</th>
                                        <th>Due Date</th>
                                        <th className="text-center">Status</th>
                                        <th className="text-center">Actions</th>
                                     
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan="6" className="text-center py-5"><Spinner animation="border" variant="primary" /></td></tr>
                                    ) : filteredFees.length > 0 ? filteredFees.map((f) => (
                                        <tr key={f._id}>
                                            <td className="ps-4">
                                                <Badge bg="primary" className="bg-opacity-10 text-primary px-3 py-2 rounded-pill fw-bold">
                                                    {f.month}
                                                </Badge>
                                            </td>
                                            <td>
                                                <div className="fw-bold text-dark">{f.studentName}</div>
                                                <div className="small text-muted">{f.parentEmail}</div>
                                            </td>
                                            <td>
                                                <span className="fw-bold text-primary">Rs {f.amount.toLocaleString()}</span>
                                                {f.discountAmount > 0 && (
                                                    <div className="small text-success">{f.discountPercent}% off Rs {f.originalAmount.toLocaleString()}</div>
                                                )}
                                                {f.fineAmount > 0 && (
                                                    <div className="small text-danger" title={f.fineReason}>+ Rs {f.fineAmount.toLocaleString()} fine{f.fineReason ? ` (${f.fineReason})` : ''}</div>
                                                )}
                                            </td>
                                            <td className="small">{new Date(f.dueDate).toLocaleDateString()}</td>
                                            <td className="text-center">
                                                {f.status === 'Paid' && <Badge bg="success" className="bg-opacity-10 text-success px-3 py-2 rounded-pill">Paid</Badge>}
                                                {f.status === 'Pending' && <Badge bg="warning" className="bg-opacity-10 text-warning px-3 py-2 rounded-pill">Pending</Badge>}
                                                {f.status === 'Review' && <Badge bg="info" className="bg-opacity-10 text-info px-3 py-2 rounded-pill">Under Review</Badge>}
                                                {f.status === 'Review' && reviewablePaymentFor(f._id) && (
                                                    <div className="small text-muted mt-1"><i className="bi bi-globe me-1"></i>Online · {reviewablePaymentFor(f._id).paymentMethod}</div>
                                                )}
                                            </td>
                                            <td className="text-center">
                                                <div className="d-flex align-items-center justify-content-center gap-2">
                                                    {!f.adminVoucher && (
                                                        <Button size="sm" variant="outline-secondary" className="rounded-pill p-1 px-2" href={`/api/fees/${f._id}/voucher`} target="_blank" rel="noopener noreferrer" title="View / Print Fee Voucher">
                                                            <i className="bi bi-printer"></i>
                                                        </Button>
                                                    )}
                                                    {f.status === 'Review' && (
                                                        <>
                                                            {f.parentReceipt && (
                                                                <Button size="sm" variant="outline-primary" className="rounded-pill p-1 px-2" onClick={() => handleViewVoucher(f.parentReceipt)} title="View Voucher">
                                                                    <i className="bi bi-eye-fill"></i>
                                                                </Button>
                                                            )}
                                                            {!f.parentReceipt && reviewablePaymentFor(f._id) && (
                                                                <Button size="sm" variant="outline-primary" className="rounded-pill p-1 px-2" onClick={() => openPayment(reviewablePaymentFor(f._id))} title="View Online Payment">
                                                                    <i className="bi bi-eye-fill"></i>
                                                                </Button>
                                                            )}
                                                            <Button size="sm" variant="success" className="rounded-pill p-1 px-2" onClick={() => handleApprove(f._id)} title="Approve Payment">
                                                                <i className="bi bi-check-lg"></i>
                                                            </Button>
                                                            <Button size="sm" variant="danger" className="rounded-pill p-1 px-2" onClick={() => handleReject(f._id)} title="Reject Payment">
                                                                <i className="bi bi-x-lg"></i>
                                                            </Button>
                                                        </>
                                                    )}
                                               
                                                </div>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="6" className="text-center py-5 text-muted">
                                                No fee records match your current filters.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </Table>
                        </div>
                    </Card.Body>
                </Card>
                </>)}

                {/* Payment Details Modal */}
                <Modal show={!!selectedPayment} onHide={() => !processing && setSelectedPayment(null)} centered>
                    <Modal.Header closeButton={!processing} className="border-0 pb-0">
                        <Modal.Title className="fw-bold">Payment Details</Modal.Title>
                    </Modal.Header>
                    {selectedPayment && (
                        <Modal.Body className="p-4">
                            {paymentError && <Alert variant="danger" className="small py-2">{paymentError}</Alert>}
                            <div className="bg-light rounded-3 p-3 small mb-3">
                                {[
                                    ['Transaction ID', selectedPayment.transactionId],
                                    ['Student', selectedPayment.studentName],
                                    ['Parent', `${selectedPayment.parentName} (${selectedPayment.parentEmail})`],
                                    ['Voucher No.', selectedPayment.voucher?.voucherNumber],
                                    ['Fee Month', selectedPayment.voucher ? `${selectedPayment.voucher.month} ${selectedPayment.voucher.year}` : '—'],
                                    ['Voucher Amount', selectedPayment.voucher ? `Rs ${selectedPayment.voucher.amount.toLocaleString()}` : '—'],
                                    ['Paid Amount', `Rs ${selectedPayment.amount.toLocaleString()}`],
                                    ['Method', `${selectedPayment.paymentMethod}${selectedPayment.accountLast4 ? ` (•••• ${selectedPayment.accountLast4})` : ''}`],
                                    ['Account Holder', selectedPayment.accountHolder || '—'],
                                    ['Date', new Date(selectedPayment.createdAt).toLocaleString()],
                                    ['Voucher Status', selectedPayment.voucher?.status === 'Pending' ? 'Unpaid' : selectedPayment.voucher?.status],
                                ].map(([label, value]) => (
                                    <div key={label} className="d-flex justify-content-between mb-1 gap-3">
                                        <span className="text-muted">{label}</span>
                                        <span className="fw-bold text-end">{value}</span>
                                    </div>
                                ))}
                                <div className="d-flex justify-content-between align-items-center mt-2">
                                    <span className="text-muted">Payment Status</span>
                                    {paymentBadge(selectedPayment.status)}
                                </div>
                            </div>

                            {selectedPayment.status === 'Successful' && (
                                <p className="small text-info mb-3">
                                    <i className="bi bi-hourglass-split me-2"></i>
                                    Paid online on {new Date(selectedPayment.createdAt).toLocaleString()}. Approve to mark the voucher Paid, or reject if the payment can't be verified.
                                </p>
                            )}
                            {selectedPayment.status === 'Failed' && (
                                <p className="small text-danger mb-0">
                                    <i className="bi bi-x-circle-fill me-2"></i>
                                    Payment failed: {selectedPayment.failureReason}
                                </p>
                            )}
                            {selectedPayment.status === 'Approved' && (
                                <p className="small text-success mb-0">
                                    <i className="bi bi-check-circle-fill me-2"></i>
                                    Approved by {selectedPayment.approvedBy || "admin"} on {new Date(selectedPayment.approvedAt).toLocaleString()}
                                </p>
                            )}
                            {selectedPayment.status === 'Rejected' && (
                                <div className="small text-danger">
                                    <i className="bi bi-x-circle-fill me-2"></i>
                                    Rejected by {selectedPayment.rejectedBy || "admin"} on {new Date(selectedPayment.rejectedAt).toLocaleString()}
                                    {selectedPayment.rejectionReason && <div className="mt-1">Reason: {selectedPayment.rejectionReason}</div>}
                                </div>
                            )}

                            {isReviewable(selectedPayment) && (
                                <>
                                    <Form.Group className="mb-3">
                                        <Form.Label className="small fw-bold">Rejection Reason (optional)</Form.Label>
                                        <Form.Control
                                            as="textarea"
                                            rows={2}
                                            maxLength={500}
                                            placeholder="e.g. Transaction could not be verified"
                                            value={rejectReason}
                                            onChange={(e) => setRejectReason(e.target.value)}
                                        />
                                    </Form.Group>
                                    <div className="d-flex gap-2">
                                        <Button variant="success" className="flex-fill rounded-pill fw-bold" disabled={processing} onClick={() => handlePaymentAction('approve')}>
                                            <i className="bi bi-check-lg me-2"></i>Approve
                                        </Button>
                                        <Button variant="danger" className="flex-fill rounded-pill fw-bold" disabled={processing} onClick={() => handlePaymentAction('reject')}>
                                            <i className="bi bi-x-lg me-2"></i>Reject
                                        </Button>
                                    </div>
                                </>
                            )}
                        </Modal.Body>
                    )}
                </Modal>

                {/* View Voucher Modal */}
                <Modal show={showViewModal} onHide={() => setShowViewModal(false)} size="lg" centered>
                    <Modal.Header closeButton className="border-0 pb-0">
                        <Modal.Title className="fw-bold">Payment Voucher Preview</Modal.Title>
                    </Modal.Header>
                    <Modal.Body className="text-center p-4">
                        {selectedVoucher ? (
                            <img 
                                src={selectedVoucher} 
                                alt="Payment Voucher" 
                                className="img-fluid rounded-3 shadow-sm border"
                                style={{ maxHeight: '70vh' }}
                                onError={(e) => {
                                    // Fallback if the path is slightly different
                                    if (!e.target.src.includes('/images/')) {
                                        e.target.src = e.target.src.replace('/uploads/', '/uploads/images/');
                                    }
                                }}
                            />
                        ) : (
                            <p className="text-muted">No voucher image available.</p>
                        )}
                    </Modal.Body>
                    <Modal.Footer className="border-0 pt-0 justify-content-center">
                        <Button variant="secondary" className="rounded-pill px-4" onClick={() => setShowViewModal(false)}>
                            Close Preview
                        </Button>
                    </Modal.Footer>
                </Modal>
            </Container>

            <style>
                {`
                    .custom-table thead th {
                        font-size: 0.72rem;
                        text-transform: uppercase;
                        letter-spacing: 0.8px;
                        font-weight: 700;
                        padding: 1.25rem 1rem;
                        border: none;
                    }
                    .custom-table tbody td {
                        padding: 1rem;
                        border-bottom: 1px solid #f1f5f9;
                    }
                    .custom-table tbody tr:last-child td {
                        border-bottom: none;
                    }
                `}
            </style>
        </Layout>
    );
};

export default AllFees;
