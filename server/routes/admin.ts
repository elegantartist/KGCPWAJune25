import { Router } from 'express';

const router = Router();

// In-memory data store
let users = [
  { id: 1, firstName: 'John', lastName: 'Doe', email: 'john.doe@example.com', phone: '123-456-7890', role: 'doctor', status: 'active', createdAt: new Date().toISOString() },
  { id: 2, firstName: 'Jane', lastName: 'Smith', email: 'jane.smith@example.com', phone: '098-765-4321', role: 'patient', status: 'active', createdAt: new Date().toISOString(), assignedDoctor: 'Dr. John Doe' },
  { id: 3, firstName: 'Peter', lastName: 'Jones', email: 'peter.jones@example.com', phone: '555-555-5555', role: 'patient', status: 'deleted', createdAt: new Date().toISOString(), assignedDoctor: 'Dr. John Doe' },
];
let nextUserId = 4;

// GET /api/admin/users
router.get('/users', (req, res) => {
  res.json(users);
});

// GET /api/admin/users/deleted
router.get('/users/deleted', (req, res) => {
    res.json(users.filter(u => u.status === 'deleted'));
});

// POST /api/admin/create-doctor
router.post('/create-doctor', (req, res) => {
    const { firstName, lastName, email, phone } = req.body;
    const newDoctor = {
        id: nextUserId++,
        firstName,
        lastName,
        email,
        phone,
        role: 'doctor',
        status: 'active',
        createdAt: new Date().toISOString()
    };
    users.push(newDoctor);
    res.status(201).json(newDoctor);
});

// POST /api/admin/create-patient
router.post('/create-patient', (req, res) => {
    const { firstName, lastName, email, phone, assignedDoctorId } = req.body;
    const doctor = users.find(u => u.id === parseInt(assignedDoctorId) && u.role === 'doctor');
    const newPatient = {
        id: nextUserId++,
        firstName,
        lastName,
        email,
        phone,
        role: 'patient',
        status: 'active',
        createdAt: new Date().toISOString(),
        assignedDoctor: doctor ? `Dr. ${doctor.firstName} ${doctor.lastName}` : 'Unassigned'
    };
    users.push(newPatient);
    res.status(201).json(newPatient);
});

// DELETE /api/admin/delete-user/:userId
router.delete('/delete-user/:userId', (req, res) => {
    const userId = parseInt(req.params.userId);
    const user = users.find(u => u.id === userId);
    if (user) {
        user.status = 'deleted';
        res.status(200).json({ message: 'User deleted successfully' });
    } else {
        res.status(404).json({ message: 'User not found' });
    }
});

// POST /api/admin/restore-user/:userId
router.post('/restore-user/:userId', (req, res) => {
    const userId = parseInt(req.params.userId);
    const user = users.find(u => u.id === userId);
    if (user) {
        user.status = 'active';
        res.status(200).json({ message: 'User restored successfully' });
    } else {
        res.status(404).json({ message: 'User not found' });
    }
});


export default router;
