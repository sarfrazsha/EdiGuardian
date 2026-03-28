import React from 'react';
import { useNavigate } from 'react-router-dom';

const TopHeader = () => {
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.clear();
        navigate('/');
    };

    return (
        <div className="bg-white border-bottom px-4 py-2 d-flex justify-content-between align-items-center sticky-top shadow-sm" style={{ zIndex: 1000 }}>
            <div className="d-flex align-items-center bg-light rounded-pill px-3 py-1">
                <i className="bi bi-search text-muted me-2"></i>
                <input type="text" className="border-0 bg-transparent small" placeholder="Quick search..." style={{ outline: 'none', width: '200px' }} />
            </div>

            <div className="d-flex align-items-center gap-4">
                <div className="position-relative cursor-pointer">
                    <i className="bi bi-bell fs-5 text-muted"></i>
                    <span className="position-absolute top-0 start-100 translate-middle badge border border-light rounded-circle bg-danger p-1"></span>
                </div>

                <div className="ps-3 border-start">
                    <button
                        onClick={handleLogout}
                        className="btn btn-outline-danger btn-sm d-flex align-items-center gap-2 rounded-pill px-3 fw-bold shadow-sm transition-all"
                        style={{ transition: 'all 0.3s' }}
                    >
                        <i className="bi bi-box-arrow-left"></i>
                        <span className="d-none d-sm-inline">Logout</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TopHeader;
