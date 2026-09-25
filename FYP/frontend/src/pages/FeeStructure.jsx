import React, { useState, useEffect } from 'react';
import { Container, Card, Form, Button, Spinner, Alert, Table, Badge, InputGroup } from 'react-bootstrap';
import { Navigate, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Axios from 'axios';

const FeeStructure = () => {
    const navigate = useNavigate();
    const role = localStorage.getItem('userRole');
    const email = localStorage.getItem('userEmail');

    if (!email || (role?.toLowerCase() !== 'admin')) {
        return <Navigate to="/" replace />;
    }

    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState('');
    // Unsaved edits: { [classNo]: value }
    const [drafts, setDrafts] = useState({});
    const [saving, setSaving] = useState(null); // classNo being saved

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await Axios.get('/api/fee-structure');
            setClasses(res.data);
        } catch (err) {
            console.error("Failed to fetch fee structure", err);
            setError("Failed to load classes.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const valueFor = (c) => drafts[c.classNo] ?? (c.monthlyFee ?? '');
    const isDirty = (c) => drafts[c.classNo] !== undefined && String(drafts[c.classNo]) !== String(c.monthlyFee ?? '');

    const handleSave = async (c) => {
        const fee = Number(valueFor(c));
        if (!fee || fee < 1) {
            setError(`Enter a valid monthly fee for class ${c.classNo}.`);
            return;
        }
        setSaving(c.classNo);
        setError(null);
        try {
            const res = await Axios.put('/api/fee-structure', { role: 'admin', classNo: c.classNo, monthlyFee: fee });
            setClasses(prev => prev.map(x => x.classNo === c.classNo ? { ...x, monthlyFee: res.data.monthlyFee, updatedAt: res.data.updatedAt } : x));
            setDrafts(prev => {
                const next = { ...prev };
                delete next[c.classNo];
                return next;
            });
            setSuccessMsg(`Monthly fee for class ${c.classNo} set to Rs ${res.data.monthlyFee.toLocaleString()}.`);
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to save fee.");
        } finally {
            setSaving(null);
        }
    };

    const configured = classes.filter(c => c.monthlyFee).length;

    return (
        <Layout>
            <Container fluid className="py-4">
                <div className="mb-4 d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <div className="d-flex align-items-center gap-3">
                        <Button variant="light" className="rounded-circle shadow-sm border p-2 d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }} onClick={() => navigate(-1)}>
                            <i className="bi bi-arrow-left fs-5"></i>
                        </Button>
                        <div>
                            <h2 className="fw-bold text-dark mb-0">Fee Structure</h2>
                            <p className="text-muted mb-0">Set the standard monthly fee for each class. Issued vouchers use this amount.</p>
                        </div>
                    </div>
                    <Button variant="outline-primary" className="rounded-pill" onClick={() => navigate('/issue-fees')}>
                        <i className="bi bi-plus-circle me-2"></i>Issue Fees
                    </Button>
                </div>

                {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}
                {successMsg && <Alert variant="success" dismissible onClose={() => setSuccessMsg('')}>{successMsg}</Alert>}

                <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
                    <Card.Body className="p-0">
                        <div className="d-flex justify-content-between align-items-center p-4 pb-3">
                            <h5 className="fw-bold mb-0">Classes</h5>
                            {!loading && (
                                <span className="small text-muted">{configured} of {classes.length} classes have a fee set</span>
                            )}
                        </div>
                        <div className="table-responsive">
                            <Table hover className="align-middle mb-0">
                                <thead className="bg-light text-secondary small fw-bold">
                                    <tr>
                                        <th className="ps-4">Class</th>
                                        <th>Students</th>
                                        <th>Status</th>
                                        <th style={{ width: '240px' }}>Monthly Fee</th>
                                        <th className="text-center pe-4" style={{ width: '120px' }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan="5" className="text-center py-5"><Spinner animation="border" variant="primary" /></td></tr>
                                    ) : classes.length === 0 ? (
                                        <tr><td colSpan="5" className="text-center py-5 text-muted">No classes found. Add classes under Classes first.</td></tr>
                                    ) : classes.map(c => (
                                        <tr key={c.classNo}>
                                            <td className="ps-4 fw-bold">{c.classNo}</td>
                                            <td className="text-muted">{c.studentCount}</td>
                                            <td>
                                                {c.monthlyFee
                                                    ? <Badge bg="success" className="bg-opacity-10 text-success px-3 py-2 rounded-pill">Set</Badge>
                                                    : <Badge bg="warning" className="bg-opacity-10 text-warning px-3 py-2 rounded-pill">Not set</Badge>}
                                            </td>
                                            <td>
                                                <InputGroup size="sm">
                                                    <InputGroup.Text>Rs</InputGroup.Text>
                                                    <Form.Control
                                                        type="number"
                                                        min="1"
                                                        placeholder="e.g. 5000"
                                                        value={valueFor(c)}
                                                        onChange={(e) => setDrafts(prev => ({ ...prev, [c.classNo]: e.target.value }))}
                                                        onKeyDown={(e) => { if (e.key === 'Enter' && isDirty(c)) handleSave(c); }}
                                                    />
                                                </InputGroup>
                                            </td>
                                            <td className="text-center pe-4">
                                                <Button
                                                    size="sm"
                                                    variant={isDirty(c) ? 'primary' : 'outline-secondary'}
                                                    className="rounded-pill px-3"
                                                    disabled={!isDirty(c) || saving === c.classNo}
                                                    onClick={() => handleSave(c)}
                                                >
                                                    {saving === c.classNo ? <Spinner size="sm" /> : 'Save'}
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </div>
                    </Card.Body>
                </Card>
            </Container>
        </Layout>
    );
};

export default FeeStructure;
