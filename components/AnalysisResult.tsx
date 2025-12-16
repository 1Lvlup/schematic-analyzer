import React, { useState, useEffect } from 'react';
import { SchematicAnalysis, SchematicComponent } from '../types';
import ComponentList, { COMPONENT_ICONS } from './ComponentList';
import { CircuitBoard, Layers, AlertTriangle, Network, FileJson, MessageSquare, Pencil, Check, X, Info, Share2, Search } from 'lucide-react';
import { chatWithSchematicContext } from '../services/geminiService';

interface AnalysisResultProps {
  data: SchematicAnalysis;
  onUpdate: (data: SchematicAnalysis) => void;
  selectedDesignator: string | null;
  onSelectComponent: (designator: string) => void;
}

const AnalysisResult: React.FC<AnalysisResultProps> = ({ 
  data, 
  onUpdate, 
  selectedDesignator, 
  onSelectComponent 
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'components' | 'netlist' | 'structure' | 'json' | 'chat'>('overview');
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'model', text: string}[]>([]);
  const [isChatting, setIsChatting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [netlistFilter, setNetlistFilter] = useState('');

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    const newMsg = chatInput;
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', text: newMsg }]);
    setIsChatting(true);

    const response = await chatWithSchematicContext(chatHistory, newMsg, data);
    
    setChatHistory(prev => [...prev, { role: 'model', text: response }]);
    setIsChatting(false);
  };

  const handleFieldChange = (field: keyof SchematicAnalysis, value: any) => {
    onUpdate({ ...data, [field]: value });
  };

  const handleBlockChange = (index: number, field: keyof typeof data.functionalBlocks[0], value: any) => {
    const newBlocks = [...data.functionalBlocks];
    newBlocks[index] = { ...newBlocks[index], [field]: value };
    onUpdate({ ...data, functionalBlocks: newBlocks });
  };

  const handleBlockComponentStringChange = (index: number, value: string) => {
    const components = value.split(',').map(s => s.trim()).filter(s => s !== '');
    handleBlockChange(index, 'componentsInvolved', components);
  }

  const handlePotentialIssuesChange = (value: string) => {
    const issues = value.split('\n').filter(s => s.trim() !== '');
    onUpdate({ ...data, potentialIssues: issues });
  }

  const selectedComponentData = data.components.find(c => c.designator === selectedDesignator);
  
  const filteredNetlist = (data.netlist || []).filter(net => 
    net.id.toLowerCase().includes(netlistFilter.toLowerCase()) || 
    net.connectedPins.some(pin => pin.toLowerCase().includes(netlistFilter.toLowerCase()))
  );

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-2xl transition-all">
      {/* Header */}
      <div className="bg-slate-950 p-6 border-b border-slate-800 relative">
        <div className="absolute top-6 right-6 flex gap-2">
           <button 
             onClick={() => setIsEditing(!isEditing)}
             className={`p-2 rounded-lg transition-colors ${isEditing ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white'}`}
           >
             {isEditing ? <Check className="w-5 h-5" /> : <Pencil className="w-5 h-5" />}
           </button>
        </div>

        {isEditing ? (
          <div className="pr-12 space-y-3">
             <input 
               type="text" 
               value={data.title} 
               onChange={(e) => handleFieldChange('title', e.target.value)}
               className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xl font-bold text-white focus:border-blue-500 outline-none"
               placeholder="Circuit Title"
             />
             <textarea 
               value={data.overview} 
               onChange={(e) => handleFieldChange('overview', e.target.value)}
               className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-300 focus:border-blue-500 outline-none h-20 resize-none"
               placeholder="Overview description..."
             />
          </div>
        ) : (
          <div className="pr-12">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <CircuitBoard className="text-blue-500" />
              {data.title || "Schematic Analysis"}
            </h2>
            <p className="text-slate-400 mt-1 line-clamp-2">{data.overview}</p>
          </div>
        )}
      </div>

      {/* Selected Component Quick View (Visible on all tabs if selected) */}
      {selectedComponentData && !isEditing && (
        <div className="bg-yellow-900/10 border-b border-yellow-500/20 px-6 py-3 flex items-center justify-between animate-in slide-in-from-top-2">
          <div className="flex items-center gap-4">
             {(() => {
                const Icon = COMPONENT_ICONS[selectedComponentData.icon || 'generic'] || COMPONENT_ICONS['generic'];
                return (
                  <div className="w-10 h-10 bg-yellow-500/10 rounded flex items-center justify-center border border-yellow-500/30">
                    <Icon className="w-6 h-6 text-yellow-400" />
                  </div>
                );
             })()}
             <div>
               <div className="flex items-baseline gap-2">
                  <span className="text-yellow-400 font-bold font-mono text-lg">{selectedComponentData.designator}</span>
                  <span className="text-sm text-slate-300 font-medium">{selectedComponentData.type}</span>
               </div>
               <div className="text-white font-mono text-sm">{selectedComponentData.value}</div>
               {selectedComponentData.notes && <div className="text-xs text-slate-500 mt-0.5">{selectedComponentData.notes}</div>}
             </div>
          </div>
          <button 
            onClick={() => setActiveTab('components')}
            className="text-xs text-yellow-500 hover:text-yellow-400 font-medium px-3 py-1 hover:bg-yellow-500/10 rounded"
          >
            View in BOM →
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-950/50 overflow-x-auto">
        {[
          { id: 'overview', label: 'Functional Blocks', icon: Layers },
          { id: 'components', label: 'Bill of Materials', icon: CircuitBoard },
          { id: 'netlist', label: 'Netlist', icon: Share2 },
          { id: 'structure', label: 'Logic Flow', icon: Network },
          { id: 'chat', label: 'Ask AI', icon: MessageSquare },
          { id: 'json', label: 'Raw Data', icon: FileJson },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id 
                ? 'text-blue-400 border-b-2 border-blue-500 bg-slate-900' 
                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900/50'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6 bg-slate-900/50 custom-scrollbar relative">
        
        {activeTab === 'overview' && (
          <div className="space-y-6">
             {/* Functional Blocks */}
             <div className="grid gap-4 md:grid-cols-2">
              {data.functionalBlocks.map((block, idx) => (
                <div key={idx} className={`p-4 bg-slate-800/50 border ${isEditing ? 'border-blue-500/50' : 'border-slate-700'} rounded-lg transition-colors`}>
                  {isEditing ? (
                    <div className="space-y-3">
                      <input 
                        type="text" 
                        value={block.name}
                        onChange={(e) => handleBlockChange(idx, 'name', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm font-semibold text-blue-200 focus:border-blue-500 outline-none"
                        placeholder="Block Name"
                      />
                      <textarea
                        value={block.description}
                        onChange={(e) => handleBlockChange(idx, 'description', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300 focus:border-blue-500 outline-none resize-none h-20"
                        placeholder="Description"
                      />
                      <div>
                        <label className="text-xs text-slate-500 block mb-1">Components (comma separated):</label>
                        <input 
                          type="text" 
                          value={block.componentsInvolved.join(', ')}
                          onChange={(e) => handleBlockComponentStringChange(idx, e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-slate-400 focus:border-blue-500 outline-none"
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <h3 className="text-lg font-semibold text-blue-200 mb-2">{block.name}</h3>
                      <p className="text-slate-300 text-sm mb-3 leading-relaxed">{block.description}</p>
                      <div className="flex flex-wrap gap-2">
                        {block.componentsInvolved.map((comp, cIdx) => (
                          <button 
                            key={cIdx} 
                            onClick={() => onSelectComponent(comp)}
                            className={`px-2 py-1 text-xs font-mono rounded border transition-colors
                              ${selectedDesignator === comp 
                                ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400' 
                                : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'
                              }
                            `}
                          >
                            {comp}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Potential Issues */}
            {(isEditing || (data.potentialIssues && data.potentialIssues.length > 0)) && (
              <div className="mt-8 p-4 bg-amber-950/20 border border-amber-900/50 rounded-lg">
                <h3 className="text-amber-400 font-semibold mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Design Notes & Warnings
                </h3>
                {isEditing ? (
                  <textarea 
                    value={data.potentialIssues.join('\n')}
                    onChange={(e) => handlePotentialIssuesChange(e.target.value)}
                    className="w-full bg-slate-900/50 border border-amber-900/50 rounded px-3 py-2 text-sm text-amber-200/80 focus:border-amber-500 outline-none h-32 font-mono"
                    placeholder="One issue per line..."
                  />
                ) : (
                  <ul className="list-disc list-inside space-y-2 text-amber-200/80 text-sm">
                    {data.potentialIssues.map((issue, i) => (
                      <li key={i}>{issue}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'components' && (
          <ComponentList 
            components={data.components} 
            isEditing={isEditing}
            onUpdate={(newComponents) => handleFieldChange('components', newComponents)}
            selectedDesignator={selectedDesignator}
            onSelectComponent={onSelectComponent}
          />
        )}
        
        {activeTab === 'netlist' && (
          <div className="space-y-4">
            {/* Netlist Filter */}
             <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input 
                  type="text" 
                  placeholder="Filter by Net ID or Pin..." 
                  value={netlistFilter}
                  onChange={(e) => setNetlistFilter(e.target.value)}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                />
             </div>

             <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                      <th className="p-3 font-medium w-1/4">Net ID</th>
                      <th className="p-3 font-medium">Connected Pins</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredNetlist.length > 0 ? filteredNetlist.map((net, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-3 text-sm font-bold text-blue-400 font-mono align-top">{net.id}</td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-2">
                             {net.connectedPins.map((pin, pIdx) => (
                               <span key={pIdx} className="bg-slate-800 border border-slate-700 text-slate-300 text-xs px-2 py-1 rounded font-mono">
                                 {pin}
                               </span>
                             ))}
                          </div>
                        </td>
                      </tr>
                    )) : (
                       <tr>
                         <td colSpan={2} className="p-8 text-center text-slate-500 italic">
                           {data.netlist && data.netlist.length > 0 
                             ? "No nets match your filter." 
                             : "No netlist data extracted. The AI might not have detected explicit net names."
                           }
                         </td>
                       </tr>
                    )}
                  </tbody>
                </table>
             </div>
          </div>
        )}

        {activeTab === 'structure' && (
          <div className="space-y-6">
            <div className="prose prose-invert max-w-none w-full">
              <h3 className="text-xl font-semibold text-slate-200 mb-4">Circuit Logic & Connectivity</h3>
              {isEditing ? (
                 <textarea 
                   value={data.connectivityLogic}
                   onChange={(e) => handleFieldChange('connectivityLogic', e.target.value)}
                   className="w-full h-[400px] bg-slate-900 border border-slate-700 rounded p-4 text-sm text-slate-300 font-mono focus:border-blue-500 outline-none"
                   placeholder="Describe connectivity..."
                 />
              ) : (
                <p className="text-slate-400 whitespace-pre-wrap leading-relaxed">
                  {data.connectivityLogic}
                </p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'json' && (
          <div className="h-full">
            <p className="text-slate-500 mb-2 text-sm">
              Machine-readable format structured for downstream AI tasks or netlist conversion.
            </p>
            <pre className="bg-slate-950 p-4 rounded-lg overflow-x-auto text-xs font-mono text-green-400 border border-slate-800 shadow-inner">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="flex flex-col h-full">
             <div className="flex-1 space-y-4 mb-4 overflow-y-auto">
               {chatHistory.length === 0 && (
                 <div className="text-center text-slate-500 mt-10">
                   <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-20" />
                   <p>Ask anything about this circuit.</p>
                   <p className="text-xs mt-2 opacity-60">"How can I increase the gain?" or "What does U1 do?"</p>
                 </div>
               )}
               {chatHistory.map((msg, i) => (
                 <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                   <div className={`max-w-[80%] p-3 rounded-lg text-sm ${
                     msg.role === 'user' 
                       ? 'bg-blue-600 text-white rounded-br-none' 
                       : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700'
                   }`}>
                     {msg.text}
                   </div>
                 </div>
               ))}
               {isChatting && (
                 <div className="flex justify-start">
                   <div className="bg-slate-800 p-3 rounded-lg rounded-bl-none border border-slate-700">
                     <div className="flex gap-1">
                       <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"></span>
                       <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-100"></span>
                       <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-200"></span>
                     </div>
                   </div>
                 </div>
               )}
             </div>
             <div className="flex gap-2">
               <input 
                 type="text" 
                 value={chatInput}
                 onChange={(e) => setChatInput(e.target.value)}
                 onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                 placeholder="Ask a question about the schematic..."
                 className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
               />
               <button 
                onClick={handleSendMessage}
                disabled={isChatting || !chatInput.trim()}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
               >
                 Send
               </button>
             </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default AnalysisResult;