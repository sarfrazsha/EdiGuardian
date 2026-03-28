import React from 'react';
import { Container, Form, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const Contact = () => {
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
                <h1 className="fw-bold mb-4">Contact Us</h1>
                <p>Have questions or feedback? We'd love to hear from you.</p>
                <div className="border p-4 rounded shadow-sm bg-light" style={{ maxWidth: '600px' }}>
                    <Form>
                        <Form.Group className="mb-3" controlId="formName">
                            <Form.Label>Name</Form.Label>
                            <Form.Control type="text" placeholder="Enter your name" />
                        </Form.Group>
                        <Form.Group className="mb-3" controlId="formEmail">
                            <Form.Label>Email address</Form.Label>
                            <Form.Control type="email" placeholder="Enter your email" />
                        </Form.Group>
                        <Form.Group className="mb-3" controlId="formMessage">
                            <Form.Label>Message</Form.Label>
                            <Form.Control as="textarea" rows={4} placeholder="Your message..." />
                        </Form.Group>
                        <Button variant="primary" type="submit">
                            Send Message
                        </Button>
                    </Form>
                </div>
            </Container>
            <Footer />
        </div>
    );
};

export default Contact;
