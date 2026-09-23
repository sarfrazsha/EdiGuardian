import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Table, Badge, Spinner, Alert, InputGroup, Modal } from 'react-bootstrap';
import { Navigate, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Axios from 'axios';

const ManageResults = () => {
    const navigate = useNavigate();
    const role = localStorage.getItem('userRole');
    const email = localStorage.getItem('userEmail');

    
    if (!email || (role?.toLowerCase() !== 'teacher' && role?.toLowerCase() !== 'admin')) {
        return <Navigate to="/" replace />;
    }

    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [expiryDate, setExpiryDate] = useState('');

    const [selectedClass, setSelectedClass] = useState('');
    const [examType, setExamType] = useState('Mid-Term');
    
    const [grades, setGrades] = useState({});
    const [publishedResults, setPublishedResults] = useState([]);
    const [teacherAssignedSubjects, setTeacherAssignedSubjects] = useState([]);

    // Teacher subject identification
    const teacherSubjectStored = localStorage.getItem('teacherSubject') || '';
    const rawTeacherSubjects = localStorage.getItem('teacherSubjects');
    const teacherSubjectsList = React.useMemo(() => {
        try {
            const parsed = JSON.parse(rawTeacherSubjects);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch {}
        return teacherSubjectStored ? [teacherSubjectStored] : [];
    }, [rawTeacherSubjects, teacherSubjectStored]);

    // Active subject for teacher
    const activeTeacherSubject = teacherSubjectStored || teacherSubjectsList[0] || teacherAssignedSubjects[0] || '';

    // Dynamic subjects state
    const defaultSubjects = [
        { id: 'math', name: 'Math', totalMarks: 100 },
        { id: 'science', name: 'Science', totalMarks: 100 },
        { id: 'english', name: 'English', totalMarks: 100 }
    ];
    const [subjects, setSubjects] = useState(defaultSubjects);
    const [showAddSubject, setShowAddSubject] = useState(false);
    const [newSubjectName, setNewSubjectName] = useState('');
    const [newSubjectTotal, setNewSubjectTotal] = useState(100);
    const [editingSubjectId, setEditingSubjectId] = useState(null);
    const [editingTotal, setEditingTotal] = useState('');

    // Check if a subject is editable by the current user
    const isSubjectEditable = (sub) => {
        if (role?.toLowerCase() === 'admin') return true;
        if (role?.toLowerCase() !== 'teacher') return false;
        const subNameClean = (sub?.name || '').toLowerCase().trim();
        const authorized = [
            teacherSubjectStored,
            ...teacherSubjectsList,
            ...teacherAssignedSubjects
        ].filter(Boolean).map(s => s.toLowerCase().trim());

        return authorized.includes(subNameClean) || authorized.includes('all subjects');
    };

    const fetchStudents = async () => {
        try {
            setLoading(true);
            // Every enrolled student must be gradeable, whether or not their
            // parent record happens to be linked - /api/parents intentionally
            // excludes students without a linked parent, which is wrong for a
            // class roster.
            const res = await Axios.get('/api/students-detailed');
            const mappedStudents = res.data.map(s => ({
                id: s.id,
                name: s.studentName,
                classNo: s.studentClass
            }));

            setStudents(mappedStudents);
            setLoading(false);
        } catch (err) {
            console.error("Failed to fetch students", err);
            setLoading(false);
        }
    };

    // Fetch teacher's assignments if teacher
    useEffect(() => {
        if (role?.toLowerCase() === 'teacher' && email) {
            Axios.get(`/api/teacher/assignments/${encodeURIComponent(email)}`)
                .then(res => {
                    if (Array.isArray(res.data)) {
                        const subs = res.data.map(a => a.subject).filter(Boolean);
                        setTeacherAssignedSubjects([...new Set(subs)]);
                    }
                })
                .catch(err => console.error("Error fetching teacher assignments:", err));
        }
    }, [role, email]);

    useEffect(() => {
        fetchStudents();
        // Multi-class support for teachers
        const rawTeacherClasses = localStorage.getItem('teacherClasses');
        const teacherClassesArr = (() => {
            try { return JSON.parse(rawTeacherClasses) || []; } catch { return []; }
        })();
        const teacherClassSingle = localStorage.getItem('teacherClass');
        const firstClass = teacherClassesArr.length > 0 ? teacherClassesArr[0] : teacherClassSingle;
        if (role?.toLowerCase() === 'teacher' && firstClass) {
            setSelectedClass(firstClass);
        }
    }, []);

    // Ensure teacher's subject is in subjects list
    useEffect(() => {
        if (role?.toLowerCase() === 'teacher') {
            const allMySubs = [
                teacherSubjectStored,
                ...teacherSubjectsList,
                ...teacherAssignedSubjects
            ].filter(Boolean);

            if (allMySubs.length > 0) {
                setSubjects(prev => {
                    const updated = [...prev];
                    allMySubs.forEach(mySub => {
                        const id = mySub.toLowerCase().replace(/\s+/g, '_');
                        if (!updated.some(s => s.name.toLowerCase() === mySub.toLowerCase() || s.id === id)) {
                            updated.push({ id, name: mySub, totalMarks: 100 });
                        }
                    });
                    return updated;
                });
            }
        }
    }, [teacherSubjectStored, teacherSubjectsList, teacherAssignedSubjects, role]);

    // Load grades AND subjects when class/exam changes
    useEffect(() => {
        if (selectedClass && examType) {
            const allResults = JSON.parse(localStorage.getItem('school_academic_results') || '{}');
            const key = `${selectedClass}_${examType}`;
            const savedData = allResults[key] || {};
            setGrades(savedData.grades || {});
            if (savedData.subjects && savedData.subjects.length > 0) {
                setSubjects(savedData.subjects);
            }
        } else {
            setGrades({});
        }
        
        if (selectedClass) {
            fetchPublishedResults(selectedClass);
        }
    }, [selectedClass, examType]);

    const fetchPublishedResults = async (cls) => {
        try {
            const res = await Axios.get(`/api/results/class/${cls}`);
            setPublishedResults(res.data);

            // Populate existing subjects & grades from database for this exam
            if (Array.isArray(res.data) && res.data.length > 0) {
                const currentExamRecords = res.data.filter(r => r.examType === examType);
                if (currentExamRecords.length > 0) {
                    // Populate existing subjects
                    const existingSubsMap = new Map();
                    currentExamRecords.forEach(r => {
                        (r.subjects || []).forEach(s => {
                            const id = (s.subjectId || s.name || '').toLowerCase().replace(/\s+/g, '_');
                            if (!existingSubsMap.has(id)) {
                                existingSubsMap.set(id, {
                                    id,
                                    name: s.name,
                                    totalMarks: s.totalMarks || 100
                                });
                            }
                        });
                    });

                    if (existingSubsMap.size > 0) {
                        setSubjects(prev => {
                            const merged = [...prev];
                            existingSubsMap.forEach((subObj, id) => {
                                if (!merged.some(s => s.id === id || s.name.toLowerCase() === subObj.name.toLowerCase())) {
                                    merged.push(subObj);
                                }
                            });
                            return merged;
                        });
                    }

                    // Populate grades from database for students
                    setGrades(prev => {
                        const next = { ...prev };
                        currentExamRecords.forEach(r => {
                            if (!next[r.studentId]) next[r.studentId] = {};
                            (r.subjects || []).forEach(s => {
                                const id = (s.subjectId || s.name || '').toLowerCase().replace(/\s+/g, '_');
                                if (next[r.studentId][id] === undefined || next[r.studentId][id] === '') {
                                    next[r.studentId][id] = s.score;
                                }
                            });
                        });
                        return next;
                    });
                }
            }
        } catch (err) {
            console.error("Error fetching published results:", err);
        }
    };

    // Multi-class support
    const rawTeacherClasses = localStorage.getItem('teacherClasses');
    const teacherClassesArr = (() => {
        try { return JSON.parse(rawTeacherClasses) || []; } catch { return []; }
    })();
    const teacherClassSingle = localStorage.getItem('teacherClass');
    const allTeacherClasses = teacherClassesArr.length > 0
        ? [...new Set(teacherClassesArr)]
        : (teacherClassSingle ? [teacherClassSingle] : []);

    const classesList = role?.toLowerCase() === 'teacher' && allTeacherClasses.length > 0
        ? allTeacherClasses
        : [...new Set(students.map(s => s.classNo).filter(Boolean))].sort();

    const filteredStudents = selectedClass 
        ? students.filter(s => s.classNo === selectedClass)
        : [];

    const handleGradeChange = (studentId, subjectId, value) => {
        const sub = subjects.find(s => s.id === subjectId);
        if (!isSubjectEditable(sub)) {
            return; // Lock guard
        }
        const numVal = parseInt(value) || 0;
        const capped = Math.min(Math.max(numVal, 0), sub?.totalMarks || 100);
        setGrades(prev => ({
            ...prev,
            [studentId]: {
                ...(prev[studentId] || {}),
                [subjectId]: value === '' ? '' : capped
            }
        }));
    };

    const handleSaveResults = async () => {
        if (!selectedClass || !examType || !expiryDate) {
            alert("Please select a class, exam type, and expiry date.");
            return;
        }
        
        // Only students who actually have a mark entered for an editable
        // subject this session - not the whole roster. Without this, every
        // student the teacher hadn't graded yet would still be submitted
        // with a defaulted score of 0 (see below), silently failing them
        // and emailing their parent a false "0" result.
        const touchedStudents = filteredStudents.filter(student => {
            const studentGrades = grades[student.id] || {};
            return subjects.some(sub =>
                isSubjectEditable(sub) &&
                studentGrades[sub.id] !== undefined &&
                studentGrades[sub.id] !== ''
            );
        });

        if (touchedStudents.length === 0) {
            alert("Enter at least one mark before publishing.");
            return;
        }

        setSaving(true);
        setErrorMsg('');

        const formattedResults = touchedStudents.map(student => {
            const studentGrades = grades[student.id] || {};
            const studentSubjects = subjects.map(sub => ({
                subjectId: sub.id,
                name: sub.name,
                score: parseInt(studentGrades[sub.id]) || 0,
                totalMarks: sub.totalMarks
            }));
            
            const total = calculateTotal(student.id);
            const percentage = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
            
            let grade = 'F';
            if (percentage >= 80) grade = 'A+';
            else if (percentage >= 70) grade = 'A';
            else if (percentage >= 60) grade = 'B';
            else if (percentage >= 50) grade = 'C';

            return {
                studentId: student.id,
                studentName: student.name,
                subjects: studentSubjects,
                grandTotal: total,
                maxTotal: maxTotal,
                grade: grade
            };
        });

        try {
            await Axios.post('/api/results', {
                results: formattedResults,
                examType,
                classNo: selectedClass,
                expiryDate,
                markedBy: email,
                subject: role?.toLowerCase() === 'teacher' ? activeTeacherSubject : undefined
            });

            // Update local storage backup
            try {
                const allResults = JSON.parse(localStorage.getItem('school_academic_results') || '{}');
                allResults[`${selectedClass}_${examType}`] = { grades, subjects };
                localStorage.setItem('school_academic_results', JSON.stringify(allResults));
            } catch {}

            setSuccessMsg(role?.toLowerCase() === 'teacher' 
                ? `Marks for ${activeTeacherSubject} in ${selectedClass} (${examType}) published and merged successfully!`
                : `Results for ${selectedClass} (${examType}) successfully published!`
            );
            setTimeout(() => setSuccessMsg(''), 4000);
            fetchPublishedResults(selectedClass);
        } catch (err) {
            console.error("Error saving results:", err);
            setErrorMsg(err.response?.data?.message || "Failed to publish results. Please try again.");
            setTimeout(() => setErrorMsg(''), 5000);
        } finally {
            setSaving(false);
        }
    };

    // Subject management (Admin only)
    const handleAddSubject = () => {
        if (!newSubjectName.trim()) return;
        const id = newSubjectName.trim().toLowerCase().replace(/\s+/g, '_');
        if (subjects.find(s => s.id === id)) {
            alert('Subject already exists!');
            return;
        }
        setSubjects(prev => [...prev, { id, name: newSubjectName.trim(), totalMarks: parseInt(newSubjectTotal) || 100 }]);
        setNewSubjectName('');
        setNewSubjectTotal(100);
        setShowAddSubject(false);
    };

    const handleDeleteSubject = (subjectId) => {
        if (subjects.length <= 1) {
            alert('At least one subject is required.');
            return;
        }
        setSubjects(prev => prev.filter(s => s.id !== subjectId));
        // Remove grades for this subject from all students
        setGrades(prev => {
            const updated = { ...prev };
            Object.keys(updated).forEach(studentId => {
                if (updated[studentId]) {
                    const { [subjectId]: _, ...rest } = updated[studentId];
                    updated[studentId] = rest;
                }
            });
            return updated;
        });
    };

    const handleUpdateTotal = (subjectId) => {
        const val = parseInt(editingTotal) || 100;
        setSubjects(prev => prev.map(s => s.id === subjectId ? { ...s, totalMarks: val } : s));
        setEditingSubjectId(null);
        setEditingTotal('');
    };

    const calculateTotal = (studentId) => {
        const studentGrades = grades[studentId] || {};
        return subjects.reduce((sum, sub) => sum + (parseInt(studentGrades[sub.id]) || 0), 0);
    };

    const maxTotal = subjects.reduce((sum, sub) => sum + sub.totalMarks, 0);

    const getGradeBadge = (total) => {
        if (maxTotal === 0) return <Badge bg="secondary" className="px-3 py-2 rounded-pill">N/A</Badge>;
        const percentage = (total / maxTotal) * 100;
        if (percentage >= 80) return <Badge bg="success" className="px-3 py-2 rounded-pill">A+</Badge>;
        if (percentage >= 70) return <Badge bg="primary" className="px-3 py-2 rounded-pill">A</Badge>;
        if (percentage >= 60) return <Badge bg="info" className="px-3 py-2 rounded-pill">B</Badge>;
        if (percentage >= 50) return <Badge bg="warning" className="px-3 py-2 rounded-pill text-dark">C</Badge>;
        if (total === 0) return <Badge bg="secondary" className="px-3 py-2 rounded-pill text-white shadow-sm disabled">N/A</Badge>;
        return <Badge bg="danger" className="px-3 py-2 rounded-pill">F</Badge>;
    };

    return (
        <Layout>
            <Container fluid className="py-4">
                <div className="mb-4 d-flex justify-content-between align-items-center">
                    <div className="d-flex align-items-center gap-3">
                        <Button variant="light" className="rounded-circle shadow-sm border p-2 d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }} onClick={() => navigate(-1)}>
                            <i className="bi bi-arrow-left fs-5"></i>
                        </Button>
                        <div>
                            <h2 className="fw-bold text-dark mb-0">Manage Results</h2>
                            <p className="text-muted mb-0">
                                {role?.toLowerCase() === 'teacher' 
                                    ? `Grade papers for your assigned subject (${activeTeacherSubject || 'Subject Faculty'}).`
                                    : 'Grade papers and publish academic reports across all subjects.'}
                            </p>
                        </div>
                    </div>
                </div>

                {successMsg && <Alert variant="success" className="shadow-sm fw-bold border-0"><i className="bi bi-check-circle-fill me-2"></i>{successMsg}</Alert>}
                {errorMsg && <Alert variant="danger" className="shadow-sm fw-bold border-0"><i className="bi bi-exclamation-triangle-fill me-2"></i>{errorMsg}</Alert>}

                {/* Faculty Subject Banner for Teachers */}
                {/* {role?.toLowerCase() === 'teacher' && (
                    <Alert variant="primary" className="border-0 shadow-sm rounded-4 d-flex align-items-center mb-4 p-3">
                        <div className="bg-primary text-white p-2 rounded-circle me-3 d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
                            <i className="bi bi-shield-lock-fill fs-5"></i>
                        </div>
                        <div className="flex-grow-1">
                            <div className="fw-bold text-dark">Subject-Wise Grading Isolation Active</div>
     
                            <div className="small text-muted">
                                You are signed in as faculty for <strong>{activeTeacherSubject || 'Assigned Subject'}</strong>. 
                                You can only enter and submit scores for your subject. Other subject columns are locked to preserve other teachers' entries.
                            </div>
                        </div>
                        <Badge bg="primary" className="px-3 py-2 rounded-pill fw-bold">
                            {activeTeacherSubject || 'Subject Teacher'}
                        </Badge>
                    </Alert>
                )} */}

                <Row className="g-4">
                    <Col lg={12}>
                        <Card className="border-0 shadow-sm rounded-4">
                            <Card.Body className="p-4 d-flex flex-column flex-md-row gap-4 align-items-end">
                                {(role?.toLowerCase() === 'admin' || classesList.length > 1) && (
                                    <Form.Group className="flex-grow-1">
                                        <Form.Label className="small fw-bold text-secondary text-uppercase ls-1">Select Class section</Form.Label>
                                        <Form.Select className="shadow-sm border-0 bg-light p-3" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
                                            <option value="">-- Choose a class to grade --</option>
                                            {classesList.map(c => <option key={c} value={c}>{c}</option>)}
                                        </Form.Select>
                                    </Form.Group>
                                )}
                                
                                <Form.Group className="flex-grow-1">
                                    <Form.Label className="small fw-bold text-secondary text-uppercase ls-1">Exam Term</Form.Label>
                                    <Form.Control 
                                        type="text" 
                                        placeholder="e.g. Mid-Term, Finals, Monthly Test"
                                        className="shadow-sm border-0 bg-light p-3" 
                                        value={examType} 
                                        onChange={(e) => setExamType(e.target.value)} 
                                    />
                                </Form.Group>

                                <Form.Group className="flex-grow-1">
                                    <Form.Label className="small fw-bold text-secondary text-uppercase ls-1">Result Expiry Date</Form.Label>
                                    <Form.Control 
                                        type="date" 
                                        className="shadow-sm border-0 bg-light p-3" 
                                        value={expiryDate} 
                                        onChange={(e) => setExpiryDate(e.target.value)} 
                                        min={new Date().toISOString().split('T')[0]}
                                    />
                                </Form.Group>
                            </Card.Body>
                        </Card>
                    </Col>

                    {/* Subject Manager */}
                    {selectedClass && (
                    <Col lg={12}>
                        <Card className="border-0 shadow-sm rounded-4">
                            <Card.Header className="bg-white border-bottom p-4 d-flex justify-content-between align-items-center">
                                <h5 className="fw-bold mb-0 text-dark d-flex align-items-center">
                                    <i className="bi bi-journal-bookmark-fill text-warning me-2"></i>
                                    Subjects Configuration
                                </h5>
                                {role?.toLowerCase() === 'admin' && (
                                    <Button 
                                        variant="outline-primary" 
                                        size="sm" 
                                        className="rounded-pill px-3 fw-bold"
                                        onClick={() => setShowAddSubject(true)}
                                    >
                                        <i className="bi bi-plus-lg me-1"></i>Add Subject
                                    </Button>
                                )}
                            </Card.Header>
                            <Card.Body className="p-4">
                                <div className="d-flex flex-wrap gap-2">
                                    {subjects.map(sub => {
                                        const editable = isSubjectEditable(sub);
                                        return (
                                            <div key={sub.id} className={`d-flex align-items-center rounded-pill px-3 py-2 border ${editable ? 'bg-white border-primary border-2 shadow-sm' : 'bg-light'}`}>
                                                <span className={`fw-bold me-2 ${editable ? 'text-primary' : 'text-dark'}`}>{sub.name}</span>
                                                {role?.toLowerCase() === 'admin' && editingSubjectId === sub.id ? (
                                                    <InputGroup size="sm" style={{ width: '100px' }}>
                                                        <Form.Control 
                                                            type="number" 
                                                            value={editingTotal} 
                                                            onChange={e => setEditingTotal(e.target.value)}
                                                            className="text-center border-0 bg-white"
                                                            autoFocus
                                                            onKeyDown={e => e.key === 'Enter' && handleUpdateTotal(sub.id)}
                                                        />
                                                        <Button variant="success" size="sm" onClick={() => handleUpdateTotal(sub.id)}>
                                                            <i className="bi bi-check"></i>
                                                        </Button>
                                                    </InputGroup>
                                                ) : (
                                                    <Badge 
                                                        bg={editable ? 'primary' : 'secondary'} 
                                                        className="bg-opacity-10 text-dark rounded-pill px-2 me-1" 
                                                        style={{ cursor: role?.toLowerCase() === 'admin' ? 'pointer' : 'default' }}
                                                        onClick={() => {
                                                            if (role?.toLowerCase() === 'admin') {
                                                                setEditingSubjectId(sub.id);
                                                                setEditingTotal(sub.totalMarks);
                                                            }
                                                        }}
                                                        title={role?.toLowerCase() === 'admin' ? "Click to edit total marks" : `Total marks: ${sub.totalMarks}`}
                                                    >
                                                        /{sub.totalMarks}
                                                    </Badge>
                                                )}
                                                {role?.toLowerCase() === 'teacher' && (
                                                    <Badge bg={editable ? 'success' : 'light'} text={editable ? 'white' : 'muted'} className="rounded-pill ms-1 px-2">
                                                        {editable ? 'Your Subject' : 'Locked'}
                                                    </Badge>
                                                )}
                                                {role?.toLowerCase() === 'admin' && (
                                                    <Button 
                                                        variant="link" 
                                                        size="sm" 
                                                        className="text-danger p-0 ms-1"
                                                        onClick={() => handleDeleteSubject(sub.id)}
                                                        title="Remove subject"
                                                    >
                                                        <i className="bi bi-x-circle-fill"></i>
                                                    </Button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Add Subject Inline Form (Admin only) */}
                                {role?.toLowerCase() === 'admin' && showAddSubject && (
                                    <div className="mt-3 p-3 bg-light rounded-3 border d-flex gap-3 align-items-end flex-wrap">
                                        <Form.Group style={{ minWidth: '200px' }}>
                                            <Form.Label className="small fw-bold text-secondary">Subject Name</Form.Label>
                                            <Form.Control 
                                                type="text" 
                                                placeholder="e.g. Urdu"
                                                value={newSubjectName}
                                                onChange={e => setNewSubjectName(e.target.value)}
                                                autoFocus
                                            />
                                        </Form.Group>
                                        <Form.Group style={{ width: '120px' }}>
                                            <Form.Label className="small fw-bold text-secondary">Total Marks</Form.Label>
                                            <Form.Control 
                                                type="number" 
                                                min="1"
                                                value={newSubjectTotal}
                                                onChange={e => setNewSubjectTotal(e.target.value)}
                                            />
                                        </Form.Group>
                                        <div className="d-flex gap-2">
                                            <Button variant="primary" size="sm" className="rounded-pill px-3 fw-bold" onClick={handleAddSubject}>
                                                <i className="bi bi-plus-lg me-1"></i>Add
                                            </Button>
                                            <Button variant="light" size="sm" className="rounded-pill px-3" onClick={() => { setShowAddSubject(false); setNewSubjectName(''); }}>
                                                Cancel
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                <div className="mt-3 text-muted small">
                                    <i className="bi bi-info-circle me-1"></i>
                                    Grand Total: <strong>{maxTotal} marks</strong> across {subjects.length} subject{subjects.length !== 1 ? 's' : ''}.
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                    )}

                    {selectedClass && (
                    <Col lg={12}>
                        <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
                            <Card.Header className="bg-white border-bottom p-4 d-flex justify-content-between align-items-center">
                                <h5 className="fw-bold mb-0 text-dark">Student Grading Roster - {selectedClass}</h5>
                                <Badge bg="primary" className="bg-opacity-10 text-primary px-3 py-2 rounded-pill fw-bold border border-primary border-opacity-25">
                                    {filteredStudents.length} Students
                                </Badge>
                            </Card.Header>
                            <Card.Body className="p-0">
                                <div className="table-responsive">
                                    <Table hover className="align-middle mb-0 custom-table">
                                        <thead className="bg-light text-secondary small text-uppercase" style={{ letterSpacing: '0.5px' }}>
                                            <tr>
                                                <th className="ps-4 py-3 border-0">Student Name</th>
                                                {subjects.map(sub => {
                                                    const editable = isSubjectEditable(sub);
                                                    return (
                                                        <th key={sub.id} className={`py-3 border-0 text-center ${editable ? 'bg-primary bg-opacity-10' : ''}`} style={{ minWidth: '120px' }}>
                                                            <div className="fw-bold text-dark">{sub.name}</div>
                                                            <div className="small text-muted fw-normal">/{sub.totalMarks}</div>
                                                            {role?.toLowerCase() === 'teacher' && (
                                                                <Badge bg={editable ? 'success' : 'secondary'} className="px-2 py-1 rounded-pill mt-1" style={{ fontSize: '0.65rem' }}>
                                                                    {editable ? <><i className="bi bi-pencil-fill me-1"></i>Yours</> : <><i className="bi bi-lock-fill me-1"></i>Locked</>}
                                                                </Badge>
                                                            )}
                                                        </th>
                                                    );
                                                })}
                                                <th className="py-3 border-0 text-center">Total</th>
                                                <th className="py-3 border-0 text-center">Grade</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredStudents.length > 0 ? filteredStudents.map(student => {
                                                const total = calculateTotal(student.id);
                                                return (
                                                    <tr key={student.id}>
                                                        <td className="ps-4 py-3 fw-bold text-dark">{student.name}</td>
                                                        {subjects.map(sub => {
                                                            const editable = isSubjectEditable(sub);
                                                            return (
                                                                <td key={sub.id} className={`text-center ${editable ? 'bg-primary bg-opacity-10' : ''}`}>
                                                                    <Form.Control 
                                                                        type="number" 
                                                                        min="0" 
                                                                        max={sub.totalMarks} 
                                                                        disabled={!editable}
                                                                        className={`text-center shadow-sm mx-auto ${editable ? 'border-primary bg-white fw-bold' : 'border-0 bg-light text-muted'}`}
                                                                        style={{ width: '80px', cursor: editable ? 'text' : 'not-allowed' }}
                                                                        placeholder={editable ? "0" : "--"}
                                                                        value={grades[student.id]?.[sub.id] ?? ''} 
                                                                        onChange={(e) => handleGradeChange(student.id, sub.id, e.target.value)} 
                                                                        title={editable ? `Enter ${sub.name} marks` : `Locked: ${sub.name} marks are reserved for its subject teacher`}
                                                                    />
                                                                </td>
                                                            );
                                                        })}
                                                        <td className="text-center fw-bold">{total} / {maxTotal}</td>
                                                        <td className="text-center">
                                                            {getGradeBadge(total)}
                                                        </td>
                                                    </tr>
                                                );
                                            }) : (
                                                <tr>
                                                    <td colSpan={subjects.length + 3} className="text-center py-5 text-muted">No students found in this class.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </Table>
                                </div>
                            </Card.Body>
                            {filteredStudents.length > 0 && (
                                <Card.Footer className="bg-white p-4 border-top d-flex justify-content-end">
                                    <Button variant="primary" className="rounded-pill px-5 py-2 fw-bold shadow" onClick={handleSaveResults} disabled={saving}>
                                        {saving ? <Spinner size="sm" className="me-2" /> : <i className="bi bi-cloud-arrow-up-fill me-2"></i>}
                                        {saving ? 'Publishing...' : role?.toLowerCase() === 'teacher' ? `Publish ${activeTeacherSubject || 'Subject'} Marks` : 'Publish Results'}
                                    </Button>
                                </Card.Footer>
                            )}
                        </Card>
                    </Col>
                    )}

                    {/* Published Results Section */}
                    {selectedClass && publishedResults.length > 0 && (
                    <Col lg={12}>
                        <Card className="border-0 shadow-sm rounded-4 mt-2 overflow-hidden">
                            <Card.Header className="bg-white border-bottom p-4 d-flex justify-content-between align-items-center">
                                <h5 className="fw-bold mb-0 text-success"><i className="bi bi-check-circle-fill me-2"></i>Published Results (Active)</h5>
                                <Badge bg="success" className="bg-opacity-10 text-success px-3 py-2 rounded-pill fw-bold border border-success border-opacity-25">
                                    {publishedResults.length} Records
                                </Badge>
                            </Card.Header>
                            <Card.Body className="p-0">
                                <div className="table-responsive">
                                    <Table hover className="align-middle mb-0 custom-table">
                                        <thead className="bg-light text-secondary small text-uppercase" style={{ letterSpacing: '0.5px' }}>
                                            <tr>
                                                <th className="ps-4 py-3 border-0">Student Name</th>
                                                <th className="py-3 border-0">Exam Term</th>
                                                <th className="py-3 border-0 text-center">Score</th>
                                                <th className="py-3 border-0 text-center">Grade</th>
                                                <th className="py-3 border-0 text-end pe-4">Expiry Date</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {publishedResults.map(res => (
                                                <tr key={res._id}>
                                                    <td className="ps-4 py-3 fw-bold text-dark">{res.studentName}</td>
                                                    <td className="py-3">{res.examType}</td>
                                                    <td className="py-3 text-center fw-bold">{res.grandTotal} / {res.maxTotal}</td>
                                                    <td className="py-3 text-center">
                                                        <Badge bg={res.grade === 'F' ? 'danger' : res.grade.includes('A') ? 'success' : 'primary'} className="px-3 py-2 rounded-pill">
                                                            {res.grade}
                                                        </Badge>
                                                    </td>
                                                    <td className="py-3 text-end pe-4 text-danger small fw-bold">
                                                        <i className="bi bi-clock-history me-1"></i>
                                                        {new Date(res.expiryDate).toLocaleDateString()}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                    )}
                </Row>
            </Container>

            <style>
                {`
                    .custom-table tbody tr {
                        transition: all 0.2s ease;
                    }
                    .custom-table tbody tr:hover {
                        background-color: #f8fafc !important;
                    }
                    .ls-1 {
                        letter-spacing: 1px;
                    }
                `}
            </style>
        </Layout>
    );
};

export default ManageResults;
