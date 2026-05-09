import React, { useState, useEffect } from 'react';
import { Container, Table, Button, Modal, Form, Card, Badge, Row, Col } from 'react-bootstrap';
import { useNavigate, useLocation } from 'react-router-dom';
import Layout from '../components/Layout';
import Axios from 'axios';

const ManageClasses = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const classFilter = location.state?.classFilter;
   
    const [classes, setClasses] = useState([]);
    const [unassignedTeachers, setUnassignedTeachers] = useState([]);


    const initialStudents = [
        {
            id: '1',
            studentName: 'Abdul Basit',
            studentAge: '14',
            studentRollNo: '2024-001',
            studentGender: 'Male',
            studentClass: 'Class 1',
            studentEmail: 'abdul@gmail.com',
            studentPassword: 'password123',
            studentProfilePicture: '',
            parentName: 'Khalid Mehmood',
            parentPhone: '03245627336',
            parentEmail: 'khalid@gmail.com',
            parentAddress: 'House 14, Street 3, Mohalla Qadirabad, Multan'
        },
        {
            id: '2',
            studentName: 'M Muntaha',
            studentAge: '13',
            studentRollNo: '2024-002',
            studentGender: 'Male',
            studentClass: 'Class 1',
            studentEmail: 'muntaha@gmail.com',
            studentProfilePicture: '',
            parentName: 'Tariq Hussain',
            parentPhone: '03017894523',
            parentEmail: 'tariq@gmail.com',
            parentAddress: 'Gali Masjid Wali, Bahawalpur'
        },
        {
            id: '3',
            studentName: 'M Sharafat',
            studentAge: '15',
            studentRollNo: '2024-003',
            studentGender: 'Male',
            studentClass: 'Class 2',
            studentEmail: 'sharafat@gmail.com',
            studentProfilePicture: '',
            parentName: 'Nawaz Ahmed',
            parentPhone: '03129876543',
            parentEmail: 'nawaz@gmail.com',
            parentAddress: 'Mohalla Ahmedpur, Near Jamia Masjid, Rahim Yar Khan'
        },
        {
            id: '4',
            studentName: 'M Qasim',
            studentAge: '12',
            studentRollNo: '2024-004',
            studentGender: 'Male',
            studentClass: 'Class 2',
            studentEmail: 'qasim@gmail.com',
            studentProfilePicture: '',
            parentName: 'Aslam Shah',
            parentPhone: '03001234567',
            parentEmail: 'aslam@gmail.com',
            parentAddress: 'House 22, Gulshan Colony, Lahore'
        },
        {
            id: '5',
            studentName: 'Hamza Ali',
            studentAge: '11',
            studentRollNo: '2024-005',
            studentGender: 'Male',
            studentClass: 'Class 3',
            studentEmail: 'hamza@gmail.com',
            studentProfilePicture: '',
            parentName: 'Imran Ali',
            parentPhone: '03451237890',
            parentEmail: 'imran@gmail.com',
            parentAddress: 'House 5, Mohalla Farooqabad, Faisalabad'
        },
        {
            id: '6',
            studentName: 'Bilal Ahmed',
            studentAge: '10',
            studentRollNo: '2024-006',
            studentGender: 'Male',
            studentClass: 'Class 4',
            studentEmail: 'bilal@gmail.com',
            studentProfilePicture: '',
            parentName: 'Rashid Ahmed',
            parentPhone: '03331234567',
            parentEmail: 'rashid@gmail.com',
            parentAddress: 'House 9, Street 7, Satellite Town, Rawalpindi'
        },
        {
            id: '7',
            studentName: 'Usman Ghani',
            studentAge: '12',
            studentRollNo: '2024-007',
            studentGender: 'Male',
            studentClass: 'Class 5',
            studentEmail: 'usman@gmail.com',
            studentProfilePicture: '',
            parentName: 'Ghani Sahab',
            parentPhone: '03009871234',
            parentEmail: 'ghani@gmail.com',
            parentAddress: 'Mohalla Islamabad, Near Government School, Sahiwal'
        }
    ];

    const [allStudents, setAllStudents] = useState([...initialStudents]);

    const fetchAllStudents = async () => {
        try {
            const response = await Axios.get('http://localhost:8080/api/students-detailed');
            setAllStudents([...initialStudents, ...response.data]);
        } catch (err) {
            console.error("Fetch error in classes:", err);
            setAllStudents(initialStudents);
        }
    };

    const fetchClasses = async () => {
        try {
            const response = await Axios.get('http://localhost:8080/api/classes');
            setClasses(response.data);
        } catch (err) {
            console.error("Error fetching classes:", err);
        }
    };

    const fetchUnassignedTeachers = async () => {
        try {
            const response = await Axios.get('http://localhost:8080/api/teachers/unassigned');
            setUnassignedTeachers(response.data);
        } catch (err) {
            console.error("Error fetching unassigned teachers:", err);
        }
    };

    useEffect(() => {
        fetchAllStudents();
        fetchClasses();
        window.addEventListener('focus', () => {
            fetchAllStudents();
            fetchClasses();
        });
        return () => window.removeEventListener('focus', () => {
            fetchAllStudents();
            fetchClasses();
        });
    }, []);


    
    useEffect(() => {
        if (classFilter) {
            const matched = classes.find(c => c.name === classFilter);
            if (matched) setSelectedClass(matched);
        }
    }, [classFilter]);

   
    const [show, setShow] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentClass, setCurrentClass] = useState({ id: null, name: '', section: '', teacher: '', teacherEmail: '' });

  
    const [selectedClass, setSelectedClass] = useState(null); 

    
    const [showStudentModal, setShowStudentModal] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [isEditingStudent, setIsEditingStudent] = useState(false);
    const [editingStudentData, setEditingStudentData] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const handleSaveStudent = () => {
        setAllStudents(allStudents.map(s => s.id === editingStudentData.id ? editingStudentData : s));
        setSelectedStudent(editingStudentData);
        setIsEditingStudent(false);
    };


    const handleShowAdd = () => {
        setIsEditing(false);
        setCurrentClass({ id: null, name: '', section: '', teacher: '', teacherEmail: '' });
        fetchUnassignedTeachers();
        setShow(true);
    };


    const handleShowEdit = (cls) => {
        setIsEditing(true);
        setCurrentClass(cls);
        fetchUnassignedTeachers();
        setShow(true);
    };


    const handleClose = () => setShow(false);

    const handleSave = async () => {
        try {
            if (isEditing) {
                await Axios.put(`http://localhost:8080/api/classes/${currentClass.id}`, currentClass);
            } else {
                await Axios.post('http://localhost:8080/api/classes', currentClass);
            }
            fetchClasses();
            handleClose();
        } catch (err) {
            console.error("Error saving class:", err);
            alert("Failed to save class. Please ensure all fields are filled.");
        }
    };


    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this class?")) {
            try {
                await Axios.delete(`http://localhost:8080/api/classes/${id}`);
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
       
        const enrolledStudents = allStudents.filter(s => {
            const matchesClass = s.studentClass === `${selectedClass.name} - ${selectedClass.section}` || s.studentClass === selectedClass.name;
            const matchesSearch = !searchTerm || 
                s.studentName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                (s.studentRollNo && s.studentRollNo.toString().toLowerCase().includes(searchTerm.toLowerCase()));
            return matchesClass && matchesSearch;
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
                                Teacher in Charge: <strong className="text-dark">{selectedClass.teacher}</strong> ({selectedClass.teacherEmail})
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
                                    {[1, 2, 3, 4, 5].map(n => (
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
                            <Form.Group className="mb-4">
                                <Form.Label className="small fw-bold text-secondary text-uppercase ls-1">Assign Teacher</Form.Label>
                                <Form.Select
                                    className="p-3 bg-light border-0 rounded-3 shadow-none"
                                    value={currentClass.teacherEmail}
                                    onChange={(e) => {
                                        const email = e.target.value;
                                        const teacher = [...unassignedTeachers, { teacherName: currentClass.teacher, teacherEmail: currentClass.teacherEmail }].find(t => t.teacherEmail === email);
                                        if (teacher) {
                                            setCurrentClass({ 
                                                ...currentClass, 
                                                teacher: teacher.teacherName, 
                                                teacherEmail: teacher.teacherEmail 
                                            });
                                        } else {
                                            setCurrentClass({ ...currentClass, teacher: '', teacherEmail: '' });
                                        }
                                    }}
                                >
                                    <option value="">Select Teacher...</option>
                                    {isEditing && currentClass.teacher && (
                                        <option value={currentClass.teacherEmail}>{currentClass.teacher} (Current)</option>
                                    )}
                                    {unassignedTeachers.map(t => (
                                        <option key={t.teacherEmail} value={t.teacherEmail}>
                                            {t.teacherName} ({t.teacherEmail})
                                        </option>
                                    ))}
                                </Form.Select>
                                {unassignedTeachers.length === 0 && !isEditing && (
                                    <Form.Text className="text-danger mt-2 d-block">
                                        No unassigned teachers available.
                                    </Form.Text>
                                )}
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
                    <Modal show={showStudentModal} onHide={() => setShowStudentModal(false)} size="lg" centered>
                        <Modal.Header closeButton className="border-0 pb-0 bg-light rounded-top-4">
                        </Modal.Header>
                        <Modal.Body className="p-0 bg-light rounded-bottom-4">

                            <div className="bg-primary bg-gradient p-5 position-relative text-center text-md-start d-flex flex-column flex-md-row align-items-center gap-4">
                                {selectedStudent.studentProfilePicture ? (
                                    <img
                                        src={selectedStudent.studentProfilePicture}
                                        alt="Profile"
                                        className="rounded-circle border border-4 border-white shadow-lg"
                                        style={{ width: '120px', height: '120px', objectFit: 'cover', marginTop: '-10px' }}
                                    />
                                ) : (
                                    <div className="bg-white text-primary rounded-circle border border-4 border-white shadow-lg d-flex justify-content-center align-items-center fw-bold" style={{ width: '120px', height: '120px', fontSize: '3rem', marginTop: '-10px' }}>
                                        {selectedStudent.studentName.charAt(0)}
                                    </div>
                                )}
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
                                            <Col md={6}>
                                                <Form.Group>
                                                    <Form.Label className="small fw-bold text-secondary text-uppercase ls-1">Password</Form.Label>
                                                    <Form.Control type="text" className="p-2 bg-light border-0 rounded-3" value={editingStudentData.studentPassword || ''} onChange={(e) => setEditingStudentData({ ...editingStudentData, studentPassword: e.target.value })} />
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
                                                    <Col xs={12}>
                                                        <p className="text-muted small mb-1 text-uppercase ls-1 fw-semibold">Student Credentials</p>
                                                        <p className="mb-1 text-dark fw-medium small"><i className="bi bi-envelope me-2"></i>{selectedStudent.studentEmail}</p>
                                                        <p className="mb-0 text-dark fw-medium small"><i className="bi bi-key me-2"></i>{selectedStudent.studentPassword || '********'}</p>
                                                    </Col>
                                                </Row>
                                            </div>
                                        </Col>

                                        
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