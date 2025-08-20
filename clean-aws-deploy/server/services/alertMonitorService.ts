/**
 * Alert Monitor Service - Daily Engagement Monitoring for KGC
 * 
 * This service monitors patient engagement and creates alerts for doctors when:
 * 1. Patients fail to submit daily self-scores after 24 hours
 * 2. Extended periods of inactivity (multiple days missed)
 * 3. Sends 7:00 PM reminders to patients who haven't submitted scores
 */

import { storage } from "../storage";
import { eq, and, desc, lte, sql } from "drizzle-orm";
import { db } from "../db";
import { 
  users, 
  patientScores, 
  patientAlerts, 
  patientReminders,
  dashboardRelationships 
} from "@shared/schema";

export class AlertMonitorService {
  private static instance: AlertMonitorService;
  
  private constructor() {}
  
  public static getInstance(): AlertMonitorService {
    if (!AlertMonitorService.instance) {
      AlertMonitorService.instance = new AlertMonitorService();
    }
    return AlertMonitorService.instance;
  }

  /**
   * Check for patients who haven't submitted daily scores in the last 24 hours
   * Creates alerts for their assigned doctors
   */
  async checkMissedDailyScores(): Promise<void> {
    try {
      console.log('[Alert Monitor] Checking for missed daily scores...');
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      const today = new Date().toISOString().split('T')[0];

      // Get all patients who should have submitted scores but haven't
      const patientsWithoutScores = await db
        .select({
          patientId: users.id,
          patientName: users.name,
          doctorId: dashboardRelationships.parentUserId,
        })
        .from(users)
        .innerJoin(dashboardRelationships, eq(users.id, dashboardRelationships.childUserId))
        .leftJoin(
          patientScores, 
          and(
            eq(patientScores.patientId, users.id),
            eq(sql`DATE(${patientScores.scoreDate})`, today)
          )
        )
        .where(
          and(
            eq(users.roleId, 3), // Patient role
            eq(users.isActive, true),
            eq(dashboardRelationships.relationshipType, 'doctor-patient'),
            eq(dashboardRelationships.active, true),
            sql`${patientScores.id} IS NULL` // No score submitted today
          )
        );

      console.log(`[Alert Monitor] Found ${patientsWithoutScores.length} patients without daily scores`);

      for (const patient of patientsWithoutScores) {
        // Check if alert already exists for today
        const existingAlert = await db.select()
          .from(patientAlerts)
          .where(and(
            eq(patientAlerts.patientId, patient.patientId),
            eq(patientAlerts.doctorId, patient.doctorId),
            eq(patientAlerts.alertType, 'daily_scores_missing'),
            sql`DATE(${patientAlerts.createdAt}) = CURRENT_DATE`
          ))
          .limit(1);

        if (existingAlert.length === 0) {
          // Calculate consecutive days missed
          const daysMissed = await this.calculateConsecutiveDaysMissed(patient.patientId);
          
          // Create alert for doctor
          await storage.createPatientAlert({
            patientId: patient.patientId,
            doctorId: patient.doctorId,
            alertType: 'daily_scores_missing',
            alertMessage: `${patient.patientName} has not submitted daily health scores today. This is day ${daysMissed} of missed submissions.`,
            daysMissed: daysMissed
          });

          console.log(`[Alert Monitor] Created alert for patient ${patient.patientName} (${daysMissed} days missed)`);
        }
      }
    } catch (error) {
      console.error('[Alert Monitor] Error checking missed daily scores:', error);
    }
  }

  /**
   * Calculate how many consecutive days a patient has missed submitting scores
   */
  private async calculateConsecutiveDaysMissed(patientId: number): Promise<number> {
    const today = new Date();
    let daysMissed = 0;
    
    // Check backwards from today to count consecutive missed days
    for (let i = 0; i < 30; i++) { // Check up to 30 days back
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      const dateStr = checkDate.toISOString().split('T')[0];
      
      const [score] = await db.select()
        .from(patientScores)
        .where(and(
          eq(patientScores.patientId, patientId),
          eq(sql`DATE(${patientScores.scoreDate})`, dateStr)
        ))
        .limit(1);
        
      if (!score) {
        daysMissed++;
      } else {
        break; // Found a submission, stop counting
      }
    }
    
    return Math.max(daysMissed, 1); // At least 1 day missed (today)
  }

  /**
   * Send 7:00 PM reminder notifications to patients who haven't submitted scores
   */
  async send7PMReminders(): Promise<void> {
    try {
      console.log('[Alert Monitor] Checking for 7:00 PM reminders...');
      
      const today = new Date().toISOString().split('T')[0];
      const currentTime = new Date();
      const currentHour = currentTime.getHours();
      
      // Only run this check at or after 7:00 PM (19:00)
      if (currentHour < 19) {
        return;
      }
      
      // Get patients who haven't submitted scores today
      const patientsNeedingReminders = await db
        .select({
          patientId: users.id,
          patientName: users.name,
        })
        .from(users)
        .leftJoin(
          patientScores, 
          and(
            eq(patientScores.patientId, users.id),
            eq(sql`DATE(${patientScores.scoreDate})`, today)
          )
        )
        .where(
          and(
            eq(users.roleId, 3), // Patient role
            eq(users.isActive, true),
            sql`${patientScores.id} IS NULL` // No score submitted today
          )
        );

      for (const patient of patientsNeedingReminders) {
        // Check if reminder already sent today
        const existingReminder = await db.select()
          .from(patientReminders)
          .where(and(
            eq(patientReminders.patientId, patient.patientId),
            eq(sql`DATE(${patientReminders.reminderDate})`, today),
            eq(patientReminders.reminderType, 'daily_scores')
          ))
          .limit(1);

        if (existingReminder.length === 0) {
          // Create reminder record
          const reminder = await storage.createPatientReminder({
            patientId: patient.patientId,
            reminderType: 'daily_scores',
            reminderDate: today,
            reminderTime: '19:00'
          });

          // Mark as sent (in a real implementation, this would trigger a toast/notification)
          await storage.markReminderAsSent(reminder.id);
          
          console.log(`[Alert Monitor] Created 7PM reminder for patient ${patient.patientName}`);
          
          // In a real implementation, you would trigger the actual toast notification here
          // For now, we'll just log that the reminder should be sent
          await this.triggerPatientReminderToast(patient.patientId, patient.patientName);
        }
      }
    } catch (error) {
      console.error('[Alert Monitor] Error sending 7PM reminders:', error);
    }
  }

  /**
   * Trigger a toast reminder for a patient (simulation)
   * In production, this would integrate with WebSocket/push notifications
   */
  private async triggerPatientReminderToast(patientId: number, patientName: string): Promise<void> {
    // This is where you'd integrate with your real-time notification system
    // For now, we'll create a log entry that the frontend could potentially poll
    console.log(`[Alert Monitor] Toast reminder triggered for patient ${patientName}: "Don't forget to submit your daily health scores! It only takes 2 minutes."`);
    
    // In a real system, you might:
    // 1. Send via WebSocket to active patient sessions
    // 2. Queue for next login if patient is offline
    // 3. Send SMS via Twilio if critically important
    // 4. Store in a notifications table for the frontend to poll
  }

  /**
   * Start the monitoring service with scheduled checks
   */
  startMonitoring(): void {
    console.log('[Alert Monitor] Starting patient engagement monitoring...');
    
    // Check for missed daily scores every hour
    setInterval(() => {
      this.checkMissedDailyScores();
    }, 60 * 60 * 1000); // Every hour
    
    // Check for 7PM reminders every 15 minutes during evening hours
    setInterval(() => {
      this.send7PMReminders();
    }, 15 * 60 * 1000); // Every 15 minutes
    
    // Run initial checks
    setTimeout(() => {
      this.checkMissedDailyScores();
      this.send7PMReminders();
    }, 5000); // Wait 5 seconds after startup
  }
}

// Export singleton instance
export const alertMonitorService = AlertMonitorService.getInstance();