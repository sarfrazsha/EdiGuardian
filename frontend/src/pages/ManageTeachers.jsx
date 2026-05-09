
import React, { useState, useEffect } from 'react';
import { Container, Table, Button, Card, Modal, Form, Badge, Spinner, Alert } from 'react-bootstrap';
import { useNavigate, useLocation } from 'react-router-dom';
import Layout from '../components/Layout';
import axios from 'axios';

const ManageTeachers = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [teachers, setTeachers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedId, setSelectedId] = useState(null);

   
    const [formData, setFormData] = useState({
        teacherName: '',
        email: '',
        password: '', 
        profilePicture: '',
        phoneNumber: '',
        address: '',
     
    });

    
    const fetchTeachers = async () => {
        setLoading(true);
        try {
            const res = await axios.get('http://localhost:8080/api/teachers');
            setTeachers(res.data);
            setError(null);
        } catch (err) {
            console.error("Error fetching teachers:", err);
            setError("Failed to fetch teacher records.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchTeachers(); }, []);

    
    useEffect(() => {
        if (location.state?.openAdd) {
            handleShowAdd();
        }
    }, [location.state?.openAdd]);

    const handleShowAdd = () => {
        setIsEditing(false);
        setFormData({
            teacherName: '',
            email: '',
            password: '',
            profilePicture: '',
            phoneNumber: '',
            address: '',
            role: 'Teacher'
        });
        setShowModal(true);
    };

    const handleShowEdit = (teacher) => {
        setIsEditing(true);
        setSelectedId(teacher._id);
        setFormData({
            teacherName: teacher.teacherName,
            email: teacher.email,
            phoneNumber: teacher.phoneNumber || '',
            address: teacher.address || '',
            profilePicture: null,
            password: ''
        });
        setShowModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const data = new FormData();
            data.append('teacherName', formData.teacherName);
            data.append('email', formData.email);
            data.append('phoneNumber', formData.phoneNumber);
            data.append('address', formData.address);
            if (formData.password) {
                data.append('password', formData.password);
            }
            if (formData.profilePicture instanceof File) {
                data.append('profilePicture', formData.profilePicture);
            }

            if (isEditing) {
                await axios.put(`http://localhost:8080/teacher/update/${selectedId}`, data);
            } else {
                await axios.post('http://localhost:8080/users', data);
            }
            setShowModal(false);
            fetchTeachers();
        } catch (err) {
            console.error("Save Error:", err);
            alert(isEditing ? "Error updating teacher" : "Error saving teacher");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Deleting a teacher will affect assigned classes. Proceed?")) {
            try {
                await axios.delete(`http://localhost:8080/teacher/delete/${id}`);
                fetchTeachers();
            } catch (err) {
                alert("Error deleting teacher");
            }
        }
    };

    return (
        <Layout>
            <Container fluid className="py-4">
                {error && <Alert variant="danger" onClose={() => setError(null)} dismissible>{error}</Alert>}

                <div className="d-flex justify-content-between align-items-center mb-4">
                    <div className="d-flex align-items-center gap-3">
                        <Button
                            variant="light"
                            className="rounded-circle shadow-sm border p-2 d-flex align-items-center justify-content-center"
                            style={{ width: '40px', height: '40px' }}
                            onClick={() => navigate(-1)}
                        >
                            <i className="bi bi-arrow-left fs-5"></i>
                        </Button>
                        <div>
                            <h2 className="fw-bold mb-0 text-dark">Faculty Management</h2>
                            
                        </div>
                    </div>
                    <Button variant="success" className="rounded-pill px-4 shadow-sm" onClick={handleShowAdd}>
                        <i className="bi bi-person-plus-fill me-2"></i>Add Faculty Member
                    </Button>
                </div>

                <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
                    <Card.Body className="p-0">
                        {loading && !showModal ? (
                            <div className="text-center py-5">
                                <Spinner animation="border" variant="success" />
                                <p className="mt-2 text-muted">Accessing Database...</p>
                            </div>
                        ) : (
                            <Table hover responsive className="mb-0 align-middle">
                                <thead className="bg-light text-secondary small text-uppercase">
                                    <tr>
                                        <th className="ps-4 py-3">Teacher Details</th>
                                        <th className="py-3">Contact Email</th>
                                        <th className="py-3">Class</th>
                                        <th className="text-end pe-4 py-3">Management</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {teachers.map(t => (
                                        <tr key={t._id}>
                                            <td className="ps-4">
                                                <div className="d-flex align-items-center">
                                                    {t.profilePicture ? (
                                                        <img src={t.profilePicture} alt="profile" className="rounded-circle me-3 border" style={{ width: '40px', height: '40px', objectFit: 'cover' }} />
                                                    ) : (
                                                        <div className="bg-success bg-opacity-10 text-success rounded-circle p-2 me-3 fw-bold d-flex justify-content-center align-items-center" style={{ width: '40px', height: '40px' }}>
                                                            {t.teacherName.charAt(0)}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <span className="fw-bold">{t.teacherName}</span>
                                                        <div className="text-muted small">{t.phoneNumber || 'No phone'}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="text-muted small">{t.email}</td>
                                            <td>
                                                <Badge bg="success" className="bg-opacity-10 text-success fw-normal px-3">
                                                    {t.class || 'Not Assigned'}
                                                </Badge>
                                            </td>
                                            <td className="text-end pe-4">
                                                <Button variant="light" size="sm" className="me-2 text-primary border" onClick={() => handleShowEdit(t)}>
                                                    <i className="bi bi-pencil-square"></i>
                                                </Button>
                                                <Button variant="light" size="sm" className="text-danger border" onClick={() => handleDelete(t._id)}>
                                                    <i className="bi bi-trash3"></i>
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        )}
                    </Card.Body>
                </Card>
            </Container>

            {/* Modal for Registering/Updating Faculty */}
            <Modal show={showModal} onHide={() => setShowModal(false)} centered backdrop="static">
                <Modal.Header closeButton className="border-0 pb-0">
                    <Modal.Title className="fw-bold">
                        {isEditing ? 'Edit Faculty Record' : 'Register New Faculty'}
                    </Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleSave}>
                    <Modal.Body className="pt-3">
                        <Form.Group className="mb-3">
                            <Form.Label className="small fw-bold">Full Name</Form.Label>
                            <Form.Control
                                required
                                value={formData.teacherName}
                                onChange={e => setFormData({ ...formData, teacherName: e.target.value })}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label className="small fw-bold">Official Email</Form.Label>
                            <Form.Control
                                type="email"
                                required
                                pattern="^.*@gmail\.com$"
                                title="Email must end with @gmail.com"
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                            />
                        </Form.Group>
                        {!isEditing && (
                            <Form.Group className="mb-3">
                                <Form.Label className="small fw-bold">Initial Password</Form.Label>
                                <Form.Control
                                    type="password"
                                    required
                                    placeholder="Minimum 6 characters"
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                />
                            </Form.Group>
                        )}

                        <Form.Group className="mb-3">
                            <Form.Label className="small fw-bold">Phone Number</Form.Label>
                            <Form.Control
                                required
                                pattern="[0-9]{11}"
                                title="Phone number must be exactly 11 digits"
                                value={formData.phoneNumber}
                                placeholder="e.g. 03001234567"
                                onChange={e => setFormData({ ...formData, phoneNumber: e.target.value })}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label className="small fw-bold">Address</Form.Label>
                            <Form.Control
                                as="textarea"
                                required
                                rows={2}
                                value={formData.address}
                                placeholder="Enter residential address"
                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label className="small fw-bold">Profile Picture</Form.Label>
                            <Form.Control
                                type="file"
                                accept="image/*"
                                onChange={e => {
                                    const file = e.target.files[0];
                                    if (file) {
                                        setFormData({ ...formData, profilePicture: file });
                                    }
                                }}
                            />
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer className="border-0">
                        <Button variant="light" onClick={() => setShowModal(false)}>Cancel</Button>
                        <Button variant="success" type="submit" disabled={loading} className="px-4 rounded-pill">
                            {loading ? <Spinner size="sm" /> : (isEditing ? 'Update Record' : 'Complete Registration')}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </Layout>
    );
};

export default ManageTeachers;