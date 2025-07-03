// Complete user creation service with UIN generation and welcome emails
import { db } from '../db';
import * as schema from '@shared/schema';
import { uinService } from './uinService';
import { emailService } from './emailService';
import bcrypt from 'bcrypt';

export interface CreateUserData {
    name: string;
    email: string;
    password: string;
    phoneNumber: string;
    role: 'doctor' | 'patient';
    doctorId?: number; // For patients, link to their doctor
}

export class UserCreationService {
    private static instance: UserCreationService;
    
    static getInstance(): UserCreationService {
        if (!UserCreationService.instance) {
            UserCreationService.instance = new UserCreationService();
        }
        return UserCreationService.instance;
    }
    
    /**
     * Create a new doctor with UIN and send welcome email
     */
    async createDoctor(data: CreateUserData): Promise<{ user: any; doctor: any; uin: string }> {
        if (data.role !== 'doctor') {
            throw new Error('Invalid role for doctor creation');
        }
        
        const uin = uinService.generateUIN('doctor');
        const saltRounds = 10;
        
        try {
            // Securely hash the password before storing it
            const hashedPassword = await bcrypt.hash(data.password, saltRounds);

            // Create user record
            const [user] = await db.insert(schema.users).values({
                name: data.name,
                email: data.email,
                hashedPassword: hashedPassword,
                phoneNumber: data.phoneNumber,
                role: 'doctor',
                uin: uin,
                createdAt: new Date(),
                updatedAt: new Date()
            }).returning();
            
            // Create doctor record
            const [doctor] = await db.insert(schema.doctors).values({
                userId: user.id,
                specialization: 'General Practice', // Default
                licenseNumber: `AUTO-${uin}`, // Auto-generated
                createdAt: new Date(),
                updatedAt: new Date()
            }).returning();
            
            // Send welcome email
            await emailService.sendWelcomeEmail({
                email: data.email,
                name: data.name,
                role: 'doctor',
                uin: uin,
                dashboardUrl: process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/doctor-dashboard` : undefined
            });
            
            console.log(`Doctor created: ${data.name} (${data.email}) with UIN: ${uin}`);
            
            return { user, doctor, uin };
        } catch (error) {
            console.error('Doctor creation error:', error);
            throw new Error('Failed to create doctor account');
        }
    }
    
    /**
     * Create a new patient with UIN and send welcome email
     */
    async createPatient(data: CreateUserData): Promise<{ user: any; patient: any; uin: string }> {
        if (data.role !== 'patient') {
            throw new Error('Invalid role for patient creation');
        }
        
        if (!data.doctorId) {
            throw new Error('Doctor ID is required for patient creation');
        }
        
        const uin = uinService.generateUIN('patient');
        const saltRounds = 10;
        
        try {
            // Securely hash the password before storing it
            const hashedPassword = await bcrypt.hash(data.password, saltRounds);

            // Create user record
            const [user] = await db.insert(schema.users).values({
                name: data.name,
                email: data.email,
                hashedPassword: hashedPassword,
                phoneNumber: data.phoneNumber,
                role: 'patient',
                uin: uin,
                createdAt: new Date(),
                updatedAt: new Date()
            }).returning();
            
            // Create patient record
            const [patient] = await db.insert(schema.patients).values({
                userId: user.id,
                doctorId: data.doctorId,
                dateOfBirth: new Date('1990-01-01'), // Default - should be updated
                emergencyContact: 'To be provided',
                createdAt: new Date(),
                updatedAt: new Date()
            }).returning();
            
            // Send welcome email
            await emailService.sendWelcomeEmail({
                email: data.email,
                name: data.name,
                role: 'patient',
                uin: uin,
                dashboardUrl: process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/patient-dashboard` : undefined
            });
            
            console.log(`Patient created: ${data.name} (${data.email}) with UIN: ${uin} under doctor ID: ${data.doctorId}`);
            
            return { user, patient, uin };
        } catch (error) {
            console.error('Patient creation error:', error);
            throw new Error('Failed to create patient account');
        }
    }
    
    /**
     * Validate user data before creation
     */
    validateUserData(data: CreateUserData): string[] {
        const errors: string[] = [];
        
        if (!data.name || data.name.trim().length === 0) {
            errors.push('Name is required');
        }
        
        if (!data.password || data.password.length < 8) {
            errors.push('Password must be at least 8 characters long');
        }

        if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
            errors.push('Valid email is required');
        }
        
        if (!data.phoneNumber || data.phoneNumber.trim().length === 0) {
            errors.push('Phone number is required');
        }
        
        if (!data.role || !['doctor', 'patient'].includes(data.role)) {
            errors.push('Valid role is required');
        }
        
        if (data.role === 'patient' && !data.doctorId) {
            errors.push('Doctor ID is required for patients');
        }
        
        return errors;
    }
    
    /**
     * Check if email already exists
     */
    async emailExists(email: string): Promise<boolean> {
        const existing = await db.query.users.findFirst({
            where: (users, { eq }) => eq(users.email, email)
        });
        return !!existing;
    }
}

export const userCreationService = UserCreationService.getInstance();