import React, { useState, useEffect } from 'react';
import { Form, Button, InputGroup, Spinner } from 'react-bootstrap';

import { useParams, useNavigate } from 'react-router-dom';
import AppNavbar from '../components/Navbar';
import Footer from '../components/Footer';
import background from '../assets/background.webp';
import brandIcon from '../assets/eduguardian-icon-v2-green.svg';

const ROLES = [
    { id: 'Student', icon: 'bi-mortarboard-fill', blurb: 'View homework, results, timetable and attendance.' },
    { id: 'Parent', icon: 'bi-people-fill', blurb: "Follow your child's progress and pay fees online." },
    { id: 'Teacher', icon: 'bi-person-workspace', blurb: 'Manage classes, attendance, homework and results.' },
    { id: 'Admin', icon: 'bi-shield-lock-fill', blurb: 'Run the school: users, classes, fees and reports.' }
];

const HIGHLIGHTS = [
    { icon: 'bi-calendar-check', label: 'Attendance' },
    { icon: 'bi-graph-up-arrow', label: 'Results' },
    { icon: 'bi-journal-text', label: 'Homework' },
    { icon: 'bi-wallet2', label: 'Online Fees' }
];

const Login = () => {
    const { role } = useParams();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const activeRole = ROLES.find(r => r.id.toLowerCase() === String(role || '').toLowerCase()) || ROLES[1];

    // Switching role (via the tabs) starts with a clean form.
    useEffect(() => {
        setError('');
        setSuccess(false);
        setPassword('');
    }, [role]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (loading || success) return;
        setError('');
        setLoading(true);
        try {
            const response = await fetch('/student/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, role, password }),
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('userEmail', email);
                localStorage.setItem('userRole', role);
                localStorage.setItem('userName', data.uname || "User");
                localStorage.setItem('userProfilePic', data.profilePic || "");
                if (data.studentId) localStorage.setItem('studentId', data.studentId);
                if (data.classNo) localStorage.setItem('classNo', data.classNo);
                if (data.teacherClass) localStorage.setItem('teacherClass', data.teacherClass);
                if (data.teacherClasses) localStorage.setItem('teacherClasses', JSON.stringify(data.teacherClasses));
                if (data.teacherSubject) localStorage.setItem('teacherSubject', data.teacherSubject);
                if (data.teacherSubjects) localStorage.setItem('teacherSubjects', JSON.stringify(data.teacherSubjects));
                if (data.children) {
                    localStorage.setItem('parentChildren', JSON.stringify(data.children));
                    if (data.children.length > 0) {
                        localStorage.setItem('selectedChildId', data.selectedChildId || data.children[0].id);
                        localStorage.setItem('selectedChildClass', data.children[0].classNo);
                    }
                }

                setSuccess(true);
                setTimeout(() => {
                    navigate('/dashboard', { state: { email, role, uname: data.uname, profilePic: data.profilePic } });
                }, 1000);
            } else {
                setError(data.message || "Invalid email or password.");
            }
        } catch (err) {
            console.error("Login Error:", err);
            setError("Unable to reach the server. Please check your connection and try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page d-flex flex-column min-vh-100">
            <AppNavbar solid />

            <main className="login-hero flex-grow-1" style={{ backgroundImage: `url(${background})` }}>
                <div className="login-hero-scrim"></div>
                <div className="login-hero-inner">
                    <div className="login-left-column">
                        <section className="login-intro">
                            <p className="login-eyebrow"><i className="bi bi-stars me-2"></i>EDUGUARDIAN PORTAL</p>
                            <h1>Stay close to<br /><span>what matters most.</span></h1>
                        </section>

                        <section className="login-card">
                            <div className="login-card-accent"></div>

                            <div className="login-card-head">
                                <div className="login-role-badge">
                                    <i className={`bi ${activeRole.icon}`}></i>
                                </div>
                                <div>
                                    <h2>Welcome back</h2>
                                    <p className="login-card-subtitle">Sign in to your <strong>{activeRole.id}</strong> portal</p>
                                </div>
                            </div>

                            <div className="login-role-tabs" role="tablist" aria-label="Choose account type">
                                {ROLES.map(r => (
                                    <button
                                        key={r.id}
                                        type="button"
                                        role="tab"
                                        aria-selected={r.id === activeRole.id}
                                        className={`login-role-tab ${r.id === activeRole.id ? 'active' : ''}`}
                                        onClick={() => navigate(`/login/${r.id}`)}
                                        disabled={loading || success}
                                    >
                                        <i className={`bi ${r.icon}`}></i>
                                        <span>{r.id}</span>
                                    </button>
                                ))}
                            </div>
                            <p className="login-role-blurb">{activeRole.blurb}</p>

                            {error && (
                                <div className="login-error" role="alert">
                                    <i className="bi bi-exclamation-circle-fill"></i>
                                    <span>{error}</span>
                                </div>
                            )}

                            <Form onSubmit={handleSubmit}>
                                <Form.Group className="login-field" controlId="formBasicEmail">
                                    <Form.Label>Email address</Form.Label>
                                    <InputGroup className="login-input-group">
                                        <InputGroup.Text className="login-input-icon"><i className="bi bi-envelope"></i></InputGroup.Text>
                                        <Form.Control
                                            type="email"
                                            placeholder="you@gmail.com"
                                            value={email}
                                            onChange={(e) => { setEmail(e.target.value); setError(''); }}
                                            autoComplete="username"
                                            required
                                            className="login-input"
                                        />
                                    </InputGroup>
                                </Form.Group>

                                <Form.Group className="login-field login-field-last" controlId="formBasicPassword">
                                    <Form.Label>Password</Form.Label>
                                    <InputGroup className="login-input-group">
                                        <InputGroup.Text className="login-input-icon"><i className="bi bi-lock"></i></InputGroup.Text>
                                        <Form.Control
                                            type={showPassword ? "text" : "password"}
                                            placeholder="Enter your password"
                                            value={password}
                                            onChange={(e) => { setPassword(e.target.value); setError(''); }}
                                            autoComplete="current-password"
                                            required
                                            minLength="8"
                                            className="login-input"
                                        />
                                        <InputGroup.Text
                                            as="button"
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="login-input-toggle"
                                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                                        >
                                            <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                                        </InputGroup.Text>
                                    </InputGroup>
                                </Form.Group>

                                <Button type="submit" className={`login-submit w-100 fw-bold ${success ? 'is-success' : ''}`} disabled={loading || success}>
                                    {success ? (
                                        <><i className="bi bi-check-circle-fill me-2"></i>Signed in! Redirecting...</>
                                    ) : loading ? (
                                        <><Spinner size="sm" className="me-2" />Signing in...</>
                                    ) : (
                                        <>Sign in<i className="bi bi-arrow-right ms-2"></i></>
                                    )}
                                </Button>
                            </Form>

                            <div className="login-card-foot">
                                <span className="login-secure"><i className="bi bi-shield-check me-1"></i>Secure sign-in</span>
                                <button type="button" onClick={() => navigate('/')} className="login-back-link">
                                    <i className="bi bi-arrow-left me-1"></i>Back to home
                                </button>
                            </div>
                        </section>

                        <p className="login-intro-copy login-copy-below">A calmer way to stay connected with your child's learning, progress, and everyday school life.</p>
                        <ul className="login-highlights">
                            {HIGHLIGHTS.map(h => (
                                <li key={h.label}><i className={`bi ${h.icon}`}></i>{h.label}</li>
                            ))}
                        </ul>
                        <div className="login-brand-note">
                            <img src={brandIcon} alt="" />
                            <span>One portal for students, parents, teachers and admins</span>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default Login;
