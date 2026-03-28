import React from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import RoleButton from '../components/RoleButton';
import AppNavbar from '../components/Navbar';
import Footer from '../components/Footer';

// Assets
import background from '../assets/background.webp';
import kidsPlaying from '../assets/kids_playing_classroom.png';
import kidsSmiling from '../assets/kids_smiling_outdoor.png';
import kidsLearning from '../assets/kids_learning_together.png';
import kidsEnthusiastic from '../assets/kids_enthusiastic_class.png';

const Home = () => {
    const roles = ['Student', 'Parent', 'Teacher', 'Admin'];
    const navigate = useNavigate();

    const handleRoleClick = (role) => {
        navigate(`/login/${role}`);
    };

    return (
        /* Ensure there is NO 'd-flex' on this top div that could clash with global sidebar CSS */
        <div className="public-page-wrapper">
            <AppNavbar />

            {/* Hero Section */}
            <div
                className="hero-section"
                style={{
                    backgroundImage: `url(${background})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    minHeight: '80vh',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center'
                }}
            >
                <div className="hero-overlay" style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'rgba(0,0,0,0.5)'
                }}></div>

                <Container className="position-relative text-white text-center" style={{ zIndex: 10 }}>
                    <div className="mb-5 p-4" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.7)' }}>
                        <h1 className="display-3 fw-bold mb-3">Welcome to EduGuardian</h1>
                        <p className="lead fs-3 fw-light">Digital School & Parental Monitoring System</p>
                    </div>

                    <Row className="justify-content-center w-100">
                        {roles.map((role) => (
                            <Col key={role} xs={12} sm={6} lg={3} className="mb-4">
                                <RoleButton
                                    role={role}
                                    onClick={() => handleRoleClick(role)}
                                />
                            </Col>
                        ))}
                    </Row>
                </Container>
            </div>

            {/* Gallery Section */}
            <section className="py-5" style={{ backgroundColor: '#f8f9fa' }}>
                <Container>
                    <div className="text-center mb-5">
                        <h2 className="display-5 fw-bold text-primary mb-3">Empowering Young Minds</h2>
                        <p className="lead text-muted mx-auto" style={{ maxWidth: '800px' }}>
                            At EduGuardian, we believe every child deserves a safe, nurturing environment.
                        </p>
                    </div>

                    <Row className="g-4">
                        {[
                            { img: kidsPlaying, title: 'Joyful Learning', desc: 'Creating engaging educational experiences' },
                            { img: kidsSmiling, title: 'Building Connections', desc: 'Fostering friendships and teamwork' },
                            { img: kidsLearning, title: 'Collaborative Growth', desc: 'Learning together, growing together' },
                            { img: kidsEnthusiastic, title: 'Enthusiastic Minds', desc: 'Inspiring curiosity and passion' }
                        ].map((item, index) => (
                            <Col key={index} xs={12} sm={6} lg={3}>
                                <Card className="h-100 border-0 shadow-sm overflow-hidden">
                                    <div style={{ height: '200px' }}>
                                        <Card.Img variant="top" src={item.img} className="h-100 object-fit-cover" />
                                    </div>
                                    <Card.Body className="text-center">
                                        <Card.Title className="fw-bold text-primary">{item.title}</Card.Title>
                                        <Card.Text className="text-muted small">{item.desc}</Card.Text>
                                    </Card.Body>
                                </Card>
                            </Col>
                        ))}
                    </Row>
                </Container>
            </section>

            <Footer />
        </div>
    );
};

export default Home;