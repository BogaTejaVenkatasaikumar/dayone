import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { FileText, Download, Copy, Building2, Briefcase, Zap, Sparkles } from 'lucide-react';

export const CoverLetterScreen = () => {
  const [companyName, setCompanyName] = useState('');
  const [position, setPosition] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [tone, setTone] = useState<'Professional' | 'Enthusiastic' | 'Concise'>('Professional');
  
  const [coverLetter, setCoverLetter] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const [resumeData, setResumeData] = useState<any>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('dayone-resume-data');
      if (stored) {
        setResumeData(JSON.parse(stored));
      }
    } catch (e) {}
  }, []);

  const generateCoverLetter = () => {
    setIsGenerating(true);
    
    // Simulate AI Generation
    setTimeout(() => {
      const name = resumeData?.personalInfo?.fullName || 'Jane Doe';
      const email = resumeData?.personalInfo?.email || 'jane@example.com';
      const phone = resumeData?.personalInfo?.phone || '';
      
      const skills = resumeData?.skills?.programmingLanguages || 'React, TypeScript, Node.js';
      const exp = resumeData?.experience?.[0] || { company: 'Tech Corp', position: 'Software Engineer' };
      
      let toneOpening = '';
      if (tone === 'Professional') toneOpening = `I am writing to express my strong interest in the ${position || 'Software Engineering'} position at ${companyName || 'your company'}.`;
      if (tone === 'Enthusiastic') toneOpening = `I was absolutely thrilled to discover the ${position || 'Software Engineering'} opportunity at ${companyName || 'your company'}, and I couldn't wait to submit my application!`;
      if (tone === 'Concise') toneOpening = `Please consider this letter as my application for the ${position || 'Software Engineering'} role at ${companyName || 'your company'}.`;
      
      const template = `${name}
${email} | ${phone}

${new Date().toLocaleDateString()}

Hiring Manager
${companyName || 'Company Name'}

Dear Hiring Manager,

${toneOpening} With a strong foundation in ${skills} and a proven track record from my time as a ${exp.position} at ${exp.company}, I am confident in my ability to make an immediate impact on your team.

My recent experience has taught me the importance of writing scalable, clean code and collaborating effectively across teams. I am particularly drawn to this role because it aligns perfectly with my goal of building high-quality products while continuing to grow as an engineer.

Thank you for your time and consideration. I would welcome the opportunity to discuss how my background, skills, and enthusiasm align with the needs of your team.

Sincerely,

${name}
`;
      setCoverLetter(template);
      setIsGenerating(false);
    }, 1500);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(coverLetter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPDF = () => {
    const printWindow = window.open('', '_blank', 'width=800,height=1000');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cover Letter</title>
          <style>
            body { font-family: 'Times New Roman', Times, serif; padding: 50px; font-size: 12pt; line-height: 1.6; white-space: pre-wrap; }
          </style>
        </head>
        <body>${coverLetter}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 400);
  };

  const inputCls = "w-full p-3 rounded-xl bg-surface-container-high border border-outline-variant/20 text-on-surface focus:outline-none focus:border-primary text-sm transition-all";
  const labelCls = "block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1.5";

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }} className="space-y-6 max-w-6xl mx-auto pb-16">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant/10 pb-6">
        <div className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">AI Writer</span>
          <h2 className="font-headline font-extrabold text-3xl sm:text-4xl tracking-tight text-on-surface">Cover Letter Generator</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Form */}
        <div className="bg-surface-container-low rounded-3xl p-6 md:p-8 border border-outline-variant/10 shadow-lg space-y-6">
          <h4 className="font-headline font-bold text-lg text-on-surface flex items-center gap-2">
            <Zap className="text-primary" size={20} /> Letter Details
          </h4>
          
          {!resumeData && (
            <div className="p-4 bg-primary/10 rounded-xl text-primary text-sm border border-primary/20">
              <span className="font-bold">Note:</span> Please create a resume in the Resume Builder first so we can use your background.
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className={labelCls}>Company Name</label>
              <div className="relative">
                <Building2 size={16} className="absolute left-3 top-3.5 text-on-surface-variant" />
                <input value={companyName} onChange={e => setCompanyName(e.target.value)} className={`${inputCls} pl-10`} placeholder="e.g. Acme Corp" />
              </div>
            </div>
            <div>
              <label className={labelCls}>Position</label>
              <div className="relative">
                <Briefcase size={16} className="absolute left-3 top-3.5 text-on-surface-variant" />
                <input value={position} onChange={e => setPosition(e.target.value)} className={`${inputCls} pl-10`} placeholder="e.g. Frontend Engineer" />
              </div>
            </div>
            <div>
              <label className={labelCls}>Job Description (Optional)</label>
              <textarea 
                value={jobDescription} 
                onChange={e => setJobDescription(e.target.value)} 
                className={`${inputCls} h-32 resize-none`} 
                placeholder="Paste the job description here so we can tailor the cover letter..." 
              />
            </div>
            
            <div>
              <label className={labelCls}>Tone</label>
              <div className="flex flex-wrap gap-3">
                {['Professional', 'Enthusiastic', 'Concise'].map(t => (
                  <label key={t} className={`flex-1 text-center py-2 px-4 rounded-xl border cursor-pointer transition-all ${tone === t ? 'bg-primary/10 border-primary text-primary font-bold' : 'bg-surface-container border-outline-variant/20 text-on-surface-variant hover:bg-surface-container-high'}`}>
                    <input type="radio" name="tone" value={t} checked={tone === t} onChange={() => setTone(t as any)} className="hidden" />
                    <span className="text-sm">{t}</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              onClick={generateCoverLetter}
              disabled={isGenerating || !resumeData}
              className="w-full py-3.5 mt-4 rounded-xl bg-gradient-to-r from-primary to-primary-container text-white font-headline font-bold uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:scale-100"
            >
              {isGenerating ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Sparkles size={18} /> Generate Cover Letter</>}
            </button>
          </div>
        </div>

        {/* Right Preview */}
        <div className="bg-surface-container rounded-3xl p-6 md:p-8 border border-outline-variant/10 shadow-lg flex flex-col h-[700px]">
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-outline-variant/10">
            <h4 className="font-headline font-bold text-lg text-on-surface flex items-center gap-2">
              <FileText className="text-primary" size={20} /> Preview
            </h4>
            
            {coverLetter && (
              <div className="flex gap-2">
                <button onClick={handleCopy} className="p-2 rounded-lg bg-surface-container-high hover:bg-surface-container-highest transition-colors text-on-surface" title="Copy Text">
                  <Copy size={16} />
                </button>
                <button onClick={handleDownloadPDF} className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors" title="Download PDF">
                  <Download size={16} />
                </button>
              </div>
            )}
          </div>

          {coverLetter ? (
            <textarea
              value={coverLetter}
              onChange={e => setCoverLetter(e.target.value)}
              className="flex-1 w-full p-4 rounded-xl bg-surface border border-outline-variant/10 text-on-surface text-sm font-serif leading-relaxed resize-none focus:outline-none focus:border-primary transition-all"
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-on-surface-variant/50 space-y-4">
              <FileText size={48} />
              <p className="text-sm">Your cover letter will appear here.</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
