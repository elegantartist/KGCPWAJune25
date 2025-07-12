import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import MCAIntegration from '@/components/doctor/MCAIntegration';
import Layout from '@/components/layout/Layout';

const DoctorMCAPage: React.FC = () => {
  const { user } = useAuth();

  if (!user || user.role !== 'doctor') {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
            <p className="text-muted-foreground">This page is only accessible to registered doctors.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <MCAIntegration 
          doctorId={user.id.toString()} 
          onReturnToDashboard={() => window.location.href = '/doctor-dashboard'}
        />
      </div>
    </Layout>
  );
};

export default DoctorMCAPage;