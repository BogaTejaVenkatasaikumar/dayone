import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { 
  FileText, Download, Copy, Save, Plus, Trash2, ChevronDown, ChevronUp, LayoutTemplate, Briefcase, GraduationCap, Award, Settings, User, Code, FileDigit, ShieldCheck, Mail, Phone, MapPin, Globe, CheckCircle2, History
} from 'lucide-react';
import { projectsApi } from '../../api';

// Types
interface ResumeData {
  personalInfo: { fullName: string; email: string; phone: string; location: string; linkedin: string; github: string; website: string; };
  summary: string;
  careerObjective: string;
  showObjective: boolean;
  education: Array<{ id: string; degree: string; institution: string; location: string; startYear: string; endYear: string; gpa: string; coursework: string }>;
  experience: Array<{ id: string; company: string; position: string; location: string; startDate: string; endDate: string; description: string }>;
  projects: Array<{ id: string; title: string; description: string; technologies: string; githubUrl: string; liveUrl: string; role: string; achievements: string }>;
  skills: { programmingLanguages: string; frameworks: string; databases: string; cloudDevops: string; tools: string; softSkills: string };
  certifications: Array<{ id: string; name: string; issuer: string; date: string; url: string }>;
  languages: Array<{ id: string; name: string; proficiency: string }>;
  hobbies: string;
  references: Array<{ id: string; name: string; position: string; company: string; contact: string }>;
  availableUponRequest: boolean;
}

const defaultResumeData: ResumeData = {
  personalInfo: { fullName: '', email: '', phone: '', location: '', linkedin: '', github: '', website: '' },
  summary: '',
  careerObjective: '',
  showObjective: false,
  education: [],
  experience: [],
  projects: [],
  skills: { programmingLanguages: '', frameworks: '', databases: '', cloudDevops: '', tools: '', softSkills: '' },
  certifications: [],
  languages: [],
  hobbies: '',
  references: [],
  availableUponRequest: false,
};

export const ResumeScreen = () => {
  const resumeRef = useRef<HTMLDivElement>(null);
  
  const [data, setData] = useState<ResumeData>(defaultResumeData);
  const [activeTemplate, setActiveTemplate] = useState<number>(1);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    personalInfo: true,
  });
  
  const [versions, setVersions] = useState<Array<{ id: string; name: string; data: ResumeData; timestamp: number }>>([]);
  const [showVersions, setShowVersions] = useState(false);
  const [dayoneProjects, setDayoneProjects] = useState<any[]>([]);

  useEffect(() => {
    // Load local storage
    const saved = localStorage.getItem('dayone-resume-data');
    if (saved) {
      try { setData(JSON.parse(saved)); } catch (e) {}
    }
    const savedVersions = localStorage.getItem('dayone-resume-versions');
    if (savedVersions) {
      try { setVersions(JSON.parse(savedVersions)); } catch (e) {}
    }

    projectsApi.getAll().then(res => setDayoneProjects(res)).catch(() => {});
  }, []);

  // Auto save
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem('dayone-resume-data', JSON.stringify(data));
    }, 1000);
    return () => clearTimeout(timer);
  }, [data]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const updateNestedData = (section: keyof ResumeData, id: string, field: string, value: any) => {
    setData(prev => {
      const arr = prev[section] as Array<any>;
      return {
        ...prev,
        [section]: arr.map(item => item.id === id ? { ...item, [field]: value } : item)
      };
    });
  };

  const addNestedItem = (section: keyof ResumeData, emptyItem: any) => {
    setData(prev => ({
      ...prev,
      [section]: [...(prev[section] as Array<any>), { id: Date.now().toString(), ...emptyItem }]
    }));
  };

  const removeNestedItem = (section: keyof ResumeData, id: string) => {
    setData(prev => ({
      ...prev,
      [section]: (prev[section] as Array<any>).filter(item => item.id !== id)
    }));
  };

  const saveVersion = () => {
    const name = prompt("Enter a name for this version:", "V" + (versions.length + 1));
    if (name) {
      const newVersion = { id: Date.now().toString(), name, data, timestamp: Date.now() };
      const newVersions = [newVersion, ...versions];
      setVersions(newVersions);
      localStorage.setItem('dayone-resume-versions', JSON.stringify(newVersions));
      alert("Version saved!");
    }
  };

  const restoreVersion = (v: any) => {
    if (confirm("Restore this version? Unsaved changes will be lost.")) {
      setData(v.data);
      setShowVersions(false);
    }
  };

  const handleDownloadPDF = () => {
    const printContents = resumeRef.current?.innerHTML || '';
    const printWindow = window.open('', '_blank', 'width=900,height=1200');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${data.personalInfo.fullName} — Resume</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { background: #fff; padding: 40px; }
            /* Tailwind classes simulation for print */
            .text-center { text-align: center; }
            .font-bold { font-weight: bold; }
            .font-black { font-weight: 900; }
            .text-xs { font-size: 0.75rem; }
            .text-sm { font-size: 0.875rem; }
            .text-lg { font-size: 1.125rem; }
            .text-xl { font-size: 1.25rem; }
            .text-2xl { font-size: 1.5rem; }
            .text-3xl { font-size: 1.875rem; }
            .mb-1 { margin-bottom: 0.25rem; }
            .mb-2 { margin-bottom: 0.5rem; }
            .mb-3 { margin-bottom: 0.75rem; }
            .mb-4 { margin-bottom: 1rem; }
            .mb-6 { margin-bottom: 1.5rem; }
            .mt-2 { margin-top: 0.5rem; }
            .mt-4 { margin-top: 1rem; }
            .pb-1 { padding-bottom: 0.25rem; }
            .pb-2 { padding-bottom: 0.5rem; }
            .border-b { border-bottom-width: 1px; border-bottom-style: solid; }
            .border-gray-300 { border-color: #d1d5db; }
            .border-gray-800 { border-color: #1f2937; }
            .uppercase { text-transform: uppercase; }
            .tracking-wider { letter-spacing: 0.05em; }
            .tracking-widest { letter-spacing: 0.1em; }
            .flex { display: flex; }
            .flex-wrap { flex-wrap: wrap; }
            .justify-center { justify-content: center; }
            .justify-between { justify-content: space-between; }
            .items-center { align-items: center; }
            .items-baseline { align-items: baseline; }
            .gap-1 { gap: 0.25rem; }
            .gap-2 { gap: 0.5rem; }
            .gap-3 { gap: 0.75rem; }
            .text-gray-500 { color: #6b7280; }
            .text-gray-600 { color: #4b5563; }
            .text-gray-700 { color: #374151; }
            .text-gray-900 { color: #111827; }
            .text-blue-600 { color: #2563eb; }
            .text-blue-800 { color: #1e40af; }
            .bg-gray-100 { background-color: #f3f4f6; }
            .bg-blue-600 { background-color: #2563eb; }
            .text-white { color: #ffffff; }
            .px-2 { padding-left: 0.5rem; padding-right: 0.5rem; }
            .py-0\.5 { padding-top: 0.125rem; padding-bottom: 0.125rem; }
            .rounded { border-radius: 0.25rem; }
            .w-full { width: 100%; }
            .grid { display: grid; }
            .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            ul { list-style-position: inside; }
            li { margin-bottom: 0.25rem; }
            
            /* Template Specific Overrides */
            .template-1 { font-family: 'Times New Roman', Times, serif; font-size: 11pt; line-height: 1.4; color: #000; }
            .template-2 { font-family: 'Arial', sans-serif; font-size: 10pt; line-height: 1.5; color: #333; }
            .template-3 { font-family: 'Georgia', serif; font-size: 10.5pt; line-height: 1.45; color: #222; }
            .template-4 { font-family: 'Helvetica', sans-serif; font-size: 10pt; line-height: 1.5; color: #111; }
            
            /* Fix Tailwind Flex in Print */
            .flex-col { flex-direction: column; }
          </style>
        </head>
        <body class="template-${activeTemplate}">${printContents}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 400);
  };

  const inputCls = "w-full p-2.5 rounded-lg bg-surface-container border border-outline-variant/10 text-on-surface focus:outline-none focus:border-primary text-xs";
  const labelCls = "block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1";

  // --- RENDER TEMPLATES ---
  
  const renderTemplate1 = () => (
    <div className="template-1">
      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold uppercase mb-1">{data.personalInfo.fullName}</h1>
        <div className="flex flex-wrap justify-center gap-2 text-sm text-gray-800">
          {data.personalInfo.email && <span>{data.personalInfo.email}</span>}
          {data.personalInfo.phone && <span>| {data.personalInfo.phone}</span>}
          {data.personalInfo.location && <span>| {data.personalInfo.location}</span>}
        </div>
        <div className="flex flex-wrap justify-center gap-2 text-sm text-blue-800 mt-1">
          {data.personalInfo.linkedin && <span>{data.personalInfo.linkedin}</span>}
          {data.personalInfo.github && <span>| {data.personalInfo.github}</span>}
          {data.personalInfo.website && <span>| {data.personalInfo.website}</span>}
        </div>
      </div>

      {data.summary && (
        <div className="mb-4">
          <h2 className="text-sm font-bold uppercase border-b border-gray-800 pb-1 mb-2">Professional Summary</h2>
          <p className="text-sm">{data.summary}</p>
        </div>
      )}

      {data.experience.length > 0 && (
        <div className="mb-4">
          <h2 className="text-sm font-bold uppercase border-b border-gray-800 pb-1 mb-2">Experience</h2>
          {data.experience.map(exp => (
            <div key={exp.id} className="mb-3">
              <div className="flex justify-between font-bold text-sm">
                <span>{exp.position} — {exp.company}</span>
                <span>{exp.startDate} - {exp.endDate}</span>
              </div>
              {exp.location && <div className="text-sm italic">{exp.location}</div>}
              <div className="text-sm mt-1 whitespace-pre-line ml-4">• {exp.description.replace(/\n/g, '\n• ')}</div>
            </div>
          ))}
        </div>
      )}

      {data.education.length > 0 && (
        <div className="mb-4">
          <h2 className="text-sm font-bold uppercase border-b border-gray-800 pb-1 mb-2">Education</h2>
          {data.education.map(edu => (
            <div key={edu.id} className="mb-2">
              <div className="flex justify-between font-bold text-sm">
                <span>{edu.degree} — {edu.institution}</span>
                <span>{edu.startYear} - {edu.endYear}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>{edu.location}</span>
                {edu.gpa && <span>GPA: {edu.gpa}</span>}
              </div>
              {edu.coursework && <div className="text-sm mt-1"><b>Relevant Coursework:</b> {edu.coursework}</div>}
            </div>
          ))}
        </div>
      )}

      {data.projects.length > 0 && (
        <div className="mb-4">
          <h2 className="text-sm font-bold uppercase border-b border-gray-800 pb-1 mb-2">Projects</h2>
          {data.projects.map(proj => (
            <div key={proj.id} className="mb-2 text-sm">
              <div className="flex justify-between font-bold">
                <span>{proj.title} {proj.role && `| ${proj.role}`}</span>
                <span>
                  {proj.githubUrl && <span className="text-blue-800 font-normal ml-2">{proj.githubUrl}</span>}
                  {proj.liveUrl && <span className="text-blue-800 font-normal ml-2">{proj.liveUrl}</span>}
                </span>
              </div>
              {proj.technologies && <div className="italic mb-1">Technologies: {proj.technologies}</div>}
              <div className="whitespace-pre-line ml-4">• {proj.description.replace(/\n/g, '\n• ')}</div>
            </div>
          ))}
        </div>
      )}

      <div className="mb-4">
        <h2 className="text-sm font-bold uppercase border-b border-gray-800 pb-1 mb-2">Skills</h2>
        <div className="text-sm">
          {data.skills.programmingLanguages && <div><b>Languages:</b> {data.skills.programmingLanguages}</div>}
          {data.skills.frameworks && <div><b>Frameworks:</b> {data.skills.frameworks}</div>}
          {data.skills.databases && <div><b>Databases:</b> {data.skills.databases}</div>}
          {data.skills.tools && <div><b>Tools:</b> {data.skills.tools}</div>}
        </div>
      </div>
    </div>
  );

  const renderTemplate2 = () => (
    <div className="template-2">
      <div className="bg-blue-600 text-white p-6 -mx-10 -mt-10 mb-6 rounded-b-xl">
        <h1 className="text-3xl font-black uppercase tracking-wider mb-2">{data.personalInfo.fullName}</h1>
        <div className="flex flex-wrap gap-4 text-sm opacity-90">
          {data.personalInfo.email && <span>{data.personalInfo.email}</span>}
          {data.personalInfo.phone && <span>{data.personalInfo.phone}</span>}
          {data.personalInfo.location && <span>{data.personalInfo.location}</span>}
        </div>
        <div className="flex flex-wrap gap-4 text-sm mt-2 text-blue-100 font-bold">
          {data.personalInfo.linkedin && <span>{data.personalInfo.linkedin}</span>}
          {data.personalInfo.website && <span>{data.personalInfo.website}</span>}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-8">
        <div className="col-span-2 space-y-6">
          {data.summary && (
            <div>
              <h2 className="text-lg font-black uppercase text-blue-600 border-b-2 border-gray-200 pb-1 mb-3">Profile</h2>
              <p className="text-sm text-gray-700 leading-relaxed">{data.summary}</p>
            </div>
          )}

          {data.experience.length > 0 && (
            <div>
              <h2 className="text-lg font-black uppercase text-blue-600 border-b-2 border-gray-200 pb-1 mb-3">Experience</h2>
              <div className="space-y-4">
                {data.experience.map(exp => (
                  <div key={exp.id}>
                    <div className="flex justify-between items-baseline mb-1">
                      <h3 className="font-bold text-gray-900">{exp.position}</h3>
                      <span className="text-xs font-bold text-gray-500 uppercase">{exp.startDate} - {exp.endDate}</span>
                    </div>
                    <div className="text-sm text-blue-600 font-medium mb-2">{exp.company}</div>
                    <p className="text-sm text-gray-700 whitespace-pre-line ml-4">• {exp.description.replace(/\n/g, '\n• ')}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {data.projects.length > 0 && (
            <div>
              <h2 className="text-lg font-black uppercase text-blue-600 border-b-2 border-gray-200 pb-1 mb-3">Projects</h2>
              <div className="space-y-4">
                {data.projects.map(proj => (
                  <div key={proj.id}>
                    <div className="flex justify-between items-baseline mb-1">
                      <h3 className="font-bold text-gray-900">{proj.title}</h3>
                    </div>
                    <div className="text-xs text-gray-500 font-medium mb-1">{proj.technologies}</div>
                    <p className="text-sm text-gray-700 whitespace-pre-line ml-4">• {proj.description.replace(/\n/g, '\n• ')}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {data.education.length > 0 && (
            <div>
              <h2 className="text-lg font-black uppercase text-blue-600 border-b-2 border-gray-200 pb-1 mb-3">Education</h2>
              <div className="space-y-3">
                {data.education.map(edu => (
                  <div key={edu.id}>
                    <h3 className="font-bold text-gray-900 text-sm">{edu.degree}</h3>
                    <div className="text-sm text-gray-600">{edu.institution}</div>
                    <div className="text-xs text-gray-500">{edu.startYear} - {edu.endYear}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h2 className="text-lg font-black uppercase text-blue-600 border-b-2 border-gray-200 pb-1 mb-3">Skills</h2>
            <div className="space-y-3 text-sm">
              {data.skills.programmingLanguages && (
                <div>
                  <div className="font-bold text-gray-900 mb-1">Languages</div>
                  <div className="text-gray-700">{data.skills.programmingLanguages}</div>
                </div>
              )}
              {data.skills.frameworks && (
                <div>
                  <div className="font-bold text-gray-900 mb-1">Frameworks</div>
                  <div className="text-gray-700">{data.skills.frameworks}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-[1400px] mx-auto pb-16 h-[calc(100vh-80px)] overflow-hidden flex flex-col">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant/10 pb-4 shrink-0">
        <div className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">Document Builder</span>
          <h2 className="font-headline font-extrabold text-3xl tracking-tight text-on-surface">Resume Builder</h2>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <button onClick={() => setShowVersions(!showVersions)} className="px-4 py-2 rounded-xl bg-surface-container border border-outline-variant/20 text-xs font-bold flex items-center gap-2 hover:bg-surface-container-high transition-colors">
              <History size={14} /> Versions
            </button>
            {showVersions && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-surface-container-highest border border-outline-variant/20 rounded-xl shadow-xl z-50 p-2">
                <button onClick={saveVersion} className="w-full text-left px-3 py-2 text-xs font-bold text-primary hover:bg-surface-container rounded-lg flex items-center gap-2 mb-2">
                  <Save size={14} /> Save Current as Version
                </button>
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {versions.map(v => (
                    <button key={v.id} onClick={() => restoreVersion(v)} className="w-full text-left px-3 py-2 text-xs hover:bg-surface-container rounded-lg border border-transparent hover:border-outline-variant/20">
                      <div className="font-bold">{v.name}</div>
                      <div className="text-[10px] text-on-surface-variant">{new Date(v.timestamp).toLocaleString()}</div>
                    </button>
                  ))}
                  {versions.length === 0 && <div className="p-3 text-xs text-center text-on-surface-variant">No saved versions</div>}
                </div>
              </div>
            )}
          </div>
          <button onClick={handleDownloadPDF} className="px-5 py-2 rounded-xl bg-primary text-white text-xs font-bold flex items-center gap-2 hover:bg-primary-container shadow-lg">
            <Download size={14} /> Export PDF
          </button>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex-1 flex gap-6 overflow-hidden min-h-0">
        
        {/* Left Form Panel */}
        <div className="w-[40%] flex flex-col bg-surface-container-low rounded-3xl border border-outline-variant/10 overflow-hidden shadow-lg">
          <div className="p-4 border-b border-outline-variant/10 bg-surface-container font-headline font-bold text-sm flex items-center gap-2 shrink-0">
            <FileDigit className="text-primary" size={18} /> Content Editor
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            
            {/* Section: Personal Info */}
            <div className="bg-surface rounded-xl border border-outline-variant/10 overflow-hidden">
              <button onClick={() => toggleSection('personalInfo')} className="w-full p-4 flex justify-between items-center bg-surface-container/50 hover:bg-surface-container transition-colors">
                <span className="font-bold text-sm flex items-center gap-2"><User size={16} className="text-primary" /> Personal Information</span>
                {expandedSections.personalInfo ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {expandedSections.personalInfo && (
                <div className="p-4 pt-0 grid grid-cols-2 gap-3">
                  <div className="col-span-2"><label className={labelCls}>Full Name</label><input value={data.personalInfo.fullName} onChange={e => setData({...data, personalInfo: {...data.personalInfo, fullName: e.target.value}})} className={inputCls} /></div>
                  <div><label className={labelCls}>Email</label><input value={data.personalInfo.email} onChange={e => setData({...data, personalInfo: {...data.personalInfo, email: e.target.value}})} className={inputCls} /></div>
                  <div><label className={labelCls}>Phone</label><input value={data.personalInfo.phone} onChange={e => setData({...data, personalInfo: {...data.personalInfo, phone: e.target.value}})} className={inputCls} /></div>
                  <div><label className={labelCls}>Location</label><input value={data.personalInfo.location} onChange={e => setData({...data, personalInfo: {...data.personalInfo, location: e.target.value}})} className={inputCls} /></div>
                  <div><label className={labelCls}>LinkedIn</label><input value={data.personalInfo.linkedin} onChange={e => setData({...data, personalInfo: {...data.personalInfo, linkedin: e.target.value}})} className={inputCls} /></div>
                  <div><label className={labelCls}>GitHub</label><input value={data.personalInfo.github} onChange={e => setData({...data, personalInfo: {...data.personalInfo, github: e.target.value}})} className={inputCls} /></div>
                  <div><label className={labelCls}>Website</label><input value={data.personalInfo.website} onChange={e => setData({...data, personalInfo: {...data.personalInfo, website: e.target.value}})} className={inputCls} /></div>
                </div>
              )}
            </div>

            {/* Section: Summary */}
            <div className="bg-surface rounded-xl border border-outline-variant/10 overflow-hidden">
              <button onClick={() => toggleSection('summary')} className="w-full p-4 flex justify-between items-center bg-surface-container/50 hover:bg-surface-container transition-colors">
                <span className="font-bold text-sm flex items-center gap-2"><FileText size={16} className="text-primary" /> Professional Summary</span>
                {expandedSections.summary ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {expandedSections.summary && (
                <div className="p-4 pt-0">
                  <textarea value={data.summary} onChange={e => setData({...data, summary: e.target.value})} className={`${inputCls} h-24 resize-none`} placeholder="Brief overview of your experience and goals..." />
                </div>
              )}
            </div>

            {/* Section: Experience */}
            <div className="bg-surface rounded-xl border border-outline-variant/10 overflow-hidden">
              <div className="w-full p-4 flex justify-between items-center bg-surface-container/50">
                <button onClick={() => toggleSection('experience')} className="flex-1 flex items-center gap-2 font-bold text-sm hover:text-primary transition-colors">
                  <Briefcase size={16} className="text-primary" /> Work Experience
                </button>
                <div className="flex gap-2">
                  <button onClick={() => addNestedItem('experience', { company: '', position: '', location: '', startDate: '', endDate: '', description: '' })} className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20"><Plus size={14} /></button>
                  <button onClick={() => toggleSection('experience')}>{expandedSections.experience ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button>
                </div>
              </div>
              {expandedSections.experience && (
                <div className="p-4 pt-0 space-y-4">
                  {data.experience.map(exp => (
                    <div key={exp.id} className="p-3 bg-surface-container-low rounded-lg border border-outline-variant/10 relative space-y-3">
                      <button onClick={() => removeNestedItem('experience', exp.id)} className="absolute top-3 right-3 text-on-surface-variant hover:text-error"><Trash2 size={14} /></button>
                      <div className="grid grid-cols-2 gap-3 mr-6">
                        <div><label className={labelCls}>Company</label><input value={exp.company} onChange={e => updateNestedData('experience', exp.id, 'company', e.target.value)} className={inputCls} /></div>
                        <div><label className={labelCls}>Position</label><input value={exp.position} onChange={e => updateNestedData('experience', exp.id, 'position', e.target.value)} className={inputCls} /></div>
                        <div><label className={labelCls}>Dates (e.g. Jan 2023 - Present)</label><input value={exp.startDate} onChange={e => updateNestedData('experience', exp.id, 'startDate', e.target.value)} className={inputCls} /></div>
                      </div>
                      <div>
                        <label className={labelCls}>Description (Bullet points)</label>
                        <textarea value={exp.description} onChange={e => updateNestedData('experience', exp.id, 'description', e.target.value)} className={`${inputCls} h-20 resize-none`} placeholder="Developed features...&#10;Improved performance..." />
                      </div>
                    </div>
                  ))}
                  {data.experience.length === 0 && <p className="text-xs text-center text-on-surface-variant py-2">No experience added yet.</p>}
                </div>
              )}
            </div>

            {/* Section: Education */}
            <div className="bg-surface rounded-xl border border-outline-variant/10 overflow-hidden">
              <div className="w-full p-4 flex justify-between items-center bg-surface-container/50">
                <button onClick={() => toggleSection('education')} className="flex-1 flex items-center gap-2 font-bold text-sm hover:text-primary transition-colors">
                  <GraduationCap size={16} className="text-primary" /> Education
                </button>
                <div className="flex gap-2">
                  <button onClick={() => addNestedItem('education', { degree: '', institution: '', location: '', startYear: '', endYear: '', gpa: '', coursework: '' })} className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20"><Plus size={14} /></button>
                  <button onClick={() => toggleSection('education')}>{expandedSections.education ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button>
                </div>
              </div>
              {expandedSections.education && (
                <div className="p-4 pt-0 space-y-4">
                  {data.education.map(edu => (
                    <div key={edu.id} className="p-3 bg-surface-container-low rounded-lg border border-outline-variant/10 relative space-y-3">
                      <button onClick={() => removeNestedItem('education', edu.id)} className="absolute top-3 right-3 text-on-surface-variant hover:text-error"><Trash2 size={14} /></button>
                      <div className="grid grid-cols-2 gap-3 mr-6">
                        <div><label className={labelCls}>Degree</label><input value={edu.degree} onChange={e => updateNestedData('education', edu.id, 'degree', e.target.value)} className={inputCls} /></div>
                        <div><label className={labelCls}>Institution</label><input value={edu.institution} onChange={e => updateNestedData('education', edu.id, 'institution', e.target.value)} className={inputCls} /></div>
                        <div><label className={labelCls}>Years</label><input value={edu.startYear} onChange={e => updateNestedData('education', edu.id, 'startYear', e.target.value)} className={inputCls} /></div>
                        <div><label className={labelCls}>GPA</label><input value={edu.gpa} onChange={e => updateNestedData('education', edu.id, 'gpa', e.target.value)} className={inputCls} /></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section: Projects */}
            <div className="bg-surface rounded-xl border border-outline-variant/10 overflow-hidden">
              <div className="w-full p-4 flex justify-between items-center bg-surface-container/50">
                <button onClick={() => toggleSection('projects')} className="flex-1 flex items-center gap-2 font-bold text-sm hover:text-primary transition-colors">
                  <Code size={16} className="text-primary" /> Projects
                </button>
                <div className="flex gap-2">
                  <button onClick={() => addNestedItem('projects', { title: '', description: '', technologies: '', githubUrl: '', liveUrl: '', role: '', achievements: '' })} className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20"><Plus size={14} /></button>
                  <button onClick={() => toggleSection('projects')}>{expandedSections.projects ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button>
                </div>
              </div>
              {expandedSections.projects && (
                <div className="p-4 pt-0 space-y-4">
                  {dayoneProjects.length > 0 && (
                    <div className="p-3 bg-primary/5 rounded-lg border border-primary/20 mb-4">
                      <p className="text-[10px] font-bold uppercase text-primary mb-2">Import from DayOne</p>
                      <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">
                        {dayoneProjects.map(dp => (
                          <button key={dp.id} onClick={() => addNestedItem('projects', { title: dp.title, description: dp.description, technologies: 'React, Node', githubUrl: '', liveUrl: '', role: 'Developer', achievements: '' })} className="shrink-0 px-3 py-1.5 bg-surface text-xs rounded border border-outline-variant/10 hover:border-primary">
                            + {dp.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {data.projects.map(proj => (
                    <div key={proj.id} className="p-3 bg-surface-container-low rounded-lg border border-outline-variant/10 relative space-y-3">
                      <button onClick={() => removeNestedItem('projects', proj.id)} className="absolute top-3 right-3 text-on-surface-variant hover:text-error"><Trash2 size={14} /></button>
                      <div className="grid grid-cols-2 gap-3 mr-6">
                        <div><label className={labelCls}>Title</label><input value={proj.title} onChange={e => updateNestedData('projects', proj.id, 'title', e.target.value)} className={inputCls} /></div>
                        <div><label className={labelCls}>Technologies</label><input value={proj.technologies} onChange={e => updateNestedData('projects', proj.id, 'technologies', e.target.value)} className={inputCls} /></div>
                      </div>
                      <div>
                        <label className={labelCls}>Description (Bullet points)</label>
                        <textarea value={proj.description} onChange={e => updateNestedData('projects', proj.id, 'description', e.target.value)} className={`${inputCls} h-16 resize-none`} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section: Skills */}
            <div className="bg-surface rounded-xl border border-outline-variant/10 overflow-hidden">
              <button onClick={() => toggleSection('skills')} className="w-full p-4 flex justify-between items-center bg-surface-container/50 hover:bg-surface-container transition-colors">
                <span className="font-bold text-sm flex items-center gap-2"><ShieldCheck size={16} className="text-primary" /> Skills</span>
                {expandedSections.skills ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {expandedSections.skills && (
                <div className="p-4 pt-0 grid grid-cols-1 gap-3">
                  <div><label className={labelCls}>Programming Languages</label><input value={data.skills.programmingLanguages} onChange={e => setData({...data, skills: {...data.skills, programmingLanguages: e.target.value}})} className={inputCls} placeholder="e.g. JavaScript, Python, C++" /></div>
                  <div><label className={labelCls}>Frameworks & Libraries</label><input value={data.skills.frameworks} onChange={e => setData({...data, skills: {...data.skills, frameworks: e.target.value}})} className={inputCls} placeholder="e.g. React, Express, Tailwind" /></div>
                  <div><label className={labelCls}>Databases</label><input value={data.skills.databases} onChange={e => setData({...data, skills: {...data.skills, databases: e.target.value}})} className={inputCls} /></div>
                  <div><label className={labelCls}>Tools & Cloud</label><input value={data.skills.tools} onChange={e => setData({...data, skills: {...data.skills, tools: e.target.value}})} className={inputCls} placeholder="e.g. Git, Docker, AWS" /></div>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Right Preview Panel */}
        <div className="w-[60%] flex flex-col bg-surface-container-high rounded-3xl border border-outline-variant/10 overflow-hidden shadow-inner">
          <div className="p-4 border-b border-outline-variant/10 bg-surface-container flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest flex items-center gap-1.5"><LayoutTemplate size={14}/> Templates</span>
              <div className="flex gap-2">
                {[1, 2].map(num => (
                  <button 
                    key={num} 
                    onClick={() => setActiveTemplate(num)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${activeTemplate === num ? 'bg-primary text-white' : 'bg-surface border border-outline-variant/20 hover:bg-surface-container-highest'}`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-8 flex justify-center custom-scrollbar bg-gray-500/10">
            {/* The A4 Paper representation */}
            <div 
              ref={resumeRef} 
              className="bg-white text-black w-full max-w-[850px] shadow-2xl rounded-sm shrink-0 overflow-hidden" 
              style={{ minHeight: '1100px' }}
            >
              {activeTemplate === 1 ? renderTemplate1() : renderTemplate2()}
            </div>
          </div>
        </div>

      </div>
    </motion.div>
  );
};
