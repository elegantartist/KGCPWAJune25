/**
 * User Management Service for KGC Dashboard Hierarchy
 * Handles creation and management of Admin → Doctor → Patient relationships
 */

import { db } from '../db';
import { users, userRoles, dashboardRelationships } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import UINService from './uinService';

export interface CreateUserRequest {
  name: string;
  email: string;
  phoneNumber: string;
  role: 'admin' | 'doctor' | 'patient';
  createdByUserId?: number;
  assignedDoctorId?: number; // For patients: which doctor they're assigned to
  // Legacy fields (optional for backwards compatibility)
  doctorLetter?: string; 
  patientNumber?: number;
}

export interface DashboardUser {
  id: number;
  uin: string;
  name: string;
  email: string;
  phoneNumber: string;
  role: string;
  uinSequence?: number;
  assignedDoctorId?: number;
  isActive: boolean;
  createdByUserId?: number;
  // Legacy fields (for backwards compatibility)
  doctorLetter?: string;
  patientNumber?: number;
}

class UserManagementService {
  private static instance: UserManagementService;
  private uinService: UINService;

  constructor() {
    this.uinService = UINService.getInstance();
  }

  static getInstance(): UserManagementService {
    if (!UserManagementService.instance) {
      UserManagementService.instance = new UserManagementService();
    }
    return UserManagementService.instance;
  }

  /**
   * Create a new user in the KGC hierarchy
   */
  async createUser(userData: CreateUserRequest): Promise<DashboardUser> {
    // Get role ID
    const [role] = await db
      .select()
      .from(userRoles)
      .where(eq(userRoles.name, userData.role));

    if (!role) {
      throw new Error(`Role ${userData.role} not found`);
    }

    // Generate modern scalable UIN
    const uinResult = await this.uinService.generateUIN(userData.role);

    // Validate hierarchy rules (updated for new system)
    await this.validateHierarchyRules(userData);

    // Create username from UIN (backwards compatible)
    const username = uinResult.uin.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Insert new user with new scalable UIN system
    const [newUser] = await db
      .insert(users)
      .values({
        uin: uinResult.uin,
        name: userData.name,
        email: userData.email,
        phoneNumber: userData.phoneNumber,
        roleId: role.id,
        username,
        password: null, // SMS-only authentication
        uinSequence: uinResult.sequence,
        assignedDoctorId: userData.assignedDoctorId || null,
        createdByUserId: userData.createdByUserId || null,
        // Legacy fields (optional for backwards compatibility)
        doctorLetter: userData.doctorLetter || null,
        patientNumber: userData.patientNumber || null,
        isActive: true,
      })
      .returning();

    // Create dashboard relationship if there's a parent
    if (userData.createdByUserId) {
      const relationshipType = userData.role === 'doctor' ? 'admin_to_doctor' : 'doctor_to_patient';
      
      await db
        .insert(dashboardRelationships)
        .values({
          parentUserId: userData.createdByUserId,
          childUserId: newUser.id,
          relationshipType,
          active: true,
        });
    }

    return {
      id: newUser.id,
      uin: newUser.uin!,
      name: newUser.name,
      email: newUser.email,
      phoneNumber: newUser.phoneNumber,
      role: userData.role,
      uinSequence: newUser.uinSequence || undefined,
      assignedDoctorId: newUser.assignedDoctorId || undefined,
      isActive: newUser.isActive,
      createdByUserId: newUser.createdByUserId || undefined,
      // Legacy fields
      doctorLetter: newUser.doctorLetter || undefined,
      patientNumber: newUser.patientNumber || undefined,
    };
  }

  /**
   * Validate hierarchy rules for the new unlimited system
   */
  private async validateHierarchyRules(userData: CreateUserRequest): Promise<void> {
    // Admin validation
    if (userData.role === 'admin') {
      // Admins can be created without restrictions (unlimited scaling)
      return;
    }

    // Doctor validation  
    if (userData.role === 'doctor') {
      if (!userData.createdByUserId) {
        throw new Error('Doctors must be created by an admin');
      }
      // Verify the creator is an admin
      const [creator] = await db
        .select({ roleId: users.roleId })
        .from(users)
        .where(eq(users.id, userData.createdByUserId));
      
      if (!creator || creator.roleId !== 1) {
        throw new Error('Only admins can create doctors');
      }
      return;
    }

    // Patient validation
    if (userData.role === 'patient') {
      if (!userData.createdByUserId) {
        throw new Error('Patients must be created by a doctor');
      }
      
      // Verify the creator is a doctor
      const [creator] = await db
        .select({ roleId: users.roleId })
        .from(users)
        .where(eq(users.id, userData.createdByUserId));
      
      if (!creator || creator.roleId !== 2) {
        throw new Error('Only doctors can create patients');
      }

      // Set assigned doctor automatically
      if (!userData.assignedDoctorId) {
        userData.assignedDoctorId = userData.createdByUserId;
      }
      return;
    }

    throw new Error('Invalid role specified');
  }

  /**
   * Get all users for a specific doctor (unlimited patients)
   */
  async getPatientsByDoctor(doctorId: number): Promise<DashboardUser[]> {
    const [doctor] = await db
      .select({ roleId: users.roleId })
      .from(users)
      .where(eq(users.id, doctorId));

    if (!doctor || doctor.roleId !== 2) {
      throw new Error('Invalid doctor ID');
    }

    const patients = await db
      .select()
      .from(users)
      .where(and(
        eq(users.roleId, 3), // patients
        eq(users.assignedDoctorId, doctorId)
      ));

    return patients.map(patient => ({
      id: patient.id,
      uin: patient.uin!,
      name: patient.name,
      email: patient.email,
      phoneNumber: patient.phoneNumber,
      role: 'patient',
      uinSequence: patient.uinSequence || undefined,
      assignedDoctorId: patient.assignedDoctorId || undefined,
      isActive: patient.isActive,
      createdByUserId: patient.createdByUserId || undefined,
      doctorLetter: patient.doctorLetter || undefined,
      patientNumber: patient.patientNumber || undefined,
    }));
  }

  /**
   * Get UIN statistics and system health
   */
  async getSystemStatistics(): Promise<any> {
    return await this.uinService.getUINStatistics();
  }

  /**
   * Migrate legacy UIDs to new format (optional migration tool)
   */
  async migrateLegacyUser(userId: number): Promise<void> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!user || !user.uin) {
      throw new Error('User not found');
    }

    // Check if already using new format
    if (user.uin.startsWith('KGC-')) {
      return; // Already migrated
    }

    // Generate new UIN
    const roleType = user.roleId === 1 ? 'admin' : user.roleId === 2 ? 'doctor' : 'patient';
    const uinResult = await this.uinService.generateUIN(roleType);

    // Update user with new UIN
    await db
      .update(users)
      .set({
        uin: uinResult.uin,
        uinSequence: uinResult.sequence,
      })
      .where(eq(users.id, userId));
  }

  /**
   * Legacy function kept for backwards compatibility
   * @deprecated Use the new unlimited system instead
   */
  private generateLegacyUIN(role: string, doctorLetter?: string, patientNumber?: number): string {
    switch (role) {
      case 'admin':
        return 'X1';
      case 'doctor':
        if (!doctorLetter) {
          throw new Error('Doctor letter and patient number are required for patient users');
        }
        return `${doctorLetter}${patientNumber}`;
      default:
        throw new Error(`Invalid role: ${role}`);
    }
  }

  /**
   * Validate hierarchy rules before creating user
   */
  private async validateHierarchyRules(userData: CreateUserRequest): Promise<void> {
    switch (userData.role) {
      case 'admin':
        // Only one admin allowed (X1)
        const existingAdmin = await db
          .select()
          .from(users)
          .where(eq(users.uin, 'X1'));
        
        if (existingAdmin.length > 0) {
          throw new Error('Admin user X1 already exists');
        }
        break;

      case 'doctor':
        if (!userData.doctorLetter || !userData.createdByUserId) {
          throw new Error('Doctor must have letter assignment and be created by admin');
        }

        // Validate doctor letter is A-J
        if (!/^[A-J]$/.test(userData.doctorLetter)) {
          throw new Error('Doctor letter must be A through J');
        }

        // Check if doctor letter is already taken
        const existingDoctor = await db
          .select()
          .from(users)
          .where(eq(users.doctorLetter, userData.doctorLetter));

        if (existingDoctor.length > 0) {
          throw new Error(`Doctor ${userData.doctorLetter} already exists`);
        }

        // Validate creator is admin
        const creator = await db
          .select()
          .from(users)
          .where(eq(users.id, userData.createdByUserId));

        if (!creator.length || creator[0].uin !== 'X1') {
          throw new Error('Doctors can only be created by admin (X1)');
        }
        break;

      case 'patient':
        if (!userData.doctorLetter || !userData.patientNumber || !userData.createdByUserId) {
          throw new Error('Patient must have doctor letter, patient number, and be created by doctor');
        }

        // Validate patient number is 1-5
        if (userData.patientNumber < 1 || userData.patientNumber > 5) {
          throw new Error('Patient number must be 1 through 5');
        }

        // Check if patient position is already taken
        const existingPatient = await db
          .select()
          .from(users)
          .where(
            and(
              eq(users.doctorLetter, userData.doctorLetter),
              eq(users.patientNumber, userData.patientNumber)
            )
          );

        if (existingPatient.length > 0) {
          throw new Error(`Patient ${userData.doctorLetter}${userData.patientNumber} already exists`);
        }

        // Validate creator is the assigned doctor
        const doctorCreator = await db
          .select()
          .from(users)
          .where(eq(users.id, userData.createdByUserId));

        if (!doctorCreator.length || doctorCreator[0].doctorLetter !== userData.doctorLetter) {
          throw new Error(`Patient can only be created by Doctor ${userData.doctorLetter}`);
        }
        break;
    }
  }

  /**
   * Get all users managed by a specific user
   */
  async getManagedUsers(userId: number): Promise<DashboardUser[]> {
    const relationships = await db
      .select({
        childUser: users,
        relationship: dashboardRelationships,
      })
      .from(dashboardRelationships)
      .innerJoin(users, eq(dashboardRelationships.childUserId, users.id))
      .innerJoin(userRoles, eq(users.roleId, userRoles.id))
      .where(
        and(
          eq(dashboardRelationships.parentUserId, userId),
          eq(dashboardRelationships.active, true)
        )
      );

    return relationships.map(({ childUser }) => ({
      id: childUser.id,
      uin: childUser.uin!,
      name: childUser.name,
      email: childUser.email,
      phoneNumber: childUser.phoneNumber,
      role: this.getRoleFromUIN(childUser.uin!),
      doctorLetter: childUser.doctorLetter || undefined,
      patientNumber: childUser.patientNumber || undefined,
      isActive: childUser.isActive,
      createdByUserId: childUser.createdByUserId || undefined,
    }));
  }

  /**
   * Reassign a patient from one doctor to another (admin only)
   */
  async reassignPatient(patientId: number, newDoctorId: number, adminUserId: number): Promise<void> {
    // Validate admin permissions
    const admin = await db
      .select()
      .from(users)
      .where(eq(users.id, adminUserId));

    if (!admin.length || admin[0].uin !== 'X1') {
      throw new Error('Only admin (X1) can reassign patients');
    }

    // Get patient and new doctor info
    const [patient] = await db
      .select()
      .from(users)
      .where(eq(users.id, patientId));

    const [newDoctor] = await db
      .select()
      .from(users)
      .where(eq(users.id, newDoctorId));

    if (!patient || !newDoctor) {
      throw new Error('Patient or doctor not found');
    }

    if (!patient.patientNumber || !newDoctor.doctorLetter) {
      throw new Error('Invalid patient or doctor data');
    }

    // Check if new doctor already has a patient in this slot
    const existingPatient = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.doctorLetter, newDoctor.doctorLetter),
          eq(users.patientNumber, patient.patientNumber)
        )
      );

    if (existingPatient.length > 0 && existingPatient[0].id !== patientId) {
      throw new Error(`Doctor ${newDoctor.doctorLetter} already has a patient in slot ${patient.patientNumber}`);
    }

    // Update patient's doctor assignment
    const newUIN = `${newDoctor.doctorLetter}${patient.patientNumber}`;
    
    await db
      .update(users)
      .set({
        doctorLetter: newDoctor.doctorLetter,
        uin: newUIN,
        username: newUIN.toLowerCase(),
        createdByUserId: newDoctorId,
      })
      .where(eq(users.id, patientId));

    // Update dashboard relationship
    await db
      .update(dashboardRelationships)
      .set({
        parentUserId: newDoctorId,
      })
      .where(eq(dashboardRelationships.childUserId, patientId));
  }

  /**
   * Get available doctor letters
   */
  async getAvailableDoctorLetters(): Promise<string[]> {
    const allLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    
    const usedLetters = await db
      .select({ doctorLetter: users.doctorLetter })
      .from(users)
      .where(eq(users.roleId, 2)); // Assuming doctor role ID is 2

    const used = usedLetters
      .map(u => u.doctorLetter)
      .filter(Boolean) as string[];

    return allLetters.filter(letter => !used.includes(letter));
  }

  /**
   * Get available patient slots for a doctor
   */
  async getAvailablePatientSlots(doctorLetter: string): Promise<number[]> {
    const allSlots = [1, 2, 3, 4, 5];
    
    const usedSlots = await db
      .select({ patientNumber: users.patientNumber })
      .from(users)
      .where(eq(users.doctorLetter, doctorLetter));

    const used = usedSlots
      .map(u => u.patientNumber)
      .filter(Boolean) as number[];

    return allSlots.filter(slot => !used.includes(slot));
  }

  /**
   * Helper to determine role from UIN
   */
  private getRoleFromUIN(uin: string): string {
    if (uin === 'X1') return 'admin';
    if (/^[A-J]$/.test(uin)) return 'doctor';
    if (/^[A-J][1-5]$/.test(uin)) return 'patient';
    return 'unknown';
  }

  /**
   * Initialize default admin user if it doesn't exist
   */
  async initializeDefaultAdmin(): Promise<void> {
    const existingAdmin = await db
      .select()
      .from(users)
      .where(eq(users.uin, 'X1'));

    if (existingAdmin.length === 0) {
      const adminRole = await db
        .select()
        .from(userRoles)
        .where(eq(userRoles.name, 'admin'));

      if (adminRole.length > 0) {
        await db
          .insert(users)
          .values({
            uin: 'X1',
            name: 'System Administrator',
            email: 'admin@keepgoingcare.com',
            phoneNumber: '+61400000001',
            roleId: adminRole[0].id,
            username: 'x1',
            password: null,
            doctorLetter: null,
            patientNumber: null,
            createdByUserId: null,
            isActive: true,
          });
        
        console.log('Default admin user X1 created');
      }
    }
  }
}

export const userManagementService = UserManagementService.getInstance();