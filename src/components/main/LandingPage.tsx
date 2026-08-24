import React, { useEffect, useRef } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { DayOneLogo } from '../shared/DayOneLogo';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { isLoaded, isSignedIn } = useUser();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const spotlightRef = useRef<HTMLDivElement | null>(null);
  const curtainRef = useRef<HTMLDivElement | null>(null);
  const navRef = useRef<HTMLElement | null>(null);
  const scrollbarRef = useRef<HTMLDivElement | null>(null);
  const toTopRef = useRef<HTMLDivElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const flowStepsRef = useRef<HTMLDivElement | null>(null);
  const roadmapPanelRef = useRef<HTMLDivElement | null>(null);
  const mentorMsgRef = useRef<HTMLDivElement | null>(null);
  const labOutputRef = useRef<HTMLDivElement | null>(null);
  const projFillRef = useRef<HTMLDivElement | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      navigate('/app', { replace: true });
    }
  }, [isLoaded, isSignedIn, navigate]);

  useEffect(() => {
    // 1. Hide curtain after load
    const hideCurtain = setTimeout(() => {
      if (curtainRef.current) curtainRef.current.classList.add('hide');
      if (navRef.current) navRef.current.classList.add('show');
    }, 400);

    // 2. Particles Background Animation
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        let w = (canvas.width = window.innerWidth);
        let h = (canvas.height = window.innerHeight);
        const particles: Array<{ x: number; y: number; vx: number; vy: number; r: number }> = [];
        const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        const handleResize = () => {
          w = canvas.width = window.innerWidth;
          h = canvas.height = window.innerHeight;
        };
        window.addEventListener('resize', handleResize);

        const count = Math.min(70, Math.floor(w / 22));
        for (let i = 0; i < count; i++) {
          particles.push({
            x: Math.random() * w,
            y: Math.random() * h,
            vx: (Math.random() - 0.5) * 0.25,
            vy: (Math.random() - 0.5) * 0.25,
            r: Math.random() * 1.4 + 0.6,
          });
        }

        let animationFrameId: number;
        const step = () => {
          ctx.clearRect(0, 0, w, h);
          ctx.fillStyle = 'rgba(139,92,246,0.55)';
          
          for (const p of particles) {
            p.x += p.vx;
            p.y += p.vy;
            if (p.x < 0 || p.x > w) p.vx *= -1;
            if (p.y < 0 || p.y > h) p.vy *= -1;
          }

          for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
              const a = particles[i];
              const b = particles[j];
              const d = Math.hypot(a.x - b.x, a.y - b.y);
              if (d < 130) {
                ctx.strokeStyle = `rgba(148,163,184,${0.12 * (1 - d / 130)})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(a.x, a.y);
                ctx.lineTo(b.x, b.y);
                ctx.stroke();
              }
            }
          }

          for (const p of particles) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, 7);
            ctx.fill();
          }

          if (!isReduced) {
            animationFrameId = requestAnimationFrame(step);
          }
        };

        step();

        return () => {
          window.removeEventListener('resize', handleResize);
          cancelAnimationFrame(animationFrameId);
        };
      }
    }

    return () => clearTimeout(hideCurtain);
  }, []);

  useEffect(() => {
    // 3. Spotlight
    const spotlight = spotlightRef.current;
    const handleMouseMove = (e: MouseEvent) => {
      if (spotlight) {
        spotlight.style.opacity = '1';
        spotlight.style.left = e.clientX + 'px';
        spotlight.style.top = e.clientY + 'px';
      }
    };
    const handleMouseLeave = () => {
      if (spotlight) spotlight.style.opacity = '0';
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    // 4. Scroll progress, nav shadow, and toTop button
    const handleScroll = () => {
      if (navRef.current) {
        navRef.current.classList.toggle('scrolled', window.scrollY > 20);
      }
      if (toTopRef.current) {
        toTopRef.current.classList.toggle('show', window.scrollY > 800);
      }
      const doc = document.documentElement;
      const pct = (window.scrollY / (doc.scrollHeight - doc.clientHeight)) * 100;
      if (scrollbarRef.current) {
        scrollbarRef.current.style.width = pct + '%';
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    // 5. Magnetic Buttons
    const buttons = document.querySelectorAll('[data-magnetic]');
    buttons.forEach((btn: any) => {
      const parent = btn.parentElement;
      if (!parent) return;

      const handleMove = (e: any) => {
        const r = btn.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        btn.style.transform = `translate(${x * 0.25}px, ${y * 0.3}px)`;
      };

      const handleLeave = () => {
        btn.style.transform = '';
      };

      parent.addEventListener('mousemove', handleMove);
      parent.addEventListener('mouseleave', handleLeave);
    });
  }, []);

  useEffect(() => {
    // 6. Intersection Observer for Scroll Reveals
    const revealEls = document.querySelectorAll('.reveal, .reveal-l, .reveal-r, .stagger');
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    revealEls.forEach((el) => io.observe(el));

    return () => io.disconnect();
  }, []);

  useEffect(() => {
    // 7. Count-Up Numbers
    const countUp = (el: HTMLElement) => {
      const target = parseInt(el.dataset.count || '0', 10);
      const suffix = el.dataset.suffix || '';
      const prefix = el.dataset.prefix || '';
      const dur = 1400;
      const start = performance.now();

      const tick = (now: number) => {
        const p = Math.min(1, (now - start) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = prefix + Math.round(eased * target) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    const countEls = document.querySelectorAll('[data-count]');
    const cIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            countUp(e.target as HTMLElement);
            cIO.unobserve(e.target);
          }
        });
      },
      { threshold: 0.5 }
    );
    countEls.forEach((el) => cIO.observe(el));

    return () => cIO.disconnect();
  }, []);

  useEffect(() => {
    // 8. Universe Graph SVG Population
    const nodesG = document.getElementById('uni-nodes');
    const linesG = document.getElementById('uni-lines');
    const tooltip = tooltipRef.current;
    if (!nodesG || !linesG) return;

    const uniData = [
      { id: 'root', x: 240, y: 40, label: 'AI ENGINEER', state: 'active', r: 22 },
      { id: 'python', x: 130, y: 140, label: 'PYTHON', state: 'mastered', r: 17, parent: 'root' },
      { id: 'ml', x: 350, y: 140, label: 'ML', state: 'active', r: 17, parent: 'root' },
      { id: 'api', x: 70, y: 250, label: 'API', state: 'mastered', r: 14, parent: 'python' },
      { id: 'oop', x: 180, y: 260, label: 'OOP', state: 'mastered', r: 14, parent: 'python' },
      { id: 'nlp', x: 300, y: 260, label: 'NLP', state: 'active', r: 14, parent: 'ml' },
      { id: 'dl', x: 410, y: 250, label: 'DL', state: 'locked', r: 14, parent: 'ml' },
      { id: 'rag', x: 300, y: 360, label: 'RAG', state: 'locked', r: 13, parent: 'nlp' },
    ];

    const tooltipData: Record<string, { mastery: string; next: string; est: string }> = {
      root: { mastery: '64%', next: 'Systems Design', est: '—' },
      python: { mastery: '100%', next: 'Complete', est: '—' },
      ml: { mastery: '58%', next: 'Neural Nets', est: '40 min' },
      api: { mastery: '100%', next: 'Complete', est: '—' },
      oop: { mastery: '100%', next: 'Complete', est: '—' },
      nlp: { mastery: '71%', next: 'Embeddings', est: '25 min' },
      dl: { mastery: '0%', next: 'Unlocks after ML', est: '—' },
      rag: { mastery: '0%', next: 'Retrieval Strategies', est: '35 min' },
    };

    const svgNS = 'http://www.w3.org/2000/svg';

    // Clear previous
    nodesG.innerHTML = '';
    linesG.innerHTML = '';

    uniData.forEach((n) => {
      if (n.parent) {
        const p = uniData.find((d) => d.id === n.parent);
        if (p) {
          const line = document.createElementNS(svgNS, 'path');
          const midY = (p.y + n.y) / 2;
          line.setAttribute('d', `M${p.x} ${p.y} C ${p.x} ${midY}, ${n.x} ${midY}, ${n.x} ${n.y}`);
          line.setAttribute('class', 'uni-line' + (n.state !== 'locked' ? ' active' : ''));
          linesG.appendChild(line);
        }
      }
    });

    uniData.forEach((n, idx) => {
      const g = document.createElementNS(svgNS, 'g');
      g.setAttribute('class', 'uni-node ' + n.state + ' uni-float');
      g.style.animationDelay = idx * 0.35 + 's';
      g.setAttribute('data-id', n.id);

      if (n.state !== 'locked') {
        const halo = document.createElementNS(svgNS, 'circle');
        halo.setAttribute('class', 'halo');
        halo.setAttribute('cx', String(n.x));
        halo.setAttribute('cy', String(n.y));
        halo.setAttribute('r', String(n.r));
        halo.style.setProperty('--r', String(n.r));
        halo.style.animationDelay = idx * 0.4 + 's';
        g.appendChild(halo);
      }

      const c = document.createElementNS(svgNS, 'circle');
      c.setAttribute('class', 'core');
      c.setAttribute('cx', String(n.x));
      c.setAttribute('cy', String(n.y));
      c.setAttribute('r', String(n.r));
      g.appendChild(c);

      const t = document.createElementNS(svgNS, 'text');
      t.setAttribute('x', String(n.x));
      t.setAttribute('y', String(n.y + n.r + 16));
      t.textContent = n.label;
      g.appendChild(t);

      g.addEventListener('mouseenter', (e) => {
        const ttTitle = document.getElementById('tt-title');
        const ttMastery = document.getElementById('tt-mastery');
        const ttNext = document.getElementById('tt-next');
        const ttEst = document.getElementById('tt-est');

        if (ttTitle) ttTitle.textContent = n.label;
        if (ttMastery) ttMastery.textContent = tooltipData[n.id].mastery;
        if (ttNext) ttNext.textContent = tooltipData[n.id].next;
        if (ttEst) ttEst.textContent = tooltipData[n.id].est;

        if (tooltip) {
          tooltip.classList.add('show');
          const wrap = document.querySelector('.universe')?.getBoundingClientRect();
          if (wrap) {
            tooltip.style.left = e.clientX - wrap.left + 16 + 'px';
            tooltip.style.top = e.clientY - wrap.top - 20 + 'px';
          }
        }
      });

      g.addEventListener('mousemove', (e) => {
        if (tooltip) {
          const wrap = document.querySelector('.universe')?.getBoundingClientRect();
          if (wrap) {
            tooltip.style.left = e.clientX - wrap.left + 16 + 'px';
            tooltip.style.top = e.clientY - wrap.top - 20 + 'px';
          }
        }
      });

      g.addEventListener('mouseleave', () => {
        if (tooltip) tooltip.classList.remove('show');
      });

      nodesG.appendChild(g);
    });
  }, []);

  useEffect(() => {
    // 9. Solution Flow highlight sequence
    const flowSteps = flowStepsRef.current?.querySelectorAll('.flow-step');
    const flowConnectors = flowStepsRef.current?.querySelectorAll('.flow-connector');
    if (!flowSteps) return;

    let flowIdx = 0;
    const stepFlow = () => {
      flowSteps.forEach((s) => s.classList.remove('on'));
      flowConnectors?.forEach((c) => c.classList.remove('on'));
      flowSteps[flowIdx]?.classList.add('on');
      for (let i = 0; i < flowIdx; i++) {
        flowConnectors?.[i]?.classList.add('on');
      }
      flowIdx = (flowIdx + 1) % flowSteps.length;
    };

    let intervalId: any;
    const flowIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            stepFlow();
            intervalId = setInterval(stepFlow, 1300);
            flowIO.unobserve(e.target);
          }
        });
      },
      { threshold: 0.4 }
    );

    if (flowStepsRef.current) flowIO.observe(flowStepsRef.current);

    return () => {
      flowIO.disconnect();
      clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    // 10. Roadmap Panel reveal
    const rmPanel = roadmapPanelRef.current;
    if (!rmPanel) return;

    const rmNodes = rmPanel.querySelectorAll('.rm-node');
    const rmConn = rmPanel.querySelectorAll('.rm-connector');

    const rmIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            rmNodes.forEach((n, i) => setTimeout(() => n.classList.add('on'), i * 220));
            rmConn.forEach((c, i) => setTimeout(() => c.classList.add('on'), i * 220 + 120));
            rmIO.unobserve(e.target);
          }
        });
      },
      { threshold: 0.3 }
    );

    rmIO.observe(rmPanel);
    return () => rmIO.disconnect();
  }, []);

  useEffect(() => {
    // 11. AI Mentor Typewriter
    const mentorMsg = mentorMsgRef.current;
    if (!mentorMsg) return;

    const mentorText = "You've struggled with recursion three times this week.\n\nBefore continuing to Graphs, I recommend a 15-minute review.\n\nYour confidence should improve significantly after this session.";

    let timer: any;
    const mentorIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            let i = 0;
            mentorMsg.innerHTML = '<span class="cursor"></span>';
            timer = setInterval(() => {
              if (i >= mentorText.length) {
                clearInterval(timer);
                mentorMsg.innerHTML = mentorText.replace(/\n/g, '<br><br>');
                return;
              }
              mentorMsg.innerHTML = mentorText.slice(0, i + 1).replace(/\n/g, '<br><br>') + '<span class="cursor"></span>';
              i++;
            }, 18);
            mentorIO.unobserve(e.target);
          }
        });
      },
      { threshold: 0.4 }
    );

    mentorIO.observe(mentorMsg);
    return () => {
      mentorIO.disconnect();
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    // 12. Lab Output Typewriter
    const labEl = labOutputRef.current;
    if (!labEl) return;

    const labText = "> find_duplicates([3,1,4,1,5])\n> 1\n> Passed 4/4 tests";
    let timer: any;

    const labIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            let i = 0;
            timer = setInterval(() => {
              if (i >= labText.length) {
                clearInterval(timer);
                labEl.innerHTML = labText.replace(/\n/g, '<br>');
                return;
              }
              labEl.innerHTML = labText.slice(0, i + 1).replace(/\n/g, '<br>') + '<span class="blk"></span>';
              i++;
            }, 22);
            labIO.unobserve(e.target);
          }
        });
      },
      { threshold: 0.5 }
    );

    labIO.observe(labEl);
    return () => {
      labIO.disconnect();
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    // 13. Project Progress Bar
    const projFill = projFillRef.current;
    if (!projFill) return;

    const projIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            projFill.classList.add('go');
            projIO.unobserve(e.target);
          }
        });
      },
      { threshold: 0.4 }
    );

    projIO.observe(projFill);
    return () => projIO.disconnect();
  }, []);

  useEffect(() => {
    // 14. Generic bar-fill
    const bars = document.querySelectorAll('.bar-fill');
    const barIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const bar = e.target as HTMLElement;
            bar.style.width = bar.dataset.w + '%';
            barIO.unobserve(e.target);
          }
        });
      },
      { threshold: 0.4 }
    );

    bars.forEach((bar) => barIO.observe(bar));
    return () => barIO.disconnect();
  }, []);

  useEffect(() => {
    // 15. Resume lines
    const lines = document.querySelectorAll('.resume-line');
    const rIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const line = e.target as HTMLElement;
            const idx = Array.from(lines).indexOf(line);
            setTimeout(() => line.classList.add('in'), idx * 80);
            rIO.unobserve(e.target);
          }
        });
      },
      { threshold: 0.4 }
    );

    lines.forEach((line) => rIO.observe(line));
    return () => rIO.disconnect();
  }, []);

  useEffect(() => {
    // 16. Timeline progress
    const timeline = timelineRef.current;
    if (!timeline) return;

    const tlItems = timeline.querySelectorAll('.tl-item');
    const tlProgress = timeline.querySelector('#tlProgress') as HTMLElement;

    const tlIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            const idx = Array.from(tlItems).indexOf(e.target);
            const pct = ((idx + 1) / tlItems.length) * 100;
            if (tlProgress) tlProgress.style.height = pct + '%';
            tlIO.unobserve(e.target);
          }
        });
      },
      { threshold: 0.5 }
    );

    tlItems.forEach((el) => tlIO.observe(el));
    return () => tlIO.disconnect();
  }, []);

  return (
    <>
      {/* CSS Stylesheet embedded for exact styling parity */}
      <style>{`
        :root {
          --color-bg: #070B14;
          --color-bg-2: #0B1120;
          --color-surface: #111827;
          --color-elevated: #151E2F;
          --color-border: rgba(148,163,184,0.12);
          --color-border-strong: rgba(148,163,184,0.24);
          --text-primary: #F8FAFC;
          --text-secondary: #94A3B8;
          --text-muted: #64748B;
          --ai: #8B5CF6;
          --ai-soft: rgba(139,92,246,0.14);
          --learning: #38BDF8;
          --learning-soft: rgba(56,189,248,0.14);
          --mastery: #34D399;
          --mastery-soft: rgba(52,211,153,0.14);
          --challenge: #F59E0B;
          --challenge-soft: rgba(245,158,11,0.14);
          --critical: #F43F5E;
          --critical-soft: rgba(244,63,94,0.14);
          --font-body: 'Inter', sans-serif;
          --font-display: 'Space Grotesk', sans-serif;
          --font-mono: 'JetBrains Mono', monospace;
        }

        body {
          background: var(--color-bg) !important;
          color: var(--text-primary) !important;
          overflow-x: hidden;
        }

        /* particle canvas background */
        #particles {
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
        }

        /* cursor spotlight */
        #spotlight {
          position: fixed;
          width: 520px;
          height: 520px;
          border-radius: 50%;
          pointer-events: none;
          z-index: 1;
          background: radial-gradient(circle, rgba(139,92,246,0.10), transparent 65%);
          transform: translate(-50%, -50%);
          transition: opacity 0.3s ease;
          opacity: 0;
        }

        .grain {
          position: fixed;
          inset: 0;
          z-index: 2;
          pointer-events: none;
          opacity: 0.035;
          mix-blend-mode: overlay;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
        }

        .wrap {
          position: relative;
          z-index: 3;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 32px;
          width: 100%;
          box-sizing: border-box;
        }
        @media (max-width: 640px) {
          .container {
            padding: 0 20px;
          }
        }

        /* page-load curtain */
        #curtain {
          position: fixed;
          inset: 0;
          z-index: 999;
          background: var(--color-bg);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: opacity 0.7s ease, visibility 0.7s ease;
        }
        #curtain.hide {
          opacity: 0;
          visibility: hidden;
        }
        #curtain .mark {
          font-family: var(--font-mono);
          font-size: 13px;
          letter-spacing: 0.3em;
          color: var(--ai);
          display: flex;
          align-items: center;
          gap: 10px;
        }
        #curtain .mark::before,
        #curtain .mark::after {
          content: '';
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--ai);
          animation: curtainPulse 1s ease-in-out infinite;
        }
        #curtain .mark::after {
          animation-delay: 0.2s;
        }
        @keyframes curtainPulse {
          0%, 100% {
            opacity: 0.3;
            transform: scale(0.8);
          }
          50% {
            opacity: 1;
            transform: scale(1.2);
          }
        }

        /* ---------- NAV ---------- */
        nav#nav {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 100;
          height: 72px;
          display: flex;
          align-items: center;
          transition: background 0.4s ease, border-color 0.4s ease, transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
          border-bottom: 1px solid transparent;
          transform: translateY(-100%);
        }
        nav#nav.show {
          transform: translateY(0);
        }
        nav#nav.scrolled {
          background: rgba(7, 11, 20, 0.75);
          backdrop-filter: blur(16px);
          border-bottom: 1px solid var(--color-border);
        }
        .nav-inner {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 32px;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .logo {
          font-family: var(--font-mono);
          font-weight: 600;
          font-size: 15px;
          letter-spacing: 0.12em;
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--text-primary);
        }
        .logo-mark {
          width: 16px;
          height: 16px;
          position: relative;
        }
        .logo-mark::before,
        .logo-mark::after {
          content: '';
          position: absolute;
          border-radius: 50%;
        }
        .logo-mark::before {
          width: 16px;
          height: 16px;
          border: 1.5px solid var(--ai);
          animation: spin 6s linear infinite;
        }
        .logo-mark::after {
          width: 5px;
          height: 5px;
          background: var(--ai);
          top: 5.5px;
          left: 5.5px;
          box-shadow: 0 0 8px var(--ai);
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        .nav-links {
          display: flex;
          gap: 36px;
          font-size: 14px;
          color: var(--text-secondary);
        }
        .nav-links a {
          color: inherit;
          text-decoration: none;
          position: relative;
          padding-bottom: 3px;
        }
        .nav-links a::after {
          content: '';
          position: absolute;
          left: 0;
          bottom: 0;
          width: 0;
          height: 1px;
          background: var(--ai);
          transition: width 0.25s ease;
        }
        .nav-links a:hover {
          color: var(--text-primary);
        }
        .nav-links a:hover::after {
          width: 100%;
        }
        .nav-actions {
          display: flex;
          align-items: center;
          gap: 20px;
        }
        .nav-signin {
          font-size: 14px;
          color: var(--text-secondary);
          text-decoration: none;
          transition: color 0.2s;
        }
        .nav-signin:hover {
          color: var(--text-primary);
        }
        @media (max-width: 900px) {
          .nav-links {
            display: none;
          }
        }

        .btn {
          font-family: var(--font-body);
          font-size: 14px;
          font-weight: 600;
          padding: 11px 20px;
          border-radius: 9px;
          border: none;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          text-decoration: none;
          position: relative;
          overflow: hidden;
          transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s ease;
        }
        .btn-primary {
          background: var(--ai);
          color: #fff;
        }
        .btn-primary::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(120deg, transparent, rgba(255, 255, 255, 0.28), transparent);
          transform: translateX(-120%);
          transition: transform 0.6s ease;
        }
        .btn-primary:hover::before {
          transform: translateX(120%);
        }
        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 28px rgba(139, 92, 246, 0.4);
        }
        .btn-primary .arrow {
          transition: transform 0.25s ease;
          display: inline-block;
        }
        .btn-primary:hover .arrow {
          transform: translateX(4px);
        }
        .btn-ghost {
          background: transparent;
          color: var(--text-primary);
          border: 1px solid var(--color-border-strong);
        }
        .btn-ghost:hover {
          background: var(--color-surface);
          border-color: var(--text-secondary);
          transform: translateY(-2px);
        }

        /* ---------- HERO ---------- */
        .hero {
          min-height: 100vh;
          display: flex;
          align-items: center;
          padding: 140px 0 80px;
          position: relative;
        }
        .hero-grid {
          display: grid;
          grid-template-columns: 1.15fr 0.85fr;
          gap: 48px;
          align-items: center;
          width: 100%;
        }
        @media (max-width: 1024px) {
          .hero-grid {
            grid-template-columns: 1fr;
            gap: 40px;
            text-align: center;
          }
          .hero {
            padding: 120px 0 60px;
          }
          .hero-ctas, .hero-stats {
            justify-content: center;
          }
          .hero-copy {
            margin-left: auto;
            margin-right: auto;
          }
          .universe {
            max-width: 440px;
          }
        }

        .eyebrow {
          font-family: var(--font-mono);
          font-size: 12px;
          letter-spacing: 0.14em;
          color: var(--ai);
          text-transform: uppercase;
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 22px;
          opacity: 0;
          animation: fadeUp 0.7s ease 0.1s forwards;
        }
        .eyebrow .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--ai);
          box-shadow: 0 0 10px var(--ai);
          animation: pulse-dot 2.4s ease-in-out infinite;
        }
        @keyframes pulse-dot {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.35;
          }
        }
        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .hero h1 {
          font-family: var(--font-display);
          font-weight: 600;
          font-size: clamp(38px, 6vw, 80px);
          line-height: 1.04;
          letter-spacing: -0.02em;
          margin-bottom: 22px;
        }
        .hero h1 .line {
          display: block;
          overflow: hidden;
          padding-bottom: 0.05em;
        }
        .hero h1 .line span {
          display: inline-block;
          transform: translateY(110%);
          animation: lineUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .hero h1 .line:nth-child(1) span {
          animation-delay: 0.15s;
        }
        .hero h1 .line:nth-child(2) span {
          animation-delay: 0.28s;
        }
        @keyframes lineUp {
          to {
            transform: translateY(0);
          }
        }
        .hero h1 .grad {
          background: linear-gradient(100deg, var(--ai), var(--learning));
          background-size: 200% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: gradShift 6s ease-in-out infinite;
        }
        @keyframes gradShift {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        .hero-sub {
          font-family: var(--font-display);
          font-size: clamp(17px, 2vw, 22px);
          color: var(--text-secondary);
          margin-bottom: 20px;
          font-weight: 500;
          opacity: 0;
          animation: fadeUp 0.7s ease 0.5s forwards;
        }
        .hero-copy {
          font-size: 16.5px;
          color: var(--text-secondary);
          max-width: 520px;
          margin-bottom: 36px;
          opacity: 0;
          animation: fadeUp 0.7s ease 0.62s forwards;
        }
        .hero-ctas {
          display: flex;
          gap: 14px;
          flex-wrap: wrap;
          opacity: 0;
          animation: fadeUp 0.7s ease 0.74s forwards;
        }

        .hero-stats {
          display: flex;
          gap: 36px;
          margin-top: 52px;
          opacity: 0;
          animation: fadeUp 0.7s ease 0.86s forwards;
          flex-wrap: wrap;
        }
        @media (max-width: 640px) {
          .hero-stats {
            gap: 24px;
          }
        }
        .hstat .val {
          font-family: var(--font-display);
          font-size: 26px;
          font-weight: 600;
        }
        .hstat .lbl {
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-top: 2px;
        }

        /* Learning Universe */
        .universe {
          position: relative;
          aspect-ratio: 1/1;
          max-width: 560px;
          margin: 0 auto;
          opacity: 0;
          animation: fadeIn 1s ease 0.4s forwards;
        }
        @keyframes fadeIn {
          to {
            opacity: 1;
          }
        }
        .universe svg {
          width: 100%;
          height: 100%;
          overflow: visible;
        }
        .uni-line {
          stroke: var(--color-border-strong);
          stroke-width: 1.2;
          fill: none;
          stroke-dasharray: 4 4;
          animation: dashFlow 3s linear infinite;
        }
        .uni-line.active {
          stroke: var(--ai);
          opacity: 0.6;
        }
        @keyframes dashFlow {
          to {
            stroke-dashoffset: -16;
          }
        }
        .uni-node {
          cursor: pointer;
        }
        .uni-node .halo {
          fill: none;
          opacity: 0;
        }
        .uni-node.active .halo {
          stroke: var(--ai);
          opacity: 0.35;
          animation: ringPulse 2.4s ease-out infinite;
        }
        .uni-node.mastered .halo {
          stroke: var(--mastery);
          opacity: 0.3;
          animation: ringPulse 3.2s ease-out infinite;
        }
        @keyframes ringPulse {
          0% {
            stroke-width: 1.5;
            r: var(--r, 20);
            opacity: 0.5;
          }
          100% {
            stroke-width: 0;
            r: calc(var(--r, 20) + 16);
            opacity: 0;
          }
        }
        .uni-node circle.core {
          fill: var(--color-elevated);
          stroke: var(--color-border-strong);
          stroke-width: 1.4;
          transition: all 0.25s ease;
        }
        .uni-node.mastered circle.core {
          stroke: var(--mastery);
          fill: rgba(52, 211, 153, 0.10);
        }
        .uni-node.active circle.core {
          stroke: var(--ai);
          fill: rgba(139, 92, 246, 0.16);
          filter: drop-shadow(0 0 10px rgba(139, 92, 246, 0.6));
        }
        .uni-node.locked circle.core {
          opacity: 0.35;
        }
        .uni-node text {
          font-family: var(--font-mono);
          font-size: 10.5px;
          fill: var(--text-secondary);
          text-anchor: middle;
        }
        .uni-node.active text,
        .uni-node.mastered text {
          fill: var(--text-primary);
        }
        .uni-node:hover circle.core {
          transform: scale(1.15);
          transform-box: fill-box;
          transform-origin: center;
        }
        .uni-float {
          animation: floatY 5s ease-in-out infinite;
        }
        @keyframes floatY {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-7px);
          }
        }

        .node-tooltip {
          position: absolute;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.18s ease, transform 0.18s ease;
          transform: translateY(6px);
          background: var(--color-elevated);
          border: 1px solid var(--color-border-strong);
          border-radius: 12px;
          padding: 14px 16px;
          width: 190px;
          z-index: 10;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
        }
        .node-tooltip.show {
          opacity: 1;
          transform: translateY(0);
        }
        .node-tooltip .tt-title {
          font-family: var(--font-mono);
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 8px;
        }
        .node-tooltip .tt-row {
          display: flex;
          justify-content: space-between;
          font-size: 11.5px;
          color: var(--text-muted);
          margin-bottom: 4px;
        }
        .node-tooltip .tt-row span:last-child {
          color: var(--text-secondary);
          font-family: var(--font-mono);
        }

        /* ---------- MARQUEE TRUST ---------- */
        .trust {
          padding: 30px 0;
          border-top: 1px solid var(--color-border);
          border-bottom: 1px solid var(--color-border);
          overflow: hidden;
        }
        .marquee {
          display: flex;
          width: max-content;
          animation: marquee 22s linear infinite;
        }
        .marquee:hover {
          animation-play-state: paused;
        }
        @keyframes marquee {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }
        .marquee span {
          font-family: var(--font-display);
          font-size: 16px;
          color: var(--text-secondary);
          padding: 0 40px;
          white-space: nowrap;
          display: flex;
          align-items: center;
          gap: 40px;
        }
        .marquee span::after {
          content: '◇';
          color: var(--text-muted);
          font-size: 10px;
        }

        /* ---------- SECTION SHARED ---------- */
        section {
          padding: 120px 0;
          position: relative;
        }
        @media (max-width: 768px) {
          section {
            padding: 80px 0;
          }
        }
        .section-head {
          max-width: 680px;
          margin-bottom: 64px;
        }
        .section-eyebrow {
          font-family: var(--font-mono);
          font-size: 12px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          margin-bottom: 16px;
        }
        .section-head h2 {
          font-family: var(--font-display);
          font-weight: 600;
          font-size: clamp(30px, 4.2vw, 52px);
          line-height: 1.12;
          letter-spacing: -0.01em;
          margin-bottom: 18px;
        }
        .section-head p {
          color: var(--text-secondary);
          font-size: 17px;
          max-width: 600px;
        }

        .reveal {
          opacity: 0;
          transform: translateY(36px);
          transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .reveal.in {
          opacity: 1;
          transform: translateY(0);
        }
        .reveal-l {
          opacity: 0;
          transform: translateX(-36px);
          transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .reveal-l.in {
          opacity: 1;
          transform: translateX(0);
        }
        .reveal-r {
          opacity: 0;
          transform: translateX(36px);
          transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .reveal-r.in {
          opacity: 1;
          transform: translateX(0);
        }
        .stagger > * {
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 0.6s ease, transform 0.6s ease;
        }
        .stagger.in > * {
          opacity: 1;
          transform: translateY(0);
        }
        .stagger.in > *:nth-child(1) {
          transition-delay: 0.02s;
        }
        .stagger.in > *:nth-child(2) {
          transition-delay: 0.10s;
        }
        .stagger.in > *:nth-child(3) {
          transition-delay: 0.18s;
        }
        .stagger.in > *:nth-child(4) {
          transition-delay: 0.26s;
        }
        .stagger.in > *:nth-child(5) {
          transition-delay: 0.34s;
        }

        /* magnetic hover wrapper */
        .magnetic {
          display: inline-flex;
        }

        /* ---------- PROBLEM ---------- */
        .problem-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 60px;
          align-items: start;
        }
        @media (max-width: 900px) {
          .problem-grid {
            grid-template-columns: 1fr;
            gap: 40px;
          }
        }
        .problem-list {
          display: flex;
          flex-direction: column;
        }
        .problem-item {
          display: flex;
          gap: 16px;
          padding: 18px 0;
          border-bottom: 1px solid var(--color-border);
          transition: padding-left 0.3s ease, border-color 0.3s ease;
        }
        .problem-item:hover {
          padding-left: 8px;
          border-color: var(--color-border-strong);
        }
        .problem-item:first-child {
          padding-top: 0;
        }
        .problem-item .mark {
          color: var(--critical);
          font-family: var(--font-mono);
          font-size: 13px;
          margin-top: 2px;
        }
        .problem-item p {
          color: var(--text-secondary);
          font-size: 15px;
        }
        .problem-item strong {
          color: var(--text-primary);
          font-weight: 600;
          display: block;
          margin-bottom: 2px;
          font-size: 15.5px;
        }

        .flow-panel {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: 18px;
          padding: 36px;
          position: relative;
          overflow: hidden;
        }
        .flow-panel::before {
          content: '';
          position: absolute;
          inset: -2px;
          background: conic-gradient(from 0deg, var(--ai), transparent 30%);
          opacity: 0.06;
          animation: spin 10s linear infinite;
        }
        .flow-steps {
          display: flex;
          flex-direction: column;
          position: relative;
          z-index: 1;
        }
        .flow-step {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 14px 0;
          position: relative;
        }
        .flow-step .fnode {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          border: 1.5px solid var(--color-border-strong);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--text-muted);
          flex-shrink: 0;
          background: var(--color-elevated);
          position: relative;
          z-index: 2;
          transition: border-color 0.3s, color 0.3s, box-shadow 0.3s, transform 0.3s;
        }
        .flow-step .flabel {
          font-family: var(--font-display);
          font-weight: 500;
          font-size: 16px;
          color: var(--text-secondary);
          transition: color 0.3s;
        }
        .flow-step.on .fnode {
          border-color: var(--ai);
          color: var(--ai);
          box-shadow: 0 0 16px rgba(139, 92, 246, 0.5);
          transform: scale(1.08);
        }
        .flow-step.on .flabel {
          color: var(--text-primary);
        }
        .flow-connector {
          width: 1.5px;
          height: 22px;
          background: var(--color-border-strong);
          margin-left: 16.5px;
          transition: background 0.3s;
        }
        .flow-connector.on {
          background: var(--ai);
        }

        /* ---------- ROADMAP ---------- */
        .roadmap-panel {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: 18px;
          padding: 48px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .rm-node {
          font-family: var(--font-mono);
          font-size: 14px;
          padding: 12px 24px;
          border-radius: 10px;
          border: 1px solid var(--color-border-strong);
          background: var(--color-elevated);
          color: var(--text-secondary);
          transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .rm-node.on {
          color: var(--text-primary);
          border-color: var(--learning);
          box-shadow: 0 0 18px rgba(56, 189, 248, 0.3);
          background: rgba(56, 189, 248, 0.06);
          transform: scale(1.04);
        }
        .rm-connector {
          width: 1.5px;
          height: 26px;
          background: var(--color-border-strong);
          transition: background 0.5s;
          position: relative;
          overflow: hidden;
        }
        .rm-connector.on {
          background: var(--learning);
        }
        .rm-connector.on::after {
          content: '';
          position: absolute;
          left: -2px;
          top: -100%;
          width: 5px;
          height: 60%;
          background: linear-gradient(var(--learning), transparent);
          animation: flowDown 1s ease-in-out infinite;
        }
        @keyframes flowDown {
          to {
            top: 140%;
          }
        }

        /* ---------- AI MENTOR ---------- */
        .mentor-panel {
          background: linear-gradient(160deg, var(--color-surface), var(--color-bg-2));
          border: 1px solid var(--color-border);
          border-radius: 18px;
          padding: 40px;
          max-width: 640px;
          margin: 0 auto;
          position: relative;
          overflow: hidden;
        }
        .mentor-panel .glow {
          position: absolute;
          width: 300px;
          height: 300px;
          background: radial-gradient(circle, rgba(139, 92, 246, 0.15), transparent 70%);
          top: -100px;
          right: -100px;
          animation: floatY 6s ease-in-out infinite;
        }
        .mentor-head {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 22px;
          position: relative;
        }
        .mentor-head .ai-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--ai);
          box-shadow: 0 0 10px var(--ai);
          animation: pulse-dot 2s ease-in-out infinite;
        }
        .mentor-head span {
          font-family: var(--font-mono);
          font-size: 12px;
          letter-spacing: 0.1em;
          color: var(--ai);
          text-transform: uppercase;
        }
        .mentor-msg {
          font-family: var(--font-display);
          font-size: 19px;
          line-height: 1.55;
          color: var(--text-primary);
          margin-bottom: 26px;
          min-height: 150px;
          position: relative;
        }
        .mentor-msg .cursor {
          display: inline-block;
          width: 2px;
          height: 18px;
          background: var(--ai);
          margin-left: 2px;
          vertical-align: middle;
          animation: blink 1s step-end infinite;
        }
        @keyframes blink {
          50% {
            opacity: 0;
          }
        }

        /* ---------- MISSION ---------- */
        .mission-panel {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: 18px;
          overflow: hidden;
          max-width: 640px;
          margin: 0 auto;
        }
        .mission-head {
          padding: 22px 28px;
          border-bottom: 1px solid var(--color-border);
          font-family: var(--font-mono);
          font-size: 12px;
          letter-spacing: 0.1em;
          color: var(--text-muted);
          text-transform: uppercase;
          display: flex;
          justify-content: space-between;
        }
        .mission-item {
          display: flex;
          align-items: center;
          gap: 18px;
          padding: 22px 28px;
          border-bottom: 1px solid var(--color-border);
          transition: background 0.25s ease;
        }
        .mission-item:hover {
          background: var(--color-elevated);
        }
        .mission-item:last-of-type {
          border-bottom: none;
        }
        .mission-num {
          font-family: var(--font-mono);
          font-size: 13px;
          color: var(--text-muted);
          width: 22px;
        }
        .mission-tag {
          font-family: var(--font-mono);
          font-size: 10.5px;
          padding: 4px 9px;
          border-radius: 6px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .tag-learn {
          background: var(--learning-soft);
          color: var(--learning);
        }
        .tag-build {
          background: var(--mastery-soft);
          color: var(--mastery);
        }
        .tag-challenge {
          background: var(--challenge-soft);
          color: var(--challenge);
        }
        .mission-body strong {
          display: block;
          font-size: 15.5px;
          font-family: var(--font-display);
          font-weight: 600;
        }
        .mission-body span {
          font-size: 13px;
          color: var(--text-muted);
          font-family: var(--font-mono);
        }
        .mission-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 22px 28px;
          background: var(--color-elevated);
        }
        .xp {
          font-family: var(--font-mono);
          color: var(--challenge);
          font-weight: 600;
          font-size: 15px;
        }

        /* ---------- LAB ---------- */
        .lab-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1px;
          background: var(--color-border);
          border: 1px solid var(--color-border);
          border-radius: 18px;
          overflow: hidden;
        }
        @media (max-width: 800px) {
          .lab-grid {
            grid-template-columns: 1fr;
          }
        }
        .lab-pane {
          background: var(--color-surface);
          padding: 24px;
        }
        .lab-pane-title {
          font-family: var(--font-mono);
          font-size: 11px;
          letter-spacing: 0.1em;
          color: var(--text-muted);
          text-transform: uppercase;
          margin-bottom: 16px;
        }
        .code-line {
          font-family: var(--font-mono);
          font-size: 13.5px;
          line-height: 1.8;
          white-space: pre;
          color: var(--text-secondary);
        }
        .code-line .kw {
          color: var(--ai);
        }
        .code-line .fn {
          color: var(--learning);
        }
        .code-line .str {
          color: var(--mastery);
        }
        .output-box {
          font-family: var(--font-mono);
          font-size: 13.5px;
          color: var(--mastery);
          background: var(--color-bg-2);
          border-radius: 10px;
          padding: 14px;
          border: 1px solid var(--color-border);
          min-height: 70px;
        }
        .output-box .blk {
          display: inline-block;
          width: 7px;
          height: 13px;
          background: var(--mastery);
          vertical-align: middle;
          animation: blink 1s step-end infinite;
        }
        .lab-review {
          grid-column: 1/-1;
          background: var(--color-elevated);
          padding: 22px 24px;
          display: flex;
          gap: 16px;
          align-items: flex-start;
        }
        .lab-review .ai-badge {
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--ai);
          letter-spacing: 0.08em;
          flex-shrink: 0;
          padding-top: 2px;
        }
        .lab-review p {
          font-size: 14.5px;
          color: var(--text-secondary);
          line-height: 1.6;
        }
        .lab-review strong {
          color: var(--text-primary);
        }

        /* ---------- PROJECT ---------- */
        .project-card {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: 18px;
          padding: 36px;
          max-width: 460px;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .project-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 24px 50px rgba(0, 0, 0, 0.35);
        }
        .project-tag {
          font-family: var(--font-mono);
          font-size: 10.5px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--challenge);
          background: var(--challenge-soft);
          padding: 5px 10px;
          border-radius: 6px;
          display: inline-block;
          margin-bottom: 18px;
        }
        .project-card h3 {
          font-family: var(--font-display);
          font-size: 24px;
          font-weight: 600;
          margin-bottom: 6px;
        }
        .project-card .diff {
          color: var(--text-muted);
          font-size: 13.5px;
          font-family: var(--font-mono);
          margin-bottom: 22px;
        }
        .skill-chips {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 24px;
        }
        .skill-chip {
          font-family: var(--font-mono);
          font-size: 11.5px;
          padding: 5px 10px;
          border: 1px solid var(--color-border-strong);
          border-radius: 6px;
          color: var(--text-secondary);
          transition: border-color 0.2s, color 0.2s;
        }
        .skill-chip:hover {
          border-color: var(--ai);
          color: var(--text-primary);
        }
        .progress-label {
          display: flex;
          justify-content: space-between;
          font-family: var(--font-mono);
          font-size: 12px;
          color: var(--text-muted);
          margin-bottom: 8px;
        }
        .progress-track {
          height: 8px;
          background: var(--color-elevated);
          border-radius: 5px;
          overflow: hidden;
          margin-bottom: 24px;
        }
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--ai), var(--learning));
          width: 0%;
          border-radius: 5px;
          transition: width 1.4s cubic-bezier(0.16, 1, 0.3, 1);
          position: relative;
        }
        .progress-fill.go {
          width: 82%;
        }
        .progress-fill::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
          width: 40%;
          animation: shimmer 1.8s linear infinite;
        }
        @keyframes shimmer {
          from {
            transform: translateX(-100%);
          }
          to {
            transform: translateX(350%);
          }
        }

        /* ---------- TIMELINE ---------- */
        .timeline {
          position: relative;
          max-width: 720px;
          margin: 0 auto;
          padding-left: 8px;
        }
        .timeline::before {
          content: '';
          position: absolute;
          left: 20px;
          top: 8px;
          bottom: 8px;
          width: 1.5px;
          background: var(--color-border-strong);
        }
        .timeline .tl-progress {
          position: absolute;
          left: 20px;
          top: 8px;
          width: 1.5px;
          height: 0;
          background: var(--mastery);
          transition: height 1.2s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 0 8px rgba(52, 211, 153, 0.6);
        }
        .tl-item {
          position: relative;
          padding-left: 56px;
          padding-bottom: 52px;
        }
        .tl-item:last-child {
          padding-bottom: 0;
        }
        .tl-dot {
          position: absolute;
          left: 12px;
          top: 2px;
          width: 17px;
          height: 17px;
          border-radius: 50%;
          background: var(--color-bg);
          border: 2px solid var(--color-border-strong);
          transition: all 0.5s ease;
          z-index: 2;
        }
        .tl-item.in .tl-dot {
          border-color: var(--mastery);
          box-shadow: 0 0 14px rgba(52, 211, 153, 0.5);
          background: var(--mastery-soft);
          transform: scale(1.1);
        }
        .tl-day {
          font-family: var(--font-mono);
          font-size: 12px;
          color: var(--text-muted);
          letter-spacing: 0.06em;
          margin-bottom: 4px;
        }
        .tl-item h4 {
          font-family: var(--font-display);
          font-size: 19px;
          font-weight: 600;
        }

        /* ---------- CAREER ---------- */
        .career-grid {
          display: grid;
          grid-template-columns: 0.9fr 1.1fr;
          gap: 60px;
          align-items: center;
        }
        @media (max-width: 900px) {
          .career-grid {
            grid-template-columns: 1fr;
            gap: 40px;
          }
        }
        .career-flow {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }
        .cf-item {
          font-family: var(--font-display);
          font-size: 20px;
          font-weight: 500;
          color: var(--text-secondary);
          padding: 8px 0;
          transition: color 0.3s ease, transform 0.3s ease;
        }
        .cf-item:hover {
          color: var(--text-primary);
          transform: translateX(6px);
        }
        .cf-arrow {
          color: var(--text-muted);
          padding-left: 2px;
        }
        .readiness-panel {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: 18px;
          padding: 32px;
        }
        .readiness-score {
          display: flex;
          align-items: baseline;
          gap: 8px;
          margin-bottom: 28px;
        }
        .readiness-score .num {
          font-family: var(--font-display);
          font-size: 52px;
          font-weight: 600;
          color: var(--mastery);
        }
        .readiness-score .lbl {
          font-family: var(--font-mono);
          font-size: 12px;
          color: var(--text-muted);
          text-transform: uppercase;
        }
        .bar-row {
          margin-bottom: 16px;
        }
        .bar-row-top {
          display: flex;
          justify-content: space-between;
          font-size: 13.5px;
          margin-bottom: 6px;
        }
        .bar-row-top span:first-child {
          color: var(--text-secondary);
        }
        .bar-row-top span:last-child {
          font-family: var(--font-mono);
          color: var(--text-primary);
        }
        .bar-track {
          height: 6px;
          background: var(--color-elevated);
          border-radius: 4px;
          overflow: hidden;
        }
        .bar-fill {
          height: 100%;
          background: var(--mastery);
          width: 0%;
          border-radius: 4px;
          transition: width 1.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .milestone {
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid var(--color-border);
          font-size: 13.5px;
          color: var(--text-muted);
        }
        .milestone strong {
          color: var(--text-primary);
          display: block;
          font-family: var(--font-mono);
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 6px;
          font-weight: 600;
        }

        /* ---------- ATS ---------- */
        .ats-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1px;
          background: var(--color-border);
          border: 1px solid var(--color-border);
          border-radius: 18px;
          overflow: hidden;
        }
        @media (max-width: 800px) {
          .ats-grid {
            grid-template-columns: 1fr;
          }
        }
        .ats-pane {
          background: var(--color-surface);
          padding: 30px;
        }
        .resume-line {
          height: 9px;
          background: var(--color-elevated);
          border-radius: 4px;
          margin-bottom: 10px;
          transform-origin: left;
          transform: scaleX(0);
          transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .resume-line.in {
          transform: scaleX(1);
        }
        .resume-line.w60 {
          width: 60%;
        }
        .resume-line.w80 {
          width: 80%;
        }
        .resume-line.w40 {
          width: 40%;
        }
        .resume-line.w95 {
          width: 95%;
        }
        .ats-score-big {
          font-family: var(--font-display);
          font-size: 44px;
          font-weight: 600;
          color: var(--mastery);
          margin-bottom: 22px;
        }
        .ats-score-big span {
          font-size: 20px;
          color: var(--text-muted);
          font-weight: 400;
        }
        .ats-metrics {
          display: flex;
          flex-direction: column;
          gap: 14px;
          margin-bottom: 22px;
        }
        .missing-kw {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .kw-chip {
          font-family: var(--font-mono);
          font-size: 11.5px;
          padding: 5px 10px;
          border-radius: 6px;
          background: var(--critical-soft);
          color: var(--critical);
          border: 1px solid rgba(244, 63, 94, 0.25);
        }

        /* ---------- GROWTH DNA ---------- */
        .dna-wrap {
          display: flex;
          justify-content: center;
        }
        .dna-wrap svg {
          width: 100%;
          max-width: 560px;
          height: auto;
        }
        .dna-node {
          animation: floatY 4.5s ease-in-out infinite;
        }

        /* ---------- WEEKLY INTEL ---------- */
        .weekly-stats {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 1px;
          background: var(--color-border);
          border: 1px solid var(--color-border);
          border-radius: 18px;
          overflow: hidden;
          margin-bottom: 1px;
        }
        @media (max-width: 800px) {
          .weekly-stats {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        .stat-cell {
          background: var(--color-surface);
          padding: 26px 20px;
          text-align: center;
          transition: background 0.25s ease;
        }
        .stat-cell:hover {
          background: var(--color-elevated);
        }
        .stat-cell .val {
          font-family: var(--font-display);
          font-size: 30px;
          font-weight: 600;
        }
        .stat-cell .lbl {
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--text-muted);
          text-transform: uppercase;
          margin-top: 6px;
          letter-spacing: 0.05em;
        }
        .insight-panel {
          background: var(--color-elevated);
          border: 1px solid var(--color-border);
          border-top: none;
          border-radius: 0 0 18px 18px;
          padding: 28px 32px;
        }
        .insight-panel .lbl {
          font-family: var(--font-mono);
          font-size: 11px;
          letter-spacing: 0.1em;
          color: var(--ai);
          text-transform: uppercase;
          margin-bottom: 14px;
        }
        .insight-panel p {
          color: var(--text-secondary);
          font-size: 15px;
          margin-bottom: 6px;
        }
        .insight-panel strong {
          color: var(--text-primary);
        }

        /* ---------- FINAL CTA ---------- */
        .final-cta {
          text-align: center;
          padding: 160px 0;
          position: relative;
        }
        .final-cta .fc-top {
          font-family: var(--font-display);
          font-size: clamp(24px, 3.4vw, 36px);
          color: var(--text-secondary);
          font-weight: 500;
          margin-bottom: 6px;
        }
        .final-cta .fc-big {
          font-family: var(--font-display);
          font-size: clamp(44px, 7vw, 92px);
          font-weight: 600;
          letter-spacing: -0.02em;
          margin-bottom: 40px;
          background: linear-gradient(100deg, var(--text-primary), var(--learning) 50%, var(--ai));
          background-size: 200% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: gradShift 5s ease-in-out infinite;
        }
        .final-cta .fc-ctas {
          display: flex;
          gap: 16px;
          justify-content: center;
          flex-wrap: wrap;
        }

        /* ---------- FOOTER ---------- */
        footer {
          border-top: 1px solid var(--color-border);
          padding: 64px 0 40px;
        }
        .footer-grid {
          display: grid;
          grid-template-columns: 1.4fr 1fr 1fr;
          gap: 40px;
          margin-bottom: 56px;
        }
        @media (max-width: 700px) {
          .footer-grid {
            grid-template-columns: 1fr;
            gap: 32px;
          }
        }
        .footer-brand .logo {
          margin-bottom: 14px;
        }
        .footer-brand p {
          color: var(--text-muted);
          font-size: 14px;
          max-width: 260px;
        }
        .footer-col h5 {
          font-family: var(--font-mono);
          font-size: 11px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text-muted);
          margin-bottom: 16px;
        }
        .footer-col a {
          display: block;
          color: var(--text-secondary);
          font-size: 14px;
          text-decoration: none;
          margin-bottom: 12px;
          transition: color 0.2s;
        }
        .footer-col a:hover {
          color: var(--text-primary);
        }
        .footer-bottom {
          border-top: 1px solid var(--color-border);
          padding-top: 28px;
          font-size: 13px;
          color: var(--text-muted);
          font-family: var(--font-mono);
        }

        /* scroll progress bar */
        #scrollbar {
          position: fixed;
          top: 0;
          left: 0;
          height: 2px;
          background: linear-gradient(90deg, var(--ai), var(--learning));
          z-index: 200;
          width: 0%;
        }

        /* back to top */
        #toTop {
          position: fixed;
          bottom: 28px;
          right: 28px;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: var(--color-elevated);
          border: 1px solid var(--color-border-strong);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 90;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.3s ease, transform 0.3s ease;
          color: var(--text-secondary);
        }
        #toTop.show {
          opacity: 1;
          pointer-events: auto;
        }
        #toTop:hover {
          transform: translateY(-3px);
          color: var(--text-primary);
          border-color: var(--ai);
        }

        @media (prefers-reduced-motion: reduce) {
          * {
            animation: none !important;
            transition: none !important;
          }
          html {
            scroll-behavior: auto;
          }
          .hero h1 .line span {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>

      {/* Landing Page DOM Structure matching mock-up perfectly */}
      <div id="curtain" ref={curtainRef}>
        <div className="mark">LOADING DAYONE</div>
      </div>
      <div id="scrollbar" ref={scrollbarRef}></div>
      <canvas id="particles" ref={canvasRef}></canvas>
      <div id="spotlight" ref={spotlightRef}></div>
      <div className="grain"></div>

      <nav id="nav" ref={navRef}>
        <div className="nav-inner">
          <div className="logo cursor-pointer flex items-center" onClick={() => navigate('/')}>
            <DayOneLogo size={28} className="mr-2.5" />
            <span className="font-headline font-bold text-lg tracking-wider">DAYONE</span>
          </div>
          <div className="nav-actions">
            <button onClick={() => navigate('/signin')} className="nav-signin bg-transparent border-none cursor-pointer">
              Sign In
            </button>
            <button onClick={() => navigate('/signup')} className="btn btn-primary">
              Start Journey
            </button>
          </div>
        </div>
      </nav>

      <div className="wrap">
        {/* HERO */}
        <section className="hero">
          <div className="container hero-grid">
            <div>
              <div className="eyebrow">
                <span className="dot"></span>ADAPTIVE LEARNING, RETHOUGHT
              </div>
              <h1>
                <span className="line">
                  <span>Build the person</span>
                </span>
                <span className="line">
                  <span>
                    you want to <span className="grad">become.</span>
                  </span>
                </span>
              </h1>
              <div className="hero-sub">One goal. One intelligent path. One day at a time.</div>
              <p className="hero-copy">
                DayOne turns your ambition into an adaptive learning journey — combining AI guidance, hands-on practice,
                real projects, and career preparation into one intelligent system.
              </p>
              <div className="hero-ctas">
                <span className="magnetic">
                  <button onClick={() => navigate('/signup')} className="btn btn-primary" data-magnetic>
                    Start Your Journey <span className="arrow">→</span>
                  </button>
                </span>
                <span className="magnetic">
                  <a href="#solution" className="btn btn-ghost" data-magnetic>
                    Explore DayOne
                  </a>
                </span>
              </div>
              <div className="hero-stats">
                <div className="hstat">
                  <div className="val" style={{ color: 'var(--ai)' }} data-count="120">
                    0
                  </div>
                  <div className="lbl">Day Journey</div>
                </div>
                <div className="hstat">
                  <div className="val" style={{ color: 'var(--learning)' }} data-count="87">
                    0
                  </div>
                  <div className="lbl">% Avg Quiz</div>
                </div>
                <div className="hstat">
                  <div className="val" style={{ color: 'var(--mastery)' }} data-count="150">
                    0
                  </div>
                  <div className="lbl">XP / Day</div>
                </div>
              </div>
            </div>

            <div className="universe">
              <svg viewBox="0 0 480 480">
                <g id="uni-lines"></g>
                <g id="uni-nodes"></g>
              </svg>
              <div className="node-tooltip" id="tooltip" ref={tooltipRef}>
                <div className="tt-title" id="tt-title">
                  RAG
                </div>
                <div className="tt-row">
                  <span>Mastery</span>
                  <span id="tt-mastery">78%</span>
                </div>
                <div className="tt-row">
                  <span>Next</span>
                  <span id="tt-next">Retrieval</span>
                </div>
                <div className="tt-row">
                  <span>Est.</span>
                  <span id="tt-est">35 min</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* MARQUEE TRUST */}
        <section className="trust" style={{ paddingTop: 0, paddingBottom: '30px' }}>
          <div className="marquee">
            <span>Learning</span>
            <span>Practice</span>
            <span>Projects</span>
            <span>Career</span>
            <span>Learning</span>
            <span>Practice</span>
            <span>Projects</span>
            <span>Career</span>
            <span>Learning</span>
            <span>Practice</span>
            <span>Projects</span>
            <span>Career</span>
          </div>
        </section>

        {/* PROBLEM */}
        <section id="solution">
          <div className="container">
            <div className="section-head reveal">
              <div className="section-eyebrow" style={{ color: 'var(--critical)' }}>
                The problem
              </div>
              <h2>
                Learning isn't the problem.
                <br />
                Knowing what to do next is.
              </h2>
            </div>
            <div className="problem-grid">
              <div className="problem-list stagger">
                <div className="problem-item">
                  <span className="mark">01</span>
                  <p>
                    <strong>Too many resources.</strong> Courses, tutorials, and articles pile up with no clear order.
                  </p>
                </div>
                <div className="problem-item">
                  <span className="mark">02</span>
                  <p>
                    <strong>No clear sequence.</strong> You don't know what to learn next, or why it matters.
                  </p>
                </div>
                <div className="problem-item">
                  <span className="mark">03</span>
                  <p>
                    <strong>No real feedback.</strong> You finish a lesson and still don't know if you actually understood it.
                  </p>
                </div>
                <div className="problem-item">
                  <span className="mark">04</span>
                  <p>
                    <strong>No accountability.</strong> Progress stalls the moment motivation dips.
                  </p>
                </div>
                <div className="problem-item">
                  <span className="mark">05</span>
                  <p>
                    <strong>Disconnected from career.</strong> Learning and getting hired feel like two separate problems.
                  </p>
                </div>
              </div>
              <div className="flow-panel reveal-r">
                <div className="flow-steps" id="flowSteps" ref={flowStepsRef}>
                  <div className="flow-step" data-i="0">
                    <div className="fnode">◎</div>
                    <div className="flabel">Your Goal</div>
                  </div>
                  <div className="flow-connector"></div>
                  <div className="flow-step" data-i="1">
                    <div className="fnode">◎</div>
                    <div className="flabel">Personalized Roadmap</div>
                  </div>
                  <div className="flow-connector"></div>
                  <div className="flow-step" data-i="2">
                    <div className="fnode">◎</div>
                    <div className="flabel">Today's Mission</div>
                  </div>
                  <div className="flow-connector"></div>
                  <div className="flow-step" data-i="3">
                    <div className="fnode">◎</div>
                    <div className="flabel">Learn → Practice → Build</div>
                  </div>
                  <div className="flow-connector"></div>
                  <div className="flow-step" data-i="4">
                    <div className="fnode">◎</div>
                    <div className="flabel">AI Feedback</div>
                  </div>
                  <div className="flow-connector"></div>
                  <div className="flow-step" data-i="5">
                    <div className="fnode">◎</div>
                    <div className="flabel">Master → Career</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ROADMAP */}
        <section id="roadmap">
          <div className="container">
            <div className="section-head reveal">
              <div className="section-eyebrow" style={{ color: 'var(--learning)' }}>
                Learning
              </div>
              <h2>Your path changes as you grow.</h2>
              <p>
                DayOne continuously adapts your roadmap based on what you know, what you struggle with, and how quickly you
                learn.
              </p>
            </div>
            <div className="roadmap-panel reveal" id="roadmapPanel" ref={roadmapPanelRef}>
              <div className="rm-node" data-i="0">
                Python
              </div>
              <div className="rm-connector"></div>
              <div className="rm-node" data-i="1">
                Programming Fundamentals
              </div>
              <div className="rm-connector"></div>
              <div className="rm-node" data-i="2">
                APIs
              </div>
              <div className="rm-connector"></div>
              <div className="rm-node" data-i="3">
                Machine Learning
              </div>
              <div className="rm-connector"></div>
              <div className="rm-node" data-i="4">
                LLMs
              </div>
              <div className="rm-connector"></div>
              <div className="rm-node" data-i="5">
                RAG
              </div>
              <div className="rm-connector"></div>
              <div className="rm-node" data-i="6">
                Agents
              </div>
              <div className="rm-connector"></div>
              <div className="rm-node" data-i="7">
                AI Engineer
              </div>
            </div>
          </div>
        </section>

        {/* AI MENTOR */}
        <section id="mentor">
          <div className="container">
            <div className="section-head reveal" style={{ marginLeft: 'auto', marginRight: 'auto', textAlign: 'center' }}>
              <div className="section-eyebrow" style={{ color: 'var(--ai)', margin: '0 auto 16px' }}>
                AI Coach
              </div>
              <h2>Your AI mentor doesn't wait for you to ask.</h2>
            </div>
            <div className="mentor-panel reveal">
              <div className="glow"></div>
              <div className="mentor-head">
                <span className="ai-dot"></span>
                <span>DayOne Intelligence</span>
              </div>
              <div className="mentor-msg" id="mentorMsg" ref={mentorMsgRef}></div>
              <span className="magnetic">
                <button onClick={() => navigate('/signup')} className="btn btn-primary" data-magnetic>
                  Review Together
                </button>
              </span>
            </div>
          </div>
        </section>

        {/* MISSION */}
        <section>
          <div className="container">
            <div className="section-head reveal" style={{ marginLeft: 'auto', marginRight: 'auto', textAlign: 'center' }}>
              <div className="section-eyebrow" style={{ color: 'var(--challenge)', margin: '0 auto 16px' }}>
                Today
              </div>
              <h2>Every day has a next step.</h2>
            </div>
            <div className="mission-panel reveal">
              <div className="mission-head">
                <span>Today's Mission</span>
                <span>3 Steps</span>
              </div>
              <div className="mission-item">
                <span className="mission-num">01</span>
                <span className="mission-tag tag-learn">Learn</span>
                <div className="mission-body">
                  <strong>RAG Fundamentals</strong>
                  <span>15 min</span>
                </div>
              </div>
              <div className="mission-item">
                <span className="mission-num">02</span>
                <span className="mission-tag tag-build">Build</span>
                <div className="mission-body">
                  <strong>Vector Search</strong>
                  <span>20 min</span>
                </div>
              </div>
              <div className="mission-item">
                <span className="mission-num">03</span>
                <span className="mission-tag tag-challenge">Challenge</span>
                <div className="mission-body">
                  <strong>Retrieval Exercise</strong>
                  <span>12 min</span>
                </div>
              </div>
              <div className="mission-footer">
                <span className="xp">
                  <span className="count" data-count="150" data-suffix=" XP" data-prefix="+">
                    0 XP
                  </span>
                </span>
                <span className="magnetic">
                  <button onClick={() => navigate('/signup')} className="btn btn-primary" data-magnetic>
                    Begin Mission <span className="arrow">→</span>
                  </button>
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* LAB */}
        <section>
          <div className="container">
            <div className="section-head reveal">
              <div className="section-eyebrow" style={{ color: 'var(--learning)' }}>
                Learning Lab
              </div>
              <h2>Don't just learn code. Build with it.</h2>
            </div>
            <div className="lab-grid reveal">
              <div className="lab-pane">
                <div className="lab-pane-title">Code Editor</div>
                <div className="code-line">
                  <span className="kw">def</span> <span className="fn">find_duplicates</span>(nums):
                  <br />
                  &nbsp;&nbsp;&nbsp;&nbsp;seen = []
                  <br />
                  &nbsp;&nbsp;&nbsp;&nbsp;<span className="kw">for</span> n <span className="kw">in</span> nums:
                  <br />
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="kw">if</span> n <span className="kw">in</span> seen:
                  <br />
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="kw">return</span> n
                  <br />
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;seen.append(n)
                  <br />
                  &nbsp;&nbsp;&nbsp;&nbsp;<span className="kw">return</span> <span className="kw">None</span>
                </div>
              </div>
              <div className="lab-pane">
                <div className="lab-pane-title">Live Output</div>
                <div className="output-box" id="labOutput" ref={labOutputRef}></div>
              </div>
              <div className="lab-review">
                <span className="ai-badge">AI REVIEW</span>
                <p>
                  <strong>Your solution works.</strong> Complexity: O(n²) — try using a hash set to reduce the complexity to
                  O(n).
                </p>
              </div>
            </div>
            <div style={{ marginTop: '28px' }}>
              <span className="magnetic">
                <button onClick={() => navigate('/signup')} className="btn btn-ghost" data-magnetic>
                  Explore Learning Lab →
                </button>
              </span>
            </div>
          </div>
        </section>

        {/* PROJECT */}
        <section>
          <div className="container">
            <div className="section-head reveal">
              <div className="section-eyebrow" style={{ color: 'var(--mastery)' }}>
                Projects
              </div>
              <h2>Turn knowledge into proof.</h2>
              <p>DayOne transforms lessons into portfolio-ready projects, generated around what you've just learned.</p>
            </div>
            <div className="project-card reveal">
              <span className="project-tag">Project · Intermediate</span>
              <h3>AI Resume Analyzer</h3>
              <div className="diff">Python · FastAPI · React · LLMs</div>
              <div className="skill-chips">
                <span className="skill-chip">Python</span>
                <span className="skill-chip">FastAPI</span>
                <span className="skill-chip">React</span>
                <span className="skill-chip">LLMs</span>
              </div>
              <div className="progress-label">
                <span>Progress</span>
                <span>82%</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" id="projFill" ref={projFillRef}></div>
              </div>
              <span className="magnetic">
                <button onClick={() => navigate('/signup')} className="btn btn-primary" data-magnetic>
                  Continue Project <span className="arrow">→</span>
                </button>
              </span>
            </div>
          </div>
        </section>

        {/* TIMELINE */}
        <section>
          <div className="container">
            <div className="section-head reveal" style={{ marginLeft: 'auto', marginRight: 'auto', textAlign: 'center' }}>
              <div className="section-eyebrow" style={{ color: 'var(--mastery)', margin: '0 auto 16px' }}>
                Growth
              </div>
              <h2>See how far you've come.</h2>
            </div>
            <div className="timeline" id="timeline" ref={timelineRef}>
              <div className="tl-progress" id="tlProgress"></div>
              <div className="tl-item">
                <div className="tl-dot"></div>
                <div className="tl-day">DAY 01</div>
                <h4>Started Python</h4>
              </div>
              <div className="tl-item">
                <div className="tl-dot"></div>
                <div className="tl-day">DAY 18</div>
                <h4>Built First API</h4>
              </div>
              <div className="tl-item">
                <div className="tl-dot"></div>
                <div className="tl-day">DAY 43</div>
                <h4>Completed Machine Learning</h4>
              </div>
              <div className="tl-item">
                <div className="tl-dot"></div>
                <div className="tl-day">DAY 67</div>
                <h4>Built RAG System</h4>
              </div>
              <div className="tl-item">
                <div className="tl-dot"></div>
                <div className="tl-day">DAY 91</div>
                <h4>Portfolio Ready</h4>
              </div>
              <div className="tl-item">
                <div className="tl-dot"></div>
                <div className="tl-day">DAY 120</div>
                <h4>Interview Ready</h4>
              </div>
            </div>
          </div>
        </section>

        {/* CAREER */}
        <section id="career">
          <div className="container career-grid">
            <div className="reveal-l">
              <div className="section-eyebrow" style={{ color: 'var(--challenge)' }}>
                Career
              </div>
              <h2
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 600,
                  fontSize: 'clamp(30px,4.2vw,52px)',
                  lineHeight: 1.12,
                  letterSpacing: '-0.01em',
                  marginBottom: '24px',
                }}
              >
                Learning should lead somewhere.
              </h2>
              <div className="career-flow">
                <div className="cf-item">Skills</div>
                <div className="cf-arrow">↓</div>
                <div className="cf-item">Projects</div>
                <div className="cf-arrow">↓</div>
                <div className="cf-item">Portfolio</div>
                <div className="cf-arrow">↓</div>
                <div className="cf-item">Resume</div>
                <div className="cf-arrow">↓</div>
                <div className="cf-item">Interview</div>
                <div className="cf-arrow">↓</div>
                <div className="cf-item" style={{ color: 'var(--text-primary)' }}>
                  Career
                </div>
              </div>
              <div style={{ marginTop: '28px' }}>
                <span className="magnetic">
                  <button onClick={() => navigate('/signup')} className="btn btn-primary" data-magnetic>
                    Build Your Career Profile →
                  </button>
                </span>
              </div>
            </div>
            <div className="readiness-panel reveal-r">
              <div className="readiness-score">
                <span className="num" data-count="78">
                  0
                </span>
                <span className="lbl">/ 100 Career Readiness</span>
              </div>
              <div className="bar-row">
                <div className="bar-row-top">
                  <span>Resume</span>
                  <span>92%</span>
                </div>
                <div className="bar-track">
                  <div className="bar-fill" data-w="92"></div>
                </div>
              </div>
              <div className="bar-row">
                <div className="bar-row-top">
                  <span>Projects</span>
                  <span>81%</span>
                </div>
                <div className="bar-track">
                  <div className="bar-fill" data-w="81"></div>
                </div>
              </div>
              <div className="bar-row">
                <div className="bar-row-top">
                  <span>Skills</span>
                  <span>74%</span>
                </div>
                <div className="bar-track">
                  <div className="bar-fill" data-w="74"></div>
                </div>
              </div>
              <div className="bar-row">
                <div className="bar-row-top">
                  <span>Interview</span>
                  <span>63%</span>
                </div>
                <div className="bar-track">
                  <div className="bar-fill" data-w="63"></div>
                </div>
              </div>
              <div className="milestone">
                <strong>Next Milestone</strong>Complete 2 AI projects
              </div>
            </div>
          </div>
        </section>

        {/* ATS */}
        <section>
          <div className="container">
            <div className="section-head reveal">
              <div className="section-eyebrow" style={{ color: 'var(--critical)' }}>
                Resume
              </div>
              <h2>Built to pass the first filter.</h2>
            </div>
            <div className="ats-grid reveal">
              <div className="ats-pane">
                <div className="lab-pane-title">Resume Editor</div>
                <div className="resume-line w60"></div>
                <div className="resume-line w95"></div>
                <div className="resume-line w80"></div>
                <div className="resume-line w40"></div>
                <div className="resume-line w80"></div>
                <div className="resume-line w60"></div>
              </div>
              <div className="ats-pane">
                <div className="lab-pane-title">ATS Score</div>
                <div className="ats-score-big">
                  <span data-count="84">0</span>
                  <span>/100</span>
                </div>
                <div className="ats-metrics">
                  <div className="bar-row">
                    <div className="bar-row-top">
                      <span>Keyword Match</span>
                      <span>86%</span>
                    </div>
                    <div className="bar-track">
                      <div className="bar-fill" data-w="86"></div>
                    </div>
                  </div>
                  <div className="bar-row">
                    <div className="bar-row-top">
                      <span>Skills Match</span>
                      <span>91%</span>
                    </div>
                    <div className="bar-track">
                      <div className="bar-fill" data-w="91"></div>
                    </div>
                  </div>
                  <div className="bar-row">
                    <div className="bar-row-top">
                      <span>Formatting</span>
                      <span>95%</span>
                    </div>
                    <div className="bar-track">
                      <div className="bar-fill" data-w="95"></div>
                    </div>
                  </div>
                </div>
                <div className="lab-pane-title" style={{ marginTop: '8px' }}>
                  Missing Keywords
                </div>
                <div className="missing-kw">
                  <span className="kw-chip">AWS</span>
                  <span className="kw-chip">Kubernetes</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* GROWTH DNA */}
        <section>
          <div className="container">
            <div className="section-head reveal" style={{ marginLeft: 'auto', marginRight: 'auto', textAlign: 'center' }}>
              <div className="section-eyebrow" style={{ color: 'var(--ai)', margin: '0 auto 16px' }}>
                Growth DNA
              </div>
              <h2>Your skills become a map of who you're becoming.</h2>
            </div>
            <div className="dna-wrap reveal">
              <svg viewBox="0 0 480 340">
                <g stroke="#2A3550" strokeWidth="1.2" fill="none">
                  <path d="M240 40 L150 130" />
                  <path d="M240 40 L330 130" />
                  <path d="M150 130 L90 220" />
                  <path d="M150 130 L200 220" />
                  <path d="M330 130 L290 220" />
                  <path d="M330 130 L390 220" />
                </g>
                <g fontFamily="JetBrains Mono" fontSize="12" textAnchor="middle" fill="#94A3B8">
                  <g className="dna-node">
                    <circle cx="240" cy="40" r="20" fill="rgba(139,92,246,0.18)" stroke="#8B5CF6" strokeWidth="1.5" />
                    <text x="240" y="45" fill="#F8FAFC">
                      AI
                    </text>
                  </g>
                  <g className="dna-node" style={{ animationDelay: '.3s' }}>
                    <circle cx="150" cy="130" r="18" fill="rgba(56,189,248,0.14)" stroke="#38BDF8" strokeWidth="1.5" />
                    <text x="150" y="135" fill="#F8FAFC">
                      ML
                    </text>
                  </g>
                  <g className="dna-node" style={{ animationDelay: '.6s' }}>
                    <circle cx="330" cy="130" r="18" fill="rgba(56,189,248,0.14)" stroke="#38BDF8" strokeWidth="1.5" />
                    <text x="330" y="135" fill="#F8FAFC">
                      Coding
                    </text>
                  </g>
                  <g className="dna-node" style={{ animationDelay: '.9s' }}>
                    <circle cx="90" cy="220" r="15" fill="rgba(52,211,153,0.14)" stroke="#34D399" strokeWidth="1.5" />
                    <text x="90" y="225" fill="#F8FAFC">
                      NLP
                    </text>
                  </g>
                  <g className="dna-node" style={{ animationDelay: '1.2s' }}>
                    <circle cx="200" cy="220" r="15" fill="#151E2F" stroke="#2A3550" strokeWidth="1.5" />
                    <text x="200" y="225">
                      DL
                    </text>
                  </g>
                  <g className="dna-node" style={{ animationDelay: '1.5s' }}>
                    <circle cx="290" cy="220" r="15" fill="rgba(52,211,153,0.14)" stroke="#34D399" strokeWidth="1.5" />
                    <text x="290" y="225" fill="#F8FAFC">
                      DSA
                    </text>
                  </g>
                  <g className="dna-node" style={{ animationDelay: '1.8s' }}>
                    <circle cx="390" cy="220" r="15" fill="#151E2F" stroke="#2A3550" strokeWidth="1.5" />
                    <text x="390" y="225">
                      Web
                    </text>
                  </g>
                </g>
              </svg>
            </div>
          </div>
        </section>

        {/* WEEKLY INTEL */}
        <section>
          <div className="container">
            <div className="section-head reveal" style={{ marginLeft: 'auto', marginRight: 'auto', textAlign: 'center' }}>
              <div className="section-eyebrow" style={{ color: 'var(--learning)', margin: '0 auto 16px' }}>
                Your Week
              </div>
              <h2>Know what you're improving.</h2>
            </div>
            <div className="reveal">
              <div className="weekly-stats">
                <div className="stat-cell">
                  <div className="val" style={{ color: 'var(--learning)' }}>
                    12h 42m
                  </div>
                  <div className="lbl">Study Time</div>
                </div>
                <div className="stat-cell">
                  <div className="val" data-count="18">
                    0
                  </div>
                  <div className="lbl">Lessons</div>
                </div>
                <div className="stat-cell">
                  <div className="val" style={{ color: 'var(--challenge)' }} data-count="14">
                    0
                  </div>
                  <div className="lbl">Challenges</div>
                </div>
                <div className="stat-cell">
                  <div className="val" style={{ color: 'var(--mastery)' }} data-count="2">
                    0
                  </div>
                  <div className="lbl">Projects</div>
                </div>
                <div className="stat-cell">
                  <div className="val" style={{ color: 'var(--ai)' }} data-count="87" data-suffix="%">
                    0
                  </div>
                  <div className="lbl">Quiz Avg</div>
                </div>
              </div>
              <div className="insight-panel">
                <div className="lbl">DayOne Insight</div>
                <p>
                  Your strongest area is <strong>Python</strong>.
                </p>
                <p>
                  Your weakest area is <strong>Recursion</strong>.
                </p>
                <p>
                  Recommended focus next week: <strong>Dynamic Programming fundamentals.</strong>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="final-cta">
          <div className="container reveal">
            <div className="fc-top">Your future doesn't start someday.</div>
            <div className="fc-big">It starts on DayOne.</div>
            <div className="fc-ctas">
              <span className="magnetic">
                <button onClick={() => navigate('/signup')} className="btn btn-primary" data-magnetic>
                  Start Your Journey <span className="arrow">→</span>
                </button>
              </span>
              <span className="magnetic">
                <button onClick={() => navigate('/signup')} className="btn btn-ghost" data-magnetic>
                  Explore the Platform
                </button>
              </span>
            </div>
          </div>
        </section>

        <footer>
          <div className="container">
            <div className="footer-grid">
              <div className="footer-brand">
                <div className="logo">
                  <span className="logo-mark"></span>DAYONE
                </div>
                <p>Learn with purpose. Build with confidence.</p>
              </div>
              <div className="footer-col">
                <h5>Product</h5>
                <a href="#roadmap">Learning</a>
                <a href="#mentor">AI Coach</a>
                <a href="#career">Career</a>
              </div>
              <div className="footer-col">
                <h5>Company</h5>
                <a href="#">About</a>
                <a href="#">Contact</a>
                <a href="#">Privacy</a>
                <a href="#">Terms</a>
              </div>
            </div>
            <div className="footer-bottom">© 2026 DayOne</div>
          </div>
        </footer>
      </div>

      <div id="toTop" ref={toTopRef}>
        ↑
      </div>
    </>
  );
};
