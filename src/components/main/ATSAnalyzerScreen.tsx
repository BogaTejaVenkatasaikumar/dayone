import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Upload, FileText, CheckCircle2, AlertTriangle, ShieldCheck, Sparkles, PieChart, RefreshCw, X } from 'lucide-react';

export const ATSAnalyzerScreen = () => {
  const [jobDescription, setJobDescription] = useState('');
  const [analyzingAts, setAnalyzingAts] = useState(false);
  const [atsResult, setAtsResult] = useState<any>(null);

  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploadedResumeData, setUploadedResumeData] = useState<any>(null);
  const [parsingFile, setParsingFile] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Dynamically load pdf.js from CDN
  const loadPdfJs = (): Promise<any> => {
    return new Promise((resolve, reject) => {
      if ((window as any).pdfjsLib) {
        resolve((window as any).pdfjsLib);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js';
      script.onload = () => {
        const pdfjsLib = (window as any).pdfjsLib;
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
        resolve(pdfjsLib);
      };
      script.onerror = () => reject(new Error('Failed to load PDF parser library.'));
      document.head.appendChild(script);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setUploadError('');
    setParsingFile(true);
    setUploadedResumeData(null);
    setAtsResult(null);

    try {
      if (file.type === 'application/pdf') {
        const pdfjsLib = await loadPdfJs();
        const reader = new FileReader();

        reader.onload = async (event) => {
          try {
            const typedarray = new Uint8Array(event.target?.result as ArrayBuffer);
            const pdf = await pdfjsLib.getDocument(typedarray).promise;
            let text = '';

            for (let i = 1; i <= pdf.numPages; i++) {
              const page = await pdf.getPage(i);
              const content = await page.getTextContent();
              text += content.items.map((item: any) => item.str).join(' ') + '\n';
            }

            if (!text.trim()) {
              throw new Error('PDF appears to be empty or is a scanned image. Please upload a text-based PDF.');
            }

            setUploadedResumeData(parseResumeText(text));
          } catch (err: any) {
            setUploadError(err.message || 'Error parsing PDF.');
            setUploadedFileName('');
          } finally {
            setParsingFile(false);
          }
        };

        reader.readAsArrayBuffer(file);
      } else if (file.type === 'text/plain') {
        const reader = new FileReader();
        reader.onload = (event) => {
          const text = (event.target?.result as string) || '';
          setUploadedResumeData(parseResumeText(text));
          setParsingFile(false);
        };
        reader.readAsText(file);
      } else {
        throw new Error('Unsupported format. Please upload a PDF (.pdf) or plain text (.txt) file.');
      }
    } catch (err: any) {
      setUploadError(err.message || 'Failed to read file.');
      setUploadedFileName('');
      setParsingFile(false);
    }
  };

  const parseResumeText = (text: string) => {
    const textLower = text.toLowerCase();

    const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const phoneMatch = text.match(/(\+?\d{1,3}[-.\\s]?)?\(?\d{3}\)?[-.\\s]?\d{3}[-.\\s]?\d{4}/);

    const skillsList = [
      'javascript', 'typescript', 'react', 'python', 'java', 'sql', 'node.js',
      'aws', 'docker', 'kubernetes', 'html', 'css', 'git', 'ci/cd', 'c++',
      'go', 'rust', 'angular', 'vue', 'mongodb', 'postgresql', 'express',
      'graphql', 'redis', 'terraform', 'jenkins', 'linux', 'flutter', 'swift',
    ];
    const matchedSkills = skillsList.filter(s => textLower.includes(s));

    return {
      personalInfo: {
        email: emailMatch ? emailMatch[0] : '',
        phone: phoneMatch ? phoneMatch[0] : '',
      },
      skills: { technical: matchedSkills.join(', ') },
      experience: textLower.includes('experience') || textLower.includes('work history') ? [{ description: 'Parsed' }] : [],
      projects: textLower.includes('projects') || textLower.includes('github') ? [{ title: 'Parsed' }] : [],
      education: textLower.includes('education') || textLower.includes('university') || textLower.includes('bachelor') ? [{ institution: 'Parsed' }] : [],
      rawText: text,
    };
  };

  const analyzeATS = () => {
    if (!jobDescription.trim() || !uploadedResumeData) return;

    setAnalyzingAts(true);
    setAtsResult(null);

    setTimeout(() => {
      const jdLower = jobDescription.toLowerCase();

      const keywordPatterns = [
        'react', 'typescript', 'javascript', 'python', 'java', 'sql', 'node.js',
        'aws', 'docker', 'agile', 'communication', 'leadership', 'kubernetes',
        'html', 'css', 'git', 'ci/cd', 'frontend', 'backend', 'full stack',
        'testing', 'rest api', 'nosql', 'mongodb', 'postgresql', 'devops',
        'graphql', 'redis', 'microservices', 'linux', 'terraform',
      ];

      const requiredKeywords = keywordPatterns.filter(k => jdLower.includes(k));
      if (requiredKeywords.length === 0) {
        requiredKeywords.push('communication', 'teamwork', 'problem solving', 'leadership');
      }

      const resumeContent = uploadedResumeData.rawText.toLowerCase();

      const matched = requiredKeywords.filter(k => resumeContent.includes(k));
      const missing = requiredKeywords.filter(k => !resumeContent.includes(k));

      const keywordScore = requiredKeywords.length > 0 ? (matched.length / requiredKeywords.length) * 100 : 100;
      const skillsSection = uploadedResumeData.skills?.technical || '';
      const skillsScore = skillsSection.length > 10 ? 100 : 40;
      const expScore = uploadedResumeData.experience?.length > 0 ? 100 : 0;
      const projScore = uploadedResumeData.projects?.length > 0 ? 100 : 0;
      const eduScore = uploadedResumeData.education?.length > 0 ? 100 : 0;
      const formatScore = (uploadedResumeData.personalInfo?.email && uploadedResumeData.personalInfo?.phone) ? 100 : 50;

      const overallScore = Math.round(
        (keywordScore * 0.4) +
        (expScore * 0.2) +
        (skillsScore * 0.15) +
        (projScore * 0.1) +
        (formatScore * 0.1) +
        (eduScore * 0.05)
      );

      const suggestions = [
        matched.length < requiredKeywords.length
          ? `Add missing keywords from the job description: ${missing.slice(0, 3).join(', ').toUpperCase()}.`
          : 'Great job including the essential keywords!',
        expScore < 100 ? 'Add or expand your work experience section with bullet points and quantifiable metrics.' : 'Your experience section looks solid.',
        formatScore < 100 ? 'Ensure your contact information (email, phone) is prominently placed.' : 'Contact information is well-formatted.',
        projScore < 100 ? 'Add a Projects section highlighting relevant work with GitHub links.' : 'Projects section adds strong value.',
      ].filter(Boolean);

      setAtsResult({
        score: Math.min(overallScore, 100),
        matchedKeywords: matched.map(m => m.toUpperCase()),
        missingKeywords: missing.map(m => m.toUpperCase()),
        suggestions,
        breakdown: {
          keywords: Math.round(keywordScore),
          skills: skillsScore,
          experience: expScore,
          formatting: formatScore,
          projects: projScore,
          education: eduScore,
        },
      });
      setAnalyzingAts(false);
    }, 1500);
  };

  const scoreColor = (score: number) => {
    if (score >= 75) return 'text-secondary';
    if (score >= 50) return 'text-tertiary';
    return 'text-error';
  };

  const scoreBgColor = (score: number) => {
    if (score >= 75) return 'bg-secondary';
    if (score >= 50) return 'bg-tertiary';
    return 'bg-error';
  };

  const clearFile = () => {
    setUploadedFileName('');
    setUploadedResumeData(null);
    setUploadError('');
    setAtsResult(null);
  };

  const isReadyToAnalyze = jobDescription.trim() && uploadedResumeData;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }} className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant/10 pb-6">
        <div className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">Resume Optimization</span>
          <h2 className="font-headline font-extrabold text-3xl sm:text-4xl tracking-tight text-on-surface">ATS Analyzer</h2>
          <p className="text-on-surface-variant text-sm">Upload your PDF resume and paste a job description to get your ATS compatibility score.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

        {/* Left: Upload + JD */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-surface-container-low p-6 rounded-3xl border border-outline-variant/10 space-y-5 shadow-lg">

            {/* PDF Upload Zone */}
            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                Upload Resume (PDF or TXT)
              </label>

              {uploadedFileName && uploadedResumeData ? (
                <div className="flex items-center justify-between p-4 bg-secondary/10 border border-secondary/20 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 size={20} className="text-secondary shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-on-surface">{uploadedFileName}</p>
                      <p className="text-[10px] text-secondary mt-0.5">Parsed & ready to analyze</p>
                    </div>
                  </div>
                  <button onClick={clearFile} className="p-1.5 rounded-lg hover:bg-error/10 text-on-surface-variant hover:text-error transition-colors">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-outline-variant/30 hover:border-primary/50 rounded-2xl p-8 text-center cursor-pointer transition-all bg-surface-container relative group">
                  <input
                    type="file"
                    accept=".pdf,.txt"
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mx-auto group-hover:scale-110 transition-transform">
                      {parsingFile ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                    </div>
                    {parsingFile ? (
                      <div>
                        <p className="text-sm font-bold text-on-surface">Parsing resume...</p>
                        <p className="text-xs text-on-surface-variant mt-1">Extracting text from your PDF</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm font-bold text-on-surface">Drop your resume here</p>
                        <p className="text-xs text-on-surface-variant mt-1">Supports PDF and plain text (.txt)</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {uploadError && (
                <div className="flex items-start gap-2 p-3 bg-error/10 border border-error/20 rounded-xl text-error text-xs">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  {uploadError}
                </div>
              )}
            </div>

            {/* Job Description */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant">Job Description</label>
              <textarea
                value={jobDescription}
                onChange={e => setJobDescription(e.target.value)}
                placeholder="Paste the target job description here..."
                className="w-full h-[280px] p-4 rounded-xl bg-surface-container-high border border-outline-variant/20 text-on-surface focus:outline-none focus:border-primary text-sm resize-none transition-all"
              />
            </div>

            <button
              onClick={analyzeATS}
              disabled={analyzingAts || !isReadyToAnalyze}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-primary to-primary-container text-white font-headline font-bold uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-40 disabled:hover:scale-100 disabled:cursor-not-allowed"
            >
              {analyzingAts ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <><Sparkles size={18} /> Analyze Resume</>
              )}
            </button>
          </div>
        </div>

        {/* Right: Results */}
        <div className="lg:col-span-3">
          {atsResult ? (
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="bg-surface-container-low p-6 rounded-3xl border border-outline-variant/10 space-y-6 shadow-lg">

              {/* Score banner */}
              <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 rounded-2xl bg-surface-container border border-outline-variant/10">
                <div className="space-y-1 text-center md:text-left">
                  <h4 className="font-headline font-extrabold text-2xl text-on-surface flex items-center justify-center md:justify-start gap-2">
                    <PieChart className="text-primary" /> Analysis Results
                  </h4>
                  <p className="text-sm text-on-surface-variant">Based on your uploaded resume.</p>
                </div>
                <div className="text-center shrink-0">
                  <div className={`text-6xl font-headline font-black ${scoreColor(atsResult.score)}`}>
                    {atsResult.score}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant block mt-1">/ 100 ATS Score</span>
                </div>
              </div>

              {/* Breakdown bars */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { label: 'Keywords', val: atsResult.breakdown.keywords },
                  { label: 'Skills', val: atsResult.breakdown.skills },
                  { label: 'Experience', val: atsResult.breakdown.experience },
                  { label: 'Formatting', val: atsResult.breakdown.formatting },
                  { label: 'Projects', val: atsResult.breakdown.projects },
                  { label: 'Education', val: atsResult.breakdown.education },
                ].map(({ label, val }) => (
                  <div key={label} className="bg-surface-container rounded-xl p-4 space-y-2 border border-outline-variant/5">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">{label}</span>
                      <span className={`text-xs font-bold ${scoreColor(val)}`}>{val}%</span>
                    </div>
                    <div className="h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                      <div className={`h-full ${scoreBgColor(val)} rounded-full transition-all duration-1000`} style={{ width: `${val}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Keyword match / missing */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-5 rounded-2xl bg-surface-container space-y-4 border border-outline-variant/10">
                  <h5 className="font-headline font-bold text-sm text-secondary flex items-center gap-2">
                    <ShieldCheck size={18} /> Matched Keywords ({atsResult.matchedKeywords.length})
                  </h5>
                  <div className="flex flex-wrap gap-2">
                    {atsResult.matchedKeywords.length > 0
                      ? atsResult.matchedKeywords.map((k: string) => (
                        <span key={k} className="px-3 py-1 rounded-lg bg-secondary/10 text-secondary text-xs font-bold border border-secondary/20">{k}</span>
                      ))
                      : <span className="text-xs text-on-surface-variant">No matching keywords found.</span>
                    }
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-surface-container space-y-4 border border-outline-variant/10">
                  <h5 className="font-headline font-bold text-sm text-error flex items-center gap-2">
                    <AlertTriangle size={18} /> Missing Keywords ({atsResult.missingKeywords.length})
                  </h5>
                  <div className="flex flex-wrap gap-2">
                    {atsResult.missingKeywords.length === 0
                      ? <span className="text-sm text-secondary font-semibold">✓ Outstanding keyword match!</span>
                      : atsResult.missingKeywords.map((k: string) => (
                        <span key={k} className="px-3 py-1 rounded-lg bg-error/10 text-error text-xs font-bold border border-error/20">{k}</span>
                      ))
                    }
                  </div>
                </div>
              </div>

              {/* Recommendations */}
              <div className="p-6 rounded-2xl bg-surface-container space-y-4 border border-outline-variant/10">
                <h5 className="font-headline font-bold text-sm text-primary flex items-center gap-2">
                  <Sparkles size={18} /> Recommendations
                </h5>
                <ul className="space-y-3">
                  {atsResult.suggestions.map((s: string, idx: number) => (
                    <li key={idx} className="text-sm text-on-surface-variant flex items-start gap-3 bg-surface-container-high/30 p-3 rounded-xl">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 text-primary text-xs font-bold shrink-0">{idx + 1}</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>

            </motion.div>
          ) : (
            <div className="h-full min-h-[500px] border-2 border-dashed border-outline-variant/20 rounded-3xl flex flex-col items-center justify-center text-center p-8 bg-surface-container-low/50">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
                <FileText size={32} />
              </div>
              <h3 className="font-headline font-extrabold text-xl text-on-surface mb-2">Ready to Analyze</h3>
              <p className="text-sm text-on-surface-variant max-w-xs">
                Upload your PDF resume and paste the job description to get your ATS compatibility score and actionable recommendations.
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
