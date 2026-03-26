document.addEventListener('DOMContentLoaded', async () => {
    // Auth Check
    const token = localStorage.getItem('jwt_token');
    if (!token) {
        window.location.href = '../index.html';
        return;
    }

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
                <button type="submit" class="btn btn-primary" style="flex: 1; justify-content: center;">Save Changes</button>
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

    // --- INITIALIZATION ---
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const name = payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] || payload.sub || 'Staff';
        document.getElementById('userNameDisplay').textContent = name;
        document.getElementById('userInitial').textContent = name.charAt(0).toUpperCase();
    } catch (e) { console.error("Error decoding token", e); }

    // --- NAVIGATION ---
    const navItems = document.querySelectorAll('.nav-item');
    const sections = ['bookingsSection', 'roomsSection', 'inventorySection', 'servicesSection', 'feedbackSection'];
    const sectionTitle = document.getElementById('sectionTitle');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');

            const targetId = item.getAttribute('data-target');
            sectionTitle.textContent = item.textContent.replace(/[^\w\s]/gi, '').trim();

            sections.forEach(sec => document.getElementById(sec).classList.add('hidden'));
            document.getElementById(targetId).classList.remove('hidden');

            if (targetId === 'bookingsSection') loadBookings();
            if (targetId === 'roomsSection') loadRooms();
            if (targetId === 'inventorySection') loadInventory();
            if (targetId === 'servicesSection') loadServices();
            if (targetId === 'feedbackSection') loadFeedback();
        });
    });

    // --- BOOKINGS ---
    window.loadBookings = async () => {
        const tbody = document.getElementById('bookingsTableBody');
        tbody.innerHTML = '<tr><td colspan="7" class="text-center" style="opacity:0.5; padding: 3rem;">Loading booking schedule...</td></tr>';
        try {
            const data = await ApiService.get('/staff/bookings');
            tbody.innerHTML = '';
            if (!data.length) tbody.innerHTML = '<tr><td colspan="7" class="text-center" style="padding: 3rem;">No active bookings found.</td></tr>';
            
            data.forEach(b => {
                const tr = document.createElement('tr');
                const checkIn = new Date(b.checkInDate).toLocaleDateString('vi-VN');
                const checkOut = new Date(b.checkOutDate).toLocaleDateString('vi-VN');
                
                let actions = '';
                if (b.status === 'Confirmed') {
                    actions += `<button class="btn btn-primary btn-xs" onclick="handleBookingAction(${b.bookingId}, 'checkin')">Check-in</button> `;
                } else if (b.status === 'CheckedIn') {
                    actions += `<button class="btn btn-warning btn-xs" onclick="handleBookingAction(${b.bookingId}, 'checkout')">Check-out</button> `;
                }

                const s = b.status.toLowerCase();
                let badgeCls = 'badge-confirmed';
                if (s === 'checkedin') badgeCls = 'badge-checkedin';
                if (s === 'completed') badgeCls = 'badge-completed';
                if (s === 'cancelled') badgeCls = 'badge-cancelled';

                tr.innerHTML = `
                    <td><strong>#${b.bookingId}</strong></td>
                    <td style="font-weight:500;">${b.userName || 'Guest'}</td>
                    <td><div class="user-pill" style="display:inline-flex; padding:0.25rem 0.75rem; font-size: 0.8rem;">Room ${b.roomNumber}</div></td>
                    <td style="font-size: 0.85rem; color: #94a3b8;">${checkIn} → ${checkOut}</td>
                    <td style="font-weight:600; color:#818cf8">$${b.totalPrice}</td>
                    <td><span class="badge ${badgeCls}">${b.status}</span></td>
                    <td>${actions || '<span style="opacity:0.3">-</span>'}</td>
                `;
                tbody.appendChild(tr);
            });
        } catch (error) { 
            showToast('Failed to load bookings: ' + error.message, 'error');
            tbody.innerHTML = '<tr><td colspan="7" class="text-center text-error">Failed to synchronize data.</td></tr>';
        }
    };

    window.handleBookingAction = (id, action) => {
        showConfirm(`Confirm ${action.toUpperCase()}`, `Are you sure you want to process #${id}?`, async () => {
            try {
                const res = await ApiService.put(`/staff/bookings/${id}/${action}`, {});
                showToast(res || `${action} completed!`);
                loadBookings();
            } catch (error) { showToast(error.message, 'error'); }
        });
    };

    // --- ROOMS ---
    window.loadRooms = async () => {
        const tbody = document.getElementById('roomsTableBody');
        tbody.innerHTML = '<tr><td colspan="4" class="text-center" style="padding: 3rem; opacity:0.5;">Analyzing room metadata...</td></tr>';
        try {
            const data = await ApiService.get('/admin/rooms');
            tbody.innerHTML = '';
            data.forEach(r => {
                const s = r.status.toLowerCase();
                let dotColor = '#10b981';
                if (s === 'occupied') dotColor = '#3b82f6';
                if (s === 'dirty') dotColor = '#f59e0b';
                if (s === 'maintenance') dotColor = '#ef4444';

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>Room ${r.roomNumber}</strong></td>
                    <td>${r.roomType?.name || 'Standard'}</td>
                    <td><span style="display:inline-flex; align-items:center; gap:8px;"><div style="width:8px; height:8px; border-radius:50%; background:${dotColor}; box-shadow: 0 0 10px ${dotColor}"></div> ${r.status}</span></td>
                    <td>
                        <button class="btn btn-secondary btn-xs" onclick="manageRoom(${r.roomId}, '${r.status}')">Change Status</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        } catch (error) { showToast(error.message, 'error'); }
    };

    window.manageRoom = (id, currentStatus) => {
        const statuses = ['Available', 'Occupied', 'Dirty', 'Maintenance'];
        let options = statuses.map(s => `<option value="${s}" ${s === currentStatus ? 'selected' : ''}>${s}</option>`).join('');
        
        openModal('Update Room Status', `
            <div class="form-group">
                <label>Select Status</label>
                <select name="status" class="form-control" style="width:100%">${options}</select>
            </div>
        `, async (formData) => {
            try {
                const res = await ApiService.put(`/staff/rooms/${id}/status`, formData.get('status'));
                showToast(res || 'Room status updated.');
                closeFormModal();
                loadRooms();
            } catch (error) { showToast(error.message, 'error'); }
        });
    };

    // --- INVENTORY ---
    window.loadInventory = async () => {
        const tbody = document.getElementById('inventoryTableBody');
        tbody.innerHTML = '<tr><td colspan="4" class="text-center" style="padding: 3rem; opacity:0.5;">Checking current stocks...</td></tr>';
        try {
            const data = await ApiService.get('/staff/inventory');
            tbody.innerHTML = '';
            let lowItems = 0;
            data.forEach(i => {
                const isLow = i.quantity <= i.minStockLevel;
                if (isLow) lowItems++;
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${i.name}</strong></td>
                    <td><span class="badge" style="background:rgba(16,185,129,0.1); color:#10b981">Đơn vị: ${i.unit || 'cái'}</span></td>
                    <td>
                        <span style="font-weight:700; color:${isLow ? '#ef4444' : '#10b981'}">${i.quantity}</span> 
                        <span style="font-size:0.7rem; opacity:0.4;">/ Min: ${i.minStockLevel}</span>
                    </td>
                    <td>
                        <button class="btn btn-secondary btn-xs" onclick='editInventoryItem(${JSON.stringify(i).replace(/'/g, "&apos;")})'>Edit</button>
                        <button class="btn btn-danger btn-xs" onclick="deleteInvItem(${i.inventoryItemId})">Delete</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
            document.getElementById('lowStockAlert').classList.toggle('hidden', lowItems === 0);
        } catch (error) { showToast(error.message, 'error'); }
    };

    window.editInventoryItem = (item) => {
        openModal(item ? 'Edit Item' : 'Add New Item', `
            <input type="hidden" name="id" value="${item ? item.inventoryItemId : ''}">
            <div class="form-group"><label>Item Name</label><input type="text" name="name" value="${item ? item.name : ''}" required></div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                <div class="form-group"><label>Quantity</label><input type="number" name="qty" value="${item ? item.quantity : 0}" required></div>
                <div class="form-group"><label>Min Level</label><input type="number" name="min" value="${item ? item.minStockLevel : 5}" required></div>
            </div>
            <div class="form-group"><label>Price per unit ($)</label><input type="number" step="0.01" name="price" value="${item ? item.price : 0}" required></div>
        `, async (fd) => {
            const payload = {
                inventoryItemId: item ? item.inventoryItemId : 0,
                name: fd.get('name'), 
                unit: 'cái', // Mặc định là cái như bạn yêu cầu
                quantity: parseInt(fd.get('qty')), 
                minStockLevel: parseInt(fd.get('min')), 
                price: parseFloat(fd.get('price'))
            };
            try {
                const id = fd.get('id');
                if (id) {
                    await ApiService.put(`/staff/inventory/${id}`, payload);
                } else {
                    await ApiService.post('/staff/inventory', payload);
                }
                showToast('Inventory saved successfully.');
                closeFormModal();
                loadInventory();
            } catch (error) { showToast(error.message, 'error'); }
        });
    };

    window.openInventoryModal = () => editInventoryItem(null);

    window.deleteInvItem = (id) => {
        showConfirm('Delete Item', 'Are you sure? This will permanently remove the item from records.', async () => {
            try {
                await ApiService.delete(`/staff/inventory/${id}`);
                showToast('Item deleted.');
                loadInventory();
            } catch (error) { showToast(error.message, 'error'); }
        });
    };

    // --- SERVICES ---
    window.loadServices = async () => {
        const tbody = document.getElementById('servicesTableBody');
        tbody.innerHTML = '<tr><td colspan="4" class="text-center" style="padding: 3rem; opacity:0.5;">Loading services definitions...</td></tr>';
        try {
            const data = await ApiService.get('/admin/services');
            tbody.innerHTML = '';
            data.forEach(s => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>#${s.serviceId}</td>
                    <td><strong>${s.name}</strong></td>
                    <td style="font-weight:600; color:#818cf8">$${s.price}</td>
                    <td><button class="btn btn-secondary btn-xs" onclick="editServicePrice(${s.serviceId}, '${s.name}', ${s.price})">Update Price</button></td>
                `;
                tbody.appendChild(tr);
            });
        } catch (error) { showToast(error.message, 'error'); }
    };

    window.editServicePrice = (id, name, currentPrice) => {
        openModal(`Update ${name} Price`, `
            <div class="form-group">
                <label>New Price ($)</label>
                <input type="number" step="0.01" name="price" value="${currentPrice}" required autofocus>
            </div>
        `, async (fd) => {
            try {
                const res = await ApiService.put(`/admin/services/${id}/price`, parseFloat(fd.get('price')));
                showToast(res || 'Price updated.');
                closeFormModal();
                loadServices();
            } catch (error) { showToast(error.message, 'error'); }
        });
    };

    // --- FEEDBACK ---
    window.loadFeedback = async () => {
        const tbody = document.getElementById('feedbackTableBody');
        tbody.innerHTML = '<tr><td colspan="4" class="text-center" style="padding: 3rem; opacity:0.5;">Collecting guest feedback...</td></tr>';
        try {
            const data = await ApiService.get('/staff/reviews');
            tbody.innerHTML = '';
            if(!data.length) tbody.innerHTML = '<tr><td colspan="4" class="text-center" style="padding:3rem;">No guest reviews yet.</td></tr>';
            
            data.forEach(r => {
                const tr = document.createElement('tr');
                const date = new Date(r.createdAt).toLocaleDateString('vi-VN');
                tr.innerHTML = `
                    <td><strong>#${r.bookingId}</strong></td>
                    <td style="color:#f59e0b">${"★".repeat(r.rating)}<span style="opacity:0.2">${"★".repeat(5 - r.rating)}</span></td>
                    <td style="font-style:italic; color:#94a3b8">"${r.comment || 'No comment'}"</td>
                    <td>${date}</td>
                `;
                tbody.appendChild(tr);
            });
        } catch (error) { showToast(error.message, 'error'); }
    };

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('jwt_token');
        window.location.href = '../index.html';
    });

    // Final Init
    loadBookings();
});
