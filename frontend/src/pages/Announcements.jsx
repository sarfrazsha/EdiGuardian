import React, { useState, useEffect } from 'react';
import { Container, Card, Button, Modal, Form, Badge } from 'react-bootstrap';
import { useLocation, Navigate, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import axios from 'axios';

const audienceLabel = {
    all: { text: 'Everyone', bg: 'primary' },
    student: { text: 'Students', bg: 'success' },
    parent: { text: 'Parents', bg: 'warning' },
    teacher: { text: 'Teachers', bg: 'info' },
};

const Announcements = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { email, role } = location.state || {
        email: localStorage.getItem('userEmail'),
        role: localStorage.getItem('userRole')
    };

    const [announcements, setAnnouncements] = useState([]);
   
    const [showFormModal, setShowFormModal] = useState(false);
    const [editingAnnouncement, setEditingAnnouncement] = useState(null);
    const [formData, setFormData] = useState({ title: '', content: '', targetAudience: 'all', durationDays: '7' });
    const [loading, setLoading] = useState(false);
    
    const [selectedAnn, setSelectedAnn] = useState(null);

    if (!email) return <Navigate to="/" replace />;

    const isAdmin = role === 'admin' || role === 'Admin';

    useEffect(() => {
        fetchAnnouncements();
        markAsRead();
    }, []);

    const markAsRead = async () => {
        try {
            await axios.put('http://localhost:8080/api/announcements/mark-all-read', { email });
            window.dispatchEvent(new Event('announcements-read'));
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    const fetchAnnouncements = async () => {
        try {
            
            const roleParam = isAdmin ? '' : `?role=${(role || '').toLowerCase()}`;
            const res = await axios.get(`http://localhost:8080/api/announcements${roleParam}`);
            setAnnouncements(res.data);
        } catch (error) {
            console.error('Error fetching announcements:', error);
        }
    };

    const handleValidSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = { ...formData, role };
            if (editingAnnouncement) {
                await axios.put(`http://localhost:8080/api/announcements/${editingAnnouncement._id}`, payload);
            } else {
                await axios.post('http://localhost:8080/api/announcements', payload);
            }
            setShowFormModal(false);
            setFormData({ title: '', content: '', targetAudience: 'all', durationDays: '7' });
            setEditingAnnouncement(null);
            fetchAnnouncements();
        } catch (error) {
            console.error('Error saving announcement:', error);
            alert('Failed to save announcement');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this announcement?')) return;
        try {
            await axios.delete(`http://localhost:8080/api/announcements/${id}?role=${role}`, { data: { role } });
            setSelectedAnn(null);
            fetchAnnouncements();
        } catch (error) {
            console.error('Error deleting announcement:', error);
            alert('Failed to delete announcement');
        }
    };

    const openFormModal = (announcement = null) => {
        if (announcement) {
            setEditingAnnouncement(announcement);
            let durationDays = '7';
            if (announcement.expiresAt) {
                const diff = Math.round((new Date(announcement.expiresAt) - new Date()) / (1000 * 60 * 60 * 24));
                durationDays = String(Math.max(1, diff));
            }
            setFormData({ title: announcement.title, content: announcement.content, targetAudience: announcement.targetAudience || 'all', durationDays });
        } else {
            setEditingAnnouncement(null);
            setFormData({ title: '', content: '', targetAudience: 'all', durationDays: '7' });
        }
        setSelectedAnn(null); 
        setShowFormModal(true);
    };

    const formatDateTime = (dateStr) => {
        if (!dateStr) return '—';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })
            + '  •  '
            + d.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });
    };

    const aud = selectedAnn ? (audienceLabel[selectedAnn.targetAudience] || audienceLabel.all) : null;

    return (
        <Layout>
            <Container fluid className="py-4" style={{ maxWidth: '860px' }}>
               
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h2 className="fw-bold text-primary mb-0">
                            <i className="bi bi-megaphone-fill me-2"></i>Announcements
                        </h2>
                        <p className="text-muted small mb-0 mt-1">Click any announcement to view details</p>
                    </div>
                    {isAdmin && (
                        <Button variant="primary" className="rounded-pill px-4 fw-bold shadow-sm" onClick={() => openFormModal()}>
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
                    <div className="d-flex flex-column gap-2">
                        {announcements.map((item, idx) => {
                            const isUnread = !item.readBy || !item.readBy.includes(email);
                            const a = audienceLabel[item.targetAudience] || audienceLabel.all;
                            return (
                                <Card
                                    key={item._id}
                                    className="border-0 shadow-sm rounded-4 overflow-hidden"
                                    style={{ cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' }}
                                    onClick={() => setSelectedAnn(item)}
                                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.1)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = ''; }}
                                >
                                    <Card.Body className="px-4 py-3">
                                        <div className="d-flex align-items-center justify-content-between">
                                            <div className="d-flex align-items-center gap-3 flex-grow-1 overflow-hidden">
                                            
                                                <div style={{
                                                    width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0,
                                                    background: isUnread ? '#0d6efd' : '#dee2e6'
                                                }} title={isUnread ? 'Unread' : 'Read'} />
                                        
                                                <span className="text-muted fw-bold" style={{ fontSize: '0.8rem', minWidth: '24px' }}>
                                                    {String(idx + 1).padStart(2, '0')}
                                                </span>
                                              
                                                <span className={`fw-semibold text-truncate ${isUnread ? 'text-dark' : 'text-secondary'}`} style={{ fontSize: '0.97rem' }}>
                                                    {item.title}
                                                </span>
                                            </div>
                                            <div className="d-flex align-items-center gap-3 flex-shrink-0 ms-3">
                                                {isAdmin && (
                                                    <Badge bg={a.bg} className="rounded-pill" style={{ fontSize: '0.7rem' }}>
                                                        {a.text}
                                                    </Badge>
                                                )}
                                                <span className="text-muted small">
                                                    <i className="bi bi-clock me-1"></i>
                                                    {formatDateTime(item.createdAt)}
                                                </span>
                                                {isAdmin && (
                                                    <div className="d-flex gap-1" onClick={e => e.stopPropagation()}>
                                                        <Button size="sm" variant="outline-primary" style={{ padding: '2px 8px' }} onClick={() => openFormModal(item)}>
                                                            <i className="bi bi-pencil-square" style={{ fontSize: '0.75rem' }}></i>
                                                        </Button>
                                                        <Button size="sm" variant="outline-danger" style={{ padding: '2px 8px' }} onClick={() => handleDelete(item._id)}>
                                                            <i className="bi bi-trash" style={{ fontSize: '0.75rem' }}></i>
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </Card.Body>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </Container>

         
            <Modal show={!!selectedAnn} onHide={() => setSelectedAnn(null)} centered size="lg">
                {selectedAnn && (
                    <>
                        <Modal.Header closeButton className="border-0 pb-0 pt-4 px-4">
                            <div className="w-100">
                                <div className="d-flex align-items-center gap-2 mb-1">
                                    <i className="bi bi-megaphone-fill text-primary fs-5"></i>
                                    {isAdmin && aud && (
                                        <Badge bg={aud.bg} className="rounded-pill" style={{ fontSize: '0.72rem' }}>
                                            To: {aud.text}
                                        </Badge>
                                    )}
                                </div>
                                <Modal.Title className="fw-bold fs-4 text-dark">{selectedAnn.title}</Modal.Title>
                                <p className="text-muted small mb-0 mt-1">
                                    <i className="bi bi-clock me-1"></i>{formatDateTime(selectedAnn.createdAt)}
                                    {selectedAnn.expiresAt && (
                                        <span className="ms-3">
                                            <i className="bi bi-hourglass-split me-1 text-warning"></i>
                                            Expires: {formatDateTime(selectedAnn.expiresAt)}
                                        </span>
                                    )}
                                </p>
                            </div>
                        </Modal.Header>
                        <Modal.Body className="px-4 py-3">
                            <div
                                className="p-4 rounded-4"
                                style={{ background: '#f8f9ff', whiteSpace: 'pre-line', fontSize: '1rem', lineHeight: '1.7', color: '#333' }}
                            >
                                {selectedAnn.content}
                            </div>
                        </Modal.Body>
                        <Modal.Footer className="border-0 px-4 pb-4 pt-0 d-flex justify-content-between">
                            {isAdmin ? (
                                <div className="d-flex gap-2">
                                    <Button variant="outline-primary" className="rounded-pill px-4" onClick={() => openFormModal(selectedAnn)}>
                                        <i className="bi bi-pencil-square me-2"></i>Edit
                                    </Button>
                                    <Button variant="outline-danger" className="rounded-pill px-4" onClick={() => handleDelete(selectedAnn._id)}>
                                        <i className="bi bi-trash me-2"></i>Delete
                                    </Button>
                                </div>
                            ) : <span />}
                            <Button variant="secondary" className="rounded-pill px-4" onClick={() => setSelectedAnn(null)}>
                                Close
                            </Button>
                        </Modal.Footer>
                    </>
                )}
            </Modal>

            
            <Modal show={showFormModal} onHide={() => setShowFormModal(false)} centered backdrop="static">
                <Modal.Header closeButton className="border-0 pb-0">
                    <Modal.Title className="fw-bold">
                        {editingAnnouncement ? 'Edit Announcement' : 'Post New Announcement'}
                    </Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleValidSubmit}>
                    <Modal.Body className="py-4">
                        <Form.Group className="mb-3">
                            <Form.Label className="fw-bold small">Send To</Form.Label>
                            <Form.Select
                                value={formData.targetAudience}
                                onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                                className="rounded-3 px-3 py-2"
                            >
                                <option value="all">👥 Everyone (All Users)</option>
                                <option value="student">🎓 Students Only</option>
                                <option value="parent">👨‍👩‍👧 Parents Only</option>
                                <option value="teacher">📚 Teachers Only</option>
                            </Form.Select>
                        </Form.Group>
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
                                rows={4}
                                placeholder="Type the announcement details here..."
                                value={formData.content}
                                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                required
                                className="rounded-3 px-3 py-2"
                            />
                        </Form.Group>
                        <Form.Group className="mt-3 mb-1">
                            <Form.Label className="fw-bold small">⏱️ Show on marquee ticker for</Form.Label>
                            <Form.Select
                                value={formData.durationDays}
                                onChange={(e) => setFormData({ ...formData, durationDays: e.target.value })}
                                className="rounded-3 px-3 py-2"
                            >
                                <option value="0">Indefinitely (no expiry)</option>
                                <option value="1">1 Day</option>
                                <option value="2">2 Days</option>
                                <option value="3">3 Days</option>
                                <option value="5">5 Days</option>
                                <option value="7">1 Week</option>
                                <option value="14">2 Weeks</option>
                                <option value="30">1 Month</option>
                            </Form.Select>
                            <Form.Text className="text-muted">
                                After this period the announcement will no longer appear in the scrolling banner.
                            </Form.Text>
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer className="border-0 pt-0 pb-4 px-4">
                        <Button variant="light" onClick={() => setShowFormModal(false)} className="rounded-pill px-4" disabled={loading}>
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
