document.addEventListener('DOMContentLoaded', async () => {
    // Auth Check
    const token = localStorage.getItem('jwt_token');
    if (!token) {
        window.location.href = '../index.html';
        return;
    }

    // --- STATE MANAGEMENT ---
    let state = {
        bookings: { data: [], page: 1, limit: 6 },
        rooms: { data: [], page: 1, limit: 8 },
        requests: { data: [], page: 1, limit: 6 },
        inventory: { data: [], page: 1, limit: 8 },
        services: { data: [], page: 1, limit: 10 },
        feedback: { data: [], page: 1, limit: 6 }
    };

    // --- UI HELPERS ---
    const showToast = (message, type = 'success') => {
        const container = document.getElementById('toastContainer');
        if(!container) return;
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
        if(!container) return;
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
        if(key === 'bookings') renderBookingsTable();
        if(key === 'rooms') renderRoomsTable();
        if(key === 'requests') renderRequestsTable();
        if(key === 'inventory') renderInventoryTable();
        if(key === 'services') renderServicesTable();
        if(key === 'feedback') renderFeedbackTable();
    };

    // --- INITIALIZATION ---
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

            if (targetId === 'bookingsSection') loadBookings();
            if (targetId === 'roomsSection') loadRooms();
            if (targetId === 'requestsSection') loadRequests();
            if (targetId === 'inventorySection') loadInventory();
            if (targetId === 'servicesSection') loadServices();
            if (targetId === 'feedbackSection') loadFeedback();
        });
    });

    // --- BOOKINGS ---
    window.loadBookings = async () => {
        try {
            state.bookings.data = await ApiService.get('/staff/bookings');
            state.bookings.page = 1;
            renderBookingsTable();
        } catch (error) { showToast(error.message, 'error'); }
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
            let actions = '';
            const status = b.status.toLowerCase();

            if (status === 'pending') {
                actions += `<button class="btn btn-primary btn-xs" onclick="confirmPendingBooking(${b.bookingId})">Confirm</button> `;
            } else if (status === 'confirmed') {
                actions += `<button class="btn btn-primary btn-xs" onclick="handleBookingAction(${b.bookingId}, 'checkin')">Check-in</button> `;
                actions += `<button class="btn btn-danger btn-xs" onclick="handleBookingAction(${b.bookingId}, 'cancel')">Cancel</button>`;
            } else if (status === 'checkedin') {
                actions += `<button class="btn btn-warning btn-xs" onclick="handleBookingAction(${b.bookingId}, 'checkout')">Check-out</button> `;
            }

            let badgeCls = 'badge-confirmed';
            if (status === 'checkedin') badgeCls = 'badge-checkedin';
            if (status === 'completed') badgeCls = 'badge-completed';
            if (status === 'cancelled') badgeCls = 'badge-cancelled';
            if (status === 'pending') badgeCls = 'badge-pending';

            tr.innerHTML = `
                <td><strong>#${b.bookingId}</strong></td>
                <td>${b.userName || 'Guest'}</td>
                <td><div class="user-pill" style="display:inline-flex;">Room ${b.roomNumber}</div></td>
                <td style="font-size: 0.8rem; color: #94a3b8;">${checkIn} → ${checkOut}</td>
                <td style="font-weight:600; color:#818cf8">$${b.totalPrice}</td>
                <td><span class="badge ${badgeCls}">${b.status}</span></td>
                <td>${actions || '-'}</td>
            `;
            tbody.appendChild(tr);
        });
        renderPagination('bookings', 'bookingsPagination');
    };

    // --- ROOMS ---
    window.loadRooms = async () => {
        try {
            state.rooms.data = await ApiService.get('/admin/rooms');
            state.rooms.page = 1;
            renderRoomsTable();
        } catch (error) { showToast(error.message, 'error'); }
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
                <td>${r.roomType?.name || 'Standard'}</td>
                <td><span style="display:inline-flex; align-items:center; gap:8px;"><div style="width:8px; height:8px; border-radius:50%; background:${dotColor};"></div> ${r.status}</span></td>
                <td><button class="btn btn-secondary btn-xs" onclick="manageRoom(${r.roomId}, '${r.status}')">Change</button></td>
            `;
            tbody.appendChild(tr);
        });
        renderPagination('rooms', 'roomsPagination');
    };

    // --- REQUESTS ---
    window.loadRequests = async () => {
        try {
            state.requests.data = await ApiService.get('/staff/requests');
            state.requests.page = 1;
            renderRequestsTable();
        } catch (error) { showToast(error.message, 'error'); }
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
                <td><strong>Room ${r.booking?.roomNumber || 'N/A'}</strong></td>
                <td>${r.requestContent}</td>
                <td style="font-size:0.8rem; color:#94a3b8;">${time}</td>
                <td><span class="badge ${isResolved ? 'badge-checkedin' : 'badge-pending'}">${r.status}</span></td>
                <td>${isResolved ? '-' : `<button class="btn btn-primary btn-xs" onclick="resolveGuestRequest(${r.requestId})">Resolved</button>`}</td>
            `;
            tbody.appendChild(tr);
        });
        renderPagination('requests', 'requestsPagination');
    };

    // --- INVENTORY ---
    window.loadInventory = async () => {
        try {
            state.inventory.data = await ApiService.get('/staff/inventory');
            state.inventory.page = 1;
            renderInventoryTable();
        } catch (error) { showToast(error.message, 'error'); }
    };

    const renderInventoryTable = () => {
        const tbody = document.getElementById('inventoryTableBody');
        const { data, page, limit } = state.inventory;
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

    // --- SERVICES ---
    window.loadServices = async () => {
        try {
            state.services.data = await ApiService.get('/admin/services');
            state.services.page = 1;
            renderServicesTable();
        } catch (error) { showToast(error.message, 'error'); }
    }

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
                <td style="font-weight:600; color:#818cf8">$${s.price}</td>
                <td><button class="btn btn-secondary btn-xs" onclick="editServicePrice(${s.serviceId}, '${s.name}', ${s.price})">Update</button></td>
            `;
            tbody.appendChild(tr);
        });
        renderPagination('services', 'servicesPagination');
    };

    // --- FEEDBACK & DETAIL ---
    window.loadFeedback = async () => {
        try {
            state.feedback.data = await ApiService.get('/staff/reviews');
            state.feedback.page = 1;
            renderFeedbackTable();
        } catch (error) { showToast(error.message, 'error'); }
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
                <td><a href="#" onclick="viewBookingDetail(${r.bookingId}); return false;" style="color:#818cf8; font-weight:700;">#${r.bookingId}</a></td>
                <td style="color:#f59e0b">${"★".repeat(r.rating)}</td>
                <td style="font-style:italic; font-size:0.85rem;">"${r.comment || 'No comment'}"</td>
                <td style="font-size:0.85rem; color:#818cf8;">${r.staffReply ? `<strong>Staff:</strong> ${r.staffReply}` : '<span style="opacity:0.3">No reply</span>'}</td>
                <td><button class="btn btn-primary btn-xs" onclick="openReplyModal(${r.reviewId})">Reply</button></td>
            `;
            tbody.appendChild(tr);
        });
        renderPagination('feedback', 'feedbackPagination');
    };

    window.viewBookingDetail = async (id) => {
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
                    <div class="detail-item"><div class="detail-label">Total Price</div><div class="detail-value" style="color:#818cf8; font-weight:700;">$${b.totalPrice}</div></div>
                    <div class="detail-item"><div class="detail-label">Current Status</div><div class="detail-value">${b.status}</div></div>
                </div>
                ${review ? `
                    <div style="margin-top:2rem; padding:1.5rem; background:rgba(245,158,11,0.05); border:1px solid rgba(245,158,11,0.1); border-radius:16px;">
                        <h4 style="margin:0 0 10px 0; color:#f59e0b;">Guest Review</h4>
                        <div style="color:#f59e0b; margin-bottom:8px;">${"★".repeat(review.rating)}</div>
                        <p style="font-style:italic; margin:0; color:#94a3b8;">"${review.comment}"</p>
                        ${review.staffReply ? `<div style="margin-top:1rem; padding-top:1rem; border-top:1px solid rgba(255,255,255,0.05);">
                            <strong>Your Reply:</strong><br>
                            <span style="font-size:0.9rem;">${review.staffReply}</span>
                        </div>` : ''}
                    </div>
                ` : '<p style="margin-top:2rem; text-align:center; opacity:0.4;">No feedback submitted for this booking.</p>'}
            `;
        } catch (error) { 
            content.innerHTML = `<p class="text-error">Error: ${error.message}</p>`;
        }
    };

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
            try { await ApiService.put(`/staff/rooms/${id}/status`, fd.get('status')); showToast('Updated!'); closeFormModal(); loadRooms(); }
            catch (error) { showToast(error.message, 'error'); }
        });
    };

    window.editInventoryItemById = (id) => {
        const item = state.inventory.data.find(i => i.inventoryItemId === id);
        openModal('Edit Item', `
            <input type="hidden" name="id" value="${id}">
            <div class="form-group"><label>Name</label><input type="text" name="name" value="${item.name}"></div>
            <div class="form-group"><label>Quantity</label><input type="number" name="qty" value="${item.quantity}"></div>
            <div class="form-group"><label>Min</label><input type="number" name="min" value="${item.minStockLevel}"></div>
            <div class="form-group"><label>Price</label><input type="number" name="price" value="${item.price}"></div>
        `, async (fd) => {
            const payload = { inventoryItemId: id, name: fd.get('name'), unit: 'cái', quantity: parseInt(fd.get('qty')), minStockLevel: parseInt(fd.get('min')), price: parseFloat(fd.get('price')) };
            try { await ApiService.put(`/staff/inventory/${id}`, payload); showToast('Saved!'); closeFormModal(); loadInventory(); }
            catch (error) { showToast(error.message, 'error'); }
        });
    }

    window.editServicePrice = (id, name, p) => {
        openModal(`Update ${name}`, `<input type="number" name="price" value="${p}" step="0.01">`, async (fd) => {
            try { await ApiService.put(`/admin/services/${id}/price`, parseFloat(fd.get('price'))); showToast('Updated!'); closeFormModal(); loadServices(); }
            catch (error) { showToast(error.message, 'error'); }
        });
    };

    window.deleteInvItem = (id) => {
        showConfirm('Delete?', 'Really?', async () => {
            try { await ApiService.delete(`/staff/inventory/${id}`); showToast('Deleted!'); loadInventory(); }
            catch (error) { showToast(error.message, 'error'); }
        });
    }

    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('jwt_token'); window.location.href = '../index.html';
    });

    loadBookings();
});
