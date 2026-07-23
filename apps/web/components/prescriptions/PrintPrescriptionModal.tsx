import React, { useEffect, useState, useRef } from 'react';
import api from '../../lib/axios';
import { X, Printer, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';

export function PrintPrescriptionModal({ prescription, onClose }: any) {
  const [tenant, setTenant] = useState<any>(null);

  const calculateAge = (dob: string | Date | null) => {
    if (!dob) return '--';
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age.toString();
  };
  const [loading, setLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get('/tenant').then(res => {
      setTenant(res.data);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  const handlePrint = () => {
    if (!printRef.current) return;
    
    // Create a new window for printing the canvas perfectly
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Print Prescription</title>
          <style>
            body { margin: 0; padding: 0; font-family: sans-serif; }
            @media print {
              @page { margin: 0; size: ${paperSize === 'Custom' ? `${tenant?.customWidth || 14}cm ${tenant?.customHeight || 21}cm` : `${paperSize} portrait`}; }
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          ${printRef.current.outerHTML}
          <script>
            window.onload = () => { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  // Load layout from tenant or use defaults
  const printConfig = tenant?.printConfig?.elements || [];
  const paperSize = tenant?.defaultPaperSize || 'A4';
  const customWidthPx = (tenant?.customWidth || 14) * 37.8;
  const customHeightPx = (tenant?.customHeight || 21) * 37.8;
  
  // The physical dimensions used for the final print
  const printWidth = paperSize === 'Custom' ? customWidthPx : (paperSize === 'Letter' ? 816 : paperSize === 'A5' ? 559 : paperSize === 'HalfLetter' ? 528 : paperSize === 'A6' ? 397 : 794);
  const printMinHeight = paperSize === 'Custom' ? customHeightPx : (paperSize === 'Letter' ? 1056 : paperSize === 'A5' ? 794 : paperSize === 'HalfLetter' ? 816 : paperSize === 'A6' ? 559 : 1122);

  // The dimensions used in the visual designer
  const designerWidth = paperSize === 'Custom' ? customWidthPx : (paperSize === 'Letter' ? 612 : paperSize === 'A5' ? 450 : paperSize === 'HalfLetter' ? 450 : paperSize === 'A6' ? 300 : 600);
  
  // Calculate the ratio to scale up the custom elements perfectly
  const scale = printWidth / designerWidth;

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-screen max-w-[90vw]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="font-bold text-slate-900">Print Preview</h2>
          <div className="flex gap-2">
            <Button onClick={handlePrint} className="bg-indigo-600 text-white">
              <Printer className="w-4 h-4 mr-2" /> Print Now
            </Button>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2"><X className="w-5 h-5"/></button>
          </div>
        </div>

        {/* Print Canvas Container */}
        <div className="overflow-auto p-8 bg-slate-200 flex-1">
          {/* The Actual Printed Area */}
          <div 
            ref={printRef}
            className="bg-white mx-auto relative shadow-md"
            style={{ 
              width: `${printWidth}px`, 
              minHeight: `${printMinHeight}px`,
              position: 'relative',
              margin: '0 auto',
              backgroundColor: 'white'
            }}
          >
            {/* Render Custom Drag-and-Drop Headers/Logos with Dynamic Tokens */}
            {printConfig.map((el: any) => {
              let displayContent = el.content;
              if (el.type === 'text' && displayContent) {
                const patientName = prescription.patient?.name || '--';
                const patientAge = calculateAge(prescription.patient?.dateOfBirth);
                const patientGender = prescription.patient?.gender || '--';
                const dateStr = new Date(prescription.createdAt).toLocaleDateString('en-GB');
                const doctorName = `${prescription.doctor?.firstName || ''} ${prescription.doctor?.lastName || ''}`.trim() || 'Unknown';
                
                displayContent = displayContent
                  .replace(/{PatientName}/g, patientName)
                  .replace(/{PatientAge}/g, patientAge)
                  .replace(/{PatientGender}/g, patientGender)
                  .replace(/{Date}/g, dateStr)
                  .replace(/{DoctorName}/g, doctorName);
              }

              return (
                <div
                  key={el.id}
                  style={{ 
                    position: 'absolute', 
                    left: el.x * scale, 
                    top: el.y * scale,
                    fontSize: el.fontSize * scale,
                    fontWeight: el.fontWeight,
                    color: el.color,
                    textAlign: el.textAlign || 'left',
                    width: el.width ? el.width * scale : 'auto',
                    height: el.height ? el.height * scale : 'auto'
                  }}
                >
                  {el.type === 'text' && (
                    <div 
                      style={{ whiteSpace: 'pre-wrap' }} 
                      dangerouslySetInnerHTML={{ __html: displayContent.replace(/\n/g, '<br>') }}
                    />
                  )}
                  {el.type === 'image' && (
                    <img src={el.content} alt="Logo" style={{ width: el.width ? el.width * scale : 'auto', height: el.height ? el.height * scale : 'auto', objectFit: 'contain' }} />
                  )}
                  {el.type === 'line' && (
                    <div style={{ width: el.width ? el.width * scale : 'auto', height: el.height ? el.height * scale : 'auto', backgroundColor: el.color }} />
                  )}
                </div>
              );
            })}

            {/* Render Prescription Content Body */}
            {/* We position the body content starting exactly at scaled top: 300px */}
            <div style={{ position: 'absolute', top: `${300 * scale}px`, left: '50px', right: '50px' }}>

              {prescription.items && prescription.items.length > 0 && (
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '2px solid #333' }}>
                      <th style={{ padding: '8px 0' }}>Medicine</th>
                      <th>Dosage</th>
                      <th>Frequency</th>
                      <th>Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prescription.items.map((item: any, i: number) => (
                      <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '12px 0', wordBreak: 'break-word' }}>
                          <div style={{ fontWeight: 'bold' }}>{item.medicineName}</div>
                          {item.instructions && <div style={{ fontSize: '12px', color: '#666' }}>{item.instructions}</div>}
                        </td>
                        <td style={{ wordBreak: 'break-word' }}>{item.dosage || '-'}</td>
                        <td style={{ wordBreak: 'break-word' }}>{item.frequency || '-'}</td>
                        <td style={{ wordBreak: 'break-word' }}>{item.duration || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {prescription.notes && (
                <div style={{ marginTop: (prescription.items && prescription.items.length > 0) ? '40px' : '0', padding: '15px', backgroundColor: '#f9fafb', borderRadius: '8px', wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                  <strong style={{ display: 'block', marginBottom: '5px' }}>Additional Advice / Notes:</strong>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{prescription.notes}</div>
                </div>
              )}
              
              <div style={{ marginTop: '80px', textAlign: 'right', paddingRight: '20px' }}>
                <div>_________________________</div>
                <div style={{ marginTop: '5px' }}>Doctor's Signature</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
