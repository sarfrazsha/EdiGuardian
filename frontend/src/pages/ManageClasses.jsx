import React, { useState, useEffect } from 'react';
import { Container, Table, Button, Modal, Form, Card, Badge, Row, Col } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';

const ManageClasses = () => {
    const navigate = useNavigate();
    // --- MOCK DATA ---
    const initialClasses = [
        { id: 1, name: 'Grade 10', section: 'A', teacher: 'Alice Smith', teacherEmail: 'alice.smith@school.edu' },
        { id: 2, name: 'Grade 11', section: 'B', teacher: 'Bob Jones', teacherEmail: 'bob.jones@school.edu' },
        { id: 3, name: 'Grade 09', section: 'C', teacher: 'Charlie Brown', teacherEmail: 'charlie.brown@school.edu' }
    ];

    const initialStudents = [
        {
            id: '1',
            studentName: 'John Doe',
            studentAge: '14',
            studentRollNo: '2024-001',
            studentGender: 'Male',
            studentClass: 'Grade 10', // Maps to class
            studentEmail: 'john.doe@student.edu',
            studentProfilePicture: 'https://randomuser.me/api/portraits/men/1.jpg',
            parentName: 'Michael Doe',
            parentPhone: '+1 234 567 8901',
            parentEmail: 'michael.doe@parent.edu',
            parentAddress: '123 Elm Street, Cityville'
        },
        {
            id: '2',
            studentName: 'Jane Smith',
            studentAge: '15',
            studentRollNo: '2024-002',
            studentGender: 'Female',
            studentClass: 'Grade 10', // Maps to class
            studentEmail: 'jane.smith@student.edu',
            studentProfilePicture: 'https://randomuser.me/api/portraits/women/1.jpg',
            parentName: 'Sarah Smith',
            parentPhone: '+1 987 654 3210',
            parentEmail: 'sarah.smith@parent.edu',
            parentAddress: '456 Oak Ave, Townsville'
        },
        {
            id: '3',
            studentName: 'Sam Wilson',
            studentAge: '16',
            studentRollNo: '2024-003',
            studentGender: 'Male',
            studentClass: 'Grade 11',
            studentEmail: 'sam.wilson@student.edu',
            studentProfilePicture: 'https://randomuser.me/api/portraits/men/2.jpg',
            parentName: 'Paul Wilson',
            parentPhone: '+1 555 123 4567',
            parentEmail: 'paul.wilson@parent.edu',
            parentAddress: '789 Pine Way, Metropolis'
        }
    ];

    // --- STATE MANAGEMENT ---
    const [classes, setClasses] = useState(initialClasses);
    const [allStudents, setAllStudents] = useState(initialStudents);

    // CRUD State
    const [show, setShow] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentClass, setCurrentClass] = useState({ id: null, name: '', section: '', teacher: '', teacherEmail: '' });

    // Drill-Down State
    const [selectedClass, setSelectedClass] = useState(null); // null means show Overview, otherwise show Detail View

    // Student Modal State
    const [showStudentModal, setShowStudentModal] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [isEditingStudent, setIsEditingStudent] = useState(false);
    const [editingStudentData, setEditingStudentData] = useState(null);

    const handleSaveStudent = () => {
        setAllStudents(allStudents.map(s => s.id === editingStudentData.id ? editingStudentData : s));
        setSelectedStudent(editingStudentData);
        setIsEditingStudent(false);
    };


    // --- CRUD HANDLERS ---
    const handleShowAdd = () => {
        setIsEditing(false);
        setCurrentClass({ id: null, name: '', section: '', teacher: '', teacherEmail: '' });
        setShow(true);
    };

    const handleShowEdit = (cls) => {
        setIsEditing(true);
        setCurrentClass(cls);
        setShow(true);
    };

    const handleClose = () => setShow(false);

    const handleSave = () => {
        if (isEditing) {
            setClasses(classes.map(c => c.id === currentClass.id ? currentClass : c));
            if (selectedClass && selectedClass.id === currentClass.id) {
                setSelectedClass(currentClass); // Update detail view if open
            }
        } else {
            const newEntry = { ...currentClass, id: Date.now() };
            setClasses([...classes, newEntry]);
        }
        handleClose();
    };

    const handleDelete = (id) => {
        if (window.confirm("Are you sure you want to delete this class?")) {
            setClasses(classes.filter(c => c.id !== id));
        }
    };

    // --- VIEW RENDERERS ---

    const renderOverview = () => (
        <>
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
                        <h2 className="fw-bold mb-0">Manage Classes</h2>
                        <p className="text-muted small mb-0">Create, edit, or remove school sections</p>
                    </div>
                </div>
                <Button variant="primary" className="rounded-pill px-4 shadow-sm" onClick={handleShowAdd}>
                    <i className="bi bi-plus-circle me-2"></i>Add New Class
                </Button>
            </div>

            <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
                <Card.Body className="p-0">
                    <Table responsive hover className="mb-0 custom-table bg-white">
                        <thead className="bg-light text-secondary small text-uppercase" style={{ letterSpacing: '0.5px' }}>
                            <tr>
                                <th className="ps-4 py-3 border-0">Class Name</th>
                                <th className="py-3 border-0">Assigned Teacher</th>
                                <th className="py-3 border-0">Section</th>
                                <th className="py-3 text-end pe-4 border-0">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {classes.length > 0 ? classes.map((cls) => (
                                <tr key={cls.id} style={{ cursor: 'pointer', transition: 'background-color 0.2s' }} className="align-middle group-hover" onClick={() => setSelectedClass(cls)}>
                                    <td className="ps-4 py-3 border-bottom-0 border-top">
                                        <div className="d-flex align-items-center">
                                            <div className="bg-primary bg-opacity-10 text-primary rounded-3 p-2 me-3 d-flex align-items-center justify-content-center" style={{ width: '42px', height: '42px' }}>
                                                <i className="bi bi-book fs-5"></i>
                                            </div>
                                            <div>
                                                <span className="fw-bold text-dark d-block" style={{ fontSize: '1.05rem' }}>{cls.name}</span>
                                                <span className="text-muted small">Click to view roster</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-3 border-bottom-0 border-top text-secondary fw-medium">{cls.teacher}</td>
                                    <td className="py-3 border-bottom-0 border-top"><Badge bg="info" className="bg-opacity-10 text-info px-3 py-2 rounded-pill fw-bold border border-info border-opacity-25">{cls.section}</Badge></td>
                                    <td className="text-end pe-4 py-3 border-bottom-0 border-top" onClick={(e) => e.stopPropagation()}>
                                        <Button
                                            variant="light"
                                            size="sm"
                                            className="text-primary me-2 shadow-sm border border-secondary border-opacity-10 rounded-pill px-3 hover-lift"
                                            onClick={() => handleShowEdit(cls)}
                                        >
                                            <i className="bi bi-pencil-square"></i> Edit
                                        </Button>
                                        <Button
                                            variant="light"
                                            size="sm"
                                            className="text-danger shadow-sm border border-secondary border-opacity-10 rounded-circle p-1 hover-lift"
                                            style={{ width: '32px', height: '32px' }}
                                            onClick={() => handleDelete(cls.id)}
                                        >
                                            <i className="bi bi-trash3"></i>
                                        </Button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="4" className="text-center py-5 text-muted bg-white">No classes available.</td>
                                </tr>
                            )}
                        </tbody>
                    </Table>
                </Card.Body>
            </Card>
        </>
    );

    const renderClassDetail = () => {
        // Filter students belonging to this class
        const enrolledStudents = allStudents.filter(s => s.studentClass === selectedClass.name);

        return (
            <>
                <div className="mb-4">
                    <Button variant="link" className="text-decoration-none text-secondary p-0 mb-3 d-inline-flex align-items-center" onClick={() => setSelectedClass(null)}>
                        <i className="bi bi-arrow-left me-2"></i>Back to All Classes
                    </Button>
                    <div className="d-flex justify-content-between align-items-end">
                        <div>
                            <div className="d-flex align-items-center gap-3">
                                <h1 className="fw-bold mb-0 text-dark">{selectedClass.name}</h1>
                                <Badge bg="primary" className="fs-6 px-3 py-2 rounded-pill shadow-sm">Section {selectedClass.section}</Badge>
                            </div>
                            <p className="text-muted mt-2 mb-0 fs-6">
                                <i className="bi bi-person-workspace me-2 text-info"></i>
                                Teacher in Charge: <strong className="text-dark">{selectedClass.teacher}</strong> ({selectedClass.teacherEmail})
                            </p>
                        </div>
                    </div>
                </div>

                <Card className="border-0 shadow-sm rounded-4 overflow-hidden bg-white">
                    <Card.Header className="bg-white border-bottom py-4 px-4 d-flex justify-content-between align-items-center">
                        <h5 className="fw-bold mb-0 text-dark d-flex align-items-center">
                            <i className="bi bi-people-fill text-primary me-2"></i> Class Roster
                        </h5>
                        <Badge bg="secondary" className="bg-opacity-10 text-secondary border px-3 py-2 rounded-pill">
                            {enrolledStudents.length} Students Enrolled
                        </Badge>
                    </Card.Header>
                    <Card.Body className="p-0">
                        <Table responsive hover className="mb-0 custom-table">
                            <thead className="bg-light text-secondary small text-uppercase" style={{ letterSpacing: '0.5px' }}>
                                <tr>
                                    <th className="ps-4 py-3 border-0">Student</th>
                                    <th className="py-3 border-0">Roll No.</th>
                                    <th className="py-3 border-0">Gender</th>
                                    <th className="py-3 border-0">Contact Parent</th>
                                </tr>
                            </thead>
                            <tbody>
                                {enrolledStudents.length > 0 ? enrolledStudents.map(student => (
                                    <tr
                                        key={student.id}
                                        style={{ cursor: 'pointer', transition: 'background-color 0.2s' }}
                                        onClick={() => {
                                            setSelectedStudent(student);
                                            setShowStudentModal(true);
                                            setIsEditingStudent(false);
                                        }}
                                        className="align-middle hover-bg-light"
                                    >
                                        <td className="ps-4 py-3 border-bottom-0 border-top">
                                            <div className="d-flex align-items-center">
                                                <img
                                                    src={student.studentProfilePicture}
                                                    alt={student.studentName}
                                                    className="rounded-circle me-3 border border-2 border-white shadow-sm"
                                                    style={{ width: '45px', height: '45px', objectFit: 'cover' }}
                                                />
                                                <div>
                                                    <span className="fw-bold text-dark d-block" style={{ fontSize: '1.05rem' }}>{student.studentName}</span>
                                                    <span className="text-muted small">{student.studentEmail}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3 border-bottom-0 border-top"><Badge bg="light" className="text-dark border px-2 py-1">{student.studentRollNo}</Badge></td>
                                        <td className="py-3 border-bottom-0 border-top text-secondary">{student.studentGender}</td>
                                        <td className="py-3 border-bottom-0 border-top">
                                            <div>
                                                <span className="d-block text-dark fw-medium small">{student.parentName}</span>
                                                <span className="text-muted small">{student.parentPhone}</span>
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="4" className="text-center py-5 text-muted bg-white">
                                            <i className="bi bi-inbox fs-2 d-block mb-2 text-light"></i>
                                            No students currently assigned to this class.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </Table>
                    </Card.Body>
                </Card>
            </>
        );
    };

    return (
        <Layout>
            <Container fluid className="py-4">

                {selectedClass ? renderClassDetail() : renderOverview()}

                {/* --- CRUD MODAL (For Add/Edit Class) --- */}
                <Modal show={show} onHide={handleClose} centered backdrop="static">
                    <Modal.Header closeButton className="border-0 pb-0">
                        <Modal.Title className="fw-bold text-dark h4">
                            {isEditing ? 'Edit Class Parameters' : 'Register New Class'}
                        </Modal.Title>
                    </Modal.Header>
                    <Modal.Body className="pt-3">
                        <Form>
                            <Form.Group className="mb-4">
                                <Form.Label className="small fw-bold text-secondary text-uppercase ls-1">Class Name</Form.Label>
                                <Form.Control
                                    type="text"
                                    className="p-3 bg-light border-0 rounded-3"
                                    value={currentClass.name}
                                    placeholder="e.g. Grade 10"
                                    onChange={(e) => setCurrentClass({ ...currentClass, name: e.target.value })}
                                />
                            </Form.Group>
                            <Form.Group className="mb-4">
                                <Form.Label className="small fw-bold text-secondary text-uppercase ls-1">Section</Form.Label>
                                <Form.Control
                                    type="text"
                                    className="p-3 bg-light border-0 rounded-3"
                                    value={currentClass.section}
                                    placeholder="e.g. A"
                                    onChange={(e) => setCurrentClass({ ...currentClass, section: e.target.value })}
                                />
                            </Form.Group>
                            <Row>
                                <Col md={6}>
                                    <Form.Group className="mb-4">
                                        <Form.Label className="small fw-bold text-secondary text-uppercase ls-1">Primary Teacher</Form.Label>
                                        <Form.Control
                                            type="text"
                                            className="p-3 bg-light border-0 rounded-3"
                                            value={currentClass.teacher}
                                            placeholder="John Doe"
                                            onChange={(e) => setCurrentClass({ ...currentClass, teacher: e.target.value })}
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group className="mb-4">
                                        <Form.Label className="small fw-bold text-secondary text-uppercase ls-1">Teacher Email</Form.Label>
                                        <Form.Control
                                            type="email"
                                            className="p-3 bg-light border-0 rounded-3"
                                            value={currentClass.teacherEmail}
                                            placeholder="john@school.edu"
                                            onChange={(e) => setCurrentClass({ ...currentClass, teacherEmail: e.target.value })}
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>
                        </Form>
                    </Modal.Body>
                    <Modal.Footer className="border-0 pt-0">
                        <Button variant="light" className="text-secondary fw-bold rounded-pill px-4" onClick={handleClose}>Cancel</Button>
                        <Button variant="primary" className="fw-bold rounded-pill px-5 shadow-sm" onClick={handleSave}>
                            {isEditing ? 'Save Changes' : 'Create Class'}
                        </Button>
                    </Modal.Footer>
                </Modal>

                {/* --- STUDENT PROFILE MODAL --- */}
                {selectedStudent && (
                    <Modal show={showStudentModal} onHide={() => setShowStudentModal(false)} size="lg" centered>
                        <Modal.Header closeButton className="border-0 pb-0 bg-light rounded-top-4">
                        </Modal.Header>
                        <Modal.Body className="p-0 bg-light rounded-bottom-4">

                            {/* Header Banner */}
                            <div className="bg-primary bg-gradient p-5 position-relative text-center text-md-start d-flex flex-column flex-md-row align-items-center gap-4">
                                <img
                                    src={selectedStudent.studentProfilePicture}
                                    alt="Profile"
                                    className="rounded-circle border border-4 border-white shadow-lg"
                                    style={{ width: '120px', height: '120px', objectFit: 'cover', marginTop: '-10px' }}
                                />
                                <div className="text-white">
                                    <h2 className="fw-bold mb-1">{selectedStudent.studentName}</h2>
                                    <div className="d-flex flex-wrap justify-content-center justify-content-md-start gap-2 mb-2">
                                        <Badge bg="light" text="primary" className="px-3 py-2 rounded-pill fw-bold shadow-sm">
                                            {selectedStudent.studentClass}
                                        </Badge>
                                        <Badge bg="success" className="px-3 py-2 rounded-pill fw-bold shadow-sm border border-light border-opacity-25">
                                            Active Student
                                        </Badge>
                                    </div>
                                    <p className="mb-0 opacity-75 small">
                                        <i className="bi bi-envelope-fill me-2"></i>{selectedStudent.studentEmail}
                                    </p>
                                </div>
                            </div>

                            {/* Details Container */}
                            <div className="p-4 p-md-5 bg-white rounded-top-4" style={{ marginTop: '-20px', position: 'relative', zIndex: 2 }}>
                                {isEditingStudent ? (
                                    <Form>
                                        <Row className="g-4">
                                            <Col md={6}>
                                                <Form.Group>
                                                    <Form.Label className="small fw-bold text-secondary text-uppercase ls-1">Name</Form.Label>
                                                    <Form.Control type="text" className="p-2 bg-light border-0 rounded-3" value={editingStudentData.studentName} onChange={(e) => setEditingStudentData({ ...editingStudentData, studentName: e.target.value })} />
                                                </Form.Group>
                                            </Col>
                                            <Col md={6}>
                                                <Form.Group>
                                                    <Form.Label className="small fw-bold text-secondary text-uppercase ls-1">Email</Form.Label>
                                                    <Form.Control type="email" className="p-2 bg-light border-0 rounded-3" value={editingStudentData.studentEmail} onChange={(e) => setEditingStudentData({ ...editingStudentData, studentEmail: e.target.value })} />
                                                </Form.Group>
                                            </Col>
                                            <Col md={4}>
                                                <Form.Group>
                                                    <Form.Label className="small fw-bold text-secondary text-uppercase ls-1">Roll No.</Form.Label>
                                                    <Form.Control type="text" className="p-2 bg-light border-0 rounded-3" value={editingStudentData.studentRollNo} onChange={(e) => setEditingStudentData({ ...editingStudentData, studentRollNo: e.target.value })} />
                                                </Form.Group>
                                            </Col>
                                            <Col md={4}>
                                                <Form.Group>
                                                    <Form.Label className="small fw-bold text-secondary text-uppercase ls-1">Age</Form.Label>
                                                    <Form.Control type="number" className="p-2 bg-light border-0 rounded-3" value={editingStudentData.studentAge} onChange={(e) => setEditingStudentData({ ...editingStudentData, studentAge: e.target.value })} />
                                                </Form.Group>
                                            </Col>
                                            <Col md={4}>
                                                <Form.Group>
                                                    <Form.Label className="small fw-bold text-secondary text-uppercase ls-1">Gender</Form.Label>
                                                    <Form.Control type="text" className="p-2 bg-light border-0 rounded-3" value={editingStudentData.studentGender} onChange={(e) => setEditingStudentData({ ...editingStudentData, studentGender: e.target.value })} />
                                                </Form.Group>
                                            </Col>
                                            <Col md={6}>
                                                <Form.Group>
                                                    <Form.Label className="small fw-bold text-secondary text-uppercase ls-1">Parent Name</Form.Label>
                                                    <Form.Control type="text" className="p-2 bg-light border-0 rounded-3" value={editingStudentData.parentName} onChange={(e) => setEditingStudentData({ ...editingStudentData, parentName: e.target.value })} />
                                                </Form.Group>
                                            </Col>
                                            <Col md={6}>
                                                <Form.Group>
                                                    <Form.Label className="small fw-bold text-secondary text-uppercase ls-1">Parent Phone</Form.Label>
                                                    <Form.Control type="text" className="p-2 bg-light border-0 rounded-3" value={editingStudentData.parentPhone} onChange={(e) => setEditingStudentData({ ...editingStudentData, parentPhone: e.target.value })} />
                                                </Form.Group>
                                            </Col>
                                            <Col md={12}>
                                                <Form.Group>
                                                    <Form.Label className="small fw-bold text-secondary text-uppercase ls-1">Parent Address</Form.Label>
                                                    <Form.Control type="text" className="p-2 bg-light border-0 rounded-3" value={editingStudentData.parentAddress} onChange={(e) => setEditingStudentData({ ...editingStudentData, parentAddress: e.target.value })} />
                                                </Form.Group>
                                            </Col>
                                        </Row>
                                    </Form>
                                ) : (
                                    <Row className="g-5">
                                        {/* Personal Info */}
                                        <Col md={6}>
                                            <h6 className="text-primary fw-bold text-uppercase ls-1 mb-4 d-flex align-items-center">
                                                <i className="bi bi-person-badge-fill me-2 fs-5"></i>
                                                Academic Profile
                                            </h6>
                                            <div className="bg-light rounded-4 p-4 border border-secondary border-opacity-10">
                                                <Row className="gy-4">
                                                    <Col xs={6}>
                                                        <p className="text-muted small mb-1 text-uppercase ls-1 fw-semibold">Roll No.</p>
                                                        <p className="mb-0 fw-bold text-dark fs-5">{selectedStudent.studentRollNo}</p>
                                                    </Col>
                                                    <Col xs={6}>
                                                        <p className="text-muted small mb-1 text-uppercase ls-1 fw-semibold">Age</p>
                                                        <p className="mb-0 fw-bold text-dark fs-5">{selectedStudent.studentAge} <span className="text-muted fs-6 fw-normal">yrs</span></p>
                                                    </Col>
                                                    <Col xs={6}>
                                                        <p className="text-muted small mb-1 text-uppercase ls-1 fw-semibold">Gender</p>
                                                        <p className="mb-0 fw-bold text-dark fs-5">{selectedStudent.studentGender}</p>
                                                    </Col>
                                                </Row>
                                            </div>
                                        </Col>

                                        {/* Parent Info */}
                                        <Col md={6}>
                                            <h6 className="text-success fw-bold text-uppercase ls-1 mb-4 d-flex align-items-center">
                                                <i className="bi bi-house-heart-fill me-2 fs-5"></i>
                                                Guardian Details
                                            </h6>
                                            <div className="bg-light rounded-4 p-4 border border-secondary border-opacity-10">
                                                <div className="mb-3 border-bottom pb-3">
                                                    <p className="text-muted small mb-1 text-uppercase ls-1 fw-semibold">Primary Guardian</p>
                                                    <p className="mb-0 fw-bold text-dark fs-5">{selectedStudent.parentName}</p>
                                                </div>
                                                <div className="mb-3 border-bottom pb-3">
                                                    <p className="text-muted small mb-1 text-uppercase ls-1 fw-semibold">Contact & Email</p>
                                                    <p className="mb-1 text-dark d-flex align-items-center fw-medium">
                                                        <i className="bi bi-telephone-fill text-success me-2 rounded bg-white p-1 shadow-sm"></i>
                                                        {selectedStudent.parentPhone}
                                                    </p>
                                                    <p className="mb-0 text-dark d-flex align-items-center fw-medium">
                                                        <i className="bi bi-envelope-fill text-success me-2 rounded bg-white p-1 shadow-sm"></i>
                                                        {selectedStudent.parentEmail}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-muted small mb-1 text-uppercase ls-1 fw-semibold">Residential Address</p>
                                                    <p className="mb-0 text-dark fw-medium lh-sm">{selectedStudent.parentAddress}</p>
                                                </div>
                                            </div>
                                        </Col>
                                    </Row>
                                )}

                                {/* Action Buttons */}
                                <div className="mt-5 d-flex justify-content-end gap-3 pt-3 border-top">
                                    {!isEditingStudent ? (
                                        <>
                                            <Button variant="outline-primary" className="rounded-pill px-4 fw-bold" onClick={() => {
                                                setEditingStudentData(selectedStudent);
                                                setIsEditingStudent(true);
                                            }}>
                                                <i className="bi bi-pencil-square me-2"></i>Edit Profile
                                            </Button>
                                            <Button variant="secondary" className="rounded-pill px-5 fw-bold" onClick={() => setShowStudentModal(false)}>
                                                Close Profile
                                            </Button>
                                        </>
                                    ) : (
                                        <>
                                            <Button variant="light" className="text-secondary fw-bold rounded-pill px-4" onClick={() => setIsEditingStudent(false)}>
                                                Cancel
                                            </Button>
                                            <Button variant="primary" className="fw-bold rounded-pill px-5 shadow-sm" onClick={handleSaveStudent}>
                                                Save Changes
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>

                        </Modal.Body>
                    </Modal>
                )}

            </Container>

            <style>
                {`
                    .custom-table tbody tr {
                        transition: all 0.2s ease;
                    }
                    .custom-table tbody tr:hover {
                        background-color: #f8fafc !important;
                        transform: translateY(-1px);
                        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
                        position: relative;
                        z-index: 10;
                    }
                    .hover-bg-light:hover {
                        background-color: #f8fafc !important;
                    }
                    .hover-lift {
                        transition: transform 0.2s ease, box-shadow 0.2s ease;
                    }
                    .hover-lift:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 4px 6px rgba(0,0,0,0.1) !important;
                    }
                    .ls-1 {
                        letter-spacing: 1px;
                    }
                    
                    /* Modal animation overrides for snappier feel */
                    .modal.fade .modal-dialog {
                        transform: scale(0.95);
                        transition: transform 0.2s ease-out;
                    }
                    .modal.show .modal-dialog {
                        transform: scale(1);
                    }
                `}
            </style>
        </Layout>
    );
};

export default ManageClasses;