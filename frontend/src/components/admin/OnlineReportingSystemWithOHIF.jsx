import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import api from '../../services/api';
import { toast } from 'react-toastify';
import ReportEditor from './ReportEditorWithOhif';
import DoctorTemplateDropdown from './DoctorTemplateDropdown';
import AllTemplateDropdown from './AllTemplateDropdown';
import sessionManager from '../../services/sessionManager';
import { CheckCircle, XCircle, Edit, Camera } from 'lucide-react';

const OnlineReportingSystemWithOHIF = (study) => {
  const { studyId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const [capturedImages, setCapturedImages] = useState([]);
  
  console.log('🚀 [Component] OnlineReportingSystemWithOHIF mounted for studyId:', study);
  
  // ✅ NEW: Get studyInstanceUID from location state if available
  const passedStudy = location.state?.study;
  const passedStudyInstanceUID = passedStudy?.studyInstanceUID || passedStudy?.studyInstanceUIDs || null;
  
  // ✅ DEFINE ALL STATE VARIABLES FIRST (before any usage)
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
  const [downloadOptions, setDownloadOptions] = useState(null);
  
  // ✅ NEW: Verifier-specific states
  const [verifying, setVerifying] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  
  // ✅ UPDATED: Width percentage dropdown instead of drag/drop
  const [leftPanelWidth, setLeftPanelWidth] = useState(60); // Percentage

  // ✅ CHECK IF VERIFIER MODE (after state declarations)
  const isVerifierMode = searchParams.get('verifierMode') === 'true';
  const isVerificationMode = searchParams.get('action') === 'verify';

  // ✅ Width percentage options
  const widthOptions = [
    { value: 30, label: '30% / 70%' },
    { value: 40, label: '40% / 60%' },
    { value: 50, label: '50% / 50%' },
    { value: 60, label: '60% / 40%' },
    { value: 70, label: '70% / 30%' },
    { value: 80, label: '80% / 20%' }
  ];

  // 🔍 DEBUG: Log all state changes
  useEffect(() => {
    console.log('📊 [State Update] studyData:', studyData);
  }, [studyData]);

  useEffect(() => {
    console.log('📊 [State Update] patientData:', patientData);
  }, [patientData]);

  useEffect(() => {
    console.log('📊 [State Update] reportContent length:', reportContent?.length || 0);
  }, [reportContent]);

  // Re-initialize when studyId changes
  useEffect(() => {
    console.log('🔄 [Effect] studyId changed:', studyId);
    if (studyId) {
      console.log('🔄 [Effect] Resetting all state and loading new study data');
      // Reset all state when switching studies
      setStudyData(null);
      setPatientData(null);
      setSelectedTemplate(null);
      setReportData({});
      setReportContent('');
      setSaving(false);
      setFinalizing(false);
      setVerifying(false);
      setRejecting(false);
      setExportFormat('docx');
      setOhifViewerUrl(''); // ✅ Reset OHIF URL
      
      // Load new study data
      initializeReportingSystem();
    }
  }, [studyId]);

  const initializeReportingSystem = async () => {
    console.log('🚀 [Initialize] Starting reporting system initialization for studyId:', studyId);
    setLoading(true);
    
    try {
      const currentUser = sessionManager.getCurrentUser();
      console.log('👤 [Initialize] Current user:', currentUser);
      
      if (!currentUser) {
        console.error('❌ [Initialize] No current user found');
        toast.error('Authentication required.');
        navigate('/login');
        return;
      }
      
      console.log('📧 [Initialize] User email:', currentUser.email);
      console.log('👤 [Initialize] User role:', currentUser.role);
      
      // ✅ FIXED: Check for URL parameters to determine endpoint
      const urlParams = new URLSearchParams(window.location.search);
      const reportIdParam = urlParams.get('reportId');
      const actionParam = urlParams.get('action');
      
      // 🔧 KEEP: Using the existing endpoints as requested
      const studyInfoEndpoint = `/documents/study/${studyId}/reporting-info`;
      const templatesEndpoint = '/html-templates/reporting';
      
      // ✅ UPDATED: Use different endpoint for specific report editing
      let existingReportEndpoint = `/reports/studies/${studyId}/edit-report`;
      if (reportIdParam && actionParam === 'edit') {
        existingReportEndpoint = `/reports/studies/${studyId}/edit-report?reportId=${reportIdParam}`;
        console.log('📝 [Initialize] Loading specific report for editing:', reportIdParam);
      }
      
      console.log('📡 [API] Calling endpoints:');
      console.log('  - Study Info:', studyInfoEndpoint);
      console.log('  - Templates:', templatesEndpoint);
      console.log('  - Existing Report:', existingReportEndpoint);
      
      const [studyInfoResponse, templatesResponse, existingReportResponse] = await Promise.allSettled([
        api.get(studyInfoEndpoint),
        api.get(templatesEndpoint),
        api.get(existingReportEndpoint)
      ]);

      // Process study info
      if (studyInfoResponse.status === 'fulfilled' && studyInfoResponse.value.data.success) {
        const data = studyInfoResponse.value.data.data;
        console.log('🔍 Loaded study data:', data);
        
        const studyInfo = data.studyInfo || {};
        const patientInfo = data.patientInfo || {};
        const allStudies = data.allStudies || [];
        
        const currentStudy = allStudies.find(study => study.studyId === studyId) || studyInfo;
        
        const orthancStudyID = currentStudy.orthancStudyID || 
                              currentStudy.studyId || 
                              studyInfo.studyId ||
                              null;
      
        // ✅ PRIORITY: Use passed studyInstanceUID first, then fetch from API
        const studyInstanceUID = passedStudyInstanceUID ||
                              currentStudy.studyInstanceUID || 
                              currentStudy.studyId || 
                              studyInfo.studyInstanceUID ||
                              studyInfo.studyId ||
                              null;
      
        console.log('🔍 Extracted IDs:', {
          orthancStudyID,
          studyInstanceUID,
          passedStudyInstanceUID,
          originalStudyId: currentStudy.studyId || studyInfo.studyId
        });

        // ✅ NEW: Build OHIF viewer URL
        if (studyInstanceUID) {
          const OHIF_BASE = 'https://pacs.xcentic.com/viewer';
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
          } else {
            console.warn('⚠️ [OHIF] No valid StudyInstanceUID to build viewer URL');
          }
        } else {
          console.warn('⚠️ [OHIF] No studyInstanceUID available');
        }
        
        setStudyData({
          _id: studyId,
          orthancStudyID: orthancStudyID,
          studyInstanceUID: studyInstanceUID,
          accessionNumber: currentStudy.accessionNumber || studyInfo.accessionNumber || 'N/A',
          modality: currentStudy.modality || studyInfo.modality || 'N/A',
          description: currentStudy.examDescription || studyInfo.examDescription || '',
          studyDate: currentStudy.studyDate || studyInfo.studyDate || new Date().toISOString(),
          workflowStatus: currentStudy.status || studyInfo.workflowStatus || studyInfo.status || 'assigned_to_doctor',
          priority: currentStudy.priorityLevel || studyInfo.priorityLevel || 'NORMAL',
          caseType: currentStudy.caseType || studyInfo.caseType,
          seriesCount: currentStudy.seriesCount || studyInfo.seriesCount,
          instanceCount: currentStudy.instanceCount || studyInfo.instanceCount,
          sourceLab: currentStudy.sourceLab || studyInfo.sourceLab,
          assignedDoctor: currentStudy.assignedDoctor || studyInfo.assignedDoctor,
          referringPhysician: currentStudy.referringPhysician || studyInfo.referringPhysician,
          createdAt: currentStudy.createdAt || studyInfo.createdAt,
          studyId: currentStudy.studyId || studyInfo.studyId,
          ...currentStudy,
          ...studyInfo
        });
        
        setPatientData({
          patientId: patientInfo.patientId || patientInfo.patientID || 'N/A',
          patientName: patientInfo.fullName || patientInfo.patientName || 'Unknown Patient',
          fullName: patientInfo.fullName || patientInfo.patientName || 'Unknown Patient',
          age: patientInfo.age || 'N/A',
          gender: patientInfo.gender || 'N/A',
          dateOfBirth: patientInfo.dateOfBirth || 'N/A',
          clinicalHistory: typeof patientInfo.clinicalHistory === 'string' 
            ? patientInfo.clinicalHistory
            : patientInfo.clinicalHistory?.clinicalHistory || 
              'No clinical history available',
          ...patientInfo
        });
        
        setDownloadOptions({
          downloadOptions: {
            hasR2CDN: data.downloadOptions?.hasR2CDN || false,
            hasWasabiZip: data.downloadOptions?.hasWasabiZip || false,
            hasR2Zip: data.downloadOptions?.hasR2Zip || false,
            r2SizeMB: data.downloadOptions?.r2SizeMB || 0,
            wasabiSizeMB: data.downloadOptions?.wasabiSizeMB || 0,
            zipStatus: data.downloadOptions?.zipStatus || 'not_started'
          },
          orthancStudyID: orthancStudyID,
          studyInstanceUID: studyInstanceUID
        });
        
        const referringPhysicians = data.referringPhysicians || {};
        const currentReferring = referringPhysicians.current || {};
        
        setReportData({
          referringPhysician: currentReferring.name || 
                             currentStudy.referringPhysician || 
                             studyInfo.physicians?.referring?.name || 
                             studyInfo.referringPhysician ||
                             'N/A',
           clinicalHistory: (() => {
            const clinicalHist = patientInfo.clinicalHistory || data.clinicalHistory;
            
            // If it's already a string, use it
            if (typeof clinicalHist === 'string') {
              return clinicalHist;
            }
            
            // If it's an object, extract the actual clinical history text
            if (typeof clinicalHist === 'object' && clinicalHist !== null) {
              return clinicalHist.clinicalHistory || 
                     clinicalHist.previousInjury || 
                     clinicalHist.previousSurgery || 
                     'No clinical history available';
            }
            
            return 'No clinical history available';
          })()
        });

        toast.success(`Loaded study: ${currentStudy.accessionNumber || studyInfo.accessionNumber || studyId}`);
      } else {
        console.error('❌ [Study] Failed to load study data');
        toast.error("Failed to load study data.");
      }
      
      // Process templates (existing logic - keep unchanged)
      if (templatesResponse.status === 'fulfilled' && templatesResponse.value.data.success) {
        const templateData = templatesResponse.value.data.data.templates;
        console.log('✅ [Templates] Setting templates:', {
          templateCount: Object.keys(templateData).length,
          templateCategories: Object.keys(templateData)
        });
        setTemplates(templateData);
      } else {
        console.error('❌ [Templates] Failed to load templates');
      }
      
      // ✅ ENHANCED: Process existing report if available (handles both specific and latest)
      if (existingReportResponse.status === 'fulfilled' && existingReportResponse.value.data.success) {
        const existingReport = existingReportResponse.value.data.data.report;
        const source = existingReportResponse.value.data.source;
        
        console.log('📝 [Existing Report] Found existing report:', {
          reportId: existingReport._id,
          reportType: existingReport.reportType,
          reportStatus: existingReport.reportStatus,
          contentLength: existingReport.reportContent?.htmlContent?.length || 0,
          hasTemplate: !!existingReport.templateInfo?.templateId,
          source: source,
          isSpecificEdit: reportIdParam && actionParam === 'edit'
        });

        // Load the existing report content
        if (existingReport.reportContent?.htmlContent) {
          console.log('📝 [Existing Report] Loading existing content into editor');
          setReportContent(existingReport.reportContent.htmlContent);
          
          // Show notification about loaded report
          if (reportIdParam && actionParam === 'edit') {
            toast.success(
              `📝 Loaded specific report for editing: ${existingReport.reportType} (${existingReport.reportStatus})`,
              { duration: 5000, icon: '✏️' }
            );
          } else {
            const reportTypeText = existingReport.reportStatus === 'draft' ? 'draft' : 'existing';
            toast.success(
              `📝 Loaded ${reportTypeText} report (${new Date(existingReport.updatedAt).toLocaleDateString()})`,
              { duration: 5000, icon: '📄' }
            );
          }
        }

        // If report was created with a template, try to load that template
        if (existingReport.reportContent?.templateInfo?.templateId) {
          console.log('📄 [Existing Report] Report has template, attempting to load:', existingReport.reportContent.templateInfo.templateId);
          
          try {
            const templateResponse = await api.get(`/html-templates/${existingReport.reportContent.templateInfo.templateId}`);
            
            if (templateResponse.data.success) {
              const template = templateResponse.data.data;
              console.log('✅ [Existing Report] Template loaded for existing report:', template.title);
              setSelectedTemplate(template);
              
              toast.success(`Template "${template.title}" loaded from existing report`, {
                duration: 3000,
                icon: '📋'
              });
            }
          } catch (templateError) {
            console.warn('⚠️ [Existing Report] Could not load template from existing report:', templateError);
            // Don't fail the whole process if template loading fails
          }
        }

        // Store the existing report information for potential updates
        setReportData(prev => ({
          ...prev,
          existingReport: {
            id: existingReport._id,
            reportId: existingReport.reportId,
            reportType: existingReport.reportType,
            reportStatus: existingReport.reportStatus,
            createdAt: existingReport.createdAt,
            updatedAt: existingReport.updatedAt
          }
        }));

      } else if (existingReportResponse.status === 'fulfilled' && existingReportResponse.value.status === 404) {
        console.log('📝 [Existing Report] No existing report found - starting fresh');
        setReportContent(''); // Reset content for new report
      } else {
        console.warn('⚠️ [Existing Report] Could not check for existing reports:', existingReportResponse.reason?.message);
        setReportContent(''); // Reset content if there's an error
      }

    } catch (error) {
      console.error('❌ [Initialize] API Error:', error);
      
      if (error.response?.status === 404) {
        console.error('❌ [Initialize] 404 Error - Study not found:', studyId);
        toast.error(`Study ${studyId} not found or access denied.`);
        setTimeout(() => navigate('/doctor/dashboard'), 2000);
      } else if (error.response?.status === 401) {
        console.error('❌ [Initialize] 401 Error - Authentication expired');
        toast.error('Authentication expired. Please log in again.');
        navigate('/login');
      } else {
        console.error('❌ [Initialize] Unknown error:', error.message);
        toast.error(`Failed to load study: ${error.message || 'Unknown error'}`);
      }
    } finally {
      console.log('🏁 [Initialize] Initialization complete, setting loading to false');
      setLoading(false);
    }
  };


  // ✅ NEW: Handle OHIF Image Capture
  const handleAttachOhifImage = () => {
    console.log('📸 [Capture] Requesting screenshot from OHIF...');
    const iframe = document.getElementById('ohif-viewer-iframe'); // We will add this ID below
    
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage({ action: 'ATTACH_REPORT_SIGNAL' }, '*');
      toast.info('Capturing image from viewer...', { icon: '📸' });
    } else {
      toast.error('OHIF Viewer not ready');
    }
  };

  // ✅ NEW: Listen for the Image returning from OHIF
  useEffect(() => {
    const handleOhifMessage = (event) => {
      // Security check: Ensure message has data
      if (!event.data) return;

      if (event.data.action === 'OHIF_IMAGE_CAPTURED') {
        console.log('📸 [Capture] Received image data from OHIF');
        const { image, viewportId, metadata } = event.data;

        // ✅ Store image data in state ONLY (do NOT insert into HTML)
        const imageObj = {
          imageData: image,
          viewportId: viewportId || 'viewport-1',
          capturedAt: new Date().toISOString(),
          imageMetadata: {
            format: 'png',
            ...metadata
          },
          displayOrder: capturedImages.length
        };

        setCapturedImages(prev => [...prev, imageObj]);
        
        // ✅ Show success message without inserting into HTML
        toast.success(`Image captured from ${viewportId}! (${capturedImages.length + 1} images stored)`);
        
        console.log('✅ [Capture] Image stored in capturedImages array:', {
          viewportId,
          totalImages: capturedImages.length + 1,
          imageSize: image.length
        });
      }
    };

    window.addEventListener('message', handleOhifMessage);
    return () => window.removeEventListener('message', handleOhifMessage);
  }, [capturedImages]); // ✅ Add capturedImages as dependency


  // ✅ NEW: Template selection handler (add this before handleSaveDraft)
  const handleTemplateSelect = async (template) => {
    if (!template) return;
    
    try {
      console.log('📄 [Template] Loading template:', template.title);

      // Get the full template data
      const response = await api.get(`/html-templates/${template._id}`);
      
      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Failed to load template');
      }

      const templateData = response.data.data;
      console.log('✅ [Template] Template loaded successfully');

      // Prepare placeholders for replacement
      const placeholders = {
        '--name--': patientData?.fullName || patientData?.patientName || '[Patient Name]',
        '--patientid--': patientData?.patientId || '[Patient ID]',
        '--accessionno--': studyData?.accessionNumber || '[Accession Number]',
        '--age--': patientData?.age || '[Age]',
        '--gender--': patientData?.gender || '[Gender]',
        '--agegender--': `${patientData?.age || '[Age]'} / ${patientData?.gender || '[Gender]'}`,
        '--referredby--': typeof reportData?.referringPhysician === 'string' 
          ? reportData.referringPhysician
          : studyData?.referringPhysician || '[Referring Physician]',
        '--reporteddate--': studyData?.studyDate 
          ? new Date(studyData.studyDate).toLocaleDateString() 
          : new Date().toLocaleDateString(),
        '--studydate--': studyData?.studyDate 
          ? new Date(studyData.studyDate).toLocaleDateString() 
          : '[Study Date]',
        '--modality--': studyData?.modality || '[Modality]',
        '--clinicalhistory--': reportData?.clinicalHistory || patientData?.clinicalHistory || '[Clinical History]'
      };

      // Replace placeholders in template content
      let processedContent = templateData.htmlContent || '';
      Object.entries(placeholders).forEach(([placeholder, value]) => {
        const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        processedContent = processedContent.replace(regex, value);
      });

      // Set the template and content
      setSelectedTemplate(templateData);
      setReportContent(processedContent);

      // Record template usage (non-blocking)
      try {
        await api.post(`/html-templates/${template._id}/record-usage`);
      } catch (usageError) {
        console.warn('Could not record template usage:', usageError);
      }

      const templateType = template.templateScope === 'global' ? 'Global' : 'Personal';
      toast.success(`${templateType} template "${template.title}" applied successfully!`);
      
    } catch (error) {
      console.error('❌ [Template] Error loading template:', error);
      toast.error(`Failed to load template: ${error.message}`);
    }
  };

  const handleSaveDraft = async () => {
    console.log('💾 [Draft] Starting draft save');
    console.log('🔍 [Draft] Report content length:', reportContent?.trim()?.length || 0);
    console.log('🔍 [Draft] Captured images count:', capturedImages.length);
    console.log('🔍 [Draft] Has existing report:', !!reportData.existingReport);
    
    if (!reportContent.trim()) {
      console.error('❌ [Draft] Cannot save empty draft');
      toast.error('Cannot save an empty draft.');
      return;
    }
    
    setSaving(true);
    
    try {
      const currentUser = sessionManager.getCurrentUser();
      console.log('👤 [Draft] Current user for draft:', currentUser);
      
      const templateName = `${currentUser.email.split('@')[0]}_draft_${Date.now()}.docx`;
      
      // ✅ FIX: Ensure referringPhysician is always a string
      const referringPhysicianName = typeof reportData?.referringPhysician === 'string' 
        ? reportData.referringPhysician
        : typeof reportData?.referringPhysician === 'object' && reportData.referringPhysician?.name
        ? reportData.referringPhysician.name
        : studyData?.referringPhysician || 'N/A';
      
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
        referringPhysician: referringPhysicianName,
        referringPhysicianType: typeof referringPhysicianName,
        isUpdate: !!reportData.existingReport,
        capturedImagesCount: capturedImages.length // ✅ NEW
      });

      const endpoint = `/reports/studies/${studyId}/store-draft`;
      console.log('📡 [Draft] Calling report storage endpoint:', endpoint);
      
      const response = await api.post(endpoint, {
        templateName,
        placeholders,
        htmlContent: reportContent,
        templateId: selectedTemplate?._id,
        templateInfo: selectedTemplate ? {
          templateId: selectedTemplate._id,
          templateName: selectedTemplate.title,
          templateCategory: selectedTemplate.category,
          templateTitle: selectedTemplate.title
        } : null,
        // ✅ NEW: Include captured images
        capturedImages: capturedImages.map(img => ({
          ...img,
          capturedBy: currentUser._id
        })),
        // ✅ NEW: Include existing report info for updates
        existingReportId: reportData.existingReport?.id || null
      });

      console.log('📡 [Draft] Report storage response:', {
        status: response.status,
        success: response.data?.success,
        data: response.data
      });

      if (response.data.success) {
        console.log('✅ [Draft] Draft saved successfully:', {
          reportId: response.data.data.reportId,
          filename: response.data.data.filename,
          wasUpdate: !!reportData.existingReport
        });
        
        // ✅ UPDATE: Store the report info for future updates
        if (!reportData.existingReport) {
          setReportData(prev => ({
            ...prev,
            existingReport: {
              id: response.data.data.reportId,
              reportType: 'draft',
              reportStatus: 'draft',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          }));
        }
        
        const actionText = reportData.existingReport ? 'updated' : 'saved';
        toast.success(`Draft ${actionText} successfully!`, {
          duration: 4000,
          icon: '📝'  
        });
        
      } else {
        console.error('❌ [Draft] Draft save failed:', response.data);
        throw new Error(response.data.message || 'Failed to save draft');
      }

    } catch (error) {
      console.error('❌ [Draft] Error saving draft:', error);
      
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

  const handleUpdateReport = async () => {
    console.log('📝 [Verifier Update] Starting report update');
    console.log('🔍 [Verifier Update] Report content length:', reportContent?.trim()?.length || 0);
    console.log('🔍 [Verifier Update] Has existing report:', !!reportData.existingReport);
    
    if (!reportContent.trim()) {
      console.error('❌ [Verifier Update] Cannot update empty report');
      toast.error('Cannot update an empty report.');
      return;
    }
    
    setSaving(true);
    
    try {
      const currentUser = sessionManager.getCurrentUser();
      console.log('👤 [Verifier Update] Current user for update:', currentUser);
      
      // ✅ NEW: Use verifier-specific update endpoint
      const endpoint = `/verifier/studies/${studyId}/update-report`;
      console.log('📡 [Verifier Update] Calling verifier update endpoint:', endpoint);
      
      const updatePayload = {
        htmlContent: reportContent,
        verificationNotes: 'Report updated during verification process',
        templateId: selectedTemplate?._id,
        templateInfo: selectedTemplate ? {
          templateId: selectedTemplate._id,
          templateName: selectedTemplate.title,
          templateCategory: selectedTemplate.category,
          templateTitle: selectedTemplate.title
        } : null,
        // ✅ IMPORTANT: Keep as finalized for verifier workflow
        maintainFinalizedStatus: true
      };
      
      const response = await api.post(endpoint, updatePayload);

      console.log('📡 [Verifier Update] Update response:', {
        status: response.status,
        success: response.data?.success,
        data: response.data
      });

      if (response.data.success) {
        console.log('✅ [Verifier Update] Report updated successfully');
        
        toast.success('Report updated successfully!', {
          duration: 4000,
          icon: '✏️'  
        });
        
      } else {
        console.error('❌ [Verifier Update] Update failed:', response.data);
        throw new Error(response.data.message || 'Failed to update report');
      }

    } catch (error) {
      console.error('❌ [Verifier Update] Error updating report:', error);
      
      if (error.response?.status === 404) {
        toast.error('Report not found. Please refresh and try again.');
      } else if (error.response?.status === 401) {
        toast.error('Authentication expired. Please log in again.');
        navigate('/login');
      } else if (error.response?.status === 403) {
        toast.error('Access denied. Verifier permissions required.');
      } else {
        toast.error(`Failed to update report: ${error.message || 'Unknown error'}`);
      }
    } finally {
      console.log('🏁 [Verifier Update] Update process complete');
      setSaving(false);
    }
  };

  const handleFinalizeReport = async () => {
    console.log('🏁 [Finalize] Starting report finalization');
    console.log('🔍 [Finalize] Captured images count:', capturedImages.length);
    
    if (!reportContent.trim()) {
      toast.error('Please enter report content to finalize.');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to finalize this report as ${exportFormat.toUpperCase()}? Once finalized, it cannot be edited.`
    );
    
    if (!confirmed) return;

    setFinalizing(true);
    
    try {
      const currentUser = sessionManager.getCurrentUser();
      const templateName = `${currentUser.email.split('@')[0]}_final_${Date.now()}.${exportFormat}`;
      
      // ✅ FIX: Ensure referringPhysician is always a string (same as draft)
      const referringPhysicianName = typeof reportData?.referringPhysician === 'string' 
        ? reportData.referringPhysician
        : typeof reportData?.referringPhysician === 'object' && reportData.referringPhysician?.name
        ? reportData.referringPhysician.name
        : studyData?.referringPhysician || 'N/A';
      
      const placeholders = {
        '--name--': patientData?.fullName || '',
        '--patientid--': patientData?.patientId || '',
        '--accessionno--': studyData?.accessionNumber || '',
        '--agegender--': `${patientData?.age || ''} / ${patientData?.gender || ''}`,
        '--referredby--': referringPhysicianName, // ✅ FIX: Always send as string
        '--reporteddate--': studyData?.studyDate ? new Date(studyData.studyDate).toLocaleDateString() : new Date().toLocaleDateString(),
        '--Content--': reportContent
      };

      console.log('🔍 [Finalize] Placeholders prepared:', {
        studyId,
        templateName,
        placeholdersCount: Object.keys(placeholders).length,
        referringPhysician: referringPhysicianName,
        referringPhysicianType: typeof referringPhysicianName,
        format: exportFormat
      });

      // ✅ SIMPLIFIED: Only store the finalized report, no generation step
      const storeEndpoint = `/reports/studies/${studyId}/store-finalized`;
      console.log('📡 [Finalize] Calling finalize storage endpoint:', storeEndpoint);
      
      const response = await api.post(storeEndpoint, {
        templateName,
        placeholders,
        htmlContent: reportContent,
        format: exportFormat,
        templateId: selectedTemplate?._id,
        templateInfo: selectedTemplate ? {
          templateId: selectedTemplate._id,
          templateName: selectedTemplate.title,
          templateCategory: selectedTemplate.category,
          templateTitle: selectedTemplate.title
        } : null,
        // ✅ NEW: Include captured images
        capturedImages: capturedImages.map(img => ({
          ...img,
          capturedBy: currentUser._id
        }))
      });

      console.log('📡 [Finalize] Finalize storage response:', {
        status: response.status,
        success: response.data?.success,
        data: response.data
      });

      if (response.data.success) {
        console.log('✅ [Finalize] Report finalized and stored successfully');
        toast.success(`Report finalized as ${exportFormat.toUpperCase()} successfully!`, {
          duration: 4000,
          icon: '🎉'
        });
        
        // Navigate back to dashboard
        const currentUser = sessionManager.getCurrentUser();
        if (currentUser?.role === 'doctor_account') {
          setTimeout(() => navigate('/doctor/dashboard'), 3000);
        } else if (currentUser?.role === 'verifier') {
          setTimeout(() => navigate('/verifier/dashboard'), 3000);
        } else {
          setTimeout(() => navigate('/admin/dashboard'), 3000);
        }
      } else {
        throw new Error(response.data.message || 'Failed to finalize report');
      }

    } catch (error) {
      console.error('❌ [Finalize] Error finalizing report:', error);
      
      if (error.response?.status === 404) {
        console.error('❌ [Finalize] 404 - Study not found');
        toast.error('Study not found. Please refresh and try again.');
      } else if (error.response?.status === 401) {
        console.error('❌ [Finalize] 401 - Authentication expired');
        toast.error('Authentication expired. Please log in again.');
        navigate('/login');
      } else if (error.response?.status === 400) {
        console.error('❌ [Finalize] 400 - Invalid data');
        toast.error('Invalid data provided. Please check your report content.');
      } else if (error.response?.status === 500) {
        console.error('❌ [Finalize] 500 - Server error');
        toast.error('Server error while finalizing report. Please try again.');
      } else {
        console.error('❌ [Finalize] Unknown error');
        toast.error(`Failed to finalize report: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setFinalizing(false);
    }
  };

  // ✅ NEW: Verifier-specific functions
  const handleVerifyReport = async () => {
    console.log('✅ [Verify] Starting report verification');
    
    if (!reportContent.trim()) {
      toast.error('Report content is required for verification.');
      return;
    }

    const confirmed = window.confirm('Are you sure you want to verify this report? This action cannot be undone.');
    if (!confirmed) return;

    setVerifying(true);
    
    try {
      const response = await api.post(`/verifier/studies/${studyId}/verify`, {
        approved: true,
        verificationNotes: 'Report verified through OHIF + Reporting interface',
        corrections: [],
        verificationTimeMinutes: 0 // Calculate if needed
      });

      if (response.data.success) {
        toast.success('Report verified successfully!', {
          duration: 4000,
          icon: '✅'
        });
        
        // Navigate back to verifier dashboard
        setTimeout(() => navigate('/verifier/dashboard'), 2000);
      } else {
        throw new Error(response.data.message || 'Failed to verify report');
      }

    } catch (error) {
      console.error('❌ [Verify] Error verifying report:', error);
      toast.error(`Failed to verify report: ${error.message}`);
    } finally {
      setVerifying(false);
    }
  };

  const handleRejectReport = async () => {
    console.log('❌ [Reject] Starting report rejection');
    
    const rejectionReason = prompt('Please provide a reason for rejecting this report:');
    if (!rejectionReason || !rejectionReason.trim()) {
      toast.error('Rejection reason is required.');
      return;
    }

    const confirmed = window.confirm('Are you sure you want to reject this report?');
    if (!confirmed) return;

    setRejecting(true);
    
    try {
      const response = await api.post(`/verifier/studies/${studyId}/verify`, {
        approved: false,
        verificationNotes: rejectionReason,
        rejectionReason: rejectionReason,
        corrections: [],
        verificationTimeMinutes: 0 // Calculate if needed
      });

      if (response.data.success) {
        toast.success('Report rejected successfully!', {
          duration: 4000,
          icon: '❌'
        });
        
        // Navigate back to verifier dashboard
        setTimeout(() => navigate('/verifier/dashboard'), 2000);
      } else {
        throw new Error(response.data.message || 'Failed to reject report');
      }

    } catch (error) {
      console.error('❌ [Reject] Error rejecting report:', error);
      toast.error(`Failed to reject report: ${error.message}`);
    } finally {
      setRejecting(false);
    }
  };

  const handleBackToWorklist = () => {
    console.log('🔙 [Navigation] Back to worklist clicked');
    const currentUser = sessionManager.getCurrentUser();
    console.log('👤 [Navigation] Current user for navigation:', currentUser);
    
    if (isVerifierMode || currentUser?.role === 'verifier') {
      console.log('🔍 [Navigation] Navigating to verifier dashboard');
      navigate('/verifier/dashboard');
    } else if (currentUser?.role === 'doctor_account') {
      console.log('🩺 [Navigation] Navigating to doctor dashboard');
      navigate('/doctor/dashboard');
    } else if (currentUser?.role === 'admin') {
      console.log('👑 [Navigation] Navigating to admin dashboard');
      navigate('/admin/dashboard');
    } else if (currentUser?.role === 'lab_staff') {
      console.log('🧪 [Navigation] Navigating to lab dashboard');
      navigate('/lab/dashboard');
    } else {
      console.log('❓ [Navigation] Unknown role, navigating to login');
      navigate('/login');
    }
  };

  // Final debug log
  console.log('📊 [Debug] Current component state:', {
    studyId,
    loading,
    isVerifierMode,
    isVerificationMode,
    studyData: studyData ? 'loaded' : 'null',
    patientData: patientData ? 'loaded' : 'null',
    downloadOptions: downloadOptions ? 'loaded' : 'null',
    templatesCount: Object.keys(templates).length,
    selectedTemplate: selectedTemplate ? selectedTemplate.title : 'none',
    reportContentLength: reportContent?.length || 0,
    saving,
    finalizing,
    verifying,
    rejecting
  });

  if (loading) {
    console.log('⏳ [Render] Showing loading screen');
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-black border-t-transparent mx-auto mb-3"></div>
          <p className="text-gray-600 text-xs">Loading study {studyId}...</p>
        </div>
      </div>
    );
  }

  console.log('🎨 [Render] Rendering OHIF + Report Editor component');

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      
      {/* ✅ UPDATED: Top Control Bar with Verifier Controls */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 shadow-sm">
        <div className="px-3 py-2">
          <div className="flex items-center justify-between gap-4">
            
            {/* Left Section - Study Info */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <div className="p-1 bg-gray-600 rounded">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="text-xs">
                  <span className="font-medium text-gray-900">
                    {patientData?.fullName || 'Loading...'}
                  </span>
                  <span className="text-gray-500 ml-2">
                    {studyData?.accessionNumber || studyId?.substring(0, 8) + '...' || ''}
                  </span>
                  {/* ✅ NEW: Verifier Mode Indicator */}
                  {isVerifierMode && (
                    <span className="ml-2 px-1.5 py-0.5 text-xs font-medium bg-purple-100 text-purple-800 rounded">
                      VERIFIER MODE
                    </span>
                  )}
                </div>
              </div>
              
              {/* Study Details */}
              <div className="flex items-center space-x-3 text-xs text-gray-600">
                <span>{studyData?.modality || 'N/A'}</span>
                <span>•</span>
                <span>{studyData?.studyDate ? new Date(studyData.studyDate).toLocaleDateString() : 'N/A'}</span>
                <span>•</span>
                <span
                  className="max-w-[28ch] truncate text-gray-700"
                  title={reportData?.clinicalHistory || patientData?.clinicalHistory || 'No clinical history'}
                >
                  {(() => {
                    const hist = reportData?.clinicalHistory || patientData?.clinicalHistory || '';
                    if (!hist) return 'No clinical history';
                    return hist.length > 80 ? hist.substring(0, 80) + '…' : hist;
                  })()}
                </span>
                <span>•</span>
                <span className="text-green-600">{reportContent?.length || 0} chars</span>
              </div>
            </div>

            {/* ✅ UPDATED: Center Section - Template Dropdowns OR Verifier Controls */}
            <div className="flex items-center space-x-3">
            
              {!isVerifierMode ? (
                // Normal Template Dropdowns for non-verifiers
                <>
                  <div className="flex items-center space-x-2">
                    <DoctorTemplateDropdown 
                      onTemplateSelect={handleTemplateSelect}
                      selectedTemplate={selectedTemplate?.templateScope === 'doctor_specific' ? selectedTemplate : null}
                    />
                    <AllTemplateDropdown 
                      onTemplateSelect={handleTemplateSelect}
                      selectedTemplate={selectedTemplate}
                    />
                  </div>

                  <div className="h-6 w-px bg-gray-300"></div>

                  <button
                    onClick={handleAttachOhifImage}
                    className="flex items-center space-x-1 px-3 py-1 text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 rounded hover:bg-indigo-100 transition-colors"
                    title="Capture active viewport to report"
                  >
                    <Camera className="w-3 h-3" />
                    <span>Capture</span>
                  </button>
                  
                  <div className="flex items-center space-x-2">
                    <label className="text-xs font-medium text-gray-700">Layout:</label>
                    <select
                      value={leftPanelWidth}
                      onChange={(e) => {
                        const newWidth = parseInt(e.target.value);
                        console.log('📏 [UI] Layout width changed:', `${newWidth}% / ${100 - newWidth}%`);
                        setLeftPanelWidth(newWidth);
                      }}
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
                      onChange={(e) => {
                        console.log('📄 [UI] Export format changed:', e.target.value);
                        setExportFormat(e.target.value);
                      }}
                      className="px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-green-400 bg-white"
                    >
                      <option value="docx">DOCX</option>
                      <option value="pdf">PDF</option>
                    </select>
                  </div>
                </>
              ) : (
                // ✅ NEW: Ultra-Compact Verifier Controls
                <>
                  <div className="flex items-center space-x-2">
                    <label className="text-xs font-medium text-purple-700">Layout:</label>
                    <select
                      value={leftPanelWidth}
                      onChange={(e) => setLeftPanelWidth(parseInt(e.target.value))}
                      className="px-1.5 py-0.5 text-xs border border-purple-200 rounded focus:outline-none focus:ring-1 focus:ring-purple-400 bg-white"
                    >
                      {widthOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="h-6 w-px bg-purple-300"></div>

                  {/* ✅ NEW: Ultra-Compact Verifier Action Buttons */}
                  <div className="flex items-center space-x-1">
                  
                    {/* Update Report */}
                    <button
                      onClick={() => {
                        console.log('📝 [Verifier] Update report clicked');
                        handleUpdateReport(); // ✅ Use new verifier-specific function
                      }}
                      disabled={saving || !reportContent.trim()}
                      className="px-2 py-1 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="Update Report"
                    >
                      {saving ? (
                        <div className="flex items-center space-x-1">
                          <div className="animate-spin rounded-full h-2 w-2 border border-white border-t-transparent"></div>
                          <span>Updating</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1">
                          <Edit className="w-3 h-3" />
                          <span>Update</span>
                        </div>
                      )}
                    </button>

                    {/* Reject Report */}
                    <button
                      onClick={() => {
                        console.log('❌ [Verifier] Reject report clicked');
                        handleRejectReport();
                      }}
                      disabled={rejecting}
                      className="px-2 py-1 text-xs font-medium bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="Reject Report"
                    >
                      {rejecting ? (
                        <div className="flex items-center space-x-1">
                          <div className="animate-spin rounded-full h-2 w-2 border border-white border-t-transparent"></div>
                          <span>Rejecting</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1">
                          <XCircle className="w-3 h-3" />
                          <span>Reject</span>
                        </div>
                      )}
                    </button>

                    {/* Verify Report */}
                    <button
                      onClick={() => {
                        console.log('✅ [Verifier] Verify report clicked');
                        handleVerifyReport();
                      }}
                      disabled={verifying || !reportContent.trim()}
                      className="px-2 py-1 text-xs font-medium bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="Verify Report"
                    >
                      {verifying ? (
                        <div className="flex items-center space-x-1">
                          <div className="animate-spin rounded-full h-2 w-2 border border-white border-t-transparent"></div>
                          <span>Verifying</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1">
                          <CheckCircle className="w-3 h-3" />
                          <span>Verify</span>
                        </div>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Right Section - Action Buttons */}
            <div className="flex items-center space-x-2">
            
              {!isVerifierMode && (
                <>
                  <button
                    onClick={() => {
                      console.log('💾 [UI] Save draft button clicked');
                      handleSaveDraft();
                    }}
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
                    onClick={() => {
                      console.log('🏁 [UI] Finalize report button clicked');
                      handleFinalizeReport();
                    }}
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
                </>
              )}

              <button
                onClick={() => {
                  console.log('🔙 [UI] Back to dashboard button clicked');
                  handleBackToWorklist();
                }}
                className="px-3 py-1 text-xs font-medium text-gray-600 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
              >
                {isVerifierMode ? 'Back to Verifier' : 'Back to Dashboard'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ NEW: Verifier Mode Status Bar */}
      {isVerifierMode && (
        <div className="flex-shrink-0 bg-purple-50 border-b border-purple-200 px-3 py-1">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-3 text-purple-700">
              <span className="font-medium">🔍 Verification Mode Active</span>
              <span>•</span>
              <span>Patient: {patientData?.fullName || 'Loading...'}</span>
              <span>•</span>
              <span>Study: {studyData?.accessionNumber || 'Loading...'}</span>
            </div>
            <div className="flex items-center space-x-2 text-purple-600">
              <span>Report Status: {studyData?.workflowStatus || 'Unknown'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex">
        
        {/* LEFT PANEL - OHIF Viewer */}
        <div 
          className="bg-black border-r border-gray-200 flex flex-col"
          style={{ width: `${leftPanelWidth}%` }}
        >
          <div className="flex-1">
            {ohifViewerUrl ? (
              <iframe
                id="ohif-viewer-iframe"  // 👈 ADD THIS ID
                src={ohifViewerUrl}
                className="w-full h-full border-0"
                title="OHIF DICOM Viewer"
                allow="cross-origin-isolated" // Recommended for shared array buffer
                onLoad={() => console.log('👁️ [OHIF] OHIF viewer loaded successfully')}
                onError={() => console.error('❌ [OHIF] OHIF viewer failed to load')}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                  <p className="text-sm">Loading OHIF viewer...</p>
                  <p className="text-xs text-gray-400 mt-2">Waiting for StudyInstanceUID...</p>
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
          <div className="flex-1 min-h-0">
            <ReportEditor
              content={reportContent}
              onChange={(content) => {
                console.log('✏️ [Editor] Content changed, new length:', content?.length || 0);
                setReportContent(content);
              }}
            />
          </div>
        </div>
      </div>

      {/* ✅ NEW: Selected Template Indicator */}
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

      {/* ✅ COMPACT: Show existing report notification */}
      {reportData.existingReport && (
        <div className="fixed top-16 right-2 z-50 bg-blue-50 border-l-4 border-blue-400 p-2 rounded-lg shadow-lg max-w-xs">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-4 w-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-2">
              <p className="text-xs text-blue-700">
                <strong>Existing {reportData.existingReport.reportStatus} report loaded</strong>
              </p>
              <p className="text-xs text-blue-600 mt-1">
                {new Date(reportData.existingReport.updatedAt).toLocaleDateString()}
              </p>
            </div>
            <div className="ml-auto pl-2">
              <div className="-mx-1.5 -my-1.5">
                <button
                  onClick={() => setReportData(prev => ({ ...prev, existingReport: null }))}
                  className="inline-flex bg-blue-50 rounded-md p-1 text-blue-500 hover:bg-blue-100"
                >
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OnlineReportingSystemWithOHIF;