import { useEffect, useState } from 'react';
import { Camera, FileText, MessageCircle, CheckCircle2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { api } from '../lib/api.js';
import { useTheme } from '../lib/theme.jsx';
import TextReveal from '../components/TextReveal.jsx';

const DEMO = {
  from: 'Amma (Madurai, feature phone)', summary: 'Street light near the temple has not worked for 3 weeks.', department: 'Town Panchayat – Electrical Wing',
  letter: 'To,\nThe Executive Officer,\nTown Panchayat\n\nSubject: Request to repair non-functional street light near the village temple\n\nRespected Sir/Madam,\nThe street light near the village temple has been out of order for three weeks, causing safety risks for residents, especially women and elders at night. I kindly request urgent repair.\n\nThank you.\n\n[Name]\n[Date]\n[Location]',
};

/** Urimai Action Kit: O2O flow where the linked smartphone user completes a grievance reported by a rural parent. */
export default function Family() {
  const { setState } = useTheme();
  const [report] = useState(() => { try { return JSON.parse(localStorage.getItem('ts_report')) || DEMO; } catch { return DEMO; } });
  const [photo, setPhoto] = useState(null); const [msg, setMsg] = useState('');
  useEffect(() => { setState('civic'); return () => setState('neutral'); }, [setState]);

  const pick = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    if (!['image/jpeg', 'image/png'].includes(f.type) || f.size > 2 * 1024 * 1024) { setMsg('Please choose a JPEG or PNG under 2 MB.'); return; }
    const url = await new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(f); });
    setPhoto({ url, type: f.type === 'image/png' ? 'PNG' : 'JPEG' });
    try { await api.upload(f); setMsg('Photo attached.'); } catch { setMsg('Photo attached locally (server upload skipped).'); }
  };

  const makePdf = () => {
    const d = new jsPDF({ unit: 'pt', format: 'a4' }); let y = 60;
    d.setFont('helvetica', 'bold'); d.setFontSize(14); d.text('Grievance Petition (Urimai)', 50, y); y += 28;
    d.setFont('helvetica', 'normal'); d.setFontSize(11);
    const lines = d.splitTextToSize(report.letter.replace(/[^\x00-\x7F\n]/g, '?'), 495); d.text(lines, 50, y); y += lines.length * 14 + 16;
    if (photo) { try { d.addImage(photo.url, photo.type, 50, y, 220, 150); y += 165; } catch { /* skip */ } }
    if (y > 650) { d.addPage(); y = 60; }
    d.setDrawColor(0); d.rect(50, y, 230, 70); d.text('Signature / Thumb impression of applicant', 55, y + 84);
    d.rect(315, y, 230, 70); d.text('Name, village & date', 320, y + 84);
    d.save('urimai-grievance.pdf');
  };

  const waText = encodeURIComponent(`Urimai grievance (${report.department}): ${report.summary}\nPlease help file this on the CM Helpline / e-sevai portal.`);
  const Opt = ({ icon: I, title, desc, children }) => (
    <li className="card flex flex-col gap-3 p-5"><I aria-hidden="true" className="text-accent" size={32} /><h3 className="text-xl font-bold">{title}</h3><p className="text-muted">{desc}</p><div className="mt-auto">{children}</div></li>
  );
  return (
    <div className="space-y-6">
      <TextReveal text="Urimai Action Kit" className="grad-text text-4xl font-extrabold" />
      <section className="card p-5" aria-label="Incoming report">
        <p className="text-sm font-semibold uppercase tracking-wider text-muted">New report from {report.from}</p>
        <p className="mt-1 text-xl font-bold">{report.summary}</p>
        <p className="text-muted">Department: {report.department}</p>
      </section>
      <ul className="grid gap-4 sm:grid-cols-3">
        <Opt icon={Camera} title="Upload Photo" desc="Add a photo of the problem as evidence.">
          <label className="btn-primary w-full cursor-pointer">Choose photo<input type="file" accept="image/jpeg,image/png" className="sr-only" onChange={pick} /></label>
          {photo && <img src={photo.url} alt="Evidence photo you selected" className="mt-3 h-28 w-full rounded-xl object-cover" />}
        </Opt>
        <Opt icon={FileText} title="Generate PDF" desc="Letter with your photo and a signature block for the villager to sign.">
          <button className="btn-primary w-full" onClick={makePdf}>Download PDF</button>
        </Opt>
        <Opt icon={MessageCircle} title="Send Proxy WhatsApp Link" desc="Share with a remote coordinator or use the CM Helpline digital route.">
          <a className="btn-primary w-full" href={`https://wa.me/?text=${waText}`} target="_blank" rel="noopener noreferrer">Open WhatsApp</a>
        </Opt>
      </ul>
      <p role="status" className="flex items-center gap-2 font-semibold">{msg && <><CheckCircle2 size={20} aria-hidden="true" />{msg}</>}</p>
    </div>
  );
}
