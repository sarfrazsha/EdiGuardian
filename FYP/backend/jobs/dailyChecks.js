const cron = require('node-cron');
const Fee = require('../models/fee');
const HomeworkSubmission = require('../models/homework_submission');
const { notifyFeeOverdue, notifyHomeworkLate } = require('../services/notifications');

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
    console.log('[dailyChecks] Running overdue fee / late homework scan...');
    const [fees, homework] = await Promise.all([
        checkOverdueFees().catch(err => {
            console.error('[dailyChecks] Fee check failed:', err.message);
            return { checked: 0, sent: 0, error: err.message };
        }),
        checkLateHomework().catch(err => {
            console.error('[dailyChecks] Homework check failed:', err.message);
            return { checked: 0, sent: 0, error: err.message };
        })
    ]);
    console.log(`[dailyChecks] Fees: ${fees.sent}/${fees.checked} notified. Homework: ${homework.sent}/${homework.checked} notified.`);
    return { fees, homework };
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
