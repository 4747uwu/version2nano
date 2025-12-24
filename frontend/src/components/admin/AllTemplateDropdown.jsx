import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import { 
  ChevronDown, 
  Search, 
  Globe, 
  User,
  FileText, 
  Filter,
  X,
  Check,
  Crown
} from 'lucide-react';
import toast from 'react-hot-toast';

const AllTemplateDropdown = ({ onTemplateSelect, selectedTemplate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [templates, setTemplates] = useState({});
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [stats, setStats] = useState({ globalCount: 0, personalCount: 0 });
  
  const dropdownRef = useRef(null);

  // Categories for filtering
  const categoryOptions = [
    'all', 'General', 'CT', 'CR', 'CT SCREENING FORMAT', 
    'ECHO', 'EEG-TMT-NCS', 'MR', 'MRI SCREENING FORMAT', 
    'PT', 'US', 'Other'
  ];

  // Fetch all accessible templates
  const fetchAllTemplates = async () => {
    setLoading(true);
    try {
      const response = await api.get('/html-templates/doctor/all-accessible', {
        params: {
          category: selectedCategory,
          search: searchTerm.trim(),
          limit: 100
        }
      });

      if (response.data.success) {
        setTemplates(response.data.data.templates);
        setStats(response.data.data.stats);
      }
    } catch (error) {
      console.error('Error fetching all templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  // Load templates when dropdown opens or filters change
  useEffect(() => {
    if (isOpen) {
      fetchAllTemplates();
    }
  }, [isOpen, selectedCategory, searchTerm]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle template selection
  const handleTemplateSelect = (template) => {
    onTemplateSelect(template);
    setIsOpen(false);
    const templateType = template.templateScope === 'global' ? 'Global' : 'Personal';
    toast.success(`Applied ${templateType}: ${template.title}`, { duration: 1500 });
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isOpen) {
        fetchAllTemplates();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const totalTemplates = stats.globalCount + stats.personalCount;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* ✅ SUPER COMPACT: Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-1 px-2 py-1 text-xs font-medium rounded border transition-all duration-200
          ${selectedTemplate
            ? 'bg-green-50 border-green-300 text-green-700'
            : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
          }
        `}
      >
        <Globe size={12} />
        <span>All</span>
        {totalTemplates > 0 && (
          <span className="bg-green-100 text-green-700 px-1 py-0.5 rounded-full text-xs font-medium">
            {totalTemplates}
          </span>
        )}
        <ChevronDown 
          size={10} 
          className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* ✅ INCREASED HEIGHT: Dropdown Panel */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
          
          {/* ✅ COMPACT: Header */}
          <div className="p-2 border-b border-gray-100">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-xs font-semibold text-gray-900 flex items-center gap-1">
                <Globe size={12} className="text-green-600" />
                All Templates
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-0.5 hover:bg-gray-100 rounded"
              >
                <X size={12} className="text-gray-500" />
              </button>
            </div>

            {/* ✅ COMPACT: Stats */}
            {(stats.globalCount > 0 || stats.personalCount > 0) && (
              <div className="flex items-center gap-2 mb-1 text-xs">
                <div className="flex items-center gap-0.5">
                  <Crown size={10} className="text-amber-600" />
                  <span className="text-gray-600">{stats.globalCount}</span>
                </div>
                <div className="flex items-center gap-0.5">
                  <User size={10} className="text-blue-600" />
                  <span className="text-gray-600">{stats.personalCount}</span>
                </div>
              </div>
            )}

            {/* ✅ COMPACT: Search Bar */}
            <div className="relative mb-1">
              <Search size={10} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
                className="w-full pl-6 pr-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            {/* ✅ COMPACT: Category Filter */}
            <div className="flex items-center gap-1">
              <Filter size={10} className="text-gray-400" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="flex-1 text-xs border border-gray-200 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-green-500"
              >
                {categoryOptions.map(category => (
                  <option key={category} value={category}>
                    {category === 'all' ? 'All' : category}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ✅ INCREASED HEIGHT: Content */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-3 text-center">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-green-600 border-t-transparent mx-auto mb-1"></div>
                <p className="text-xs text-gray-500">Loading...</p>
              </div>
            ) : totalTemplates === 0 ? (
              <div className="p-3 text-center">
                <FileText size={16} className="text-gray-400 mx-auto mb-1" />
                <p className="text-xs text-gray-500 mb-0.5">No templates found</p>
                <p className="text-xs text-gray-400">
                  {searchTerm ? 'Try different search' : 'No templates available'}
                </p>
              </div>
            ) : (
              Object.entries(templates).map(([category, categoryData]) => {
                const hasGlobal = categoryData.global && categoryData.global.length > 0;
                const hasPersonal = categoryData.personal && categoryData.personal.length > 0;
                
                if (!hasGlobal && !hasPersonal) return null;

                return (
                  <div key={category} className="border-b border-gray-100 last:border-b-0">
                    {/* ✅ COMPACT: Category Header */}
                    <div className="px-2 py-1 bg-gray-50 border-b border-gray-100">
                      <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                        {category} ({(categoryData.global?.length || 0) + (categoryData.personal?.length || 0)})
                      </h4>
                    </div>

                    {/* ✅ COMPACT: Global Templates */}
                    {hasGlobal && (
                      <>
                        <div className="px-2 py-0.5 bg-amber-50 border-b border-amber-100">
                          <div className="flex items-center gap-0.5">
                            <Crown size={10} className="text-amber-600" />
                            <span className="text-xs font-medium text-amber-800">
                              Global ({categoryData.global.length})
                            </span>
                          </div>
                        </div>
                        {categoryData.global.map(template => (
                          <button
                            key={template._id}
                            onClick={() => handleTemplateSelect(template)}
                            className={`
                              w-full px-2 py-1.5 text-left hover:bg-green-50 transition-colors group
                              ${selectedTemplate?._id === template._id ? 'bg-green-50 border-r-2 border-green-500' : ''}
                            `}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0 mr-1">
                                <p className="text-xs font-medium text-gray-900 truncate group-hover:text-green-700">
                                  {template.title}
                                </p>
                                {template.templateMetadata?.description && (
                                  <p className="text-xs text-gray-500 truncate mt-0.5">
                                    {template.templateMetadata.description}
                                  </p>
                                )}
                                <div className="flex items-center gap-1 mt-1">
                                  <span className="inline-flex items-center px-1 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                    <Crown size={8} className="mr-0.5" />
                                    Global
                                  </span>
                                  {template.templateMetadata?.isDefault && (
                                    <span className="inline-flex items-center px-1 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                      Default
                                    </span>
                                  )}
                                  <span className="text-xs text-gray-400">
                                    {template.createdBy?.fullName || 'System'}
                                  </span>
                                </div>
                              </div>
                              {selectedTemplate?._id === template._id && (
                                <Check size={12} className="text-green-600 flex-shrink-0" />
                              )}
                            </div>
                          </button>
                        ))}
                      </>
                    )}

                    {/* ✅ COMPACT: Personal Templates */}
                    {hasPersonal && (
                      <>
                        <div className="px-2 py-0.5 bg-blue-50 border-b border-blue-100">
                          <div className="flex items-center gap-0.5">
                            <User size={10} className="text-blue-600" />
                            <span className="text-xs font-medium text-blue-800">
                              Personal ({categoryData.personal.length})
                            </span>
                          </div>
                        </div>
                        {categoryData.personal.map(template => (
                          <button
                            key={template._id}
                            onClick={() => handleTemplateSelect(template)}
                            className={`
                              w-full px-2 py-1.5 text-left hover:bg-green-50 transition-colors group
                              ${selectedTemplate?._id === template._id ? 'bg-green-50 border-r-2 border-green-500' : ''}
                            `}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0 mr-1">
                                <p className="text-xs font-medium text-gray-900 truncate group-hover:text-green-700">
                                  {template.title}
                                </p>
                                {template.templateMetadata?.description && (
                                  <p className="text-xs text-gray-500 truncate mt-0.5">
                                    {template.templateMetadata.description}
                                  </p>
                                )}
                                <div className="flex items-center gap-1 mt-1">
                                  <span className="inline-flex items-center px-1 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    <User size={8} className="mr-0.5" />
                                    Personal
                                  </span>
                                  {template.templateMetadata?.isDefault && (
                                    <span className="inline-flex items-center px-1 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                      Default
                                    </span>
                                  )}
                                  <span className="text-xs text-gray-400">
                                    {new Date(template.updatedAt).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                              {selectedTemplate?._id === template._id && (
                                <Check size={12} className="text-green-600 flex-shrink-0" />
                              )}
                            </div>
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* ✅ COMPACT: Footer */}
          {totalTemplates > 0 && (
            <div className="p-1 border-t border-gray-100 bg-gray-50 text-xs text-gray-500 text-center">
              {totalTemplates} template{totalTemplates !== 1 ? 's' : ''}
              {stats.globalCount > 0 && stats.personalCount > 0 && 
                ` (${stats.globalCount} global, ${stats.personalCount} personal)`
              }
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AllTemplateDropdown;