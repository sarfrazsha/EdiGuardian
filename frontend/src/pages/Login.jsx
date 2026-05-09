
import React, { useState } from 'react';
import { Container, Form, Button, Row, Col, Card, Alert, Modal, InputGroup, ListGroup } from 'react-bootstrap';

import { useParams, useNavigate } from 'react-router-dom';
import AppNavbar from '../components/Navbar';
import Footer from '../components/Footer';
import background from '../assets/background.webp';

const Login = () => {
    const { role } = useParams();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

 

    
    
//   
const handleSubmit = async (e) => {
    e.preventDefault();
    try {
        
        const response = await fetch('http://localhost:8080/student/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, role, password }),
        });

        const data = await response.json();

        if (response.ok) {
           
            localStorage.setItem('userEmail', email);
            localStorage.setItem('userRole', role);
            localStorage.setItem('userName', data.uname || "User");
            localStorage.setItem('userProfilePic', data.profilePic || "");
            if (data.studentId) localStorage.setItem('studentId', data.studentId);
            if (data.classNo) localStorage.setItem('classNo', data.classNo);
            if (data.teacherClass) localStorage.setItem('teacherClass', data.teacherClass);
            
            setShowSuccessModal(true);
            
            
            setTimeout(() => {
                navigate('/dashboard', { state: { email, role, uname: data.uname, profilePic: data.profilePic } });
            }, 1000);
        } else {
            alert(data.message || "Invalid Login");
        }
    } catch (error) {
        console.error("Login Error:", error);
    }
};

    

    return (
        <div className="d-flex flex-column min-vh-100">
            <AppNavbar />

            <div
                className="hero-section flex-grow-1"
                style={{
                    backgroundImage: `url(${background})`
                }}
            >
                <div className="hero-overlay"></div>
                <Container className="hero-content d-flex justify-content-center align-items-center">
                    <Card className="shadow-lg p-4" style={{ width: '100%', maxWidth: '400px', backgroundColor: 'rgba(255, 255, 255, 0.95)' }}>
                        <Card.Body>
                            <h2 className="text-center mb-4 fw-bold" style={{ color: '#4361ee' }}>
                                <span className="text-capitalize">{role}</span> Login
                            </h2>
                            <Form onSubmit={handleSubmit}>
                                <Form.Group className="mb-3" controlId="formBasicEmail">
                                    <Form.Label>Email address</Form.Label>
                                    <Form.Control
                                        type="email"
                                        placeholder="Enter email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </Form.Group>

                                <Form.Group className="mb-4" controlId="formBasicPassword">
                                    <Form.Label>Password</Form.Label>
                                    <InputGroup>
                                        <Form.Control
                                            type={showPassword ? "text" : "password"}
                                            placeholder="Password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            className="border-end-0 border-secondary-subtle"
                                        />
                                        <InputGroup.Text 
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="bg-white border-start-0 border-secondary-subtle"
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <i className={`bi ${showPassword ? 'bi-eye-slash text-primary' : 'bi-eye text-muted'}`}></i>
                                        </InputGroup.Text>
                                    </InputGroup>
                                </Form.Group>

                                <Button variant="primary" type="submit" className="w-100 py-2 fw-bold">
                                    Login
                                </Button>
                            </Form>
                            <div className="text-center mt-3">
                                <Button variant="link" onClick={() => navigate('/')} className="text-decoration-none">
                                    &larr; Back to Home
                                </Button>
                            </div>
                        </Card.Body>
                    </Card>
                </Container>
            </div>
            <div>
                    
                                <Modal show={showSuccessModal} onHide={() => setShowSuccessModal(false)} centered>
                                    <Modal.Header closeButton>
                                        <Modal.Title className="text-success">Success!</Modal.Title>
                                    </Modal.Header>
                                    <Modal.Body className="text-center py-4">
                                        <i className="bi bi-check-circle-fill text-success fs-1 mb-3 d-block"></i>
                                        <h4>Logged in Successfully</h4>
                                       
                                    </Modal.Body>
                                    <Modal.Footer>
                                        <Button variant="success" onClick={() => setShowSuccessModal(false)}>Close</Button>
                                    </Modal.Footer>
                                </Modal>
            </div>

            <Footer />
        </div>
    );
};

export default Login;
