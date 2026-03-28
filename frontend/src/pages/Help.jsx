import React from 'react';
import { Container, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const Help = () => {
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
                <h1 className="fw-bold mb-4">Help Center</h1>
                <p>Welcome to the EduGuardian Help Center. Here you can find guides and resources to help you use our platform.</p>
                <ul>
                    <li><strong>Getting Started:</strong> details on how to set up your account.</li>
                    <li><strong>Role Descriptions:</strong> Understanding the difference between Admin, Teacher, Student, and Parent accounts.</li>
                    <li><strong>Troubleshooting:</strong> Common issues and how to resolve them.</li>
                </ul>
            </Container>
            <Footer />
        </div>
    );
};

export default Help;
