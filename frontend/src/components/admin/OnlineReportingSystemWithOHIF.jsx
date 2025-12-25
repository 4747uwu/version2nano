import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import ReportEditor from '../layout/ReportEditor';
import TemplateTreeView from '../layout/TemplateTreeView';
import sessionManager from '../../services/sessionManager';
import { Camera } from 'lucide-react';

const OnlineReportingWithOHIF = () => {
  const { studyId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get studyInstanceUID from location state if available
  const passedStudy = location.state?.study;
  const passedStudyInstanceUID = passedStudy?.studyInstanceUID || passedStudy?.studyInstanceUIDs || null;
  
  // State declarations
  const [loading, setLoading] = useState(true);
  const [studyData, setStudyData] = useState(null);
  const [patientData, setPatientData] = useState(null);
  const [templates, setTemplates] = useState({});
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [reportData, setReportData] = useState({});
  const [reportContent, setReportContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [exportFormat, setExportFormat] = useState('docx');
  const [ohifViewerUrl, setOhifViewerUrl] = useState('');
  const [capturedImages, setCapturedImages] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // Layout width (percentage for left panel - OHIF viewer)
  const [leftPanelWidth, setLeftPanelWidth] = useState(50);

  // Width percentage options
  const widthOptions = [
    { value: 30, label: '30% / 70%' },
    { value: 40, label: '40% / 60%' },
    { value: 50, label: '50% / 50%' },
    { value: 60, label: '60% / 40%' },
    { value: 70, label: '70% / 30%' }
  ];

  // Re-initialize when studyId changes
  useEffect(() => {
    if (studyId) {
      setStudyData(null);
      setPatientData(null);
      setSelectedTemplate(null);
      setReportData({});
      setReportContent('');
      setSaving(false);
      setFinalizing(false);
      setExportFormat('docx');
      setOhifViewerUrl('');
      setCapturedImages([]);
      
      initializeReportingSystem();
    }
  }, [studyId]);

  const initializeReportingSystem = async () => {
    console.log('🚀 [Initialize OHIF+Report] Starting initialization for studyId:', studyId);
    setLoading(true);
    
    try {
      const currentUser = sessionManager.getCurrentUser();
      
      if (!currentUser) {
        toast.error('Authentication required.');
        navigate('/login');
        return;
      }
      
      const studyInfoEndpoint = `/documents/study/${studyId}/reporting-info`;
      const templatesEndpoint = '/html-templates/reporting';
      const existingReportEndpoint = `/reports/studies/${studyId}/edit-report`;
      
      const [studyInfoResponse, templatesResponse, existingReportResponse] = await Promise.allSettled([
        api.get(studyInfoEndpoint),
        api.get(templatesEndpoint),
        api.get(existingReportEndpoint)
      ]);

      // Process study info
      if (studyInfoResponse.status === 'fulfilled' && studyInfoResponse.value.data.success) {
        const data = studyInfoResponse.value.data.data;
        
        const studyInfo = data.studyInfo || {};
        const patientInfo = data.patientInfo || {};
        const allStudies = data.allStudies || [];
        
        const currentStudy = allStudies.find(study => study.studyId === studyId) || studyInfo;
        
        const orthancStudyID = currentStudy.orthancStudyID || currentStudy.studyId || studyInfo.studyId || null;
        const studyInstanceUID = passedStudyInstanceUID ||
                              currentStudy.studyInstanceUID || 
                              currentStudy.studyId || 
                              studyInfo.studyInstanceUID ||
                              studyInfo.studyId ||
                              null;

        // Build OHIF viewer URL
        if (studyInstanceUID) {
          // const OHIF_BASE = 'https://viewer.pacs.xcentic.com/viewer';
          const OHIF_BASE = 'http://165.232.189.64:4000/viewer';
          let studyUIDs = '';
          
          if (Array.isArray(studyInstanceUID) && studyInstanceUID.length) {
            studyUIDs = studyInstanceUID.join(',');
          } else if (typeof studyInstanceUID === 'string' && studyInstanceUID.trim()) {
            studyUIDs = studyInstanceUID.trim();
          } else if (orthancStudyID) {
            studyUIDs = orthancStudyID;
          }
          
          if (studyUIDs) {
            const viewerUrl = `${OHIF_BASE}?StudyInstanceUIDs=${encodeURIComponent(studyUIDs)}`;
            setOhifViewerUrl(viewerUrl);
            console.log('✅ [OHIF] Built viewer URL:', viewerUrl);
          }
        }
        
        setStudyData({
          _id: studyId,
          orthancStudyID: orthancStudyID,
          studyInstanceUID: studyInstanceUID,
          accessionNumber: currentStudy.accessionNumber || studyInfo.accessionNumber || 'N/A',
          modality: currentStudy.modality || studyInfo.modality || 'N/A',
          description: currentStudy.examDescription || studyInfo.examDescription || '',
          studyDate: currentStudy.studyDate || studyInfo.studyDate || new Date().toISOString(),
          ...currentStudy,
          ...studyInfo
        });
        
        setPatientData({
          patientId: patientInfo.patientId || patientInfo.patientID || 'N/A',
          patientName: patientInfo.fullName || patientInfo.patientName || 'Unknown Patient',
          fullName: patientInfo.fullName || patientInfo.patientName || 'Unknown Patient',
          age: patientInfo.age || 'N/A',
          gender: patientInfo.gender || 'N/A',
          clinicalHistory: typeof patientInfo.clinicalHistory === 'string' 
            ? patientInfo.clinicalHistory
            : patientInfo.clinicalHistory?.clinicalHistory || 'No clinical history available',
          ...patientInfo
        });
        
        const referringPhysicians = data.referringPhysicians || {};
        const currentReferring = referringPhysicians.current || {};
        
        setReportData({
          referringPhysician: currentReferring.name || 
                             currentStudy.referringPhysician || 
                             studyInfo.referringPhysician || 'N/A',
          clinicalHistory: patientInfo.clinicalHistory || 'No clinical history available'
        });

        toast.success(`Study loaded: ${currentStudy.accessionNumber || studyId}`);
      }
      
      // Process templates
      if (templatesResponse.status === 'fulfilled' && templatesResponse.value.data.success) {
        const templateData = templatesResponse.value.data.data.templates;
        setTemplates(templateData);
      }
      
      // Process existing report
      if (existingReportResponse.status === 'fulfilled' && existingReportResponse.value.data.success) {
        const existingReport = existingReportResponse.value.data.data.report;
        
        if (existingReport.reportContent?.htmlContent) {
          setReportContent(existingReport.reportContent.htmlContent);
          toast.success('Loaded existing report');
        }

        // Load template if exists
        if (existingReport.reportContent?.templateInfo?.templateId) {
          try {
            const templateResponse = await api.get(`/html-templates/${existingReport.reportContent.templateInfo.templateId}`);
            if (templateResponse.data.success) {
              setSelectedTemplate(templateResponse.data.data);
            }
          } catch (templateError) {
            console.warn('Could not load template from existing report:', templateError);
          }
        }

        setReportData(prev => ({
          ...prev,
          existingReport: {
            id: existingReport._id,
            reportId: existingReport.reportId,
            reportType: existingReport.reportType,
            reportStatus: existingReport.reportStatus
          }
        }));
      }

    } catch (error) {
      console.error('❌ [Initialize OHIF+Report] Error:', error);
      
      if (error.response?.status === 404) {
        toast.error(`Study ${studyId} not found or access denied.`);
        setTimeout(() => navigate(-1), 2000);
      } else if (error.response?.status === 401) {
        toast.error('Authentication expired. Please log in again.');
        navigate('/login');
      } else {
        toast.error(`Failed to load study: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle OHIF Image Capture
  const handleAttachOhifImage = () => {
    console.log('📸 [Capture] Requesting screenshot from OHIF...');
    const iframe = document.getElementById('ohif-viewer-iframe');
    
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage({ action: 'ATTACH_REPORT_SIGNAL' }, '*');
      toast.info('Capturing image from viewer...', { icon: '📸' });
    } else {
      toast.error('OHIF Viewer not ready');
    }
  };

  // Listen for Image from OHIF
  useEffect(() => {
    const handleOhifMessage = (event) => {
      if (!event.data) return;

      if (event.data.action === 'OHIF_IMAGE_CAPTURED') {
        const { image, viewportId, metadata } = event.data;

        const imageObj = {
          imageData: image,
          viewportId: viewportId || 'viewport-1',
          capturedAt: new Date().toISOString(),
          imageMetadata: { format: 'png', ...metadata },
          displayOrder: capturedImages.length
        };

        setCapturedImages(prev => [...prev, imageObj]);
        toast.success(`Image captured! (${capturedImages.length + 1} images stored)`);
      }
    };

    window.addEventListener('message', handleOhifMessage);
    return () => window.removeEventListener('message', handleOhifMessage);
  }, [capturedImages]);

  // Template selection handler
  const handleTemplateSelect = async (templateId) => {
    if (!templateId) return;
    
    try {
      const response = await api.get(`/html-templates/${templateId}`);
      
      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Failed to load template');
      }

      const templateData = response.data.data;

      const placeholders = {
        '--name--': patientData?.fullName || '[Patient Name]',
        '--patientid--': patientData?.patientId || '[Patient ID]',
        '--accessionno--': studyData?.accessionNumber || '[Accession Number]',
        '--age--': patientData?.age || '[Age]',
        '--gender--': patientData?.gender || '[Gender]',
        '--agegender--': `${patientData?.age || '[Age]'} / ${patientData?.gender || '[Gender]'}`,
        '--referredby--': reportData?.referringPhysician || '[Referring Physician]',
        '--reporteddate--': new Date().toLocaleDateString(),
        '--studydate--': studyData?.studyDate 
          ? new Date(studyData.studyDate).toLocaleDateString() 
          : '[Study Date]',
        '--modality--': studyData?.modality || '[Modality]',
        '--clinicalhistory--': reportData?.clinicalHistory || '[Clinical History]'
      };

      let processedContent = templateData.htmlContent || '';
      Object.entries(placeholders).forEach(([placeholder, value]) => {
        const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        processedContent = processedContent.replace(regex, value);
      });

      setSelectedTemplate(templateData);
      setReportContent(processedContent);

      try {
        await api.post(`/html-templates/${templateId}/record-usage`);
      } catch (usageError) {
        console.warn('Could not record template usage:', usageError);
      }

      toast.success(`Template "${templateData.title}" applied!`);
      
    } catch (error) {
      console.error('❌ [Template] Error:', error);
      toast.error(`Failed to load template: ${error.message}`);
    }
  };

  const handleSaveDraft = async () => {
    console.log('💾 [Draft] Starting draft save');
    console.log('🔍 [Draft] Report content length:', reportContent?.trim()?.length || 0);
    
    if (!reportContent.trim()) {
      console.error('❌ [Draft] Cannot save empty draft');
      toast.error('Cannot save an empty draft.');
      return;
    }
    
    setSaving(true);
    
    try {
      const currentUser = sessionManager.getCurrentUser();
      console.log('👤 [Draft] Current user for draft:', currentUser);
      
      const templateName = `${currentUser.email.split('@')[0]}.docx`;
      console.log(templateName);

      // ✅ FIXED: Properly handle referringPhysician with strict type checking
      let referringPhysicianName = '';
      
      if (typeof reportData?.referringPhysician === 'string' && reportData.referringPhysician.trim()) {
        referringPhysicianName = reportData.referringPhysician.trim();
      } else if (typeof reportData?.referringPhysician === 'object' && reportData.referringPhysician?.name) {
        referringPhysicianName = reportData.referringPhysician.name;
      } else if (typeof studyData?.referringPhysician === 'string' && studyData.referringPhysician.trim()) {
        referringPhysicianName = studyData.referringPhysician.trim();
      } else {
        referringPhysicianName = '';
      }

      const placeholders = {
        '--name--': patientData?.fullName || '',
        '--patientid--': patientData?.patientId || '',
        '--accessionno--': studyData?.accessionNumber || '',
        '--agegender--': `${patientData?.age || ''} / ${patientData?.gender || ''}`,
        '--referredby--': referringPhysicianName,
        '--reporteddate--': studyData?.studyDate ? new Date(studyData.studyDate).toLocaleDateString() : new Date().toLocaleDateString(),
        '--Content--': reportContent
      };

      console.log('🔍 [Draft] Placeholders prepared:', {
        studyId,
        templateName,
        placeholdersCount: Object.keys(placeholders).length,
        placeholders
      });

      // ✅ USE SAME ENDPOINT AS OnlineReportingSystem
      const endpoint = `/documents/study/${studyId}/generate-draft-report`;
      console.log('📡 [Draft] Calling draft endpoint:', endpoint);
      
      const response = await api.post(endpoint, {
        templateName,
        placeholders
      });

      console.log('📡 [Draft] Draft response:', {
        status: response.status,
        success: response.data?.success,
        data: response.data
      });

      if (response.data.success) {
        console.log('✅ [Draft] Draft saved successfully:', {
          documentId: response.data.data.documentId,
          filename: response.data.data.filename,
          downloadUrl: response.data.data.downloadUrl
        });
        
        toast.success('Draft saved successfully!', {
          duration: 4000,
          icon: '📝'  
        });
        
        // Optionally show download option
        if (response.data.data.downloadUrl) {
          console.log('🔗 [Draft] Download URL available, showing download option');
          setTimeout(() => {
            const shouldDownload = window.confirm('Draft saved! Would you like to download the draft document?');
            console.log('🔍 [Draft] User download choice:', shouldDownload);
            if (shouldDownload) {
              window.open(response.data.data.downloadUrl, '_blank');
            }
          }, 1000);
        }
        
      } else {
        console.error('❌ [Draft] Draft save failed:', response.data);
        throw new Error(response.data.message || 'Failed to save draft');
      }

    } catch (error) {
      console.error('❌ [Draft] Error saving draft:', error);
      console.error('❌ [Draft] Error details:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      
      // Handle specific error cases
      if (error.response?.status === 404) {
        console.error('❌ [Draft] 404 - Study not found');
        toast.error('Study not found. Please refresh and try again.');
      } else if (error.response?.status === 401) {
        console.error('❌ [Draft] 401 - Authentication expired');
        toast.error('Authentication expired. Please log in again.');
        navigate('/login');
      } else if (error.response?.status === 400) {
        console.error('❌ [Draft] 400 - Invalid data');
        toast.error('Invalid data provided. Please check your report content.');
      } else if (error.response?.status === 500) {
        console.error('❌ [Draft] 500 - Server error');
        toast.error('Server error while saving draft. Please try again.');
      } else {
        console.error('❌ [Draft] Unknown error');
        toast.error(`Failed to save draft: ${error.message || 'Unknown error'}`);
      }
    } finally {
      console.log('🏁 [Draft] Draft save process complete');
      setSaving(false);
    }
  };

  const handleFinalizeReport = async () => {
    console.log('🏁 [Finalize] Starting report finalization');
    console.log('🔍 [Finalize] Report content length:', reportContent?.trim()?.length || 0);
    console.log('🔍 [Finalize] Export format:', exportFormat);
    
    if (!reportContent.trim()) {
      console.error('❌ [Finalize] Cannot finalize empty report');
      toast.error('Please enter report content to finalize.');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to finalize this report as ${exportFormat.toUpperCase()}? Once finalized, it cannot be edited.`
    );
    
    console.log('🔍 [Finalize] User confirmation:', confirmed);
    if (!confirmed) return;

    setFinalizing(true);
    
    try {
      const currentUser = sessionManager.getCurrentUser();
      console.log('👤 [Finalize] Current user for finalization:', currentUser);
      
      const templateName = `${currentUser.email.split('@')[0]}.docx`;
      console.log(templateName);

      // ✅ FIXED: Properly handle referringPhysician with strict type checking
      let referringPhysicianName = '';
      
      if (typeof reportData?.referringPhysician === 'string' && reportData.referringPhysician.trim()) {
        referringPhysicianName = reportData.referringPhysician.trim();
      } else if (typeof reportData?.referringPhysician === 'object' && reportData.referringPhysician?.name) {
        referringPhysicianName = reportData.referringPhysician.name;
      } else if (typeof studyData?.referringPhysician === 'string' && studyData.referringPhysician.trim()) {
        referringPhysicianName = studyData.referringPhysician.trim();
      } else {
        referringPhysicianName = '';
      }

      const placeholders = {
        '--name--': patientData?.fullName || '',
        '--patientid--': patientData?.patientId || '',
        '--accessionno--': studyData?.accessionNumber || '',
        '--agegender--': `${patientData?.age || ''} / ${patientData?.gender || ''}`,
        '--referredby--': referringPhysicianName,
        '--reporteddate--': studyData?.studyDate ? new Date(studyData.studyDate).toLocaleDateString() : new Date().toLocaleDateString(),
        '--Content--': reportContent
      };

      console.log('🔍 [Finalize] Finalization data prepared:', {
        templateName,
        exportFormat,
        placeholdersCount: Object.keys(placeholders).length,
        placeholders
      });

      // ✅ USE SAME ENDPOINTS AS OnlineReportingSystem
      const endpoint = exportFormat === 'pdf' 
        ? `/documents/study/${studyId}/generate-pdf-report`
        : `/documents/study/${studyId}/generate-report`;

      console.log('📡 [Finalize] Calling finalization endpoint:', endpoint);

      const response = await api.post(endpoint, {
        templateName,
        placeholders,
        format: exportFormat
      });

      console.log('📡 [Finalize] Finalization response:', {
        status: response.status,
        success: response.data?.success,
        data: response.data
      });

      if (response.data.success) {
        console.log('✅ [Finalize] Report finalized successfully');
        toast.success(`Report finalized as ${exportFormat.toUpperCase()} successfully!`);
        
        if (response.data.data?.downloadUrl) {
          console.log('🔗 [Finalize] Opening download URL:', response.data.data.downloadUrl);
          window.open(response.data.data.downloadUrl, '_blank');
        }
        
        // Better back navigation
        const currentUser = sessionManager.getCurrentUser();
        console.log('🔄 [Finalize] Navigating back based on user role:', currentUser?.role);
        
        if (currentUser?.role === 'doctor_account') {
          setTimeout(() => navigate('/doctor/dashboard'), 3000);
        } else {
          setTimeout(() => navigate('/admin/dashboard'), 3000);
        }
      } else {
        console.error('❌ [Finalize] Finalization failed:', response.data);
        throw new Error(response.data.message || 'Failed to finalize report');
      }

    } catch (error) {
      console.error('❌ [Finalize] Error finalizing report:', error);
      console.error('❌ [Finalize] Error details:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      toast.error(error.message || 'An unexpected error occurred during finalization.');
    } finally {
      console.log('🏁 [Finalize] Finalization process complete');
      setFinalizing(false);
    }
  };

  const handleBackToWorklist = () => {
    navigate(-1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-black border-t-transparent mx-auto mb-3"></div>
          <p className="text-gray-600 text-xs">Loading study {studyId}...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      
      {/* Top Control Bar */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 shadow-sm">
        <div className="px-3 py-2">
          <div className="flex items-center justify-between gap-4">
            
            {/* Left Section - Study Info */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <div className="p-1 bg-blue-600 rounded">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <div className="text-xs">
                  <span className="font-medium text-gray-900">
                    {patientData?.fullName || 'Loading...'}
                  </span>
                  <span className="text-gray-500 ml-2">
                    {studyData?.accessionNumber || studyId?.substring(0, 8) + '...'}
                  </span>
                  <span className="ml-2 px-1.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                    OHIF + REPORT
                  </span>
                </div>
              </div>
              
              {/* Study Details */}
              <div className="flex items-center space-x-3 text-xs text-gray-600">
                <span>{studyData?.modality || 'N/A'}</span>
                <span>•</span>
                <span>{studyData?.studyDate ? new Date(studyData.studyDate).toLocaleDateString() : 'N/A'}</span>
                <span>•</span>
                <span className="text-green-600">{reportContent?.length || 0} chars</span>
              </div>
            </div>

            {/* Center Section - Controls */}
            <div className="flex items-center space-x-3">
              <button
                onClick={handleAttachOhifImage}
                className="flex items-center space-x-1 px-3 py-1 text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 rounded hover:bg-indigo-100 transition-colors"
                title="Capture active viewport"
              >
                <Camera className="w-3 h-3" />
                <span>Capture</span>
                {capturedImages.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-indigo-200 text-indigo-800 rounded-full text-xs">
                    {capturedImages.length}
                  </span>
                )}
              </button>
              
              <div className="flex items-center space-x-2">
                <label className="text-xs font-medium text-gray-700">Layout:</label>
                <select
                  value={leftPanelWidth}
                  onChange={(e) => setLeftPanelWidth(parseInt(e.target.value))}
                  className="px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
                >
                  {widthOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <label className="text-xs font-medium text-gray-700">Format:</label>
                <select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value)}
                  className="px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-green-400 bg-white"
                >
                  <option value="docx">DOCX</option>
                  <option value="pdf">PDF</option>
                </select>
              </div>
            </div>

            {/* Right Section - Action Buttons */}
            <div className="flex items-center space-x-2">
              <button
                onClick={handleSaveDraft}
                disabled={saving || !reportContent.trim()}
                className="px-3 py-1 text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? (
                  <span className="flex items-center gap-1">
                    <div className="animate-spin rounded-full h-2 w-2 border border-gray-500 border-t-transparent"></div>
                    Saving...
                  </span>
                ) : (
                  'Save Draft'
                )}
              </button>
              
              <button
                onClick={handleFinalizeReport}
                disabled={finalizing || !reportContent.trim()}
                className="px-3 py-1 text-xs font-medium bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {finalizing ? (
                  <span className="flex items-center gap-1">
                    <div className="animate-spin rounded-full h-2 w-2 border border-white border-t-transparent"></div>
                    Finalizing...
                  </span>
                ) : (
                  `Finalize as ${exportFormat.toUpperCase()}`
                )}
              </button>

              <button
                onClick={handleBackToWorklist}
                className="px-3 py-1 text-xs font-medium text-gray-600 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Template Sidebar */}
        <div className={`${sidebarOpen ? 'w-64' : 'w-0'} transition-all duration-300 bg-white border-r border-gray-200 overflow-hidden flex-shrink-0`}>
          <div className="h-full flex flex-col">
            <div className="bg-white border-b border-gray-200 px-4 py-3 flex-shrink-0">
              <h2 className="text-sm font-medium text-gray-900">Templates</h2>
            </div>
            <div className="flex-1 overflow-y-auto">
              <TemplateTreeView
                templates={templates}
                selectedTemplate={selectedTemplate}
                onTemplateSelect={handleTemplateSelect}
                studyModality={studyData?.modality}
              />
            </div>
          </div>
        </div>

        {/* Template Toggle Button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className={`fixed top-1/2 transform -translate-y-1/2 z-20 bg-white border border-gray-200 rounded-r-lg p-2 shadow-lg hover:bg-gray-50 transition-all duration-200 ${
            sidebarOpen ? 'left-64' : 'left-0'
          }`}
          title={sidebarOpen ? 'Close Templates' : 'Open Templates'}
        >
          <svg 
            className={`w-4 h-4 text-gray-600 transition-transform duration-200 ${
              sidebarOpen ? 'rotate-180' : ''
            }`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* LEFT PANEL - OHIF Viewer */}
        <div 
          className="bg-black flex flex-col border-r border-gray-300"
          style={{ width: `${leftPanelWidth}%` }}
        >
          <div className="flex-1 overflow-hidden">
            {ohifViewerUrl ? (
              <iframe
                id="ohif-viewer-iframe"
                src={ohifViewerUrl}
                className="w-full h-full border-0"
                title="OHIF DICOM Viewer"
                allow="cross-origin-isolated"
                onLoad={() => console.log('👁️ [OHIF] Viewer loaded')}
                onError={() => console.error('❌ [OHIF] Viewer failed to load')}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                  <p className="text-sm">Loading OHIF viewer...</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL - Report Editor */}
        <div 
          className="bg-white flex flex-col"
          style={{ width: `${100 - leftPanelWidth}%` }}
        >
          <div className="flex-1 min-h-0 overflow-hidden">
            <ReportEditor
              content={reportContent}
              onChange={(content) => setReportContent(content)}
            />
          </div>
        </div>
      </div>

      {/* Selected Template Indicator */}
      {selectedTemplate && (
        <div className="fixed bottom-4 right-4 z-40 bg-white border border-gray-200 rounded-lg shadow-lg p-3 max-w-xs">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0 mr-2">
              <p className="text-sm font-medium text-gray-900 truncate">
                📋 {selectedTemplate.title}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {selectedTemplate.templateScope === 'global' ? 'Global Template' : 'Personal Template'}
              </p>
            </div>
            <button
              onClick={() => setSelectedTemplate(null)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OnlineReportingWithOHIF;