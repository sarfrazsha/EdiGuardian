import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Table, Spinner, InputGroup, Form, Badge } from 'react-bootstrap';
import { useNavigate, Navigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Axios from 'axios';

const ParentHub = () => {
    const navigate = useNavigate();
    const role = localStorage.getItem('userRole');
    const email = localStorage.getItem('userEmail');

    if (!email || (role?.toLowerCase() !== 'admin')) {
        return <Navigate to="/" replace />;
    }

    const [parents, setParents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await Axios.get('http://localhost:8080/api/parents');
            setParents(res.data);
            setLoading(false);
        } catch (err) {
            console.error("Failed to fetch parents", err);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const filteredParents = parents.filter(p => 
        p.parentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.parentEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.studentName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Layout>
            <Container fluid className="py-4">
                <div className="mb-4 d-flex justify-content-between align-items-center flex-wrap gap-3">
                    <div className="d-flex align-items-center gap-3">
                        <Button variant="light" className="rounded-circle shadow-sm border p-2 d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }} onClick={() => navigate(-1)}>
                            <i className="bi bi-arrow-left fs-5"></i>
                        </Button>
                        <div>
                            <h2 className="fw-bold text-dark mb-0">Parent-Guardian Hub</h2>
                            <p className="text-muted mb-0">Directory of guardians and their linked students.</p>
                        </div>
                    </div>
                </div>

                {/* Search and Stats */}
                <Card className="border-0 shadow-sm rounded-4 mb-4">
                    <Card.Body className="p-3">
                        <Row className="align-items-center g-3">
                            <Col md={8}>
                                <InputGroup className="bg-light rounded-pill px-3">
                                    <InputGroup.Text className="bg-transparent border-0 text-muted">
                                        <i className="bi bi-search"></i>
                                    </InputGroup.Text>
                                    <Form.Control 
                                        className="bg-transparent border-0 py-2 shadow-none" 
                                        placeholder="Search by guardian, child name or email..." 
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </InputGroup>
                            </Col>
                            <Col md={4} className="text-md-end text-center">
                                <Badge bg="primary" className="bg-opacity-10 text-primary px-3 py-2 rounded-pill fw-bold">
                                    Total Households: {parents.length}
                                </Badge>
                            </Col>
                        </Row>
                    </Card.Body>
                </Card>

                {/* Main Table */}
                <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
                    <Card.Body className="p-0">
                        <div className="table-responsive">
                            <Table hover className="align-middle mb-0 custom-table">
                                <thead className="bg-light text-secondary small fw-bold">
                                    <tr>
                                        <th className="ps-4">Guardian Name</th>
                                        <th>Contact Details</th>
                                        <th>Linked Child</th>
                                        <th className="text-center">Class</th>
                                        <th className="text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan="5" className="text-center py-5"><Spinner animation="border" variant="primary" /></td></tr>
                                    ) : filteredParents.length > 0 ? filteredParents.map((p, idx) => (
                                        <tr key={idx}>
                                            <td className="ps-4">
                                                <div className="d-flex align-items-center">
                                                    <div className="bg-primary bg-opacity-10 text-primary rounded-circle d-flex align-items-center justify-content-center me-3" style={{ width: '40px', height: '40px' }}>
                                                        <i className="bi bi-person-fill fs-5"></i>
                                                    </div>
                                                    <div>
                                                        <div className="fw-bold text-dark">{p.parentName}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="small fw-medium text-dark"><i className="bi bi-envelope-at me-2 text-primary"></i>{p.parentEmail}</div>
                                                <div className="small text-muted mt-1"><i className="bi bi-telephone me-2 text-success"></i>{p.parentPhone}</div>
                                            </td>
                                            <td>
                                                <div className="fw-bold text-dark">{p.studentName}</div>
                                                <div className="small text-muted">Primary Student</div>
                                            </td>
                                            <td className="text-center">
                                                <Badge bg="info" className="bg-opacity-10 text-info px-3 py-2 rounded-pill fw-bold">
                                                    Class {p.classNo}
                                                </Badge>
                                            </td>
                                            <td className="text-center">
                                                <Button size="sm" variant="outline-primary" className="rounded-pill px-3" onClick={() => navigate('/parent-student-details', { state: { household: p } })}>
                                                    View Details
                                                </Button>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="5" className="text-center py-5 text-muted">
                                                No guardian records found matching your search.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </Table>
                        </div>
                    </Card.Body>
                </Card>
            </Container>

            <style>
                {`
                    .custom-table thead th {
                        font-size: 0.72rem;
                        text-transform: uppercase;
                        letter-spacing: 0.8px;
                        font-weight: 700;
                        padding: 1.25rem 1rem;
                        border: none;
                    }
                    .custom-table tbody td {
                        padding: 1.2rem 1rem;
                        border-bottom: 1px solid #f1f5f9;
                    }
                    .custom-table tbody tr:last-child td {
                        border-bottom: none;
                    }
                    .custom-table tbody tr:hover {
                        background-color: #f8faff;
                    }
                `}
            </style>
        </Layout>
    );
};

export default ParentHub;
