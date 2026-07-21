import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../../../components/ui/Button';
import { Save, Image as ImageIcon, Type, Layout, Loader2 } from 'lucide-react';

export default function PrintLayoutDesigner({ formData, setFormData, onSave, saving }: any) {
  // We'll store elements in printConfig.elements. 
  // Each element: { id: string, type: 'text' | 'image', content: string, x: number, y: number, width?: number, height?: number, fontSize?: number, fontWeight?: string, color?: string }
  
  const [elements, setElements] = useState<any[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [paperSize, setPaperSize] = useState(formData.defaultPaperSize || 'A4');

  useEffect(() => {
    if (formData.printConfig && formData.printConfig.elements) {
      setElements(formData.printConfig.elements);
    }
  }, [formData.printConfig]);

  const saveToForm = (newElements: any[]) => {
    setElements(newElements);
    setFormData({
      ...formData,
      defaultPaperSize: paperSize,
      printConfig: {
        ...formData.printConfig,
        elements: newElements
      }
    });
  };

  const addTextElement = () => {
    const newEl = { id: `text-${Date.now()}`, type: 'text', content: 'New Text', x: 50, y: 50, fontSize: 14, fontWeight: 'normal', color: '#000000' };
    saveToForm([...elements, newEl]);
  };

  const addImageElement = () => {
    const newEl = { id: `image-${Date.now()}`, type: 'image', content: formData.logoUrl || 'https://via.placeholder.com/150', x: 200, y: 50, width: 100, height: 100 };
    saveToForm([...elements, newEl]);
  };
  
  const addRxBadge = () => {
    const newEl = { id: `rx-${Date.now()}`, type: 'text', content: 'Rx', x: 30, y: 250, fontSize: 32, fontWeight: 'bold', color: '#000000' };
    saveToForm([...elements, newEl]);
  };

  const deleteElement = (id: string) => {
    saveToForm(elements.filter(e => e.id !== id));
  };

  const handlePointerDown = (e: React.PointerEvent, id: string) => {
    setDraggingId(id);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingId || !canvasRef.current) return;
    const canvasRect = canvasRef.current.getBoundingClientRect();
    
    // Calculate new position relative to canvas
    const newX = e.clientX - canvasRect.left;
    const newY = e.clientY - canvasRect.top;

    setElements(prev => prev.map(el => {
      if (el.id === draggingId) {
        return { ...el, x: Math.max(0, newX - 20), y: Math.max(0, newY - 10) }; // offset for center of mouse
      }
      return el;
    }));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (draggingId) {
      setDraggingId(null);
      // Finalize save to form state when dropping
      saveToForm(elements);
    }
  };

  const updateElementContent = (id: string, content: string) => {
    saveToForm(elements.map(e => e.id === id ? { ...e, content } : e));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Drag-and-Drop Print Designer</h2>
          <p className="text-sm text-slate-500">Design your exact prescription pad layout here.</p>
        </div>
        <div className="flex gap-2">
          <select 
            value={paperSize} 
            onChange={e => {
              setPaperSize(e.target.value);
              setFormData({ ...formData, defaultPaperSize: e.target.value });
            }}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none"
          >
            <option value="A4">A4 Size</option>
            <option value="A5">A5 Size</option>
            <option value="Letter">US Letter</option>
            <option value="Custom">Custom Pad</option>
          </select>
          <Button onClick={onSave} disabled={saving} className="bg-indigo-600 text-white shadow-sm">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Save Layout
          </Button>
        </div>
      </div>

      <div className="flex gap-4">
        {/* Toolbar */}
        <div className="w-48 bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col gap-3 h-fit">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Tools</h3>
          <button onClick={addTextElement} className="flex items-center gap-2 w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-100 transition-colors">
            <Type className="w-4 h-4 text-slate-500" /> Add Text
          </button>
          <button onClick={addImageElement} className="flex items-center gap-2 w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-100 transition-colors">
            <ImageIcon className="w-4 h-4 text-slate-500" /> Add Logo
          </button>
          <button onClick={addRxBadge} className="flex items-center gap-2 w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-100 transition-colors">
            <Layout className="w-4 h-4 text-slate-500" /> Add Rx Badge
          </button>
          
          <div className="mt-4 pt-4 border-t border-slate-200 space-y-2">
            <label className="text-xs font-semibold text-slate-700">Clinic Logo URL</label>
            <input 
              type="text" 
              placeholder="https://..." 
              value={formData.logoUrl || ''} 
              onChange={e => setFormData({...formData, logoUrl: e.target.value})}
              className="w-full text-xs px-2 py-1 border border-slate-200 rounded"
            />
          </div>
        </div>

        {/* Canvas */}
        <div 
          ref={canvasRef}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className="flex-1 bg-white border border-slate-300 rounded-sm shadow-sm relative overflow-hidden"
          style={{ height: '800px', width: paperSize === 'A4' ? '600px' : '450px', margin: '0 auto', cursor: draggingId ? 'grabbing' : 'auto' }}
        >
          {elements.map((el) => (
            <div
              key={el.id}
              onPointerDown={(e) => handlePointerDown(e, el.id)}
              className={`absolute group border-2 ${draggingId === el.id ? 'border-indigo-500 border-dashed z-50' : 'border-transparent hover:border-slate-200 hover:border-dashed z-10'}`}
              style={{ left: el.x, top: el.y, cursor: 'grab' }}
            >
              {el.type === 'text' ? (
                <textarea 
                  value={el.content}
                  onChange={(e) => updateElementContent(el.id, e.target.value)}
                  className="bg-transparent outline-none resize-none overflow-hidden"
                  style={{ fontSize: el.fontSize, fontWeight: el.fontWeight, color: el.color, minHeight: '30px', minWidth: '100px' }}
                />
              ) : (
                <img src={el.content} alt="Logo" style={{ width: el.width, height: el.height, objectFit: 'contain' }} draggable={false} />
              )}
              
              <button 
                onClick={() => deleteElement(el.id)}
                className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 text-xs"
              >
                ×
              </button>
            </div>
          ))}
          
          <div className="absolute top-1/2 left-0 right-0 text-center opacity-20 pointer-events-none text-slate-400 font-bold uppercase tracking-widest">
            Prescription Body Area
          </div>
        </div>
      </div>
    </div>
  );
}
