import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/authContext';
import { useAuth } from './hooks/useAuth';
import LoginPage from './pages/Login';
import SuperAdminDashboard from './pages/superadmin/Dashboard';
import AdminDashboard from './pages/admin/Dashboard';
import AssignerDashboard from './pages/assigner/Dashboard'; // ✅ Import actual AssignerDashboard
import LabDashboard from './pages/lab/Dashboard';
import CreateDoctor from './pages/admin/CreateDoctor';
import CreateLab from './pages/admin/CreateLab';
import CreateUser from './pages/admin/CreateUser';
import UserManagement from './pages/admin/UserManagement';
import GroupIdDashboard from './pages/groupId/dashboard'; // Placeholder for Group ID dashboard
import DoctorDashboard from './pages/doctor/dashboard'; // Actual Doctor Dashboard component
import TypistDashboard from './pages/typist/dashboard'; // Import Typist Dashboard
import VerifierDashboard from './pages/verifier/dashboard'; // Import Verifier Dashboard
import DoctorTemplates from './pages/doctor/templates'; // Import Doctor Templates
import OnlineReportingSystem from './components/OnlineReportingSystem/OnlineReportingSystem'; // Import Online Reporting System
import OnlineReportingSystemWithOHIF from './components/OnlineReportingSystem/OnlineReportingSystemWithOHIF'; // ✅ NEW: Import OHIF version
import OHIFViewerPage from './pages/doctor/OHIFViewerPage'; // ✅ NEW: OHIF full-view page
import SystemOverview from './pages/admin/SystemOverview';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, currentUser, getDashboardRoute } = useAuth();

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(currentUser?.role)) {
    // Redirect to appropriate dashboard instead of login
    return <Navigate to={getDashboardRoute()} replace />;
  }

  return children;
};

// Dashboard placeholder component for roles without implementation yet
const DashboardPlaceholder = ({ title, description, role }) => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <span className="text-2xl font-bold text-blue-600">{title.charAt(0)}</span>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
      <p className="text-gray-600 mb-6">{description}</p>
      <div className="bg-blue-50 rounded-lg p-4">
        <p className="text-sm text-blue-700">
          Your role: <span className="font-semibold">{role}</span>
        </p>
        <p className="text-xs text-blue-600 mt-1">
          Interface coming soon...
        </p>
      </div>
    </div>
  </div>
);

// App Routes Component
const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />
      
      {/* ✅ SUPER ADMIN ROUTES */}
      <Route 
        path="/superadmin/dashboard" 
        element={
          <ProtectedRoute allowedRoles={['super_admin']}>
            <SuperAdminDashboard />
          </ProtectedRoute>
        } 
      />
      
      {/* ✅ ADMIN ROUTES */}
      <Route 
        path="/admin/dashboard" 
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        } 
      />
      
      {/* ✅ SYSTEM OVERVIEW (Admin / Super Admin) */}
      <Route
        path="/admin/system-overview"
        element={
          <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
            <SystemOverview />
          </ProtectedRoute>
        }
      />
      
      <Route 
        path="/admin/create-doctor" 
        element={
          <ProtectedRoute allowedRoles={['admin', 'group_id']}>
            <CreateDoctor />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/admin/create-lab" 
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <CreateLab />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/admin/create-user" 
        element={
          <ProtectedRoute allowedRoles={['admin', 'group_id']}>
            <CreateUser />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/admin/user-management" 
        element={
          <ProtectedRoute allowedRoles={['admin', 'super_admin', 'group_id']}>
            <UserManagement />
          </ProtectedRoute>
        } 
      />
      
      {/* ✅ ROLE-SPECIFIC DASHBOARD ROUTES (MATCHING AUTH CONTROLLER) */}
      
      {/* Owner Dashboard */}
      <Route 
        path="/owner/dashboard" 
        element={
          <ProtectedRoute allowedRoles={['owner']}>
            <DashboardPlaceholder 
              title="Owner Dashboard" 
              description="Organization ownership and management interface"
              role="Owner"
            />
          </ProtectedRoute>
        } 
      />
      
      {/* Lab Staff Dashboard */}
      <Route 
        path="/lab/dashboard" 
        element={
          <ProtectedRoute allowedRoles={['lab_staff']}>
            <LabDashboard/>
          </ProtectedRoute>
        } 
      />
      
      {/* Doctor Account Dashboard */}
      <Route 
        path="/doctor/dashboard" 
        element={
          <ProtectedRoute allowedRoles={['doctor_account']}>
                  <DoctorDashboard />

          </ProtectedRoute>
        } 
      />
      
      {/* ✅ NEW ROLE DASHBOARDS TO MATCH AUTH CONTROLLER */}
      
      {/* Group ID Dashboard */}
      <Route 
        path="/group/dashboard" 
        element={
          <ProtectedRoute allowedRoles={['group_id']}>
           <GroupIdDashboard />
          </ProtectedRoute>
        } 
      />
      
      {/* ✅ Assignor Dashboard - Use actual component */}
      <Route 
        path="/assignor/dashboard" 
        element={
          <ProtectedRoute allowedRoles={['assignor']}>
            <AssignerDashboard />
          </ProtectedRoute>
        } 
      />
      
      {/* Radiologist Dashboard */}
      <Route 
        path="/radiologist/dashboard" 
        element={
          <ProtectedRoute allowedRoles={['radiologist']}>
                              <DoctorDashboard />

          </ProtectedRoute>
        } 
      />
      
      {/* Verifier Dashboard */}
      <Route 
        path="/verifier/dashboard" 
        element={
          <ProtectedRoute allowedRoles={['verifier']}>
            <VerifierDashboard />
          </ProtectedRoute>
        } 
      />
      
      {/* Physician Dashboard */}
      <Route 
        path="/physician/dashboard" 
        element={
          <ProtectedRoute allowedRoles={['physician']}>
            <DashboardPlaceholder 
              title="Physician Dashboard" 
              description="Patient reports and clinical decision support"
              role="Physician"
            />
          </ProtectedRoute>
        } 
      />
      
      {/* Receptionist Dashboard */}
      <Route 
        path="/receptionist/dashboard" 
        element={
          <ProtectedRoute allowedRoles={['receptionist']}>
            <DashboardPlaceholder 
              title="Receptionist Dashboard" 
              description="Patient registration and appointment management"
              role="Receptionist"
            />
          </ProtectedRoute>
        } 
      />
      
      {/* Billing Dashboard */}
      <Route 
        path="/billing/dashboard" 
        element={
          <ProtectedRoute allowedRoles={['billing']}>
            <DashboardPlaceholder 
              title="Billing Dashboard" 
              description="Invoice generation and payment processing"
              role="Billing"
            />
          </ProtectedRoute>
        } 
      />
      
      {/* Typist Dashboard */}
      <Route 
        path="/typist/dashboard" 
        element={
          <ProtectedRoute allowedRoles={['typist']}>
            <TypistDashboard />
          </ProtectedRoute>
        } 
      />
      
      {/* Dashboard Viewer */}
      <Route 
        path="/dashboard/viewer" 
        element={
          <ProtectedRoute allowedRoles={['dashboard_viewer']}>
            <DashboardPlaceholder 
              title="Dashboard Viewer" 
              description="Read-only analytics and monitoring"
              role="Dashboard Viewer"
            />
          </ProtectedRoute>
        } 
      />
      
      {/* Doctor Templates - Accessible by doctor_account and radiologist */}
      <Route 
        path="/doctor/templates" 
        element={
          <ProtectedRoute allowedRoles={['doctor_account', 'radiologist']}>
            <DoctorTemplates />
          </ProtectedRoute>
        } 
      />
      
      {/* ✅ FALLBACK DASHBOARD ROUTE */}
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <DashboardPlaceholder 
              title="Default Dashboard" 
              description="Generic dashboard interface"
              role="User"
            />
          </ProtectedRoute>
        } 
      />

      {/* ✅ UPDATED: Online Reporting Routes - Handle both regular and OHIF versions */}
      <Route 
        path="/online-reporting/:studyId" 
        element={
          <ProtectedRoute allowedRoles={['doctor_account', 'radiologist', 'typist', 'verifier', 'admin']}>
            <OnlineReportingRouteHandler />
          </ProtectedRoute>
        } 
      />
      
      {/* ✅ NEW: OHIF full-view route for view-only (header + Report Now) */}
      <Route
        path="/doctor/viewer/:studyId"
        element={
          <ProtectedRoute allowedRoles={['doctor_account', 'radiologist', 'admin']}>
            <OHIFViewerPage />
          </ProtectedRoute>
        }
      />
      
      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      
      {/* Catch all - redirect to login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

// ✅ UPDATED: Route handler to decide between regular and OHIF versions
const OnlineReportingRouteHandler = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const openOHIF = urlParams.get('openOHIF');
  const isVerifier = urlParams.get('verifier');
  const isVerification = urlParams.get('verification');
  
  console.log('🔀 [Route Handler] URL Parameters:', {
    openOHIF,
    isVerifier,
    isVerification
  });
  
  // ✅ NEW: Route to OHIF version if verifier mode OR openOHIF is true
  if (openOHIF === 'true' || isVerifier === 'true' || isVerification === 'true') {
    console.log('🖼️ [Route Handler] Loading OnlineReportingSystemWithOHIF');
    return <OnlineReportingSystemWithOHIF />;
  } else {
    console.log('📝 [Route Handler] Loading regular OnlineReportingSystem');
    return <OnlineReportingSystem />;
  }
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="App">
          <AppRoutes />
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
