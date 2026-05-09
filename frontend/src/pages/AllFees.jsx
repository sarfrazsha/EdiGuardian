import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Table, Badge, Spinner, Alert, InputGroup } from 'react-bootstrap';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import Axios from 'axios';

const AllFees = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const role = localStorage.getItem('userRole');
    const email = localStorage.getItem('userEmail');

    if (!email || (role?.toLowerCase() !== 'admin')) {
        return <Navigate to="/" replace />;
    }

    const [fees, setFees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filterStatus, setFilterStatus] = useState(searchParams.get('status') || '');
    const [filterMonth, setFilterMonth] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const downloadFile = async (filename) => {
        try {
            const response = await fetch(`http://localhost:8080/uploads/${filename}`);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename.split('/').pop()); 
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Download failed:", error);
            alert("Failed to download file.");
        }
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await Axios.get(`http://localhost:8080/api/fees?role=admin`);
            setFees(res.data);
            setLoading(false);
        } catch (err) {
            console.error("Failed to fetch data", err);
            setError("Failed to load fee records.");
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const filteredFees = fees.filter(fee => {
        const matchesStatus = filterStatus ? fee.status === filterStatus : true;
        const matchesMonth = filterMonth ? fee.month === filterMonth : true;
        const matchesSearch = searchTerm ? 
            (fee.studentName.toLowerCase().includes(searchTerm.toLowerCase()) || 
             fee.parentEmail.toLowerCase().includes(searchTerm.toLowerCase())) : true;
        return matchesStatus && matchesMonth && matchesSearch;
    });

    const handleApprove = async (id) => {
        try {
            await Axios.put(`http://localhost:8080/api/fees/${id}/approve`);
            fetchData();
        } catch (e) {
            alert("Approval failed!");
        }
    };

    return (
        <Layout>
            <Container fluid className="py-4">
                <div className="mb-4 d-flex justify-content-between align-items-center flex-wrap gap-3">
                    <div className="d-flex align-items-center gap-3">
                        <Button variant="light" className="rounded-circle shadow-sm border p-2 d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }} onClick={() => navigate(-1)}>
                            <i className="bi bi-arrow-left fs-5"></i>
                        </Button>
                        <div>
                            <h2 className="fw-bold text-dark mb-0">Fee Records Hub</h2>
                            <p className="text-muted mb-0">View, search, and manage all student fee records.</p>
                        </div>
                    </div>
                    <Button variant="primary" className="rounded-pill px-4 fw-bold shadow-sm" onClick={() => navigate('/issue-fees')}>
                        <i className="bi bi-plus-lg me-2"></i>Issue New Fee
                    </Button>
                </div>

                {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}

               
                <Card className="border-0 shadow-sm rounded-4 mb-4">
                    <Card.Body className="p-3 p-md-4">
                        <Row className="g-3 align-items-end">
                            <Col md={4}>
                                <Form.Label className="small fw-bold text-secondary">Search Student</Form.Label>
                                <InputGroup>
                                    <InputGroup.Text className="bg-light border-0"><i className="bi bi-search"></i></InputGroup.Text>
                                    <Form.Control 
                                        className="bg-light border-0" 
                                        placeholder="Name or email..." 
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </InputGroup>
                            </Col>
                            <Col md={3}>
                                <Form.Label className="small fw-bold text-secondary">Fee Month</Form.Label>
                                <Form.Select className="bg-light border-0" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}>
                                    <option value="">All Months</option>
                                    {months.map(m => <option key={m} value={m}>{m}</option>)}
                                </Form.Select>
                            </Col>
                            <Col md={3}>
                                <Form.Label className="small fw-bold text-secondary">Status</Form.Label>
                                <Form.Select className="bg-light border-0" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                                    <option value="">All Statuses</option>
                                    <option value="Pending">Pending</option>
                                    <option value="Review">Under Review</option>
                                    <option value="Paid">Paid</option>
                                </Form.Select>
                            </Col>
                            <Col md={2}>
                                <Button variant="outline-secondary" className="w-100 rounded-pill" onClick={() => { setFilterStatus(''); setFilterMonth(''); setSearchTerm(''); }}>
                                    Reset
                                </Button>
                            </Col>
                        </Row>
                    </Card.Body>
                </Card>

              
                <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
                    <Card.Body className="p-0">
                        <div className="table-responsive">
                            <Table hover className="align-middle mb-0 custom-table">
                                <thead className="bg-light text-secondary small fw-bold">
                                    <tr>
                                        <th className="ps-4">Month</th>
                                        <th>Student</th>
                                        <th>Amount</th>
                                        <th>Due Date</th>
                                        <th className="text-center">Status</th>
                                     
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan="6" className="text-center py-5"><Spinner animation="border" variant="primary" /></td></tr>
                                    ) : filteredFees.length > 0 ? filteredFees.map((f) => (
                                        <tr key={f._id}>
                                            <td className="ps-4">
                                                <Badge bg="primary" className="bg-opacity-10 text-primary px-3 py-2 rounded-pill fw-bold">
                                                    {f.month}
                                                </Badge>
                                            </td>
                                            <td>
                                                <div className="fw-bold text-dark">{f.studentName}</div>
                                                <div className="small text-muted">{f.parentEmail}</div>
                                            </td>
                                            <td className="fw-bold text-primary">Rs {f.amount.toLocaleString()}</td>
                                            <td className="small">{new Date(f.dueDate).toLocaleDateString()}</td>
                                            <td className="text-center">
                                                {f.status === 'Paid' && <Badge bg="success" className="bg-opacity-10 text-success px-3 py-2 rounded-pill">Paid</Badge>}
                                                {f.status === 'Pending' && <Badge bg="warning" className="bg-opacity-10 text-warning px-3 py-2 rounded-pill">Pending</Badge>}
                                                {f.status === 'Review' && <Badge bg="info" className="bg-opacity-10 text-info px-3 py-2 rounded-pill">Under Review</Badge>}
                                            </td>
                                            <td className="text-center">
                                                <div className="d-flex align-items-center justify-content-center gap-2">
                                                    {f.status === 'Review' && (
                                                        <>
                                                            {f.parentReceipt && (
                                                                <Button size="sm" variant="outline-primary" className="rounded-pill p-1 px-2" onClick={() => downloadFile(f.parentReceipt)} title="Download Receipt">
                                                                    <i className="bi bi-download"></i>
                                                                </Button>
                                                            )}
                                                            <Button size="sm" variant="success" className="rounded-pill p-1 px-2" onClick={() => handleApprove(f._id)} title="Approve Payment">
                                                                <i className="bi bi-check-lg"></i>
                                                            </Button>
                                                        </>
                                                    )}
                                               
                                                </div>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="6" className="text-center py-5 text-muted">
                                                No fee records match your current filters.
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
                        padding: 1rem;
                        border-bottom: 1px solid #f1f5f9;
                    }
                    .custom-table tbody tr:last-child td {
                        border-bottom: none;
                    }
                `}
            </style>
        </Layout>
    );
};

export default AllFees;
