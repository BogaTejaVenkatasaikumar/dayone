import React, { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, RotateCcw, Code2, AlertTriangle, CheckCircle2, Zap, Eye, TerminalSquare, BookOpen, ChevronDown, ChevronRight, XCircle, Info, LayoutTemplate } from 'lucide-react';
import { useAuthContext } from '../../context/AuthContext';
import { BASE_URL } from '../../api';

type Tab = 'html' | 'css' | 'js';
type OutputTab = 'preview' | 'console';

interface LogMessage {
  id: string;
  type: 'log' | 'warn' | 'error';
  message: string;
  timestamp: string;
}

interface Template {
  id: string;
  name: string;
  description: string;
  html: string;
  css: string;
  js: string;
}

const TEMPLATES: Template[] = [
  {
    id: 'html-starter',
    name: 'HTML Starter',
    description: 'Basic semantic HTML page with header, nav, main, footer',
    html: `<header>\n  <h1>My Website</h1>\n  <nav>\n    <a href="#">Home</a>\n    <a href="#">About</a>\n  </nav>\n</header>\n<main>\n  <section>\n    <h2>Welcome</h2>\n    <p>This is a basic HTML starter template.</p>\n  </section>\n</main>\n<footer>\n  <p>&copy; 2026 My Website</p>\n</footer>`,
    css: `body {\n  font-family: sans-serif;\n  line-height: 1.6;\n  margin: 0;\n  padding: 20px;\n}`,
    js: `// No JavaScript needed for this template\nconsole.log('HTML loaded');`
  },
  {
    id: 'css-flexbox',
    name: 'CSS Flexbox',
    description: 'HTML with a flexbox layout exercise',
    html: `<div class="container">\n  <div class="box box1">1</div>\n  <div class="box box2">2</div>\n  <div class="box box3">3</div>\n</div>`,
    css: `.container {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  background: #eee;\n  padding: 20px;\n  height: 200px;\n}\n\n.box {\n  width: 50px;\n  height: 50px;\n  color: white;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  font-weight: bold;\n}\n\n.box1 { background: #3b82f6; }\n.box2 { background: #10b981; }\n.box3 { background: #f59e0b; }`,
    js: `console.log('Flexbox ready');`
  },
  {
    id: 'js-dom',
    name: 'JavaScript DOM',
    description: 'HTML+JS for DOM manipulation',
    html: `<div id="app">\n  <h1 id="title">Hello World</h1>\n  <button id="btn">Click Me!</button>\n</div>`,
    css: `#app {\n  text-align: center;\n  margin-top: 50px;\n}\nbutton {\n  padding: 10px 20px;\n  font-size: 16px;\n  cursor: pointer;\n}`,
    js: `const btn = document.getElementById('btn');\nconst title = document.getElementById('title');\n\nbtn.addEventListener('click', () => {\n  title.style.color = '#3b82f6';\n  title.textContent = 'DOM Manipulated!';\n  console.log('Button clicked!');\n});`
  },
  {
    id: 'api-fetch',
    name: 'API Fetch',
    description: 'Fetch data from a public API',
    html: `<h2>Users List</h2>\n<ul id="user-list">Loading...</ul>`,
    css: `ul {\n  list-style: none;\n  padding: 0;\n}\nli {\n  padding: 10px;\n  border-bottom: 1px solid #ddd;\n}`,
    js: `async function fetchUsers() {\n  try {\n    const res = await fetch('https://jsonplaceholder.typicode.com/users');\n    const users = await res.json();\n    const list = document.getElementById('user-list');\n    list.innerHTML = '';\n    \n    users.slice(0, 5).forEach(user => {\n      const li = document.createElement('li');\n      li.textContent = user.name;\n      list.appendChild(li);\n    });\n    console.log('Users loaded successfully');\n  } catch (err) {\n    console.error('Fetch error:', err);\n  }\n}\n\nfetchUsers();`
  }
];

export default function LearningLabScreen() {
  const { getToken } = useAuthContext();
  
  const [activeTab, setActiveTab] = useState<Tab>('html');
  const [outputTab, setOutputTab] = useState<OutputTab>('preview');
  
  const [htmlCode, setHtmlCode] = useState(() => localStorage.getItem('dayone-lab-html') || TEMPLATES[0].html);
  const [cssCode, setCssCode] = useState(() => localStorage.getItem('dayone-lab-css') || TEMPLATES[0].css);
  const [jsCode, setJsCode] = useState(() => localStorage.getItem('dayone-lab-js') || TEMPLATES[0].js);
  
  const [isRunning, setIsRunning] = useState(false);
  const [iframeSrcDoc, setIframeSrcDoc] = useState('');
  const [logs, setLogs] = useState<LogMessage[]>([]);
  
  const [showReview, setShowReview] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewData, setReviewData] = useState<any>(null);
  
  const [showDebug, setShowDebug] = useState(false);
  const [isDebugLoading, setIsDebugLoading] = useState(false);
  const [debugData, setDebugData] = useState<any>(null);
  const [beginnerMode, setBeginnerMode] = useState(true);

  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0].id);
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);
  
  const editorRef = useRef<HTMLTextAreaElement>(null);

  // Auto-save
  useEffect(() => {
    localStorage.setItem('dayone-lab-html', htmlCode);
    localStorage.setItem('dayone-lab-css', cssCode);
    localStorage.setItem('dayone-lab-js', jsCode);
  }, [htmlCode, cssCode, jsCode]);

  const handleEditorKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.target as HTMLTextAreaElement;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const val = target.value;
      const setCode = activeTab === 'html' ? setHtmlCode : activeTab === 'css' ? setCssCode : setJsCode;
      
      setCode(val.substring(0, start) + '  ' + val.substring(end));
      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.selectionStart = editorRef.current.selectionEnd = start + 2;
        }
      }, 0);
    }
    
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      runCode();
    }
  };

  const handleLoadTemplate = (id: string) => {
    const template = TEMPLATES.find(t => t.id === id);
    if (template && window.confirm('Load template? This will overwrite your current code.')) {
      setHtmlCode(template.html);
      setCssCode(template.css);
      setJsCode(template.js);
      setSelectedTemplate(id);
      setShowTemplateDropdown(false);
    }
  };

  const runCode = () => {
    setIsRunning(true);
    setLogs([]);
    
    const combined = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            ${cssCode}
          </style>
        </head>
        <body>
          ${htmlCode}
          <script>
            // Capture console
            (function() {
              const originalLog = console.log;
              const originalWarn = console.warn;
              const originalError = console.error;
              
              window.onerror = function(msg, url, line, col, error) {
                window.parent.postMessage({ type: 'error', message: msg + ' at line ' + line }, '*');
                return false;
              };

              console.log = function(...args) {
                window.parent.postMessage({ type: 'log', message: args.join(' ') }, '*');
                originalLog.apply(console, args);
              };
              console.warn = function(...args) {
                window.parent.postMessage({ type: 'warn', message: args.join(' ') }, '*');
                originalWarn.apply(console, args);
              };
              console.error = function(...args) {
                window.parent.postMessage({ type: 'error', message: args.join(' ') }, '*');
                originalError.apply(console, args);
              };
            })();
          </script>
          <script>
            try {
              ${jsCode}
            } catch(e) {
              console.error(e.message);
            }
          </script>
        </body>
      </html>
    `;
    
    setIframeSrcDoc(combined);
    
    setTimeout(() => setIsRunning(false), 500);
  };

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data && (e.data.type === 'log' || e.data.type === 'warn' || e.data.type === 'error')) {
        setLogs(prev => [...prev, {
          id: Math.random().toString(36).substring(7),
          type: e.data.type,
          message: e.data.message,
          timestamp: new Date().toLocaleTimeString()
        }]);
        
        if (e.data.type === 'error') {
          handleRuntimeError(e.data.message);
        }
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleRuntimeError = async (errMsg: string) => {
    setShowDebug(true);
    setIsDebugLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${BASE_URL}/api/playground/debug`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          code: jsCode,
          error: errMsg,
          language: 'javascript'
        })
      });
      if (res.ok) {
        setDebugData(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsDebugLoading(false);
    }
  };

  const handleRequestReview = async () => {
    setShowReview(true);
    setIsReviewing(true);
    try {
      const currentCode = activeTab === 'html' ? htmlCode : activeTab === 'css' ? cssCode : jsCode;
      const token = await getToken();
      
      const res = await fetch(`${BASE_URL}/api/playground/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          code: currentCode,
          language: activeTab
        })
      });
      
      if (res.ok) {
        setReviewData(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsReviewing(false);
    }
  };

  const getCurrentCode = () => {
    return activeTab === 'html' ? htmlCode : activeTab === 'css' ? cssCode : jsCode;
  };

  const setCurrentCode = (val: string) => {
    if (activeTab === 'html') setHtmlCode(val);
    else if (activeTab === 'css') setCssCode(val);
    else setJsCode(val);
  };

  const lineCount = getCurrentCode().split('\n').length;
  const lines = Array.from({ length: Math.max(10, lineCount) }, (_, i) => i + 1);

  return (
    <div className="flex flex-col h-screen bg-surface overflow-hidden">
      {/* Header Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-surface-container border-b border-outline-variant shrink-0">
        <div className="flex items-center space-x-2">
          <div className="flex space-x-1 bg-surface-container-low p-1 rounded-xl">
            {(['html', 'css', 'js'] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab 
                    ? 'bg-primary text-on-primary-container shadow-sm' 
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
                }`}
              >
                {tab.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="relative">
            <button 
              onClick={() => setShowTemplateDropdown(!showTemplateDropdown)}
              className="flex items-center space-x-2 text-sm text-on-surface-variant hover:text-on-surface px-3 py-1.5 rounded-lg hover:bg-surface-container-high transition-colors"
            >
              <LayoutTemplate className="w-4 h-4" />
              <span>Templates</span>
              <ChevronDown className="w-4 h-4" />
            </button>
            
            <AnimatePresence>
              {showTemplateDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 mt-2 w-64 bg-surface-container-high border border-outline-variant rounded-xl shadow-xl z-50 py-2"
                >
                  {TEMPLATES.map(t => (
                    <button
                      key={t.id}
                      onClick={() => handleLoadTemplate(t.id)}
                      className="w-full text-left px-4 py-2 hover:bg-surface-container-highest flex flex-col"
                    >
                      <span className="text-sm font-medium text-on-surface">{t.name}</span>
                      <span className="text-xs text-on-surface-variant">{t.description}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button 
            onClick={() => handleLoadTemplate(selectedTemplate)}
            className="flex items-center space-x-2 px-3 py-1.5 text-sm font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high rounded-lg transition-colors"
            title="Reset to template starter"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset</span>
          </button>
          
          <button 
            onClick={runCode}
            disabled={isRunning}
            className="flex items-center space-x-2 px-5 py-1.5 bg-secondary text-white text-sm font-medium rounded-lg hover:bg-opacity-90 transition-colors disabled:opacity-50"
          >
            <Play className="w-4 h-4" />
            <span>{isRunning ? 'Running...' : 'Run (Ctrl+Enter)'}</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
        
        {/* Left: Editor */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-outline-variant bg-[#0d1117]">
          <div className="flex-1 flex overflow-hidden relative">
            <div className="flex-none w-12 bg-[#0d1117] border-r border-[#30363d] py-4 text-right pr-3 overflow-hidden select-none">
              {lines.map(n => (
                <div key={n} className="text-[#6e7681] text-sm font-mono leading-6">{n}</div>
              ))}
            </div>
            <textarea
              ref={editorRef}
              value={getCurrentCode()}
              onChange={(e) => setCurrentCode(e.target.value)}
              onKeyDown={handleEditorKeyDown}
              className="flex-1 w-full h-full resize-none outline-none bg-transparent text-[#e6edf3] font-mono text-sm leading-6 p-4 whitespace-pre font-mono"
              spellCheck="false"
              autoComplete="off"
            />
          </div>
        </div>

        {/* Right: Output & Review */}
        <div className="flex-1 flex flex-col min-w-0 bg-surface-container">
          {/* Output Tabs */}
          <div className="flex items-center border-b border-outline-variant px-2 bg-surface">
            <button
              onClick={() => setOutputTab('preview')}
              className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                outputTab === 'preview' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <Eye className="w-4 h-4" />
              <span>Preview</span>
            </button>
            <button
              onClick={() => setOutputTab('console')}
              className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                outputTab === 'console' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <TerminalSquare className="w-4 h-4" />
              <span>Console {logs.length > 0 && <span className="ml-1 bg-surface-container-high px-1.5 py-0.5 rounded-full text-xs">{logs.length}</span>}</span>
            </button>
          </div>

          {/* Output Area */}
          <div className="flex-1 relative bg-white">
            <iframe
              title="preview"
              sandbox="allow-scripts"
              srcDoc={iframeSrcDoc}
              className={`absolute inset-0 w-full h-full border-0 ${outputTab === 'preview' ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
            />
            
            <div className={`absolute inset-0 w-full h-full bg-[#0d1117] overflow-auto p-4 font-mono text-sm flex flex-col space-y-1 ${outputTab === 'console' ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
              {logs.length === 0 ? (
                <div className="text-[#6e7681] italic">No console output yet. Run your code to see logs.</div>
              ) : (
                logs.map(log => (
                  <div key={log.id} className={`flex space-x-3 py-1 border-b border-[#30363d] ${
                    log.type === 'error' ? 'text-red-400 bg-red-900/10' : 
                    log.type === 'warn' ? 'text-yellow-300' : 'text-[#e6edf3]'
                  }`}>
                    <span className="text-[#6e7681] text-xs mt-0.5 select-none shrink-0">{log.timestamp}</span>
                    <span className="whitespace-pre-wrap break-words">{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* AI Panels */}
          <div className="border-t border-outline-variant bg-surface">
            {/* Review Panel Trigger */}
            <div className="p-3 flex justify-between items-center bg-surface-container-low cursor-pointer" onClick={() => setShowReview(!showReview)}>
              <div className="flex items-center space-x-2 text-primary font-medium">
                <Zap className="w-4 h-4" />
                <span>AI Code Review</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-on-surface-variant transition-transform ${showReview ? 'rotate-180' : ''}`} />
            </div>

            <AnimatePresence>
              {showReview && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-t border-outline-variant"
                >
                  <div className="p-4 max-h-64 overflow-y-auto">
                    {!reviewData && !isReviewing ? (
                      <div className="text-center py-4">
                        <p className="text-on-surface-variant mb-4 text-sm">Get AI-powered feedback on your code quality, performance, and best practices.</p>
                        <button
                          onClick={handleRequestReview}
                          className="px-4 py-2 bg-primary text-on-primary-container rounded-lg text-sm font-medium hover:bg-primary-container transition-colors"
                        >
                          Request Review
                        </button>
                      </div>
                    ) : isReviewing ? (
                      <div className="space-y-4 animate-pulse">
                        <div className="h-4 bg-surface-container-highest rounded w-1/3"></div>
                        <div className="h-2 bg-surface-container-highest rounded w-full"></div>
                        <div className="h-2 bg-surface-container-highest rounded w-5/6"></div>
                        <div className="h-2 bg-surface-container-highest rounded w-4/6"></div>
                      </div>
                    ) : reviewData && (
                      <div className="space-y-4 text-sm">
                        <div className="flex items-center space-x-2">
                          {reviewData.correctness?.isCorrect ? (
                            <CheckCircle2 className="w-5 h-5 text-secondary" />
                          ) : (
                            <AlertTriangle className="w-5 h-5 text-error" />
                          )}
                          <span className="font-medium text-on-surface">{reviewData.correctness?.explanation}</span>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4">
                          {[
                            { label: 'Performance', val: reviewData.performance },
                            { label: 'Readability', val: reviewData.readability },
                            { label: 'Best Practices', val: reviewData.bestPractices }
                          ].map(metric => (
                            <div key={metric.label} className="bg-surface-container-low p-3 rounded-lg">
                              <div className="text-on-surface-variant text-xs mb-1">{metric.label}</div>
                              <div className="flex items-end space-x-2">
                                <span className="text-lg font-bold text-on-surface">{metric.val}%</span>
                                <div className="flex-1 h-1.5 bg-surface-container-high rounded-full mb-1.5">
                                  <div className="h-full bg-primary rounded-full" style={{ width: `${metric.val}%` }}></div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {reviewData.bugs?.length > 0 && (
                          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                            <h4 className="font-medium text-error mb-2 flex items-center"><AlertTriangle className="w-4 h-4 mr-1.5" /> Potential Bugs</h4>
                            <ul className="list-disc pl-5 text-on-surface-variant space-y-1">
                              {reviewData.bugs.map((bug: string, i: number) => <li key={i}>{bug}</li>)}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>
      </div>

      {/* Floating AI Debug Assistant */}
      <AnimatePresence>
        {showDebug && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-6 right-6 w-96 bg-surface border border-outline-variant rounded-2xl shadow-2xl z-50 flex flex-col max-h-[80vh]"
          >
            <div className="flex justify-between items-center p-4 border-b border-outline-variant bg-error/10 rounded-t-2xl">
              <div className="flex items-center space-x-2 text-error font-medium">
                <AlertTriangle className="w-5 h-5" />
                <span>AI Debug Assistant</span>
              </div>
              <button onClick={() => setShowDebug(false)} className="text-on-surface-variant hover:text-on-surface">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1 text-sm">
              {isDebugLoading ? (
                <div className="space-y-4 animate-pulse">
                  <div className="h-4 bg-surface-container-highest rounded w-1/2"></div>
                  <div className="h-3 bg-surface-container-highest rounded w-full"></div>
                  <div className="h-3 bg-surface-container-highest rounded w-5/6"></div>
                  <div className="h-20 bg-surface-container-highest rounded w-full mt-4"></div>
                </div>
              ) : debugData ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-on-surface">Analysis</span>
                    <button 
                      onClick={() => setBeginnerMode(!beginnerMode)}
                      className="text-xs bg-surface-container-high px-2 py-1 rounded hover:bg-surface-container-highest transition-colors flex items-center space-x-1"
                    >
                      <BookOpen className="w-3 h-3" />
                      <span>{beginnerMode ? 'Show Technical' : 'Explain Simply'}</span>
                    </button>
                  </div>
                  
                  <div className="bg-surface-container-low p-3 rounded-xl border border-outline-variant">
                    <p className="text-on-surface">{beginnerMode ? debugData.learn : debugData.whatHappened}</p>
                    {!beginnerMode && (
                      <p className="text-on-surface-variant mt-2 text-xs">{debugData.why}</p>
                    )}
                  </div>
                  
                  <div>
                    <span className="font-medium text-on-surface flex items-center mb-2">
                      <Code2 className="w-4 h-4 mr-1.5" /> Suggested Fix
                    </span>
                    <div className="bg-[#0d1117] text-[#e6edf3] p-3 rounded-xl font-mono text-xs overflow-x-auto whitespace-pre">
                      {debugData.fix}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-on-surface-variant">Something went wrong analyzing the error.</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
