import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../../../components/ui/Button';
import { Save, Image as ImageIcon, Type, Layout, Loader2, Minus, Move, Copy } from 'lucide-react';

// Isolated component for contentEditable to prevent cursor jumping and state loss on re-renders
const EditableText = ({ element, onUpdate, onSelect, isSelected }: any) => {
  const divRef = useRef<HTMLDivElement>(null);
  const lastSentContent = useRef(element.content);

  // Initialize the DOM only once on mount
  useEffect(() => {
    if (divRef.current && !divRef.current.innerHTML) {
      divRef.current.innerHTML = element.content.replace(/\n/g, '<br>');
      lastSentContent.current = divRef.current.innerHTML;
    }
  }, []);

  // Only update the native DOM if the incoming prop changes from OUTSIDE (e.g., Undo or Reset to Preset)
  // We check against what we last sent to the parent to prevent the feedback loop from destroying the cursor
  useEffect(() => {
    if (divRef.current && element.content !== lastSentContent.current) {
      divRef.current.innerHTML = element.content;
      lastSentContent.current = element.content;
    }
  }, [element.content]);

  return (
    <div 
      ref={divRef}
      contentEditable
      suppressContentEditableWarning
      onPointerDown={(e) => {
        onSelect(element.id);
        e.stopPropagation();
      }}
      onInput={(e) => {
        // Save the EXACT string we are sending to the parent so we can ignore it when it comes back as a prop
        lastSentContent.current = e.currentTarget.innerHTML;
        // Update parent state quietly
        onUpdate(element.id, e.currentTarget.innerHTML);
      }}
      className="bg-transparent outline-none overflow-hidden"
      style={{ 
        fontSize: element.fontSize, 
        fontWeight: element.fontWeight, 
        color: element.color, 
        textAlign: element.textAlign || 'left', 
        minHeight: '30px', 
        minWidth: '100px', 
        width: element.width, 
        height: element.height, 
        whiteSpace: 'pre-wrap' 
      }}
    />
  );
};

export default function PrintLayoutDesigner({ formData, setFormData, onSave, saving }: any) {
  // We'll store elements in printConfig.elements. 
  // Each element: { id: string, type: 'text' | 'image', content: string, x: number, y: number, width?: number, height?: number, fontSize?: number, fontWeight?: string, color?: string }
  
  const [elements, setElements] = useState<any[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [resizingId, setResizingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [paperSize, setPaperSize] = useState(formData.defaultPaperSize || 'A4');
  const [customWidth, setCustomWidth] = useState(formData.customWidth || 14);
  const [customHeight, setCustomHeight] = useState(formData.customHeight || 21);

  const [snapLines, setSnapLines] = useState<{x?: number, y?: number}[]>([]);
  const canvasWidth = paperSize === 'Custom' ? customWidth * 37.8 : (paperSize === 'Letter' ? 612 : paperSize === 'A5' ? 450 : paperSize === 'HalfLetter' ? 450 : paperSize === 'A6' ? 300 : 600);
  const canvasHeight = paperSize === 'Custom' ? customHeight * 37.8 : (paperSize === 'Letter' ? 800 : paperSize === 'A5' ? 640 : paperSize === 'HalfLetter' ? 695 : paperSize === 'A6' ? 424 : 800);

  useEffect(() => {
    const cw = paperSize === 'Custom' ? customWidth * 37.8 : (paperSize === 'Letter' ? 612 : paperSize === 'A5' ? 450 : paperSize === 'HalfLetter' ? 450 : paperSize === 'A6' ? 300 : 600);
    const ch = paperSize === 'Custom' ? customHeight * 37.8 : (paperSize === 'Letter' ? 800 : paperSize === 'A5' ? 640 : paperSize === 'HalfLetter' ? 695 : paperSize === 'A6' ? 424 : 800);
    if (formData.printConfig && formData.printConfig.elements && formData.printConfig.elements.length > 0) {
      setElements(formData.printConfig.elements);
    } else {
      const DEFAULT_TEMPLATE = [
        { id: 'clinic-name', type: 'text', content: 'CLINIC NAME\nMULTI SPECIALTY CLINIC', x: (cw - 300) / 2, y: 20, fontSize: 18, fontWeight: 'bold', color: '#1e40af', textAlign: 'center', width: 300, height: 50 },
        { id: 'clinic-address', type: 'text', content: 'Clinic Address line 1, City - Pincode.', x: (cw - 250) / 2, y: 70, fontSize: 12, fontWeight: 'normal', color: '#334155', textAlign: 'center', width: 250, height: 30 },
        { id: 'line-1', type: 'line', content: '', x: 20, y: 100, width: Math.max(100, cw - 40), height: 2, color: '#1e40af' },
        { id: 'doc-1', type: 'text', content: "Doctor: {DoctorName}\nSpecialization\nMob.: 9876543210", x: 20, y: 110, fontSize: 11, fontWeight: 'normal', color: '#000000', width: Math.min(200, cw / 2 - 20), height: 60 },
        { id: 'logo-1', type: 'image', content: formData.logoUrl || 'https://via.placeholder.com/150', x: (cw - 80) / 2, y: 110, width: 80, height: 80 },
        { id: 'patient-info', type: 'text', content: 'Patient: {PatientName}\nAge/Sex: {PatientAge} / {PatientGender}', x: cw - Math.min(220, cw / 2 - 20) - 20, y: 110, fontSize: 11, fontWeight: 'bold', color: '#000000', width: Math.min(200, cw / 2 - 20), height: 60 },
        { id: 'line-2', type: 'line', content: '', x: 20, y: 195, width: Math.max(100, cw - 40), height: 2, color: '#1e40af' },
        { id: 'rx-badge', type: 'text', content: 'Rx', x: 20, y: 210, fontSize: 24, fontWeight: 'bold', color: '#000000', width: 50, height: 40 },
        { id: 'date-field', type: 'text', content: 'Date: {Date}', x: cw - 170, y: 220, fontSize: 12, fontWeight: 'normal', color: '#000000', width: 150, height: 30 },
        { id: 'line-3', type: 'line', content: '', x: 20, y: Math.max(250, ch - 80), width: Math.max(100, cw - 40), height: 2, color: '#1e40af' },
        { id: 'footer-timing', type: 'text', content: 'Timing : 10.00 A.M. - 12.00 P.M. & 5.00 P.M. - 8.00 P.M. (Sundays on Appointment Only)', x: Math.max(0, (cw - 500) / 2), y: Math.max(270, ch - 70), fontSize: 11, fontWeight: 'bold', color: '#1e40af', width: Math.min(500, cw), height: 30 }
      ];
      setElements(DEFAULT_TEMPLATE);
    }
  }, [formData.printConfig]);

  // Clamp elements to canvas bounds if paper size changes
  useEffect(() => {
    setElements(prev => {
      let needsUpdate = false;
      const newElements = prev.map(el => {
        let changed = false;
        let newEl = { ...el };
        const elWidth = newEl.width || 100;
        
        if (newEl.x + elWidth > canvasWidth - 20) {
          if (newEl.x > canvasWidth - 40) {
            newEl.x = Math.max(20, canvasWidth - 40);
          }
          if (newEl.x + elWidth > canvasWidth - 20) {
            newEl.width = (canvasWidth - 20) - newEl.x;
          }
          changed = true;
          needsUpdate = true;
        }
        return changed ? newEl : el;
      });
      return needsUpdate ? newElements : prev;
    });
  }, [canvasWidth]);

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

  const resetToPreset = () => {
    if (!confirm('This will wipe your current layout and reset it to the default clinic layout. Are you sure?')) return;
    const cw = paperSize === 'Custom' ? customWidth * 37.8 : (paperSize === 'Letter' ? 612 : paperSize === 'A5' ? 450 : paperSize === 'HalfLetter' ? 450 : paperSize === 'A6' ? 300 : 600);
    const ch = paperSize === 'Custom' ? customHeight * 37.8 : (paperSize === 'Letter' ? 800 : paperSize === 'A5' ? 640 : paperSize === 'HalfLetter' ? 695 : paperSize === 'A6' ? 424 : 800);
    const DEFAULT_TEMPLATE = [
      { id: 'clinic-name', type: 'text', content: 'CLINIC NAME\nMULTI SPECIALTY CLINIC', x: (cw - 300) / 2, y: 20, fontSize: 18, fontWeight: 'bold', color: '#1e40af', textAlign: 'center', width: 300, height: 50 },
      { id: 'clinic-address', type: 'text', content: 'Clinic Address line 1, City - Pincode.', x: (cw - 250) / 2, y: 70, fontSize: 12, fontWeight: 'normal', color: '#334155', textAlign: 'center', width: 250, height: 30 },
      { id: 'line-1', type: 'line', content: '', x: 20, y: 100, width: Math.max(100, cw - 40), height: 2, color: '#1e40af' },
      { id: 'doc-1', type: 'text', content: "Doctor: {DoctorName}\nSpecialization\nMob.: 9876543210", x: 20, y: 110, fontSize: 11, fontWeight: 'normal', color: '#000000', width: Math.min(200, cw / 2 - 20), height: 60 },
      { id: 'logo-1', type: 'image', content: formData.logoUrl || 'https://via.placeholder.com/150', x: (cw - 80) / 2, y: 110, width: 80, height: 80 },
      { id: 'patient-info', type: 'text', content: 'Patient: {PatientName}\nAge/Sex: {PatientAge} / {PatientGender}', x: cw - Math.min(220, cw / 2 - 20) - 20, y: 110, fontSize: 11, fontWeight: 'bold', color: '#000000', width: Math.min(200, cw / 2 - 20), height: 60 },
      { id: 'line-2', type: 'line', content: '', x: 20, y: 195, width: Math.max(100, cw - 40), height: 2, color: '#1e40af' },
      { id: 'rx-badge', type: 'text', content: 'Rx', x: 20, y: 210, fontSize: 24, fontWeight: 'bold', color: '#000000', width: 50, height: 40 },
      { id: 'date-field', type: 'text', content: 'Date: {Date}', x: cw - 170, y: 220, fontSize: 12, fontWeight: 'normal', color: '#000000', width: 150, height: 30 },
      { id: 'line-3', type: 'line', content: '', x: 20, y: Math.max(250, ch - 80), width: Math.max(100, cw - 40), height: 2, color: '#1e40af' },
      { id: 'footer-timing', type: 'text', content: 'Timing : 10.00 A.M. - 12.00 P.M. & 5.00 P.M. - 8.00 P.M. (Sundays on Appointment Only)', x: Math.max(0, (cw - 500) / 2), y: Math.max(270, ch - 70), fontSize: 11, fontWeight: 'bold', color: '#1e40af', width: Math.min(500, cw), height: 30 }
    ];
    saveToForm(DEFAULT_TEMPLATE);
  };

  const addTextElement = () => {
    const newEl = { id: `text-${Date.now()}`, type: 'text', content: 'New Text', x: 50, y: 50, width: 150, height: 40, fontSize: 14, fontWeight: 'normal', color: '#000000' };
    saveToForm([...elements, newEl]);
  };

  const addImageElement = () => {
    const newEl = { id: `image-${Date.now()}`, type: 'image', content: formData.logoUrl || 'https://via.placeholder.com/150', x: 200, y: 50, width: 100, height: 100 };
    saveToForm([...elements, newEl]);
  };
  
  const addRxBadge = () => {
    const newEl = { id: `rx-${Date.now()}`, type: 'text', content: 'Rx', x: 30, y: 250, width: 50, height: 40, fontSize: 32, fontWeight: 'bold', color: '#000000' };
    saveToForm([...elements, newEl]);
  };

  const addHorizontalLine = () => {
    const newEl = { id: `line-${Date.now()}`, type: 'line', content: '', x: 20, y: 150, width: 400, height: 2, color: '#334155' };
    saveToForm([...elements, newEl]);
  };

  const deleteElement = (id: string) => {
    saveToForm(elements.filter(e => e.id !== id));
  };

  const duplicateElement = (id: string) => {
    const el = elements.find(e => e.id === id);
    if (!el) return;
    const newEl = { ...el, id: `${el.type}-${Date.now()}`, x: el.x + 20, y: el.y + 20 };
    saveToForm([...elements, newEl]);
  };

  const handlePointerDown = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    setDraggingId(id);
    setSelectedId(id);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleResizeStart = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    setResizingId(id);
    setSelectedId(id);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if ((!draggingId && !resizingId) || !canvasRef.current) return;
    const canvasRect = canvasRef.current.getBoundingClientRect();
    
    // Calculate new position relative to canvas
    const newX = e.clientX - canvasRect.left;
    const newY = e.clientY - canvasRect.top;

    if (resizingId) {
      setElements(prev => prev.map(el => {
        if (el.id === resizingId) {
          return { 
            ...el, 
            width: Math.min(canvasWidth - el.x, Math.max(20, newX - el.x)), 
            height: Math.max(2, newY - el.y) 
          };
        }
        return el;
      }));
      return;
    }

    if (draggingId) {
      let finalX = Math.max(0, newX - 20);
      let finalY = Math.max(0, newY - 10);
      
      const draggingEl = elements.find(e => e.id === draggingId);
      const elWidth = draggingEl?.width || 100;
      const elHeight = draggingEl?.height || 30;

      let newSnapLines: {x?: number, y?: number}[] = [];

      // Center snap logic (15px threshold)
      const elementCenterX = finalX + (elWidth / 2);
      const canvasCenterX = canvasWidth / 2;
      
      if (Math.abs(elementCenterX - canvasCenterX) < 15) {
        // Just show the guide without forcing the snap
        newSnapLines.push({ x: canvasCenterX });
      }
      
      // Snapping to other elements
      elements.forEach(other => {
        if (other.id === draggingId) return;
        
        const otherWidth = other.width || 100;
        const otherHeight = other.height || 30;
        
        // Y snapping
        const yTargets = [other.y, other.y + otherHeight, other.y + (otherHeight / 2)];
        const myYPoints = [finalY, finalY + elHeight, finalY + (elHeight / 2)];
        
        for (let targetY of yTargets) {
          if (Math.abs(myYPoints[0] - targetY) < 10) { newSnapLines.push({ y: targetY }); break; }
          if (Math.abs(myYPoints[1] - targetY) < 10) { newSnapLines.push({ y: targetY }); break; }
          if (Math.abs(myYPoints[2] - targetY) < 10) { newSnapLines.push({ y: targetY }); break; }
        }

        // X snapping
        const xTargets = [other.x, other.x + otherWidth, other.x + (otherWidth / 2)];
        const myXPoints = [finalX, finalX + elWidth, finalX + (elWidth / 2)];

        for (let targetX of xTargets) {
          if (Math.abs(myXPoints[0] - targetX) < 10) { newSnapLines.push({ x: targetX }); break; }
          if (Math.abs(myXPoints[1] - targetX) < 10) { newSnapLines.push({ x: targetX }); break; }
          if (Math.abs(myXPoints[2] - targetX) < 10) { newSnapLines.push({ x: targetX }); break; }
        }
      });

      setSnapLines(newSnapLines);

      setElements(prev => prev.map(el => {
        if (el.id === draggingId) {
          return { ...el, x: Math.min(canvasWidth - (el.width || 20), finalX), y: finalY };
        }
        return el;
      }));
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (draggingId || resizingId) {
      setDraggingId(null);
      setResizingId(null);
      setSnapLines([]);
      // Finalize save to form state when dropping
      saveToForm(elements);
    }
  };

  const updateElementContent = (id: string, content: string) => {
    setElements(prev => {
      const newElements = prev.map(e => e.id === id ? { ...e, content } : e);
      setFormData((oldForm: any) => ({
        ...oldForm,
        printConfig: {
          ...oldForm.printConfig,
          elements: newElements
        }
      }));
      return newElements;
    });
  };

  const updateElementProp = (id: string, prop: string, value: any) => {
    setElements(prev => {
      const newElements = prev.map(e => e.id === id ? { ...e, [prop]: value } : e);
      setFormData((oldForm: any) => ({
        ...oldForm,
        printConfig: {
          ...oldForm.printConfig,
          elements: newElements
        }
      }));
      return newElements;
    });
  };

  const selectedEl = elements.find(e => e.id === selectedId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Drag-and-Drop Print Designer</h2>
          <p className="text-sm text-slate-500">Design your exact prescription pad layout here.</p>
        </div>
        <div className="flex flex-wrap gap-3 items-center w-full xl:w-auto">
          <select 
            value={paperSize} 
            onChange={e => {
              const newSize = e.target.value;
              const getCw = (ps: string, cWidth: number) => ps === 'Custom' ? cWidth * 37.8 : (ps === 'Letter' ? 612 : ps === 'A5' ? 450 : ps === 'HalfLetter' ? 450 : ps === 'A6' ? 300 : 600);
              const oldCw = getCw(paperSize, customWidth);
              const newCw = getCw(newSize, customWidth);
              const scale = newCw / oldCw;

              const rescaledElements = elements.map(el => ({
                ...el,
                x: el.x * scale,
                y: el.y * scale,
                width: el.width ? el.width * scale : el.width,
                height: el.height ? el.height * scale : el.height,
                fontSize: el.fontSize ? Math.max(8, el.fontSize * scale) : el.fontSize
              }));

              setElements(rescaledElements);
              setPaperSize(newSize);
              setFormData({ ...formData, defaultPaperSize: newSize, printConfig: { elements: rescaledElements } });
            }}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none"
          >
            <option value="A4">A4 Size</option>
            <option value="A5">A5 Size</option>
            <option value="A6">A6 Size</option>
            <option value="Letter">US Letter</option>
            <option value="HalfLetter">Half Letter (5.5" x 8.5")</option>
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
          
          <div className="flex items-center gap-2 ml-4">
            <label className="text-xs font-bold text-slate-500 uppercase">Body Start (Top Margin):</label>
            <input 
              type="range" 
              min="100" 
              max="800" 
              value={formData.printConfig?.bodyTopMargin !== undefined ? formData.printConfig.bodyTopMargin : 300}
              onChange={e => {
                setFormData({
                  ...formData,
                  printConfig: {
                    ...formData.printConfig,
                    bodyTopMargin: Number(e.target.value)
                  }
                });
              }}
              className="w-24 accent-indigo-600"
            />
            <span className="text-xs font-mono font-medium text-slate-600">{formData.printConfig?.bodyTopMargin !== undefined ? formData.printConfig.bodyTopMargin : 300}px</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 w-full xl:w-auto justify-end">
          <Button onClick={resetToPreset} variant="outline" className="flex-1 xl:flex-none text-slate-600 border-slate-300">
            Reset to Preset
          </Button>
          <Button onClick={onSave} disabled={saving} className="flex-1 xl:flex-none bg-indigo-600 text-white shadow-sm">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Save Layout
          </Button>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-4 items-start w-full">
        {/* Toolbar */}
        <div className="w-full xl:w-48 bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col gap-3 h-fit shrink-0">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Tools</h3>
          <div className="grid grid-cols-2 xl:grid-cols-1 gap-2">
            <button onClick={addTextElement} className="flex items-center justify-center xl:justify-start gap-2 w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-100 transition-colors">
              <Type className="w-4 h-4 text-slate-500" /> Add Text
            </button>
            <button onClick={addImageElement} className="flex items-center justify-center xl:justify-start gap-2 w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-100 transition-colors">
              <ImageIcon className="w-4 h-4 text-slate-500" /> Add Logo
            </button>
            <button onClick={addRxBadge} className="flex items-center justify-center xl:justify-start gap-2 w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-100 transition-colors">
              <Layout className="w-4 h-4 text-slate-500" /> Rx Badge
            </button>
            <button onClick={addHorizontalLine} className="flex items-center justify-center xl:justify-start gap-2 w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-100 transition-colors">
              <Minus className="w-4 h-4 text-slate-500" /> Add Line
            </button>
          </div>
          
          {selectedEl && (
            <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Properties</h3>
              
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Color</label>
                <input 
                  type="color" 
                  value={selectedEl.color || '#000000'} 
                  onChange={e => updateElementProp(selectedEl.id, 'color', e.target.value)}
                  className="w-full h-8 cursor-pointer rounded"
                />
              </div>

              {selectedEl.type === 'text' && (
                <>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Font Size (px)</label>
                    <input 
                      type="number" 
                      value={selectedEl.fontSize || 14} 
                      onChange={e => updateElementProp(selectedEl.id, 'fontSize', Number(e.target.value))}
                      className="w-full text-xs px-2 py-1 border border-slate-200 rounded"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onMouseDown={(e) => {
                        e.preventDefault(); // Prevent losing focus on the text editor
                        if (selectedEl.type === 'text') {
                          document.execCommand('bold', false);
                        } else {
                          updateElementProp(selectedEl.id, 'fontWeight', selectedEl.fontWeight === 'bold' ? 'normal' : 'bold');
                        }
                      }}
                      className={`flex-1 py-1 text-xs font-bold border rounded ${selectedEl.fontWeight === 'bold' ? 'bg-slate-200 border-slate-300' : 'bg-white border-slate-200'}`}
                      title="Bold (Select text to apply)"
                    >
                      B
                    </button>
                    <button 
                      onClick={() => updateElementProp(selectedEl.id, 'textAlign', 'left')}
                      className={`flex-1 py-1 text-xs border rounded ${selectedEl.textAlign === 'left' || !selectedEl.textAlign ? 'bg-slate-200 border-slate-300' : 'bg-white border-slate-200'}`}
                    >
                      L
                    </button>
                    <button 
                      onClick={() => updateElementProp(selectedEl.id, 'textAlign', 'center')}
                      className={`flex-1 py-1 text-xs border rounded ${selectedEl.textAlign === 'center' ? 'bg-slate-200 border-slate-300' : 'bg-white border-slate-200'}`}
                    >
                      C
                    </button>
                    <button 
                      onClick={() => updateElementProp(selectedEl.id, 'textAlign', 'right')}
                      className={`flex-1 py-1 text-xs border rounded ${selectedEl.textAlign === 'right' ? 'bg-slate-200 border-slate-300' : 'bg-white border-slate-200'}`}
                    >
                      R
                    </button>
                  </div>
                </>
              )}

              {(selectedEl.type === 'image' || selectedEl.type === 'line') && (
                <>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Width (px)</label>
                    <input 
                      type="number" 
                      value={selectedEl.width || 100} 
                      onChange={e => updateElementProp(selectedEl.id, 'width', Number(e.target.value))}
                      className="w-full text-xs px-2 py-1 border border-slate-200 rounded"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Height/Thickness (px)</label>
                    <input 
                      type="number" 
                      value={selectedEl.height || 100} 
                      onChange={e => updateElementProp(selectedEl.id, 'height', Number(e.target.value))}
                      className="w-full text-xs px-2 py-1 border border-slate-200 rounded"
                    />
                  </div>
                </>
              )}
            </div>
          )}

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

        {/* Canvas Wrapper */}
        <div className="w-full overflow-x-auto pb-8">
          <div 
            ref={canvasRef}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onPointerDown={() => setSelectedId(null)}
          className="flex-1 bg-white border border-slate-300 rounded-sm shadow-sm relative overflow-hidden"
          style={{ 
            height: `${canvasHeight}px`, 
            width: `${canvasWidth}px`, 
            margin: '0 auto', 
            cursor: draggingId ? 'grabbing' : 'auto',
            transformOrigin: 'top center',
            transform: paperSize === 'Custom' && customHeight > 22 ? 'scale(0.8)' : 'scale(1)'
          }}
        >
          {snapLines.map((line, i) => (
            line.x !== undefined ? (
              <div key={`x-${i}`} className="absolute top-0 bottom-0 border-l-[1.5px] border-dashed border-pink-400 z-0 pointer-events-none" style={{ left: line.x }} />
            ) : (
              <div key={`y-${i}`} className="absolute left-0 right-0 border-t-[1.5px] border-dashed border-pink-400 z-0 pointer-events-none" style={{ top: line.y }} />
            )
          ))}

          {elements.map((el) => (
            <div
              key={el.id}
              className={`absolute group border-2 ${selectedId === el.id ? 'border-indigo-500 z-50' : (draggingId === el.id ? 'border-indigo-300 border-dashed z-40' : 'border-transparent hover:border-slate-200 hover:border-dashed z-10')}`}
              style={{ left: el.x, top: el.y, cursor: el.type === 'text' ? 'text' : 'grab' }}
              onPointerDown={(e) => {
                if (el.type !== 'text') handlePointerDown(e, el.id);
              }}
            >
              {el.type === 'text' && (
                <EditableText
                  element={el}
                  onUpdate={updateElementContent}
                  onSelect={setSelectedId}
                  isSelected={selectedId === el.id}
                />
              )}
              {el.type === 'image' && (
                <img src={el.content} alt="Logo" style={{ width: el.width, height: el.height, objectFit: 'contain' }} draggable={false} />
              )}
              {el.type === 'line' && (
                <div style={{ width: el.width, height: el.height, backgroundColor: el.color }} />
              )}
              
              <button 
                onClick={(e) => { e.stopPropagation(); duplicateElement(el.id); }}
                className="absolute -top-3 right-4 bg-indigo-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 text-xs z-50"
                title="Duplicate"
              >
                <Copy size={10} />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); deleteElement(el.id); }}
                className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 text-xs z-50"
                title="Delete"
              >
                ×
              </button>

              {/* Drag Handle for Text Elements */}
              {selectedId === el.id && (
                <div 
                  className="absolute -top-3 -left-3 w-6 h-6 bg-blue-500 text-white rounded-full cursor-grab z-50 flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    handlePointerDown(e, el.id);
                  }}
                  title="Drag to move"
                >
                  <Move size={12} />
                </div>
              )}
              
              {selectedId === el.id && (
                <div 
                  className="absolute -bottom-2 -right-2 w-4 h-4 bg-indigo-500 rounded-full cursor-se-resize z-50 flex items-center justify-center shadow-sm"
                  onPointerDown={(e) => handleResizeStart(e, el.id)}
                >
                  <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                </div>
              )}
            </div>
          ))}
          
          <div 
            className="absolute left-0 right-0 text-center opacity-40 pointer-events-none font-bold uppercase tracking-widest border-t border-dashed border-indigo-500 pt-2"
            style={{ 
              top: formData.printConfig?.bodyTopMargin !== undefined ? formData.printConfig.bodyTopMargin : 300,
              color: '#6366f1'
            }}
          >
            Prescription Body Starts Here
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
