import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const Footer = () => {
    return (
        <footer className="footer-premium mt-auto">
            <Container>
                <Row className="footer-links-row gy-4">
                    <Col lg={5}>
                        <h3 className="footer-brand">EduGuardian</h3>
                        <p className="footer-blurb">A clearer connection between school, home, and every child’s next step.</p>
                    </Col>
                    <Col xs={6} md={3} lg={2}>
                        <h6>Explore</h6>
                        <Link to="/">Home</Link>
                        <Link to="/help">Help Center</Link>
                        <Link to="/contact">Contact</Link>
                    </Col>
                    <Col xs={6} md={3} lg={2}>
                        <h6>Portals</h6>
                        <Link to="/login/Parent">Parent Login</Link>
                        <Link to="/login/Teacher">Teacher Login</Link>
                        <Link to="/login/Admin">Admin Login</Link>
                    </Col>
                    <Col md={3} lg={3}>
                        <h6>Support</h6>
                        <Link to="/support">Technical support</Link>
                        <Link to="/contact">Get in touch</Link>
                    </Col>
                </Row>
                <div className="footer-bottom">
                    <span>&copy; {new Date().getFullYear()} EduGuardian</span>
                    <div>
                        <a href="#">Privacy</a>
                        <a href="#">Terms</a>
                        <a href="#">Cookies</a>
                    </div>
                </div>
            </Container>

            <style>
                {`
                    .footer-premium { background: #0D1A2E; color: #B9C2D4; padding: 42px 0 18px; font-family: Inter, sans-serif; }
                    .footer-links-row { padding-bottom: 30px; }
                    .footer-brand { color: #FFFFFF; font-family: Fraunces, Georgia, serif; font-size: 24px; font-weight: 600; }
                    .footer-blurb { max-width: 300px; color: #8A93A8; font-size: 14px; line-height: 1.6; }
                    .footer-premium h6 { margin-bottom: 14px; color: #B9C2D4; font-size: 12px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
                    .footer-premium a { display: block; width: fit-content; margin-bottom: 9px; color: #8A93A8; font-size: 13px; text-decoration: none; }
                    .footer-premium a:hover { color: #FFFFFF; }
                    .footer-bottom { display: flex; justify-content: space-between; gap: 20px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,.16); color: #6C7690; font-size: 12.5px; }
                    .footer-bottom div { display: flex; gap: 20px; }
                    .footer-bottom a { margin: 0; color: #6C7690; font-size: 12.5px; }
                    @media (max-width: 767.98px) { .footer-bottom { flex-direction: column; gap: 10px; } }
                `}
            </style>
        </footer>
    );
};

export default Footer;
