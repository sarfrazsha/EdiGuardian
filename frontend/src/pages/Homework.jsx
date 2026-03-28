import React, { useState, useEffect } from 'react';
import { Container, Table, Button, Modal, Form, Card, Badge, Row, Col } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';

const Homework = () => {
    const navigate = useNavigate();
    const role = localStorage.getItem('userRole')?.toLowerCase();
    const [homeworks, setHomeworks] = useState([
        { id: 1, title: 'Math Algebra Basics', subject: 'Mathematics', dueDate: '2026-03-10', description: 'Solve exercises 1-10 on page 45.', fileName: 'algebra_intro.pdf' },
        { id: 2, title: 'English Essay: The Future', subject: 'English', dueDate: '2026-03-12', description: 'Write a 500-word essay about future technology.', fileName: 'essay_guidelines.docx' }
    ]);

    const [showModal, setShowModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentHomeworkId, setCurrentHomeworkId] = useState(null);
    const [selectedHomework, setSelectedHomework] = useState(null);
    const [newHomework, setNewHomework] = useState({ title: '', subject: '', dueDate: '', description: '', file: null });

    const handleClose = () => {
        setShowModal(false);
        setIsEditing(false);
        setCurrentHomeworkId(null);
        setNewHomework({ title: '', subject: '', dueDate: '', description: '', file: null });
    };

    const handleViewClose = () => {
        setShowViewModal(false);
        setSelectedHomework(null);
    };

    const handleShow = () => setShowModal(true);

    const handleView = (hw) => {
        setSelectedHomework(hw);
        setShowViewModal(true);
    };

    const handleEdit = (e, hw) => {
        e.stopPropagation(); // Prevent row click
        setIsEditing(true);
        setCurrentHomeworkId(hw.id);
        setNewHomework({
            title: hw.title,
            subject: hw.subject,
            dueDate: hw.dueDate,
            description: hw.description,
            file: null // Files aren't easily pre-filled in input[type=file]
        });
        setShowModal(true);
    };

    const handleDelete = (e, id) => {
        e.stopPropagation(); // Prevent row click
        if (window.confirm('Are you sure you want to delete this assignment?')) {
            setHomeworks(homeworks.filter(hw => hw.id !== id));
        }
    };

    const handleSave = () => {
        if (isEditing) {
            setHomeworks(homeworks.map(hw =>
                hw.id === currentHomeworkId
                    ? {
                        ...hw,
                        ...newHomework,
                        fileName: newHomework.file ? newHomework.file.name : hw.fileName
                    }
                    : hw
            ));
        } else {
            const entry = {
                id: Date.now(),
                ...newHomework,
                fileName: newHomework.file ? newHomework.file.name : 'No file'
            };
            setHomeworks([...homeworks, entry]);
        }
        handleClose();
    };

    return (
        <Layout>
            <Container fluid className="py-4">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <div className="d-flex align-items-center gap-3">
                        <div className="d-flex gap-2">
                            <Button
                                variant="light"
                                className="rounded-circle shadow-sm border p-0 d-flex align-items-center justify-content-center"
                                style={{ width: '40px', height: '40px' }}
                                onClick={() => navigate(-1)}
                                title="Go Back"
                            >
                                <i className="bi bi-arrow-left fs-5"></i>
                            </Button>
                            <Button
                                variant="light"
                                className="rounded-circle shadow-sm border p-0 d-flex align-items-center justify-content-center"
                                style={{ width: '40px', height: '40px' }}
                                onClick={() => navigate(1)}
                                title="Go Forward"
                            >
                                <i className="bi bi-arrow-right fs-5"></i>
                            </Button>
                        </div>
                        <div>
                            <h2 className="fw-bold mb-0">Homework Assignments</h2>
                            <p className="text-muted small mb-0">View and manage classroom assignments</p>
                        </div>
                    </div>
                    {(role === 'teacher' || role === 'admin') && (
                        <Button variant="primary" className="rounded-pill px-4 shadow-sm" onClick={handleShow}>
                            <i className="bi bi-plus-circle me-2"></i>Create Homework
                        </Button>
                    )}
                </div>

                <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
                    <Card.Body className="p-0">
                        <Table responsive hover className="mb-0">
                            <thead className="bg-light text-secondary small text-uppercase">
                                <tr>
                                    <th className="ps-4 py-3">Assignment Title</th>
                                    <th className="py-3">Subject</th>
                                    <th className="py-3">Due Date</th>
                                    <th className="py-3">Resources</th>
                                    <th className="py-3 text-center">Status</th>
                                    {(role === 'teacher' || role === 'admin') && <th className="py-3 text-center">Actions</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {homeworks.map((hw) => (
                                    <tr
                                        key={hw.id}
                                        className="align-middle"
                                        onClick={() => handleView(hw)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <td className="ps-4">
                                            <div className="fw-bold text-dark">{hw.title}</div>
                                            <div className="text-muted x-small text-truncate" style={{ maxWidth: '300px' }}>{hw.description}</div>
                                        </td>
                                        <td><Badge bg="info" className="bg-opacity-10 text-info px-2 py-1">{hw.subject}</Badge></td>
                                        <td className="text-secondary">{hw.dueDate}</td>
                                        <td>
                                            <div className="d-flex align-items-center text-primary text-decoration-none">
                                                <i className="bi bi-file-earmark-arrow-down me-2"></i>
                                                <span className="small">{hw.fileName}</span>
                                            </div>
                                        </td>
                                        <td className="text-center">
                                            <Badge bg="success" className="bg-opacity-10 text-success rounded-pill px-3">Open</Badge>
                                        </td>
                                        {(role === 'teacher' || role === 'admin') && (
                                            <td className="text-center">
                                                <div className="d-flex justify-content-center gap-2">
                                                    <Button
                                                        variant="outline-primary"
                                                        size="sm"
                                                        className="rounded-circle border-0 p-2"
                                                        onClick={(e) => handleEdit(e, hw)}
                                                        title="Edit"
                                                    >
                                                        <i className="bi bi-pencil-square"></i>
                                                    </Button>
                                                    <Button
                                                        variant="outline-danger"
                                                        size="sm"
                                                        className="rounded-circle border-0 p-2"
                                                        onClick={(e) => handleDelete(e, hw.id)}
                                                        title="Delete"
                                                    >
                                                        <i className="bi bi-trash3"></i>
                                                    </Button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                                {homeworks.length === 0 && (
                                    <tr>
                                        <td colSpan={(role === 'teacher' || role === 'admin') ? "6" : "5"} className="text-center py-5 text-muted">No homework assignments found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </Table>
                    </Card.Body>
                </Card>

                {/* View Homework Details Modal */}
                <Modal show={showViewModal} onHide={handleViewClose} centered size="lg">
                    <Modal.Header closeButton className="border-0 pb-0">
                        <Modal.Title className="fw-bold text-primary">Assignment Details</Modal.Title>
                    </Modal.Header>
                    <Modal.Body className="p-4">
                        {selectedHomework && (
                            <div className="homework-details">
                                <Row className="mb-4 align-items-center">
                                    <Col md={8}>
                                        <h3 className="fw-bold text-dark mb-1">{selectedHomework.title}</h3>
                                        <Badge bg="info" className="bg-opacity-10 text-info px-3 py-2 fs-6">
                                            <i className="bi bi-journal-bookmark me-2"></i>{selectedHomework.subject}
                                        </Badge>
                                    </Col>
                                    <Col md={4} className="text-md-end mt-3 mt-md-0">
                                        <div className="text-muted small fw-bold text-uppercase">Due Date</div>
                                        <div className="fw-bold text-danger fs-5">
                                            <i className="bi bi-calendar-event me-2"></i>{selectedHomework.dueDate}
                                        </div>
                                    </Col>
                                </Row>

                                <div className="mb-4">
                                    <h5 className="fw-bold text-dark border-bottom pb-2 mb-3">Instructions</h5>
                                    <p className="text-secondary lh-lg" style={{ whiteSpace: 'pre-wrap' }}>
                                        {selectedHomework.description}
                                    </p>
                                </div>

                                {selectedHomework.fileName && selectedHomework.fileName !== 'No file' && (
                                    <div className="mt-4 p-4 bg-light rounded-4 border border-dashed border-primary border-opacity-25">
                                        <div className="d-flex align-items-center justify-content-between">
                                            <div className="d-flex align-items-center">
                                                <div className="bg-primary bg-opacity-10 p-3 rounded-3 text-primary me-3">
                                                    <i className="bi bi-file-earmark-pdf fs-3"></i>
                                                </div>
                                                <div>
                                                    <div className="fw-bold text-dark">{selectedHomework.fileName}</div>
                                                    <div className="text-muted small">Ready to download</div>
                                                </div>
                                            </div>
                                            <Button
                                                variant="primary"
                                                className="rounded-pill px-4"
                                                onClick={() => alert(`Downloading: ${selectedHomework.fileName}`)}
                                            >
                                                <i className="bi bi-download me-2"></i>Download
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </Modal.Body>
                    <Modal.Footer className="border-0 pt-0">
                        <Button variant="outline-secondary" className="px-4 rounded-pill" onClick={handleViewClose}>Close</Button>
                    </Modal.Footer>
                </Modal>

                {/* Create/Edit Homework Modal */}
                <Modal show={showModal} onHide={handleClose} centered backdrop="static">
                    <Modal.Header closeButton className="border-0 pb-0">
                        <Modal.Title className="fw-bold">{isEditing ? 'Edit Assignment' : 'Create New Assignment'}</Modal.Title>
                    </Modal.Header>
                    <Modal.Body className="pt-3">
                        <Form>
                            <Form.Group className="mb-3">
                                <Form.Label className="small fw-bold">Assignment Title</Form.Label>
                                <Form.Control
                                    type="text"
                                    placeholder="e.g. History Chapter 5 Quiz"
                                    value={newHomework.title}
                                    onChange={(e) => setNewHomework({ ...newHomework, title: e.target.value })}
                                />
                            </Form.Group>
                            <Row>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label className="small fw-bold">Subject</Form.Label>
                                        <Form.Control
                                            type="text"
                                            placeholder="e.g. Biology"
                                            value={newHomework.subject}
                                            onChange={(e) => setNewHomework({ ...newHomework, subject: e.target.value })}
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label className="small fw-bold">Due Date</Form.Label>
                                        <Form.Control
                                            type="date"
                                            value={newHomework.dueDate}
                                            onChange={(e) => setNewHomework({ ...newHomework, dueDate: e.target.value })}
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>
                            <Form.Group className="mb-3">
                                <Form.Label className="small fw-bold">Description / Instructions</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={3}
                                    placeholder="Details about the homework..."
                                    value={newHomework.description}
                                    onChange={(e) => setNewHomework({ ...newHomework, description: e.target.value })}
                                />
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label className="small fw-bold">Attachments (Files)</Form.Label>
                                <Form.Control
                                    type="file"
                                    onChange={(e) => setNewHomework({ ...newHomework, file: e.target.files[0] })}
                                />
                                {isEditing && <Form.Text className="text-muted">Leave empty to keep existing file.</Form.Text>}
                            </Form.Group>
                        </Form>
                    </Modal.Body>
                    <Modal.Footer className="border-0 pt-0">
                        <Button variant="light" onClick={handleClose}>Cancel</Button>
                        <Button variant="primary" className="px-4" onClick={handleSave}>
                            {isEditing ? 'Save Changes' : 'Assign Homework'}
                        </Button>
                    </Modal.Footer>
                </Modal>
            </Container>
        </Layout>
    );
};

export default Homework;
