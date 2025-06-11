import { useState, useEffect } from 'react';
import axios from 'axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useConnectivity } from './useConnectivity';

// Define milestone types
export interface ProgressMilestone {
  id?: number;
  userId: number;
  title: string;
  description: string;
  category: string;
  progress: number;
  completed: boolean;
  targetDate?: Date | null;
  completedDate?: Date | null;
  iconType?: string;
  localUuid?: string;
  createdAt?: Date;
  updatedAt?: Date;
  lastSyncedAt?: Date | null;
}

export const useProgressMilestones = (userId: number) => {
  const { connectivityLevel, isOffline } = useConnectivity();
  const queryClient = useQueryClient();
  
  // LocalStorage key for offline milestones
  const OFFLINE_MILESTONES_KEY = `kgc_offline_milestones_${userId}`;
  
  // Get all milestones for a user
  const { data: milestones, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/users', userId, 'progress-milestones'],
    queryFn: async () => {
      const response = await axios.get(`/api/users/${userId}/progress-milestones`);
      return response.data;
    },
    // Don't try to fetch if offline
    enabled: !isOffline,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Get local milestones from localStorage
  const getLocalMilestones = (): ProgressMilestone[] => {
    const storedData = localStorage.getItem(OFFLINE_MILESTONES_KEY);
    if (storedData) {
      try {
        return JSON.parse(storedData);
      } catch (err) {
        console.error('Error parsing local milestones data:', err);
      }
    }
    return [];
  };
  
  // Save local milestones to localStorage
  const saveLocalMilestones = (data: ProgressMilestone[]) => {
    localStorage.setItem(OFFLINE_MILESTONES_KEY, JSON.stringify(data));
  };
  
  // Create a new milestone
  const createMutation = useMutation({
    mutationFn: async (milestone: Omit<ProgressMilestone, 'id'>) => {
      if (isOffline) {
        // Handle offline creation
        const newMilestone: ProgressMilestone = {
          ...milestone,
          localUuid: crypto.randomUUID(), // Generate a local UUID for syncing later
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        const localMilestones = getLocalMilestones();
        saveLocalMilestones([...localMilestones, newMilestone]);
        return newMilestone;
      } else {
        // Online creation
        const response = await axios.post(`/api/users/${userId}/progress-milestones`, milestone);
        return response.data;
      }
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['/api/users', userId, 'progress-milestones'] });
    },
  });
  
  // Update a milestone
  const updateMutation = useMutation({
    mutationFn: async (milestone: ProgressMilestone) => {
      if (!milestone.id && !milestone.localUuid) {
        throw new Error('Milestone must have either an id or localUuid');
      }
      
      if (isOffline) {
        // Handle offline update
        const localMilestones = getLocalMilestones();
        const updatedMilestones = localMilestones.map(m => {
          if (milestone.localUuid && m.localUuid === milestone.localUuid) {
            return { ...milestone, updatedAt: new Date() };
          } else if (milestone.id && m.id === milestone.id) {
            return { ...milestone, updatedAt: new Date() };
          }
          return m;
        });
        
        saveLocalMilestones(updatedMilestones);
        return milestone;
      } else {
        // Online update
        if (milestone.id) {
          const response = await axios.patch(`/api/progress-milestones/${milestone.id}`, milestone);
          return response.data;
        } else if (milestone.localUuid) {
          // Handle syncing a local milestone that doesn't have a server ID yet
          const response = await axios.post(`/api/users/${userId}/progress-milestones`, {
            ...milestone,
            updatedAt: new Date(),
          });
          return response.data;
        }
        
        throw new Error('Invalid milestone data for update');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users', userId, 'progress-milestones'] });
    },
  });
  
  // Delete a milestone
  const deleteMutation = useMutation({
    mutationFn: async (milestone: ProgressMilestone) => {
      if (isOffline) {
        // Handle offline deletion
        const localMilestones = getLocalMilestones();
        let filteredMilestones;
        
        if (milestone.localUuid) {
          filteredMilestones = localMilestones.filter(m => m.localUuid !== milestone.localUuid);
        } else if (milestone.id) {
          filteredMilestones = localMilestones.filter(m => m.id !== milestone.id);
        } else {
          throw new Error('Milestone must have either an id or localUuid for deletion');
        }
        
        saveLocalMilestones(filteredMilestones);
        return milestone;
      } else {
        // Online deletion
        if (milestone.id) {
          await axios.delete(`/api/progress-milestones/${milestone.id}`);
          return milestone;
        } else {
          throw new Error('Cannot delete milestone without id');
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users', userId, 'progress-milestones'] });
    },
  });
  
  // Sync local milestones with server when back online
  const syncMutation = useMutation({
    mutationFn: async () => {
      const localMilestones = getLocalMilestones();
      if (localMilestones.length === 0) return { synced: { created: [], updated: [], unchanged: [] }, allMilestones: [] };
      
      const response = await axios.post(`/api/users/${userId}/progress-milestones/sync`, {
        localMilestones
      });
      
      // Clear local storage after successful sync
      saveLocalMilestones([]);
      
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['/api/users', userId, 'progress-milestones'], data.allMilestones);
    },
  });
  
  // Auto-sync when connectivity is restored
  useEffect(() => {
    if (!isOffline && getLocalMilestones().length > 0) {
      syncMutation.mutate();
    }
  }, [isOffline]);
  
  // Get all milestones (combines server and local when offline)
  const getAllMilestones = (): ProgressMilestone[] => {
    const localMilestones = getLocalMilestones();
    
    if (isOffline) {
      return localMilestones;
    }
    
    if (!milestones) {
      return localMilestones;
    }
    
    // Combine server and any pending local milestones
    // (filtering out any that might have both server id and localUuid to avoid duplicates)
    const localOnlyMilestones = localMilestones.filter(local => 
      !milestones.some((server: ProgressMilestone) => 
        (local.id && server.id === local.id) || 
        (local.localUuid && server.localUuid === local.localUuid)
      )
    );
    
    return [...milestones, ...localOnlyMilestones];
  };
  
  // Get milestones by category
  const getMilestonesByCategory = (category: string): ProgressMilestone[] => {
    return getAllMilestones().filter(m => m.category === category);
  };
  
  // Get completed milestones
  const getCompletedMilestones = (): ProgressMilestone[] => {
    return getAllMilestones().filter(m => m.completed);
  };
  
  // Get in-progress milestones
  const getInProgressMilestones = (): ProgressMilestone[] => {
    return getAllMilestones().filter(m => !m.completed);
  };
  
  // Check if a milestone exists by title and category
  const milestoneExists = (title: string, category: string): boolean => {
    const allMilestones = getAllMilestones();
    return allMilestones.some(m => 
      m.title.toLowerCase() === title.toLowerCase() && 
      m.category.toLowerCase() === category.toLowerCase()
    );
  };
  
  // Create or update progress for a milestone 
  const createOrUpdateMilestone = async (
    title: string, 
    description: string, 
    category: string, 
    progress: number, 
    completed: boolean = false,
    iconType: string = 'Trophy'
  ) => {
    const allMilestones = getAllMilestones();
    const existing = allMilestones.find(m => 
      m.title.toLowerCase() === title.toLowerCase() && 
      m.category.toLowerCase() === category.toLowerCase()
    );
    
    if (existing) {
      // Update existing milestone
      const updated = {
        ...existing,
        progress,
        completed: completed || existing.completed || progress >= 100,
        completedDate: (completed || progress >= 100) && !existing.completedDate ? new Date() : existing.completedDate,
        updatedAt: new Date()
      };
      
      return updateMutation.mutateAsync(updated);
    } else {
      // Create new milestone
      const newMilestone: Omit<ProgressMilestone, 'id'> = {
        userId,
        title,
        description,
        category,
        progress,
        completed: completed || progress >= 100,
        completedDate: (completed || progress >= 100) ? new Date() : null,
        targetDate: null,
        iconType,
        localUuid: crypto.randomUUID()
      };
      
      return createMutation.mutateAsync(newMilestone);
    }
  };
  
  return {
    milestones: getAllMilestones(),
    isLoading,
    error,
    refetch,
    createMilestone: createMutation.mutateAsync,
    updateMilestone: updateMutation.mutateAsync,
    deleteMilestone: deleteMutation.mutateAsync,
    syncMilestones: syncMutation.mutateAsync,
    getMilestonesByCategory,
    getCompletedMilestones,
    getInProgressMilestones,
    milestoneExists,
    createOrUpdateMilestone,
    isSyncing: syncMutation.isPending,
  };
};