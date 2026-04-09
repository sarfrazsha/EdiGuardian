import React from 'react';
import { Container, Card, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';

const DateSheet = () => {
    const navigate = useNavigate();

    return (
        <Layout>
            <Container fluid className="py-5">
                <div className="d-flex align-items-center gap-3 mb-5">
                    <Button 
                        variant="light" 
                        className="rounded-circle shadow-sm border p-0 d-flex align-items-center justify-content-center" 
                        style={{ width: '40px', height: '40px' }} 
                        onClick={() => navigate(-1)}
                    >
                        <i className="bi bi-arrow-left fs-5"></i>
                    </Button>
                    <div>
                        <h2 className="fw-bold mb-0">Examination Date Sheet</h2>
                        <p className="text-muted small mb-0">Academic Session 2025-26</p>
                    </div>
                </div>

                <Card className="border-0 shadow-lg rounded-4 overflow-hidden text-center py-5 bg-white">
                    <Card.Body className="py-5">
                        <div className="mb-4">
                            <i className="bi bi-calendar-x text-warning display-1"></i>
                        </div>
                        <h3 className="fw-bold text-dark mb-3">Not Yet Announced</h3>
                        <p className="text-muted mx-auto mb-4" style={{ maxWidth: '400px' }}>
                            The examination schedule for the upcoming term has not been published by the administration yet. Please check back later or wait for an official announcement.
                        </p>
                        <Button variant="primary" className="rounded-pill px-5 py-2 shadow-sm" onClick={() => navigate('/dashboard')}>
                            Return to Dashboard
                        </Button>
                    </Card.Body>
                </Card>
            </Container>
        </Layout>
    );
};

export default DateSheet;
