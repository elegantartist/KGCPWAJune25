import { Router } from 'express';
import {
  getAllFeatureConfigurations,
  getFeatureConfiguration,
  updateFeatureConfiguration,
  setFeatureEnabled,
  resetFeatureConfiguration
} from '../feature-management';

const router = Router();

// Middleware to ensure the user is an admin
function isAdmin(req: any, res: any, next: any) {
  // In a production app, you would check req.user.role === 'admin'
  // For development, we'll assume the user is an admin
  next();
}

// GET all feature configurations
router.get('/features', isAdmin, (req, res) => {
  const features = getAllFeatureConfigurations();
  res.json(features);
});

// GET a specific feature configuration
router.get('/features/:featureId', isAdmin, (req, res) => {
  const { featureId } = req.params;
  const feature = getFeatureConfiguration(featureId);
  
  if (!feature) {
    return res.status(404).json({ error: `Feature ${featureId} not found` });
  }
  
  res.json(feature);
});

// PATCH update a feature configuration
router.patch('/features/:featureId', isAdmin, (req, res) => {
  const { featureId } = req.params;
  const updates = req.body;
  
  // Remove the id from updates to prevent changing it
  if (updates.id) {
    delete updates.id;
  }
  
  const updatedFeature = updateFeatureConfiguration(featureId, updates);
  
  if (!updatedFeature) {
    return res.status(404).json({ error: `Feature ${featureId} not found` });
  }
  
  res.json(updatedFeature);
});

// PATCH toggle a feature enabled state
router.patch('/features/:featureId/enabled', isAdmin, (req, res) => {
  const { featureId } = req.params;
  const { enabled } = req.body;
  
  if (typeof enabled !== 'boolean') {
    return res.status(400).json({ error: 'Enabled must be a boolean value' });
  }
  
  const updatedFeature = setFeatureEnabled(featureId, enabled);
  
  if (!updatedFeature) {
    return res.status(404).json({ error: `Feature ${featureId} not found` });
  }
  
  res.json(updatedFeature);
});

// POST reset a feature to defaults
router.post('/features/:featureId/reset', isAdmin, (req, res) => {
  const { featureId } = req.params;
  const resetFeature = resetFeatureConfiguration(featureId);
  
  if (!resetFeature) {
    return res.status(404).json({ error: `Feature ${featureId} not found` });
  }
  
  res.json(resetFeature);
});

export default router;