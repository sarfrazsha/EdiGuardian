import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Badge, Spinner, Alert, Modal, Form, Table } from 'react-bootstrap';
import { Navigate, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import PaymentModal from '../components/PaymentModal';
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
    const [historyFilter, setHistoryFilter] = useState('All');
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
    const isCompleted = (p) => p.status === 'Successful' || p.status === 'Approved';
    const completedPaymentFor = (feeId) => payments.find(p => p.voucher?._id === feeId && isCompleted(p));

    const visibleFeeIds = new Set(fees.map(f => f._id));
    const visiblePayments = payments.filter(p => p.voucher && visibleFeeIds.has(p.voucher._id));
    const filteredHistory = visiblePayments.filter(p =>
        historyFilter === 'All' ? true
            : historyFilter === 'Under Review' ? (p.status === 'Successful' || p.status === 'Pending')
                : historyFilter === 'Failed' ? (p.status === 'Failed' || p.status === 'Rejected')
                    : p.status === historyFilter);

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
        setShowPayModal(true);
    };

    // Called after every processed attempt (and on a 409, when the voucher
    // changed underneath us) so the cards and history stay current.
    const handlePaymentProcessed = () => {
        fetchPayments();
        fetchFees();
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
                            <p className="text-muted mb-0">View your fee vouchers and pay online.</p>
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
                                                {fee.discountAmount > 0 && (
                                                    <div className="small text-muted text-decoration-line-through">Rs {fee.originalAmount}</div>
                                                )}
                                                <h3 className="fw-bold text-dark mb-0">Rs {fee.amount}</h3>
                                                {fee.discountAmount > 0 && (
                                                    <Badge bg="success" className="bg-opacity-75">{fee.discountPercent}% discount</Badge>
                                                )}
                                                {fee.fineAmount > 0 && (
                                                    <div className="small text-danger mt-1" title={fee.fineReason}>
                                                        <i className="bi bi-exclamation-circle me-1"></i>incl. Rs {fee.fineAmount} fine{fee.fineReason ? ` (${fee.fineReason})` : ''}
                                                    </div>
                                                )}
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
                                            {fee.status !== 'Paid' && (latestPaymentFor(fee._id)?.failureReason || (latestPaymentFor(fee._id)?.status === 'Rejected' && latestPaymentFor(fee._id).rejectionReason)) && (
                                                <p className="small text-danger mb-0 mt-2">
                                                    <i className="bi bi-exclamation-circle me-2"></i>
                                                    Last attempt: {latestPaymentFor(fee._id).failureReason || latestPaymentFor(fee._id).rejectionReason}
                                                </p>
                                            )}
                                        </div>

                                        <div className="mt-auto pt-3 border-top d-flex flex-column gap-2">
                                            {fee.adminVoucher ? (
                                                <Button variant="outline-secondary" className="w-100 rounded-pill fw-bold" onClick={() => downloadFile(fee.adminVoucher)} title="Download / View Voucher">
                                                    <i className="bi bi-download me-2"></i>Download Fee Voucher
                                                </Button>
                                            ) : (
                                                <Button variant="outline-secondary" className="w-100 rounded-pill fw-bold" href={`/api/fees/${fee._id}/voucher`} target="_blank" rel="noopener noreferrer" title="View / Print Voucher">
                                                    <i className="bi bi-printer me-2"></i>View / Print Voucher
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
                                            {(fee.status === 'Paid' || fee.status === 'Review') && completedPaymentFor(fee._id) && (
                                                <Button variant="outline-success" className="w-100 rounded-pill fw-bold" onClick={() => handleViewReceipt(completedPaymentFor(fee._id)._id)}>
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
                            <div className="p-4 pb-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
                                <h5 className="fw-bold mb-0"><i className="bi bi-clock-history me-2 text-primary"></i>Payment History</h5>
                                <div className="d-flex gap-1 flex-wrap">
                                    {['All', 'Under Review', 'Approved', 'Failed'].map(f => (
                                        <Button key={f} size="sm" variant={historyFilter === f ? 'primary' : 'light'} className="rounded-pill px-3" onClick={() => setHistoryFilter(f)}>
                                            {f}
                                        </Button>
                                    ))}
                                </div>
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
                                        {filteredHistory.length > 0 ? filteredHistory.map(p => (
                                            <tr key={p._id}>
                                                <td className="ps-4 fw-bold small">{p.transactionId}</td>
                                                <td>
                                                    <div className="fw-bold">{p.voucher.month} {p.voucher.year}</div>
                                                    <div className="small text-muted">{p.studentName}</div>
                                                </td>
                                                <td className="fw-bold text-primary">Rs {p.amount.toLocaleString()}</td>
                                                <td className="small">
                                                    {p.paymentMethod}
                                                    {p.accountLast4 && <div className="text-muted">•••• {p.accountLast4}</div>}
                                                </td>
                                                <td className="text-center" style={{ maxWidth: '220px' }}>
                                                    {paymentBadge(p.status)}
                                                    {(p.failureReason || (p.status === 'Rejected' && p.rejectionReason)) && (
                                                        <div className="small text-danger mt-1">{p.failureReason || p.rejectionReason}</div>
                                                    )}
                                                </td>
                                                <td className="small">{new Date(p.createdAt).toLocaleString()}</td>
                                                <td className="text-center">
                                                    {isCompleted(p) ? (
                                                        <Button size="sm" variant="outline-success" className="rounded-pill px-3" onClick={() => handleViewReceipt(p._id)}>
                                                            <i className="bi bi-file-earmark-text me-1"></i>View Receipt
                                                        </Button>
                                                    ) : <span className="text-muted small">—</span>}
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr><td colSpan="7" className="text-center py-4 text-muted">{visiblePayments.length ? 'No payments match this filter.' : 'No online payments yet.'}</td></tr>
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

           
            <PaymentModal
                show={showPayModal}
                fee={selectedFee}
                parentName={localStorage.getItem('userName')}
                email={email}
                voucherNumber={selectedFee ? voucherNumber(selectedFee) : ''}
                onHide={() => setShowPayModal(false)}
                onPaid={handlePaymentProcessed}
                onViewReceipt={(paymentId) => { setShowPayModal(false); handleViewReceipt(paymentId); }}
            />

            <Modal show={!!receipt} onHide={() => setReceipt(null)} centered>
                <Modal.Header closeButton className="border-0 pb-0">
                    <Modal.Title className="fw-bold">Payment Receipt</Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4">
                    {receipt && (
                        <div id="payment-receipt">
                            <h2 className="fw-bold text-primary text-center mb-0">{receipt.school}</h2>
                            <p className="text-muted small text-center mb-1">Fee Payment Receipt</p>
                            <p className="text-center mb-3"><span className="badge bg-success rounded-pill px-3 py-2">PAYMENT SUCCESSFUL</span></p>
                            <table className="table table-sm small mb-0">
                                <tbody>
                                    <tr><td className="text-muted">Student Name</td><td className="text-end fw-bold">{receipt.studentName}</td></tr>
                                    <tr><td className="text-muted">Parent Name</td><td className="text-end fw-bold">{receipt.parentName}</td></tr>
                                    {receipt.classNo && <tr><td className="text-muted">Class</td><td className="text-end fw-bold">{receipt.classNo}</td></tr>}
                                    <tr><td className="text-muted">Voucher Number</td><td className="text-end fw-bold">{receipt.voucherNumber}</td></tr>
                                    <tr><td className="text-muted">Fee Month</td><td className="text-end fw-bold">{receipt.feeMonth}</td></tr>
                                    <tr><td className="text-muted">Amount</td><td className="text-end fw-bold">Rs {receipt.amount.toLocaleString()}</td></tr>
                                    <tr><td className="text-muted">Payment Method</td><td className="text-end fw-bold">{receipt.paymentMethod}{receipt.accountLast4 ? ` (•••• ${receipt.accountLast4})` : ''}</td></tr>
                                    {receipt.accountHolder && <tr><td className="text-muted">Account Holder</td><td className="text-end fw-bold">{receipt.accountHolder}</td></tr>}
                                    <tr><td className="text-muted">Transaction ID</td><td className="text-end fw-bold">{receipt.transactionId}</td></tr>
                                    <tr><td className="text-muted">Payment Date</td><td className="text-end fw-bold">{new Date(receipt.paymentDate).toLocaleString()}</td></tr>
                                    {receipt.voucherStatus && <tr><td className="text-muted">Verification</td><td className="text-end fw-bold">{receipt.voucherStatus}</td></tr>}
                                    {receipt.approvedBy && (
                                        <>
                                            <tr><td className="text-muted">Approval Date</td><td className="text-end fw-bold">{new Date(receipt.approvalDate).toLocaleString()}</td></tr>
                                            <tr><td className="text-muted">Approved By</td><td className="text-end fw-bold">{receipt.approvedBy}</td></tr>
                                        </>
                                    )}
                                </tbody>
                            </table>
                            <p className="paid text-success fw-bold fs-4 text-center mt-3 mb-0">Status: {receipt.status}</p>
                            <p className="text-muted text-center mt-3 mb-0" style={{ fontSize: '0.7rem' }}>This is a computer-generated receipt and does not require a signature.</p>
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
