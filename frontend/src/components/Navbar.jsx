import React from 'react';
import { Navbar, Container, Nav, Button } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';

const AppNavbar = ({ showBackButton = false }) => {
    const navigate = useNavigate();

    return (
        <Navbar bg="white" expand="lg" className="shadow-sm sticky-top py-3">
            <Container>
                {showBackButton && (
                    <Button
                        variant="light"
                        className="rounded-circle shadow-sm border p-2 d-flex align-items-center justify-content-center me-3"
                        style={{ width: '40px', height: '40px' }}
                        onClick={() => navigate(-1)}
                    >
                        <i className="bi bi-arrow-left fs-5"></i>
                    </Button>
                )}
                <Navbar.Brand as={Link} to="/" className="fw-bold text-primary fs-3">
                    <i className="bi bi-shield-lock-fill me-2"></i>EduGuardian
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