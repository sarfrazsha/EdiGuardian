const cron = require('node-cron');
const Fee = require('../models/fee');
const HomeworkSubmission = require('../models/homework_submission');
const { notifyFeeOverdue, notifyFeeDueTomorrow, notifyHomeworkLate } = require('../services/notifications');

// Fee vouchers whose dueDate has passed and are still unpaid, and that have not
// already been emailed. Sent once per voucher, not repeated every day.
async function checkOverdueFees() {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const fees = await Fee.find({
        status: 'Pending',
        overdueNotifiedAt: null
    }).lean();

    const overdue = fees.filter(f => {
        const due = new Date(f.dueDate);
        return !Number.isNaN(due.getTime()) && due < startOfToday;
    });

    let sent = 0;
    for (const fee of overdue) {
        try {
            await notifyFeeOverdue(fee);
            await Fee.updateOne({ _id: fee._id }, { $set: { overdueNotifiedAt: new Date() } });
            sent++;
        } catch (err) {
            console.error(`[dailyChecks] Failed to notify overdue fee ${fee._id}:`, err.message);
        }
    }
    return { checked: fees.length, sent };
}

// dueDate is stored as a "YYYY-MM-DD" string. `new Date("YYYY-MM-DD")` is UTC
// midnight, so parse it as a local calendar date to compare whole days.
function parseLocalDate(value) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ''));
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    d.setHours(0, 0, 0, 0);
    return d;
}

// Unpaid vouchers due tomorrow get a one-time reminder. Vouchers due today are
// included too, so a reminder isn't lost if the job didn't run yesterday
// (server down) or the voucher was issued with a due date of tomorrow after
// today's run.
async function checkFeesDueTomorrow() {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

    const fees = await Fee.find({
        status: 'Pending',
        dueReminderSentAt: null
    }).lean();

    const dueSoon = fees.filter(f => {
        const due = parseLocalDate(f.dueDate);
        return due && due >= startOfToday && due <= startOfTomorrow;
    });

    let sent = 0;
    for (const fee of dueSoon) {
        try {
            const result = await notifyFeeDueTomorrow(fee);
            if (result && result.sent) {
                await Fee.updateOne({ _id: fee._id }, { $set: { dueReminderSentAt: new Date() } });
                sent++;
            }
        } catch (err) {
            console.error(`[dailyChecks] Failed to send due reminder for fee ${fee._id}:`, err.message);
        }
    }
    return { checked: dueSoon.length, sent };
}

// Homework submissions still Pending after the homework's dueDate has passed,
// that have not already been emailed. Sent once per submission.
async function checkLateHomework() {
    const now = new Date();

    const submissions = await HomeworkSubmission.find({
        status: 'Pending',
        lateNotifiedAt: null
    }).populate('homeworkId').lean();

    const late = submissions.filter(s => s.homeworkId && new Date(s.homeworkId.dueDate) < now);

    let sent = 0;
    for (const sub of late) {
        try {
            await notifyHomeworkLate({
                studentId: sub.studentId,
                studentName: sub.studentName,
                classNo: sub.classNo,
                homeworkTitle: sub.homeworkId.title,
                subject: sub.homeworkId.subject,
                dueDate: sub.homeworkId.dueDate
            });
            await HomeworkSubmission.updateOne({ _id: sub._id }, { $set: { lateNotifiedAt: new Date() } });
            sent++;
        } catch (err) {
            console.error(`[dailyChecks] Failed to notify late homework submission ${sub._id}:`, err.message);
        }
    }
    return { checked: submissions.length, sent };
}

async function runDailyChecks() {
    console.log('[dailyChecks] Running fee reminder / overdue fee / late homework scan...');
    const [dueReminders, fees, homework] = await Promise.all([
        checkFeesDueTomorrow().catch(err => {
            console.error('[dailyChecks] Fee due-reminder check failed:', err.message);
            return { checked: 0, sent: 0, error: err.message };
        }),
        checkOverdueFees().catch(err => {
            console.error('[dailyChecks] Fee check failed:', err.message);
            return { checked: 0, sent: 0, error: err.message };
        }),
        checkLateHomework().catch(err => {
            console.error('[dailyChecks] Homework check failed:', err.message);
            return { checked: 0, sent: 0, error: err.message };
        })
    ]);
    console.log(`[dailyChecks] Due reminders: ${dueReminders.sent}/${dueReminders.checked} sent. Overdue fees: ${fees.sent}/${fees.checked} notified. Homework: ${homework.sent}/${homework.checked} notified.`);
    return { dueReminders, fees, homework };
}

// Runs once a day. Also exported standalone so an admin route can trigger it
// on demand (useful for testing without waiting for the schedule).
function scheduleDailyChecks() {
    const timezone = process.env.CRON_TIMEZONE || 'Asia/Karachi';
    cron.schedule('0 7 * * *', () => {
        runDailyChecks().catch(err => console.error('[dailyChecks] Unhandled error:', err));
    }, { timezone });
    console.log(`[dailyChecks] Scheduled daily at 07:00 (${timezone}).`);
}

module.exports = { runDailyChecks, scheduleDailyChecks };
