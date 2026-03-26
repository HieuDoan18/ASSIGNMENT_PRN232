document.addEventListener('DOMContentLoaded', () => {
    const loginCard = document.getElementById('loginCard');
    const registerCard = document.getElementById('registerCard');
    const forgotCard = document.getElementById('forgotCard');
    const resetCard = document.getElementById('resetCard');

    const showRegisterBtn = document.getElementById('showRegister');
    const showLoginBtn = document.getElementById('showLogin');
    const showForgotBtn = document.getElementById('showForgot');
    const backToLoginForgotBtn = document.getElementById('backToLoginForgot');
    const backToLoginResetBtn = document.getElementById('backToLoginReset');

    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const forgotForm = document.getElementById('forgotForm');
    const resetForm = document.getElementById('resetForm');

    const loginAlert = document.getElementById('loginAlert');
    const registerAlert = document.getElementById('registerAlert');
    const forgotAlert = document.getElementById('forgotAlert');
    const resetAlert = document.getElementById('resetAlert');

    // Toggle forms
    const hideAllCards = () => {
        loginCard.classList.add('hidden');
        registerCard.classList.add('hidden');
        forgotCard.classList.add('hidden');
        resetCard.classList.add('hidden');

        loginAlert.style.display = 'none';
        registerAlert.style.display = 'none';
        forgotAlert.style.display = 'none';
        resetAlert.style.display = 'none';
    };

    showRegisterBtn.addEventListener('click', () => { hideAllCards(); registerCard.classList.remove('hidden'); });
    showLoginBtn.addEventListener('click', () => { hideAllCards(); loginCard.classList.remove('hidden'); });
    showForgotBtn.addEventListener('click', () => { hideAllCards(); forgotCard.classList.remove('hidden'); });
    backToLoginForgotBtn.addEventListener('click', () => { hideAllCards(); loginCard.classList.remove('hidden'); });
    backToLoginResetBtn.addEventListener('click', () => { hideAllCards(); loginCard.classList.remove('hidden'); });

    // Helper to show alert
    const showAlert = (el, message, isSuccess = false) => {
        el.textContent = message;
        el.className = `alert ${isSuccess ? 'alert-success' : 'alert-error'}`;
        el.style.display = 'block';
    };

    // Redirect based on role
    const redirectUser = (token) => {
        const decoded = parseJwt(token);
        if (!decoded) return;

        // Extract role from standard JWT claim or Custom Role Claim
        const role = decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || decoded.role;

        if (role === 'Admin') {
            window.location.href = 'admin/index.html';
        } else if (role === 'Staff') {
            window.location.href = 'staff/index.html';
        } else {
            window.location.href = 'customer/index.html';
        }
    };

    // Auto-redirect if already logged in
    const existingToken = localStorage.getItem('jwt_token');
    if (existingToken) {
        redirectUser(existingToken);
    }

    // Handle Login
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('loginBtn');
        const oldText = btn.textContent;
        btn.textContent = 'Signing in...';
        btn.disabled = true;

        const data = {
            email: document.getElementById('loginEmail').value,
            password: document.getElementById('loginPassword').value
        };

        try {
            const response = await ApiService.post('/auth/login', data);
            localStorage.setItem('jwt_token', response.token);
            // Optionally store refresh token
            if (response.refreshToken) {
                localStorage.setItem('refresh_token', response.refreshToken);
            }
            redirectUser(response.token);
        } catch (error) {
            showAlert(loginAlert, error.message);
            btn.textContent = oldText;
            btn.disabled = false;
        }
    });

    // Handle Registration
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('registerBtn');
        const oldText = btn.textContent;
        btn.textContent = 'Registering...';
        btn.disabled = true;

        const data = {
            fullName: document.getElementById('regFullName').value,
            email: document.getElementById('regEmail').value,
            password: document.getElementById('regPassword').value,
            role: 'Customer' // Default registration is customer
        };

        try {
            await ApiService.post('/auth/register', data);
            showAlert(registerAlert, 'Registration successful! Please login.', true);
            setTimeout(() => { showLoginBtn.click(); }, 2000);
        } catch (error) {
            showAlert(registerAlert, error.message);
        } finally {
            btn.textContent = oldText;
            btn.disabled = false;
        }
    });

    // Handle Forgot Password
    forgotForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('forgotBtn');
        btn.textContent = 'Sending...';
        btn.disabled = true;

        const email = document.getElementById('forgotEmail').value;

        try {
            const res = await ApiService.post('/auth/forgot-password', { email: email });
            // For Demo: Show token directly in the UI alert.
            // Move user to Reset View
            hideAllCards();
            resetCard.classList.remove('hidden');
            document.getElementById('resetEmail').value = email;
            showAlert(resetAlert, `Token generated: ${res.token} (Check your Email in real app!)`, true);
        } catch (error) {
            showAlert(forgotAlert, error.message);
        } finally {
            btn.textContent = 'Send Token';
            btn.disabled = false;
        }
    });

    // Handle Reset Password
    resetForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('resetBtn');
        btn.textContent = 'Resetting...';
        btn.disabled = true;

        const data = {
            email: document.getElementById('resetEmail').value,
            token: document.getElementById('resetToken').value,
            newPassword: document.getElementById('resetNewPassword').value
        };

        try {
            await ApiService.post('/auth/reset-password', data);
            showAlert(resetAlert, 'Password reset successful! Please login.', true);
            setTimeout(() => { showLoginBtn.click(); }, 2500);
        } catch (error) {
            showAlert(resetAlert, error.message);
        } finally {
            btn.textContent = 'Change Password';
            btn.disabled = false;
        }
    });
});
