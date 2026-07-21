import React, { useEffect, useState, useRef } from 'react';
import api from '../../lib/axios';
import { X, Printer, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';

export function PrintPrescriptionModal({ prescription, onClose }: any) {
  const [tenant, setTenant] = useState<any>(null);
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
              @page { margin: 0; size: ${paperSize === 'Custom' ? `${tenant?.customWidth || 14}cm ${tenant?.customHeight || 21}cm` : 'auto'}; }
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
  const width = paperSize === 'Custom' ? customWidthPx : (paperSize === 'A4' ? 794 : 595); // A4 approx 794px width at 96dpi, A5 approx 595px
  const minHeight = paperSize === 'Custom' ? customHeightPx : (paperSize === 'A4' ? 1122 : 842);

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
              width: `${width}px`, 
              minHeight: `${minHeight}px`,
            }}
          >
            {/* Render Custom Drag-and-Drop Headers/Logos */}
            {printConfig.map((el: any) => (
              <div
                key={el.id}
                style={{ 
                  position: 'absolute', 
                  left: el.x, 
                  top: el.y,
                  fontSize: el.fontSize,
                  fontWeight: el.fontWeight,
                  color: el.color,
                  textAlign: el.textAlign || 'left',
                  width: el.width || 'auto'
                }}
              >
                {el.type === 'text' && (
                  <div style={{ whiteSpace: 'pre-wrap' }}>{el.content}</div>
                )}
                {el.type === 'image' && (
                  <img src={el.content} alt="Logo" style={{ width: el.width, height: el.height, objectFit: 'contain' }} />
                )}
                {el.type === 'line' && (
                  <div style={{ width: el.width, height: el.height, backgroundColor: el.color }} />
                )}
              </div>
            ))}

            {/* Render Prescription Content Body */}
            {/* We position the body content starting below the header area (e.g., top: 300px) */}
            <div style={{ position: 'absolute', top: '350px', left: '50px', right: '50px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '20px' }}>
                <div>
                  <strong>Patient:</strong> {prescription.patient?.name} <br/>
                  <strong>Age/Sex:</strong> {prescription.patient?.age || '--'} / {prescription.patient?.gender || '--'}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <strong>Date:</strong> {new Date(prescription.createdAt).toLocaleDateString('en-GB')} <br/>
                  <strong>Doctor:</strong> Dr. {prescription.doctor?.firstName} {prescription.doctor?.lastName}
                </div>
              </div>

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
                      <td style={{ padding: '12px 0' }}>
                        <div style={{ fontWeight: 'bold' }}>{item.medicineName}</div>
                        {item.instructions && <div style={{ fontSize: '12px', color: '#666' }}>{item.instructions}</div>}
                      </td>
                      <td>{item.dosage || '-'}</td>
                      <td>{item.frequency || '-'}</td>
                      <td>{item.duration || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {prescription.notes && (
                <div style={{ marginTop: '40px', padding: '15px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
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
