const mongoose = require("mongoose");
const { v4: uuidv4 } = require('uuid');

const Admin = require("./models/admin");
const Parent = require('./models/parent');
const Teacher = require('./models/teacher');
const Student = require("./models/student");

const link = 'mongodb://127.0.0.1:27017/FYP';

async function seed() {
    try {
        await mongoose.connect(link);
        console.log("Connected to DB");

        // 1. Teacher
        const teacher = new Teacher({
            teacher_id: uuidv4(),
            teacherName: "NaeemShb",
            teacherEmail: "naeemshb@test.com",
            teacherPassword: "12345678",
            teacherContact: "0000000000",
            teacherClass: "General",
            teacherAddress: "N/A",
            role: "teacher"
        });
        await teacher.save();
        console.log("Added Teacher: NaeemShb");

        // 2. Student
        const studentId = uuidv4();
        const student = new Student({
            studentId: studentId,
            studentName: "Fahad",
            studentEmail: "fahad@test.com",
            studentPassword: "12345678",
            studentAge: 15,
            studentRollNo: 101,
            studentGender: "Male",
            studentRole: "student"
        });
        await student.save();
        console.log("Added Student: Fahad");

        // 3. Parent
        const parent = new Parent({
            parentId: uuidv4(),
            studentId: studentId,
            parentName: "xyz",
            parentEmail: "xyz@test.com",
            parentPassword: "12345678",
            parentPhone: 0000000000,
            parentAddress: "N/A",
            parentRole: "parent"
        });
        await parent.save();
        console.log("Added Parent: xyz");

        // 4. Admin
        const admin = new Admin({
            adminId: uuidv4(),
            adminName: "amir",
            adminEmail: "amir@test.com",
            adminPassword: "12345678",
            adminPhone: 0000000000
        });
        await admin.save();
        console.log("Added Admin: amir");

        console.log("Done seeding.");
        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

seed();
