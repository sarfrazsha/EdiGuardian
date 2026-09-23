
import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { Container, Form, Button, Row, Col, Card, Modal, Badge, Table, Alert, Spinner, Breadcrumb } from 'react-bootstrap';
import { useLocation, Navigate, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Axios from 'axios';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ManageStudents = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { email, role, classFilter, openAdd } = location.state || {
        email: localStorage.getItem('userEmail'),
        role: localStorage.getItem('userRole')
    };

    const formRef = useRef(null);
    const listRef = useRef(null);
    const studentImageRef = useRef(null);
    const parentImageRef = useRef(null);

    useLayoutEffect(() => {
        if (openAdd && formRef.current) {
            formRef.current.scrollIntoView({ behavior: 'smooth' });
        } else if (classFilter && listRef.current) {
            listRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [openAdd, classFilter]);

    
    if (!email || (role !== 'Admin' && role !== 'admin')) {
        return <Navigate to="/" replace />;
    }

    const [validated, setValidated] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [rollNoError, setRollNoError] = useState('');
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    
    const [students, setStudents] = useState([]);
    const [classes, setClasses] = useState([]);


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

    
    const [previews, setPreviews] = useState({
        student: null,
        parent: null
    });


    
    const fetchStudents = async () => {
        setLoading(true);
        try {
            const response = await Axios.get('/api/students-detailed');
           
            setStudents(response.data);
        } catch (err) {
            console.error("Fetch error:", err);
            setStudents([]);
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
        fetchStudents();
        fetchClasses();
    }, []);


    // Validate roll number against selected class
    const validateRollNo = (rollNo, studentClass) => {
        if (!rollNo || !studentClass) { setRollNoError(''); return true; }
        // Expected format: [digits]-[classNum][section] e.g. 01-5A
        const match = rollNo.match(/^(\d+)-(\d+)([A-Za-z])$/);
        if (!match) {
            setRollNoError('Format must be [RollNo]-[Class][Section] e.g. 01-5A');
            return false;
        }
        const rollClass = match[2];
        const rollSection = match[3].toUpperCase();
        // studentClass format: "5 - A"
        const classParts = studentClass.split(' - ');
        if (classParts.length === 2) {
            const expectedClass = classParts[0].trim();
            const expectedSection = classParts[1].trim().toUpperCase();
            if (rollClass !== expectedClass || rollSection !== expectedSection) {
                setRollNoError(`Roll suffix must match class ${expectedClass}${expectedSection} (e.g. 01-${expectedClass}${expectedSection})`);
                return false;
            }
        }
        setRollNoError('');
        return true;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        let updated = { ...formData, [name]: value };
        
        // Auto-update roll number suffix if class changes
        if (name === 'studentClass' && value) {
            const classParts = value.split(' - ');
            if (classParts.length === 2) {
                const prefix = formData.studentRollNo.split('-')[0] || '';
                const suffix = `-${classParts[0]}${classParts[1]}`;
                updated.studentRollNo = prefix + suffix;
            }
        }
        
        setFormData(updated);
        
        if (name === 'studentRollNo' || name === 'studentClass') {
            validateRollNo(
                name === 'studentRollNo' ? value : updated.studentRollNo,
                name === 'studentClass' ? value : updated.studentClass
            );
        }
    };

 
    const handleSubmit = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;

    if (form.checkValidity() === false) {
        event.stopPropagation();
        setValidated(true);
        return;
    }

    // Cross-validate roll number against class
    if (!validateRollNo(formData.studentRollNo, formData.studentClass)) {
        setValidated(true);
        return;
    }

    // Password length check
    if (formData.studentPassword.length < 8) {
        setError('Student password must be at least 8 characters.');
        return;
    }
    if (formData.parentPassword.length < 8) {
        setError('Parent password must be at least 8 characters.');
        return;
    }

    setLoading(true);
    setError(null);

    console.log("Submitting Admission Data...");
    console.log("Form State:", formData);

    try {
       
        const data = new FormData();
        data.append("studentName", formData.studentName);
        data.append("studentAge", formData.studentAge);
        data.append("studentRollNo", formData.studentRollNo);
        data.append("studentGender", formData.studentGender);
        data.append("studentClass", formData.studentClass);
        data.append("studentEmail", formData.studentEmail);
        data.append("studentPassword", formData.studentPassword);
        
        
        if (formData.studentProfilePicture) {
            console.log("Attaching Student Picture:", formData.studentProfilePicture.name);
            data.append("studentProfilePicture", formData.studentProfilePicture);
        } else {
            console.warn("No Student Picture selected.");
        }

        data.append("parentName", formData.parentName);
        data.append("parentPhone", formData.parentPhone);
        data.append("parentEmail", formData.parentEmail);
        data.append("parentPassword", formData.parentPassword);
        data.append("parentAddress", formData.parentAddress);
        
        if (formData.parentProfilePicture) {
            console.log("Attaching Parent Picture:", formData.parentProfilePicture.name);
            data.append("parentProfilePicture", formData.parentProfilePicture);
        } else {
            console.warn("No Parent Picture selected.");
        }

        
        const response = await Axios.post('/students', data);
        console.log("Upload Success:", response.data);

        
        await fetchStudents();

        setShowSuccessModal(true);
        setFormData({
            studentName: '', studentAge: '', studentRollNo: '', studentGender: '', studentClass: '',
            studentEmail: '', studentPassword: '', studentProfilePicture: '',
            parentName: '', parentPhone: '', parentEmail: '', parentPassword: '',
            parentAddress: '', parentProfilePicture: ''
        });
        setPreviews({ student: null, parent: null });
        setValidated(false);
        setLoading(false);

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
                          
                        </div>
                        <div>
                            <h2 className="fw-bold text-dark mb-0">Student Admission Portal</h2>
                            <Breadcrumb className="small mb-0">
                               
                                {classFilter && <Breadcrumb.Item active>Class: {classFilter}</Breadcrumb.Item>}
                            </Breadcrumb>
                        </div>
                    </div>
                    <div className="d-flex gap-2 align-items-center">
                        <Badge bg="primary" className="p-2 px-3 rounded-pill shadow-sm">
                            Total Students: {students.length}
                        </Badge>
                    </div>
                </div>

                <Row className="g-4">
                    <Col lg={12} ref={formRef}>
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
                                                        <Form.Label className="small fw-bold">Class</Form.Label>
                                                        <Form.Select required name="studentClass" value={formData.studentClass} onChange={handleChange}>
                                                            <option value="">Select Class...</option>
                                                            {classes.map(c => (
                                                                <option key={c.id} value={`${c.name} - ${c.section}`}>
                                                                    {c.name} - {c.section}
                                                                </option>
                                                            ))}
                                                        </Form.Select>
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
                                                        <Form.Control required type="number" name="studentAge" min="3" max="22" title="Age must be between 3 and 22" value={formData.studentAge} onChange={handleChange} placeholder="e.g. 15" />
                                                    </Form.Group>
                                                </Col>
                                                <Col md={6}>
                                                    <Form.Group className="mb-3">
                                                        <Form.Label className="small fw-bold">Roll Number (Unique ID)</Form.Label>
                                                        <Form.Control 
                                                            required 
                                                            name="studentRollNo" 
                                                            placeholder="e.g. 01-5A"
                                                            value={formData.studentRollNo} 
                                                            onChange={(e) => {
                                                                const value = e.target.value;
                                                                const classParts = formData.studentClass.split(' - ');
                                                                const suffix = classParts.length === 2 ? `-${classParts[0]}${classParts[1]}` : '';
                                                                
                                                                if (!suffix) {
                                                                    setFormData({...formData, studentRollNo: value});
                                                                    return;
                                                                }

                                                                // Prevent user from removing the hyphen or modifying the suffix
                                                                const prefix = value.split('-')[0];
                                                                setFormData({...formData, studentRollNo: prefix + suffix});
                                                            }}
                                                            onKeyDown={(e) => {
                                                                const classParts = formData.studentClass.split(' - ');
                                                                const suffix = classParts.length === 2 ? `-${classParts[0]}${classParts[1]}` : '';
                                                                if (!suffix) return;

                                                                const selectionStart = e.target.selectionStart;
                                                                const prefixLength = formData.studentRollNo.length - suffix.length;

                                                                // Prevent backspacing/deleting the suffix part
                                                                if ((e.key === 'Backspace' || e.key === 'Delete') && selectionStart > prefixLength) {
                                                                    e.preventDefault();
                                                                }
                                                                // Prevent typing inside or after the suffix
                                                                if (selectionStart > prefixLength && e.key.length === 1) {
                                                                    e.preventDefault();
                                                                }
                                                            }}
                                                            onSelect={(e) => {
                                                                // Keep cursor before the suffix if they click into it
                                                                const classParts = formData.studentClass.split(' - ');
                                                                const suffix = classParts.length === 2 ? `-${classParts[0]}${classParts[1]}` : '';
                                                                if (!suffix) return;
                                                                
                                                                const prefixLength = formData.studentRollNo.length - suffix.length;
                                                                if (e.target.selectionStart > prefixLength) {
                                                                    e.target.setSelectionRange(prefixLength, prefixLength);
                                                                }
                                                            }}
                                                            isInvalid={!!rollNoError}
                                                        />
                                                        {rollNoError && <Form.Control.Feedback type="invalid">{rollNoError}</Form.Control.Feedback>}
                                                        <Form.Text className="text-muted" style={{ fontSize: '10px' }}>
                                                            Suffix is static based on selected class.
                                                        </Form.Text>
                                                    </Form.Group>
                                                </Col>
                                            </Row>
                                            <Form.Group className="mb-3">
                                                <Form.Label className="small fw-bold">Login Email</Form.Label>
                                                <Form.Control required type="email" name="studentEmail" pattern="^.*@gmail\.com$" title="Email must end with @gmail.com" value={formData.studentEmail} onChange={handleChange} />
                                            </Form.Group>
                                            <Form.Group className="mb-3">
                                                <Form.Label className="small fw-bold">Account Password</Form.Label>
                                                <Form.Control required type="password" name="studentPassword" minLength="8" value={formData.studentPassword} onChange={handleChange} />
                                                <Form.Text className="text-muted" style={{ fontSize: '10px' }}>Minimum 8 characters</Form.Text>
                                            </Form.Group>
                                            <Form.Group className="mb-3">
                                                <Form.Label className="small fw-bold">Student Profile Picture</Form.Label>
                                                <Form.Control
                                                    type="file"
                                                    ref={studentImageRef}
                                                    accept="image/*"
                                                    onChange={e => {
                                                        const file = e.target.files[0];
                                                        if (file) {
                                                            if (file.size > MAX_FILE_SIZE) {
                                                                alert('System supports only up to 10 MB for uploads.');
                                                                e.target.value = '';
                                                                return;
                                                            }
                                                            setFormData(prev => ({ ...prev, studentProfilePicture: file }));
                                                            setPreviews(prev => ({ ...prev, student: URL.createObjectURL(file) }));
                                                        }
                                                    }}
                                                />
                                                {previews.student && (
                                                    <div className="mt-2 text-center p-2 border rounded bg-light">
                                                        <img src={previews.student} alt="Preview" style={{ height: '80px', borderRadius: '8px' }} />
                                                        <div className="small text-muted mt-1">Student Preview</div>
                                                    </div>
                                                )}
                                            </Form.Group>
                                        </Col>

                                        
                                        <Col md={6} className="ps-md-4">
                                            <h6 className="text-success fw-bold mb-3 text-uppercase small">Linked Parent/Guardian Account</h6>
                                            <Form.Group className="mb-3">
                                                <Form.Label className="small fw-bold">Guardian Name</Form.Label>
                                                <Form.Control required name="parentName" value={formData.parentName} onChange={handleChange} />
                                            </Form.Group>
                                            <Form.Group className="mb-3">
                                                <Form.Label className="small fw-bold">Guardian Contact</Form.Label>
                                                <Form.Control required name="parentPhone" pattern="[0-9]{11}" title="Phone number must be exactly 11 digits" value={formData.parentPhone} onChange={handleChange} />
                                            </Form.Group>
                                            <Form.Group className="mb-3">
                                                <Form.Label className="small fw-bold">Guardian Email </Form.Label>
                                                <Form.Control required type="email" name="parentEmail" pattern="^.*@gmail\.com$" title="Email must end with @gmail.com" value={formData.parentEmail} onChange={handleChange} />
                                            </Form.Group>
                                            <Form.Group className="mb-3">
                                                <Form.Label className="small fw-bold">Guardian Password</Form.Label>
                                                <Form.Control required type="password" name="parentPassword" minLength="8" value={formData.parentPassword} onChange={handleChange} />
                                                <Form.Text className="text-muted" style={{ fontSize: '10px' }}>Minimum 8 characters</Form.Text>
                                            </Form.Group>
                                            <Form.Group className="mb-3">
                                                <Form.Label className="small fw-bold">Residential Address</Form.Label>
                                                <Form.Control required as="textarea" rows={1} name="parentAddress" value={formData.parentAddress} onChange={handleChange} />
                                            </Form.Group>
                                            <Form.Group className="mb-3">
                                                <Form.Label className="small fw-bold">Guardian Profile Picture</Form.Label>
                                                <Form.Control
                                                    type="file"
                                                    ref={parentImageRef}
                                                    accept="image/*"
                                                    onChange={e => {
                                                        const file = e.target.files[0];
                                                        if (file) {
                                                            if (file.size > MAX_FILE_SIZE) {
                                                                alert('System supports only up to 10 MB for uploads.');
                                                                e.target.value = '';
                                                                return;
                                                            }
                                                            setFormData(prev => ({ ...prev, parentProfilePicture: file }));
                                                            setPreviews(prev => ({ ...prev, parent: URL.createObjectURL(file) }));
                                                        }
                                                    }}
                                                />
                                                {previews.parent && (
                                                    <div className="mt-2 text-center p-2 border rounded bg-light">
                                                        <img src={previews.parent} alt="Preview" style={{ height: '80px', borderRadius: '8px' }} />
                                                        <div className="small text-muted mt-1">Guardian Preview</div>
                                                    </div>
                                                )}
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
                </Row>
            </Container>

            <Modal show={showSuccessModal} onHide={() => setShowSuccessModal(false)} centered>
                <Modal.Body className="text-center p-5 rounded-4">
                    <div className="mb-4">
                        <i className="bi bi-person-check-fill text-success" style={{ fontSize: '4rem' }}></i>
                    </div>
                    <h3 className="fw-bold">Successful!</h3>
                    <p className="text-muted">Student And Parent Records Are Added.</p>
                    <Button variant="success" onClick={() => setShowSuccessModal(false)} className="rounded-pill px-5">Done</Button>
                </Modal.Body>
            </Modal>
        </Layout>
    );
};

export default ManageStudents;    
