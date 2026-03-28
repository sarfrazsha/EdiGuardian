import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Axios from "axios"
import Help from './pages/Help';
import Contact from './pages/Contact';
import Support from './pages/Support';
import Dashboard from './pages/Dashboard';
import ManageUsers from './pages/ManageUsers';
import ManageClasses from './pages/ManageClasses';
import Announcements from './pages/Announcements';
import ManageStudents from './pages/ManageStudents';
import ManageTeachers from './pages/ManageTeachers';
import Homework from './pages/Homework';
import ManageFees from './pages/ManageFees';
import MyFees from './pages/MyFees';
import PaymentSuccess from './pages/PaymentSuccess';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login/:role" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/manage-users" element={<ManageUsers />} />
        <Route path="/manage-classes" element={<ManageClasses />} />
        <Route path="/announcements" element={<Announcements />} />
        <Route path="/manage-students" element={<ManageStudents />} />
        <Route path="/manage-teachers" element={<ManageTeachers />} />
        <Route path="/homework" element={<Homework />} />
        <Route path="/manage-fees" element={<ManageFees />} />
        <Route path="/my-fees" element={<MyFees />} />
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route path="/help" element={<Help />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/support" element={<Support />} />
      </Routes>
    </Router>
  );
}

export default App;
