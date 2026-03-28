import React, { useState, useEffect } from 'react';
import { Container, Card, Button, Modal, Form } from 'react-bootstrap';
import { useLocation, Navigate, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import axios from 'axios';

const Announcements = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { email, role } = location.state || {
        email: localStorage.getItem('userEmail'),
        role: localStorage.getItem('userRole')
    };

    const [announcements, setAnnouncements] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editingAnnouncement, setEditingAnnouncement] = useState(null);
    const [formData, setFormData] = useState({ title: '', content: '' });
    const [loading, setLoading] = useState(false);

    // Redirect if not logged in
    if (!email) {
        return <Navigate to="/" replace />;
    }

    const isAdmin = role === 'admin' || role === 'Admin';

    useEffect(() => {
        fetchAnnouncements();
        markAsRead();
    }, []);

    const markAsRead = async () => {
        try {
            await axios.put('http://localhost:8080/api/announcements/mark-all-read', { email });
            // Notify Navbar to clear badge
            window.dispatchEvent(new Event('announcements-read'));
        } catch (error) {
            console.error("Error marking as read:", error);
        }
    };

    const fetchAnnouncements = async () => {
        try {
            const res = await axios.get('http://localhost:8080/api/announcements');
            setAnnouncements(res.data);
        } catch (error) {
            console.error("Error fetching announcements:", error);
        }
    };

    const handleValidSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const payload = { ...formData, role };

            if (editingAnnouncement) {
                // Update
                await axios.put(`http://localhost:8080/api/announcements/${editingAnnouncement._id}`, payload);
            } else {
                // Create
                await axios.post('http://localhost:8080/api/announcements', payload);
            }

            setShowModal(false);
            setFormData({ title: '', content: '' });
            setEditingAnnouncement(null);
            fetchAnnouncements();

        } catch (error) {
            console.error("Error saving announcement:", error);
            alert("Failed to save announcement");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this announcement?")) return;

        try {
            // Passing role in query as checking body in DELETE can be tricky depending on backend config
            await axios.delete(`http://localhost:8080/api/announcements/${id}?role=${role}`, {
                data: { role } // Sending body just in case backend checks it
            });
            fetchAnnouncements();
        } catch (error) {
            console.error("Error deleting announcement:", error);
            alert("Failed to delete announcement");
        }
    };

    const openModal = (announcement = null) => {
        if (announcement) {
            setEditingAnnouncement(announcement);
            setFormData({ title: announcement.title, content: announcement.content });
        } else {
            setEditingAnnouncement(null);
            setFormData({ title: '', content: '' });
        }
        setShowModal(true);
    };

    return (
        <Layout>
            <Container fluid className="py-4">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h2 className="fw-bold text-primary mb-0">Announcements</h2>
                    {isAdmin && (
                        <Button variant="primary" onClick={() => openModal()}>
                            <i className="bi bi-plus-lg me-2"></i>Create New
                        </Button>
                    )}
                </div>

                {announcements.length === 0 ? (
                    <div className="text-center py-5">
                        <i className="bi bi-megaphone fs-1 text-muted"></i>
                        <p className="mt-3 text-muted">No announcements yet.</p>
                    </div>
                ) : (
                    <div className="d-flex flex-column gap-3">
                        {announcements.map((item) => (
                            <Card key={item._id} className="border-0 shadow-sm rounded-4 overflow-hidden card-hover-light">
                                <Card.Body className="p-4">
                                    <div className="d-flex justify-content-between align-items-start mb-2">
                                        <h4 className="fw-bold text-dark mb-0">{item.title}</h4>
                                        {isAdmin && (
                                            <div className="d-flex gap-2">
                                                <Button size="sm" variant="outline-primary" onClick={() => openModal(item)}>
                                                    <i className="bi bi-pencil-square"></i>
                                                </Button>
                                                <Button size="sm" variant="outline-danger" onClick={() => handleDelete(item._id)}>
                                                    <i className="bi bi-trash"></i>
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-secondary mb-3" style={{ fontSize: '1.05rem', whiteSpace: 'pre-line' }}>{item.content}</p>
                                    <div className="d-flex align-items-center gap-3 text-muted small border-top pt-3">
                                        <div className="d-flex align-items-center">
                                            <i className="bi bi-person-circle me-1"></i>
                                            {item.role === 'admin' ? 'Administration' : 'Faculty'}
                                        </div>
                                        <div className="d-flex align-items-center border-start ps-3">
                                            <i className="bi bi-calendar3 me-1"></i>
                                            {new Date(item.date).toLocaleDateString()}
                                        </div>
                                    </div>
                                </Card.Body>
                            </Card>
                        ))}
                    </div>
                )}
            </Container>

            {/* Create/Edit Modal */}
            <Modal show={showModal} onHide={() => setShowModal(false)} centered backdrop="static">
                <Modal.Header closeButton className="border-0 pb-0">
                    <Modal.Title className="fw-bold">
                        {editingAnnouncement ? 'Edit Announcement' : 'Post New Announcement'}
                    </Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleValidSubmit}>
                    <Modal.Body className="py-4">
                        <Form.Group className="mb-3">
                            <Form.Label className="fw-bold small">Announcement Title</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="E.g., Final Examination Schedule"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                required
                                className="rounded-3 px-3 py-2"
                            />
                        </Form.Group>
                        <Form.Group className="mb-1">
                            <Form.Label className="fw-bold small">Detailed Content</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={5}
                                placeholder="Type the announcement details here..."
                                value={formData.content}
                                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                required
                                className="rounded-3 px-3 py-2"
                            />
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer className="border-0 pt-0 pb-4 px-4">
                        <Button variant="light" onClick={() => setShowModal(false)} className="rounded-pill px-4" disabled={loading}>
                            Cancel
                        </Button>
                        <Button variant="primary" type="submit" className="rounded-pill px-4 fw-bold shadow-sm" disabled={loading}>
                            {loading ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                    Saving...
                                </>
                            ) : (
                                editingAnnouncement ? 'Update Announcement' : 'Post Announcement'
                            )}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </Layout>
    );
};

export default Announcements;
