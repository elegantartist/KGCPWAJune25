-- Create hierarchical users for KGC Dashboard System
-- 1 Admin (X1) + 10 Doctors (A-J) + 50 Patients (A1-J5)

-- First ensure user roles exist
INSERT INTO user_roles (name, description) 
VALUES 
  ('admin', 'Administrator role for KGC system'),
  ('doctor', 'Doctor role for KGC system'),
  ('patient', 'Patient role for KGC system')
ON CONFLICT (name) DO NOTHING;

-- Get role IDs
DO $$
DECLARE
    admin_role_id INTEGER;
    doctor_role_id INTEGER;
    patient_role_id INTEGER;
    admin_user_id INTEGER;
    doctor_user_id INTEGER;
    doctor_letters CHAR[] := ARRAY['A','B','C','D','E','F','G','H','I','J'];
    doctor_letter CHAR;
    patient_num INTEGER;
BEGIN
    -- Get role IDs
    SELECT id INTO admin_role_id FROM user_roles WHERE name = 'admin';
    SELECT id INTO doctor_role_id FROM user_roles WHERE name = 'doctor';
    SELECT id INTO patient_role_id FROM user_roles WHERE name = 'patient';

    -- 1. Create Admin User (X1)
    INSERT INTO users (uin, name, email, role_id, phone_number, username, password, is_active, doctor_letter, patient_number, created_by_user_id)
    VALUES ('X1', 'System Administrator', 'admin@keepgoingcare.com', admin_role_id, '+61400000001', 'x1', NULL, true, NULL, NULL, NULL)
    ON CONFLICT (uin) DO NOTHING
    RETURNING id INTO admin_user_id;
    
    -- Get admin user ID if it already exists
    IF admin_user_id IS NULL THEN
        SELECT id INTO admin_user_id FROM users WHERE uin = 'X1';
    END IF;

    -- 2. Create Doctor Users (A-J)
    FOREACH doctor_letter IN ARRAY doctor_letters
    LOOP
        INSERT INTO users (uin, name, email, role_id, phone_number, username, password, is_active, doctor_letter, patient_number, created_by_user_id)
        VALUES (
            doctor_letter, 
            'Doctor ' || doctor_letter, 
            'doctor' || lower(doctor_letter) || '@keepgoingcare.com', 
            doctor_role_id, 
            '+6140000000' || (ascii(doctor_letter) - ascii('A') + 2)::text, 
            lower(doctor_letter), 
            NULL, 
            true, 
            doctor_letter, 
            NULL, 
            admin_user_id
        )
        ON CONFLICT (uin) DO NOTHING
        RETURNING id INTO doctor_user_id;
        
        -- Get doctor user ID if it already exists
        IF doctor_user_id IS NULL THEN
            SELECT id INTO doctor_user_id FROM users WHERE uin = doctor_letter;
        END IF;

        -- Create admin-to-doctor relationship
        INSERT INTO dashboard_relationships (parent_user_id, child_user_id, relationship_type, active)
        VALUES (admin_user_id, doctor_user_id, 'admin_to_doctor', true)
        ON CONFLICT DO NOTHING;

        -- 3. Create Patient Users (A1-J5)
        FOR patient_num IN 1..5
        LOOP
            DECLARE
                patient_uin TEXT := doctor_letter || patient_num::text;
                patient_user_id INTEGER;
                phone_suffix INTEGER := ((ascii(doctor_letter) - ascii('A')) * 5) + patient_num + 11;
            BEGIN
                INSERT INTO users (uin, name, email, role_id, phone_number, username, password, is_active, doctor_letter, patient_number, created_by_user_id)
                VALUES (
                    patient_uin,
                    'Patient ' || patient_uin,
                    'patient' || lower(patient_uin) || '@keepgoingcare.com',
                    patient_role_id,
                    '+614000000' || lpad(phone_suffix::text, 2, '0'),
                    lower(patient_uin),
                    NULL,
                    true,
                    doctor_letter,
                    patient_num,
                    doctor_user_id
                )
                ON CONFLICT (uin) DO NOTHING
                RETURNING id INTO patient_user_id;
                
                -- Get patient user ID if it already exists
                IF patient_user_id IS NULL THEN
                    SELECT id INTO patient_user_id FROM users WHERE uin = patient_uin;
                END IF;

                -- Create doctor-to-patient relationship
                INSERT INTO dashboard_relationships (parent_user_id, child_user_id, relationship_type, active)
                VALUES (doctor_user_id, patient_user_id, 'doctor_to_patient', true)
                ON CONFLICT DO NOTHING;
            END;
        END LOOP;
    END LOOP;

    RAISE NOTICE 'Hierarchical user seeding completed successfully!';
    RAISE NOTICE 'Created: 1 Admin (X1), 10 Doctors (A-J), 50 Patients (A1-J5)';
END $$;