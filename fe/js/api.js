const API_BASE_URL = 'http://localhost:5034/api'; // Update if your port is different

class ApiService {
    static getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };
        const token = localStorage.getItem('jwt_token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
    }

    static async handleResponse(response, endpoint) {
        if (!response.ok) {
            if (response.status === 401) {
                // Unauthorized - clear token and redirect to login
                localStorage.removeItem('jwt_token');
                // Don't auto-redirect if we're hitting the login endpoint
                if (!endpoint.includes('/auth/login')) {
                    window.location.href = '/fe/index.html';
                }
                throw new Error('Unauthorized');
            }

            const errorText = await response.text();
            try {
                const errorJson = JSON.parse(errorText);
                throw new Error(errorJson.message || errorJson.title || 'An error occurred');
            } catch (e) {
                if (e instanceof SyntaxError) {
                    throw new Error(`Server returned an invalid response (HTTP ${response.status}).`);
                }
                if (e.message && e.message !== 'An error occurred') throw e;
                throw new Error(errorText || `HTTP Error ${response.status}`);
            }
        }

        // Handle empty responses
        const text = await response.text();
        return text ? JSON.parse(text) : {};
    }

    static async get(endpoint) {
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'GET',
                headers: this.getHeaders()
            });
            return await this.handleResponse(response, endpoint);
        } catch (error) {
            console.error('API GET Error:', error);
            throw error;
        }
    }

    static async post(endpoint, data) {
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(data)
            });
            return await this.handleResponse(response, endpoint);
        } catch (error) {
            console.error('API POST Error:', error);
            throw error;
        }
    }

    static async put(endpoint, data) {
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify(data)
            });
            return await this.handleResponse(response, endpoint);
        } catch (error) {
            console.error('API PUT Error:', error);
            throw error;
        }
    }

    static async delete(endpoint) {
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'DELETE',
                headers: this.getHeaders()
            });
            return await this.handleResponse(response, endpoint);
        } catch (error) {
            console.error('API DELETE Error:', error);
            throw error;
        }
    }
}

// Utility to decode JWT token
function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        return JSON.parse(jsonPayload);
    } catch (e) {
        return null;
    }
}
