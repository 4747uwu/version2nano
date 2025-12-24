import React from 'react';
import { useNavigate } from 'react-router-dom';

const OnlineReportingButton = ({ study }) => {
  const navigate = useNavigate();

  const handleOpenOHIF = () => {
    // Navigate to the reporting system with OHIF enabled
    navigate(`/reporting/${study.orthancStudyID}?openOHIF=true`, {
      state: { study }
    });
  };

  return (
    <button
      onClick={handleOpenOHIF}
      className="text-purple-600 hover:text-purple-800 transition-colors duration-200"
      title="Open Online Reporting System with OHIF"
      aria-label="Open OHIF Reporting"
    >
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className="h-5 w-5" 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M9.75 17L9 20m0 0l-.75 3M9 20H5m4 0h10m0-12V5m0 0V2m0 3h.01M15 10h.01M21 10a9 9 0 11-18 0 9 9 0 0118 0z" 
        />
      </svg>
    </button>
  );
};

export default OnlineReportingButton;