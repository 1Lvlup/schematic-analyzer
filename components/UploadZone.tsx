import React, { useCallback } from 'react';
import { Upload, FileText, FileImage } from 'lucide-react';

interface UploadZoneProps {
  onFileSelected: (file: File) => void;
}

const UploadZone: React.FC<UploadZoneProps> = ({ onFileSelected }) => {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileSelected(file);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      onFileSelected(file);
    }
  }, [onFileSelected]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div 
      className="w-full max-w-2xl mx-auto mt-10 p-12 border-2 border-dashed border-slate-700 rounded-xl bg-slate-900/50 hover:bg-slate-800/50 hover:border-blue-500 transition-all cursor-pointer group flex flex-col items-center justify-center text-center"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <label htmlFor="file-upload" className="cursor-pointer w-full flex flex-col items-center">
        <div className="bg-slate-800 p-4 rounded-full mb-4 group-hover:bg-blue-600/20 transition-colors">
          <Upload className="w-10 h-10 text-blue-400 group-hover:text-blue-300" />
        </div>
        <h3 className="text-xl font-semibold text-slate-200 mb-2">Upload Manual or Schematic</h3>
        <p className="text-slate-400 mb-6">Drag and drop PDF manuals or image files</p>
        <span className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors shadow-lg shadow-blue-900/20">
          Select File
        </span>
        <input 
          id="file-upload" 
          type="file" 
          accept="image/*,.pdf" 
          className="hidden" 
          onChange={handleFileChange} 
        />
      </label>
      <div className="mt-8 flex items-center gap-4 text-sm text-slate-500">
        <div className="flex items-center gap-1">
            <FileText className="w-4 h-4" />
            <span>PDF Manuals</span>
        </div>
        <div className="flex items-center gap-1">
            <FileImage className="w-4 h-4" />
            <span>PNG, JPG, WEBP</span>
        </div>
      </div>
    </div>
  );
};

export default UploadZone;
