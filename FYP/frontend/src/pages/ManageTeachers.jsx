
import React, { useState, useEffect } from 'react';
import { Container, Table, Button, Card, Modal, Form, Badge, Spinner, Alert } from 'react-bootstrap';
import { useNavigate, useLocation } from 'react-router-dom';
import Layout from '../components/Layout';
import axios from 'axios';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

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
        subject: 'Mathematics'
    });

    const SUBJECT_OPTIONS = [
        'Mathematics',
        'English',
        'Urdu',
        'Physics',
        'Chemistry',
        'Computer Science'
    ];

    const fetchTeachers = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/teachers');
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
            subject: 'Mathematics',
            role: 'Teacher'
        });
        setShowModal(true);
    };

    const handleShowEdit = (teacher) => {
        setIsEditing(true);
        setSelectedId(teacher._id || teacher.id);
        setFormData({
            teacherName: teacher.teacherName || teacher.name,
            email: teacher.email || teacher.teacherEmail,
            phoneNumber: teacher.phoneNumber || teacher.teacherContact || '',
            address: teacher.address || teacher.teacherAddress || '',
            profilePicture: null,
            password: teacher.teacherPassword || '',
            subject: teacher.subject || 'Mathematics'
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
            data.append('subject', formData.subject || 'General');
            if (formData.password) {
                data.append('password', formData.password);
            }
            if (formData.profilePicture instanceof File) {
                data.append('profilePicture', formData.profilePicture);
            }

            if (isEditing) {
                await axios.put(`/api/teacher/update/${selectedId}`, data);
            } else {
                await axios.post('/users', data);
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
                await axios.delete(`/api/teacher/delete/${id}`);
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
                            <p className="text-muted small mb-0">Manage teaching staff, subjects, and classroom assignments</p>
                        </div>
                    </div>
                    <div className="d-flex gap-2">
                        <Button variant="success" className="rounded-pill px-4 shadow-sm" onClick={handleShowAdd}>
                            <i className="bi bi-person-plus-fill me-2"></i>Add Faculty Member
                        </Button>
                    </div>
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
                                        <th className="py-3">Subject Specialization</th>
                                        <th className="py-3">Contact Email</th>
                                        <th className="text-end pe-4 py-3">Management</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {teachers.length > 0 ? teachers.map(t => (
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
                                            <td>
                                                <Badge bg="primary" className="bg-opacity-10 text-primary fw-bold px-3 py-2 rounded-pill border border-primary border-opacity-25">
                                                    <i className="bi bi-book-half me-1"></i>{t.subject || 'General'}
                                                </Badge>
                                            </td>
                                            <td className="text-muted small">{t.email}</td>
                                            <td className="text-end pe-4">
                                                <Button variant="light" size="sm" className="me-2 text-primary border" onClick={() => handleShowEdit(t)}>
                                                    <i className="bi bi-pencil-square"></i>
                                                </Button>
                                                <Button variant="light" size="sm" className="text-danger border" onClick={() => handleDelete(t._id)}>
                                                    <i className="bi bi-trash3"></i>
                                                </Button>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="4" className="text-center py-5 text-muted">
                                                <i className="bi bi-person-x fs-1 d-block mb-2 text-secondary opacity-50"></i>
                                                No faculty members found. Click "Add Faculty Member" to register a new teacher with their subject.
                                            </td>
                                        </tr>
                                    )}
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
                        <Alert variant="info" className="py-2 px-3 small border-0 rounded-3 d-flex align-items-center mb-3 bg-primary bg-opacity-10 text-primary">
                            <i className="bi bi-info-circle-fill me-2 fs-6"></i>
                            <div><strong>Subject Specialization:</strong> This teacher will be restricted to marking attendance and grading for their assigned subject.</div>
                        </Alert>

                        <Form.Group className="mb-3">
                            <Form.Label className="small fw-bold">Full Name</Form.Label>
                            <Form.Control
                                required
                                placeholder="e.g. Dr. Muhammad Ahmed"
                                value={formData.teacherName}
                                onChange={e => setFormData({ ...formData, teacherName: e.target.value })}
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label className="small fw-bold d-flex align-items-center">
                                <i className="bi bi-book-half text-primary me-2"></i>
                                <span>Subject Specialization <span className="text-danger">*</span></span>
                            </Form.Label>
                            <Form.Select
                                required
                                className="shadow-sm border"
                                value={SUBJECT_OPTIONS.includes(formData.subject) ? formData.subject : 'Other'}
                                onChange={e => {
                                    const val = e.target.value;
                                    if (val === 'Other') {
                                        setFormData({ ...formData, subject: '' });
                                    } else {
                                        setFormData({ ...formData, subject: val });
                                    }
                                }}
                            >
                                {SUBJECT_OPTIONS.map(subj => (
                                    <option key={subj} value={subj}>{subj}</option>
                                ))}
                                <option value="Other">Other (Type Custom Subject)...</option>
                            </Form.Select>
                            {(!SUBJECT_OPTIONS.includes(formData.subject) || formData.subject === '') && (
                                <Form.Control
                                    type="text"
                                    className="mt-2 shadow-sm"
                                    placeholder="Enter custom subject name (e.g. Statistics, Economics)"
                                    value={formData.subject}
                                    onChange={e => setFormData({ ...formData, subject: e.target.value })}
                                    required
                                />
                            )}
                            <Form.Text className="text-muted" style={{ fontSize: '11px' }}>
                                The teacher will only be authorized to mark attendance and grade papers for this subject.
                            </Form.Text>
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
                        <Form.Group className="mb-3">
                            <Form.Label className="small fw-bold">{isEditing ? 'Update Password' : 'Initial Password'}</Form.Label>
                            <Form.Control
                                type="text"
                                required
                                minLength="8"
                                value={formData.password}
                                placeholder="Minimum 8 characters"
                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                            />
                            <Form.Text className="text-muted" style={{ fontSize: '10px' }}>Minimum 8 characters</Form.Text>
                        </Form.Group>

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
                                        if (file.size > MAX_FILE_SIZE) {
                                            alert('System supports only up to 10 MB for uploads.');
                                            e.target.value = '';
                                            return;
                                        }
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
