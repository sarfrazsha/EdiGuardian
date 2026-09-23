import React from 'react';
import { Navbar, Container, Nav, Button } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import reversedLogo from '../assets/eduguardian-logo-reversed.svg';
import greenLogo from '../assets/eduguardian-logo-v2-green.svg';
import greenIcon from '../assets/eduguardian-icon-v2-green.svg';

const AppNavbar = ({ showBackButton = false, solid = false }) => {
    const navigate = useNavigate();

    return (
        <Navbar expand="lg" className={`${solid ? 'navbar-login' : 'navbar-glass mx-3 mt-3 rounded-4'} sticky-top py-3`} style={solid ? {
            background: '#14243F',
            borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
            boxShadow: '0 8px 24px rgba(13, 26, 46, 0.2)'
        } : {
            background: 'linear-gradient(110deg, rgba(165, 214, 188, 0.94) 0%, rgba(137, 156, 204, 0.94) 100%)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.35)',
            boxShadow: '0 15px 35px rgba(31, 53, 91, 0.18)'
        }}>
            <Container>
                {showBackButton && (
                    <div className="d-flex me-3">
                        <Button
                            variant="light"
                            className="rounded-circle shadow-sm border p-0 d-flex align-items-center justify-content-center"
                            style={{ width: '40px', height: '40px' }}
                            onClick={() => navigate(-1)}
                            title="Go Back"
                        >
                            <i className="bi bi-arrow-left fs-5"></i>
                        </Button>
                    </div>
                )}
                <Navbar.Brand as={Link} to="/" className="d-flex align-items-center">
                    <picture>
                        <source media="(max-width: 575.98px)" srcSet={greenIcon} />
                        <img src={solid ? reversedLogo : greenLogo} alt="EduGuardian" className="eduguardian-wordmark" />
                    </picture>
                </Navbar.Brand>
                <Navbar.Toggle aria-controls="basic-navbar-nav" className="bg-light" />
                <Navbar.Collapse id="basic-navbar-nav">
                    <Nav className="ms-auto gap-3 fw-medium">
                        <Nav.Link as={Link} to="/" className="text-white">Home</Nav.Link>
                        <Nav.Link as={Link} to="/help" className="text-white">Help</Nav.Link>
                        <Nav.Link as={Link} to="/contact" className="text-white">Contact</Nav.Link>
                    </Nav>
                </Navbar.Collapse>
            </Container>
        </Navbar>
    );
};

export default AppNavbar;
