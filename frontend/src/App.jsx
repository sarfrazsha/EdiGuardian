import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ScrollToTop from './components/ScrollToTop';
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
import MyFees from './pages/MyFees';
import PaymentSuccess from './pages/PaymentSuccess';
import ManageResults from './pages/ManageResults';
import Attendance from './pages/Attendance';
import Schedule from './pages/Schedule';
import DateSheet from './pages/DateSheet';
import AttendanceHistory from './pages/AttendanceHistory';
import IssueFees from './pages/IssueFees';
import AllFees from './pages/AllFees';
import ParentHub from './pages/ParentHub';
import ParentStudentDetails from './pages/ParentStudentDetails';
import Results from './pages/Results';

function App() {
  return (
    <Router>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login/:role" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/results" element={<Results />} />
        <Route path="/manage-users" element={<ManageUsers />} />
        <Route path="/manage-classes" element={<ManageClasses />} />
        <Route path="/announcements" element={<Announcements />} />
        <Route path="/manage-students" element={<ManageStudents />} />
        <Route path="/manage-teachers" element={<ManageTeachers />} />
        <Route path="/homework" element={<Homework />} />
        <Route path="/issue-fees" element={<IssueFees />} />
        <Route path="/all-fees" element={<AllFees />} />
        <Route path="/parent-hub" element={<ParentHub />} />
        <Route path="/parent-student-details" element={<ParentStudentDetails />} />
        <Route path="/my-fees" element={<MyFees />} />
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route path="/manage-results" element={<ManageResults />} />
        <Route path="/help" element={<Help />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/support" element={<Support />} />
        <Route path="/attendance" element={<Attendance />} />
        <Route path="/schedule" element={<Schedule />} />
        <Route path="/datesheet" element={<DateSheet />} />
        <Route path="/attendance-history" element={<AttendanceHistory />} />
      </Routes>
    </Router>
  );
}

export default App;
