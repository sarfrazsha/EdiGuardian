// import React, { useState, useEffect } from 'react';
// import { Container, Table, Button, Card, Modal, Form, Badge } from 'react-bootstrap';
// import Layout from '../components/Layout';
// import axios from 'axios';

// const ManageTeachers = () => {
//     const [teachers, setTeachers] = useState([]);
//     const [showModal, setShowModal] = useState(false);
//     const [isEditing, setIsEditing] = useState(false);
//     const [selectedId, setSelectedId] = useState(null);
//     const [formData, setFormData] = useState({ teacherName: '', email: '', subject: '' });

//     // Fetch All Teachers
//     const fetchTeachers = async () => {
//         try {
//             const res = await axios.get('http://localhost:8080/allteachers');
//             setTeachers(res.data);
//         } catch (err) {
//             console.error("Error fetching teachers:", err);
//         }
//     };

//     useEffect(() => {
//         fetchTeachers();
//     }, []);

//     // Handle Modal Open for Add
//     const handleShowAdd = () => {
//         setIsEditing(false);
//         setFormData({ teacherName: '', email: '', subject: '' });
//         setShowModal(true);
//     };

//     // Handle Modal Open for Edit
//     const handleShowEdit = (teacher) => {
//         setIsEditing(true);
//         setSelectedId(teacher._id);
//         setFormData({ 
//             teacherName: teacher.teacherName, 
//             email: teacher.email, 
//             subject: teacher.subject || '' 
//         });
//         setShowModal(true);
//     };

//     // Save or Update Teacher
//     const handleSave = async (e) => {
//         e.preventDefault();
//         try {
//             if (isEditing) {
//                 // UPDATE
//                 await axios.put(`http://localhost:8080/teacher/update/${selectedId}`, formData);
//             } else {
//                 // CREATE
//                 await axios.post('http://localhost:8080/teacher/register', formData);
//             }
//             setShowModal(false);
//             fetchTeachers(); // Refresh list
//         } catch (err) {
//             alert(isEditing ? "Error updating teacher" : "Error saving teacher");
//         }
//     };

//     // Delete Teacher
//     const handleDelete = async (id) => {
//         if (window.confirm("Are you sure you want to remove this teacher from the directory?")) {
//             try {
//                 await axios.delete(`http://localhost:8080/teacher/delete/${id}`);
//                 fetchTeachers(); // Refresh list
//             } catch (err) {
//                 alert("Error deleting teacher");
//             }
//         }
//     };

//     return (
//         <Layout>
//             <Container fluid className="py-4">
//                 <div className="d-flex justify-content-between align-items-center mb-4">
//                     <div>
//                         <h2 className="fw-bold mb-0">Faculty Directory</h2>
//                         <p className="text-muted small">Manage school teaching staff and assignments</p>
//                     </div>
//                     <Button variant="success" className="rounded-pill px-4 shadow-sm" onClick={handleShowAdd}>
//                         <i className="bi bi-person-plus-fill me-2"></i>Add Teacher
//                     </Button>
//                 </div>

//                 <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
//                     <Table hover responsive className="mb-0 align-middle">
//                         <thead className="bg-light text-secondary small text-uppercase">
//                             <tr>
//                                 <th className="ps-4 py-3">Teacher Name</th>
//                                 <th className="py-3">Email Address</th>
//                                 <th className="py-3">Subject/Specialization</th>
//                                 <th className="text-end pe-4 py-3">Actions</th>
//                             </tr>
//                         </thead>
//                         <tbody>
//                             {teachers.length > 0 ? (
//                                 teachers.map(t => (
//                                     <tr key={t._id}>
//                                         <td className="ps-4">
//                                             <div className="fw-bold text-dark">{t.teacherName}</div>
//                                         </td>
//                                         <td className="text-muted">{t.email}</td>
//                                         <td>
//                                             <Badge bg="info" className="bg-opacity-10 text-info fw-normal px-3">
//                                                 {t.subject || 'General Education'}
//                                             </Badge>
//                                         </td>
//                                         <td className="text-end pe-4">
//                                             <Button 
//                                                 variant="light" 
//                                                 size="sm" 
//                                                 className="me-2 text-primary shadow-sm"
//                                                 onClick={() => handleShowEdit(t)}
//                                             >
//                                                 <i className="bi bi-pencil-square"></i>
//                                             </Button>
//                                             <Button 
//                                                 variant="light" 
//                                                 size="sm" 
//                                                 className="text-danger shadow-sm"
//                                                 onClick={() => handleDelete(t._id)}
//                                             >
//                                                 <i className="bi bi-trash3"></i>
//                                             </Button>
//                                         </td>
//                                     </tr>
//                                 ))
//                             ) : (
//                                 <tr>
//                                     <td colSpan="4" className="text-center py-5 text-muted">
//                                         No teachers found. Click "Add Teacher" to begin.
//                                     </td>
//                                 </tr>
//                             )}
//                         </tbody>
//                     </Table>
//                 </Card>
//             </Container>

//             {/* Teacher Form Modal */}
//             <Modal show={showModal} onHide={() => setShowModal(false)} centered>
//                 <Modal.Header closeButton className="border-0 pb-0">
//                     <Modal.Title className="fw-bold">
//                         {isEditing ? 'Update Teacher Profile' : 'Register New Teacher'}
//                     </Modal.Title>
//                 </Modal.Header>
//                 <Form onSubmit={handleSave}>
//                     <Modal.Body className="pt-3">
//                         <Form.Group className="mb-3">
//                             <Form.Label className="small fw-bold">Full Name</Form.Label>
//                             <Form.Control 
//                                 required 
//                                 value={formData.teacherName}
//                                 placeholder="e.g. Dr. John Doe"
//                                 onChange={e => setFormData({...formData, teacherName: e.target.value})} 
//                             />
//                         </Form.Group>
//                         <Form.Group className="mb-3">
//                             <Form.Label className="small fw-bold">Email Address</Form.Label>
//                             <Form.Control 
//                                 type="email" 
//                                 required 
//                                 value={formData.email}
//                                 placeholder="john.doe@school.edu"
//                                 onChange={e => setFormData({...formData, email: e.target.value})} 
//                             />
//                         </Form.Group>
//                         <Form.Group className="mb-3">
//                             <Form.Label className="small fw-bold">Subject / Department</Form.Label>
//                             <Form.Control 
//                                 value={formData.subject}
//                                 placeholder="e.g. Mathematics"
//                                 onChange={e => setFormData({...formData, subject: e.target.value})} 
//                             />
//                         </Form.Group>
//                     </Modal.Body>
//                     <Modal.Footer className="border-0">
//                         <Button variant="light" onClick={() => setShowModal(false)}>Cancel</Button>
//                         <Button variant="primary" type="submit" className="rounded-pill px-4">
//                             {isEditing ? 'Save Changes' : 'Register Faculty'}
//                         </Button>
//                     </Modal.Footer>
//                 </Form>
//             </Modal>
//         </Layout>
//     );
// };

// export default ManageTeachers;
import React, { useState, useEffect } from 'react';
import { Container, Table, Button, Card, Modal, Form, Badge, Spinner, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import axios from 'axios';

const ManageTeachers = () => {
    const navigate = useNavigate();
    const initialTeachers = [
        {
            _id: '1',
            teacherName: 'Respected Naeem Akhter',
            email: 'naeem@gmail.com',
            subject: 'Class Incharge Class 1',
            phoneNumber: '03245627336',
            address: 'House 12, Street 5, Mohalla Qadirabad, Multan',
            profilePicture: '',
            role: 'Teacher'
        },
        {
            _id: '2',
            teacherName: 'Respected Saleem Akhter',
            email: 'saleem@gmail.com',
            subject: 'Class Incharge Class 2',
            phoneNumber: '03017894523',
            address: 'House 8, Gali Masjid Wali, Bahawalpur',
            profilePicture: '',
            role: 'Teacher'
        },
        {
            _id: '3',
            teacherName: 'Respected Qari Illyas Shb',
            email: 'illyas@gmail.com',
            subject: 'Class Incharge Class 3',
            phoneNumber: '03129876543',
            address: 'Mohalla Ahmedpur, Near Jamia Masjid, Rahim Yar Khan',
            profilePicture: '',
            role: 'Teacher'
        }
    ];

    const [teachers, setTeachers] = useState(initialTeachers);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedId, setSelectedId] = useState(null);

    // SDS Requirement: Ensure fields match the Database Collection Schema
    const [formData, setFormData] = useState({
        teacherName: '',
        email: '',
        subject: '',
        password: '', // Needed for initial account creation
        profilePicture: '',
        phoneNumber: '',
        address: '',
        role: 'Teacher' // Explicit role assignment as per SDS
    });

    // 1. Fetching via Tier 2 (Node/Express Middleware)
    const fetchTeachers = async () => {
        // Disabled API call for now; using hardcoded data
        setLoading(true);
        setTimeout(() => setLoading(false), 500);
    };

    useEffect(() => { fetchTeachers(); }, []);

    const handleShowAdd = () => {
        setIsEditing(false);
        setFormData({
            teacherName: '',
            email: '',
            subject: '',
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
            subject: teacher.subject || '',
            phoneNumber: teacher.phoneNumber || '',
            address: teacher.address || '',
            profilePicture: teacher.profilePicture || '',
            role: 'Teacher'
        });
        setShowModal(true);
    };

    // 2. Data Persistence (MERN Integration)
    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        // Simulating network delay instead of calling backend
        setTimeout(() => {
            if (isEditing) {
                // UPDATE LOCALLY
                setTeachers(prev => prev.map(t => t._id === selectedId ? { ...formData, _id: selectedId } : t));
            } else {
                // CREATE LOCALLY
                setTeachers(prev => [...prev, { ...formData, _id: Date.now().toString() }]);
            }
            setShowModal(false);
            setLoading(false);
        }, 500);
    };

    const handleDelete = async (id) => {
        if (window.confirm("SDS Warning: Deleting a teacher will affect assigned classes. Proceed?")) {
            setTeachers(prev => prev.filter(t => t._id !== id));
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
                            <p className="text-muted small mb-0">EduGuardian Admin: Provisioning & Staff Records</p>
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
                                        <th className="py-3">Specialization</th>
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
                                                    {t.subject || 'Not Assigned'}
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
                            <Form.Label className="small fw-bold">Subject Specialization</Form.Label>
                            <Form.Control
                                required
                                value={formData.subject}
                                placeholder="e.g. Computer Science"
                                onChange={e => setFormData({ ...formData, subject: e.target.value })}
                            />
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
                                        const reader = new FileReader();
                                        reader.onloadend = () => {
                                            setFormData({ ...formData, profilePicture: reader.result });
                                        };
                                        reader.readAsDataURL(file);
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