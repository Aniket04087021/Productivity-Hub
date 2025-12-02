import { useEffect, useMemo, useState } from 'react';
import './App.css';

// Use localhost API in development, Render URL in production
const API_BASE_URL = (
  window.location.hostname === 'localhost'
    ? 'http://localhost:5000/api'
    : 'https://productivity-hub-6kaq.onrender.com/api'
).replace(/\/$/, '');
const defaultTaskForm = { title: '', description: '', priority: 'Medium', isCompleted: false };

function App() {
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [profile, setProfile] = useState(null);
  const [profileForm, setProfileForm] = useState({ name: '', email: '', password: '' });
  const [taskForm, setTaskForm] = useState(defaultTaskForm);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [filters, setFilters] = useState({ search: '', isCompleted: '', priority: '' });
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const hasToken = useMemo(() => Boolean(token), [token]);

  const setFeedback = (type, message) => {
    if (type === 'error') {
      setErrorMessage(message);
      setStatusMessage('');
    } else {
      setStatusMessage(message);
      setErrorMessage('');
    }
  };

  const authorizedRequest = async (endpoint, options = {}) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || 'Request failed');
    }
    return data;
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setFeedback('status', '');

    const endpoint = authMode === 'login' ? '/auth/login' : '/auth/signup';
    const payload =
      authMode === 'login'
        ? { email: authForm.email, password: authForm.password }
        : authForm;

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Authentication failed');
      }

      setToken(data.token);
      localStorage.setItem('token', data.token);
      setFeedback('status', authMode === 'login' ? 'Welcome back!' : 'Account created. You are now signed in.');
      setAuthForm({ name: '', email: '', password: '' });
    } catch (err) {
      setFeedback('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async () => {
    const data = await authorizedRequest('/users/profile');
    setProfile(data);
    setProfileForm({ name: data.name, email: data.email, password: '' });
  };

  const fetchTasks = async (overrideFilters) => {
    const activeFilters = overrideFilters ?? filters;
    const params = new URLSearchParams();

    if (activeFilters.search) params.append('search', activeFilters.search);
    if (activeFilters.priority) params.append('priority', activeFilters.priority);
    if (activeFilters.isCompleted !== '') params.append('isCompleted', activeFilters.isCompleted);

    const query = params.toString() ? `?${params.toString()}` : '';
    const data = await authorizedRequest(`/tasks${query}`);
    setTasks(data);
  };

  useEffect(() => {
    if (!token) {
      localStorage.removeItem('token');
      setProfile(null);
      setTasks([]);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await fetchProfile();
        await fetchTasks({});
        if (!cancelled) {
          setFeedback('status', 'Data synced successfully.');
        }
      } catch (err) {
        if (!cancelled) {
          setFeedback('error', err.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        name: profileForm.name,
        email: profileForm.email,
        ...(profileForm.password ? { password: profileForm.password } : {}),
      };

      const updated = await authorizedRequest('/users/profile', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      setProfile(updated);
      setProfileForm((prev) => ({ ...prev, password: '' }));
      setFeedback('status', 'Profile updated.');
    } catch (err) {
      setFeedback('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingTaskId) {
        await authorizedRequest(`/tasks/${editingTaskId}`, {
          method: 'PUT',
          body: JSON.stringify(taskForm),
        });
        setFeedback('status', 'Task updated.');
      } else {
        await authorizedRequest('/tasks', {
          method: 'POST',
          body: JSON.stringify(taskForm),
        });
        setFeedback('status', 'Task created.');
      }

      setTaskForm(defaultTaskForm);
      setEditingTaskId(null);
      await fetchTasks();
    } catch (err) {
      setFeedback('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskDelete = async (taskId) => {
    setLoading(true);
    try {
      await authorizedRequest(`/tasks/${taskId}`, { method: 'DELETE' });
      setFeedback('status', 'Task removed.');
      if (editingTaskId === taskId) {
        setEditingTaskId(null);
        setTaskForm(defaultTaskForm);
      }
      await fetchTasks();
    } catch (err) {
      setFeedback('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditTask = (task) => {
    setEditingTaskId(task._id);
    setTaskForm({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      isCompleted: task.isCompleted,
    });
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('token');
    setProfile(null);
    setTasks([]);
    setTaskForm(defaultTaskForm);
    setFeedback('status', 'Logged out.');
  };

  const handleFiltersSubmit = async (e) => {
    e.preventDefault();
    try {
      await fetchTasks(filters);
      setFeedback('status', 'Filters applied.');
    } catch (err) {
      setFeedback('error', err.message);
    }
  };

  const handleFiltersReset = async () => {
    const resetState = { search: '', isCompleted: '', priority: '' };
    setFilters(resetState);
    try {
      await fetchTasks(resetState);
      setFeedback('status', 'Filters cleared.');
    } catch (err) {
      setFeedback('error', err.message);
    }
  };

  const authContent = (
    <div className="auth-container card">
      <h2>Get started</h2>
      <p className="muted">Sign up or log in to manage your tasks securely.</p>

      <form onSubmit={handleAuthSubmit} className="form-grid">
        {authMode === 'signup' && (
          <label>
            <span>Name</span>
            <input
              type="text"
              value={authForm.name}
              onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
              required
            />
          </label>
        )}

        <label>
          <span>Email</span>
          <input
            type="email"
            value={authForm.email}
            onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
            required
          />
        </label>

        <label>
          <span>Password</span>
          <input
            type="password"
            minLength={6}
            value={authForm.password}
            onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
            required
          />
        </label>

        <button type="submit" className="primary-btn" disabled={loading}>
          {loading ? 'Please wait…' : authMode === 'login' ? 'Log In' : 'Create Account'}
        </button>
      </form>

      <p className="muted toggle-auth">
        {authMode === 'login' ? "Don't have an account?" : 'Already registered?'}{' '}
        <button
          type="button"
          className="link-btn"
          onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
        >
          {authMode === 'login' ? 'Sign up' : 'Log in'}
        </button>
      </p>
    </div>
  );

  const homeContent = (
    <main className="home-layout">
      <section className="home-hero">
        <h1>Stay on top of your work with Productivity Hub</h1>
        <p className="muted">
          A simple, secure task manager where you can create, update, and track everything
          you need to get done.
        </p>
        <ul className="home-list">
          <li>Organize tasks by priority and completion state.</li>
          <li>Update your profile and manage your account securely.</li>
          <li>Fast, responsive UI designed for everyday productivity.</li>
        </ul>
      </section>

      <section className="home-auth">
        {authContent}
      </section>
    </main>
  );

  const dashboardContent = (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>Welcome back, {profile?.name}</h1>
          <p className="muted">Manage your profile and keep tasks on track.</p>
        </div>
        <button className="secondary-btn" onClick={handleLogout}>
          Logout
        </button>
      </header>

      <section className="grid-2">
        <div className="card">
          <h2>Profile</h2>
          <form className="form-grid" onSubmit={handleProfileUpdate}>
            <label>
              <span>Name</span>
              <input
                type="text"
                value={profileForm.name}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, name: e.target.value }))}
                required
              />
            </label>
            <label>
              <span>Email</span>
              <input
                type="email"
                value={profileForm.email}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, email: e.target.value }))}
                required
              />
            </label>
            <label>
              <span>New Password (optional)</span>
              <input
                type="password"
                value={profileForm.password}
                minLength={6}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, password: e.target.value }))}
                placeholder="••••••••"
              />
            </label>
            <button type="submit" className="primary-btn" disabled={loading}>
              Save changes
            </button>
          </form>
        </div>

        <div className="card">
          <h2>{editingTaskId ? 'Edit task' : 'Create task'}</h2>
          <form className="form-grid" onSubmit={handleTaskSubmit}>
            <label>
              <span>Title</span>
              <input
                type="text"
                value={taskForm.title}
                onChange={(e) => setTaskForm((prev) => ({ ...prev, title: e.target.value }))}
                required
              />
            </label>
            <label>
              <span>Description</span>
              <textarea
                rows={3}
                value={taskForm.description}
                onChange={(e) => setTaskForm((prev) => ({ ...prev, description: e.target.value }))}
              />
            </label>
            <div className="split">
              <label>
                <span>Priority</span>
                <select
                  value={taskForm.priority}
                  onChange={(e) => setTaskForm((prev) => ({ ...prev, priority: e.target.value }))}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </label>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={taskForm.isCompleted}
                  onChange={(e) =>
                    setTaskForm((prev) => ({ ...prev, isCompleted: e.target.checked }))
                  }
                />
                <span>Mark as complete</span>
              </label>
            </div>
            <div className="actions-row">
              <button type="submit" className="primary-btn" disabled={loading}>
                {editingTaskId ? 'Update task' : 'Add task'}
              </button>
              {editingTaskId && (
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => {
                    setEditingTaskId(null);
                    setTaskForm(defaultTaskForm);
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      </section>

      <section className="card">
        <div className="section-header">
          <div>
            <h2>Tasks</h2>
            <p className="muted">Search, filter, update, and delete tasks below.</p>
          </div>
          <form className="filters" onSubmit={handleFiltersSubmit}>
            <input
              type="text"
              placeholder="Search..."
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
            />
            <select
              value={filters.priority}
              onChange={(e) => setFilters((prev) => ({ ...prev, priority: e.target.value }))}
            >
              <option value="">All priorities</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
            <select
              value={filters.isCompleted}
              onChange={(e) => setFilters((prev) => ({ ...prev, isCompleted: e.target.value }))}
            >
              <option value="">Any status</option>
              <option value="true">Completed</option>
              <option value="false">Open</option>
            </select>
            <button type="submit" className="secondary-btn" disabled={loading}>
              Apply
            </button>
            <button type="button" className="ghost-btn" onClick={handleFiltersReset}>
              Reset
            </button>
          </form>
        </div>

        <div className="task-list">
          {tasks.length === 0 && <p className="muted">No tasks yet. Start by creating one.</p>}
          {tasks.map((task) => (
            <article key={task._id} className={`task-card ${task.isCompleted ? 'done' : ''}`}>
              <div>
                <h3>{task.title}</h3>
                {task.description && <p className="muted">{task.description}</p>}
                <div className="tags">
                  <span className={`tag priority-${task.priority.toLowerCase()}`}>
                    {task.priority} priority
                  </span>
                  <span className={`tag state-${task.isCompleted ? 'done' : 'open'}`}>
                    {task.isCompleted ? 'Completed' : 'In progress'}
                  </span>
                </div>
              </div>
              <div className="actions-row">
                <button className="ghost-btn" onClick={() => handleEditTask(task)}>
                  Edit
                </button>
                <button className="danger-btn" onClick={() => handleTaskDelete(task._id)}>
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );

  return (
    <div className="app-shell">
      {(statusMessage || errorMessage) && (
        <div className={`feedback ${errorMessage ? 'error' : 'success'}`}>
          {errorMessage || statusMessage}
        </div>
      )}

      {!hasToken ? (
        <>
          <header className="navbar">
            <div className="navbar-brand">Productivity Hub</div>
            <div className="navbar-actions">
              <button
                type="button"
                className="ghost-btn"
                onClick={() => setAuthMode('login')}
              >
                Log in
              </button>
              <button
                type="button"
                className="primary-btn"
                onClick={() => setAuthMode('signup')}
              >
                Sign up
              </button>
            </div>
          </header>

          {homeContent}
        </>
      ) : (
        dashboardContent
      )}
    </div>
  );
}

export default App;
