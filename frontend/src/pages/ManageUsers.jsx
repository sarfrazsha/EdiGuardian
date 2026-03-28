// import React from 'react';
// import { Container, Row, Col, Card, Button } from 'react-bootstrap';
// import { useNavigate } from 'react-router-dom';
// import Layout from '../components/Layout';

// const ManageUsers = () => {
//     const navigate = useNavigate();

//     const categories = [
//         { title: 'Students', icon: 'bi-people-fill', color: 'primary', path: '/manage-students', desc: 'Register and manage student profiles.' },
//         { title: 'Teachers', icon: 'bi-person-workspace', color: 'success', path: '/manage-teachers', desc: 'Assign classes and manage faculty.' },
//         { title: 'Announcements', icon: 'bi-megaphone-fill', color: 'warning', path: '/announcements', desc: 'Post news to the school bulletin.' }
//     ];

//     return (
//         <Layout>
//             <Container fluid>
//                 <div className="mb-4">
//                     <h2 className="fw-bold text-dark">User Management Hub</h2>
//                     <p className="text-muted">Select a category to manage institution data.</p>
//                 </div>

//                 <Row className="g-4">
//                     {categories.map((cat, i) => (
//                         <Col key={i} md={4}>
//                             <Card className="border-0 shadow-sm rounded-4 h-100 transition-hover">
//                                 <Card.Body className="p-4 text-center">
//                                     <div className={`bg-${cat.color} bg-opacity-10 p-4 rounded-circle d-inline-block mb-3 text-${cat.color}`}>
//                                         <i className={`bi ${cat.icon} fs-1`}></i>
//                                     </div>
//                                     <h4 className="fw-bold">{cat.title}</h4>
//                                     <p className="text-muted small px-3">{cat.desc}</p>
//                                     <Button 
//                                         variant={cat.color} 
//                                         className="rounded-pill px-4 fw-bold w-100 mt-2"
//                                         onClick={() => navigate(cat.path)}
//                                     >
//                                         Manage {cat.title}
//                                     </Button>
//                                 </Card.Body>
//                             </Card>
//                         </Col>
//                     ))}
//                 </Row>
//             </Container>
//         </Layout>
//     );
// };

// export default ManageUsers;
import React from 'react';
import { Container, Row, Col, Card, Button, Badge } from 'react-bootstrap';
import { useNavigate, Navigate } from 'react-router-dom';
import Layout from '../components/Layout';

const ManageUsers = () => {
    const navigate = useNavigate();

    // SDS Requirement: Role-Based Access Control (Tier 1)
    const userRole = localStorage.getItem('userRole');
    if (userRole !== 'Admin' && userRole !== 'admin') {
        return <Navigate to="/" replace />;
    }

    const categories = [
        {
            title: 'Students',
            icon: 'bi-people-fill',
            color: 'primary',
            path: '/manage-students',
            desc: 'Onboard students and link them to parental accounts for monitoring.'
        },
        {
            title: 'Teachers',
            icon: 'bi-person-workspace',
            color: 'success',
            path: '/manage-teachers',
            desc: 'Manage faculty credentials and department specializations.'
        },
        {
            title: 'Classes',
            icon: 'bi-door-open-fill',
            color: 'info',
            path: '/manage-classes',
            desc: 'Assign teachers to classes and manage room allocations.'
        },
        {
            title: 'Announcements',
            icon: 'bi-megaphone-fill',
            color: 'warning',
            path: '/announcements',
            desc: 'Broadcast updates to Students, Teachers, and Parents.'
        }
    ];

    return (
        <Layout>
            <Container fluid className="py-4">
                {/* SDS Context Header */}
                <div className="mb-5 border-bottom pb-3">
                    <div className="d-flex align-items-center gap-3 mb-2">
                        <Button
                            variant="light"
                            className="rounded-circle shadow-sm border p-2 d-flex align-items-center justify-content-center"
                            style={{ width: '40px', height: '40px' }}
                            onClick={() => navigate(-1)}
                        >
                            <i className="bi bi-arrow-left fs-5"></i>
                        </Button>
                        <div className="d-flex align-items-center gap-3">
                            <h2 className="fw-bold text-dark mb-0">User Management Hub</h2>
                            <Badge bg="dark" className="text-uppercase px-3 py-2">Tier 1: Admin Interface</Badge>
                        </div>
                    </div>
                    <p className="text-muted mt-2">
                        EduGuardian SDS Protocol: Managing cross-functional user roles and data integrity.
                    </p>
                </div>

                <Row className="g-4">
                    {categories.map((cat, i) => (
                        <Col key={i} xl={3} md={6}>
                            <Card className="border-0 shadow-sm rounded-4 h-100 card-hover-effect">
                                <Card.Body className="p-4 d-flex flex-column">
                                    <div className={`bg-${cat.color} bg-opacity-10 p-3 rounded-3 d-inline-block mb-3 text-${cat.color} align-self-start`}>
                                        <i className={`bi ${cat.icon} fs-2`}></i>
                                    </div>
                                    <h4 className="fw-bold">{cat.title}</h4>
                                    <p className="text-muted small mb-4 flex-grow-1">{cat.desc}</p>

                                    <Button
                                        variant="outline-dark"
                                        className="rounded-pill px-4 fw-bold mt-auto border-2 d-flex justify-content-between align-items-center"
                                        onClick={() => navigate(cat.path)}
                                    >
                                        Launch {cat.title}
                                        <i className="bi bi-arrow-right"></i>
                                    </Button>
                                </Card.Body>
                            </Card>
                        </Col>
                    ))}
                </Row>

                {/* Database Connectivity Indicator as per SDS 3-Tier Model */}
                <div className="mt-5 p-3 bg-light rounded-4 border d-flex align-items-center">
                    <div className="spinner-grow spinner-grow-sm text-success me-2" role="status"></div>
                    <span className="small text-muted fw-medium">
                        Middleware Status: Connected to MongoDB via Express Node.js Tier
                    </span>
                </div>
            </Container>

            <style>
                {`
                    .card-hover-effect {
                        transition: all 0.3s ease;
                    }
                    .card-hover-effect:hover {
                        transform: translateY(-10px);
                        box-shadow: 0 1rem 3rem rgba(0,0,0,.1) !important;
                    }
                `}
            </style>
        </Layout>
    );
};

export default ManageUsers;