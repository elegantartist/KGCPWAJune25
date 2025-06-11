// UIN (Unique Identification Number) generation service
export class UINService {
    private static instance: UINService;
    
    static getInstance(): UINService {
        if (!UINService.instance) {
            UINService.instance = new UINService();
        }
        return UINService.instance;
    }
    
    /**
     * Generate a unique identification number for doctors and patients
     * Format: KGC-[ROLE]-[YEAR][MONTH]-[6-DIGIT-RANDOM]
     * Example: KGC-DOC-202506-123456 or KGC-PAT-202506-789012
     */
    generateUIN(role: 'doctor' | 'patient'): string {
        const rolePrefix = role === 'doctor' ? 'DOC' : 'PAT';
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const randomNumber = Math.floor(100000 + Math.random() * 900000);
        
        return `KGC-${rolePrefix}-${year}${month}-${randomNumber}`;
    }
    
    /**
     * Validate UIN format
     */
    validateUIN(uin: string): boolean {
        const uinPattern = /^KGC-(DOC|PAT)-\d{6}-\d{6}$/;
        return uinPattern.test(uin);
    }
    
    /**
     * Extract role from UIN
     */
    extractRoleFromUIN(uin: string): 'doctor' | 'patient' | null {
        if (!this.validateUIN(uin)) return null;
        const parts = uin.split('-');
        return parts[1] === 'DOC' ? 'doctor' : 'patient';
    }
}

export const uinService = UINService.getInstance();