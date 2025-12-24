import React from 'react';
import { useState, useRef, useEffect, useCallback } from 'react';

const ReportEditor = ({ content, onChange }) => {
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [paginatedContent, setPaginatedContent] = useState('');
  const [fontSize, setFontSize] = useState('11pt');
  const [fontFamily, setFontFamily] = useState('Arial');
  const [showWordCount, setShowWordCount] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [activeTools, setActiveTools] = useState({
    bold: false,
    italic: false,
    underline: false
  });
  const contentEditableRef = useRef(null);

  // When content prop changes, update the editor's view
  useEffect(() => {
    if (contentEditableRef.current && content !== contentEditableRef.current.innerHTML) {
      contentEditableRef.current.innerHTML = content || '';
    }
  }, [content]);

  // Process content for multi-page preview
  const processContentForPreview = useCallback((htmlContent) => {
    if (!htmlContent) return '';

    if (htmlContent.includes('report-page')) {
      return htmlContent.replace(
        /(<div[^>]*class="[^"]*report-page[^"]*"[^>]*>)/g, 
        '$1'
      );
    }

    return `
      <div class="report-page-preview" data-page="1">
        ${htmlContent}
      </div>
    `;
  }, []);

  // Update paginated content when content or preview mode changes
  useEffect(() => {
    if (isPreviewMode && content) {
      const processed = processContentForPreview(content);
      setPaginatedContent(processed);
    }
  }, [content, isPreviewMode, processContentForPreview]);

  const handleContentChange = (e) => {
    onChange(e.target.innerHTML);
    updateToolStates();
  };

  // Update active tool states
  const updateToolStates = () => {
    setActiveTools({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline')
    });
  };

  // Enhanced command wrapper
  const applyCommand = (command, value = null) => {
    document.execCommand(command, false, value);
    contentEditableRef.current?.focus();
    updateToolStates();
  };

  // Enhanced style application
  const applyStyle = (style, value) => {
    document.execCommand('styleWithCSS', false, true);
    document.execCommand(style, false, value);
    document.execCommand('styleWithCSS', false, false);
    contentEditableRef.current?.focus();
    updateToolStates();
  };

  // Word count functionality
  const getWordCount = () => {
    if (!content) return { words: 0, characters: 0 };
    const text = content.replace(/<[^>]*>/g, '').trim();
    const words = text ? text.split(/\s+/).length : 0;
    const characters = text.length;
    return { words, characters };
  };

  // Page count
  const getPageCount = () => {
    if (!content) return 0;
    const matches = content.match(/data-page="/g);
    return matches ? matches.length : 1;
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'b':
            e.preventDefault();
            applyCommand('bold');
            break;
          case 'i':
            e.preventDefault();
            applyCommand('italic');
            break;
          case 'u':
            e.preventDefault();
            applyCommand('underline');
            break;
          case 'Enter':
            if (e.shiftKey) {
              e.preventDefault();
              setIsPreviewMode(!isPreviewMode);
            }
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isPreviewMode]);

  const ToolbarButton = ({ onClick, active, children, tooltip, className = "" }) => (
    <button
      onClick={onClick}
      title={tooltip}
      className={`
        flex items-center justify-center px-1.5 py-1 rounded text-xs
        transition-all duration-150 hover:scale-105
        ${active 
          ? 'bg-green-600 text-white shadow-sm' 
          : 'bg-white text-gray-700 hover:bg-green-50 border border-gray-200 hover:border-green-300'
        }
        ${className}
      `}
    >
      {children}
    </button>
  );

  const ToolbarSeparator = () => (
    <div className="w-px h-5 bg-gray-200 mx-1"></div>
  );

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-green-50 to-emerald-50">
      
      {/* ✅ ULTRA COMPACT Toolbar */}
      <div className="flex-shrink-0 border-b border-green-200 bg-white shadow-sm">
        
        {/* Single Compact Row */}
        <div className="px-2 py-1 flex items-center gap-1 text-xs">
          
          {/* Mode Toggle - Ultra Compact */}
          <div className="flex bg-green-100 rounded-md p-0.5">
            <button
              onClick={() => setIsPreviewMode(false)}
              className={`px-2 py-1 rounded text-xs font-medium transition-all duration-150 ${
                !isPreviewMode 
                  ? 'bg-white text-green-700 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536L16.732 3.732z" />
              </svg>
            </button>
            <button
              onClick={() => setIsPreviewMode(true)}
              className={`px-2 py-1 rounded text-xs font-medium transition-all duration-150 ${
                isPreviewMode 
                  ? 'bg-white text-green-700 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>

          <ToolbarSeparator />

          {/* Font Controls - Compact */}
          <select
            value={fontFamily}
            onChange={(e) => {
              setFontFamily(e.target.value);
              applyCommand('fontName', e.target.value);
            }}
            className="px-1 py-0.5 bg-white border border-gray-200 rounded text-xs hover:border-green-300 focus:ring-1 focus:ring-green-400 focus:border-green-400"
          >
            <option value="Arial">Arial</option>
            <option value="Times New Roman">Times</option>
            <option value="Courier New">Courier</option>
            <option value="Verdana">Verdana</option>
            <option value="Georgia">Georgia</option>
          </select>

          <select
            value={fontSize}
            onChange={(e) => {
              setFontSize(e.target.value);
              applyStyle('fontSize', e.target.value);
            }}
            className="px-1 py-0.5 bg-white border border-gray-200 rounded text-xs hover:border-green-300 focus:ring-1 focus:ring-green-400 focus:border-green-400"
          >
            <option value="8pt">8pt</option>
            <option value="9pt">9pt</option>
            <option value="10pt">10pt</option>
            <option value="11pt">11pt</option>
            <option value="12pt">12pt</option>
            <option value="14pt">14pt</option>
            <option value="16pt">16pt</option>
            <option value="18pt">18pt</option>
          </select>

          <ToolbarSeparator />

          {/* Formatting Tools - Ultra Compact */}
          <div className="flex items-center gap-0.5">
            <ToolbarButton 
              onClick={() => applyCommand('bold')} 
              active={activeTools.bold}
              tooltip="Bold (Ctrl+B)"
            >
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 4a1 1 0 011-1h3a3 3 0 110 6h-1v2h1a3 3 0 110 6H6a1 1 0 01-1-1V4zm3 1H7v4h1a1 1 0 100-2V5zm-1 6v4h1a1 1 0 100-2v-2H7z" clipRule="evenodd" />
              </svg>
            </ToolbarButton>

            <ToolbarButton 
              onClick={() => applyCommand('italic')} 
              active={activeTools.italic}
              tooltip="Italic (Ctrl+I)"
            >
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M8.5 3.5A1.5 1.5 0 0110 2h4a1.5 1.5 0 011.5 1.5v.5a.5.5 0 01-1 0v-.5a.5.5 0 00-.5-.5h-4a.5.5 0 00-.5.5v13a.5.5 0 00.5.5h4a.5.5 0 00.5-.5v-.5a.5.5 0 011 0v.5A1.5 1.5 0 0114 18h-4a1.5 1.5 0 01-1.5-1.5v-13z"/>
              </svg>
            </ToolbarButton>

            <ToolbarButton 
              onClick={() => applyCommand('underline')} 
              active={activeTools.underline}
              tooltip="Underline (Ctrl+U)"
            >
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v8a5 5 0 1010 0V3a1 1 0 112 0v8a7 7 0 11-14 0V3a1 1 0 011-1zm2 14a1 1 0 100 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
            </ToolbarButton>

            {/* Color Picker - Compact */}
            <div className="relative">
              <label className="flex items-center justify-center px-1.5 py-1 bg-white border border-gray-200 rounded hover:bg-green-50 cursor-pointer transition-colors">
                <svg className="w-3 h-3 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 2a2 2 0 00-2 2v11a3 3 0 106 0V4a2 2 0 00-2-2H4z" clipRule="evenodd" />
                </svg>
                <input 
                  type="color" 
                  onChange={(e) => applyCommand('foreColor', e.target.value)} 
                  className="absolute inset-0 opacity-0 cursor-pointer" 
                />
              </label>
            </div>
          </div>

          <ToolbarSeparator />

          {/* Alignment Tools - Compact */}
          <div className="flex items-center gap-0.5">
            <ToolbarButton onClick={() => applyCommand('justifyLeft')} tooltip="Align Left">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </ToolbarButton>

            <ToolbarButton onClick={() => applyCommand('justifyCenter')} tooltip="Center">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1h3a1 1 0 110 2h-3v2h3a1 1 0 110 2h-3v2h3a1 1 0 110 2h-3v1a1 1 0 11-2 0v-1H6a1 1 0 110-2h3V10H6a1 1 0 110-2h3V6H6a1 1 0 110-2h3V3a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
            </ToolbarButton>

            <ToolbarButton onClick={() => applyCommand('justifyRight')} tooltip="Align Right">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M17 4a1 1 0 01-1 1H4a1 1 0 110-2h12a1 1 0 011 1zm0 4a1 1 0 01-1 1h-6a1 1 0 110-2h6a1 1 0 011 1zm0 4a1 1 0 01-1 1H4a1 1 0 110-2h12a1 1 0 011 1zm0 4a1 1 0 01-1 1h-6a1 1 0 110-2h6a1 1 0 011 1z" clipRule="evenodd" />
              </svg>
            </ToolbarButton>
          </div>

          <ToolbarSeparator />

          {/* List Tools - Compact */}
          <div className="flex items-center gap-0.5">
            <ToolbarButton onClick={() => applyCommand('insertUnorderedList')} tooltip="Bullet List">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 000 2h.01a1 1 0 100-2H3zm2.5 2A1.5 1.5 0 107 4v.01A1.5 1.5 0 005.5 6zM3 8a1 1 0 100 2h.01a1 1 0 100-2H3zm2.5 2A1.5 1.5 0 107 8v.01A1.5 1.5 0 005.5 10z" clipRule="evenodd" />
              </svg>
            </ToolbarButton>

            <ToolbarButton onClick={() => applyCommand('insertOrderedList')} tooltip="Numbered List">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3z" clipRule="evenodd" />
              </svg>
            </ToolbarButton>
          </div>

          {/* Right Side Controls - Ultra Compact */}
          <div className="ml-auto flex items-center gap-1">
            
            {/* Zoom Control - Compact */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setZoomLevel(Math.max(50, zoomLevel - 10))}
                className="p-0.5 hover:bg-green-100 rounded"
                title="Zoom Out"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10h-6" />
                </svg>
              </button>
              <span className="text-xs font-medium min-w-[2rem] text-center text-green-700">{zoomLevel}%</span>
              <button
                onClick={() => setZoomLevel(Math.min(200, zoomLevel + 10))}
                className="p-0.5 hover:bg-green-100 rounded"
                title="Zoom In"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                </svg>
              </button>
            </div>

            <ToolbarSeparator />

            {/* Word Count Toggle - Compact */}
            <button
              onClick={() => setShowWordCount(!showWordCount)}
              className={`px-1.5 py-1 rounded text-xs transition-colors ${
                showWordCount ? 'bg-green-100 text-green-700' : 'hover:bg-green-50'
              }`}
              title="Toggle Word Count"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </button>

            {/* Status Info - Ultra Compact */}
            {showWordCount && (
              <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded">
                <span>{getWordCount().words}w</span>
                <span>{getWordCount().characters}c</span>
              </div>
            )}

            {isPreviewMode && (
              <div className="flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>{getPageCount()}pg</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Editor & Preview Area - Compact */}
      <div className="flex-1 overflow-auto" style={{ 
        background: '#f8fffe',
        padding: '10px'
      }}>
        <style dangerouslySetInnerHTML={{ __html: documentStyles }} />
        {isPreviewMode ? (
          <div className="preview-container" style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}>
            <div 
              className="multi-page-preview"
              dangerouslySetInnerHTML={{ __html: paginatedContent || content }} 
            />
          </div>
        ) : (
          <div
            ref={contentEditableRef}
            contentEditable
            className="report-editor bg-white shadow-lg mx-auto transition-all duration-300"
            style={{ 
              width: '21cm', 
              minHeight: '29.7cm', 
              padding: '1.5cm',
              transform: `scale(${zoomLevel / 100})`,
              transformOrigin: 'top center',
              borderRadius: '6px'
            }}
            onInput={handleContentChange}
            onMouseUp={updateToolStates}
            onKeyUp={updateToolStates}
            suppressContentEditableWarning={true}
          />
        )}
      </div>
    </div>
  );
};

// Enhanced styles with green theme
const documentStyles = `
  /* Base editor styles with green theme */
  .report-editor {
    font-family: Arial, sans-serif;
    line-height: 1.4;
    color: #000;
    font-size: 11pt;
    background: white;
    outline: none;
    box-sizing: border-box;
    border-radius: 6px;
    box-shadow: 0 8px 32px rgba(34, 197, 94, 0.1);
    transition: all 0.3s ease;
    border: 1px solid rgba(34, 197, 94, 0.1);
  }
  
  .report-editor:focus {
    box-shadow: 0 8px 32px rgba(34, 197, 94, 0.15), 0 0 0 2px rgba(34, 197, 94, 0.3);
    border-color: rgba(34, 197, 94, 0.3);
  }

  /* Green-themed preview container */
  .preview-container {
    background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
    padding: 15px;
    min-height: 100vh;
    display: flex;
    justify-content: center;
    align-items: flex-start;
  }

  /* Enhanced multi-page preview */
  .multi-page-preview {
    width: 21cm;
    max-width: 21cm;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 30px;
  }

  /* Modern page styling with green accents */
  .report-page, .report-page-preview {
    background: white;
    width: 21cm;
    min-height: 29.7cm;
    padding: 0;
    margin: 0;
    box-shadow: 
      0 15px 35px rgba(34, 197, 94, 0.08),
      0 5px 15px rgba(0,0,0,0.05);
    box-sizing: border-box;
    position: relative;
    page-break-after: always;
    display: block;
    font-family: Arial, sans-serif;
    font-size: 11pt;
    line-height: 1.4;
    color: #000;
    border-radius: 6px;
    overflow: hidden;
    transition: all 0.3s ease;
    border: 1px solid rgba(34, 197, 94, 0.1);
  }

  .report-page:hover, .report-page-preview:hover {
    box-shadow: 
      0 20px 40px rgba(34, 197, 94, 0.12),
      0 8px 20px rgba(0,0,0,0.08);
    transform: translateY(-1px);
  }

  .report-page:last-child, .report-page-preview:last-child {
    page-break-after: auto;
  }

  /* Enhanced patient table with green theme */
  .page-header-table, .patient-info-table {
    width: calc(100% - 2.5cm);
    border-collapse: collapse;
    margin: 2.5rem 1.25cm 1rem 1.25cm;
    font-size: 10pt;
    border-radius: 6px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(34, 197, 94, 0.1);
  }

  .page-header-table td, .patient-info-table td {
    border: 1px solid #d1fae5;
    padding: 8px 10px;
    vertical-align: top;
    transition: background-color 0.2s ease;
  }

  .page-header-table td:nth-child(1),
  .page-header-table td:nth-child(3),
  .patient-info-table td:nth-child(1),
  .patient-info-table td:nth-child(3) {
    background: linear-gradient(135deg, #a7f3d0 0%, #6ee7b7 100%);
    font-weight: 600;
    width: 22%;
    color: #064e3b;
  }

  .page-header-table td:nth-child(2),
  .page-header-table td:nth-child(4),
  .patient-info-table td:nth-child(2),
  .patient-info-table td:nth-child(4) {
    background-color: #f0fdf4;
    width: 28%;
  }

  /* Modern content area */
  .content-flow-area {
    margin: 0 1.25cm;
    padding: 0;
    max-height: none;
    overflow: visible;
  }

  /* Enhanced signature section with green theme */
  .signature-section {
    margin: 1.25rem 1.25cm 1.25cm 1.25cm;
    text-align: left;
    font-size: 10pt;
    line-height: 1.3;
    border-top: 2px solid #d1fae5;
    padding-top: 1.25rem;
    page-break-inside: avoid;
    background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
    padding: 1.25rem;
    border-radius: 6px;
    margin-top: 1.5rem;
  }

  .doctor-name {
    font-weight: 700;
    margin-bottom: 5px;
    font-size: 12pt;
    color: #064e3b;
  }

  .doctor-specialization,
  .doctor-license {
    margin: 3px 0;
    font-size: 10pt;
    color: #166534;
  }

  .signature-image {
    width: 80px;
    height: 40px;
    margin: 8px 0;
    object-fit: contain;
    border-radius: 3px;
  }

  /* Modern text styles with green accents */
  p { 
    margin: 6px 0; 
    font-size: 11pt;
    line-height: 1.5;
    color: #374151;
  }
  
  h1, h2, h3 { 
    font-weight: 700; 
    text-decoration: underline; 
    margin: 15px 0 10px 0; 
    page-break-after: avoid;
    color: #064e3b;
  }
  h1 { font-size: 15pt; line-height: 1.3; }
  h2 { font-size: 13pt; line-height: 1.3; }
  h3 { font-size: 11pt; line-height: 1.3; }
  
  ul, ol { 
    padding-left: 20px; 
    margin: 8px 0; 
  }
  li { 
    margin: 3px 0; 
    font-size: 11pt;
    line-height: 1.4;
  }
  strong { font-weight: 700; color: #064e3b; }
  u { text-decoration: underline; }

  /* Green-themed page break indicators */
  div[style*="page-break-after: always"] {
    height: 3px;
    margin: 25px 1.25cm;
    border-top: 2px dashed #22c55e;
    background: linear-gradient(90deg, transparent 0%, #22c55e 50%, transparent 100%);
    position: relative;
    border-radius: 2px;
  }

  div[style*="page-break-after: always"]:after {
    content: "PAGE BREAK";
    position: absolute;
    top: -10px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, #22c55e, #16a34a);
    color: white;
    font-size: 8pt;
    padding: 3px 8px;
    border-radius: 4px;
    font-weight: 600;
    box-shadow: 0 2px 6px rgba(34, 197, 94, 0.3);
  }

  /* Enhanced page numbering with green theme */
  .report-page::after, .report-page-preview::after {
    content: "Page " attr(data-page);
    position: absolute;
    bottom: 1cm;
    right: 1.25cm;
    font-size: 9pt;
    color: #166534;
    font-weight: 500;
    background: rgba(240, 253, 244, 0.9);
    padding: 3px 6px;
    border-radius: 3px;
    backdrop-filter: blur(3px);
  }

  .report-page::before, .report-page-preview::before {
    content: "Page " attr(data-page);
    position: absolute;
    top: -30px;
    left: 0;
    font-size: 10px;
    color: #064e3b;
    background: linear-gradient(135deg, #dcfce7, #bbf7d0);
    padding: 4px 8px;
    border-radius: 4px;
    font-weight: 600;
    border: 1px solid #22c55e;
    box-shadow: 0 2px 4px rgba(34, 197, 94, 0.2);
  }

  @media print {
    .preview-container { 
      background: white; 
      padding: 0; 
    }
    
    .multi-page-preview {
      gap: 0;
    }
    
    .report-page, .report-page-preview { 
      margin: 0; 
      box-shadow: none; 
      page-break-after: always;
      border-radius: 0;
      border: none;
    }
    
    .report-page:last-child, .report-page-preview:last-child { 
      page-break-after: auto; 
    }
    
    .report-page::before, .report-page-preview::before,
    .report-page::after, .report-page-preview::after {
      display: none;
    }
    
    div[style*="page-break-after: always"] {
      page-break-after: always;
      border: none;
      height: 0;
      margin: 0;
      background: none;
    }
    
    div[style*="page-break-after: always"]:after {
      display: none;
    }
  }
`;

export default ReportEditor;