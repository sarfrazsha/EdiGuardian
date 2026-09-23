import React, { useState, useEffect } from 'react';
import { Dropdown, Button, Card, Badge } from 'react-bootstrap';

const ChildSelector = ({ children, selectedChildId, onChildSelect }) => {
    const [selectedChild, setSelectedChild] = useState(null);

    useEffect(() => {
        if (children && children.length > 0) {
            const child = children.find(c => c.id === selectedChildId) || children[0];
            setSelectedChild(child);
        }
    }, [children, selectedChildId]);

    const handleChildSelect = (child) => {
        setSelectedChild(child);
        onChildSelect(child);
        localStorage.setItem('selectedChildId', child.id);
        localStorage.setItem('selectedChildClass', child.classNo);
    };

    if (!children || children.length === 0) {
        return null; // Don't show selector if 0 children
    }

    return (
        <Card className="border-0 shadow-sm rounded-4 mb-4" style={{ background: 'linear-gradient(135deg, rgb(125, 78, 84) 0%, rgb(160, 125, 130) 100%)', color: 'white' }}>
            <Card.Body className="p-3">
                <div className="d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center gap-3">
                        <div className="d-flex align-items-center">
                            <i className="bi bi-people-fill fs-4 me-3"></i>
                            <div>
                                <h6 className="mb-0 fw-bold">Select Child</h6>
                                <small className="opacity-75">Choose which child's data to view</small>
                            </div>
                        </div>
                    </div>

                    <Dropdown>
                        <Dropdown.Toggle
                            variant="light"
                            className="d-flex align-items-center gap-2 border-0 rounded-pill px-3 py-2"
                            style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }}
                        >
                            {selectedChild && (
                                <>
                                    <img
                                        src={selectedChild.image || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='8' r='4' fill='%236B7280'/%3E%3Cpath d='M12 14c-6.1 0-8 4-8 4v2h16v-2s-1.9-4-8-4z' fill='%236B7280'/%3E%3C/svg%3E"}
                                        alt={selectedChild.name}
                                        className="rounded-circle me-2"
                                        style={{ width: '24px', height: '24px', objectFit: 'cover' }}
                                    />
                                    <div className="text-start">
                                        <div className="fw-bold small">{selectedChild.name}</div>
                                        <div className="small opacity-75">{selectedChild.classNo}</div>
                                    </div>
                                </>
                            )}
                            <i className="bi bi-chevron-down"></i>
                        </Dropdown.Toggle>

                        <Dropdown.Menu className="shadow-lg border-0 rounded-3" style={{ width: 'min(280px, calc(100vw - 2rem))', minWidth: '0', maxWidth: 'calc(100vw - 2rem)' }}>
                            {children.map((child) => (
                                <Dropdown.Item
                                    key={child.id}
                                    onClick={() => handleChildSelect(child)}
                                    className={`d-flex align-items-center gap-3 p-3 ${
                                        selectedChild && selectedChild.id === child.id ? 'bg-light' : ''
                                    }`}
                                    style={{ borderRadius: '8px', margin: '2px 4px' }}
                                >
                                    <img
                                        src={child.image || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Ccircle cx='20' cy='14' r='7' fill='%236B7280'/%3E%3Cpath d='M20 24c-10.5 0-14 7-14 7v4h28v-4s-3.5-7-14-7z' fill='%236B7280'/%3E%3C/svg%3E"}
                                        alt={child.name}
                                        className="rounded-circle"
                                        style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                                    />
                                    <div className="flex-grow-1">
                                        <div className="fw-bold">{child.name}</div>
                                        <div className="small text-muted">
                                            Roll No: {child.rollNo} • Class: {child.classNo}
                                        </div>
                                        <div className="small text-muted">
                                            Age: {child.age} • {child.gender}
                                        </div>
                                    </div>
                                    {selectedChild && selectedChild.id === child.id && (
                                        <Badge bg="success" className="rounded-pill">
                                            <i className="bi bi-check-circle-fill"></i>
                                        </Badge>
                                    )}
                                </Dropdown.Item>
                            ))}
                        </Dropdown.Menu>
                    </Dropdown>
                </div>
            </Card.Body>
        </Card>
    );
};

export default ChildSelector;