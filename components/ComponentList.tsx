import React, { useEffect, useRef } from 'react';
import { SchematicComponent } from '../types';
import { 
  Activity, 
  Cpu, 
  Zap, 
  Trash2, 
  Plus, 
  Target, 
  Battery, 
  Triangle, 
  GitBranch, 
  ToggleLeft, 
  Plug, 
  ArrowDown, 
  Box, 
  Waves 
} from 'lucide-react';

// Export for use in other components (AnalysisResult)
export const COMPONENT_ICONS: Record<string, React.ElementType> = {
  resistor: Activity,
  capacitor: Battery, 
  inductor: Waves,
  diode: Triangle,
  transistor: GitBranch,
  chip: Cpu,
  switch: ToggleLeft,
  connector: Plug,
  ground: ArrowDown,
  power: Zap,
  generic: Box
};

interface ComponentListProps {
  components: SchematicComponent[];
  isEditing?: boolean;
  onUpdate?: (components: SchematicComponent[]) => void;
  selectedDesignator?: string | null;
  onSelectComponent?: (designator: string) => void;
}

const ComponentList: React.FC<ComponentListProps> = ({ 
  components, 
  isEditing = false, 
  onUpdate,
  selectedDesignator,
  onSelectComponent
}) => {
  const selectedRef = useRef<HTMLTableRowElement>(null);

  // Auto-scroll to selected item
  useEffect(() => {
    if (selectedDesignator && selectedRef.current) {
      selectedRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [selectedDesignator]);

  if (!components) return <div className="text-slate-500 italic">No components detected.</div>;

  const handleChange = (index: number, field: keyof SchematicComponent, value: string) => {
    if (!onUpdate) return;
    const newComponents = [...components];
    newComponents[index] = { ...newComponents[index], [field]: value };
    onUpdate(newComponents);
  };

  const handleDelete = (index: number) => {
    if (!onUpdate) return;
    const newComponents = components.filter((_, i) => i !== index);
    onUpdate(newComponents);
  };

  const handleAdd = () => {
    if (!onUpdate) return;
    const newComponent: SchematicComponent = {
      designator: `C${components.length + 1}`,
      type: 'Unknown',
      value: '?',
      notes: '',
      icon: 'generic'
    };
    onUpdate([...components, newComponent]);
  };

  return (
    <div className="overflow-x-auto pb-20"> {/* Extra padding for scroll */}
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-700 text-slate-400 text-sm uppercase tracking-wider sticky top-0 bg-slate-900 z-10">
            <th className="p-3 font-medium">Des</th>
            <th className="p-3 font-medium">Type</th>
            <th className="p-3 font-medium">Value</th>
            <th className="p-3 font-medium">Notes</th>
            {isEditing && <th className="p-3 font-medium w-10"></th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {components.map((comp, idx) => {
            const isSelected = selectedDesignator === comp.designator;
            const Icon = COMPONENT_ICONS[comp.icon || 'generic'] || Box;

            return (
              <tr 
                key={idx} 
                ref={isSelected ? selectedRef : null}
                onClick={() => onSelectComponent && onSelectComponent(comp.designator)}
                className={`transition-colors text-slate-300 text-sm cursor-pointer border-l-2
                  ${isSelected 
                    ? 'bg-yellow-900/20 border-yellow-500' 
                    : 'hover:bg-slate-800/30 border-transparent'
                  }
                `}
              >
                <td className={`p-3 font-mono font-bold ${isSelected ? 'text-yellow-400' : 'text-blue-400'}`}>
                  {isEditing ? (
                    <input 
                      type="text" 
                      value={comp.designator} 
                      onChange={(e) => handleChange(idx, 'designator', e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded px-2 py-1 w-20 font-bold focus:border-blue-500 outline-none"
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                       {isSelected && <Target className="w-3 h-3" />}
                       {comp.designator || "?"}
                    </div>
                  )}
                </td>
                <td className="p-3">
                  {isEditing ? (
                     <input 
                      type="text" 
                      value={comp.type} 
                      onChange={(e) => handleChange(idx, 'type', e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded px-2 py-1 w-full text-slate-300 focus:border-blue-500 outline-none"
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-slate-500" />
                      {comp.type}
                    </div>
                  )}
                </td>
                <td className="p-3 font-mono">
                  {isEditing ? (
                     <input 
                      type="text" 
                      value={comp.value} 
                      onChange={(e) => handleChange(idx, 'value', e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded px-2 py-1 w-full font-mono text-slate-300 focus:border-blue-500 outline-none"
                    />
                  ) : (
                    comp.value || "-"
                  )}
                </td>
                <td className="p-3 text-slate-400">
                  {isEditing ? (
                     <input 
                      type="text" 
                      value={comp.notes} 
                      onChange={(e) => handleChange(idx, 'notes', e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded px-2 py-1 w-full text-slate-400 focus:border-blue-500 outline-none"
                    />
                  ) : (
                    comp.notes
                  )}
                </td>
                {isEditing && (
                  <td className="p-3 text-center">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDelete(idx); }}
                      className="text-slate-600 hover:text-red-400 transition-colors p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      {isEditing && (
        <div className="mt-4">
          <button 
            onClick={handleAdd}
            className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors px-3 py-2 rounded hover:bg-slate-800/50"
          >
            <Plus className="w-4 h-4" />
            Add Component
          </button>
        </div>
      )}
    </div>
  );
};

export default ComponentList;