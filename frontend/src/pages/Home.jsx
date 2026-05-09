import React from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import RoleButton from '../components/RoleButton';
import AppNavbar from '../components/Navbar';
import Footer from '../components/Footer';


import background from '../assets/pakistani_hero.png';
import kid1 from '../assets/pakistani_kid1.png';
import kid2 from '../assets/pakistani_kid2.png';
import kid3 from '../assets/pakistani_kid3.png';
import kid4 from '../assets/pakistani_kid4.png';

const Home = () => {
    const roles = ['Student', 'Parent', 'Teacher', 'Admin'];
    const navigate = useNavigate();

    const handleRoleClick = (role) => {
        navigate(`/login/${role}`);
    };

    const galleryImages = [
        { img: kid1, title: 'Joyful Learning', desc: 'Engaging classroom environment' },
        { img: kid2, title: 'Active Play', desc: 'Developing social skills' },
        { img: kid3, title: 'Focused Study', desc: 'Nurturing academic excellence' },
        { img: kid4, title: 'Future Leaders', desc: 'Inspiring young minds' }
    ];

    return (
        <div className="public-page-wrapper" style={{ overflowX: 'hidden' }}>
            <AppNavbar />

            
            <div className="gallery-strip-container" style={{
                backgroundColor: '#ffffff',
                padding: '1.5rem 0',
                borderBottom: '1px solid #edf2f7',
                overflow: 'hidden',
                position: 'relative'
            }}>
                <div className="gallery-strip" style={{
                    display: 'flex',
                    gap: '2rem',
                    animation: 'scroll 40s linear infinite',
                    width: 'max-content'
                }}>
                    {[...galleryImages, ...galleryImages].map((item, index) => (
                        <div key={index} className="gallery-item-card" style={{
                            width: '280px',
                            height: '180px',
                            flexShrink: 0,
                            borderRadius: '16px',
                            overflow: 'hidden',
                            position: 'relative',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                            transition: 'transform 0.3s ease'
                        }}>
                            <img 
                                src={item.img} 
                                alt={item.title} 
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                            />
                            <div style={{
                                position: 'absolute',
                                bottom: 0,
                                left: 0,
                                right: 0,
                                background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                                padding: '1rem',
                                color: 'white'
                            }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{item.title}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div
                className="hero-section"
                style={{
                    backgroundImage: `url(${background})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    minHeight: '85vh',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    overflow: 'hidden'
                }}
            >
               
                <div className="hero-gradient-overlay" style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(135deg, rgba(21, 128, 61, 0.4) 0%, rgba(30, 58, 138, 0.6) 100%)',
                    zIndex: 1
                }}></div>

              
                <div className="floating-shape shape-1"></div>
                <div className="floating-shape shape-2"></div>

                <Container className="position-relative" style={{ zIndex: 10 }}>
                    <div className="glass-card mb-5 p-5 mx-auto text-center" style={{
                        maxWidth: '900px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(12px)',
                        borderRadius: '32px',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                        animation: 'fadeInUp 1s ease-out'
                    }}>
                        <h1 className="display-3 fw-bold mb-3 text-white" style={{
                            textShadow: '0 4px 6px rgba(0,0,0,0.3)',
                            letterSpacing: '-1px'
                        }}>
                            Welcome to <span style={{ color: '#10b981' }}>EduGuardian</span>
                        </h1>
                        <p className="lead fs-3 mb-0 text-white fw-light" style={{ opacity: 0.9 }}>
                            Nurturing Tomorrow's Leaders with Real-Time Monitoring
                        </p>
                    </div>

                    <Row className="justify-content-center w-100 g-4" style={{ animation: 'fadeInUp 1s ease-out 0.3s backwards' }}>
                        {roles.map((role) => (
                            <Col key={role} xs={12} sm={6} lg={3}>
                                <div className="role-button-wrapper">
                                    <RoleButton
                                        role={role}
                                        onClick={() => handleRoleClick(role)}
                                    />
                                </div>
                            </Col>
                        ))}
                    </Row>
                </Container>
            </div>

            <style>
                {`
                    @keyframes scroll {
                        0% { transform: translateX(0); }
                        100% { transform: translateX(calc(-280px * 4 - 2rem * 4)); }
                    }

                    @keyframes fadeInUp {
                        from { opacity: 0; transform: translateY(30px); }
                        to { opacity: 1; transform: translateY(0); }
                    }

                    @keyframes float {
                        0%, 100% { transform: translateY(0) rotate(0deg); }
                        50% { transform: translateY(-20px) rotate(5deg); }
                    }

                    .gallery-item-card:hover {
                        transform: scale(1.05);
                        z-index: 2;
                    }

                    .floating-shape {
                        position: absolute;
                        background: rgba(255, 255, 255, 0.1);
                        border-radius: 50%;
                        z-index: 2;
                        animation: float 6s ease-in-out infinite;
                    }

                    .shape-1 {
                        width: 300px;
                        height: 300px;
                        top: -50px;
                        right: -50px;
                        background: radial-gradient(circle, rgba(16, 185, 129, 0.2) 0%, transparent 70%);
                    }

                    .shape-2 {
                        width: 200px;
                        height: 200px;
                        bottom: 10%;
                        left: 5%;
                        background: radial-gradient(circle, rgba(59, 130, 246, 0.2) 0%, transparent 70%);
                    }

                    .role-button-wrapper {
                        transition: transform 0.3s ease;
                    }
                    .role-button-wrapper:hover {
                        transform: translateY(-10px);
                    }
                `}
            </style>

            <Footer />
        </div>
    );
};

export default Home;
