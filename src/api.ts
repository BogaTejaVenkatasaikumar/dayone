/**
 * DayOne API service layer — Clerk edition
 *
 * Token is fetched from Clerk on every request via the getToken function
 * injected from AuthContext. No tokens are stored in memory or localStorage.
 */

// Global token getter — set by AuthContext after Clerk loads
let _getToken: (() => Promise<string | null>) | null = null;

// Token caching & deduplication to optimize speed
let cachedToken: string | null = null;
let tokenExpiry = 0;
let pendingTokenPromise: Promise<string | null> | null = null;

// In production, VITE_API_URL points to the deployed Express backend (e.g. https://dayone-api.onrender.com).
// In development, Vite's proxy forwards /api → localhost:3001 so BASE_URL stays empty.
const BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://dayone-k48l.onrender.com' : '');

export function setTokenGetter(fn: () => Promise<string | null>) {
  _getToken = fn;
  // Clear cache on re-register (e.g. sign-in state changes)
  cachedToken = null;
  tokenExpiry = 0;
  pendingTokenPromise = null;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (_getToken) {
    let token: string | null = null;

    if (pendingTokenPromise) {
      // Deduplicate concurrent token requests
      token = await pendingTokenPromise;
    } else if (cachedToken && Date.now() < tokenExpiry) {
      // Use cached token
      token = cachedToken;
    } else {
      // Request new token
      try {
        pendingTokenPromise = _getToken();
        token = await pendingTokenPromise;
        
        if (token) {
          cachedToken = token;
          tokenExpiry = Date.now() + 50000; // cache for 50 seconds (Clerk tokens default to 60s lifetime)
        }
      } catch (err) {
        console.error('Failed to retrieve Clerk token:', err);
      } finally {
        pendingTokenPromise = null;
      }
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return headers;
}

async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = await getAuthHeaders();
  return fetch(`${BASE_URL}${url}`, {
    ...options,
    headers: { ...headers, ...(options.headers as Record<string, string> || {}) },
    credentials: 'include',
  });
}

// --- Auth API ---
export const authApi = {
  async getMe() {
    const res = await apiFetch('/api/auth/me');
    if (!res.ok) return null;
    return res.json();
  },

  async logout() {
    await apiFetch('/api/auth/logout', { method: 'POST' });
  },

  // Legacy shims — kept so any component referencing these won't crash
  async login() { return { ok: false, data: { error: 'Use Clerk sign-in' } }; },
  async register() { return { ok: false, data: { error: 'Use Clerk sign-up' } }; },
  isLoggedIn() { return !!_getToken; },
  setToken(_token: string | null) { /* no-op: Clerk manages tokens */ },
};

// --- User API ---
export const userApi = {
  async getProfile() {
    const res = await apiFetch('/api/user/profile');
    if (!res.ok) throw new Error('Failed to load profile');
    return res.json();
  },

  async updateProfile(data: { name?: string; avatar_url?: string }) {
    const res = await apiFetch('/api/user/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return { ok: res.ok, data: await res.json() };
  },

  async setGoal(goal: string) {
    const res = await apiFetch('/api/user/goal', {
      method: 'POST',
      body: JSON.stringify({ goal, confirmReset: true }),
    });
    return { ok: res.ok, data: await res.json() };
  },

  async suggestGoal(description: string): Promise<{ suggestedGoal: string; explanation: string }> {
    const res = await apiFetch('/api/user/suggest-goal', {
      method: 'POST',
      body: JSON.stringify({ description }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to suggest goal');
    }
    return res.json();
  },
};

// --- Roadmap API ---
export const roadmapApi = {
  async getAll() {
    const res = await apiFetch('/api/roadmap');
    if (!res.ok) throw new Error('Failed to load roadmap');
    return res.json();
  },

  async getStuckHelp(dayId: string) {
    const res = await apiFetch(`/api/roadmap/${dayId}/stuck`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to get stuck help');
    return res.json();
  },

  async createRoadmap(goal: string): Promise<{ jobId: string; status: string }> {
    const res = await apiFetch('/api/roadmaps', {
      method: 'POST',
      body: JSON.stringify({ goal }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to start roadmap generation');
    }
    return res.json();
  },

  async getJobStatus(jobId: string): Promise<{
    jobId: string;
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
    roadmapId?: string;
    error?: string;
  }> {
    const res = await apiFetch(`/api/roadmaps/jobs/${jobId}`);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to check job status');
    }
    return res.json();
  },
};

// --- Progress API ---
export const progressApi = {
  async get() {
    const res = await apiFetch('/api/progress');
    if (!res.ok) throw new Error('Failed to load progress');
    return res.json();
  },

  async completeDay(dayId: string) {
    const res = await apiFetch('/api/progress/complete-day', {
      method: 'POST',
      body: JSON.stringify({ day_id: dayId }),
    });
    return { ok: res.ok, data: await res.json() };
  },

  async getBadges() {
    const res = await apiFetch('/api/progress/badges');
    if (!res.ok) throw new Error('Failed to load badges');
    return res.json();
  },
};

// --- Resources API ---
export const resourcesApi = {
  async getAll() {
    const res = await apiFetch('/api/resources');
    if (!res.ok) throw new Error('Failed to load resources');
    return res.json();
  },

  async search(query: string) {
    const res = await apiFetch(`/api/resources/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error('Search failed');
    return res.json();
  },
};

// --- Advice API ---
export const adviceApi = {
  async get() {
    const res = await apiFetch('/api/advice');
    if (!res.ok) throw new Error('Failed to load advice');
    return res.json();
  },
};

// --- Career & Assessment API ---
export const onboardingApi = {
  async assessCareer(answers: { q1: string; q2: string; q3: string; q4: string; q5: string }) {
    const res = await apiFetch('/api/user/assess', {
      method: 'POST',
      body: JSON.stringify({ answers })
    });
    return { ok: res.ok, data: await res.json() };
  },

  async adaptRoadmap(feedback: string) {
    const res = await apiFetch('/api/user/roadmap/adapt', {
      method: 'POST',
      body: JSON.stringify({ feedback })
    });
    return { ok: res.ok, data: await res.json() };
  }
};

// --- Daily Planner API ---
export const plannerApi = {
  async getAll(date?: string) {
    const query = date ? `?date=${date}` : '';
    const res = await apiFetch(`/api/planner${query}`);
    if (!res.ok) throw new Error('Failed to load planner items');
    return res.json();
  },

  async create(title: string, scheduledTime: string, date?: string) {
    const res = await apiFetch('/api/planner', {
      method: 'POST',
      body: JSON.stringify({ title, scheduled_time: scheduledTime, date })
    });
    return { ok: res.ok, data: await res.json() };
  },

  async toggle(id: string, isCompleted: boolean) {
    const res = await apiFetch(`/api/planner/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ is_completed: isCompleted })
    });
    return res.ok;
  },

  async delete(id: string) {
    const res = await apiFetch(`/api/planner/${id}`, { method: 'DELETE' });
    return res.ok;
  }
};

// --- AI Chat API ---
export const chatApi = {
  async getHistory() {
    const res = await apiFetch('/api/chat/history');
    if (!res.ok) throw new Error('Failed to load chat history');
    return res.json();
  },

  async sendMessage(message: string) {
    const res = await apiFetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message })
    });
    return { ok: res.ok, data: await res.json() };
  }
};

// --- Projects API ---
export const projectsApi = {
  async getAll() {
    const res = await apiFetch('/api/projects');
    if (!res.ok) throw new Error('Failed to load projects');
    return res.json();
  },

  async generate(dayId: string, difficulty?: string) {
    const res = await apiFetch('/api/projects/generate', {
      method: 'POST',
      body: JSON.stringify({ day_id: dayId, difficulty })
    });
    return { ok: res.ok, data: await res.json() };
  },

  async submit(projectId: string, submissionUrl: string) {
    const res = await apiFetch('/api/projects/submit', {
      method: 'POST',
      body: JSON.stringify({ project_id: projectId, submission_url: submissionUrl })
    });
    return res.ok;
  },

  async evaluate(projectId: string) {
    const res = await apiFetch('/api/projects/evaluate', {
      method: 'POST',
      body: JSON.stringify({ project_id: projectId })
    });
    return { ok: res.ok, data: await res.json() };
  }
};

// --- Assignments API ---
export const assignmentsApi = {
  async getAll() {
    const res = await apiFetch('/api/assignments');
    if (!res.ok) throw new Error('Failed to load assignments');
    return res.json();
  },

  async generate(dayId: string) {
    const res = await apiFetch('/api/assignments/generate', {
      method: 'POST',
      body: JSON.stringify({ day_id: dayId })
    });
    return { ok: res.ok, data: await res.json() };
  },

  async submit(assignmentId: string, answers: any) {
    const res = await apiFetch('/api/assignments/submit', {
      method: 'POST',
      body: JSON.stringify({ assignment_id: assignmentId, answers })
    });
    return { ok: res.ok, data: await res.json() };
  }
};

// --- Mock Interviews API ---
export const interviewsApi = {
  async getActive() {
    const res = await apiFetch('/api/interviews/active');
    if (!res.ok) throw new Error('Failed to load active interview');
    return res.json();
  },

  async start(roleName: string) {
    const res = await apiFetch('/api/interviews/start', {
      method: 'POST',
      body: JSON.stringify({ role_name: roleName })
    });
    return { ok: res.ok, data: await res.json() };
  },

  async answer(interviewId: string, answer: string) {
    const res = await apiFetch('/api/interviews/answer', {
      method: 'POST',
      body: JSON.stringify({ interview_id: interviewId, answer })
    });
    return { ok: res.ok, data: await res.json() };
  }
};

// --- Voice (ElevenLabs TTS) API ---
export const voiceApi = {
  /** Convert text to speech via server proxy. Returns an audio Blob. */
  async textToSpeech(text: string, voiceId?: string): Promise<Blob | null> {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${BASE_URL}/api/voice/tts`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ text, voice_id: voiceId }),
      });
      if (!res.ok) return null;
      return await res.blob();
    } catch {
      return null;
    }
  },

  /** Fetch available ElevenLabs voices */
  async getVoices() {
    const res = await apiFetch('/api/voice/voices');
    if (!res.ok) throw new Error('Failed to load voices');
    return res.json();
  },
};

// --- Community API ---
export const communityApi = {
  async getPosts(channel: string) {
    const res = await apiFetch(`/api/community/posts?channel=${channel}`);
    if (!res.ok) throw new Error('Failed to load community posts');
    return res.json();
  },

  async createPost(title: string, content: string, channel: string) {
    const res = await apiFetch('/api/community/posts', {
      method: 'POST',
      body: JSON.stringify({ title, content, channel })
    });
    return { ok: res.ok, data: await res.json() };
  },

  async likePost(postId: string) {
    const res = await apiFetch(`/api/community/posts/${postId}/like`, { method: 'POST' });
    return res.ok;
  },

  async reply(postId: string, content: string) {
    const res = await apiFetch(`/api/community/posts/${postId}/reply`, {
      method: 'POST',
      body: JSON.stringify({ content })
    });
    return { ok: res.ok, data: await res.json() };
  }
};

// --- Dashboards API ---
export const dashboardsApi = {
  async getInstitution() {
    const res = await apiFetch('/api/dashboards/institution');
    if (!res.ok) throw new Error('Failed to load institution dashboard');
    return res.json();
  },

  async getTeacherStudents() {
    const res = await apiFetch('/api/dashboards/teacher/students');
    if (!res.ok) throw new Error('Failed to load teacher students');
    return res.json();
  },

  async gradeProject(submissionId: string, score: number, feedback: string) {
    const res = await apiFetch('/api/dashboards/teacher/grade-project', {
      method: 'POST',
      body: JSON.stringify({ submission_id: submissionId, score, feedback })
    });
    return res.ok;
  },

  async getParentStudent(email: string) {
    const res = await apiFetch(`/api/dashboards/parent/student?email=${encodeURIComponent(email)}`);
    if (!res.ok) throw new Error('Failed to load parent student info');
    return res.json();
  },

  async parentMotivate(studentId: string, parentName: string, message: string) {
    const res = await apiFetch('/api/dashboards/parent/motivate', {
      method: 'POST',
      body: JSON.stringify({ student_id: studentId, parent_name: parentName, message })
    });
    return res.ok;
  }
};

// --- Internship Finder API ---
export const internshipsApi = {
  async getAll() {
    const res = await apiFetch('/api/internships');
    if (!res.ok) throw new Error('Failed to load internships');
    return res.json();
  },

  async apply(jobId: string) {
    const res = await apiFetch(`/api/internships/${jobId}/apply`, { method: 'POST' });
    return { ok: res.ok, data: await res.json() };
  }
};

// --- Notifications & Proactive AI Mentor API ---
export const notificationsApi = {
  async getAll() {
    const res = await apiFetch('/api/notifications');
    if (!res.ok) throw new Error('Failed to load notifications');
    return res.json();
  },

  async readAll() {
    const res = await apiFetch('/api/notifications/read-all', { method: 'POST' });
    return res.ok;
  },

  async getMentorAlerts() {
    const res = await apiFetch('/api/notifications/mentor-alerts');
    if (!res.ok) throw new Error('Failed to load mentor alerts');
    return res.json();
  },

  async dismissMentorAlert(id: string) {
    const res = await apiFetch(`/api/notifications/mentor-alerts/${id}/dismiss`, { method: 'POST' });
    return res.ok;
  }
};
