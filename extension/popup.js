const config = window.JOBCLIP_CONFIG || {};
const sessionKey = 'jobclip_supabase_session';
let currentJob = null;
let currentSession = null;

const els = {
  signedOut: document.getElementById('signedOut'),
  signedIn: document.getElementById('signedIn'),
  signInButton: document.getElementById('signInButton'),
  signOutButton: document.getElementById('signOutButton'),
  saveButton: document.getElementById('saveButton'),
  dashboardLink: document.getElementById('dashboardLink'),
  status: document.getElementById('status'),
  preview: document.getElementById('preview'),
  company: document.getElementById('company'),
  roleTitle: document.getElementById('roleTitle'),
  location: document.getElementById('location'),
  sourcePlatform: document.getElementById('sourcePlatform'),
  description: document.getElementById('description'),
};

function requireConfig() {
  if (!config.SUPABASE_URL || !config.SUPABASE_ANON_KEY) {
    throw new Error('Copy extension/config.example.js to extension/config.js and add your Supabase URL and anon key.');
  }
}

function setStatus(message, type = '') {
  els.status.textContent = message;
  els.status.className = `status ${type}`.trim();
}

async function storageGet(key) {
  return chrome.storage.local.get(key).then((result) => result[key]);
}

async function storageSet(value) {
  return chrome.storage.local.set(value);
}

async function storageRemove(key) {
  return chrome.storage.local.remove(key);
}

async function supabaseFetch(path, options = {}) {
  requireConfig();
  const response = await fetch(`${config.SUPABASE_URL}${path}`, {
    ...options,
    headers: {
      apikey: config.SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(data?.msg || data?.message || data?.error_description || response.statusText);
  return data;
}

async function refreshSession(session) {
  if (!session?.refresh_token) return null;
  const data = await supabaseFetch('/auth/v1/token?grant_type=refresh_token', {
    method: 'POST',
    body: JSON.stringify({ refresh_token: session.refresh_token }),
  });
  await storageSet({ [sessionKey]: data });
  return data;
}

async function getSession() {
  const session = await storageGet(sessionKey);
  if (!session?.access_token) return null;
  const expiresAtMs = (session.expires_at || 0) * 1000;
  if (expiresAtMs && expiresAtMs < Date.now() + 60000) return refreshSession(session);
  return session;
}

function randomString(length = 64) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => ('0' + (byte % 36).toString(36)).slice(-1)).join('');
}

async function sha256Base64Url(value) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return btoa(String.fromCharCode(...new Uint8Array(hash))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function signIn() {
  try {
    requireConfig();
    const redirectUri = chrome.identity.getRedirectURL('auth');
    const verifier = randomString();
    const challenge = await sha256Base64Url(verifier);
    const authUrl = new URL(`${config.SUPABASE_URL}/auth/v1/authorize`);
    authUrl.searchParams.set('provider', 'google');
    authUrl.searchParams.set('redirect_to', redirectUri);
    authUrl.searchParams.set('code_challenge', challenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');

    const callbackUrl = await chrome.identity.launchWebAuthFlow({ url: authUrl.toString(), interactive: true });
    const code = new URL(callbackUrl).searchParams.get('code');
    if (!code) throw new Error('Google sign-in did not return an authorization code.');

    const session = await supabaseFetch('/auth/v1/token?grant_type=pkce', {
      method: 'POST',
      body: JSON.stringify({ auth_code: code, code_verifier: verifier }),
    });
    await storageSet({ [sessionKey]: session });
    await init();
  } catch (error) {
    showSignedOut();
    alert(error.message);
  }
}

async function signOut() {
  if (currentSession?.access_token) {
    await supabaseFetch('/auth/v1/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${currentSession.access_token}` },
    }).catch(() => null);
  }
  await storageRemove(sessionKey);
  showSignedOut();
}

function showSignedOut() {
  els.signedOut.classList.remove('hidden');
  els.signedIn.classList.add('hidden');
}

function showSignedIn() {
  els.signedOut.classList.add('hidden');
  els.signedIn.classList.remove('hidden');
}

async function extractFromActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error('No active tab found.');
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['extractors.js'],
  });
  const [{ result: job }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => window.JobClipExtractors.extract(),
  });
  return job || result;
}

function renderPreview(job) {
  els.company.textContent = job.company || 'Unknown';
  els.roleTitle.textContent = job.role_title || 'Untitled role';
  els.location.textContent = job.location || '—';
  els.sourcePlatform.textContent = job.source_platform || '—';
  els.description.textContent = job.job_description ? `${job.job_description.slice(0, 420)}${job.job_description.length > 420 ? '…' : ''}` : '—';
  els.preview.classList.remove('hidden');
}

async function saveJob() {
  try {
    els.saveButton.disabled = true;
    setStatus('Saving job…');
    const user = currentSession.user;
    if (!user?.id) throw new Error('Missing authenticated user. Please sign in again.');
    const payload = { ...currentJob, user_id: user.id, capture_method: 'chrome_extension' };
    await supabaseFetch('/rest/v1/jobs', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${currentSession.access_token}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(payload),
    });
    setStatus('Saved to JobClip.', 'success');
  } catch (error) {
    setStatus(error.message, 'error');
  } finally {
    els.saveButton.disabled = false;
  }
}

async function init() {
  els.dashboardLink.href = config.DASHBOARD_URL || 'http://localhost:3000';
  try {
    currentSession = await getSession();
    if (!currentSession) {
      showSignedOut();
      return;
    }
    showSignedIn();
    setStatus('Extracting visible job details…');
    currentJob = await extractFromActiveTab();
    renderPreview(currentJob);
    setStatus('Review the preview, then save.');
  } catch (error) {
    showSignedIn();
    setStatus(error.message, 'error');
  }
}

els.signInButton.addEventListener('click', signIn);
els.signOutButton.addEventListener('click', signOut);
els.saveButton.addEventListener('click', saveJob);
init();
