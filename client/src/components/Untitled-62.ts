import { db } from '../db';
import * as schema from '@shared/schema';
import { eq, and, lt, inArray, ne } from 'drizzle-orm';

class AlertService {

  /**
   * Checks for patients who have not submitted their daily scores in the last 24 hours
   * and updates their alert status to 'inactive'. It also resets the status for patients
   * who have become active again.
   * 
   * This is designed to be run periodically by a scheduler (e.g., a cron job or AWS Lambda).
   */
  public async checkPatientInactivity(): Promise<{ updatedCount: number; checkedCount: number }> {
    console.log('Running patient inactivity check...');

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // 1. Find all active patients who are not already in an emergency state.
    // We fetch them with their latest health metric submission.
    const activePatients = await db.query.patients.findMany({
      where: and(
        eq(schema.patients.isActive, true),
        ne(schema.patients.alertStatus, 'emergency')
      ),
      columns: {
        id: true,
      },
      with: {
        healthMetrics: {
          orderBy: (metrics, { desc }) => [desc(metrics.date)],
          limit: 1,
          columns: {
            date: true,
          }
        }
      }
    });

    if (activePatients.length === 0) {
      console.log('No active patients to check.');
      return { updatedCount: 0, checkedCount: 0 };
    }

    const inactivePatientIds: number[] = [];
    const recentlyActivePatientIds: number[] = [];

    // 2. Partition patients into active and inactive lists based on their last submission.
    for (const patient of activePatients) {
      const lastSubmissionDate = patient.healthMetrics[0]?.date;
      if (!lastSubmissionDate || lastSubmissionDate < twentyFourHoursAgo) {
        inactivePatientIds.push(patient.id);
      } else {
        recentlyActivePatientIds.push(patient.id);
      }
    }

    let updatedCount = 0;

    // 3. Batch update newly inactive patients to 'inactive' status.
    if (inactivePatientIds.length > 0) {
      const result = await db.update(schema.patients)
        .set({ alertStatus: 'inactive', updatedAt: new Date() })
        .where(and(inArray(schema.patients.id, inactivePatientIds), ne(schema.patients.alertStatus, 'inactive')));
      updatedCount += result.rowCount;
      console.log(`Marked ${result.rowCount} patients as inactive.`);
    }

    // 4. Batch update recently active patients back to 'ok' status.
    if (recentlyActivePatientIds.length > 0) {
        const result = await db.update(schema.patients)
            .set({ alertStatus: 'ok', updatedAt: new Date() })
            .where(and(inArray(schema.patients.id, recentlyActivePatientIds), ne(schema.patients.alertStatus, 'ok')));
        updatedCount += result.rowCount;
        console.log(`Reset ${result.rowCount} patients to 'ok' status.`);
    }

    console.log(`Inactivity check complete. Checked ${activePatients.length} patients, updated status for ${updatedCount}.`);
    return { updatedCount, checkedCount: activePatients.length };
  }
}

export const alertService = new AlertService();

/*
  // --- SCHEDULING EXAMPLE (using node-cron) ---
  // This would typically live in your main server entry file (e.g., server.ts)

  import cron from 'node-cron';
  import { alertService } from './services/alertService';

  // Schedule the task to run once every hour
  cron.schedule('0 * * * *', () => {
    console.log('Triggering scheduled patient inactivity check...');
    alertService.checkPatientInactivity().catch(error => {
      console.error('Scheduled inactivity check failed:', error);
    });
  });
*/