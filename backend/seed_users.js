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

        // 1. Teachers
        const teachers = [
            { name: "Respected Naeem Akhter", email: "naeem@gmail.com", contact: "03001234567" },
            { name: "Respected Saleem Akhter", email: "saleem@gmail.com", contact: "03001234568" },
            { name: "Respected Qari Illyas Shb", email: "illyas@gmail.com", contact: "03001234569" }
        ];
        for (const t of teachers) {
            await new Teacher({
                teacher_id: uuidv4(),
                teacherName: t.name,
                teacherEmail: t.email,
                teacherPassword: "12345678",
                teacherContact: t.contact,
                teacherClass: "General",
                teacherAddress: "N/A",
                role: "teacher"
            }).save();
            console.log("Added Teacher: " + t.name);
        }

        // 2. Students & 3. Parents
        const students = [
            { name: "Abdul Basit", email: "abdul@gmail.com" },
            { name: "M Muntaha", email: "muntaha@gmail.com" },
            { name: "M Sharafat", email: "sharafat@gmail.com" },
            { name: "M Qasim", email: "qasim@gmail.com" }
        ];
        
        for (const s of students) {
            const studentId = uuidv4();
            await new Student({
                studentId: studentId,
                studentName: s.name,
                studentEmail: s.email,
                studentPassword: "12345678",
                studentAge: 15,
                studentRollNo: 100 + Math.floor(Math.random() * 1000),
                studentGender: "Male",
                studentRole: "student"
            }).save();
            console.log("Added Student: " + s.name);

            await new Parent({
                parentId: uuidv4(),
                studentId: studentId,
                parentName: s.name + " Parent",
                parentEmail: "parent" + s.email,
                parentPassword: "12345678",
                parentPhone: "0300" + Math.floor(1000000 + Math.random() * 9000000), // exactly 11 char strings
                parentAddress: "N/A",
                parentRole: "parent"
            }).save();
            console.log("Added Parent for: " + s.name);
        }

        // 4. Admin
        const admin = new Admin({
            adminId: uuidv4(),
            adminName: "amir",
            adminEmail: "amir@gmail.com",
            adminPassword: "12345678",
            adminPhone: 3000000000 // Admin phone is still Number in schema probably
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
