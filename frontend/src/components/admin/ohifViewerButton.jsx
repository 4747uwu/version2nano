import React from 'react';

const OpenOHIFViewerButton = ({ studyInstanceUID, studyId }) => {
  const handleClick = () => {
    // ✅ UPDATED: Open the full URL on another server
    const externalServerURL = 'http://165.232.189.64'; // Your external server
    const viewerURL = `${externalServerURL}/online-reporting/${studyId}?openOHIF=true`;

    // Open in new tab
    window.open(viewerURL, '_blank');
  };

  return (
    <button 
      onClick={handleClick} 
      className="btn btn-primary"
      title="Open Online Reporting with OHIF"
    >
      {/* ✅ ADDED: Monitor/Screen SVG Icon */}
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
          d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" 
        />
      </svg>
      {/* <span className="ml-2">OHIF Viewer</span> */}
    </button>
  );
};

export default OpenOHIFViewerButton;