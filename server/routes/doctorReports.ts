import { Router } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../auth';
import { db } from '../db';
import * as schema from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { secureLog } from '../services/privacyMiddleware';
import {
    generatePatientProgressReport,
    getPatientProgressReports,
    sharePatientProgressReport
} from '../services/pprService';

const doctorReportsRouter = Router();

doctorReportsRouter.use(authMiddleware(['doctor'])); // Ensure only doctors can access these

// POST /api/doctor/reports - Generates a new Patient Progress Report
// Changed path to /reports to avoid conflict if /report is used for single report ops
doctorReportsRouter.post('/', async (req: AuthenticatedRequest, res) => {
    const { patientId } = req.body; // This is the users.id of the patient
    const doctorUserId = req.user!.userId;

    if (!patientId) {
        return res.status(400).json({ message: 'Patient ID (users.id) is required.' });
    }

    try {
        const report = await generatePatientProgressReport(parseInt(patientId), doctorUserId);
        res.status(201).json(report);
    } catch (error: any) {
        console.error("Error in POST /api/doctor/reports:", error);
        secureLog('error', 'PPR generation failed', { patientId, doctorId: doctorUserId, errorMessage: error.message });
        res.status(500).json({ message: 'Failed to generate patient progress report.', error: error.message });
    }
});

// GET /api/doctor/reports/patient/:patientId - Fetches existing reports for a patient
doctorReportsRouter.get('/patient/:patientId', async (req: AuthenticatedRequest, res) => {
    const { patientId: targetPatientUserIdStr } = req.params;
    const targetPatientUserId = parseInt(targetPatientUserIdStr);
    const doctorUserId = req.user!.userId;

    try {
        const doctor = await db.query.doctors.findFirst({ where: eq(schema.doctors.userId, doctorUserId) });
        if (!doctor) return res.status(404).json({ message: "Doctor record not found." });

        const patient = await db.query.patients.findFirst({
            where: and(
                eq(schema.patients.userId, targetPatientUserId),
                eq(schema.patients.doctorId, doctor.id)
            )
        });
        if (!patient) return res.status(403).json({ message: "Access denied to this patient's reports." });

        const reports = await getPatientProgressReports(targetPatientUserId); // Uses users.id
        res.json(reports);
    } catch (error: any) {
        console.error("Error fetching reports for patient:", error);
        secureLog('error', 'Failed to fetch patient progress reports for doctor', { targetPatientUserId, doctorUserId, error: error.message });
        res.status(500).json({ message: 'Failed to fetch patient progress reports.', error: error.message });
    }
});

// PATCH /api/doctor/reports/:reportId/share - Shares/unshares a report
doctorReportsRouter.patch('/:reportId/share', async (req: AuthenticatedRequest, res) => {
    const { reportId } = req.params;
    const { shared } = req.body;
    const doctorUserId = req.user!.userId;

    if (typeof shared !== 'boolean') {
        return res.status(400).json({ message: 'Shared status (boolean) is required.' });
    }

    try {
        const reportToUpdate = await db.query.patientProgressReports.findFirst({
            where: eq(schema.patientProgressReports.id, parseInt(reportId)),
        });

        if (!reportToUpdate) return res.status(404).json({ message: "Report not found." });

        // Verify the doctor created this report or is assigned to the patient of this report
        // This check assumes reportToUpdate.createdById is the doctor's users.id
        if (reportToUpdate.createdById !== doctorUserId) {
             return res.status(403).json({ message: "Access denied to modify this report's share status." });
        }

        const updatedReport = await sharePatientProgressReport(parseInt(reportId), shared);
        res.json(updatedReport);
    } catch (error: any) {
        console.error("Error updating report share status:", error);
        secureLog('error', 'Failed to update report share status', { reportId, shared, doctorUserId, error: error.message });
        res.status(500).json({ message: 'Failed to update report share status.', error: error.message });
    }
});

export default doctorReportsRouter;
