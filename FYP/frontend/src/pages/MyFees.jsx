import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Badge, Spinner, Alert, Modal, Form, Table } from 'react-bootstrap';
import { Navigate, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Axios from 'axios';

const MyFees = () => {
    const navigate = useNavigate();
    const role = localStorage.getItem('userRole');
    const email = localStorage.getItem('userEmail');

    if (!email || (role?.toLowerCase() !== 'parent')) {
        return <Navigate to="/" replace />;
    }

    const [fees, setFees] = useState([]);
    const [allFees, setAllFees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    
    const [showPayModal, setShowPayModal] = useState(false);
    const [payments, setPayments] = useState([]);
    const [payMethod, setPayMethod] = useState('Mock Card');
    const [payForm, setPayForm] = useState({ holder: '', number: '', expiry: '', secret: '' });
    const [paying, setPaying] = useState(false);
    const [payError, setPayError] = useState(null);
    const [submittedPayment, setSubmittedPayment] = useState(null);
    const [receipt, setReceipt] = useState(null);

    const [showUploadModal, setShowUploadModal] = useState(false);
    const [selectedFee, setSelectedFee] = useState(null);
    const [uploadReceiptFile, setUploadReceiptFile] = useState(null);
    const [uploadingReceipt, setUploadingReceipt] = useState(false);
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

    const downloadFile = async (filename) => {
        try {
            const response = await fetch(`/uploads/${filename}`);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename.split('/').pop()); // Extract filename from path
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Download failed:", error);
            alert("Failed to download file.");
        }
    };

    const fetchFees = async () => {
        try {
            setLoading(true);
            const res = await Axios.get(`/api/fees?role=parent&email=${email}`);
            setAllFees(res.data);
            setLoading(false);
        } catch (err) {
            console.error("Failed to fetch fees", err);
            setError("Failed to load fee alerts. Please try again.");
            setLoading(false);
        }
    };

    const fetchPayments = async () => {
        try {
            const res = await Axios.get(`/api/payments/my?role=parent&email=${email}`);
            setPayments(res.data);
        } catch (err) {
            console.error("Failed to fetch payments", err);
        }
    };

    useEffect(() => {
        fetchFees();
        fetchPayments();
    }, []);

    // Most recent payment for a voucher (payments arrive newest first)
    const latestPaymentFor = (feeId) => payments.find(p => p.voucher?._id === feeId);

    const visibleFeeIds = new Set(fees.map(f => f._id));
    const visiblePayments = payments.filter(p => p.voucher && visibleFeeIds.has(p.voucher._id));

    const voucherNumber = (fee) => `VCH-${fee._id.slice(-8).toUpperCase()}`;

    useEffect(() => {
        if (role?.toLowerCase() === 'parent') {
            const selectedChildId = localStorage.getItem('selectedChildId');
            const storedChildren = localStorage.getItem('parentChildren');
            if (selectedChildId && storedChildren) {
                try {
                    const parsed = JSON.parse(storedChildren);
                    const selectedChild = parsed.find(c => c.id === selectedChildId);
                    if (selectedChild) {
                        setFees(allFees.filter(f => f.studentName === selectedChild.name));
                        return;
                    }
                } catch (e) {
                    console.error(e);
                }
            }
        }
        setFees(allFees);
    }, [allFees, role]);

    const handlePayClick = (fee) => {
        setSelectedFee(fee);
        setPayMethod('Mock Card');
        setPayForm({ holder: '', number: '', expiry: '', secret: '' });
        setPayError(null);
        setSubmittedPayment(null);
        setShowPayModal(true);
    };

    const closePayModal = () => {
        if (paying) return;
        setShowPayModal(false);
        setSubmittedPayment(null);
    };

    const handlePaySubmit = async (e) => {
        e.preventDefault();
        setPayError(null);
        const digits = payForm.number.replace(/\D/g, '');
        if (payMethod === 'Mock Card') {
            if (digits.length !== 16) return setPayError('Enter a 16-digit dummy card number.');
            if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(payForm.expiry)) return setPayError('Enter expiry as MM/YY.');
            if (!/^\d{3}$/.test(payForm.secret)) return setPayError('Enter a 3-digit dummy CVV.');
        } else {
            if (!/^03\d{9}$/.test(digits)) return setPayError('Enter an 11-digit dummy mobile number (03XXXXXXXXX).');
            if (!/^\d{4,5}$/.test(payForm.secret)) return setPayError('Enter a 4-5 digit dummy PIN.');
        }

        setPaying(true);
        try {
            // CVV / PIN are validated here only and never sent to the server.
            const res = await Axios.post('/api/payments', {
                role: 'parent',
                email,
                voucherId: selectedFee._id,
                amount: selectedFee.amount,
                paymentMethod: payMethod,
                accountNumber: digits
            });
            setSubmittedPayment(res.data.payment);
            fetchPayments();
            fetchFees();
        } catch (err) {
            setPayError(err.response?.data?.message || 'Payment submission failed. Please try again.');
        } finally {
            setPaying(false);
        }
    };

    const handleViewReceipt = async (paymentId) => {
        try {
            const res = await Axios.get(`/api/payments/${paymentId}/receipt?role=parent&email=${email}`);
            setReceipt(res.data);
        } catch (err) {
            alert(err.response?.data?.message || 'Receipt is not available.');
        }
    };

    const printReceipt = () => {
        const el = document.getElementById('payment-receipt');
        if (!el) return;
        const win = window.open('', '_blank', 'width=700,height=800');
        win.document.write(`<html><head><title>Receipt ${receipt.transactionId}</title>
            <style>body{font-family:Arial,sans-serif;padding:32px;color:#1e293b}
            table{width:100%;border-collapse:collapse}td{padding:8px 4px;border-bottom:1px solid #e2e8f0}
            td:first-child{color:#64748b}td:last-child{text-align:right;font-weight:bold}
            h2,p{text-align:center;margin:4px 0}.paid{color:#16a34a;font-size:22px;text-align:center;margin-top:16px;font-weight:bold}</style></head>
            <body>${el.innerHTML}</body></html>`);
        win.document.close();
        win.focus();
        win.print();
    };

    const paymentBadge = (status) => {
        const color = status === 'Approved' ? 'success' : status === 'Rejected' ? 'danger' : 'warning';
        return <Badge bg={color} className={`bg-opacity-10 text-${color} px-3 py-2 rounded-pill`}>{status}</Badge>;
    };

    const handleUploadClick = (fee) => {
        setSelectedFee(fee);
        setUploadReceiptFile(null);
        setShowUploadModal(true);
    };

    const handleUploadSubmit = async (e) => {
        e.preventDefault();
        if (!uploadReceiptFile) return;

        if (uploadReceiptFile.size > MAX_FILE_SIZE) {
            setError('System supports only up to 10 MB for uploads.');
            return;
        }

        setUploadingReceipt(true);
        try {
            const data = new FormData();
            data.append("parentReceipt", uploadReceiptFile);
            
            await Axios.put(`/api/fees/${selectedFee._id}/upload-receipt`, data);
            
            setShowUploadModal(false);
            setUploadReceiptFile(null);
            setSelectedFee(null);
            fetchFees();
        } catch (err) {
            console.error(err);
            alert('Failed to upload receipt');
        } finally {
            setUploadingReceipt(false);
        }
    };

    const isOverdue = (dateString) => {
        return new Date(dateString) < new Date();
    };

    return (
        <Layout>
            <Container fluid className="py-4">
                <div className="mb-4 d-flex justify-content-between align-items-center">
                    <div className="d-flex align-items-center gap-3">
                        <div>
                            <Button
                                variant="light"
                                className="rounded-circle shadow-sm border p-0 d-flex align-items-center justify-content-center"
                                style={{ width: '40px', height: '40px' }}
                                onClick={() => navigate(-1)}
                                title="Go Back"
                            >
                                <i className="bi bi-arrow-left fs-5"></i>
                            </Button>
                        </div>
                        <div>
                            <h2 className="fw-bold text-dark mb-0">My Fees & Invoices</h2>
                            <p className="text-muted mb-0">View pending fees and pay online (simulated).</p>
                        </div>
                    </div>
                </div>

                {error && <Alert variant="danger">{error}</Alert>}

                {loading ? (
                    <div className="text-center py-5">
                        <Spinner animation="border" variant="primary" />
                        <p className="mt-3 text-muted">Loading your fee records...</p>
                    </div>
                ) : (
                    <Row className="g-4">
                        {fees.length > 0 ? fees.map((fee) => (
                            <Col md={6} lg={4} key={fee._id}>
                                <Card className={`border-0 shadow-sm rounded-4 h-100 ${fee.status === 'Pending' && isOverdue(fee.dueDate) ? 'border-start border-danger border-4' : ''}`}>
                                    <Card.Body className="p-4 d-flex flex-column">
                                        <div className="d-flex justify-content-between align-items-start mb-3">
                                            <div>
                                                <Badge bg="primary" className="bg-opacity-10 text-primary mb-2 px-3 py-2 rounded-pill border border-primary border-opacity-25">
                                                    {fee.month} Fee
                                                </Badge>
                                                <h5 className="fw-bold mb-1">{fee.studentName}</h5>
                                            </div>
                                            <div className="text-end">
                                                <h3 className="fw-bold text-dark mb-0">Rs {fee.amount}</h3>
                                            </div>
                                        </div>

                                        <div className="mb-4">
                                            <p className="small text-muted mb-1">
                                                <i className="bi bi-calendar-event me-2"></i>
                                                Due Date: <span className="fw-bold text-dark">{new Date(fee.dueDate).toLocaleDateString()}</span>
                                            </p>
                                            <p className="small text-muted mb-0">
                                                <i className="bi bi-info-circle me-2"></i>
                                                Status:
                                                {fee.status === 'Paid' && <span className="text-success fw-bold ms-1">Paid</span>}
                                                {fee.status === 'Review' && <span className="text-info fw-bold ms-1">In Review</span>}
                                                {fee.status === 'Pending' && <span className={`${isOverdue(fee.dueDate) ? 'text-danger' : 'text-warning'} fw-bold ms-1`}>{isOverdue(fee.dueDate) ? 'Overdue' : 'Unpaid'}</span>}
                                            </p>
                                            {latestPaymentFor(fee._id) && (
                                                <p className="small text-muted mb-0 mt-2">
                                                    <i className="bi bi-receipt me-2"></i>
                                                    Payment Status: <span className="ms-1">{paymentBadge(latestPaymentFor(fee._id).status)}</span>
                                                </p>
                                            )}
                                            {latestPaymentFor(fee._id)?.status === 'Rejected' && latestPaymentFor(fee._id).rejectionReason && (
                                                <p className="small text-danger mb-0 mt-2">
                                                    <i className="bi bi-exclamation-circle me-2"></i>
                                                    Reason: {latestPaymentFor(fee._id).rejectionReason}
                                                </p>
                                            )}
                                        </div>

                                        <div className="mt-auto pt-3 border-top d-flex flex-column gap-2">
                                            {fee.adminVoucher && (
                                                <Button variant="outline-secondary" className="w-100 rounded-pill fw-bold" onClick={() => downloadFile(fee.adminVoucher)} title="Download / View Voucher">
                                                    <i className="bi bi-download me-2"></i>Download Fee Voucher
                                                </Button>
                                            )}
                                            {fee.status === 'Pending' && latestPaymentFor(fee._id)?.status === 'Pending' && (
                                                <Button variant="warning" className="w-100 rounded-pill text-white fw-bold" disabled>
                                                    <i className="bi bi-hourglass-split me-2"></i>Payment Awaiting Approval
                                                </Button>
                                            )}
                                            {fee.status === 'Pending' && latestPaymentFor(fee._id)?.status !== 'Pending' && (
                                                <>
                                                    <Button
                                                        variant="primary"
                                                        className="w-100 rounded-pill fw-bold"
                                                        onClick={() => handlePayClick(fee)}
                                                    >
                                                        <i className="bi bi-credit-card-fill me-2"></i>Pay Now
                                                    </Button>
                                                    <Button
                                                        variant="outline-primary"
                                                        className="w-100 rounded-pill fw-bold"
                                                        onClick={() => handleUploadClick(fee)}
                                                    >
                                                        <i className="bi bi-upload me-2"></i>Upload Bank Receipt
                                                    </Button>
                                                </>
                                            )}
                                            {fee.status === 'Review' && (
                                                <Button variant="info" className="w-100 rounded-pill text-white fw-bold bg-opacity-75" disabled>
                                                    <i className="bi bi-hourglass-split me-2"></i>In Review
                                                </Button>
                                            )}
                                            {fee.status === 'Paid' && (
                                                <Button variant="light" className="w-100 rounded-pill text-success fw-bold" disabled>
                                                    <i className="bi bi-check-circle-fill me-2"></i>Payment Complete
                                                </Button>
                                            )}
                                            {fee.status === 'Paid' && latestPaymentFor(fee._id)?.status === 'Approved' && (
                                                <Button variant="outline-success" className="w-100 rounded-pill fw-bold" onClick={() => handleViewReceipt(latestPaymentFor(fee._id)._id)}>
                                                    <i className="bi bi-file-earmark-text me-2"></i>View Receipt
                                                </Button>
                                            )}
                                        </div>
                                    </Card.Body>
                                </Card>
                            </Col>
                        )) : (
                            <Col>
                                <div className="text-center py-5 bg-white rounded-4 shadow-sm">
                                    <i className="bi bi-emoji-smile text-success display-1 mb-3 d-block"></i>
                                    <h4 className="fw-bold">All Caught Up!</h4>
                                    <p className="text-muted">You have no pending fees or invoices at this time.</p>
                                </div>
                            </Col>
                        )}
                    </Row>
                )}

                {!loading && (
                    <Card className="border-0 shadow-sm rounded-4 overflow-hidden mt-5">
                        <Card.Body className="p-0">
                            <div className="p-4 pb-3">
                                <h5 className="fw-bold mb-0"><i className="bi bi-clock-history me-2 text-primary"></i>Payment History</h5>
                            </div>
                            <div className="table-responsive">
                                <Table hover className="align-middle mb-0">
                                    <thead className="bg-light text-secondary small">
                                        <tr>
                                            <th className="ps-4">Transaction ID</th>
                                            <th>Voucher</th>
                                            <th>Amount</th>
                                            <th>Method</th>
                                            <th className="text-center">Status</th>
                                            <th>Date</th>
                                            <th className="text-center">Receipt</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {visiblePayments.length > 0 ? visiblePayments.map(p => (
                                            <tr key={p._id}>
                                                <td className="ps-4 fw-bold small">{p.transactionId}</td>
                                                <td>
                                                    <div className="fw-bold">{p.voucher.month} Fee</div>
                                                    <div className="small text-muted">{p.studentName}</div>
                                                </td>
                                                <td className="fw-bold text-primary">Rs {p.amount.toLocaleString()}</td>
                                                <td className="small">{p.paymentMethod.replace('Mock ', '')}</td>
                                                <td className="text-center">
                                                    {paymentBadge(p.status)}
                                                    {p.status === 'Rejected' && p.rejectionReason && (
                                                        <div className="small text-danger mt-1">{p.rejectionReason}</div>
                                                    )}
                                                </td>
                                                <td className="small">{new Date(p.createdAt).toLocaleDateString()}</td>
                                                <td className="text-center">
                                                    {p.status === 'Approved' ? (
                                                        <Button size="sm" variant="outline-success" className="rounded-pill px-3" onClick={() => handleViewReceipt(p._id)}>
                                                            <i className="bi bi-file-earmark-text me-1"></i>View Receipt
                                                        </Button>
                                                    ) : <span className="text-muted small">—</span>}
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr><td colSpan="7" className="text-center py-4 text-muted">No online payments yet.</td></tr>
                                        )}
                                    </tbody>
                                </Table>
                            </div>
                        </Card.Body>
                    </Card>
                )}
            </Container>

           
            <Modal show={showUploadModal} onHide={() => !uploadingReceipt && setShowUploadModal(false)} centered backdrop="static">
                <Modal.Header closeButton={!uploadingReceipt} className="border-0 pb-0">
                    <Modal.Title className="fw-bold">Upload Bank Receipt</Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4">
                    <div className="text-center mb-4">
                        <i className="bi bi-cloud-arrow-up text-primary" style={{ fontSize: '3rem' }}></i>
                        <p className="text-muted small mt-2">Uploading receipt for {selectedFee?.studentName} ({selectedFee?.month})</p>
                    </div>
                    <Form onSubmit={handleUploadSubmit}>
                        <Form.Group className="mb-4">
                            <Form.Label className="small fw-bold">Select Image/PDF of Paid Slip</Form.Label>
                            <Form.Control
                                required
                                type="file"
                                accept="image/*,.pdf"
                                onChange={(e) => {
                                    const file = e.target.files[0];
                                    if (file) {
                                        if (file.size > MAX_FILE_SIZE) {
                                            setError('System supports only up to 10 MB for uploads.');
                                            setUploadReceiptFile(null);
                                            e.target.value = '';
                                            return;
                                        }
                                        setError(null);
                                        setUploadReceiptFile(file);
                                    }
                                }}
                            />
                            <Form.Text className="text-muted small">Accepted: images or PDF. Maximum size 10 MB.</Form.Text>
                        </Form.Group>
                        <Button type="submit" variant="primary" className="w-100 rounded-pill fw-bold py-2 mt-2" disabled={uploadingReceipt || !uploadReceiptFile}>
                            {uploadingReceipt ? <Spinner size="sm" className="me-2" /> : <i className="bi bi-check2-circle me-2"></i>}
                            {uploadingReceipt ? 'Uploading...' : 'Submit Receipt'}
                        </Button>
                    </Form>
                </Modal.Body>
            </Modal>

           
            <Modal show={showPayModal} onHide={closePayModal} centered backdrop="static">
                <Modal.Header closeButton={!paying} className="border-0 pb-0">
                    <Modal.Title className="fw-bold">{submittedPayment ? 'Payment Submitted' : 'Mock Online Payment'}</Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4">
                    {submittedPayment ? (
                        <div className="text-center">
                            <i className="bi bi-hourglass-split text-warning" style={{ fontSize: '3.5rem' }}></i>
                            <h5 className="fw-bold mt-3">Payment submitted successfully.</h5>
                            <p className="text-muted">Your payment is waiting for admin approval.</p>
                            <div className="bg-light rounded-3 p-3 text-start small mb-3">
                                <div className="d-flex justify-content-between mb-1"><span className="text-muted">Transaction ID</span><span className="fw-bold">{submittedPayment.transactionId}</span></div>
                                <div className="d-flex justify-content-between mb-1"><span className="text-muted">Amount</span><span className="fw-bold">Rs {submittedPayment.amount.toLocaleString()}</span></div>
                                <div className="d-flex justify-content-between align-items-center"><span className="text-muted">Payment Status</span>{paymentBadge(submittedPayment.status)}</div>
                            </div>
                            <Button variant="primary" className="w-100 rounded-pill fw-bold" onClick={closePayModal}>Done</Button>
                        </div>
                    ) : selectedFee && (
                        <>
                            <div className="text-center mb-3">
                                <i className="bi bi-wallet2 text-primary" style={{ fontSize: '2.5rem' }}></i>
                                <h4 className="fw-bold mt-1 mb-0">Rs {selectedFee.amount.toLocaleString()}</h4>
                            </div>
                            <div className="bg-light rounded-3 p-3 small mb-3">
                                <div className="d-flex justify-content-between mb-1"><span className="text-muted">Student</span><span className="fw-bold">{selectedFee.studentName}</span></div>
                                <div className="d-flex justify-content-between mb-1"><span className="text-muted">Parent</span><span className="fw-bold">{localStorage.getItem('userName')}</span></div>
                                <div className="d-flex justify-content-between mb-1"><span className="text-muted">Voucher No.</span><span className="fw-bold">{voucherNumber(selectedFee)}</span></div>
                                <div className="d-flex justify-content-between mb-1"><span className="text-muted">Fee Month</span><span className="fw-bold">{selectedFee.month} {selectedFee.year}</span></div>
                                <div className="d-flex justify-content-between"><span className="text-muted">Due Date</span><span className="fw-bold">{new Date(selectedFee.dueDate).toLocaleDateString()}</span></div>
                            </div>

                            <Alert variant="info" className="small py-2">
                                <i className="bi bi-info-circle me-2"></i>Simulated payment for demonstration. Use dummy details only — no real money is charged.
                            </Alert>
                            {payError && <Alert variant="danger" className="small py-2">{payError}</Alert>}

                            <Form onSubmit={handlePaySubmit}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="small fw-bold">Payment Method</Form.Label>
                                    <div className="d-flex gap-2">
                                        {['Mock Card', 'Mock JazzCash', 'Mock Easypaisa'].map(m => (
                                            <Button key={m} type="button" size="sm"
                                                variant={payMethod === m ? 'primary' : 'outline-secondary'}
                                                className="flex-fill rounded-pill"
                                                onClick={() => { setPayMethod(m); setPayForm({ holder: '', number: '', expiry: '', secret: '' }); setPayError(null); }}>
                                                {m}
                                            </Button>
                                        ))}
                                    </div>
                                </Form.Group>

                                <Form.Group className="mb-2">
                                    <Form.Label className="small fw-bold">{payMethod === 'Mock Card' ? 'Card Holder Name' : 'Account Holder Name'}</Form.Label>
                                    <Form.Control required value={payForm.holder} onChange={e => setPayForm({ ...payForm, holder: e.target.value })} placeholder="Test User" />
                                </Form.Group>

                                {payMethod === 'Mock Card' ? (
                                    <>
                                        <Form.Group className="mb-2">
                                            <Form.Label className="small fw-bold">Dummy Card Number</Form.Label>
                                            <Form.Control required inputMode="numeric" autoComplete="off" maxLength={19} value={payForm.number} onChange={e => setPayForm({ ...payForm, number: e.target.value })} placeholder="4242 4242 4242 4242" />
                                        </Form.Group>
                                        <Row className="g-2 mb-3">
                                            <Col>
                                                <Form.Label className="small fw-bold">Expiry (MM/YY)</Form.Label>
                                                <Form.Control required autoComplete="off" maxLength={5} value={payForm.expiry} onChange={e => setPayForm({ ...payForm, expiry: e.target.value })} placeholder="12/30" />
                                            </Col>
                                            <Col>
                                                <Form.Label className="small fw-bold">Dummy CVV</Form.Label>
                                                <Form.Control required type="password" inputMode="numeric" autoComplete="off" maxLength={3} value={payForm.secret} onChange={e => setPayForm({ ...payForm, secret: e.target.value })} placeholder="123" />
                                            </Col>
                                        </Row>
                                    </>
                                ) : (
                                    <>
                                        <Form.Group className="mb-2">
                                            <Form.Label className="small fw-bold">Dummy {payMethod.replace('Mock ', '')} Mobile Number</Form.Label>
                                            <Form.Control required inputMode="numeric" autoComplete="off" maxLength={11} value={payForm.number} onChange={e => setPayForm({ ...payForm, number: e.target.value })} placeholder="03001234567" />
                                        </Form.Group>
                                        <Form.Group className="mb-3">
                                            <Form.Label className="small fw-bold">Dummy MPIN</Form.Label>
                                            <Form.Control required type="password" inputMode="numeric" autoComplete="off" maxLength={5} value={payForm.secret} onChange={e => setPayForm({ ...payForm, secret: e.target.value })} placeholder="1234" />
                                        </Form.Group>
                                    </>
                                )}

                                <Button type="submit" variant="primary" className="w-100 rounded-pill fw-bold py-2" disabled={paying}>
                                    {paying ? <Spinner size="sm" className="me-2" /> : <i className="bi bi-shield-check me-2"></i>}
                                    {paying ? 'Submitting...' : 'Submit Payment'}
                                </Button>
                            </Form>
                        </>
                    )}
                </Modal.Body>
            </Modal>

            <Modal show={!!receipt} onHide={() => setReceipt(null)} centered>
                <Modal.Header closeButton className="border-0 pb-0">
                    <Modal.Title className="fw-bold">Payment Receipt</Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4">
                    {receipt && (
                        <div id="payment-receipt">
                            <h2 className="fw-bold text-primary text-center mb-0">{receipt.school}</h2>
                            <p className="text-muted small text-center mb-3">Fee Payment Receipt</p>
                            <table className="table table-sm small mb-0">
                                <tbody>
                                    <tr><td className="text-muted">Student Name</td><td className="text-end fw-bold">{receipt.studentName}</td></tr>
                                    <tr><td className="text-muted">Parent Name</td><td className="text-end fw-bold">{receipt.parentName}</td></tr>
                                    <tr><td className="text-muted">Voucher Number</td><td className="text-end fw-bold">{receipt.voucherNumber}</td></tr>
                                    <tr><td className="text-muted">Fee Month</td><td className="text-end fw-bold">{receipt.feeMonth}</td></tr>
                                    <tr><td className="text-muted">Amount</td><td className="text-end fw-bold">Rs {receipt.amount.toLocaleString()}</td></tr>
                                    <tr><td className="text-muted">Payment Method</td><td className="text-end fw-bold">{receipt.paymentMethod}</td></tr>
                                    <tr><td className="text-muted">Transaction ID</td><td className="text-end fw-bold">{receipt.transactionId}</td></tr>
                                    <tr><td className="text-muted">Payment Date</td><td className="text-end fw-bold">{new Date(receipt.paymentDate).toLocaleString()}</td></tr>
                                    <tr><td className="text-muted">Approval Date</td><td className="text-end fw-bold">{new Date(receipt.approvalDate).toLocaleString()}</td></tr>
                                    <tr><td className="text-muted">Approved By</td><td className="text-end fw-bold">{receipt.approvedBy}</td></tr>
                                </tbody>
                            </table>
                            <p className="paid text-success fw-bold fs-4 text-center mt-3 mb-0">Status: {receipt.status}</p>
                            <p className="text-muted text-center mt-3 mb-0" style={{ fontSize: '0.7rem' }}>Simulated payment for academic demonstration. No real money was transferred.</p>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer className="border-0 pt-0">
                    <Button variant="outline-secondary" className="rounded-pill px-4" onClick={() => setReceipt(null)}>Close</Button>
                    <Button variant="primary" className="rounded-pill px-4 fw-bold" onClick={printReceipt}>
                        <i className="bi bi-printer me-2"></i>Print / Download
                    </Button>
                </Modal.Footer>
            </Modal>
        </Layout>
    );
};

export default MyFees;
