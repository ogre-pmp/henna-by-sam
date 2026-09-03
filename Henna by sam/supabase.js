/* ===================================================
   HENNA BY SAM — supabase.js
   Unified Supabase SDK Client + REST Helpers + Auth Lifecycle
   =================================================== */

/* ─── Configuration ─── */
var SUPABASE_URL      = 'https://wqiqinnadiglgobouunh.supabase.co';
var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndxaXFpbm5hZGlnbGdvYm91dW5oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxNDYzNzEsImV4cCI6MjEwMjcyMjM3MX0.lO1x3lMWPpeYv9Rnb3gHBSASTB_whW7m9B3sWKDAsf0';

/* ─── Initialize Unified Browser Supabase Client ─── */
var sbInstance = null;
if (typeof supabase !== 'undefined' && supabase.createClient) {
  try {
    sbInstance = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storageKey: 'hbs-master-auth-session',
      },
    });
  } catch (e) {
    console.error('Failed to initialize official Supabase client:', e);
  }
}

/* ─── Supabase Client & REST API Helper ─── */
var SupabaseClient = {

  client: sbInstance,

  /* ── Auth Lifecycle methods ── */

  signIn: function (email, password) {
    if (this.client) {
      return this.client.auth.signInWithPassword({ email: email, password: password })
        .then(function (res) {
          if (res.error) return { data: null, error: res.error };
          return { data: res.data.session, error: null };
        });
    }
    /* Fallback if SDK CDN not loaded */
    return fetch(SUPABASE_URL + '/auth/v1/token?grant_type=password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
      body: JSON.stringify({ email: email, password: password }),
    }).then(function (res) {
      return res.json().then(function (json) {
        if (res.ok) return { data: json, error: null };
        return { data: null, error: json };
      });
    }).catch(function (err) {
      return { data: null, error: { message: err.message } };
    });
  },

  signOut: function () {
    if (this.client) {
      return this.client.auth.signOut().then(function (res) {
        return { error: res.error || null };
      });
    }
    return Promise.resolve({ error: null });
  },

  getSession: function () {
    if (this.client) {
      return this.client.auth.getSession().then(function (res) {
        if (res.error) return { data: null, error: res.error };
        return { data: res.data.session, error: null };
      });
    }
    return Promise.resolve({ data: null, error: null });
  },

  onAuthStateChange: function (callback) {
    if (this.client) {
      return this.client.auth.onAuthStateChange(callback);
    }
    return { data: { subscription: { unsubscribe: function () {} } } };
  },

  /*
   * Resolves to a valid, fresh access_token.
   * Auto-refreshes if near expiry or expired.
   */
  getValidToken: function () {
    if (!this.client) return Promise.resolve(null);
    return this.client.auth.getSession().then(function (res) {
      if (res.error || !res.data || !res.data.session) {
        return null;
      }
      var session = res.data.session;
      var now = Math.floor(Date.now() / 1000);
      var expiresAt = session.expires_at || 0;
      /* If token expires within 90s, force refresh */
      if (expiresAt && (expiresAt - now) < 90) {
        return SupabaseClient.client.auth.refreshSession().then(function (refRes) {
          if (refRes.error || !refRes.data || !refRes.data.session) {
            return null;
          }
          return refRes.data.session.access_token;
        }).catch(function () {
          return null;
        });
      }
      return session.access_token;
    }).catch(function () {
      return null;
    });
  },

  /* ── Internal: build auth headers ── */
  _headers: function (token) {
    var h = {
      'Content-Type':  'application/json',
      'apikey':        SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + (token || SUPABASE_ANON_KEY),
    };
    return h;
  },

  /*
   * Robust REST request wrapper with auto-token resolution and 401 retry
   */
  _request: function (url, options, token) {
    var self = this;
    /* Always resolve freshest valid token from Supabase Auth when client is available */
    var resolveTokenP = (self.client && typeof self.client.auth !== 'undefined')
      ? self.getValidToken()
      : Promise.resolve(token || null);

    return resolveTokenP.then(function (validToken) {
      var headers = Object.assign({}, options.headers || {}, self._headers(validToken || token));
      var reqOptions = Object.assign({}, options, { headers: headers });

      return fetch(url, reqOptions).then(function (res) {
        if (res.ok) {
          if (options.preferMinimal) return { data: true, error: null };
          return res.json().then(function (data) {
            return { data: data, error: null };
          }).catch(function () {
            return { data: true, error: null };
          });
        }

        return res.json().then(function (json) {
          var isJwtError = (res.status === 401) ||
                           (json && json.code === 'PGRST301') ||
                           (json && json.message && (json.message.includes('JWT') || json.message.includes('expired')));

          if (isJwtError && self.client) {
            /* Attempt on-demand token refresh and retry */
            return self.client.auth.refreshSession().then(function (refRes) {
              if (refRes.data && refRes.data.session) {
                var newToken = refRes.data.session.access_token;
                var retryHeaders = Object.assign({}, options.headers || {}, self._headers(newToken));
                return fetch(url, Object.assign({}, options, { headers: retryHeaders })).then(function (retryRes) {
                  if (retryRes.ok) {
                    if (options.preferMinimal) return { data: true, error: null };
                    return retryRes.json().then(function (data) { return { data: data, error: null }; });
                  }
                  return retryRes.json().then(function (retryJson) {
                    return { data: null, error: retryJson };
                  });
                });
              }

              /* Refresh failed: session expired */
              if (typeof window !== 'undefined' && window.dispatchEvent) {
                window.dispatchEvent(new CustomEvent('hbs-session-expired'));
              }
              return { data: null, error: { message: 'Session expired — please sign in again', code: 'AUTH_EXPIRED' } };
            });
          }

          return { data: null, error: json };
        }).catch(function () {
          return { data: null, error: { message: 'Request failed (HTTP ' + res.status + ')' } };
        });
      }).catch(function (err) {
        return { data: null, error: { message: err.message } };
      });
    });
  },

  /*
   * Insert a row into a table via the Supabase REST API.
   */
  insert: function (table, row, token) {
    var url = SUPABASE_URL + '/rest/v1/' + table;
    return this._request(url, {
      method: 'POST',
      body: JSON.stringify(row),
      preferMinimal: true,
      headers: { 'Prefer': 'return=minimal' }
    }, token);
  },

  /*
   * Select rows from a table.
   * options: { filter, order, limit }
   */
  select: function (table, options, token) {
    options = options || {};
    var url = SUPABASE_URL + '/rest/v1/' + table + '?select=*';
    if (options.filter)  url += '&' + options.filter;
    if (options.order)   url += '&order=' + options.order;
    if (options.limit)   url += '&limit=' + options.limit;

    return this._request(url, {
      method: 'GET',
      headers: { 'Prefer': 'return=representation' }
    }, token);
  },

  /*
   * Select rows with arbitrary PostgREST filter params.
   * where : object  e.g. { enquiry_id: 'eq.5', payment_type: 'neq.refund' }
   * options: { order, limit }
   */
  selectWhere: function (table, where, options, token) {
    var params = ['select=*'];
    Object.keys(where || {}).forEach(function (k) {
      params.push(encodeURIComponent(k) + '=' + encodeURIComponent(where[k]));
    });
    options = options || {};
    if (options.order) params.push('order=' + encodeURIComponent(options.order));
    if (options.limit) params.push('limit=' + options.limit);
    var url = SUPABASE_URL + '/rest/v1/' + table + '?' + params.join('&');

    return this._request(url, {
      method: 'GET',
      headers: { 'Prefer': 'return=representation' }
    }, token);
  },

  /*
   * Insert a row and return the created record (with generated id).
   */
  insertReturning: function (table, row, token) {
    var url = SUPABASE_URL + '/rest/v1/' + table;
    return this._request(url, {
      method: 'POST',
      body: JSON.stringify(row),
      headers: { 'Prefer': 'return=representation' }
    }, token);
  },

  /*
   * Update a row by id.
   */
  update: function (table, id, updates, token) {
    updates.updated_at = new Date().toISOString();
    var url = SUPABASE_URL + '/rest/v1/' + table + '?id=eq.' + encodeURIComponent(id);
    return this._request(url, {
      method: 'PATCH',
      body: JSON.stringify(updates),
      headers: { 'Prefer': 'return=representation' }
    }, token);
  },

  /*
   * Delete a row by id.
   */
  delete: function (table, id, token) {
    var url = SUPABASE_URL + '/rest/v1/' + table + '?id=eq.' + encodeURIComponent(id);
    return this._request(url, {
      method: 'DELETE'
    }, token);
  },

};
