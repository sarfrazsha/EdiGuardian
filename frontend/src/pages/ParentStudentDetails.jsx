import React from 'react';
import { Container, Row, Col, Card, Button, Badge } from 'react-bootstrap';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import Layout from '../components/Layout';

const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='90' height='90' viewBox='0 0 90 90'%3E%3Ccircle cx='45' cy='45' r='45' fill='%23374151'/%3E%3Ccircle cx='45' cy='34' r='18' fill='%236B7280'/%3E%3Cellipse cx='45' cy='80' rx='28' ry='22' fill='%236B7280'/%3E%3C/svg%3E";

const ParentStudentDetails = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const household = location.state?.household;

    if (!household) {
        return <Navigate to="/parent-hub" replace />;
    }

    const { 
        parentName, parentEmail, parentPhone, parentAddress, parentImage,
        studentName, studentRollNo, studentAge, studentGender, studentImage, classNo 
    } = household;

    const parentImgSrc = parentImage ? `http://localhost:8080/uploads/${parentImage}` : DEFAULT_AVATAR;
    const studentImgSrc = studentImage ? `http://localhost:8080/uploads/${studentImage}` : DEFAULT_AVATAR;

    return (
        <Layout>
            <Container fluid className="py-4">
                {/* Header */}
                <div className="mb-4 d-flex align-items-center gap-3">
                    <Button 
                        variant="light" 
                        className="rounded-circle shadow-sm border p-2 d-flex align-items-center justify-content-center" 
                        style={{ width: '40px', height: '40px' }} 
                        onClick={() => navigate(-1)}
                    >
                        <i className="bi bi-arrow-left fs-5"></i>
                    </Button>
                    <div>
                        <h2 className="fw-bold text-dark mb-0">Linked Profile Details</h2>
                        <p className="text-muted mb-0">Detailed view of guardian and child partnership.</p>
                    </div>
                </div>

                <Row className="g-4">
                   
                    <Col lg={6}>
                        <Card className="border-0 shadow-sm rounded-4 h-100 overflow-hidden">
                            <div className="bg-primary bg-opacity-10 py-4 text-center border-bottom">
                                <div className="position-relative d-inline-block">
                                    <img 
                                        src={parentImgSrc} 
                                        alt="Guardian" 
                                        className="rounded-circle border border-4 border-white shadow-sm"
                                        style={{ width: '120px', height: '120px', objectFit: 'cover' }}
                                    />
                                    <Badge bg="primary" className="position-absolute bottom-0 end-0 rounded-pill px-3 py-1 border border-2 border-white">
                                        Guardian
                                    </Badge>
                                </div>
                                <h3 className="fw-bold mt-3 mb-1">{parentName}</h3>
                                <p className="text-primary small fw-bold mb-0 text-uppercase tracking-wider">Guardian</p>
                            </div>
                            <Card.Body className="p-4">
                                <h5 className="fw-bold mb-4 text-secondary text-uppercase" style={{ fontSize: '0.8rem', letterSpacing: '1px' }}>Contact Information</h5>
                                
                                <div className="d-flex align-items-center mb-4">
                                    <div className="bg-light rounded-3 p-2 me-3 text-primary">
                                        <i className="bi bi-envelope-fill fs-5"></i>
                                    </div>
                                    <div>
                                        <div className="text-muted small">Email Address</div>
                                        <div className="fw-bold">{parentEmail}</div>
                                    </div>
                                </div>

                                <div className="d-flex align-items-center mb-4">
                                    <div className="bg-light rounded-3 p-2 me-3 text-success">
                                        <i className="bi bi-telephone-fill fs-5"></i>
                                    </div>
                                    <div>
                                        <div className="text-muted small">Phone Number</div>
                                        <div className="fw-bold">{parentPhone}</div>
                                    </div>
                                </div>

                                <div className="d-flex align-items-start mb-0">
                                    <div className="bg-light rounded-3 p-2 me-3 text-warning">
                                        <i className="bi bi-geo-alt-fill fs-5"></i>
                                    </div>
                                    <div>
                                        <div className="text-muted small">Residential Address</div>
                                        <div className="fw-bold">{parentAddress}</div>
                                    </div>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>

                   
                    <Col lg={6}>
                        <Card className="border-0 shadow-sm rounded-4 h-100 overflow-hidden">
                            <div className="bg-info bg-opacity-10 py-4 text-center border-bottom">
                                <div className="position-relative d-inline-block">
                                    <img 
                                        src={studentImgSrc} 
                                        alt="Student" 
                                        className="rounded-circle border border-4 border-white shadow-sm"
                                        style={{ width: '120px', height: '120px', objectFit: 'cover' }}
                                    />
                                    <Badge bg="info" className="position-absolute bottom-0 end-0 rounded-pill px-3 py-1 border border-2 border-white text-dark fw-bold">
                                        Student
                                    </Badge>
                                </div>
                                <h3 className="fw-bold mt-3 mb-1">{studentName}</h3>
                                <p className="text-info small fw-bold mb-0 text-uppercase tracking-wider">Student</p>
                            </div>
                            <Card.Body className="p-4">
                                <h5 className="fw-bold mb-4 text-secondary text-uppercase" style={{ fontSize: '0.8rem', letterSpacing: '1px' }}>Academic & Personal Information</h5>
                                
                                <Row className="g-4">
                                    <Col sm={6}>
                                        <div className="d-flex align-items-center">
                                            <div className="bg-light rounded-3 p-2 me-3 text-dark">
                                                <i className="bi bi-hash fs-5"></i>
                                            </div>
                                            <div>
                                                <div className="text-muted small">Roll Number</div>
                                                <div className="fw-bold">{studentRollNo}</div>
                                            </div>
                                        </div>
                                    </Col>
                                    <Col sm={6}>
                                        <div className="d-flex align-items-center">
                                            <div className="bg-light rounded-3 p-2 me-3 text-indigo">
                                                <i className="bi bi-building fs-5" style={{ color: '#6610f2' }}></i>
                                            </div>
                                            <div>
                                                <div className="text-muted small">Class</div>
                                                <div className="fw-bold">Grade {classNo}</div>
                                            </div>
                                        </div>
                                    </Col>
                                    <Col sm={6}>
                                        <div className="d-flex align-items-center">
                                            <div className="bg-light rounded-3 p-2 me-3 text-danger">
                                                <i className="bi bi-calendar3-event fs-5"></i>
                                            </div>
                                            <div>
                                                <div className="text-muted small">Age</div>
                                                <div className="fw-bold">{studentAge} Years</div>
                                            </div>
                                        </div>
                                    </Col>
                                    <Col sm={6}>
                                        <div className="d-flex align-items-center">
                                            <div className="bg-light rounded-3 p-2 me-3 text-primary">
                                                <i className="bi bi-gender-ambiguous fs-5"></i>
                                            </div>
                                            <div>
                                                <div className="text-muted small">Gender</div>
                                                <div className="fw-bold text-capitalize">{studentGender}</div>
                                            </div>
                                        </div>
                                    </Col>
                                </Row>

                                <div className="mt-5 pt-3 border-top text-center text-muted small">
                                    <i className="bi bi-shield-check me-2 text-success"></i>
                                    Official Student Record Linked to Parent ID: {household._id}
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            </Container>
        </Layout>
    );
};

export default ParentStudentDetails;
