import React, { useState, useRef, useEffect } from 'react';
import { SchematicComponent } from '../types';
import { Maximize, ZoomIn, ZoomOut } from 'lucide-react';

interface InteractiveSchematicViewerProps {
  imageUrl: string;
  components: SchematicComponent[];
  selectedDesignator: string | null;
  onSelectComponent: (designator: string | null) => void;
}

const InteractiveSchematicViewer: React.FC<InteractiveSchematicViewerProps> = ({ 
  imageUrl, 
  components, 
  selectedDesignator,
  onSelectComponent 
}) => {
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset zoom when image changes
  useEffect(() => {
    setScale(1);
  }, [imageUrl]);

  const handleZoomIn = () => setScale(s => Math.min(s + 0.5, 4));
  const handleZoomOut = () => setScale(s => Math.max(s - 0.5, 1));

  return (
    <div className="relative w-full h-full bg-[#050b14] overflow-hidden flex flex-col group">
      
      {/* Toolbar */}
      <div className="absolute bottom-4 right-4 z-20 flex gap-2">
        <button 
          onClick={handleZoomOut}
          className="p-2 bg-slate-900/80 backdrop-blur border border-slate-700 rounded-full hover:bg-slate-800 text-slate-300"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button 
          onClick={() => setScale(1)}
          className="px-3 py-2 bg-slate-900/80 backdrop-blur border border-slate-700 rounded-full hover:bg-slate-800 text-slate-300 text-xs font-mono"
          title="Reset Zoom"
        >
          {Math.round(scale * 100)}%
        </button>
        <button 
          onClick={handleZoomIn}
          className="p-2 bg-slate-900/80 backdrop-blur border border-slate-700 rounded-full hover:bg-slate-800 text-slate-300"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
      </div>

      <div 
        ref={containerRef}
        className="flex-1 overflow-auto relative flex items-center justify-center p-4 cursor-grab active:cursor-grabbing custom-scrollbar"
      >
        <div 
          className="relative transition-transform duration-200 ease-out origin-center"
          style={{ transform: `scale(${scale})` }}
        >
          <img 
            src={imageUrl} 
            alt="Schematic Analysis" 
            className="max-w-none shadow-2xl rounded pointer-events-none select-none block"
            style={{ maxHeight: 'calc(100vh - 200px)' }}
          />

          {/* Bounding Boxes Overlay */}
          <div className="absolute inset-0 w-full h-full">
            {components.map((comp, idx) => {
              if (!comp.boundingBox || comp.boundingBox.length < 4) return null;
              
              const [ymin, xmin, ymax, xmax] = comp.boundingBox;
              const isSelected = selectedDesignator === comp.designator;

              return (
                <div
                  key={`${comp.designator}-${idx}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectComponent(comp.designator);
                  }}
                  className={`absolute cursor-pointer transition-all duration-200 group/box
                    ${isSelected 
                      ? 'border-2 border-yellow-400 bg-yellow-400/20 z-10 shadow-[0_0_15px_rgba(250,204,21,0.5)]' 
                      : 'hover:border-2 hover:border-blue-400 hover:bg-blue-400/10 border border-transparent'
                    }
                  `}
                  style={{
                    top: `${ymin * 100}%`,
                    left: `${xmin * 100}%`,
                    height: `${(ymax - ymin) * 100}%`,
                    width: `${(xmax - xmin) * 100}%`,
                  }}
                >
                  {/* Tooltip on hover or selection */}
                  <div className={`
                    absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900 text-white text-[10px] rounded whitespace-nowrap pointer-events-none z-20 border border-slate-700
                    ${isSelected ? 'opacity-100' : 'opacity-0 group-hover/box:opacity-100'}
                  `}>
                    <span className="font-bold text-yellow-400">{comp.designator}</span>: {comp.value}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* Instructions Overlay */}
      <div className="absolute top-4 right-4 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
         <div className="bg-slate-950/80 backdrop-blur px-3 py-1.5 rounded border border-slate-800 text-xs text-slate-400">
           Click components to inspect
         </div>
      </div>
    </div>
  );
};

export default InteractiveSchematicViewer;
