import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../../../components/ui/Button';
import { Save, Image as ImageIcon, Type, Layout, Loader2, Minus } from 'lucide-react';

export default function PrintLayoutDesigner({ formData, setFormData, onSave, saving }: any) {
  // We'll store elements in printConfig.elements. 
  // Each element: { id: string, type: 'text' | 'image', content: string, x: number, y: number, width?: number, height?: number, fontSize?: number, fontWeight?: string, color?: string }
  
  const [elements, setElements] = useState<any[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [paperSize, setPaperSize] = useState(formData.defaultPaperSize || 'A4');
  const [customWidth, setCustomWidth] = useState(formData.customWidth || 14);
  const [customHeight, setCustomHeight] = useState(formData.customHeight || 21);

  const DEFAULT_TEMPLATE = [
    { id: 'clinic-name', type: 'text', content: 'SHIVAPRABHA\nMULTI SPECIALTY DENTAL CLINIC', x: 150, y: 20, fontSize: 18, fontWeight: 'bold', color: '#1e40af' },
    { id: 'clinic-address', type: 'text', content: 'Opposite Iyenger Bakery, Yekkur - 575 007.', x: 170, y: 70, fontSize: 12, fontWeight: 'normal', color: '#334155' },
    { id: 'line-1', type: 'line', content: '', x: 20, y: 100, width: 560, height: 2, color: '#1e40af' },
    { id: 'doc-1', type: 'text', content: 'Dr. Akhil S. Shetty, B.D.S., M.D.S\nOral & Maxillofacial Pathologist\nMob.: 9742433027', x: 20, y: 110, fontSize: 11, fontWeight: 'normal', color: '#000000' },
    { id: 'logo-1', type: 'image', content: formData.logoUrl || 'https://via.placeholder.com/150', x: 250, y: 110, width: 80, height: 80 },
    { id: 'doc-2', type: 'text', content: 'Dr. Mukul S. Shetty, B.D.S., M.D.S\nOrthodontist\nMob.:', x: 380, y: 110, fontSize: 11, fontWeight: 'normal', color: '#000000' },
    { id: 'line-2', type: 'line', content: '', x: 20, y: 195, width: 560, height: 2, color: '#1e40af' },
    { id: 'rx-badge', type: 'text', content: 'Rx', x: 20, y: 210, fontSize: 24, fontWeight: 'bold', color: '#000000' },
    { id: 'date-field', type: 'text', content: 'Date: _______________', x: 420, y: 220, fontSize: 12, fontWeight: 'normal', color: '#000000' },
    { id: 'line-3', type: 'line', content: '', x: 20, y: 720, width: 560, height: 2, color: '#1e40af' },
    { id: 'footer-timing', type: 'text', content: 'Timing : 10.00 A.M. - 12.00 P.M. & 5.00 P.M. - 8.00 P.M. (Sundays on Appointment Only)', x: 40, y: 730, fontSize: 11, fontWeight: 'bold', color: '#1e40af' }
  ];

  useEffect(() => {
    if (formData.printConfig && formData.printConfig.elements && formData.printConfig.elements.length > 0) {
      setElements(formData.printConfig.elements);
    } else {
      setElements(DEFAULT_TEMPLATE);
    }
  }, [formData.printConfig]);

  const saveToForm = (newElements: any[]) => {
    setElements(newElements);
    setFormData({
      ...formData,
      defaultPaperSize: paperSize,
      customWidth,
      customHeight,
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

  const addHorizontalLine = () => {
    const newEl = { id: `line-${Date.now()}`, type: 'line', content: '', x: 20, y: 150, width: 400, height: 2, color: '#334155' };
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
          {paperSize === 'Custom' && (
            <div className="flex gap-2 items-center">
              <input 
                type="number" 
                value={customWidth} 
                onChange={e => {
                  setCustomWidth(Number(e.target.value));
                  setFormData({ ...formData, customWidth: Number(e.target.value) });
                }}
                className="w-16 border border-slate-200 rounded-lg px-2 py-2 text-sm outline-none"
                placeholder="W (cm)"
              />
              <span className="text-slate-400 text-sm">×</span>
              <input 
                type="number" 
                value={customHeight} 
                onChange={e => {
                  setCustomHeight(Number(e.target.value));
                  setFormData({ ...formData, customHeight: Number(e.target.value) });
                }}
                className="w-16 border border-slate-200 rounded-lg px-2 py-2 text-sm outline-none"
                placeholder="H (cm)"
              />
              <span className="text-slate-400 text-sm">cm</span>
            </div>
          )}
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
          <button onClick={addHorizontalLine} className="flex items-center gap-2 w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-100 transition-colors">
            <Minus className="w-4 h-4 text-slate-500" /> Add Line
          </button>
          
          <div className="mt-4 pt-4 border-t border-slate-200 space-y-2">
            <label className="text-xs font-semibold text-slate-700">Upload Clinic Logo</label>
            <input 
              type="file"
              accept="image/*"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = () => {
                    setFormData({...formData, logoUrl: reader.result as string});
                  };
                  reader.readAsDataURL(file);
                }
              }}
              className="w-full text-xs"
            />
            {formData.logoUrl && (
              <div className="mt-2 h-12 w-full border border-slate-200 rounded flex items-center justify-center p-1 bg-white">
                <img src={formData.logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
              </div>
            )}
          </div>
        </div>

        {/* Canvas */}
        <div 
          ref={canvasRef}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className="flex-1 bg-white border border-slate-300 rounded-sm shadow-sm relative overflow-hidden"
          style={{ 
            height: paperSize === 'Custom' ? `${customHeight * 37.8}px` : '800px', 
            width: paperSize === 'Custom' ? `${customWidth * 37.8}px` : (paperSize === 'A4' ? '600px' : '450px'), 
            margin: '0 auto', 
            cursor: draggingId ? 'grabbing' : 'auto',
            transformOrigin: 'top center',
            transform: paperSize === 'Custom' && customHeight > 22 ? 'scale(0.8)' : 'scale(1)'
          }}
        >
          {elements.map((el) => (
            <div
              key={el.id}
              onPointerDown={(e) => handlePointerDown(e, el.id)}
              className={`absolute group border-2 ${draggingId === el.id ? 'border-indigo-500 border-dashed z-50' : 'border-transparent hover:border-slate-200 hover:border-dashed z-10'}`}
              style={{ left: el.x, top: el.y, cursor: 'grab' }}
            >
              {el.type === 'text' && (
                <textarea 
                  value={el.content}
                  onChange={(e) => updateElementContent(el.id, e.target.value)}
                  className="bg-transparent outline-none resize-none overflow-hidden"
                  style={{ fontSize: el.fontSize, fontWeight: el.fontWeight, color: el.color, minHeight: '30px', minWidth: '100px' }}
                />
              )}
              {el.type === 'image' && (
                <img src={el.content} alt="Logo" style={{ width: el.width, height: el.height, objectFit: 'contain' }} draggable={false} />
              )}
              {el.type === 'line' && (
                <div style={{ width: el.width, height: el.height, backgroundColor: el.color }} />
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
