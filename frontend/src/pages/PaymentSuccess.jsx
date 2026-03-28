import React, { useEffect, useState } from 'react';
import { Container, Button, Spinner } from 'react-bootstrap';
import { useSearchParams, useNavigate, Navigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Axios from 'axios';

const PaymentSuccess = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const feeId = searchParams.get('fee_id');
    const [status, setStatus] = useState('processing');
    const email = localStorage.getItem('userEmail');
    const role = localStorage.getItem('userRole');

    if (!email || (role?.toLowerCase() !== 'parent')) {
        return <Navigate to="/" replace />;
    }

    useEffect(() => {
        if (!feeId) {
            setStatus('error');
            return;
        }

        // When we land here from Cashmaal after successful payment
        Axios.put(`http://localhost:8080/api/fees/${feeId}/pay`)
            .then(() => setStatus('success'))
            .catch((err) => {
                console.error("Payment verification failed", err);
                setStatus('error');
            });
    }, [feeId]);

    return (
        <Layout>
            <Container className="d-flex flex-column align-items-center justify-content-center py-5" style={{ minHeight: '60vh' }}>
                <div className="bg-white p-5 rounded-4 shadow-sm text-center" style={{ maxWidth: '500px', width: '100%' }}>
                    {status === 'processing' && (
                        <>
                            <Spinner animation="border" variant="primary" style={{ width: '4rem', height: '4rem' }} />
                            <h3 className="mt-4 fw-bold">Verifying Payment</h3>
                            <p className="text-muted">Please wait while we confirm your transaction...</p>
                        </>
                    )}
                    {status === 'success' && (
                        <>
                            <i className="bi bi-check-circle-fill text-success" style={{ fontSize: '5rem' }}></i>
                            <h3 className="mt-4 fw-bold text-dark">Payment Successful!</h3>
                            <p className="text-muted">Your fee has been processed and your account is updated.</p>
                            <Button variant="primary" className="rounded-pill px-5 mt-3 fw-bold" onClick={() => navigate('/my-fees')}>
                                <i className="bi bi-arrow-left me-2"></i>Return to My Fees
                            </Button>
                        </>
                    )}
                    {status === 'error' && (
                        <>
                            <i className="bi bi-x-circle-fill text-danger" style={{ fontSize: '5rem' }}></i>
                            <h3 className="mt-4 fw-bold text-dark">Verification Failed</h3>
                            <p className="text-muted">We couldn't verify this payment record locally.</p>
                            <Button variant="outline-danger" className="rounded-pill px-4 mt-3 fw-bold" onClick={() => navigate('/my-fees')}>
                                Go Back
                            </Button>
                        </>
                    )}
                </div>
            </Container>
        </Layout>
    );
};

export default PaymentSuccess;
