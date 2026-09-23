const API = {
  getToken() {
    return localStorage.getItem('reclamos_token');
  },

  setToken(token) {
    localStorage.setItem('reclamos_token', token);
  },

  getUser() {
    const userStr = localStorage.getItem('reclamos_user');
    try {
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  },

  setUser(user) {
    localStorage.setItem('reclamos_user', JSON.stringify(user));
  },

  logout() {
    localStorage.removeItem('reclamos_token');
    localStorage.removeItem('reclamos_user');
    window.location.reload();
  },

  async request(endpoint, options = {}) {
    const headers = options.headers || {};
    const token = this.getToken();

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const config = {
      ...options,
      headers
    };

    try {
      const res = await fetch(`/api${endpoint}`, config);

      if (res.status === 401) {

        this.logout();
        throw new Error('Sesión expirada. Por favor vuelva a iniciar sesión.');
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Error en la petición' }));
        throw new Error(errorData.error || `Error ${res.status}: ${res.statusText}`);
      }

      if (headers['Accept'] === 'application/pdf' || options.isBlob) {
        return res.blob();
      }

      return await res.json();
    } catch (error) {
      console.error(`Error en API [${endpoint}]:`, error);
      throw error;
    }
  },

  get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  },

  post(endpoint, body) {
    return this.request(endpoint, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body)
    });
  },

  put(endpoint, body) {
    return this.request(endpoint, {
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body)
    });
  },

  patch(endpoint, body) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: body instanceof FormData ? body : JSON.stringify(body)
    });
  },

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
};
