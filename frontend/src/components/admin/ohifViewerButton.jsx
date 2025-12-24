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
      Open in OHIF Viewer
    </button>
  );
};

export default OpenOHIFViewerButton;
