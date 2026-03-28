import React from 'react';
import { Container, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const Support = () => {
    const navigate = useNavigate();

    return (
        <div className="d-flex flex-column min-vh-100">
            <Navbar />
            <Container className="flex-grow-1 mt-5 pt-5 mb-5 position-relative">
                <Button
                    variant="outline-secondary"
                    className="position-absolute top-0 end-0 mt-5 me-3 rounded-pill"
                    onClick={() => navigate(-1)}
                >
                    <i className="bi bi-arrow-left me-2"></i>Back
                </Button>
                <h1 className="fw-bold mb-4">Support</h1>
                <p>Need technical assistance? Our support team is here to help.</p>
                <div className="row g-4">
                    <div className="col-md-6">
                        <div className="p-4 border rounded shadow-sm h-100">
                            <h4>Submit a Ticket</h4>
                            <p>Log a detailed support request and track its status.</p>
                            <button className="btn btn-outline-primary">Open Ticket</button>
                        </div>
                    </div>
                    <div className="col-md-6">
                        <div className="p-4 border rounded shadow-sm h-100">
                            <h4>Live Chat</h4>
                            <p>Chat with a support agent in real-time (Available 9am-5pm).</p>
                            <button className="btn btn-outline-success">Start Chat</button>
                        </div>
                    </div>
                </div>
            </Container>
            <Footer />
        </div>
    );
};

export default Support;
