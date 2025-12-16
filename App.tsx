import React, { useState, useEffect } from 'react';
import UploadZone from './components/UploadZone';
import AnalysisResult from './components/AnalysisResult';
import InteractiveSchematicViewer from './components/InteractiveSchematicViewer';
import LibrarySidebar from './components/LibrarySidebar';
import { SchematicAnalysis, AnalysisStatus, PageResult, ProjectData } from './types';
import { analyzeSchematicImage, detectSchematicPages } from './services/geminiService';
import { convertPdfToImages } from './services/pdfService';
import { saveProject } from './services/storageService';
import { Loader2, Zap, Settings, Github, FileText, ChevronLeft, ChevronRight, Download, FolderOpen, Menu } from 'lucide-react';

const App: React.FC = () => {
  const [status, setStatus] = useState<AnalysisStatus>('idle');
  const [loadingMessage, setLoadingMessage] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  
  // Data State
  const [currentProjectName, setCurrentProjectName] = useState<string>("");
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [pages, setPages] = useState<PageResult[]>([]);
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);

  // UI State
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);

  // Auto-save when analysis completes
  useEffect(() => {
    if (status === 'complete' && pages.length > 0) {
      const saveToLibrary = async () => {
        // Avoid auto-saving if we just loaded an existing project (unless we want to update it, but let's keep it simple: new uploads = new saves)
        // If currentProjectId exists, it means we loaded it or already saved it.
        // We only want to auto-save *new* uploads.
        if (!currentProjectId) {
            const newId = crypto.randomUUID();
            const name = currentProjectName || `Untitled Schematic ${new Date().toLocaleTimeString()}`;
            
            const project: ProjectData = {
                id: newId,
                name: name,
                timestamp: Date.now(),
                pages: pages
            };
            
            try {
                await saveProject(project);
                setCurrentProjectId(newId);
                setCurrentProjectName(name); // Ensure name is set
                console.log("Auto-saved to library");
            } catch (e) {
                console.error("Failed to auto-save", e);
            }
        } else {
             // Optional: Update existing project if data changed
             const project: ProjectData = {
                id: currentProjectId,
                name: currentProjectName,
                timestamp: Date.now(), // Update timestamp on edit?
                pages: pages
             };
             saveProject(project).catch(console.error);
        }
      };
      saveToLibrary();
    }
  }, [status, pages, currentProjectId, currentProjectName]);

  const handleFileSelected = async (file: File) => {
    reset();
    setError(null);
    setSelectedComponent(null);
    setCurrentProjectName(file.name.replace(/\.[^/.]+$/, "")); // Remove extension
    
    try {
      let images: string[] = [];

      if (file.type === 'application/pdf') {
        setStatus('rendering_pdf');
        setLoadingMessage("Reading PDF Manual...");
        images = await convertPdfToImages(file);
      } else {
        // Image handling
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(file);
        });
        images = [base64];
      }

      setStatus('filtering');
      setLoadingMessage("Scanning for schematics...");
      
      // Filter pages that actually have schematics
      const schematicIndices = await detectSchematicPages(images);

      if (schematicIndices.length === 0) {
        throw new Error("No schematics or wiring diagrams detected in this file.");
      }

      setStatus('analyzing');
      setLoadingMessage(`Analyzing ${schematicIndices.length} schematic page(s)...`);

      const results: PageResult[] = [];

      // Analyze each identified page
      for (let i = 0; i < schematicIndices.length; i++) {
        const pageIdx = schematicIndices[i];
        setLoadingMessage(`Analyzing Page ${pageIdx + 1} (${i + 1}/${schematicIndices.length})...`);
        
        const imageData = images[pageIdx];
        const analysis = await analyzeSchematicImage(imageData);
        
        results.push({
          id: crypto.randomUUID(),
          pageNumber: pageIdx + 1,
          image: imageData,
          analysis
        });
      }

      setPages(results);
      setActivePageIndex(0);
      setStatus('complete');

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to process file.");
      setStatus('error');
    }
  };

  const handleLoadProject = (project: ProjectData) => {
      setPages(project.pages);
      setCurrentProjectId(project.id);
      setCurrentProjectName(project.name);
      setActivePageIndex(0);
      setStatus('complete');
      setIsLibraryOpen(false);
  };

  const reset = () => {
    setPages([]);
    setActivePageIndex(0);
    setStatus('idle');
    setLoadingMessage("");
    setCurrentProjectId(null);
    setCurrentProjectName("");
    setAnalysisUpdate(null, null); 
  };

  const setAnalysisUpdate = (pageIndex: number | null, updatedAnalysis: SchematicAnalysis | null) => {
    if (pageIndex === null || updatedAnalysis === null) return;
    setPages(prev => {
        const newPages = [...prev];
        newPages[pageIndex] = { ...newPages[pageIndex], analysis: updatedAnalysis };
        return newPages;
    });
  };

  const handleSelectComponent = (designator: string | null) => {
    if (designator === selectedComponent) {
      setSelectedComponent(null);
    } else {
      setSelectedComponent(designator);
    }
  };

  const handleExport = () => {
    const exportData = {
        metadata: {
            exportedAt: new Date().toISOString(),
            tool: "CircuitMind",
            projectName: currentProjectName
        },
        pages: pages.map(p => ({
            pageNumber: p.pageNumber,
            analysis: p.analysis
        }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentProjectName.replace(/\s+/g, '-').toLowerCase()}-analysis.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const activePage = pages[activePageIndex];

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans selection:bg-blue-500/30">
      
      <LibrarySidebar 
        isOpen={isLibraryOpen} 
        onClose={() => setIsLibraryOpen(false)} 
        onLoadProject={handleLoadProject}
        currentProjectId={currentProjectId || undefined}
      />

      {/* Navbar */}
      <header className="h-16 border-b border-slate-800 bg-slate-950/80 backdrop-blur fixed w-full top-0 z-50 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
            <button 
                onClick={() => setIsLibraryOpen(true)}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
                title="Open Library"
            >
                <Menu className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-2 cursor-pointer" onClick={reset}>
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Zap className="text-white w-5 h-5 fill-current" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-white hidden sm:block">Circuit<span className="text-blue-500">Mind</span></h1>
            </div>
            
            {currentProjectName && status === 'complete' && (
                <div className="hidden md:flex items-center text-sm px-3 py-1 bg-slate-900 rounded-full border border-slate-800 text-slate-400">
                    <span className="truncate max-w-[200px]">{currentProjectName}</span>
                </div>
            )}
        </div>
        
        {/* Page Navigation for Multi-page results */}
        {status === 'complete' && pages.length > 1 && (
            <div className="flex items-center gap-4 bg-slate-900/50 px-4 py-1.5 rounded-full border border-slate-800">
                <button 
                    onClick={() => setActivePageIndex(Math.max(0, activePageIndex - 1))}
                    disabled={activePageIndex === 0}
                    className="p-1 hover:bg-slate-800 rounded-full disabled:opacity-30"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-sm font-mono text-slate-400">
                    Page <span className="text-white">{activePage.pageNumber}</span> of {pages[pages.length-1].pageNumber} ({activePageIndex + 1}/{pages.length})
                </span>
                <button 
                    onClick={() => setActivePageIndex(Math.min(pages.length - 1, activePageIndex + 1))}
                    disabled={activePageIndex === pages.length - 1}
                    className="p-1 hover:bg-slate-800 rounded-full disabled:opacity-30"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>
        )}

        <div className="flex items-center gap-4">
          {status === 'complete' && (
              <button 
                onClick={handleExport}
                className="flex items-center gap-2 text-xs font-medium bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded transition-colors text-white"
              >
                  <Download className="w-3 h-3" />
                  <span className="hidden sm:inline">Export JSON</span>
              </button>
          )}
          <a href="#" className="text-slate-400 hover:text-white transition-colors">
            <Github className="w-5 h-5" />
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-[1600px] mx-auto h-[calc(100vh)] flex flex-col">
        
        {status === 'idle' && (
          <div className="flex-1 flex flex-col items-center justify-center animate-in fade-in duration-700">
            <div className="text-center max-w-2xl mb-12">
              <h1 className="text-4xl sm:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300 mb-6">
                Manual to Machine Data
              </h1>
              <p className="text-lg text-slate-400 leading-relaxed">
                Upload entire PDF manuals or single schematics. AI automatically extracts the relevant wiring diagrams, 
                analyzes them, and outputs structured engineering data.
              </p>
            </div>
            <UploadZone onFileSelected={handleFileSelected} />
            
            <div className="mt-12">
               <button 
                 onClick={() => setIsLibraryOpen(true)}
                 className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm"
               >
                 <FolderOpen className="w-4 h-4" />
                 Open Saved Documents
               </button>
            </div>
          </div>
        )}

        {status !== 'idle' && status !== 'complete' && status !== 'error' && (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500 blur-xl opacity-20 rounded-full"></div>
              <Loader2 className="w-16 h-16 text-blue-500 animate-spin relative z-10" />
            </div>
            <h2 className="mt-8 text-2xl font-semibold text-white">Processing...</h2>
            <p className="text-slate-400 mt-2 animate-pulse">{loadingMessage}</p>
            
            {/* Steps indicator */}
            <div className="flex gap-2 mt-6">
                <div className={`w-2 h-2 rounded-full ${status === 'rendering_pdf' ? 'bg-blue-500 animate-bounce' : 'bg-slate-700'}`}></div>
                <div className={`w-2 h-2 rounded-full ${status === 'filtering' ? 'bg-blue-500 animate-bounce' : 'bg-slate-700'}`}></div>
                <div className={`w-2 h-2 rounded-full ${status === 'analyzing' ? 'bg-blue-500 animate-bounce' : 'bg-slate-700'}`}></div>
            </div>
          </div>
        )}

        {(status === 'complete' || status === 'error') && (
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 h-full min-h-0">
            {/* Left Panel: Image Viewer */}
            <div className="lg:col-span-5 flex flex-col bg-slate-900 rounded-xl border border-slate-800 overflow-hidden relative group">
               <div className="absolute top-4 left-4 z-10">
                 <button onClick={reset} className="bg-slate-950/80 backdrop-blur text-slate-300 px-3 py-1.5 rounded-md text-sm border border-slate-700 hover:bg-slate-800 transition-colors">
                   ← Upload New
                 </button>
               </div>
               
               <div className="flex-1 bg-[#050b14] overflow-hidden relative">
                 {status === 'complete' && activePage && (
                   <InteractiveSchematicViewer 
                      imageUrl={activePage.image}
                      components={activePage.analysis.components || []}
                      selectedDesignator={selectedComponent}
                      onSelectComponent={handleSelectComponent}
                   />
                 )}
                 {status === 'complete' && pages.length > 0 && (
                     <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900/80 backdrop-blur px-3 py-1 rounded-full text-xs text-slate-400 border border-slate-700 pointer-events-none">
                         Original Page: {activePage?.pageNumber}
                     </div>
                 )}
               </div>
            </div>

            {/* Right Panel: Analysis Results */}
            <div className="lg:col-span-7 h-full min-h-[500px]">
              {status === 'error' ? (
                <div className="h-full flex flex-col items-center justify-center bg-slate-900 rounded-xl border border-red-900/30 p-8 text-center">
                  <div className="w-16 h-16 bg-red-900/20 rounded-full flex items-center justify-center mb-4">
                    <FileText className="w-8 h-8 text-red-500" />
                  </div>
                  <h3 className="text-xl font-bold text-red-400 mb-2">Processing Failed</h3>
                  <p className="text-slate-400 max-w-md">{error}</p>
                  <button 
                    onClick={reset}
                    className="mt-6 px-6 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-white transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              ) : (
                 status === 'complete' && activePage && (
                   <AnalysisResult 
                      key={activePage.id} // Key ensures component resets on page change
                      data={activePage.analysis} 
                      onUpdate={(data) => setAnalysisUpdate(activePageIndex, data)}
                      selectedDesignator={selectedComponent}
                      onSelectComponent={handleSelectComponent}
                   />
                 )
              )}
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default App;
