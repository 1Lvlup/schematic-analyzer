import React, { useEffect, useState } from 'react';
import { ProjectData } from '../types';
import { getAllProjects, deleteProject } from '../services/storageService';
import { X, FileText, Calendar, Trash2, FolderOpen, Loader2 } from 'lucide-react';

interface LibrarySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadProject: (project: ProjectData) => void;
  currentProjectId?: string;
}

const LibrarySidebar: React.FC<LibrarySidebarProps> = ({ 
  isOpen, 
  onClose, 
  onLoadProject,
  currentProjectId 
}) => {
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const data = await getAllProjects();
      // Sort desc by timestamp
      setProjects(data.sort((a, b) => b.timestamp - a.timestamp));
    } catch (e) {
      console.error("Failed to load library", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchProjects();
    }
  }, [isOpen]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this analysis?')) {
      await deleteProject(id);
      fetchProjects();
    }
  };

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Panel */}
      <div className={`fixed top-0 left-0 h-full w-80 bg-slate-950 border-r border-slate-800 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FolderOpen className="text-blue-500 w-5 h-5" />
            Document Library
          </h2>
          <button 
            onClick={onClose}
            className="text-slate-500 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 h-[calc(100vh-80px)] overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-10 text-slate-500">
              <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No saved documents yet.</p>
              <p className="text-xs mt-2">Analyzed schematics will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {projects.map((proj) => (
                <div 
                  key={proj.id}
                  onClick={() => { onLoadProject(proj); onClose(); }}
                  className={`group relative p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md
                    ${currentProjectId === proj.id 
                      ? 'bg-blue-900/20 border-blue-500/50' 
                      : 'bg-slate-900 border-slate-800 hover:bg-slate-800 hover:border-slate-700'
                    }
                  `}
                >
                  <div className="flex items-start justify-between mb-2">
                     <div className="flex items-center gap-2 text-blue-200 font-medium truncate pr-4">
                       <FileText className="w-4 h-4 flex-shrink-0" />
                       <span className="truncate">{proj.name}</span>
                     </div>
                     <button 
                       onClick={(e) => handleDelete(e, proj.id)}
                       className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                     >
                       <Trash2 className="w-4 h-4" />
                     </button>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                       <Calendar className="w-3 h-3" />
                       {formatDate(proj.timestamp)}
                    </span>
                    <span className="bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
                      {proj.pages.length} page{proj.pages.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default LibrarySidebar;
