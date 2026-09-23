import React, { useState, useEffect } from 'react';
import { Container, Table, Button, Modal, Form, Card, Badge, Row, Col } from 'react-bootstrap';
import { useNavigate, useLocation } from 'react-router-dom';
import Layout from '../components/Layout';
import Axios from 'axios';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ManageClasses = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const classFilter = location.state?.classFilter;
   
    const [classes, setClasses] = useState([]);

    const [allStudents, setAllStudents] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchAllStudents = async () => {
        setLoading(true);
        try {
            const response = await Axios.get('/api/students-detailed');
            setAllStudents(response.data);
        } catch (err) {
            console.error("Fetch error in classes:", err);
            setAllStudents([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchClasses = async () => {
        try {
            const response = await Axios.get('/api/classes');
            setClasses(response.data);
        } catch (err) {
            console.error("Error fetching classes:", err);
        }
    };

    useEffect(() => {
        const handleFocus = () => {
            fetchAllStudents();
            fetchClasses();
        };

        fetchAllStudents();
        fetchClasses();
        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, []);


    
    useEffect(() => {
        if (classFilter) {
            const matched = classes.find(c => c.name === classFilter || `${c.name}-${c.section}` === classFilter || `${c.name} - ${c.section}` === classFilter);
            if (matched) setSelectedClass(matched);
        }
    }, [classFilter, classes]);

    useEffect(() => {
        if (!selectedClass) return;
        const refreshed = classes.find(c => c.id === selectedClass.id || c._id === selectedClass._id);
        if (refreshed && refreshed !== selectedClass) setSelectedClass(refreshed);
    }, [classes]);

   
    const [show, setShow] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentClass, setCurrentClass] = useState({ id: null, name: '', section: '', teacher: '', teacherEmail: '' });

  
    const [selectedClass, setSelectedClass] = useState(null); 

    
    const [showStudentModal, setShowStudentModal] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [isEditingStudent, setIsEditingStudent] = useState(false);
    const [editingStudentData, setEditingStudentData] = useState(null);
    const [studentFormErrors, setStudentFormErrors] = useState({});
    const [searchTerm, setSearchTerm] = useState('');
    const studentImageRef = React.useRef(null);

    const handleUpdateStudentPic = async (e) => {
        const file = e.target.files[0];
        if (!file || !selectedStudent) return;

        if (file.size > MAX_FILE_SIZE) {
            alert('System supports only up to 10 MB for uploads.');
            e.target.value = '';
            return;
        }

        const formData = new FormData();
        formData.append('profilePic', file);
        formData.append('email', selectedStudent.studentEmail);
        formData.append('role', 'student');

        try {
            const res = await Axios.post('/api/user/profile-picture', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            const newPicUrl = `/uploads/images/${res.data.profilePic}`;
            
            // Update the lists and selection
            const updatedStudent = { ...selectedStudent, studentProfilePicture: newPicUrl };
            setAllStudents(allStudents.map(s => s.id === selectedStudent.id ? updatedStudent : s));
            setSelectedStudent(updatedStudent);
            
            alert("Student picture updated successfully!");
        } catch (err) {
            console.error("Error updating student pic:", err);
            alert("Failed to update student picture.");
        }
    };

    const validateStudentEdit = (student) => {
        const trimmed = {
            studentName: String(student.studentName || '').trim(),
            studentEmail: String(student.studentEmail || '').trim(),
            studentAge: String(student.studentAge ?? '').trim(),
            studentGender: String(student.studentGender || '').trim(),
            parentName: String(student.parentName || '').trim(),
            parentPhone: String(student.parentPhone || '').trim(),
            parentEmail: String(student.parentEmail || '').trim(),
            parentAddress: String(student.parentAddress || '').trim(),
            studentPassword: String(student.studentPassword || '').trim(),
            parentPassword: String(student.parentPassword || '').trim(),
        };

        const errors = {};
        const requiredFields = [
            ['studentName', 'Student name is required.'],
            ['studentEmail', 'Student email is required.'],
            ['studentAge', 'Student age is required.'],
            ['studentGender', 'Student gender is required.'],
            ['parentName', 'Parent name is required.'],
            ['parentPhone', 'Parent phone is required.'],
            ['parentEmail', 'Parent email is required.'],
            ['parentAddress', 'Parent address is required.'],
        ];

        requiredFields.forEach(([field, message]) => {
            if (!trimmed[field]) errors[field] = message;
        });

        if (trimmed.studentPassword && trimmed.studentPassword.length < 8) {
            errors.studentPassword = 'Password must be at least 8 characters.';
        }
        if (trimmed.parentPassword && trimmed.parentPassword.length < 8) {
            errors.parentPassword = 'Password must be at least 8 characters.';
        }
        if (trimmed.parentPhone && !/^\d{11}$/.test(trimmed.parentPhone)) {
            errors.parentPhone = 'Phone number must be exactly 11 digits.';
        }
        if (trimmed.studentEmail && !trimmed.studentEmail.endsWith('@gmail.com')) {
            errors.studentEmail = 'Email must end with @gmail.com.';
        }
        if (trimmed.parentEmail && !trimmed.parentEmail.endsWith('@gmail.com')) {
            errors.parentEmail = 'Email must end with @gmail.com.';
        }

        setStudentFormErrors(errors);
        if (Object.keys(errors).length > 0) return null;

        return {
            ...student,
            studentName: trimmed.studentName,
            studentEmail: trimmed.studentEmail,
            studentAge: Number(trimmed.studentAge),
            studentGender: trimmed.studentGender,
            parentName: trimmed.parentName,
            parentPhone: trimmed.parentPhone,
            parentEmail: trimmed.parentEmail,
            parentAddress: trimmed.parentAddress,
            studentPassword: trimmed.studentPassword || undefined,
            parentPassword: trimmed.parentPassword || undefined,
        };
    };

    const handleSaveStudent = async () => {
        const validatedStudent = validateStudentEdit(editingStudentData);
        if (!validatedStudent) return;

        try {
            await Axios.put(`/api/students/${validatedStudent.id}`, validatedStudent);

            setAllStudents(prev => prev.map(s => s.id === validatedStudent.id ? {
                ...s,
                ...validatedStudent,
                studentPassword: validatedStudent.studentPassword || s.studentPassword,
                parentPassword: validatedStudent.parentPassword || s.parentPassword,
            } : s));
            setSelectedStudent({ ...selectedStudent, ...validatedStudent, studentPassword: validatedStudent.studentPassword || selectedStudent.studentPassword, parentPassword: validatedStudent.parentPassword || selectedStudent.parentPassword });
            setIsEditingStudent(false);
            alert("Student details updated successfully!");
        } catch (err) {
            console.error("Error saving student:", err);
            alert(err.response?.data?.message || "Failed to save student details.");
        }
    };

    const handleDeleteStudent = async () => {
        if (!selectedStudent) return;
        if (!window.confirm("Are you sure you want to delete this student and their linked parent account?")) return;

        try {
            await Axios.delete(`/api/students/${selectedStudent.id}`);
            await fetchAllStudents();
            setShowStudentModal(false);
            setSelectedStudent(null);
            alert("Student and linked parent deleted successfully.");
        } catch (err) {
            console.error("Error deleting student:", err);
            alert(err.response?.data?.message || "Failed to delete student.");
        }
    };

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

    const handleSave = async () => {
        try {
            const payload = {
                name: currentClass.name,
                section: currentClass.section
            };
            if (isEditing) {
                await Axios.put(`/api/classes/${currentClass.id}`, payload);
            } else {
                await Axios.post('/api/classes', payload);
            }
            fetchClasses();
            handleClose();
        } catch (err) {
            console.error("Error saving class:", err);
            alert(err.response?.data?.message || "Failed to save class. Please ensure all fields are filled.");
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this class?")) {
            try {
                await Axios.delete(`/api/classes/${id}`);
                fetchClasses();
                if (selectedClass && selectedClass.id === id) {
                    setSelectedClass(null);
                }
            } catch (err) {
                console.error("Error deleting class:", err);
                alert("Failed to delete class.");
            }
        }
    };



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
                        <p className="text-muted small mb-0">Create, edit, or remove Class sections</p>
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
                                <th className="py-3 border-0">Subject Teachers</th>
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
                                    <td className="py-3 border-bottom-0 border-top text-secondary fw-medium" style={{ maxWidth: '280px' }}>
                                        {cls.assignments?.length ? (
                                            <div className="d-flex flex-wrap gap-1 align-items-center">
                                                <Badge bg="light" className="text-dark border fw-medium">
                                                    {cls.assignments[0].teacherName} · {cls.assignments[0].subject}
                                                </Badge>
                                                {cls.assignments.length > 1 && (
                                                    <Badge bg="secondary" className="bg-opacity-10 text-secondary border fw-normal">
                                                        +{cls.assignments.length - 1} more
                                                    </Badge>
                                                )}
                                            </div>
                                        ) : (
                                            <span>{cls.teacher || 'Unassigned'}</span>
                                        )}
                                    </td>
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
       
        const enrolledStudents = allStudents.filter(s => {
            const matchesClass = s.studentClass === `${selectedClass.name} - ${selectedClass.section}` || s.studentClass === selectedClass.name;
            const matchesSearch = !searchTerm || 
                s.studentName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                (s.studentRollNo && s.studentRollNo.toString().toLowerCase().includes(searchTerm.toLowerCase()));
            return matchesClass && matchesSearch;
        }).sort((a, b) => {
            const aNum = parseInt(a.studentRollNo?.split('-')[0] || '0');
            const bNum = parseInt(b.studentRollNo?.split('-')[0] || '0');
            return aNum - bNum;
        });

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
                                Subject teachers: <strong className="text-dark">{selectedClass.teacher}</strong>
                            </p>
                        </div>
                    </div>
                </div>

                <Card className="border-0 shadow-sm rounded-4 overflow-hidden bg-white">
                    <Card.Header className="bg-white border-bottom py-3 px-4 d-flex justify-content-between align-items-center flex-wrap gap-3">
                        <h5 className="fw-bold mb-0 text-dark d-flex align-items-center">
                            <i className="bi bi-people-fill text-primary me-2"></i> Class Roster
                        </h5>
                        <div className="d-flex align-items-center gap-3">
                            <div className="input-group input-group-sm" style={{ width: '250px' }}>
                                <span className="input-group-text bg-light border-0">
                                    <i className="bi bi-search text-muted"></i>
                                </span>
                                <Form.Control
                                    type="text"
                                    placeholder="Search student..."
                                    className="bg-light border-0 shadow-none"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                {searchTerm && (
                                    <Button variant="light" className="border-0 bg-light" onClick={() => setSearchTerm('')}>
                                        <i className="bi bi-x"></i>
                                    </Button>
                                )}
                            </div>
                            <Badge bg="secondary" className="bg-opacity-10 text-secondary border px-3 py-2 rounded-pill">
                                {enrolledStudents.length} Students
                            </Badge>
                        </div>
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
                                                {student.studentProfilePicture ? (
                                                    <img
                                                        src={student.studentProfilePicture}
                                                        alt={student.studentName}
                                                        className="rounded-circle me-3 border border-2 border-white shadow-sm"
                                                        style={{ width: '45px', height: '45px', objectFit: 'cover' }}
                                                    />
                                                ) : (
                                                    <div className="bg-primary bg-opacity-10 text-primary rounded-circle me-3 fw-bold d-flex justify-content-center align-items-center" style={{ width: '45px', height: '45px' }}>
                                                        {student.studentName.charAt(0)}
                                                    </div>
                                                )}
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
                                <Form.Select
                                    className="p-3 bg-light border-0 rounded-3 shadow-none"
                                    value={currentClass.name}
                                    onChange={(e) => setCurrentClass({ ...currentClass, name: e.target.value })}
                                >
                                    <option value="">Select Class...</option>
                                    {Array.from({ length: 12 }, (_, index) => index + 1).map(n => (
                                        <option key={n} value={n}>{n}</option>
                                    ))}
                                </Form.Select>
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
                            <Form.Group className="mb-2">
                                <Form.Text className="text-muted">
                                    After creating the class, open it to assign teachers subject by subject.
                                </Form.Text>
                            </Form.Group>

                        </Form>
                    </Modal.Body>
                    <Modal.Footer className="border-0 pt-0">
                        <Button variant="light" className="text-secondary fw-bold rounded-pill px-4" onClick={handleClose}>Cancel</Button>
                        <Button variant="primary" className="fw-bold rounded-pill px-5 shadow-sm" onClick={handleSave}>
                            {isEditing ? 'Save Changes' : 'Create Class'}
                        </Button>
                    </Modal.Footer>
                </Modal>

               
                {selectedStudent && (
                    <Modal show={showStudentModal} onHide={() => setShowStudentModal(false)} size="lg" centered dialogClassName="student-detail-modal">
                        <Modal.Header closeButton className="student-modal-close border-0" />
                        <Modal.Body className="p-0">
                            <div className="student-detail-scroll">
                                <div className="student-modal-hero position-relative text-center text-md-start d-flex flex-column flex-md-row align-items-center gap-4">
                                    <div 
                                        className="position-relative" 
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => studentImageRef.current?.click()}
                                        title="Click to update student photo"
                                    >
                                        {selectedStudent.studentProfilePicture ? (
                                            <img
                                                src={selectedStudent.studentProfilePicture}
                                                alt="Profile"
                                                className="rounded-circle border border-4 border-white shadow-lg"
                                                style={{ width: '120px', height: '120px', objectFit: 'cover', marginTop: '-10px' }}
                                            />
                                        ) : (
                                            <div className="student-avatar-placeholder rounded-4 border border-4 border-white shadow-lg d-flex justify-content-center align-items-center" style={{ width: '84px', height: '84px', marginTop: '-10px' }}>
                                                <i className="bi bi-person-fill"></i>
                                            </div>
                                        )}
                                        <div 
                                            className="bg-white rounded-circle d-flex align-items-center justify-content-center shadow-sm"
                                            style={{ position: 'absolute', bottom: '5px', right: '5px', width: '32px', height: '32px', border: '2px solid #fff' }}
                                        >
                                            <i className="bi bi-camera-fill"></i>
                                        </div>
                                        <input 
                                            type="file" 
                                            ref={studentImageRef} 
                                            style={{ display: 'none' }} 
                                            accept="image/*"
                                            onChange={handleUpdateStudentPic}
                                        />
                                    </div>
                                    <div className="text-white">
                                        <h2 className="student-modal-name mb-1">{selectedStudent.studentName}</h2>
                                        <div className="d-flex flex-wrap justify-content-center justify-content-md-start gap-2 mb-2">
                                            <Badge className="student-grade-badge px-3 py-2 rounded-pill fw-bold">
                                                {selectedStudent.studentClass}
                                            </Badge>
                                            <Badge className="student-active-badge px-3 py-2 rounded-pill fw-bold shadow-sm border border-light border-opacity-25">
                                                Active Student
                                            </Badge>
                                        </div>
                                        <p className="mb-0 opacity-75 small">
                                            <i className="bi bi-envelope-fill me-2"></i>{selectedStudent.studentEmail || 'Not added yet'}
                                        </p>
                                    </div>
                                </div>

                                <div className="p-4 p-md-5 bg-white rounded-top-4" style={{ marginTop: '-20px', position: 'relative', zIndex: 2 }}>
                                    {isEditingStudent ? (
                                        <Form>
                                            <Row className="g-4">
                                                <Col md={6}>
                                                    <Form.Group>
                                                        <Form.Label className="small fw-bold text-secondary text-uppercase ls-1">Name</Form.Label>
                                                        <Form.Control type="text" required isInvalid={!!studentFormErrors.studentName} className="p-2 bg-light border-0 rounded-3" value={editingStudentData.studentName} onChange={(e) => setEditingStudentData({ ...editingStudentData, studentName: e.target.value })} />
                                                            <Form.Control.Feedback type="invalid">{studentFormErrors.studentName}</Form.Control.Feedback>
                                                    </Form.Group>
                                                </Col>
                                                <Col md={6}>
                                                    <Form.Group>
                                                        <Form.Label className="small fw-bold text-secondary text-uppercase ls-1">Email</Form.Label>
                                                        <Form.Control type="email" required isInvalid={!!studentFormErrors.studentEmail} className="p-2 bg-light border-0 rounded-3" value={editingStudentData.studentEmail} onChange={(e) => setEditingStudentData({ ...editingStudentData, studentEmail: e.target.value })} />
                                                            <Form.Control.Feedback type="invalid">{studentFormErrors.studentEmail}</Form.Control.Feedback>
                                                    </Form.Group>
                                                </Col>
                                                <Col md={6}>
                                                    <Form.Group>
                                                        <Form.Label className="small fw-bold text-secondary text-uppercase ls-1">Update Password</Form.Label>
                                                        <Form.Control type="text" minLength="8" isInvalid={!!studentFormErrors.studentPassword} className="p-2 bg-light border-0 rounded-3" value={editingStudentData.studentPassword || ''} onChange={(e) => setEditingStudentData({ ...editingStudentData, studentPassword: e.target.value })} />
                                                            <Form.Control.Feedback type="invalid">{studentFormErrors.studentPassword}</Form.Control.Feedback>
                                                        <Form.Text className="text-muted" style={{ fontSize: '10px' }}>Minimum 8 characters</Form.Text>
                                                    </Form.Group>
                                                </Col>
                                                <Col md={3}>
                                                    <Form.Group>
                                                        <Form.Label className="small fw-bold text-secondary text-uppercase ls-1">Roll No. <span className="text-muted text-lowercase" style={{fontSize: '10px'}}>(Read Only)</span></Form.Label>
                                                        <Form.Control type="text" className="p-2 bg-light border-0 rounded-3 text-muted" value={editingStudentData.studentRollNo} readOnly disabled />
                                                    </Form.Group>
                                                </Col>
                                                <Col md={3}>
                                                    <Form.Group>
                                                        <Form.Label className="small fw-bold text-secondary text-uppercase ls-1">Age</Form.Label>
                                                        <Form.Control type="number" required min="3" max="22" isInvalid={!!studentFormErrors.studentAge} className="p-2 bg-light border-0 rounded-3" value={editingStudentData.studentAge} onChange={(e) => setEditingStudentData({ ...editingStudentData, studentAge: e.target.value })} />
                                                            <Form.Control.Feedback type="invalid">{studentFormErrors.studentAge}</Form.Control.Feedback>
                                                    </Form.Group>
                                                </Col>
                                                <Col md={3}>
                                                    <Form.Group>
                                                        <Form.Label className="small fw-bold text-secondary text-uppercase ls-1">Gender</Form.Label>
                                                        <Form.Control type="text" required isInvalid={!!studentFormErrors.studentGender} className="p-2 bg-light border-0 rounded-3" value={editingStudentData.studentGender} onChange={(e) => setEditingStudentData({ ...editingStudentData, studentGender: e.target.value })} />
                                                            <Form.Control.Feedback type="invalid">{studentFormErrors.studentGender}</Form.Control.Feedback>
                                                    </Form.Group>
                                                </Col>
                                                <Col md={3}>
                                                    <Form.Group>
                                                        <Form.Label className="small fw-bold text-secondary text-uppercase ls-1">Parent Phone</Form.Label>
                                                        <Form.Control type="text" required pattern="[0-9]{11}" isInvalid={!!studentFormErrors.parentPhone} className="p-2 bg-light border-0 rounded-3" value={editingStudentData.parentPhone} onChange={(e) => setEditingStudentData({ ...editingStudentData, parentPhone: e.target.value })} />
                                                            <Form.Control.Feedback type="invalid">{studentFormErrors.parentPhone}</Form.Control.Feedback>
                                                    </Form.Group>
                                                </Col>
                                                <Col md={6}>
                                                    <Form.Group>
                                                        <Form.Label className="small fw-bold text-secondary text-uppercase ls-1">Parent Name</Form.Label>
                                                        <Form.Control type="text" required isInvalid={!!studentFormErrors.parentName} className="p-2 bg-light border-0 rounded-3" value={editingStudentData.parentName} onChange={(e) => setEditingStudentData({ ...editingStudentData, parentName: e.target.value })} />
                                                            <Form.Control.Feedback type="invalid">{studentFormErrors.parentName}</Form.Control.Feedback>
                                                    </Form.Group>
                                                </Col>
                                                <Col md={6}>
                                                    <Form.Group>
                                                        <Form.Label className="small fw-bold text-secondary text-uppercase ls-1">Parent Email</Form.Label>
                                                        <Form.Control type="email" required isInvalid={!!studentFormErrors.parentEmail} className="p-2 bg-light border-0 rounded-3" value={editingStudentData.parentEmail || ''} onChange={(e) => setEditingStudentData({ ...editingStudentData, parentEmail: e.target.value })} />
                                                            <Form.Control.Feedback type="invalid">{studentFormErrors.parentEmail}</Form.Control.Feedback>
                                                    </Form.Group>
                                                </Col>
                                                <Col md={6}>
                                                    <Form.Group>
                                                        <Form.Label className="small fw-bold text-secondary text-uppercase ls-1">Parent Password</Form.Label>
                                                        <Form.Control type="text" minLength="8" isInvalid={!!studentFormErrors.parentPassword} className="p-2 bg-light border-0 rounded-3" value={editingStudentData.parentPassword || ''} onChange={(e) => setEditingStudentData({ ...editingStudentData, parentPassword: e.target.value })} />
                                                            <Form.Control.Feedback type="invalid">{studentFormErrors.parentPassword}</Form.Control.Feedback>
                                                        <Form.Text className="text-muted" style={{ fontSize: '10px' }}>Minimum 8 characters</Form.Text>
                                                    </Form.Group>
                                                </Col>
                                                <Col md={6}>
                                                    <Form.Group>
                                                        <Form.Label className="small fw-bold text-secondary text-uppercase ls-1">Parent Address</Form.Label>
                                                        <Form.Control type="text" required isInvalid={!!studentFormErrors.parentAddress} className="p-2 bg-light border-0 rounded-3" value={editingStudentData.parentAddress} onChange={(e) => setEditingStudentData({ ...editingStudentData, parentAddress: e.target.value })} />
                                                            <Form.Control.Feedback type="invalid">{studentFormErrors.parentAddress}</Form.Control.Feedback>
                                                    </Form.Group>
                                                </Col>
                                            </Row>
                                        </Form>
                                    ) : (
                                        <Row className="student-info-grid g-4">
                                            <Col md={7}>
                                                <h6 className="student-panel-title fw-bold mb-4 d-flex align-items-center">
                                                    <span className="student-panel-icon student-panel-icon-coral"><i className="bi bi-file-earmark-text-fill"></i></span>
                                                    Academic Profile
                                                </h6>
                                                <div className="student-info-panel rounded-4 p-4">
                                                    <Row className="gy-4">
                                                        <Col xs={6}>
                                                            <p className="student-field-label mb-1">Roll No.</p>
                                                            <p className="student-field-value mb-0">{selectedStudent.studentRollNo || 'Not added yet'}</p>
                                                        </Col>
                                                        <Col xs={6}>
                                                            <p className="student-field-label mb-1">Age</p>
                                                            <p className="student-field-value mb-0">{selectedStudent.studentAge || 'Not added yet'} {selectedStudent.studentAge && <span className="student-muted-value">yrs</span>}</p>
                                                        </Col>
                                                        <Col xs={6}>
                                                            <p className="student-field-label mb-1">Gender</p>
                                                            <p className="student-field-value mb-0">{selectedStudent.studentGender || 'Not added yet'}</p>
                                                        </Col>
                                                        <Col xs={12} className="student-credentials-block">
                                                            <p className="student-field-label mb-1">Student credentials</p>
                                                            <p className="student-credential-row mb-1"><i className="bi bi-envelope me-2"></i>{selectedStudent.studentEmail || 'Not added yet'}</p>
                                                            <p className="student-credential-row mb-0"><i className="bi bi-key me-2"></i>{selectedStudent.studentPassword || 'Not added yet'}</p>
                                                        </Col>
                                                    </Row>
                                                </div>
                                            </Col>

                                            <Col md={5}>
                                                <h6 className="student-panel-title fw-bold mb-4 d-flex align-items-center">
                                                    <span className="student-panel-icon student-panel-icon-sage"><i className="bi bi-house-heart-fill"></i></span>
                                                    Guardian Details
                                                </h6>
                                                <div className="student-info-panel rounded-4 p-4">
                                                    <div className="mb-3 border-bottom pb-3">
                                                        <p className="student-field-label mb-1">Primary guardian</p>
                                                        <p className="student-field-value mb-0">{selectedStudent.parentName || 'Not added yet'}</p>
                                                    </div>
                                                    <div className="mb-3 border-bottom pb-3">
                                                        <p className="student-field-label mb-1">Contact & email</p>
                                                        <p className="student-credential-row mb-1 d-flex align-items-center">
                                                            <i className="bi bi-telephone-fill me-2"></i>
                                                            {selectedStudent.parentPhone || 'Not added yet'}
                                                        </p>
                                                        <p className="student-credential-row mb-0 d-flex align-items-center">
                                                            <i className="bi bi-envelope-fill me-2"></i>
                                                            {selectedStudent.parentEmail || 'Not added yet'}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="student-field-label mb-1">Residential address</p>
                                                        <p className="student-field-value mb-0 lh-sm">{selectedStudent.parentAddress || 'Not added yet'}</p>
                                                    </div>
                                                </div>
                                            </Col>
                                        </Row>
                                    )}

                                    <div className="student-modal-actions mt-4 d-flex gap-3 pt-4">
                                        {!isEditingStudent ? (
                                            <>
                                                <Button variant="light" className="student-action student-action-delete" onClick={handleDeleteStudent}>
                                                    <i className="bi bi-trash3 me-2"></i>Delete Student
                                                </Button>
                                                <Button variant="light" className="student-action student-action-edit" onClick={() => {
                                                    setEditingStudentData(selectedStudent);
                                                    setStudentFormErrors({});
                                                    setIsEditingStudent(true);
                                                }}>
                                                    <i className="bi bi-pencil-square me-2"></i>Edit Profile
                                                </Button>
                                                <Button variant="light" className="student-action student-action-close" onClick={() => setShowStudentModal(false)}>
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
                    .student-detail-modal .modal-dialog {
                        max-width: 760px;
                        width: calc(100% - 32px);
                        margin: 12px auto;
                    }
                    .student-detail-modal .modal-content {
                        border-radius: 24px;
                        overflow: hidden;
                        border: 1px solid #E7E1D6;
                        background: #FFFFFF;
                        box-shadow: 0 24px 60px rgba(18, 32, 58, 0.18);
                        max-height: calc(100vh - 24px);
                    }
                    .student-detail-modal .modal-body {
                        max-height: calc(100vh - 24px);
                        overflow: hidden;
                        padding: 0;
                    }
                    .student-detail-modal .student-modal-close {
                        display: none;
                    }
                    .student-detail-modal .student-modal-close .btn-close {
                        filter: invert(1) grayscale(1) brightness(3);
                        opacity: 0.9;
                    }
                    .student-detail-modal .student-modal-hero {
                        min-height: 156px;
                        padding: 26px 32px 30px;
                        color: #FFFFFF;
                        background: radial-gradient(circle at 92% 0%, rgba(255, 107, 74, 0.35), transparent 35%), linear-gradient(155deg, #1B2A4A, #12203A);
                    }
                    .student-detail-modal .student-modal-name {
                        color: #FFFFFF;
                        font-family: Fraunces, Georgia, serif;
                        font-size: 32px;
                        font-weight: 600;
                        letter-spacing: 0;
                        line-height: 1.05;
                    }
                    .student-detail-modal .student-avatar-placeholder {
                        background: #EFE9DC;
                        color: #C9BBA0;
                        font-size: 3.2rem;
                    }
                    .student-detail-modal .student-avatar-placeholder i {
                        color: #C9BBA0;
                    }
                    .student-detail-modal .student-modal-hero img {
                        width: 84px !important;
                        height: 84px !important;
                        margin-top: -10px;
                        border-radius: 22px !important;
                        border-color: #EFE9DC !important;
                    }
                    .student-detail-modal .student-modal-hero .bi-camera-fill {
                        color: #FFFFFF;
                    }
                    .student-detail-modal .student-modal-hero > div:first-child > div:nth-child(2) {
                        width: 28px !important;
                        height: 28px !important;
                        bottom: 0 !important;
                        right: 0 !important;
                        background: #FF6B4A !important;
                        border: 3px solid #12203A !important;
                    }
                    .student-detail-modal .student-grade-badge {
                        color: #D8DFEC;
                        background: rgba(255, 255, 255, 0.14);
                    }
                    .student-detail-modal .student-active-badge {
                        color: #FFFFFF;
                        background: #FF6B4A !important;
                    }
                    .student-detail-modal .student-modal-hero p {
                        color: #C9CFDE;
                    }
                    .student-detail-modal .student-modal-hero p .bi {
                        color: #C9CFDE;
                    }
                    .student-detail-modal .student-info-grid {
                        margin: 0;
                    }
                    .student-detail-modal .student-detail-scroll > .p-4 {
                        padding: 24px 32px 18px !important;
                    }
                    .student-detail-modal .student-panel-title {
                        color: #1B2A4A;
                        font-family: Fraunces, Georgia, serif;
                        font-size: 17px;
                        font-weight: 600;
                    }
                    .student-detail-modal .student-panel-icon {
                        display: inline-flex;
                        width: 34px;
                        height: 34px;
                        align-items: center;
                        justify-content: center;
                        margin-right: 10px;
                        border-radius: 10px;
                    }
                    .student-detail-modal .student-panel-icon-coral {
                        background: rgba(255, 107, 74, 0.15);
                    }
                    .student-detail-modal .student-panel-icon-coral .bi,
                    .student-detail-modal .student-credential-row .bi {
                        color: #FF6B4A;
                    }
                    .student-detail-modal .student-panel-icon-sage {
                        background: rgba(94, 140, 106, 0.15);
                    }
                    .student-detail-modal .student-panel-icon-sage .bi {
                        color: #5E8C6A;
                    }
                    .student-detail-modal .student-info-panel {
                        min-height: 230px;
                        background: #FBF8F2;
                        border: 1px solid #E7E1D6;
                    }
                    .student-detail-modal .student-credentials-block {
                        margin-top: 4px;
                        padding-top: 18px;
                        border-top: 1px solid #E7E1D6;
                    }
                    .student-detail-modal .student-field-label {
                        color: #8A8A94;
                        font-family: Inter, sans-serif;
                        font-size: 11.5px;
                        font-weight: 600;
                    }
                    .student-detail-modal .student-field-value {
                        color: #22283A;
                        font-family: Inter, sans-serif;
                        font-size: 17px;
                        font-weight: 700;
                    }
                    .student-detail-modal .student-muted-value,
                    .student-detail-modal .student-credential-row:empty {
                        color: #9A9AA4;
                        font-size: 14px;
                        font-style: italic;
                        font-weight: 400;
                    }
                    .student-detail-modal .student-credential-row {
                        color: #22283A;
                        font-size: 13px;
                        overflow-wrap: anywhere;
                    }
                    .student-detail-modal .student-modal-actions {
                        border-top: 1px solid #E7E1D6;
                        margin-top: 20px !important;
                        padding-top: 16px !important;
                    }
                    .student-detail-modal .student-action {
                        flex: 1;
                        min-height: 44px;
                        border-radius: 12px;
                        font-size: 14.5px;
                        font-weight: 600;
                        transition: transform 0.2s ease, box-shadow 0.2s ease;
                    }
                    .student-detail-modal .student-action:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 8px 18px rgba(18, 32, 58, 0.12);
                    }
                    .student-detail-modal .student-action-delete {
                        color: #C4472B !important;
                        background: #FDEEEA !important;
                        border-color: #FDEEEA !important;
                    }
                    .student-detail-modal .student-action-edit {
                        color: #FFFFFF !important;
                        background: #1B2A4A !important;
                        border-color: #1B2A4A !important;
                    }
                    .student-detail-modal .student-action-close {
                        color: #8A8A94 !important;
                        background: #FFFFFF !important;
                        border-color: #E7E1D6 !important;
                    }
                    .student-detail-modal .student-action-delete:hover,
                    .student-detail-modal .student-action-delete:focus {
                        color: #C4472B !important;
                        background: #FDEEEA !important;
                        border-color: #FDEEEA !important;
                    }
                    .student-detail-modal .student-action-edit:hover,
                    .student-detail-modal .student-action-edit:focus {
                        color: #FFFFFF !important;
                        background: #1B2A4A !important;
                        border-color: #1B2A4A !important;
                    }
                    .student-detail-modal .student-action-close:hover,
                    .student-detail-modal .student-action-close:focus {
                        color: #8A8A94 !important;
                        background: #FFFFFF !important;
                        border-color: #E7E1D6 !important;
                    }
                    .student-detail-modal .student-action .bi {
                        color: currentColor;
                    }
                    .student-detail-scroll {
                        max-height: calc(100vh - 24px);
                        overflow-y: auto;
                    }
                    .modal.fade .modal-dialog {
                        transform: scale(0.95);
                        transition: transform 0.2s ease-out;
                    }
                    .modal.show .modal-dialog {
                        transform: scale(1);
                    }
                    @media (max-width: 575px) {
                        .student-detail-modal .modal-dialog {
                            width: calc(100% - 20px);
                            margin: 10px auto;
                        }
                        .student-detail-modal .student-modal-hero {
                            padding: 24px 24px 28px;
                        }
                        .student-detail-modal .student-info-panel {
                            min-height: 0;
                        }
                        .student-detail-modal .student-modal-name {
                            font-size: 27px;
                        }
                        .student-detail-modal .student-info-grid {
                            padding: 0 !important;
                        }
                        .student-detail-modal .student-detail-scroll > .p-4 {
                            padding: 20px 18px 16px !important;
                        }
                        .student-detail-modal .student-modal-actions {
                            flex-direction: column;
                        }
                    }
                `}
            </style>
        </Layout>
    );
};

export default ManageClasses;
