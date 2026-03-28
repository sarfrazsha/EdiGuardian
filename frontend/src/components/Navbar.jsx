import React from 'react';
import { Navbar, Container, Nav, Button } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';

const AppNavbar = ({ showBackButton = false }) => {
    const navigate = useNavigate();

    return (
        <Navbar bg="white" expand="lg" className="shadow-sm sticky-top py-3">
            <Container>
                {showBackButton && (
                    <div className="d-flex gap-2 me-3">
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
                )}
                <Navbar.Brand as={Link} to="/" className="fw-bold text-primary fs-3 d-flex align-items-center">
                    <img src={logo} alt="EduGuardian Logo" height="60" className="me-3 rounded-circle" />
                    EduGuardian
                </Navbar.Brand>
                <Navbar.Toggle aria-controls="basic-navbar-nav" />
                <Navbar.Collapse id="basic-navbar-nav">
                    <Nav className="ms-auto gap-3 fw-medium">
                        <Nav.Link as={Link} to="/">Home</Nav.Link>
                        <Nav.Link as={Link} to="/help">Help</Nav.Link>
                        <Nav.Link as={Link} to="/contact">Contact</Nav.Link>
                    </Nav>
                </Navbar.Collapse>
            </Container>
        </Navbar>
    );
};

export default AppNavbar;