// import React, { useState, useEffect } from 'react';
// import { Container, Form, Button, Row, Col, Card, Modal, Badge, Table } from 'react-bootstrap';
// import { useLocation, Navigate } from 'react-router-dom';
// import Layout from '../components/Layout';
// import Axios from 'axios';

// const ManageStudents = () => {
//     const location = useLocation();
//     const { email, role } = location.state || {
//         email: localStorage.getItem('userEmail'),
//         role: localStorage.getItem('userRole')
//     };

//     // Redirect if not logged in or not an admin
//     if (!email || (role !== 'Admin' && role !== 'admin')) {
//         return <Navigate to="/" replace />;
//     }

//     const [validated, setValidated] = useState(false);
//     const [showSuccessModal, setShowSuccessModal] = useState(false);
//     const [showDetailModal, setShowDetailModal] = useState(false);
//     const [selectedStudent, setSelectedStudent] = useState(null);
//     const [students, setStudents] = useState([]); 

//     const [formData, setFormData] = useState({
//         studentName: '',
//         studentAge: '',
//         studentRollNo: '',
//         studentGender: '',
//         studentEmail: '',
//         studentPassword: '',
//         studentRole: 'student',
//         parentName: '',
//         parentPhone: '',
//         parentEmail: '',
//         parentPassword: '',
//         parentAddress: '',
//         parentRole: 'Parent'
//     });

//     // Handle Input Changes
//     const handleChange = (e) => {
//         const { name, value } = e.target;
//         setFormData(prev => ({ ...prev, [name]: value }));
//     };

//     const handleSubmit = async (event) => {
//         const form = event.currentTarget;
//         event.preventDefault();

//         if (form.checkValidity() === false) {
//             event.stopPropagation();
//             setValidated(true);
//             return;
//         }

//         try {
//             // Placeholder for your API call
//             // await Axios.post('/api/register-student', formData);
//             setStudents([...students, { ...formData, id: Date.now() }]);
//             setShowSuccessModal(true);
//             setFormData({ /* reset form */ });
//             setValidated(false);
//         } catch (error) {
//             console.error("Error registering student:", error);
//         }
//     };

//     return (
//         <Layout>
//             <Container fluid>
//                 {/* Header Section */}
//                 <div className="mb-4 d-flex justify-content-between align-items-end">
//                     <div>
//                         <h2 className="fw-bold text-dark">Student Management</h2>
//                         <p className="text-muted mb-0">Onboard new students and manage existing records.</p>
//                     </div>
//                     <Badge bg="primary" className="p-2 px-3 rounded-pill">
//                         Total Students: {students.length}
//                     </Badge>
//                 </div>

//                 <Row className="g-4">
//                     {/* Registration Form */}
//                     <Col lg={12}>
//                         <Card className="border-0 shadow-sm rounded-4 mb-4">
//                             <Card.Body className="p-4">
//                                 <h5 className="fw-bold mb-4 d-flex align-items-center">
//                                     <i className="bi bi-person-plus-fill me-2 text-primary"></i> 
//                                     Register New Admission
//                                 </h5>
//                                 <Form noValidate validated={validated} onSubmit={handleSubmit}>
//                                     <Row>
//                                         {/* Left Column: Student Info */}
//                                         <Col md={6} className="border-end pe-md-4">
//                                             <h6 className="text-primary fw-bold mb-3 small text-uppercase ls-1">Student Details</h6>
//                                             <Form.Group className="mb-3">
//                                                 <Form.Label className="small fw-bold">Full Name</Form.Label>
//                                                 <Form.Control required name="studentName" value={formData.studentName} onChange={handleChange} placeholder="Enter full name" />
//                                             </Form.Group>
//                                             <Row>
//                                                 <Col md={6}>
//                                                     <Form.Group className="mb-3">
//                                                         <Form.Label className="small fw-bold">Roll No</Form.Label>
//                                                         <Form.Control required name="studentRollNo" value={formData.studentRollNo} onChange={handleChange} placeholder="e.g. S101" />
//                                                     </Form.Group>
//                                                 </Col>
//                                                 <Col md={6}>
//                                                     <Form.Group className="mb-3">
//                                                         <Form.Label className="small fw-bold">Gender</Form.Label>
//                                                         <Form.Select required name="studentGender" value={formData.studentGender} onChange={handleChange}>
//                                                             <option value="">Select...</option>
//                                                             <option>Male</option>
//                                                             <option>Female</option>
//                                                         </Form.Select>
//                                                     </Form.Group>
//                                                 </Col>
//                                             </Row>
//                                             <Form.Group className="mb-3">
//                                                 <Form.Label className="small fw-bold">Student Email</Form.Label>
//                                                 <Form.Control required type="email" name="studentEmail" value={formData.studentEmail} onChange={handleChange} placeholder="email@school.com" />
//                                             </Form.Group>
//                                         </Col>

//                                         {/* Right Column: Parent Info */}
//                                         <Col md={6} className="ps-md-4">
//                                             <h6 className="text-success fw-bold mb-3 small text-uppercase ls-1">Parent/Guardian Details</h6>
//                                             <Form.Group className="mb-3">
//                                                 <Form.Label className="small fw-bold">Parent Name</Form.Label>
//                                                 <Form.Control required name="parentName" value={formData.parentName} onChange={handleChange} placeholder="Enter parent's name" />
//                                             </Form.Group>
//                                             <Form.Group className="mb-3">
//                                                 <Form.Label className="small fw-bold">Contact Number</Form.Label>
//                                                 <Form.Control required name="parentPhone" value={formData.parentPhone} onChange={handleChange} placeholder="+1 234 567 890" />
//                                             </Form.Group>
//                                             <Form.Group className="mb-3">
//                                                 <Form.Label className="small fw-bold">Home Address</Form.Label>
//                                                 <Form.Control required as="textarea" rows={1} name="parentAddress" value={formData.parentAddress} onChange={handleChange} placeholder="Enter physical address" />
//                                             </Form.Group>
//                                         </Col>
//                                     </Row>
//                                     <div className="text-end mt-4">
//                                         <Button type="submit" variant="primary" className="rounded-pill px-5 fw-bold shadow-sm">
//                                             Submit Admission
//                                         </Button>
//                                     </div>
//                                 </Form>
//                             </Card.Body>
//                         </Card>
//                     </Col>

//                     {/* Student List Table */}
//                     <Col lg={12}>
//                         <Card className="border-0 shadow-sm rounded-4">
//                             <Card.Body className="p-0">
//                                 <div className="p-4 border-bottom">
//                                     <h5 className="fw-bold mb-0">Recent Registrations</h5>
//                                 </div>
//                                 <div className="table-responsive">
//                                     <Table hover className="align-middle mb-0 custom-table">
//                                         <thead className="bg-light">
//                                             <tr>
//                                                 <th className="ps-4">Student</th>
//                                                 <th>Roll No</th>
//                                                 <th>Parent</th>
//                                                 <th>Contact</th>
//                                                 <th className="text-end pe-4">Actions</th>
//                                             </tr>
//                                         </thead>
//                                         <tbody>
//                                             {students.length > 0 ? students.map((s, idx) => (
//                                                 <tr key={idx}>
//                                                     <td className="ps-4">
//                                                         <div className="d-flex align-items-center">
//                                                             <div className="bg-primary bg-opacity-10 text-primary rounded-circle p-2 me-2 small fw-bold">
//                                                                 {s.studentName.charAt(0)}
//                                                             </div>
//                                                             {s.studentName}
//                                                         </div>
//                                                     </td>
//                                                     <td><Badge bg="light" text="dark">{s.studentRollNo}</Badge></td>
//                                                     <td>{s.parentName}</td>
//                                                     <td>{s.parentPhone}</td>
//                                                     <td className="text-end pe-4">
//                                                         <Button variant="outline-primary" size="sm" className="rounded-pill px-3" onClick={() => { setSelectedStudent(s); setShowDetailModal(true); }}>
//                                                             View Profile
//                                                         </Button>
//                                                     </td>
//                                                 </tr>
//                                             )) : (
//                                                 <tr>
//                                                     <td colSpan="5" className="text-center py-5 text-muted">
//                                                         No students registered in this session yet.
//                                                     </td>
//                                                 </tr>
//                                             )}
//                                         </tbody>
//                                     </Table>
//                                 </div>
//                             </Card.Body>
//                         </Card>
//                     </Col>
//                 </Row>
//             </Container>

//             {/* Modals remain same as your original code, just add rounded-4 class */}
//             <Modal show={showSuccessModal} onHide={() => setShowSuccessModal(false)} centered>
//                 <Modal.Body className="text-center p-5 rounded-4">
//                     <i className="bi bi-check-circle-fill text-success display-1 mb-4"></i>
//                     <h3 className="fw-bold">Registration Successful</h3>
//                     <p className="text-muted">Student and Parent accounts have been created.</p>
//                     <Button variant="success" onClick={() => setShowSuccessModal(false)} className="rounded-pill px-4 mt-3">Great!</Button>
//                 </Modal.Body>
//             </Modal>

//             <style>
//                 {`
//                     .custom-table thead th {
//                         font-size: 0.75rem;
//                         text-transform: uppercase;
//                         letter-spacing: 0.5px;
//                         font-weight: 700;
//                         color: #6c757d;
//                         border: none;
//                         padding: 1.2rem 1rem;
//                     }
//                     .custom-table tbody td {
//                         padding: 1rem;
//                         border-bottom: 1px solid #f8f9fa;
//                     }
//                 `}
//             </style>
//         </Layout>
//     );
// };

// export default ManageStudents;
import React, { useState, useEffect } from 'react';
import { Container, Form, Button, Row, Col, Card, Modal, Badge, Table, Alert, Spinner } from 'react-bootstrap';
import { useLocation, Navigate, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Axios from 'axios';

const ManageStudents = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { email, role } = location.state || {
        email: localStorage.getItem('userEmail'),
        role: localStorage.getItem('userRole')
    };

    // SDS Requirement: Role-Based Access Control
    if (!email || (role !== 'Admin' && role !== 'admin')) {
        return <Navigate to="/" replace />;
    }

    const [validated, setValidated] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    // Hardcoded mock data
    const initialStudents = [
        {
            id: '1',
            studentName: 'John Doe',
            studentAge: '14',
            studentRollNo: '2024-001',
            studentGender: 'Male',
            studentClass: '8th Grade',
            studentEmail: 'john.doe@student.edu',
            studentPassword: '',
            studentProfilePicture: 'https://randomuser.me/api/portraits/men/1.jpg',
            parentName: 'Michael Doe',
            parentPhone: '+1 234 567 8901',
            parentEmail: 'michael.doe@parent.edu',
            parentPassword: '',
            parentAddress: '123 Elm Street, Cityville',
            parentProfilePicture: 'https://randomuser.me/api/portraits/men/2.jpg'
        },
        {
            id: '2',
            studentName: 'Jane Smith',
            studentAge: '13',
            studentRollNo: '2024-002',
            studentGender: 'Female',
            studentClass: '7th Grade',
            studentEmail: 'jane.smith@student.edu',
            studentPassword: '',
            studentProfilePicture: 'https://randomuser.me/api/portraits/women/1.jpg',
            parentName: 'Sarah Smith',
            parentPhone: '+1 987 654 3210',
            parentEmail: 'sarah.smith@parent.edu',
            parentPassword: '',
            parentAddress: '456 Oak Ave, Townsville',
            parentProfilePicture: 'https://randomuser.me/api/portraits/women/2.jpg'
        }
    ];

    const [students, setStudents] = useState(initialStudents);

    const [formData, setFormData] = useState({
        studentName: '',
        studentAge: '',
        studentRollNo: '',
        studentGender: '',
        studentClass: '',
        studentEmail: '',
        studentPassword: '',
        studentProfilePicture: '',
        parentName: '',
        parentPhone: '',
        parentEmail: '',
        parentPassword: '',
        parentAddress: '',
        parentProfilePicture: ''
    });

    // 1. Fetch Students from Node/Express Middleware
    const fetchStudents = async () => {
        // Simulating data fetch without calling backend
        setLoading(true);
        setTimeout(() => setLoading(false), 500);
    };

    useEffect(() => { fetchStudents(); }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // 2. SDS Compliant Submission (Registers Student & Linked Parent)
    const handleSubmit = async (event) => {
        event.preventDefault();
        const form = event.currentTarget;

        if (form.checkValidity() === false) {
            event.stopPropagation();
            setValidated(true);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Disabled hitting the endpoint
            // await Axios.post('http://localhost:8080/api/register-student-parent', formData);

            // Simulating network delay and using local state
            setTimeout(() => {
                setStudents(prev => [...prev, { ...formData, id: Date.now().toString() }]);
                setShowSuccessModal(true);
                setFormData({
                    studentName: '', studentAge: '', studentRollNo: '', studentGender: '', studentClass: '',
                    studentEmail: '', studentPassword: '', studentProfilePicture: '',
                    parentName: '', parentPhone: '', parentEmail: '', parentPassword: '',
                    parentAddress: '', parentProfilePicture: ''
                });
                setValidated(false);
                setLoading(false);
            }, 500);

        } catch (err) {
            setError(err.response?.data?.message || "Registration failed. Check if email/roll no already exists.");
            setLoading(false);
        }
    };

    return (
        <Layout>
            <Container fluid className="py-4">
                {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}

                <div className="mb-4 d-flex justify-content-between align-items-center">
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
                            <h2 className="fw-bold text-dark mb-0">Student Admission Portal</h2>
                            <p className="text-muted mb-0">SDS Compliance: Dual-Account Onboarding (Student & Parent)</p>
                        </div>
                    </div>
                    <Badge bg="primary" className="p-2 px-3 rounded-pill shadow-sm">
                        Registered: {students.length}
                    </Badge>
                </div>

                <Row className="g-4">
                    <Col lg={12}>
                        <Card className="border-0 shadow-sm rounded-4 mb-4">
                            <Card.Body className="p-4">
                                <Form noValidate validated={validated} onSubmit={handleSubmit}>
                                    <Row>
                                        {/* Tier 1: Student Information */}
                                        <Col md={6} className="border-end pe-md-4">
                                            <h6 className="text-primary fw-bold mb-3 text-uppercase small">Student Account Details</h6>
                                            <Form.Group className="mb-3">
                                                <Form.Label className="small fw-bold">Full Name</Form.Label>
                                                <Form.Control required name="studentName" value={formData.studentName} onChange={handleChange} />
                                            </Form.Group>
                                            <Row>
                                                <Col md={6}>
                                                    <Form.Group className="mb-3">
                                                        <Form.Label className="small fw-bold">Roll Number (Unique ID)</Form.Label>
                                                        <Form.Control required name="studentRollNo" value={formData.studentRollNo} onChange={handleChange} placeholder="e.g. 2024-001" />
                                                    </Form.Group>
                                                </Col>
                                                <Col md={6}>
                                                    <Form.Group className="mb-3">
                                                        <Form.Label className="small fw-bold">Gender</Form.Label>
                                                        <Form.Select required name="studentGender" value={formData.studentGender} onChange={handleChange}>
                                                            <option value="">Select...</option>
                                                            <option>Male</option>
                                                            <option>Female</option>
                                                        </Form.Select>
                                                    </Form.Group>
                                                </Col>
                                            </Row>
                                            <Row>
                                                <Col md={6}>
                                                    <Form.Group className="mb-3">
                                                        <Form.Label className="small fw-bold">Age</Form.Label>
                                                        <Form.Control required type="number" name="studentAge" value={formData.studentAge} onChange={handleChange} placeholder="e.g. 15" />
                                                    </Form.Group>
                                                </Col>
                                                <Col md={6}>
                                                    <Form.Group className="mb-3">
                                                        <Form.Label className="small fw-bold">Class / Grade</Form.Label>
                                                        <Form.Control required name="studentClass" value={formData.studentClass} onChange={handleChange} placeholder="e.g. 10th Grade" />
                                                    </Form.Group>
                                                </Col>
                                            </Row>
                                            <Form.Group className="mb-3">
                                                <Form.Label className="small fw-bold">Login Email</Form.Label>
                                                <Form.Control required type="email" name="studentEmail" value={formData.studentEmail} onChange={handleChange} />
                                            </Form.Group>
                                            <Form.Group className="mb-3">
                                                <Form.Label className="small fw-bold">Account Password</Form.Label>
                                                <Form.Control required type="password" name="studentPassword" value={formData.studentPassword} onChange={handleChange} />
                                            </Form.Group>
                                            <Form.Group className="mb-3">
                                                <Form.Label className="small fw-bold">Student Profile Picture</Form.Label>
                                                <Form.Control
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={e => {
                                                        const file = e.target.files[0];
                                                        if (file) {
                                                            const reader = new FileReader();
                                                            reader.onloadend = () => setFormData({ ...formData, studentProfilePicture: reader.result });
                                                            reader.readAsDataURL(file);
                                                        }
                                                    }}
                                                />
                                            </Form.Group>
                                        </Col>

                                        {/* Tier 2: Linked Parent Information */}
                                        <Col md={6} className="ps-md-4">
                                            <h6 className="text-success fw-bold mb-3 text-uppercase small">Linked Parent/Guardian Account</h6>
                                            <Form.Group className="mb-3">
                                                <Form.Label className="small fw-bold">Guardian Name</Form.Label>
                                                <Form.Control required name="parentName" value={formData.parentName} onChange={handleChange} />
                                            </Form.Group>
                                            <Form.Group className="mb-3">
                                                <Form.Label className="small fw-bold">Guardian Contact</Form.Label>
                                                <Form.Control required name="parentPhone" value={formData.parentPhone} onChange={handleChange} />
                                            </Form.Group>
                                            <Form.Group className="mb-3">
                                                <Form.Label className="small fw-bold">Guardian Email (For Notifications)</Form.Label>
                                                <Form.Control required type="email" name="parentEmail" value={formData.parentEmail} onChange={handleChange} />
                                            </Form.Group>
                                            <Form.Group className="mb-3">
                                                <Form.Label className="small fw-bold">Guardian Password</Form.Label>
                                                <Form.Control required type="password" name="parentPassword" value={formData.parentPassword} onChange={handleChange} />
                                            </Form.Group>
                                            <Form.Group className="mb-3">
                                                <Form.Label className="small fw-bold">Residential Address</Form.Label>
                                                <Form.Control required as="textarea" rows={1} name="parentAddress" value={formData.parentAddress} onChange={handleChange} />
                                            </Form.Group>
                                            <Form.Group className="mb-3">
                                                <Form.Label className="small fw-bold">Guardian Profile Picture</Form.Label>
                                                <Form.Control
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={e => {
                                                        const file = e.target.files[0];
                                                        if (file) {
                                                            const reader = new FileReader();
                                                            reader.onloadend = () => setFormData({ ...formData, parentProfilePicture: reader.result });
                                                            reader.readAsDataURL(file);
                                                        }
                                                    }}
                                                />
                                            </Form.Group>
                                        </Col>
                                    </Row>
                                    <div className="text-end mt-4">
                                        <Button type="submit" variant="primary" disabled={loading} className="rounded-pill px-5 fw-bold">
                                            {loading ? <Spinner animation="border" size="sm" /> : 'Finalize Admission'}
                                        </Button>
                                    </div>
                                </Form>
                            </Card.Body>
                        </Card>
                    </Col>

                    {/* Registrations List Table */}
                    <Col lg={12}>
                        <Card className="border-0 shadow-sm rounded-4">
                            <Card.Body className="p-0">
                                <div className="table-responsive">
                                    <Table hover className="align-middle mb-0 custom-table">
                                        <thead className="bg-light">
                                            <tr>
                                                <th className="ps-4">Student Name</th>
                                                <th>Roll No</th>
                                                <th>Parent Name</th>
                                                <th>Contact</th>
                                                <th className="text-end pe-4">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {students.map((s, idx) => (
                                                <tr key={idx}>
                                                    <td className="ps-4">
                                                        <div className="d-flex align-items-center">
                                                            {s.studentProfilePicture ? (
                                                                <img src={s.studentProfilePicture} alt="profile" className="rounded-circle me-3 border" style={{ width: '40px', height: '40px', objectFit: 'cover' }} />
                                                            ) : (
                                                                <div className="bg-success bg-opacity-10 text-success rounded-circle p-2 me-3 fw-bold d-flex justify-content-center align-items-center" style={{ width: '40px', height: '40px' }}>
                                                                    {s.studentName.charAt(0)}
                                                                </div>
                                                            )}
                                                            <div>
                                                                <span className="fw-bold d-block">{s.studentName}</span>
                                                                <span className="text-muted small">{s.studentEmail}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <Badge bg="secondary" className="mb-1 d-block w-75">{s.studentRollNo}</Badge>
                                                        <span className="small text-muted">{s.studentClass || '-'}</span>
                                                    </td>
                                                    <td>{s.parentName}</td>
                                                    <td>{s.parentPhone}</td>
                                                    <td className="text-end pe-4">
                                                        <Badge bg="success" className="bg-opacity-10 text-success">Active</Badge>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            </Container>

            <Modal show={showSuccessModal} onHide={() => setShowSuccessModal(false)} centered>
                <Modal.Body className="text-center p-5 rounded-4">
                    <div className="mb-4">
                        <i className="bi bi-person-check-fill text-success" style={{ fontSize: '4rem' }}></i>
                    </div>
                    <h3 className="fw-bold">SDS Record Created</h3>
                    <p className="text-muted">Database entry successful. Linked parent account has been activated for monitoring.</p>
                    <Button variant="success" onClick={() => setShowSuccessModal(false)} className="rounded-pill px-5">Done</Button>
                </Modal.Body>
            </Modal>
        </Layout>
    );
};

export default ManageStudents;