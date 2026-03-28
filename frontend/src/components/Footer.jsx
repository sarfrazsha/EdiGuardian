import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const Footer = () => {
    return (
        <footer className="footer-premium border-top bg-dark text-white pt-5 pb-3 mt-auto">
            <Container>
                <Row className="gy-4 mb-5">
                    {/* Brand Identity */}
                    <Col lg={4} className="pe-lg-5">
                        <div className="brand-group mb-4">
                            <h3 className="fw-bold mb-2 text-primary d-flex align-items-center gap-2">
                                <i className="bi bi-shield-check"></i>
                                <span>EduGuardian</span>
                            </h3>
                            <p className="text-secondary small mb-4" style={{ lineHeight: '1.7', fontSize: '0.95rem' }}>
                                The next generation of educational management. Empowering administrators and teachers with intelligent tools for a safer, smarter learning environment.
                            </p>
                        </div>
                        <div className="social-links d-flex gap-3">
                            {['facebook', 'twitter-x', 'linkedin', 'instagram', 'github'].map((icon) => (
                                <a key={icon} href="#" className="social-icon" title={icon.charAt(0).toUpperCase() + icon.slice(1)}>
                                    <i className={`bi bi-${icon}`}></i>
                                </a>
                            ))}
                        </div>
                    </Col>

                    {/* Navigation Columns */}
                    <Col xs={6} md={4} lg={2}>
                        <h6 className="text-uppercase fw-bold mb-4 ls-1" style={{ fontSize: '0.75rem', color: '#6366f1' }}>Platform</h6>
                        <ul className="list-unstyled footer-nav">
                            <li><Link to="/">Landing Home</Link></li>
                            <li><Link to="/help">Help Center</Link></li>
                            <li><Link to="/support">Tech Support</Link></li>
                            <li><Link to="/contact">Contact Sales</Link></li>
                        </ul>
                    </Col>

                    <Col xs={6} md={4} lg={2}>
                        <h6 className="text-uppercase fw-bold mb-4 ls-1" style={{ fontSize: '0.75rem', color: '#6366f1' }}>Portals</h6>
                        <ul className="list-unstyled footer-nav">
                            <li><Link to="/login/Admin">Admin Hub</Link></li>
                            <li><Link to="/login/Teacher">Faculty Portal</Link></li>
                            <li><Link to="/login/Student">Student Desk</Link></li>
                            <li><Link to="/login/Parent">Parent Connect</Link></li>
                        </ul>
                    </Col>

                    <Col xs={12} md={4} lg={4}>
                        <h6 className="text-uppercase fw-bold mb-4 ls-1" style={{ fontSize: '0.75rem', color: '#6366f1' }}>Global Support</h6>
                        <div className="contact-card p-4 rounded-4 border bg-white bg-opacity-5">
                            <div className="d-flex align-items-center gap-3 mb-3">
                                <div className="contact-icon-box">
                                    <i className="bi bi-headset"></i>
                                </div>
                                <div>
                                    <small className="text-secondary d-block">24/7 Support Line</small>
                                    <span className="fw-bold">+1 (800) EDU-HELP</span>
                                </div>
                            </div>
                            <div className="d-flex align-items-center gap-3">
                                <div className="contact-icon-box">
                                    <i className="bi bi-envelope"></i>
                                </div>
                                <div>
                                    <small className="text-secondary d-block">Admin Email</small>
                                    <span className="fw-bold">admin@eduguardian.io</span>
                                </div>
                            </div>
                        </div>
                    </Col>
                </Row>

                <hr className="border-secondary opacity-10 my-4" />

                <Row className="align-items-center justify-content-between pt-2 pb-1">
                    <Col md="auto" className="text-center text-md-start mb-3 mb-md-0">
                        <p className="mb-0 text-secondary small">
                            &copy; {new Date().getFullYear()} <span className="text-white fw-medium">EduGuardian Inc.</span> Built for Educational Excellence.
                        </p>
                    </Col>
                    <Col md="auto" className="text-center">
                        <div className="legal-nav d-flex gap-4 justify-content-center">
                            <a href="#" className="small text-secondary">Privacy Policy</a>
                            <a href="#" className="small text-secondary">Terms of Service</a>
                            <a href="#" className="small text-secondary">Cookie Settings</a>
                        </div>
                    </Col>
                </Row>
            </Container>

            <style>
                {`
                    .footer-premium {
                        background-color: #0f172a !important;
                        font-family: 'Inter', system-ui, -apple-system, sans-serif;
                    }

                    .footer-nav li {
                        margin-bottom: 12px;
                    }

                    .footer-nav a {
                        color: #94a3b8;
                        text-decoration: none;
                        font-size: 0.9rem;
                        transition: all 0.3s ease;
                        display: inline-block;
                    }

                    .footer-nav a:hover {
                        color: #6366f1;
                        transform: translateX(5px);
                    }

                    .social-icon {
                        width: 40px;
                        height: 40px;
                        border-radius: 12px;
                        background: rgba(255, 255, 255, 0.05);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: #94a3b8;
                        text-decoration: none;
                        transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                        border: 1px solid rgba(255, 255, 255, 0.05);
                    }

                    .social-icon:hover {
                        background: #6366f1;
                        color: white;
                        transform: translateY(-5px) rotate(8deg);
                        box-shadow: 0 10px 20px rgba(99, 102, 241, 0.3);
                        border-color: #6366f1;
                    }

                    .contact-icon-box {
                        width: 42px;
                        height: 42px;
                        background: rgba(99, 102, 241, 0.1);
                        color: #6366f1;
                        border-radius: 12px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 1.2rem;
                    }

                    .contact-card {
                        transition: border-color 0.3s ease;
                        border-color: rgba(255, 255, 255, 0.05) !important;
                    }

                    .contact-card:hover {
                        border-color: rgba(99, 102, 241, 0.3) !important;
                    }

                    .ls-1 { letter-spacing: 0.1em; }

                    .legal-nav a {
                        text-decoration: none;
                        transition: color 0.2s ease;
                    }

                    .legal-nav a:hover {
                        color: white !important;
                    }

                    @media (max-width: 991.98px) {
                        .footer-premium { text-align: center; }
                        .social-links { justify-content: center; margin-bottom: 2rem; }
                        .footer-nav { margin-bottom: 2rem; }
                        .pe-lg-5 { padding-right: 0.75rem !important; }
                    }
                `}
            </style>
        </footer>
    );
};

export default Footer;
