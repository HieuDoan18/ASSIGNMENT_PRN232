document.addEventListener('DOMContentLoaded', async () => {
    // Auth Check
    const token = localStorage.getItem('jwt_token');
    if (!token) {
        window.location.href = '../index.html';
        return;
    }

    // --- STATE MANAGEMENT ---
    let state = {
        bookings: { data: [], allData: [], page: 1, limit: 6 },
        rooms: { data: [], allData: [], page: 1, limit: 8 },
        requests: { data: [], allData: [], page: 1, limit: 6 },
        inventory: { data: [], allData: [], page: 1, limit: 8 },
        services: { data: [], allData: [], page: 1, limit: 10 },
        feedback: { data: [], allData: [], page: 1, limit: 6 }
    };

    // --- UI HELPERS ---
    const showToast = (message, type = 'success') => {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `<span>${type === 'success' ? '✅' : '❌'} ${message}</span>`;
        container.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 100);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 400);
        }, 3000);
    };

    const formatPrice = (num) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(num);

    const toggleLoading = (btnId, isLoading) => {
        const btn = document.getElementById(btnId);
        if (btn) btn.classList.toggle('loading', isLoading);
    };

    let confirmCallback = null;
    const showConfirm = (title, text, callback) => {
        const modal = document.getElementById('confirmModal');
        document.getElementById('confirmTitle').textContent = title;
        document.getElementById('confirmText').textContent = text;
        modal.classList.add('show');
        confirmCallback = callback;
    };

    window.closeConfirmModal = () => {
        document.getElementById('confirmModal').classList.remove('show');
    };

    document.getElementById('confirmBtn').addEventListener('click', () => {
        if (confirmCallback) confirmCallback();
        closeConfirmModal();
    });

    const openModal = (title, formHtml, onSubmit) => {
        const modal = document.getElementById('formModal');
        const form = document.getElementById('genericForm');
        document.getElementById('modalTitle').textContent = title;
        form.innerHTML = formHtml + `
            <div style="display: flex; gap: 12px; margin-top: 2rem;">
                <button type="submit" class="btn btn-primary" style="flex: 1; justify-content: center;">Submit</button>
                <button type="button" class="btn btn-secondary" onclick="closeFormModal()" style="flex: 1; justify-content: center;">Cancel</button>
            </div>
        `;
        modal.classList.add('show');
        form.onsubmit = (e) => {
            e.preventDefault();
            onSubmit(new FormData(form));
        };
    };

    window.closeFormModal = () => {
        document.getElementById('formModal').classList.remove('show');
    };

    window.closeDetailModal = () => {
        document.getElementById('detailModal').classList.remove('show');
    };

    // --- PAGINATION RENDERER ---
    const renderPagination = (key, containerId, onPageChange) => {
        const container = document.getElementById(containerId);
        if (!container) return;
        const { data, page, limit } = state[key];
        const totalPages = Math.ceil(data.length / limit);

        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        let html = `
            <button class="page-btn ${page === 1 ? 'disabled' : ''}" onclick="window.changePage('${key}', ${page - 1})">Prev</button>
        `;

        for (let i = 1; i <= totalPages; i++) {
            html += `<button class="page-btn ${i === page ? 'active' : ''}" onclick="window.changePage('${key}', ${i})">${i}</button>`;
        }

        html += `
            <button class="page-btn ${page === totalPages ? 'disabled' : ''}" onclick="window.changePage('${key}', ${page + 1})">Next</button>
        `;
        container.innerHTML = html;
        window.tempOnPageChange = onPageChange;
    };

    window.changePage = (key, newPage) => {
        state[key].page = newPage;
        if (key === 'bookings') renderBookingsTable();
        if (key === 'rooms') renderRoomsTable();
        if (key === 'requests') renderRequestsTable();
        if (key === 'inventory') renderInventoryTable();
        if (key === 'services') renderServicesTable();
        if (key === 'feedback') renderFeedbackTable();
    };

    // --- INITIALIZATION ---
    // Set default date for Room Status
    const roomDateInput = document.getElementById('roomStatusDate');
    if (roomDateInput) {
        roomDateInput.value = new Date().toISOString().split('T')[0];
    }

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const name = payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] || payload.sub || 'Staff';
        document.getElementById('userNameDisplay').textContent = name;
        document.getElementById('userInitial').textContent = name.charAt(0).toUpperCase();
    } catch (e) { console.error("Error decoding token", e); }

    // --- NAVIGATION ---
    const navItems = document.querySelectorAll('.nav-item');
    const sections = ['bookingsSection', 'roomsSection', 'requestsSection', 'inventorySection', 'servicesSection', 'feedbackSection'];
    const sectionTitle = document.getElementById('sectionTitle');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');

            const targetId = item.getAttribute('data-target');
            sectionTitle.textContent = item.textContent.replace(/[^\w\s]/gi, '').trim();

            sections.forEach(sec => {
                const el = document.getElementById(sec);
                if (el) el.classList.add('hidden');
            });
            const targetEl = document.getElementById(targetId);
            if (targetEl) targetEl.classList.remove('hidden');

            if (targetId === 'bookingsSection') window.loadBookings();
            if (targetId === 'roomsSection') window.loadRooms();
            if (targetId === 'requestsSection') window.loadRequests();
            if (targetId === 'inventorySection') window.loadInventory();
            if (targetId === 'servicesSection') window.loadServices();
            if (targetId === 'feedbackSection') window.loadFeedback();
        });
    });

    window.filterBookings = () => {
        const search = (document.getElementById('bookingSearch')?.value || '').toLowerCase();
        const status = document.getElementById('bookingStatusFilter')?.value || '';

        state.bookings.data = state.bookings.allData.filter(b => {
            const matchesSearch = (b.userName || '').toLowerCase().includes(search) ||
                (b.roomNumber || '').toString().toLowerCase().includes(search) ||
                (b.bookingId || '').toString().includes(search);
            const matchesStatus = status === '' || (b.status || '').toLowerCase() === status.toLowerCase();
            return matchesSearch && matchesStatus;
        });

        state.bookings.page = 1;
        renderBookingsTable();
    };

    // --- EXPOSE REFRESH FUNCTIONS ---
    window.loadBookings = async (silent = true) => {
        console.log("Refreshing Bookings (Silent:", silent, ")...");
        toggleLoading('btnRefreshBookings', true);
        try {
            const data = await ApiService.get('/staff/bookings');
            state.bookings.allData = Array.isArray(data) ? data : [];
            state.bookings.data = [...state.bookings.allData];
            state.bookings.page = 1;
            window.filterBookings();
            if (!silent) showToast('Bookings updated', 'success');
        } catch (error) {
            console.error("Load Bookings Error:", error);
            showToast(error.message, 'error');
        } finally { toggleLoading('btnRefreshBookings', false); }
    };

    const renderBookingsTable = () => {
        const tbody = document.getElementById('bookingsTableBody');
        const { data, page, limit } = state.bookings;
        const start = (page - 1) * limit;
        const pageData = data.slice(start, start + limit);

        tbody.innerHTML = '';
        pageData.forEach(b => {
            const tr = document.createElement('tr');
            const checkIn = new Date(b.checkInDate).toLocaleDateString('vi-VN');
            const checkOut = new Date(b.checkOutDate).toLocaleDateString('vi-VN');
            const status = b.status.toLowerCase();

            let badgeCls = 'badge-confirmed';
            if (status === 'checkedin') badgeCls = 'badge-checkedin';
            if (status === 'completed') badgeCls = 'badge-completed';
            if (status === 'cancelled') badgeCls = 'badge-cancelled';
            if (status === 'pending') badgeCls = 'badge-pending';

            tr.innerHTML = `
                <td><a href="#" onclick="viewBookingDetail(${b.bookingId}); return false;" style="color:#818cf8; font-weight:700;">#${b.bookingId}</a></td>
                <td>${b.userName || 'Guest'}</td>
                <td><div class="user-pill" style="display:inline-flex;">Room ${b.roomNumber}</div></td>
                <td><span style="font-size: 0.8rem; color: #94a3b8;">${checkIn} → ${checkOut}</span></td>
                <td style="font-weight:600; color:#818cf8">${formatPrice(b.totalPrice)}</td>
                <td><span class="badge ${badgeCls}">${b.status}</span></td>
            `;
            tbody.appendChild(tr);
        });
        renderPagination('bookings', 'bookingsPagination');
    };

    // --- ROOMS ---
    window.filterRooms = () => {
        const search = (document.getElementById('roomSearch')?.value || '').toLowerCase();
        const status = document.getElementById('roomStatusFilter')?.value || '';

        state.rooms.data = state.rooms.allData.filter(r => {
            const matchesSearch = (r.roomNumber || '').toString().toLowerCase().includes(search);
            const matchesStatus = status === '' || (r.status || '').toLowerCase() === status.toLowerCase();
            return matchesSearch && matchesStatus;
        });

        state.rooms.page = 1;
        renderRoomsTable();
    };

    window.loadRooms = async (silent = true) => {
        const dateVal = document.getElementById('roomStatusDate')?.value;
        console.log("Refreshing Rooms (Silent:", silent, " Date:", dateVal, ")...");
        toggleLoading('btnRefreshRooms', true);
        try {
            const data = await ApiService.get(dateVal ? `/staff/rooms?date=${dateVal}` : '/staff/rooms');
            state.rooms.allData = Array.isArray(data) ? data : [];
            state.rooms.data = [...state.rooms.allData];
            state.rooms.page = 1;
            window.filterRooms();
            if (!silent) showToast('Rooms updated', 'success');
        } catch (error) {
            console.error("Load Rooms Error:", error);
            showToast(error.message, 'error');
        } finally { toggleLoading('btnRefreshRooms', false); }
    };

    const renderRoomsTable = () => {
        const tbody = document.getElementById('roomsTableBody');
        const { data, page, limit } = state.rooms;
        const start = (page - 1) * limit;
        const pageData = data.slice(start, start + limit);

        tbody.innerHTML = '';
        pageData.forEach(r => {
            const s = r.status.toLowerCase();
            let dotColor = s === 'occupied' ? '#3b82f6' : (s === 'dirty' ? '#f59e0b' : (s === 'maintenance' ? '#ef4444' : '#10b981'));
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>Room ${r.roomNumber}</strong></td>
                <td>${r.roomType || 'Standard'}</td>
                <td><span style="display:inline-flex; align-items:center; gap:8px;"><div style="width:8px; height:8px; border-radius:50%; background:${dotColor};"></div> ${r.status}</span></td>
                <td><button class="btn btn-secondary btn-xs" onclick="manageRoom(${r.roomId}, '${r.status}')">Change</button></td>
            `;
            tbody.appendChild(tr);
        });
        renderPagination('rooms', 'roomsPagination');
    };

    // --- REQUESTS ---
    window.filterRequests = () => {
        const search = (document.getElementById('requestSearch')?.value || '').toLowerCase();
        const status = document.getElementById('requestStatusFilter')?.value || '';

        state.requests.data = state.requests.allData.filter(r => {
            const matchesSearch = (r.requestContent || '').toLowerCase().includes(search) ||
                (r.booking?.roomNumber || '').toString().toLowerCase().includes(search);
            const matchesStatus = status === '' || (r.status || '').toLowerCase() === status.toLowerCase();
            return matchesSearch && matchesStatus;
        });

        state.requests.page = 1;
        renderRequestsTable();
    };

    window.loadRequests = async (silent = true) => {
        console.log("Refreshing Requests (Silent:", silent, ")...");
        toggleLoading('btnRefreshRequests', true);
        try {
            const data = await ApiService.get('/staff/requests');
            state.requests.allData = Array.isArray(data) ? data : [];
            state.requests.data = [...state.requests.allData];
            state.requests.page = 1;
            window.filterRequests();
            if (!silent) showToast('Requests updated', 'success');
        } catch (error) {
            console.error("Load Requests Error:", error);
            showToast(error.message, 'error');
        } finally { toggleLoading('btnRefreshRequests', false); }
    };

    const renderRequestsTable = () => {
        const tbody = document.getElementById('requestsTableBody');
        const { data, page, limit } = state.requests;
        const start = (page - 1) * limit;
        const pageData = data.slice(start, start + limit);

        tbody.innerHTML = '';
        pageData.forEach(r => {
            const tr = document.createElement('tr');
            const time = new Date(r.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
            const isResolved = r.status === 'Resolved';
            tr.innerHTML = `
                <td><strong>Room ${r.booking?.room?.roomNumber || 'N/A'}</strong></td>
                <td>${r.requestContent}</td>
                <td style="font-size:0.8rem; color:#94a3b8;">${time}</td>
                <td><span class="badge ${isResolved ? 'badge-checkedin' : 'badge-pending'}">${r.status}</span></td>
                <td>${isResolved ? '-' : `<button class="btn btn-primary btn-xs" onclick="resolveGuestRequest(${r.requestId})">Resolved</button>`}</td>
            `;
            tbody.appendChild(tr);
        });
        renderPagination('requests', 'requestsPagination');
    };

    window.filterInventory = () => {
        const search = (document.getElementById('inventorySearch')?.value || '').toLowerCase();
        const stockFilter = document.getElementById('inventoryStockFilter')?.value || 'all';

        state.inventory.data = state.inventory.allData.filter(i => {
            const matchesSearch = (i.name || '').toLowerCase().includes(search);
            const matchesStock = stockFilter === 'all' || i.quantity <= i.minStockLevel;
            return matchesSearch && matchesStock;
        });

        state.inventory.page = 1;
        renderInventoryTable();
    };

    window.loadInventory = async (silent = true) => {
        console.log("Refreshing Inventory (Silent:", silent, ")...");
        toggleLoading('btnRefreshInventory', true);
        try {
            const data = await ApiService.get('/staff/inventory');
            state.inventory.allData = Array.isArray(data) ? data : [];
            state.inventory.data = [...state.inventory.allData];
            state.inventory.page = 1;
            window.filterInventory();
            if (!silent) showToast('Inventory updated', 'success');
        } catch (error) {
            console.error("Load Inventory Error:", error);
            showToast(error.message, 'error');
        } finally { toggleLoading('btnRefreshInventory', false); }
    };

    const renderInventoryTable = () => {
        const tbody = document.getElementById('inventoryTableBody');
        const alertBox = document.getElementById('lowStockAlert');
        const { data, allData, page, limit } = state.inventory;

        // Show alert if any item is low stock
        const hasLowStock = allData.some(i => i.quantity <= i.minStockLevel);
        if (alertBox) alertBox.classList.toggle('hidden', !hasLowStock);

        const start = (page - 1) * limit;
        const pageData = data.slice(start, start + limit);

        tbody.innerHTML = '';
        pageData.forEach(i => {
            const isLow = i.quantity <= i.minStockLevel;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${i.name}</strong></td>
                <td>Min: ${i.minStockLevel}</td>
                <td><span style="font-weight:700; color:${isLow ? '#ef4444' : '#10b981'}">${i.quantity}</span></td>
                <td>
                    <button class="btn btn-secondary btn-xs" onclick="editInventoryItemById(${i.inventoryItemId})">Edit</button>
                    <button class="btn btn-danger btn-xs" onclick="deleteInvItem(${i.inventoryItemId})">Delete</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        renderPagination('inventory', 'inventoryPagination');
    };

    window.filterServices = () => {
        const search = (document.getElementById('serviceSearch')?.value || '').toLowerCase();
        state.services.data = state.services.allData.filter(s => (s.name || '').toLowerCase().includes(search));
        state.services.page = 1;
        renderServicesTable();
    };

    window.loadServices = async (silent = true) => {
        console.log("Refreshing Services (Silent:", silent, ")...");
        toggleLoading('btnRefreshServices', true);
        try {
            const data = await ApiService.get('/admin/services');
            state.services.allData = Array.isArray(data) ? data : [];
            state.services.data = [...state.services.allData];
            state.services.page = 1;
            window.filterServices();
            if (!silent) showToast('Services updated', 'success');
        } catch (error) {
            console.error("Load Services Error:", error);
            showToast(error.message, 'error');
        } finally { toggleLoading('btnRefreshServices', false); }
    };

    const renderServicesTable = () => {
        const tbody = document.getElementById('servicesTableBody');
        const { data, page, limit } = state.services;
        const start = (page - 1) * limit;
        const pageData = data.slice(start, start + limit);

        tbody.innerHTML = '';
        pageData.forEach(s => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>#${s.serviceId}</td>
                <td><strong>${s.name}</strong></td>
                <td style="font-weight:600; color:#818cf8">${formatPrice(s.price)}</td>
                <td style="color:#94a3b8; font-size:0.8rem;"><i>Reference Only</i></td>
            `;
            tbody.appendChild(tr);
        });
        renderPagination('services', 'servicesPagination');
    };

    window.filterFeedback = () => {
        const search = (document.getElementById('feedbackSearch')?.value || '').toLowerCase();
        const rating = document.getElementById('feedbackRatingFilter')?.value || '';

        state.feedback.data = state.feedback.allData.filter(r => {
            const matchesSearch = (r.bookingId || '').toString().includes(search) ||
                (r.comment || '').toLowerCase().includes(search);
            const matchesRating = rating === '' || (r.rating || '').toString() === rating;
            return matchesSearch && matchesRating;
        });

        state.feedback.page = 1;
        renderFeedbackTable();
    };

    window.loadFeedback = async (silent = true) => {
        console.log("Refreshing Feedback (Silent:", silent, ")...");
        toggleLoading('btnRefreshFeedback', true);
        try {
            const data = await ApiService.get('/staff/reviews');
            state.feedback.allData = Array.isArray(data) ? data : [];
            state.feedback.data = [...state.feedback.allData];
            state.feedback.page = 1;
            window.filterFeedback();
            if (!silent) showToast('Feedback updated', 'success');
        } catch (error) {
            console.error("Load Feedback Error:", error);
            showToast(error.message, 'error');
        } finally { toggleLoading('btnRefreshFeedback', false); }
    };

    const renderFeedbackTable = () => {
        const tbody = document.getElementById('feedbackTableBody');
        const { data, page, limit } = state.feedback;
        const start = (page - 1) * limit;
        const pageData = data.slice(start, start + limit);

        tbody.innerHTML = '';
        pageData.forEach(r => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div onclick="viewBookingDetail(${r.bookingId}, true)" style="font-weight:700; color:#818cf8; font-size:0.9rem; cursor:pointer; text-decoration:underline;">#${r.bookingId}</div>
                    <div style="font-size:0.75rem; color:#94a3b8;">Room ${r.booking?.room?.roomNumber || 'N/A'}</div>
                </td>
                <td style="color:#f59e0b">${"★".repeat(r.rating)}</td>
                <td style="font-style:italic; font-size:0.85rem;">"${r.comment || 'No comment'}"</td>
                <td style="font-size:0.85rem; color:#818cf8;">${r.staffReply ? `<strong>Staff:</strong> ${r.staffReply}` : '<span style="opacity:0.3">No reply</span>'}</td>
                <td><button class="btn btn-primary btn-xs" onclick="openReplyModal(${r.reviewId})">Reply</button></td>
            `;
            tbody.appendChild(tr);
        });
        renderPagination('feedback', 'feedbackPagination');
    };

    window.viewBookingDetail = async (id, hideActions = false) => {
        const modal = document.getElementById('detailModal');
        const content = document.getElementById('detailContent');
        const title = document.getElementById('detailModalTitle');

        content.innerHTML = '<p style="text-align:center; padding:2rem; opacity:0.5;">Loading details...</p>';
        modal.classList.add('show');
        title.textContent = `Booking Info #${id}`;

        try {
            const b = await ApiService.get(`/staff/bookings/${id}`);
            // Find review if exists
            const review = state.feedback.data.find(r => r.bookingId === id);

            content.innerHTML = `
                <div class="detail-grid">
                    <div class="detail-item"><div class="detail-label">Guest Name</div><div class="detail-value">${b.userName}</div></div>
                    <div class="detail-item"><div class="detail-label">Room Number</div><div class="detail-value">${b.roomNumber}</div></div>
                    <div class="detail-item"><div class="detail-label">Check-in</div><div class="detail-value">${new Date(b.checkInDate).toLocaleDateString()}</div></div>
                    <div class="detail-item"><div class="detail-label">Check-out</div><div class="detail-value">${new Date(b.checkOutDate).toLocaleDateString()}</div></div>
                    <div class="detail-item"><div class="detail-label">Total Price</div><div class="detail-value" style="color:#818cf8; font-weight:700;">${formatPrice(b.totalPrice)}</div></div>
                    <div class="detail-item"><div class="detail-label">Current Status</div><div class="detail-value">${b.status}</div></div>
                </div>

                ${review ? `
                    <div style="margin-top:2rem; padding:1.5rem; background:rgba(245,158,11,0.05); border:1px solid rgba(245,158,11,0.1); border-radius:16px;">
                        <h4 style="margin:0 0 10px 0; color:#f59e0b;">Guest Review</h4>
                        <div style="color:#f59e0b; margin-bottom:8px;">${"★".repeat(review.rating)}</div>
                        <p style="font-style:italic; margin:0; color:#94a3b8;">"${review.comment}"</p>
                    </div>
                ` : ''}

                ${!hideActions ? `
                <div style="margin-top:20px; display:flex; gap:10px;">
                    ${(b.status === 'Confirmed' || b.status === 'Paid' || b.status === 'Pending') ? `<button class="btn btn-primary" onclick="checkInBooking(${b.bookingId})">Check In</button>` : ''}
                    ${b.status === 'CheckedIn' ? `<button class="btn btn-primary" onclick="checkOutBooking(${b.bookingId})">Check Out</button>` : ''}
                    ${(b.status !== 'Cancelled' && b.status !== 'Completed' && b.status !== 'CheckedIn') ? `<button class="btn btn-danger" onclick="cancelBooking(${b.bookingId})">Cancel Booking</button>` : ''}
                </div>
                ` : ''}

                <div style="margin-top:2rem;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                        <h4 style="margin:0">Services on Booking</h4>
                        ${(!hideActions && (b.status === 'CheckedIn' || b.status === 'Confirmed' || b.status === 'Paid')) ? `<button class="btn btn-primary btn-xs" onclick="openAddServiceToBookingModal(${id})">+ Add Service</button>` : ''}
                    </div>
                    <div id="bookingServicesList">
                        <p style="text-align:center; opacity:0.5; padding:1rem;">Loading services...</p>
                    </div>
                </div>
            `;
            loadBookingServices(id);
        } catch (error) {
            console.error("View Booking Detail Error:", error);
            content.innerHTML = `<p class="text-error">Error: ${error.message}</p>`;
        }
    };

    const loadBookingServices = async (bookingId) => {
        const container = document.getElementById('bookingServicesList');
        try {
            const list = await ApiService.get(`/staff/bookings/${bookingId}/services`);
            if (list.length === 0) {
                container.innerHTML = '<p style="text-align:center; opacity:0.5; padding:1rem; border:1px dashed rgba(255,255,255,0.1); border-radius:12px;">No services added yet.</p>';
                return;
            }
            let html = '<div style="background:rgba(255,255,255,0.02); border-radius:12px; overflow:hidden;">';
            list.forEach(s => {
                html += `
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:0.75rem 1rem; border-bottom:1px solid rgba(255,255,255,0.05);">
                        <div>
                            <div style="font-weight:600; font-size:0.9rem;">${s.name}</div>
                            <div style="font-size:0.75rem; color:#94a3b8;">Qty: ${s.quantity} &times; ${formatPrice(s.price)}</div>
                        </div>
                        <div style="font-weight:700; color:#818cf8;">${formatPrice(s.total)}</div>
                    </div>
                `;
            });
            html += '</div>';
            container.innerHTML = html;
        } catch (error) { container.innerHTML = `<p class="text-error">${error.message}</p>`; }
    };

    window.openAddServiceToBookingModal = async (bookingId) => {
        // First get menu
        try {
            const allServices = await ApiService.get('/admin/services');
            let options = allServices.map(s => `<option value="${s.serviceId}">${s.name} (${formatPrice(s.price)})</option>`).join('');

            openModal('Add Service', `
                <div class="form-group"><label>Select Service</label><select name="svcId" class="form-control" style="width:100%">${options}</select></div>
                <div class="form-group"><label>Quantity</label><input type="number" name="qty" value="1" min="1" required></div>
            `, async (fd) => {
                const payload = { serviceId: parseInt(fd.get('svcId')), quantity: parseInt(fd.get('qty')) };
                try {
                    await ApiService.post(`/staff/bookings/${bookingId}/services`, payload);
                    showToast('Service added!'); closeFormModal(); loadBookingServices(bookingId);
                } catch (error) { showToast(error.message, 'error'); }
            });
        } catch (e) { showToast(e.message, 'error'); }
    };

    window.removeServiceFromBooking = (bookingId, svcId) => {
        showConfirm('Remove Service', 'Remove this from guest bill?', async () => {
            try {
                await ApiService.delete(`/staff/bookings/${bookingId}/services/${svcId}`);
                showToast('Removed!'); loadBookingServices(bookingId);
            } catch (error) { showToast(error.message, 'error'); }
        });
    }

    // --- OTHER ACTIONS ---
    window.confirmPendingBooking = (bookingId) => {
        const booking = state.bookings.data.find(b => b.bookingId === bookingId);
        showConfirm('Confirm Booking', `Approve booking #${bookingId}?`, async () => {
            try {
                const payload = { roomId: booking.roomId, checkInDate: booking.checkInDate, checkOutDate: booking.checkOutDate, status: 'Confirmed' };
                await ApiService.put(`/staff/bookings/${bookingId}`, payload);
                showToast('Confirmed!'); loadBookings();
            } catch (error) { showToast(error.message, 'error'); }
        });
    }

    window.resolveGuestRequest = (id) => {
        showConfirm('Resolve Request', 'Is this completed?', async () => {
            try { await ApiService.put(`/staff/requests/${id}/resolve`, {}); showToast('Resolved!'); loadRequests(); }
            catch (error) { showToast(error.message, 'error'); }
        });
    }

    window.openReplyModal = (reviewId) => {
        const review = state.feedback.data.find(r => r.reviewId === reviewId);
        openModal(`Reply to Booking #${review.bookingId}`, `
            <textarea name="reply" class="form-control" rows="4" style="width:100%;">${review.staffReply || ''}</textarea>
        `, async (fd) => {
            try {
                await ApiService.put(`/staff/reviews/${reviewId}/reply`, fd.get('reply'));
                showToast('Replied!'); closeFormModal(); loadFeedback();
            } catch (error) { showToast(error.message, 'error'); }
        });
    }

    window.manageRoom = (id, currentStatus) => {
        const statuses = ['Available', 'Occupied', 'Dirty', 'Maintenance'];
        let options = statuses.map(s => `<option value="${s}" ${s === currentStatus ? 'selected' : ''}>${s}</option>`).join('');
        openModal('Room Status', `<select name="status" class="form-control" style="width:100%">${options}</select>`, async (fd) => {
            try { 
                await ApiService.put(`/staff/rooms/${id}/status`, { status: fd.get('status') }); 
                showToast('Updated!'); closeFormModal(); loadRooms(); 
            }
            catch (error) { showToast(error.message, 'error'); }
        });
    };

    window.openInventoryModal = () => {
        openModal('Add New Item', `
            <div class="form-group"><label>Name</label><input type="text" name="name" placeholder="e.g. Towel" required></div>
            <div class="form-group"><label>Quantity</label><input type="number" name="qty" value="0" required></div>
            <div class="form-group"><label>Min Level</label><input type="number" name="min" value="10" required></div>
            <div class="form-group"><label>Price ($)</label><input type="number" name="price" value="0.00" step="0.01" required></div>
        `, async (fd) => {
            const payload = {
                name: fd.get('name'),
                unit: 'cái',
                quantity: parseInt(fd.get('qty')),
                minStockLevel: parseInt(fd.get('min')),
                price: parseFloat(fd.get('price'))
            };
            try {
                await ApiService.post('/staff/inventory', payload);
                showToast('Item Added!');
                closeFormModal();
                window.loadInventory(true);
            } catch (error) { showToast(error.message, 'error'); }
        });
    }

    window.editInventoryItemById = (id) => {
        const item = state.inventory.data.find(i => i.inventoryItemId === id);
        if (!item) return;
        openModal('Edit Item', `
            <div class="form-group"><label>Name</label><input type="text" name="name" value="${item.name}" required></div>
            <div class="form-group"><label>Quantity</label><input type="number" name="qty" value="${item.quantity}" required></div>
            <div class="form-group"><label>Min Level</label><input type="number" name="min" value="${item.minStockLevel}" required></div>
            <div class="form-group"><label>Price ($)</label><input type="number" name="price" value="${item.price}" step="0.01" required></div>
        `, async (fd) => {
            const payload = {
                inventoryItemId: id,
                name: fd.get('name'),
                unit: item.unit || 'cái',
                quantity: parseInt(fd.get('qty')),
                minStockLevel: parseInt(fd.get('min')),
                price: parseFloat(fd.get('price'))
            };
            try {
                await ApiService.put(`/staff/inventory/${id}`, payload);
                showToast('Saved!');
                closeFormModal();
                window.loadInventory(true);
            } catch (error) { showToast(error.message, 'error'); }
        });
    }

    window.editServicePrice = (id, name, p) => {
        openModal(`Update ${name}`, `<input type="number" name="price" value="${p}" step="0.01">`, async (fd) => {
            try { await ApiService.put(`/admin/services/${id}/price`, parseFloat(fd.get('price'))); showToast('Updated!'); closeFormModal(); window.loadServices(true); }
            catch (error) { showToast(error.message, 'error'); }
        });
    };

    window.deleteInvItem = (id) => {
        showConfirm('Delete?', 'Delete this item?', async () => {
            try { await ApiService.delete(`/staff/inventory/${id}`); showToast('Deleted!'); window.loadInventory(true); }
            catch (error) { showToast(error.message, 'error'); }
        });
    }

    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('jwt_token'); window.location.href = '../index.html';
    });

    loadBookings();
});
