import React from 'react';
import { useNavigate } from 'react-router-dom';

const OHIFReportButton = ({ study }) => {
  const navigate = useNavigate();
  console.log('📄 OHIFReportButton study prop:', study);

  const handleClick = () => {
    if (!study?._id) {
      console.error('❌ Study ID is required');
      return;
    }

    console.log('🚀 Opening OHIF + Report interface for study:', study._id);
    
    // Navigate to the new combined interface
    navigate(`/reporting-ohif/${study._id}`, {
      state: { 
        study: {
          studyInstanceUID: study.studyInstanceUID || study.studyId,
          accessionNumber: study.accessionNumber,
          patientName: study.patientName,
          modality: study.modality
        }
      }
    });
  };

  return (
    <button
      onClick={handleClick}
      className="p-2 text-blue-600 hover:text-blue-800 transition-colors duration-200 hover:bg-blue-50 rounded-full group"
      title="Open OHIF + Report Interface"
    >
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className="h-5 w-5 group-hover:scale-110 transition-transform" 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    </button>
  );
};

export default OHIFReportButton;