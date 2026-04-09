import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Badge, Spinner, Alert, Modal, Form } from 'react-bootstrap';
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
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Payment Modal State
    const [showPayModal, setShowPayModal] = useState(false);
    // Upload Receipt Modal State
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [selectedFee, setSelectedFee] = useState(null);
    const [uploadReceiptFile, setUploadReceiptFile] = useState(null);
    const [uploadingReceipt, setUploadingReceipt] = useState(false);

    const downloadFile = async (filename) => {
        try {
            const response = await fetch(`http://localhost:8080/uploads/${filename}`);
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
            const res = await Axios.get(`http://localhost:8080/api/fees?role=parent&email=${email}`);
            setFees(res.data);
            setLoading(false);
        } catch (err) {
            console.error("Failed to fetch fees", err);
            setError("Failed to load fee alerts. Please try again.");
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFees();
    }, []);

    const handlePayClick = (fee) => {
        setSelectedFee(fee);
        setShowPayModal(true);
    };

    const handleUploadClick = (fee) => {
        setSelectedFee(fee);
        setUploadReceiptFile(null);
        setShowUploadModal(true);
    };

    const handleUploadSubmit = async (e) => {
        e.preventDefault();
        if (!uploadReceiptFile) return;

        setUploadingReceipt(true);
        try {
            const data = new FormData();
            data.append("parentReceipt", uploadReceiptFile);
            
            await Axios.put(`http://localhost:8080/api/fees/${selectedFee._id}/upload-receipt`, data);
            
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
                        <div className="d-flex gap-2">
                            <Button
                                variant="light"
                                className="rounded-circle shadow-sm border p-0 d-flex align-items-center justify-content-center"
                                style={{ width: '40px', height: '40px' }}
                                onClick={() => navigate(-1)}
                                title="Go Back"
                            >
                                <i className="bi bi-arrow-left fs-5"></i>
                            </Button>
                            <Button
                                variant="light"
                                className="rounded-circle shadow-sm border p-0 d-flex align-items-center justify-content-center"
                                style={{ width: '40px', height: '40px' }}
                                onClick={() => navigate(1)}
                                title="Go Forward"
                            >
                                <i className="bi bi-arrow-right fs-5"></i>
                            </Button>
                        </div>
                        <div>
                            <h2 className="fw-bold text-dark mb-0">My Fees & Invoices</h2>
                            <p className="text-muted mb-0">View pending fees and securely pay online.</p>
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
                                                {fee.status === 'Pending' && <span className={`${isOverdue(fee.dueDate) ? 'text-danger' : 'text-warning'} fw-bold ms-1`}>{isOverdue(fee.dueDate) ? 'Overdue' : 'Pending'}</span>}
                                            </p>
                                        </div>

                                        <div className="mt-auto pt-3 border-top d-flex flex-column gap-2">
                                            {fee.adminVoucher && (
                                                <Button variant="outline-secondary" className="w-100 rounded-pill fw-bold" onClick={() => downloadFile(fee.adminVoucher)} title="Download / View Voucher">
                                                    <i className="bi bi-download me-2"></i>Download Fee Voucher
                                                </Button>
                                            )}
                                            {fee.status === 'Pending' && (
                                                <>
                                                    <Button
                                                        variant="primary"
                                                        className="w-100 rounded-pill fw-bold"
                                                        onClick={() => handlePayClick(fee)}
                                                    >
                                                        <i className="bi bi-credit-card-fill me-2"></i>Pay via Cashmaal
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
            </Container>

            {/* Upload Receipt Modal */}
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
                                        setUploadReceiptFile(file);
                                    }
                                }}
                            />
                        </Form.Group>
                        <Button type="submit" variant="primary" className="w-100 rounded-pill fw-bold py-2 mt-2" disabled={uploadingReceipt || !uploadReceiptFile}>
                            {uploadingReceipt ? <Spinner size="sm" className="me-2" /> : <i className="bi bi-check2-circle me-2"></i>}
                            {uploadingReceipt ? 'Uploading...' : 'Submit Receipt'}
                        </Button>
                    </Form>
                </Modal.Body>
            </Modal>

            {/* Payment Verification Modal */}
            <Modal show={showPayModal} onHide={() => setShowPayModal(false)} centered backdrop="static">
                <Modal.Header closeButton className="border-0 pb-0">
                    <Modal.Title className="fw-bold">Pay With Cashmaal</Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4">
                    <div className="text-center mb-4">
                        <i className="bi bi-wallet2 text-primary" style={{ fontSize: '3rem' }}></i>
                        <h4 className="fw-bold mt-2">Rs {selectedFee?.amount}</h4>
                        <p className="text-muted small">Paying for {selectedFee?.studentName} ({selectedFee?.month})</p>
                    </div>

                    <form action="https://cmaal.com/Pay/" method="POST">
                        <input type="hidden" name="pay_method" value="" />
                        <input type="hidden" name="amount" value={selectedFee?.amount || 0} />
                        <input type="hidden" name="currency" value="PKR" />
                        <input type="hidden" name="succes_url" value={`${window.location.origin}/payment-success?fee_id=${selectedFee?._id}`} />
                        <input type="hidden" name="cancel_url" value={`${window.location.origin}/my-fees`} />
                        <input type="hidden" name="client_email" value={email} />
                        <input type="hidden" name="web_id" value="2" />
                        <input type="hidden" name="order_id" value={selectedFee?._id || ''} />
                        <input type="hidden" name="addi_info" value={`Fee payment for ${selectedFee?.studentName} - ${selectedFee?.month}`} />

                        <button type="submit" className="btn btn-primary w-100 rounded-pill fw-bold py-3 mt-2 shadow-sm">
                            <i className="bi bi-box-arrow-up-right me-2"></i>Proceed to Secure Gateway
                        </button>
                    </form>
                    <p className="text-center text-muted mt-3 mb-0" style={{ fontSize: '0.75rem' }}>
                        You will be redirected to Cashmaal to complete this transaction securely.
                    </p>
                </Modal.Body>
            </Modal>
        </Layout>
    );
};

export default MyFees;
