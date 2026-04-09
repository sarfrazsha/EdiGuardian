const express = require("express");
const cors = require("cors");
const { v4: uuidv4 } = require('uuid');


const app = express();
const mongoose = require("mongoose");
const port = 8080;
const path = require("path");
const upload = require('./middleware/upload');     
app.use(cors());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.json({ limit: '50mb' }));
let adminAlertQueue = []; // In-memory queue for transient admin alerts
const link = 'mongodb://127.0.0.1:27017/FYP';
const Admin = require("./models/admin")
const Parent = require('./models/parent');
const Teacher = require('./models/teacher');
const Student = require("./models/student");
const Announcement = require("./models/announcement");
const Fee = require("./models/fee");
const Attendance = require("./models/attendance");

// app.set("view engine", "ejs");
// app.set("views", path.join(__dirname, "views"));
main()
    .then(() => {
        console.log("connected to DB")
    })
    .catch((err) => {
        console.log(err)
    })
async function main() {
    await mongoose.connect(link);

}
app.listen(port, () => {
    console.log(`app is running on`, { port })
})
app.get("/api/test", (req, res) => {
    res.json({ message: "React connected successfully" });
});

app.get("/admin", async (req, res) => {
    const admin = new Admin({
        adminId: uuidv4(),
        adminName: "Muhammad Muntaha",
        adminEmail: "muntaha1212@gmail.com",
        adminPassword: "12345678",
        adminPhone: "03123828383"
    })



    await admin.save()
        .then(() => {
            res.send("Admin Added")

        });



})
app.get("/users", async (req, res) => {
    let countStudent = 0, countParents = 0, countAdmins, countTeachers;
    countParents = await Parent.countDocuments({});
    countStudent = await Student.countDocuments({});
    countTeachers = await Teacher.countDocuments({});
    countAdmins = await Admin.countDocuments({});

    const teacherClasses = await Teacher.distinct('teacherClass');
    const studentClasses = await Student.distinct('classNo');
    const parentClasses = await Parent.distinct('classNo');
    const activeClasses = new Set([...teacherClasses, ...studentClasses, ...parentClasses].filter(Boolean));
    const countClasses = activeClasses.size;

    // Calculate fee totals grouped by month
    const monthlyFeeData = await Fee.aggregate([
        { $group: { _id: '$month', total: { $sum: '$amount' } } }
    ]);
    const monthlyFeeStats = monthlyFeeData.map(item => ({
        month: item._id,
        total: item.total
    }));

    // Counts for fee statuses (Pending, Review, Paid)
    const feesPendingCount = await Fee.countDocuments({ status: 'Pending' });
    const feesReviewCount = await Fee.countDocuments({ status: 'Review' });
    const feesPaidCount = await Fee.countDocuments({ status: 'Paid' });

    res.status(200).json({
        totalStudents: countStudent,
        totalParents: countParents,
        totalAdmins: countAdmins,
        totalTeachers: countTeachers,
        totalClasses: countClasses,
        monthlyFeeStats: monthlyFeeStats,
        feesPendingCount: feesPendingCount,
        feesReviewCount: feesReviewCount,
        feesPaidCount: feesPaidCount
    })


})


app.get("/api/classes", async (req, res) => {
    try {
        const studentClasses = await Student.distinct('classNo');
        const parentClasses = await Parent.distinct('classNo');
        const classes = [...new Set([...studentClasses, ...parentClasses].filter(Boolean))].sort();
        res.status(200).json(classes);
    } catch (err) {
        res.status(500).json({ message: "Error fetching classes" });
    }
});
app.post("/students", (req, res, next) => {
    upload.fields([
        { name: 'studentProfilePicture', maxCount: 1 },
        { name: 'parentProfilePicture', maxCount: 1 }
    ])(req, res, (err) => {
        if (err) {
            console.error("Multer Error:", err);
            return res.status(400).json({ message: "File upload error: " + err.message });
        }
        next();
    });
}, async (req, res) => {
    try {
      

        let { studentName, studentAge, studentRollNo, studentGender, studentEmail, studentPassword, studentClass, parentName, parentPhone, parentAddress, parentEmail, parentPassword } = req.body;
        
        // Helper to get normalized relative path (e.g., 'images/file.jpg')
        const getRelativePath = (files, fieldName) => {
            if (files && files[fieldName] && files[fieldName][0]) {
                const fullPath = files[fieldName][0].path; // e.g. 'uploads/images/abc.jpg'
                return fullPath.replace(/\\/g, '/').replace(/^uploads\//, '');
            }
            return '';
        };

        const studentProfilePicture = getRelativePath(req.files, 'studentProfilePicture');
        const parentProfilePicture = getRelativePath(req.files, 'parentProfilePicture');

        console.log("Student Image Path:", studentProfilePicture || "NONE");
        console.log("Parent Image Path:", parentProfilePicture || "NONE");

        const student = new Student({
            classNo: studentClass || '',
            studentName: studentName,
            studentAge: studentAge,
            studentRollNo: studentRollNo,
            studentGender: studentGender,
            studentEmail: studentEmail,
            studentPassword: studentPassword,
            studentImage: studentProfilePicture
        });
        let savedStudent = await student.save();
        console.log("Student Record Saved:", savedStudent._id);

        const parent = new Parent({
            studentId: savedStudent._id,
            classNo: studentClass || '',
            parentName: parentName,
            parentPhone: parentPhone,
            parentAddress: parentAddress,
            parentEmail: parentEmail,
            parentPassword: parentPassword,
            parentImage: parentProfilePicture
        });
        let savedParent = await parent.save();
        console.log("Parent Record Saved:", savedParent._id);

        res.status(201).json({
            message: "Student and Parent data saved successfully!",
            student: savedStudent,
            parent: savedParent
        });
    } catch (err) {
        console.error("Critical Registration Error:", err);
        res.status(500).json({ message: err.message || "Registration failed." });
    }
})
app.get("/api/students-detailed", async (req, res) => {
    try {
        const students = await Student.find({}).lean();
        const parents = await Parent.find({}).lean();

        const detailedStudents = students.map(s => {
            const parent = parents.find(p => p.studentId && p.studentId.toString() === s._id.toString());
            return {
                id: s._id,
                studentName: s.studentName,
                studentAge: s.studentAge,
                studentRollNo: s.studentRollNo,
                studentGender: s.studentGender,
                studentClass: s.classNo, // Map classNo to studentClass for frontend compatibility
                studentEmail: s.studentEmail,
                studentPassword: s.studentPassword,
                studentProfilePicture: s.studentImage ? `http://localhost:8080/uploads/${s.studentImage}` : '',
                studentImage: s.studentImage || '', // Include raw path for detail pages
                parentName: parent ? parent.parentName : '',
                parentPhone: parent ? parent.parentPhone : '',
                parentEmail: parent ? parent.parentEmail : '',
                parentPassword: parent ? parent.parentPassword : '',
                parentAddress: parent ? parent.parentAddress : '',
                parentProfilePicture: parent && parent.parentImage ? `http://localhost:8080/uploads/images/${parent.parentImage}` : '',
                parentImage: parent ? parent.parentImage : '' // Include raw filename for detail pages
            };
        });

        res.json(detailedStudents);
    } catch (err) {
        console.error("Error fetching detailed students:", err);
        res.status(500).json({ message: "Error fetching detailed student info" });
    }
});

// 
// 
app.post("/student/login", async (req, res) => {
    try {
        let { email, password, role } = req.body;
        role = (role || '').trim().toLowerCase();

        let user = null;
        let dbPassword = null;
        let uname = "";
        let profilePic = "";

        if (role === "student") {
            user = await Student.findOne({ studentEmail: email });
            if (user) {
                dbPassword = user.studentPassword;
                uname = user.studentName;
                profilePic = user.studentImage ? `http://localhost:8080/uploads/${user.studentImage}` : '';
            }

        } else if (role === "parent") {
            user = await Parent.findOne({ parentEmail: email });
            if (user) {
                dbPassword = user.parentPassword;
                uname = user.parentName;
                profilePic = user.parentImage ? `http://localhost:8080/uploads/${user.parentImage}` : '';
            }
        } else if (role === "teacher") {
            user = await Teacher.findOne({ teacherEmail: email });
            if (user) {
                dbPassword = user.teacherPassword;
                uname = user.teacherName;
                profilePic = user.teacherImage ? `http://localhost:8080/uploads/images/${user.teacherImage}` : '';
            }
        } else {
            user = await Admin.findOne({ adminEmail: email });
            if (user) {
                dbPassword = user.adminPassword;
                uname = user.adminName;
                profilePic = user.adminImage ? `http://localhost:8080/uploads/images/${user.adminImage}` : '';
            }
        }

        if (!user) {
            return res.status(400).json({ message: "User not found" });
        }

        if (dbPassword === password) {
            const responseData = {
                message: "Logged in Successfully!",
                email: email,
                role: role,
                uname: uname,
                profilePic: profilePic
            };

            // Add role-specific data to login response
            if (role === "teacher") {
                responseData.teacherClass = user.teacherClass;
            } else if (role === "parent") {
                responseData.studentId = user.studentId;
                responseData.classNo = user.classNo;
            } else if (role === "student") {
                responseData.studentId = user._id;
                responseData.classNo = user.classNo;
            }

            return res.status(201).json(responseData);
        } else {
            return res.status(400).json({ message: "Wrong Password" });
        }

    } catch (err) {
        console.error("ERROR:", err);
        return res.status(500).json({ message: "Server error during login" });
    }
});

app.post("/users", async (req, res) => {

    let { teacherName, phoneNumber, className, email, password, address } = req.body;

    const teacher = new Teacher({
        teacher_id: uuidv4(),
        teacherName: teacherName,
        teacherContact: phoneNumber,
        teacherClass: className,
        teacherEmail: email,
        teacherAddress: address,
        teacherPassword: password,
        



    })
    await teacher.save()
        .then(() => {
            res.status(201).json({
                message: "Teacher data is save Successfully!"
            })
        })

})


// Announcement Routes

// GET announcements (optionally filtered by role for marquee)
app.get("/api/announcements", async (req, res) => {
    try {
        const { role } = req.query;
        const now = new Date();
        let filter = {
            // Exclude announcements that have expired
            $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }]
        };
        if (role && role.toLowerCase() !== 'admin') {
            // Return announcements targeted at 'all' or specifically this role
            filter.targetAudience = { $in: ['all', role.toLowerCase()] };
        }
        const announcements = await Announcement.find(filter).sort({ createdAt: -1 });
        res.json(announcements);
    } catch (err) {
        res.status(500).json({ message: "Error fetching announcements" });
    }
});

// POST create announcement
app.post("/api/announcements", async (req, res) => {
    try {
        const { title, content, role, targetAudience, durationDays } = req.body;
        // Simple role check
        if (role !== "admin" && role !== "Admin") {
            return res.status(403).json({ message: "Unauthorized: Admins only" });
        }

        let expiresAt = null;
        if (durationDays && Number(durationDays) > 0) {
            expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + Number(durationDays));
        }

        const newAnnouncement = new Announcement({
            title,
            content,
            targetAudience: targetAudience || 'all',
            expiresAt
        });
        await newAnnouncement.save();
        res.status(201).json(newAnnouncement);
    } catch (err) {
        res.status(500).json({ message: "Error creating announcement" });
    }
});

// PUT update announcement
app.put("/api/announcements/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content, role, targetAudience, durationDays } = req.body;

        if (role !== "admin" && role !== "Admin") {
            return res.status(403).json({ message: "Unauthorized: Admins only" });
        }

        let expiresAt = null;
        if (durationDays && Number(durationDays) > 0) {
            expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + Number(durationDays));
        }

        const updatedAnnouncement = await Announcement.findByIdAndUpdate(
            id,
            { title, content, targetAudience: targetAudience || 'all', expiresAt },
            { new: true }
        );
        res.json(updatedAnnouncement);
    } catch (err) {
        res.status(500).json({ message: "Error updating announcement" });
    }
});

// PUT mark all as read for a user
app.put("/api/announcements/mark-all-read", async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: "Email required" });

        await Announcement.updateMany(
            { readBy: { $ne: email } },
            { $addToSet: { readBy: email } }
        );
        res.json({ message: "All marked as read" });
    } catch (err) {
        res.status(500).json({ message: "Error marking announcements as read" });
    }
});

// DELETE announcement
app.delete("/api/announcements/:id", async (req, res) => {
    try {
        const { id } = req.params;
        // Note: In a real app, you'd check auth/role from headers/session here too.
        // For this FYP structure, we might need to pass role in body or query if not using tokens.
        // Assuming the frontend will prevent the call, but let's check body if possible.
        // DELETE requests often don't have a body in some conventions, but Express supports it.
        // Alternatively, we can pass it as a query param or just trust the frontend for this simple demo?
        // Let's rely on a header or query param for delete to be safe-ish?
        // Let's assume the body hack works or use query.
        const { role } = req.body;
        // If body is empty, check query
        const userRole = role || req.query.role;

        if (userRole !== "admin" && userRole !== "Admin") {
            return res.status(403).json({ message: "Unauthorized: Admins only" });
        }

        await Announcement.findByIdAndDelete(id);
        res.json({ message: "Announcement deleted" });
    } catch (err) {
        res.status(500).json({ message: "Error deleting announcement" });
    }
});

// --- Fee & Parent Routes ---

app.get("/api/parents", async (req, res) => {
    try {
        const parents = await Parent.find({}).lean();
        const students = await Student.find({}).lean();
        const parentsExtended = parents.map(p => {
            const student = students.find(s => s._id.toString() === p.studentId?.toString());
            return {
                ...p,
                studentName: student ? student.studentName : 'Unknown',
                studentRollNo: student ? student.studentRollNo : '',
                studentAge: student ? student.studentAge : '',
                studentGender: student ? student.studentGender : '',
                studentImage: student ? student.studentImage : '',
                parentImage: p.parentImage || '',
                classNo: p.classNo || (student ? student.classNo : '')
            };
        });
        res.json(parentsExtended);
    } catch (err) {
        res.status(500).json({ message: "Error fetching parents" });
    }
});

app.post("/api/fees", upload.single('adminVoucher'), async (req, res) => {
    try {
        const { studentName, parentEmail, amount, dueDate, month, classNo, role } = req.body;
        if (role !== "admin" && role !== "Admin") {
            return res.status(403).json({ message: "Unauthorized" });
        }

        const adminVoucher = req.file ? req.file.path.replace(/\\/g, '/').replace(/^uploads\//, '') : '';
        if (!adminVoucher) {
            return res.status(400).json({ message: "Fee voucher file is required." });
        }

        const newFee = new Fee({
            studentName,
            parentEmail,
            amount,
            dueDate,
            month,
            adminVoucher,
            classNo,
            status: 'Pending'
        });
        await newFee.save();
        res.status(201).json(newFee);
    } catch (err) {
        console.error("Error creating fee alert:", err);
        res.status(500).json({ message: "Error creating fee alert", error: err });
    }
});

// Bulk process fees
app.post("/api/fees/bulk", upload.single('adminVoucher'), async (req, res) => {
    try {
        let { parents, amount, dueDate, month, classNo, role } = req.body;
        if (role !== "admin" && role !== "Admin") {
            return res.status(403).json({ message: "Unauthorized" });
        }

        // If parents is sent as a string (happens with FormData), parse it
        if (typeof parents === 'string') {
            try {
                parents = JSON.parse(parents);
            } catch (e) {
                return res.status(400).json({ message: "Invalid parents data format." });
            }
        }

        if (!parents || !parents.length) {
            return res.status(400).json({ message: "No parents found to issue fees to." });
        }

        const adminVoucher = req.file ? req.file.path.replace(/\\/g, '/').replace(/^uploads\//, '') : '';
        if (!adminVoucher) {
            return res.status(400).json({ message: "Fee voucher file is required." });
        }

        const feesToInsert = parents.map(p => ({
            studentName: p.studentName || "Student",
            parentEmail: p.parentEmail,
            amount,
            dueDate,
            month,
            adminVoucher,
            classNo,
            status: 'Pending'
        }));

        await Fee.insertMany(feesToInsert);
        res.status(201).json({ message: `Successfully issued ${feesToInsert.length} fee alerts.` });
    } catch (err) {
        console.error("Bulk fee error:", err);
        res.status(500).json({ message: "Error creating bulk fee alerts", error: err });
    }
});

app.get("/api/fees", async (req, res) => {
    try {
        const { role, email } = req.query;
        if (role === "admin" || role === "Admin") {
            const fees = await Fee.find().sort({ createdAt: -1 });
            return res.json(fees);
        } else if (role === "parent" || role === "Parent") {
            const fees = await Fee.find({ parentEmail: email }).sort({ createdAt: -1 });
            return res.json(fees);
        }
        return res.status(403).json({ message: "Unauthorized role" });
    } catch (err) {
        res.status(500).json({ message: "Error fetching fees" });
    }
});

app.put("/api/fees/:id/pay", async (req, res) => {
    try {
        const { id } = req.params;
        const updatedFee = await Fee.findByIdAndUpdate(
            id,
            { status: 'Paid' },
            { new: true }
        );
        res.json(updatedFee);
    } catch (err) {
        res.status(500).json({ message: "Error paying fee" });
    }
});

app.put("/api/fees/:id/upload-receipt", upload.single('parentReceipt'), async (req, res) => {
    try {
        const { id } = req.params;
        const parentReceipt = req.file ? req.file.path.replace(/\\/g, '/').replace(/^uploads\//, '') : '';
        
        if (!parentReceipt) {
            return res.status(400).json({ message: "Receipt file is required." });
        }

        const updatedFee = await Fee.findByIdAndUpdate(
            id,
            { parentReceipt, status: 'Review' },
            { new: true }
        );

        // Add a transient alert to the in-memory queue for the Admin
        if (updatedFee) {
            adminAlertQueue.push({
                _id: Date.now().toString(), // Generate a temporary ID
                title: "Action Required: Fee Receipt Uploaded",
                content: `${updatedFee.studentName} has uploaded a receipt for ${updatedFee.month}. Please review in the Fee Records Hub.`,
                isAlert: true,
                createdAt: new Date()
            });
        }

        res.json(updatedFee);
    } catch (err) {
        console.error("Receipt upload error:", err);
        res.status(500).json({ message: "Error uploading receipt" });
    }
});

app.put("/api/fees/:id/approve", async (req, res) => {
    try {
        const { id } = req.params;
        const updatedFee = await Fee.findByIdAndUpdate(
            id,
            { status: 'Paid' },
            { new: true }
        );
        res.json(updatedFee);
    } catch (err) {
        res.status(500).json({ message: "Error approving fee" });
    }
});

// --- Attendance Routes ---

// GET students by class
app.get("/api/students/class/:classNo", async (req, res) => {
    try {
        const { classNo } = req.params;
        const students = await Student.find({ classNo: classNo }).sort({ studentName: 1 });
        res.json(students);
    } catch (err) {
        res.status(500).json({ message: "Error fetching students for class" });
    }
});

// POST mark/update attendance (bulk)
app.post("/api/attendance", async (req, res) => {
    try {
        const { attendanceRecords, date, classNo, markedBy } = req.body;
        
        if (!attendanceRecords || !attendanceRecords.length) {
            return res.status(400).json({ message: "No attendance records provided" });
        }

        const bulkOps = attendanceRecords.map(record => ({
            updateOne: {
                filter: { 
                    studentId: record.studentId, 
                    date: new Date(date).setHours(0,0,0,0) 
                },
                update: { 
                    $set: { 
                        studentName: record.studentName,
                        classNo: classNo,
                        status: record.status,
                        markedBy: markedBy,
                        date: new Date(date).setHours(0,0,0,0)
                    } 
                },
                upsert: true
            }
        }));

        await Attendance.bulkWrite(bulkOps);
        res.json({ message: "Attendance marked successfully" });
    } catch (err) {
        console.error("Attendance save error:", err);
        res.status(500).json({ message: "Error marking attendance" });
    }
});

// GET attendance for a class on a specific date
app.get("/api/attendance/class/:classNo", async (req, res) => {
    try {
        const { classNo } = req.params;
        const { date } = req.query;
        const searchDate = new Date(date).setHours(0,0,0,0);
        
        const records = await Attendance.find({ 
            classNo: classNo, 
            date: searchDate 
        });
        res.json(records);
    } catch (err) {
        res.status(500).json({ message: "Error fetching attendance records" });
    }
});

// GET attendance history for a student
app.get("/api/attendance/student/:studentId", async (req, res) => {
    try {
        const { studentId } = req.params;
        const records = await Attendance.find({ studentId: studentId }).sort({ date: -1 });
        res.json(records);
    } catch (err) {
        res.status(500).json({ message: "Error fetching student attendance history" });
    }
});

app.use(express.static(path.join(__dirname, "../frontend/dist")));


// Endpoint for Admin to poll transient alerts (clears queue after reading)
app.get("/api/notifications/admin", (req, res) => {
    const alerts = [...adminAlertQueue];
    adminAlertQueue = []; // Clear the queue immediately
    res.json(alerts);
});

app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/dist/index.html"));
});