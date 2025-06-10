import { db } from '../db';
import { patientScores, doctorPatients, doctorAlerts, users } from '@shared/schema';
import { eq, and, lt, gte, desc, sql } from 'drizzle-orm';
import { emailService } from './emailService';

/**
 * Patient Alert Service
 * Used to check and create alerts for patients who have not submitted self-scores 
 * in a specified time period (e.g., 24 hours)
 */
class PatientAlertService {
  /**
   * Check for patients who haven't submitted scores in the last 24 hours
   * and create alerts for their doctors
   */
  async checkMissingScores() {
    try {
      // Get the date 24 hours ago
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
      
      // Format date for SQL query
      const formattedDate = twentyFourHoursAgo.toISOString().split('T')[0];
      
      // Find active doctor-patient relationships
      const doctorPatientRelations = await db.select({
        doctorId: doctorPatients.doctorId,
        patientId: doctorPatients.patientId,
      })
      .from(doctorPatients)
      .where(eq(doctorPatients.active, true));
      
      // No relationships found
      if (doctorPatientRelations.length === 0) {
        console.log('No active doctor-patient relationships found');
        return;
      }
      
      // For each relationship, check if the patient has submitted scores in the last 24 hours
      for (const relation of doctorPatientRelations) {
        const { doctorId, patientId } = relation;
        
        // Get the patient's most recent score
        const recentScores = await db.select()
          .from(patientScores)
          .where(eq(patientScores.patientId, patientId))
          .orderBy(desc(patientScores.scoreDate))
          .limit(1);
          
        const hasRecentScore = recentScores.length > 0 && 
          new Date(recentScores[0].scoreDate) >= twentyFourHoursAgo;
        
        // If no recent score, create an alert
        if (!hasRecentScore) {
          // Get patient details to include in the alert
          const [patient] = await db.select({
            name: users.name,
            uin: users.uin
          })
          .from(users)
          .where(eq(users.id, patientId));
          
          if (!patient) {
            console.error(`Patient with ID ${patientId} not found`);
            continue;
          }
          
          // Check if an alert already exists for this patient
          const existingAlerts = await db.select()
            .from(doctorAlerts)
            .where(
              and(
                eq(doctorAlerts.doctorId, doctorId),
                eq(doctorAlerts.patientId, patientId),
                eq(doctorAlerts.alertType, 'missing_scores'),
                eq(doctorAlerts.read, false),
                eq(doctorAlerts.deleted, false),
                gte(doctorAlerts.createdAt, twentyFourHoursAgo)
              )
            );
          
          // If no existing alert, create one
          if (existingAlerts.length === 0) {
            // Create message for the alert
            const message = `Check if ${patient.name} ${patient.uin ? `(${patient.uin})` : ''} is ok. They haven't submitted a self-score in the past 24 hours.`;
            
            // Insert the alert
            const [alert] = await db.insert(doctorAlerts)
              .values({
                doctorId,
                patientId,
                alertType: 'missing_scores',
                message,
                read: false,
                deleted: false
              })
              .returning();
              
            console.log(`Created alert for doctor ${doctorId} about patient ${patientId}: ${message}`);
            
            // Get doctor details for email notification
            const [doctor] = await db.select({
              name: users.name,
              email: users.email,
              phoneNumber: users.phoneNumber
            })
            .from(users)
            .where(eq(users.id, doctorId));
            
            if (doctor && doctor.email) {
              // For a real implementation, this would send an email through SendGrid or another service
              // For now, we'll just log the intent to send an email
              console.log(`NOTIFICATION - Patient Alert: Would send email to ${doctor.name} (${doctor.email}) about ${patient.name}`);
              console.log(`Email subject: KGC Alert - Patient ${patient.name} missing self-scores`);
              console.log(`Email content: ${message}`);
              
              // In a real-world scenario, we would use SendGrid or similar here
              // await emailService.sendDoctorAlert(doctor.email, patient.name, patient.uin);
            }
          }
        }
      }
      
      console.log('Completed checking for missing patient scores');
      
    } catch (error) {
      console.error('Error checking for missing patient scores:', error);
    }
  }
  
  /**
   * Get all unread alerts for a doctor
   * @param doctorId Doctor ID
   * @returns Array of unread alerts
   */
  async getUnreadAlerts(doctorId: number) {
    try {
      const alerts = await db.select({
        id: doctorAlerts.id,
        patientId: doctorAlerts.patientId,
        patientName: users.name,
        patientUin: users.uin,
        alertType: doctorAlerts.alertType,
        message: doctorAlerts.message,
        createdAt: doctorAlerts.createdAt
      })
      .from(doctorAlerts)
      .leftJoin(users, eq(doctorAlerts.patientId, users.id))
      .where(
        and(
          eq(doctorAlerts.doctorId, doctorId),
          eq(doctorAlerts.read, false),
          eq(doctorAlerts.deleted, false)
        )
      )
      .orderBy(desc(doctorAlerts.createdAt));
      
      return alerts;
    } catch (error) {
      console.error('Error getting unread alerts:', error);
      return [];
    }
  }
  
  /**
   * Get a count of unread alerts for a doctor
   * @param doctorId Doctor ID
   * @returns Count of unread alerts
   */
  async getUnreadAlertCount(doctorId: number) {
    try {
      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(doctorAlerts)
        .where(
          and(
            eq(doctorAlerts.doctorId, doctorId),
            eq(doctorAlerts.read, false),
            eq(doctorAlerts.deleted, false)
          )
        );
      
      return result[0]?.count || 0;
    } catch (error) {
      console.error('Error getting unread alert count:', error);
      return 0;
    }
  }
  
  /**
   * Mark an alert as read
   * @param alertId Alert ID
   * @returns True if successful, false otherwise
   */
  async markAlertAsRead(alertId: number) {
    try {
      await db.update(doctorAlerts)
        .set({ read: true })
        .where(eq(doctorAlerts.id, alertId));
      
      return true;
    } catch (error) {
      console.error('Error marking alert as read:', error);
      return false;
    }
  }
  
  /**
   * Delete an alert
   * @param alertId Alert ID
   * @returns True if successful, false otherwise
   */
  async deleteAlert(alertId: number) {
    try {
      await db.update(doctorAlerts)
        .set({ deleted: true })
        .where(eq(doctorAlerts.id, alertId));
      
      return true;
    } catch (error) {
      console.error('Error deleting alert:', error);
      return false;
    }
  }
}

export const patientAlertService = new PatientAlertService();
export default patientAlertService;