/**
 * UIN Service - Unlimited Scalable User Identification System
 * 
 * New Format: KGC-[ROLE]-[SEQUENCE]
 * Examples:
 * - Admins: KGC-ADM-001, KGC-ADM-002, KGC-ADM-003, ...
 * - Doctors: KGC-DOC-001, KGC-DOC-002, KGC-DOC-003, ...
 * - Patients: KGC-PAT-001, KGC-PAT-002, KGC-PAT-003, ...
 * 
 * Benefits:
 * - Unlimited scaling (supports millions of users)
 * - Clear role identification
 * - Sequential tracking
 * - Professional healthcare format
 * - Backwards compatible with existing data
 */

import { db } from '../db';
import { users } from '@shared/schema';
import { eq, max, and } from 'drizzle-orm';

export interface UINGenerationResult {
  uin: string;
  sequence: number;
  rolePrefix: string;
}

class UINService {
  private static instance: UINService;
  
  // Role prefixes for the new UIN system
  private readonly ROLE_PREFIXES = {
    admin: 'ADM',
    doctor: 'DOC', 
    patient: 'PAT'
  } as const;

  static getInstance(): UINService {
    if (!UINService.instance) {
      UINService.instance = new UINService();
    }
    return UINService.instance;
  }

  /**
   * Generate a new UIN for unlimited scaling
   * Format: KGC-[ROLE]-[SEQUENCE]
   */
  async generateUIN(roleType: 'admin' | 'doctor' | 'patient'): Promise<UINGenerationResult> {
    const rolePrefix = this.ROLE_PREFIXES[roleType];
    
    // Get the next sequence number for this role
    const nextSequence = await this.getNextSequenceNumber(roleType);
    
    // Format the sequence with leading zeros (3 digits, expandable)
    const sequenceStr = nextSequence.toString().padStart(3, '0');
    
    // Generate the final UIN
    const uin = `KGC-${rolePrefix}-${sequenceStr}`;
    
    return {
      uin,
      sequence: nextSequence,
      rolePrefix
    };
  }

  /**
   * Get the next sequence number for a specific role type
   */
  private async getNextSequenceNumber(roleType: 'admin' | 'doctor' | 'patient'): Promise<number> {
    // Get role ID for filtering
    const roleId = roleType === 'admin' ? 1 : roleType === 'doctor' ? 2 : 3;
    
    // Find the highest sequence number for this role
    const [result] = await db
      .select({ maxSequence: max(users.uinSequence) })
      .from(users)
      .where(eq(users.roleId, roleId));
    
    const currentMax = result?.maxSequence || 0;
    return currentMax + 1;
  }

  /**
   * Validate UIN format
   */
  isValidUIN(uin: string): boolean {
    // New format: KGC-[ROLE]-[SEQUENCE]
    const newFormatRegex = /^KGC-(ADM|DOC|PAT)-\d{3,}$/;
    
    // Legacy format support
    const legacyAdminRegex = /^X1$/;
    const legacyDoctorRegex = /^[A-J]$/;
    const legacyPatientRegex = /^[A-J][1-5]$/;
    const legacyTestRegex = /^TEST(DOC|PAT)\d{3}$/;
    
    return newFormatRegex.test(uin) || 
           legacyAdminRegex.test(uin) || 
           legacyDoctorRegex.test(uin) || 
           legacyPatientRegex.test(uin) ||
           legacyTestRegex.test(uin);
  }

  /**
   * Extract role type from UIN
   */
  getRoleFromUIN(uin: string): 'admin' | 'doctor' | 'patient' | null {
    // New format
    if (uin.startsWith('KGC-ADM-')) return 'admin';
    if (uin.startsWith('KGC-DOC-')) return 'doctor';
    if (uin.startsWith('KGC-PAT-')) return 'patient';
    
    // Legacy format support
    if (uin === 'X1') return 'admin';
    if (/^[A-J]$/.test(uin)) return 'doctor';
    if (/^[A-J][1-5]$/.test(uin)) return 'patient';
    if (/^TESTDOC\d{3}$/.test(uin)) return 'doctor';
    if (/^TESTPAT\d{3}$/.test(uin)) return 'patient';
    
    return null;
  }

  /**
   * Get sequence number from UIN
   */
  getSequenceFromUIN(uin: string): number | null {
    const match = uin.match(/^KGC-[A-Z]{3}-(\d+)$/);
    return match ? parseInt(match[1], 10) : null;
  }

  /**
   * Check if UIN already exists in database
   */
  async isUINAvailable(uin: string): Promise<boolean> {
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.uin, uin))
      .limit(1);
    
    return !existing;
  }

  /**
   * Migration helper: Convert legacy UIN to new format
   */
  async migrateLegacyUIN(legacyUIN: string): Promise<string | null> {
    const roleType = this.getRoleFromUIN(legacyUIN);
    if (!roleType) return null;
    
    const result = await this.generateUIN(roleType);
    return result.uin;
  }

  /**
   * Get statistics about UIN usage
   */
  async getUINStatistics(): Promise<{
    totalUsers: number;
    adminCount: number;
    doctorCount: number;
    patientCount: number;
    newFormatCount: number;
    legacyFormatCount: number;
  }> {
    const allUsers = await db.select({ uin: users.uin, roleId: users.roleId }).from(users);
    
    const stats = {
      totalUsers: allUsers.length,
      adminCount: allUsers.filter(u => u.roleId === 1).length,
      doctorCount: allUsers.filter(u => u.roleId === 2).length,
      patientCount: allUsers.filter(u => u.roleId === 3).length,
      newFormatCount: allUsers.filter(u => u.uin?.startsWith('KGC-')).length,
      legacyFormatCount: allUsers.filter(u => u.uin && !u.uin.startsWith('KGC-')).length,
    };
    
    return stats;
  }

  /**
   * Generate batch UIDs for bulk user creation
   */
  async generateBatchUIDs(roleType: 'admin' | 'doctor' | 'patient', count: number): Promise<UINGenerationResult[]> {
    const results: UINGenerationResult[] = [];
    const startSequence = await this.getNextSequenceNumber(roleType);
    const rolePrefix = this.ROLE_PREFIXES[roleType];
    
    for (let i = 0; i < count; i++) {
      const sequence = startSequence + i;
      const sequenceStr = sequence.toString().padStart(3, '0');
      const uin = `KGC-${rolePrefix}-${sequenceStr}`;
      
      results.push({
        uin,
        sequence,
        rolePrefix
      });
    }
    
    return results;
  }
}

export default UINService;