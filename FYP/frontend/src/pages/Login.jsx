
import React, { useState } from 'react';
import { Form, Button, Modal, InputGroup } from 'react-bootstrap';

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
        
        const response = await fetch('/student/login', {
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
            if (data.teacherClasses) localStorage.setItem('teacherClasses', JSON.stringify(data.teacherClasses));
            if (data.teacherSubject) localStorage.setItem('teacherSubject', data.teacherSubject);
            if (data.teacherSubjects) localStorage.setItem('teacherSubjects', JSON.stringify(data.teacherSubjects));
            if (data.children) {
                localStorage.setItem('parentChildren', JSON.stringify(data.children));
                if (data.children.length > 0) {
                    localStorage.setItem('selectedChildId', data.selectedChildId || data.children[0].id);
                    localStorage.setItem('selectedChildClass', data.children[0].classNo);
                }
            }
            
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
        <div className="login-page d-flex flex-column min-vh-100">
            <AppNavbar solid />

            <main className="login-hero flex-grow-1" style={{ backgroundImage: `url(${background})` }}>
                <div className="login-hero-scrim"></div>
                <div className="login-hero-inner">
                    <div className="login-left-column">
                        <section className="login-intro">
                            <p className="login-eyebrow">EDUGUARDIAN PORTAL</p>
                            <h1>Stay close to<br /><span>what matters most.</span></h1>
                        </section>

                        <section className="login-card">
                            <h2><span className="text-capitalize">{role}</span> Login</h2>
                            <p className="login-card-subtitle">Sign in to continue to your EduGuardian portal.</p>
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
                                            minLength="8"
                                            className="login-input border-end-0"
                                        />
                                        <InputGroup.Text 
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="login-input-addon border-start-0"
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                                        </InputGroup.Text>
                                    </InputGroup>
                                </Form.Group>

                                <Button type="submit" className="login-submit w-100 py-2 fw-bold">
                                    Login
                                </Button>
                            </Form>
                            <div className="text-center mt-4">
                                <button type="button" onClick={() => navigate('/')} className="login-back-link">
                                    &larr; Back to home
                                </button>
                            </div>
                        </section>

                        <p className="login-intro-copy login-copy-below">A calmer way to stay connected with your child's learning, progress, and everyday school life.</p>
                    </div>
                </div>
            </main>
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
