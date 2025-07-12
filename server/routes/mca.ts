import { Router } from 'express';
import { authenticateToken } from '../auth';
import { db } from '../db';
import { auditLogger } from '../auditLogger';

const router = Router();

// MCA CPD Progress tracking
interface CPDActivity {
  id: string;
  doctorId: number;
  activityType: 'patient_outcome' | 'compliance_review' | 'data_analysis' | 'reflection';
  title: string;
  description: string;
  hoursEarned: number;
  completedDate?: Date;
  status: 'pending' | 'completed' | 'verified';
  patientIds?: number[];
  outcomeData?: any;
}

// Get doctor's CPD progress
router.get('/cpd-progress/:doctorId', authenticateToken, async (req, res) => {
  try {
    const { doctorId } = req.params;
    const requestingUserId = (req as any).user.id;

    // Ensure doctor can only access their own data or admin access
    if (parseInt(doctorId) !== requestingUserId && (req as any).user.role !== 'admin') {
      await auditLogger.logSecurityEvent({
        eventType: 'UNAUTHORIZED_ACCESS',
        severity: 'HIGH',
        userId: requestingUserId,
        targetUserId: parseInt(doctorId),
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || '',
        details: { 
          action: 'access_cpd_progress',
          reason: 'unauthorized_doctor_data_access'
        }
      });
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get CPD activities from database
    // This would be a real database query in production
    const mockCPDData = {
      totalHours: 2.5,
      requiredHours: 5.0,
      completedActivities: 3,
      patientsEnrolled: 8,
      monthsActive: 1.2,
      certificateEligible: false,
      activities: [
        {
          id: '1',
          activityType: 'patient_outcome',
          title: 'Patient Outcome Measurement',
          description: 'Review and analyze patient progress data from KGC PWA usage',
          hoursEarned: 1.0,
          completedDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          status: 'completed'
        },
        {
          id: '2',
          activityType: 'compliance_review',
          title: 'Medication Compliance Analysis',
          description: 'Audit patient medication adherence patterns and outcomes',
          hoursEarned: 0.5,
          completedDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
          status: 'completed'
        }
      ]
    };

    await auditLogger.logDataAccess({
      userId: parseInt(doctorId),
      accessedBy: requestingUserId,
      dataType: 'cpd_progress',
      action: 'read',
      isAdminAccess: false,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') || ''
    });

    res.json(mockCPDData);
  } catch (error) {
    console.error('Error fetching CPD progress:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Record CPD activity completion
router.post('/cpd-activity', authenticateToken, async (req, res) => {
  try {
    const { activityType, title, description, hoursEarned, patientIds, outcomeData } = req.body;
    const doctorId = (req as any).user.id;

    // Validate input
    if (!activityType || !title || !hoursEarned) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const activity: CPDActivity = {
      id: crypto.randomUUID(),
      doctorId,
      activityType,
      title,
      description,
      hoursEarned,
      completedDate: new Date(),
      status: 'completed',
      patientIds,
      outcomeData
    };

    // In production, save to database
    // await db.insert(cpdActivities).values(activity);

    await auditLogger.logDataAccess({
      userId: doctorId,
      accessedBy: doctorId,
      dataType: 'cpd_activity',
      action: 'write',
      isAdminAccess: false,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') || ''
    });

    res.json({ 
      success: true, 
      activity,
      message: 'CPD activity recorded successfully'
    });
  } catch (error) {
    console.error('Error recording CPD activity:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate MCA access token
router.post('/generate-mca-token', authenticateToken, async (req, res) => {
  try {
    const doctorId = (req as any).user.id;
    const { returnUrl } = req.body;

    // Generate secure token for MCA access
    const tokenPayload = {
      doctorId,
      timestamp: Date.now(),
      source: 'kgc-dashboard',
      cpdProgram: 'measuring-outcomes',
      sessionId: crypto.randomUUID(),
      returnUrl: returnUrl || req.get('origin')
    };

    // In production, this should be properly signed with JWT
    const token = Buffer.from(JSON.stringify(tokenPayload)).toString('base64');

    await auditLogger.logSecurityEvent({
      eventType: 'DATA_ACCESS',
      severity: 'LOW',
      userId: doctorId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') || '',
      details: {
        action: 'generate_mca_token',
        cpdProgram: 'measuring-outcomes',
        sessionId: tokenPayload.sessionId
      }
    });

    res.json({ 
      token,
      mcaUrl: process.env.MCA_URL || 'https://mca.keepgoingcare.com',
      expiresIn: 3600 // 1 hour
    });
  } catch (error) {
    console.error('Error generating MCA token:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get patient outcome data for MCA
router.get('/patient-outcomes/:doctorId', authenticateToken, async (req, res) => {
  try {
    const { doctorId } = req.params;
    const requestingUserId = (req as any).user.id;

    // Ensure doctor can only access their own patient data
    if (parseInt(doctorId) !== requestingUserId && (req as any).user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Mock patient outcome data for MCA analysis
    const outcomeData = {
      totalPatients: 8,
      activePatients: 7,
      averageHealthScore: 8.5,
      improvementRate: 85, // percentage
      complianceRate: 92, // percentage
      outcomes: {
        medication: {
          adherenceRate: 92,
          improvementInAdherence: 23
        },
        exercise: {
          complianceRate: 78,
          averageScoreImprovement: 2.1
        },
        diet: {
          complianceRate: 81,
          averageScoreImprovement: 1.8
        }
      },
      insights: [
        'Patients using KGC PWA show 23% better outcomes vs. standard care',
        'Daily self-scoring correlates strongly with clinical improvements',
        'Gamification features increase long-term engagement by 34%',
        'Early intervention alerts reduce emergency visits by 18%'
      ]
    };

    await auditLogger.logDataAccess({
      userId: parseInt(doctorId),
      accessedBy: requestingUserId,
      dataType: 'patient_outcomes',
      action: 'read',
      isAdminAccess: false,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') || ''
    });

    res.json(outcomeData);
  } catch (error) {
    console.error('Error fetching patient outcomes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate CPD certificate
router.post('/generate-certificate', authenticateToken, async (req, res) => {
  try {
    const doctorId = (req as any).user.id;
    
    // Check if doctor has completed required 5 hours
    // This would check the database in production
    const totalHours = 5.0; // Mock data
    
    if (totalHours < 5.0) {
      return res.status(400).json({ 
        error: 'Insufficient CPD hours completed',
        required: 5.0,
        completed: totalHours
      });
    }

    const certificate = {
      certificateId: crypto.randomUUID(),
      doctorId,
      program: 'Measuring Outcomes',
      hoursCompleted: totalHours,
      issueDate: new Date(),
      validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      accreditationBody: 'Keep Going Care CPD Program',
      certificateUrl: `${req.get('origin')}/certificates/${crypto.randomUUID()}.pdf`
    };

    await auditLogger.logDataAccess({
      userId: doctorId,
      accessedBy: doctorId,
      dataType: 'cpd_certificate',
      action: 'write',
      isAdminAccess: false,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') || ''
    });

    res.json(certificate);
  } catch (error) {
    console.error('Error generating certificate:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;