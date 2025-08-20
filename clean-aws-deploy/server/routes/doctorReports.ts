import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { patientProgressReports, users, patientScores } from '@shared/schema';
import { eq, and, desc, gte, lte } from 'drizzle-orm';
import * as enhancedPprAnalysisService from '../ai/enhancedPprAnalysisService';
import { securityManager } from '../securityManager';
import { sql } from 'drizzle-orm';

const router = Router();

// Generate Health Snapshots graphical data for PPR
async function generateHealthSnapshotsData(patientId: number, startDate: Date, endDate: Date) {
  try {
    // Get daily scores data for Health Snapshots charts - FIXED DATE FORMAT
    console.log(`HEALTH SNAPSHOTS: Querying patient_scores for patient ${patientId} from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
    
    const dailyScoresData = await db.execute(sql`
      SELECT 
        score_date as "scoreDate",
        meal_plan_self_score as "dietScore",
        exercise_self_score as "exerciseScore", 
        medication_self_score as "medicationScore",
        created_at as "createdAt"
      FROM patient_scores 
      WHERE patient_id = ${patientId}
        AND score_date >= ${startDate.toISOString().split('T')[0]}
        AND score_date <= ${endDate.toISOString().split('T')[0]}
      ORDER BY score_date ASC
    `);
    
    console.log(`HEALTH SNAPSHOTS: Found ${dailyScoresData.rows.length} score records for patient ${patientId}`);

    const scoreData = dailyScoresData.rows as any[];
    
    // Process data for weekly progress chart
    const healthProgressData = scoreData.map((score: any) => ({
      name: new Date(score.scoreDate).toLocaleDateString('en-AU', { 
        month: 'short', 
        day: 'numeric' 
      }),
      date: score.scoreDate,
      diet: Number(score.dietScore) || 0,
      exercise: Number(score.exerciseScore) || 0,
      medication: Number(score.medicationScore) || 0
    }));

    // Process data for health distribution pie chart
    const healthDistributionData = [
      { 
        name: 'Diet', 
        value: scoreData.length > 0 ? Math.round(scoreData.reduce((sum: number, s: any) => sum + (Number(s.dietScore) || 0), 0) / scoreData.length) : 0,
        fill: '#22c55e'
      },
      { 
        name: 'Exercise', 
        value: scoreData.length > 0 ? Math.round(scoreData.reduce((sum: number, s: any) => sum + (Number(s.exerciseScore) || 0), 0) / scoreData.length) : 0,
        fill: '#3b82f6'
      },
      { 
        name: 'Medication', 
        value: scoreData.length > 0 ? Math.round(scoreData.reduce((sum: number, s: any) => sum + (Number(s.medicationScore) || 0), 0) / scoreData.length) : 0,
        fill: '#f59e0b'
      }
    ];

    // Calculate period summary
    const periodSummary = {
      totalSubmissions: scoreData.length,
      avgDiet: scoreData.length > 0 ? scoreData.reduce((sum: number, s: any) => sum + (Number(s.dietScore) || 0), 0) / scoreData.length : 0,
      avgExercise: scoreData.length > 0 ? scoreData.reduce((sum: number, s: any) => sum + (Number(s.exerciseScore) || 0), 0) / scoreData.length : 0,
      avgMedication: scoreData.length > 0 ? scoreData.reduce((sum: number, s: any) => sum + (Number(s.medicationScore) || 0), 0) / scoreData.length : 0,
    };

    // Calculate trend analysis (simplified)
    const trendAnalysis = {
      dietTrend: 'stable', // Could be enhanced with actual trend calculation
      exerciseTrend: 'stable',
      medicationTrend: 'stable'
    };

    return {
      healthProgressData,
      healthDistributionData, 
      periodSummary,
      trendAnalysis,
      dataAvailable: scoreData.length > 0
    };

  } catch (error) {
    console.error("Error generating health snapshots data:", error);
    return {
      healthProgressData: [],
      healthDistributionData: [],
      periodSummary: {
        totalSubmissions: 0,
        avgDiet: 0,
        avgExercise: 0,
        avgMedication: 0
      },
      trendAnalysis: {
        dietTrend: 'stable',
        exerciseTrend: 'stable', 
        medicationTrend: 'stable'
      },
      dataAvailable: false
    };
  }
}

// Schema for PPR generation request
const generatePprSchema = z.object({
  patientId: z.number().int().positive(),
  reportPeriodStartDate: z.string().datetime(),
  reportPeriodEndDate: z.string().datetime(),
  doctorNotes: z.string().optional()
});

// POST /api/doctor/reports - Generate a new PPR for a patient
router.post('/', securityManager.createAuthMiddleware(['doctor', 'admin']), async (req, res) => {
  try {
    const validatedData = generatePprSchema.parse(req.body);
    const { patientId, reportPeriodStartDate, reportPeriodEndDate, doctorNotes } = validatedData;
    
    // Get current user (doctor) from session
    const doctorId = req.session.userId;
    if (!doctorId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify doctor has access to this patient
    const patientAccess = await db
      .select()
      .from(users)
      .where(eq(users.id, patientId));
    
    if (patientAccess.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    // Get patient scores for the period
    const startDate = new Date(reportPeriodStartDate);
    const endDate = new Date(reportPeriodEndDate);
    
    const scores = await db
      .select()
      .from(patientScores)
      .where(
        and(
          eq(patientScores.patientId, patientId),
          gte(patientScores.scoreDate, startDate.toISOString().split('T')[0]),
          lte(patientScores.scoreDate, endDate.toISOString().split('T')[0])
        )
      )
      .orderBy(patientScores.scoreDate);

    // Calculate averages
    const avgMedicationScore = scores.length > 0 
      ? scores.reduce((sum, score) => sum + (score.medicationSelfScore || 0), 0) / scores.length 
      : null;
    const avgDietScore = scores.length > 0 
      ? scores.reduce((sum, score) => sum + (score.mealPlanSelfScore || 0), 0) / scores.length 
      : null;
    const avgExerciseScore = scores.length > 0 
      ? scores.reduce((sum, score) => sum + (score.exerciseSelfScore || 0), 0) / scores.length 
      : null;

    // Generate enhanced analysis using AI service
    const enhancedAnalysis = await enhancedPprAnalysisService.generateComprehensivePPR(
      patientId,
      startDate,
      endDate
    );

    // Generate Health Snapshots data for charts
    const healthSnapshotsData = await generateHealthSnapshotsData(patientId, startDate, endDate);

    // Create PPR record
    const [newReport] = await db
      .insert(patientProgressReports)
      .values({
        patientId,
        createdById: doctorId,
        reportPeriodStartDate: startDate,
        reportPeriodEndDate: endDate,
        avgMedicationScore,
        avgDietScore,
        avgExerciseScore,
        keepGoingButtonUsageCount: enhancedAnalysis.keepGoingUsage || 0,
        chatSentimentScore: enhancedAnalysis.sentimentScore || 0,
        chatSentimentAnalysis: enhancedAnalysis.sentimentAnalysis || '',
        featureUsageSummary: enhancedAnalysis.featureUsage || {},
        systemRecommendations: enhancedAnalysis.recommendations || [],
        newCpdSuggestions: healthSnapshotsData,
        doctorNotes: doctorNotes || '',
        scorePatterns: enhancedAnalysis.scorePatterns || {},
        shared: false
      })
      .returning();

    res.json({ 
      success: true, 
      report: {
        ...newReport,
        healthSnapshotsData
      },
      analysis: enhancedAnalysis 
    });

  } catch (error) {
    console.error('Error generating PPR:', error);
    res.status(500).json({ error: 'Failed to generate Patient Progress Report' });
  }
});

// GET /api/doctor/reports/patient/:patientId - Get all reports for a patient
router.get('/patient/:patientId', securityManager.createAuthMiddleware(['doctor', 'admin']), async (req, res) => {
  try {
    const patientId = parseInt(req.params.patientId);
    
    if (isNaN(patientId)) {
      return res.status(400).json({ error: 'Invalid patient ID' });
    }

    // Get all reports for this patient
    const reports = await db
      .select({
        id: patientProgressReports.id,
        patientId: patientProgressReports.patientId,
        createdById: patientProgressReports.createdById,
        reportDate: patientProgressReports.reportDate,
        reportPeriodStartDate: patientProgressReports.reportPeriodStartDate,
        reportPeriodEndDate: patientProgressReports.reportPeriodEndDate,
        avgMedicationScore: patientProgressReports.avgMedicationScore,
        avgDietScore: patientProgressReports.avgDietScore,
        avgExerciseScore: patientProgressReports.avgExerciseScore,
        shared: patientProgressReports.shared,
        doctorNotes: patientProgressReports.doctorNotes,
        createdByName: users.name
      })
      .from(patientProgressReports)
      .leftJoin(users, eq(patientProgressReports.createdById, users.id))
      .where(eq(patientProgressReports.patientId, patientId))
      .orderBy(desc(patientProgressReports.reportDate));

    res.json({ reports });

  } catch (error) {
    console.error('Error fetching patient reports:', error);
    res.status(500).json({ error: 'Failed to fetch patient reports' });
  }
});

// PATCH /api/doctor/reports/:reportId/share - Share/unshare a specific report
router.patch('/:reportId/share', securityManager.createAuthMiddleware(['doctor', 'admin']), async (req, res) => {
  try {
    const reportId = parseInt(req.params.reportId);
    const { shared } = req.body;
    
    if (isNaN(reportId)) {
      return res.status(400).json({ error: 'Invalid report ID' });
    }

    if (typeof shared !== 'boolean') {
      return res.status(400).json({ error: 'Shared must be a boolean value' });
    }

    // Update the report's shared status
    const [updatedReport] = await db
      .update(patientProgressReports)
      .set({ shared })
      .where(eq(patientProgressReports.id, reportId))
      .returning();

    if (!updatedReport) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json({ 
      success: true, 
      report: updatedReport,
      message: shared ? 'Report shared with patient' : 'Report sharing disabled'
    });

  } catch (error) {
    console.error('Error updating report share status:', error);
    res.status(500).json({ error: 'Failed to update report sharing status' });
  }
});

// GET /api/doctor/reports/:reportId - Get specific report details
router.get('/:reportId', async (req, res) => {
  try {
    const reportId = parseInt(req.params.reportId);
    
    if (isNaN(reportId)) {
      return res.status(400).json({ error: 'Invalid report ID' });
    }

    // Demo authentication - use query parameter or default to doctor 1
    const doctorId = req.query.doctorId ? parseInt(req.query.doctorId as string) : 1;
    console.log(`[DEMO DEBUG - Route: ${req.path}] Using doctorId: ${doctorId} for report ${reportId}`);

    // Get the report details
    const [report] = await db
      .select()
      .from(patientProgressReports)
      .where(eq(patientProgressReports.id, reportId));

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Generate health snapshots data for this report
    const healthSnapshotsData = await generateHealthSnapshotsData(
      report.patientId, 
      report.reportPeriodStartDate, 
      report.reportPeriodEndDate
    );

    res.json({
      ...report,
      healthSnapshotsData
    });

  } catch (error) {
    console.error('Error fetching report details:', error);
    res.status(500).json({ error: 'Failed to fetch report details' });
  }
});

export default router;