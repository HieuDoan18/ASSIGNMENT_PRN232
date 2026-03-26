document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('jwt_token');
    if (!token) { window.location.href = '../index.html'; return; }

    const sections = ['dashboardSection', 'usersSection', 'roomsSection', 'roomTypesSection', 'servicesSection', 'pricingSection'];
    const navItems = document.querySelectorAll('.nav-item');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            const targetId = item.getAttribute('data-target');
            sections.forEach(sec => document.getElementById(sec).classList.add('hidden'));
            document.getElementById(targetId).classList.remove('hidden');
            if (targetId === 'dashboardSection') loadReports();
            if (targetId === 'usersSection') loadUsers();
            if (targetId === 'roomsSection') loadRooms();
            if (targetId === 'roomTypesSection') loadRoomTypes();
            if (targetId === 'servicesSection') loadServices();
            if (targetId === 'pricingSection') { loadPricing(); loadPromotions(); }
        });
    });

    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('jwt_token');
        window.location.href = '../index.html';
    });

    loadReports();

    // ------------------- REPORTS -------------------
    document.getElementById('refreshReportsBtn').addEventListener('click', loadReports);
    document.getElementById('clearReportFilterBtn').addEventListener('click', () => {
        document.getElementById('reportStartDate').value = '';
        document.getElementById('reportEndDate').value = '';
        loadReports();
    });

    async function loadReports() {
        const startDate = document.getElementById('reportStartDate').value;
        const endDate = document.getElementById('reportEndDate').value;

        if (startDate && endDate && new Date(endDate) <= new Date(startDate)) {
            alert('End date must be greater than start date');
            return;
        }

        let revParams = '';
        let bksParams = '';
        if (startDate) { revParams += `startDate=${startDate}`; bksParams += `startDate=${startDate}`; }
        if (endDate) { revParams += `${revParams ? '&' : ''}endDate=${endDate}`; bksParams += `${bksParams ? '&' : ''}endDate=${endDate}`; }

        const revUrl = revParams ? `/admin/reports/revenue?${revParams}` : '/admin/reports/revenue';
        const bksUrl = bksParams ? `/admin/reports/bookings?${bksParams}` : '/admin/reports/bookings';
        const occDate = endDate || startDate || new Date().toISOString();

        try {
            const [rev, bks, occ] = await Promise.all([
                ApiService.get(revUrl),
                ApiService.get(bksUrl),
                ApiService.get(`/admin/reports/occupancy?date=${occDate}`)
            ]);
            document.getElementById('repRevenue').textContent = `$${rev.totalRevenue || 0}`;
            document.getElementById('repBookings').textContent = bks.totalBookings || 0;
            document.getElementById('repCancelled').textContent = bks.cancelledBookings || 0;
            document.getElementById('repCompleted').textContent = bks.completedBookings || 0;
            document.getElementById('repOccupancy').textContent = `${(occ.occupancyRatePercentage || 0).toFixed(1)}%`;
        } catch (error) { console.error("Failed to load reports", error); }
    }

    // ------------------- USERS (full CRUD) -------------------
    const userModal = document.getElementById('userModal');
    const userDetailModal = document.getElementById('userDetailModal');
    const userModalTitle = document.getElementById('userModalTitle');
    const userModalForm = document.getElementById('userModalForm');
    const userModalAlert = document.getElementById('userModalAlert');

    const openModal = (isEdit = false) => {
        userModal.classList.remove('hidden');
        userModalAlert.style.display = 'none';
        userModalTitle.textContent = isEdit ? 'Edit User' : 'Create User';
        document.getElementById('modalPasswordGroup').style.display = isEdit ? 'none' : 'block';
        if (!isEdit) userModalForm.reset();
    };
    const closeModal = () => userModal.classList.add('hidden');

    document.getElementById('openCreateUserBtn').addEventListener('click', () => {
        document.getElementById('modalUserId').value = '';
        openModal(false);
    });
    document.getElementById('closeUserModal').addEventListener('click', closeModal);
    document.getElementById('closeUserModalBtn').addEventListener('click', closeModal);

    document.getElementById('closeUserDetail').addEventListener('click', () => userDetailModal.classList.add('hidden'));
    document.getElementById('closeUserDetailBtn').addEventListener('click', () => userDetailModal.classList.add('hidden'));

    // Create or Update user on form submit
    userModalForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('modalUserId').value;
        const isEdit = !!id;
        const btn = document.getElementById('userModalSaveBtn');
        btn.textContent = 'Saving...'; btn.disabled = true;

        const payload = {
            fullName: document.getElementById('modalFullName').value,
            email: document.getElementById('modalEmail').value,
            role: document.getElementById('modalRole').value,
        };
        if (!isEdit) payload.password = document.getElementById('modalPassword').value;

        try {
            if (isEdit) {
                await ApiService.put(`/admin/users/${id}`, payload);
            } else {
                await ApiService.post('/admin/users', payload);
            }
            closeModal();
            loadUsers();
        } catch (error) {
            userModalAlert.textContent = error.message;
            userModalAlert.className = 'alert alert-error';
            userModalAlert.style.display = 'block';
        } finally {
            btn.textContent = 'Save'; btn.disabled = false;
        }
    });

    async function loadUsers() {
        const tbody = document.getElementById('usersTableBody');
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">Loading...</td></tr>';
        try {
            const data = await ApiService.get('/admin/users');
            tbody.innerHTML = '';
            data.forEach(u => {
                const isLocked = u.isLocked;
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${u.userId}</td>
                    <td>${u.fullName || '-'}</td>
                    <td>${u.email}</td>
                    <td>
                        <span class="role-badge">${u.role}</span>
                    </td>
                    <td>
                        <span style="color: ${isLocked ? '#EF4444' : '#10B981'}; font-weight:600;">
                            ${isLocked ? '🔒 Locked' : '✅ Active'}
                        </span>
                    </td>
                    <td>
                        <div style="display:flex; gap:6px; flex-wrap:wrap;">
                            <button class="btn btn-secondary btn-xs" onclick="viewUser(${u.userId})">Detail</button>
                            <button class="btn btn-warning btn-xs" onclick="editUser(${u.userId}, '${u.fullName}', '${u.email}', '${u.role}')">Edit</button>
                            <button class="btn btn-secondary btn-xs" onclick="toggleLock(${u.userId})">${isLocked ? 'Unlock' : 'Lock'}</button>
                            <button class="btn btn-danger btn-xs" onclick="deleteUser(${u.userId})">Delete</button>
                        </div>
                    </td>`;
                tbody.appendChild(tr);
            });
        } catch (error) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center text-error">Failed: ${error.message}</td></tr>`;
        }
    }

    window.viewUser = async (id) => {
        try {
            const u = await ApiService.get(`/admin/users/${id}`);
            document.getElementById('userDetailContent').innerHTML = `
                <p><strong>ID:</strong> ${u.userId}</p>
                <p><strong>Full Name:</strong> ${u.fullName || '-'}</p>
                <p><strong>Email:</strong> ${u.email}</p>
                <p><strong>Role:</strong> ${u.role}</p>
                <p><strong>Status:</strong> ${u.isLocked ? '🔒 Locked' : '✅ Active'}</p>
                <p><strong>Avatar:</strong> ${u.avatar ? `<img src="${u.avatar}" width="50" style="border-radius:50%; vertical-align:middle;">` : 'None'}</p>`;
            userDetailModal.classList.remove('hidden');
        } catch (error) { alert('Failed to load user: ' + error.message); }
    };

    window.editUser = (id, fullName, email, role) => {
        document.getElementById('modalUserId').value = id;
        document.getElementById('modalFullName').value = fullName;
        document.getElementById('modalEmail').value = email;
        document.getElementById('modalRole').value = role;
        openModal(true);
    };

    window.changeRole = async (id) => {
        const newRole = prompt('Enter new role (Admin, Staff, Customer):');
        if (!newRole) return;
        try {
            await ApiService.put(`/admin/users/${id}/role`, { role: newRole });
            loadUsers();
        } catch (error) { alert('Failed: ' + error.message); }
    };

    window.toggleLock = async (id) => {
        try {
            await ApiService.put(`/admin/users/${id}/lock`, {});
            loadUsers();
        } catch (error) { alert('Failed: ' + error.message); }
    };

    window.deleteUser = async (id) => {
        if (!confirm(`Delete user #${id}? This action cannot be undone.`)) return;
        try {
            await ApiService.delete(`/admin/users/${id}`);
            loadUsers();
        } catch (error) { alert('Failed: ' + error.message); }
    };

    // ------------------- ROOMS (full CRUD) -------------------
    const roomModal = document.getElementById('roomModal');
    const roomModalForm = document.getElementById('roomModalForm');
    const roomModalAlert = document.getElementById('roomModalAlert');
    let roomTypeCache = [];

    const openRoomModal = async (isEdit = false) => {
        roomModal.classList.remove('hidden');
        document.getElementById('roomModalTitle').textContent = isEdit ? 'Edit Room' : 'Create Room';
        roomModalAlert.style.display = 'none';
        if (!isEdit) roomModalForm.reset();
        // Load room types for dropdown
        await loadRoomTypeDropdown();
    };
    const closeRoomModal = () => roomModal.classList.add('hidden');

    document.getElementById('openCreateRoomBtn').addEventListener('click', () => {
        document.getElementById('roomModalId').value = '';
        openRoomModal(false);
    });
    document.getElementById('closeRoomModal').addEventListener('click', closeRoomModal);
    document.getElementById('closeRoomModalBtn').addEventListener('click', closeRoomModal);

    async function loadRoomTypeDropdown() {
        try {
            if (roomTypeCache.length === 0) {
                roomTypeCache = await ApiService.get('/admin/room-types');
            }
            const sel = document.getElementById('roomModalTypeId');
            sel.innerHTML = '<option value="">-- No Type --</option>';
            roomTypeCache.forEach(rt => {
                const opt = document.createElement('option');
                opt.value = rt.roomTypeId;
                opt.textContent = rt.name;
                opt.dataset.basePrice = rt.basePrice || 0;
                sel.appendChild(opt);
            });
        } catch (e) { console.error('Could not load room types', e); }
    }

    // Auto-fill price when room type is selected
    document.getElementById('roomModalTypeId').addEventListener('change', function () {
        const selected = this.options[this.selectedIndex];
        const basePrice = selected.dataset.basePrice;
        if (basePrice && basePrice > 0) {
            document.getElementById('roomModalPrice').value = basePrice;
        }
    });

    roomModalForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('roomModalId').value;
        const isEdit = !!id;
        const btn = document.getElementById('roomModalSaveBtn');
        btn.textContent = 'Saving...'; btn.disabled = true;

        const payload = {
            roomNumber: document.getElementById('roomModalNumber').value,
            price: parseFloat(document.getElementById('roomModalPrice').value),
            status: document.getElementById('roomModalStatus').value,
            roomTypeId: parseInt(document.getElementById('roomModalTypeId').value) || null
        };

        try {
            if (isEdit) {
                await ApiService.put(`/admin/rooms/${id}`, payload);
            } else {
                await ApiService.post('/admin/rooms', payload);
            }
            closeRoomModal();
            loadRooms();
        } catch (error) {
            roomModalAlert.textContent = error.message;
            roomModalAlert.className = 'alert alert-error';
            roomModalAlert.style.display = 'block';
        } finally {
            btn.textContent = 'Save'; btn.disabled = false;
        }
    });

    async function loadRooms() {
        const tbody = document.getElementById('roomsTableBody');
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">Loading...</td></tr>';
        try {
            const data = await ApiService.get('/admin/rooms');
            tbody.innerHTML = '';
            if (!data.length) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center">No rooms found.</td></tr>';
                return;
            }
            const statusColor = { Available: '#10B981', Occupied: '#EF4444', Maintenance: '#F59E0B' };
            data.forEach(r => {
                const color = statusColor[r.status] || '#94A3B8';
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${r.roomId}</td>
                    <td><strong>${r.roomNumber}</strong></td>
                    <td>${r.roomType ? r.roomType.name : '—'}</td>
                    <td>$${r.price}</td>
                    <td><span style="color:${color}; font-weight:600;">● ${r.status}</span></td>
                    <td>
                        <div style="display:flex; gap:6px; flex-wrap:wrap;">
                            <button class="btn btn-warning btn-xs" onclick="editRoom(${r.roomId}, '${r.roomNumber}', ${r.price}, '${r.status}', ${r.roomTypeId || 'null'})">Edit</button>
                            <button class="btn btn-danger btn-xs" onclick="deleteRoom(${r.roomId})">Delete</button>
                        </div>
                    </td>`;
                tbody.appendChild(tr);
            });
        } catch (error) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center text-error">Failed: ${error.message}</td></tr>`;
        }
    }

    window.editRoom = async (id, number, price, status, roomTypeId) => {
        document.getElementById('roomModalId').value = id;
        document.getElementById('roomModalNumber').value = number;
        document.getElementById('roomModalPrice').value = price;
        document.getElementById('roomModalStatus').value = status;
        await openRoomModal(true);
        if (roomTypeId) document.getElementById('roomModalTypeId').value = roomTypeId;
    };

    window.changeRoomStatus = async (roomId) => {
        const s = prompt("New status (Available, Occupied, Maintenance):");
        if (!s) return;
        try {
            await fetch(`http://localhost:5034/api/admin/rooms/${roomId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('jwt_token')}` },
                body: JSON.stringify(s)
            });
            loadRooms();
        } catch (error) { alert(error.message); }
    };

    window.deleteRoom = async (id) => {
        if (!confirm(`Delete room #${id}? This cannot be undone.`)) return;
        try {
            await ApiService.delete(`/admin/rooms/${id}`);
            loadRooms();
        } catch (error) { alert('Failed: ' + error.message); }
    };

    // ------------------- ROOM TYPES (full CRUD) -------------------
    const roomTypeModal = document.getElementById('roomTypeModal');
    const roomTypeModalForm = document.getElementById('roomTypeModalForm');
    const roomTypeModalAlert = document.getElementById('roomTypeModalAlert');

    const openRoomTypeModal = (isEdit = false) => {
        roomTypeModal.classList.remove('hidden');
        document.getElementById('roomTypeModalTitle').textContent = isEdit ? 'Edit Room Type' : 'Create Room Type';
        roomTypeModalAlert.style.display = 'none';
        if (!isEdit) roomTypeModalForm.reset();
    };
    const closeRoomTypeModal = () => { roomTypeModal.classList.add('hidden'); roomTypeCache = []; }; // bust cache

    document.getElementById('openCreateRoomTypeBtn').addEventListener('click', () => {
        document.getElementById('roomTypeModalId').value = '';
        openRoomTypeModal(false);
    });
    document.getElementById('closeRoomTypeModal').addEventListener('click', closeRoomTypeModal);
    document.getElementById('closeRoomTypeModalBtn').addEventListener('click', closeRoomTypeModal);

    roomTypeModalForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('roomTypeModalId').value;
        const isEdit = !!id;
        const btn = document.getElementById('roomTypeModalSaveBtn');
        btn.textContent = 'Saving...'; btn.disabled = true;

        const payload = {
            name: document.getElementById('roomTypeModalName').value,
            basePrice: parseFloat(document.getElementById('roomTypeModalBasePrice').value) || 0,
            description: document.getElementById('roomTypeModalDesc').value
        };

        try {
            if (isEdit) {
                await ApiService.put(`/admin/room-types/${id}`, payload);
            } else {
                await ApiService.post('/admin/room-types', payload);
            }
            closeRoomTypeModal();
            loadRoomTypes();
        } catch (error) {
            roomTypeModalAlert.textContent = error.message;
            roomTypeModalAlert.className = 'alert alert-error';
            roomTypeModalAlert.style.display = 'block';
        } finally {
            btn.textContent = 'Save'; btn.disabled = false;
        }
    });

    async function loadRoomTypes() {
        const tbody = document.getElementById('roomTypesTableBody');
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">Loading...</td></tr>';
        try {
            const data = await ApiService.get('/admin/room-types');
            roomTypeCache = data; // also refresh the cache
            tbody.innerHTML = '';
            if (!data.length) {
                tbody.innerHTML = '<tr><td colspan="4" class="text-center">No room types found.</td></tr>';
                return;
            }
            data.forEach(rt => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${rt.roomTypeId}</td>
                    <td><strong>${rt.name}</strong></td>
                    <td>${rt.description || '—'}</td>
                    <td>
                        <div style="display:flex; gap:6px;">
                            <button class="btn btn-warning btn-xs" onclick="editRoomType(${rt.roomTypeId}, '${rt.name}', ${rt.basePrice || 0}, '${(rt.description || '').replace(/'/g, "\\'")}')">Edit</button>
                            <button class="btn btn-danger btn-xs" onclick="deleteRoomType(${rt.roomTypeId})">Delete</button>
                        </div>
                    </td>`;
                tbody.appendChild(tr);
            });
        } catch (error) {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center text-error">Failed: ${error.message}</td></tr>`;
        }
    }

    window.editRoomType = (id, name, basePrice, desc) => {
        document.getElementById('roomTypeModalId').value = id;
        document.getElementById('roomTypeModalName').value = name;
        document.getElementById('roomTypeModalBasePrice').value = basePrice;
        document.getElementById('roomTypeModalDesc').value = desc;
        openRoomTypeModal(true);
    };

    window.deleteRoomType = async (id) => {
        if (!confirm(`Delete room type #${id}?`)) return;
        try {
            await ApiService.delete(`/admin/room-types/${id}`);
            roomTypeCache = [];
            loadRoomTypes();
        } catch (error) { alert('Failed: ' + error.message); }
    };

    // ------------------- SERVICES (full CRUD) -------------------
    const serviceModal = document.getElementById('serviceModal');
    const serviceModalForm = document.getElementById('serviceModalForm');
    const serviceModalAlert = document.getElementById('serviceModalAlert');

    const openServiceModal = (isEdit = false) => {
        serviceModal.classList.remove('hidden');
        document.getElementById('serviceModalTitle').textContent = isEdit ? 'Edit Service' : 'Create Service';
        serviceModalAlert.style.display = 'none';
        if (!isEdit) serviceModalForm.reset();
    };
    const closeServiceModal = () => serviceModal.classList.add('hidden');

    document.getElementById('openCreateServiceBtn').addEventListener('click', () => {
        document.getElementById('serviceModalId').value = '';
        openServiceModal(false);
    });
    document.getElementById('closeServiceModal').addEventListener('click', closeServiceModal);
    document.getElementById('closeServiceModalBtn').addEventListener('click', closeServiceModal);

    serviceModalForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('serviceModalId').value;
        const isEdit = !!id;
        const payload = {
            name: document.getElementById('serviceModalName').value,
            price: parseFloat(document.getElementById('serviceModalPrice').value)
        };
        try {
            if (isEdit) await ApiService.put(`/admin/services/${id}`, payload);
            else await ApiService.post('/admin/services', payload);
            closeServiceModal();
            loadServices();
        } catch (error) {
            serviceModalAlert.textContent = error.message;
            serviceModalAlert.className = 'alert alert-error';
            serviceModalAlert.style.display = 'block';
        }
    });

    async function loadServices() {
        const tbody = document.getElementById('servicesTableBody');
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">Loading...</td></tr>';
        try {
            const data = await ApiService.get('/admin/services');
            tbody.innerHTML = '';
            data.forEach(s => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${s.serviceId}</td>
                    <td>${s.name}</td>
                    <td>$${s.price}</td>
                    <td>
                        <div style="display:flex; gap:6px;">
                            <button class="btn btn-warning btn-xs" onclick="editService(${s.serviceId}, '', ${s.price})">Edit</button>
                            <button class="btn btn-danger btn-xs" onclick="deleteService(${s.serviceId})">Delete</button>
                        </div>
                    </td>`;
                // To avoid quoting issues with names, we attach via properties or use safely encoded strings
                tr.querySelector('.btn-warning').onclick = () => editService(s.serviceId, s.name, s.price);
                tbody.appendChild(tr);
            });
        } catch (error) {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center text-error">Failed: ${error.message}</td></tr>`;
        }
    }

    window.editService = (id, name, price) => {
        document.getElementById('serviceModalId').value = id;
        document.getElementById('serviceModalName').value = name;
        document.getElementById('serviceModalPrice').value = price;
        openServiceModal(true);
    };

    window.promptPrice = async (serviceId) => {
        const p = prompt("Enter new price:");
        if (!p) return;
        try {
            await ApiService.put(`/admin/services/${serviceId}/price`, parseFloat(p));
            loadServices();
        } catch (error) { alert(error.message); }
    };

    window.deleteService = async (id) => {
        if (!confirm(`Delete service #${id}?`)) return;
        try {
            await ApiService.delete(`/admin/services/${id}`);
            loadServices();
        } catch (error) { alert('Failed: ' + error.message); }
    };

    // ------------------- PRICING (full CRUD) -------------------
    const pricingModal = document.getElementById('pricingModal');
    const pricingModalForm = document.getElementById('pricingModalForm');
    const pricingModalAlert = document.getElementById('pricingModalAlert');

    const openPricingModal = async (isEdit = false) => {
        pricingModal.classList.remove('hidden');
        document.getElementById('pricingModalTitle').textContent = isEdit ? 'Edit Pricing' : 'Create Pricing';
        pricingModalAlert.style.display = 'none';
        if (!isEdit) pricingModalForm.reset();
        await loadRoomTypeDropdownForPricing();
    };
    const closePricingModal = () => pricingModal.classList.add('hidden');

    document.getElementById('openCreatePricingBtn').addEventListener('click', () => {
        document.getElementById('pricingModalId').value = '';
        openPricingModal(false);
    });
    document.getElementById('closePricingModal').addEventListener('click', closePricingModal);
    document.getElementById('closePricingModalBtn').addEventListener('click', closePricingModal);

    async function loadRoomTypeDropdownForPricing() {
        try {
            if (roomTypeCache.length === 0) roomTypeCache = await ApiService.get('/admin/room-types');
            const sel = document.getElementById('pricingModalRoomType');
            sel.innerHTML = '<option value="">-- Select Room Type --</option>';
            roomTypeCache.forEach(rt => {
                const opt = document.createElement('option');
                opt.value = rt.roomTypeId;
                opt.textContent = rt.name;
                sel.appendChild(opt);
            });
        } catch (e) { console.error('Could not load room types for pricing', e); }
    }

    pricingModalForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('pricingModalId').value;
        const isEdit = !!id;
        const payload = {
            roomTypeId: parseInt(document.getElementById('pricingModalRoomType').value),
            seasonName: document.getElementById('pricingModalSeason').value,
            multiplier: parseFloat(document.getElementById('pricingModalMultiplier').value),
            startDate: document.getElementById('pricingModalStart').value,
            endDate: document.getElementById('pricingModalEnd').value
        };
        if (new Date(payload.endDate) <= new Date(payload.startDate)) {
            pricingModalAlert.textContent = 'End date must be greater than start date';
            pricingModalAlert.className = 'alert alert-error';
            pricingModalAlert.style.display = 'block';
            return;
        }
        try {
            if (isEdit) await ApiService.put(`/admin/pricing/${id}`, payload);
            else await ApiService.post('/admin/pricing', payload);
            closePricingModal();
            loadPricing();
        } catch (error) {
            pricingModalAlert.textContent = error.message;
            pricingModalAlert.className = 'alert alert-error';
            pricingModalAlert.style.display = 'block';
        }
    });

    function getStatus(startDate, endDate) {
        const now = new Date();
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (start > now) return { label: 'Upcoming', color: '#3B82F6' };
        if (start <= now && end >= now) return { label: 'Active', color: '#10B981' };
        return { label: 'Expired', color: '#EF4444' };
    }

    async function loadPricing() {
        const tbody = document.getElementById('pricingTableBody');
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">Loading...</td></tr>';
        try {
            const data = await ApiService.get('/admin/pricing');
            tbody.innerHTML = '';
            if (!data.length) {
                tbody.innerHTML = '<tr><td colspan="8" class="text-center">No pricing records found.</td></tr>';
                return;
            }
            data.forEach(p => {
                const tr = document.createElement('tr');
                const startDate = p.startDate ? p.startDate.split('T')[0] : '';
                const endDate = p.endDate ? p.endDate.split('T')[0] : '';
                const status = getStatus(p.startDate, p.endDate);
                const isUpcoming = status.label === 'Upcoming';
                tr.innerHTML = `
                    <td>${p.pricingId}</td>
                    <td>${p.roomType ? p.roomType.name : 'Unknown'}</td>
                    <td>${p.seasonName}</td>
                    <td>${p.multiplier}x</td>
                    <td>${startDate}</td>
                    <td>${endDate}</td>
                    <td><span style="color:${status.color}; font-weight:600;">● ${status.label}</span></td>
                    <td>
                        <div style="display:flex; gap:6px;">
                            ${isUpcoming ? '<button class="btn btn-warning btn-xs edit-pricing-btn">Edit</button>' : ''}
                        </div>
                    </td>`;
                if (isUpcoming) {
                    tr.querySelector('.edit-pricing-btn').onclick = () => editPricing(p.pricingId, p.roomTypeId, p.seasonName, p.multiplier, p.startDate, p.endDate);
                }
                tbody.appendChild(tr);
            });
        } catch (error) {
            tbody.innerHTML = `<tr><td colspan="8" class="text-center text-error">Failed: ${error.message}</td></tr>`;
        }
    }

    window.editPricing = async (id, roomTypeId, seasonName, multiplier, startDate, endDate) => {
        document.getElementById('pricingModalId').value = id;
        document.getElementById('pricingModalSeason').value = seasonName;
        document.getElementById('pricingModalMultiplier').value = multiplier;
        document.getElementById('pricingModalStart').value = startDate ? startDate.split('T')[0] : '';
        document.getElementById('pricingModalEnd').value = endDate ? endDate.split('T')[0] : '';
        await openPricingModal(true);
        document.getElementById('pricingModalRoomType').value = roomTypeId;
    };

    // ------------------- PROMOTIONS (full CRUD) -------------------
    const promotionModal = document.getElementById('promotionModal');
    const promotionModalForm = document.getElementById('promotionModalForm');
    const promotionModalAlert = document.getElementById('promotionModalAlert');

    const openPromotionModal = (isEdit = false) => {
        promotionModal.classList.remove('hidden');
        document.getElementById('promotionModalTitle').textContent = isEdit ? 'Edit Promotion' : 'Create Promotion';
        promotionModalAlert.style.display = 'none';
        if (!isEdit) promotionModalForm.reset();
    };
    const closePromotionModal = () => promotionModal.classList.add('hidden');

    document.getElementById('openCreatePromotionBtn').addEventListener('click', () => {
        document.getElementById('promotionModalId').value = '';
        openPromotionModal(false);
    });
    document.getElementById('closePromotionModal').addEventListener('click', closePromotionModal);
    document.getElementById('closePromotionModalBtn').addEventListener('click', closePromotionModal);

    promotionModalForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('promotionModalId').value;
        const isEdit = !!id;
        const payload = {
            code: document.getElementById('promotionModalCode').value,
            discountPercentage: parseFloat(document.getElementById('promotionModalDiscount').value),
            startDate: document.getElementById('promotionModalStart').value,
            endDate: document.getElementById('promotionModalEnd').value
        };
        if (new Date(payload.endDate) <= new Date(payload.startDate)) {
            promotionModalAlert.textContent = 'End date must be greater than start date';
            promotionModalAlert.className = 'alert alert-error';
            promotionModalAlert.style.display = 'block';
            return;
        }
        try {
            if (isEdit) await ApiService.put(`/admin/promotions/${id}`, payload);
            else await ApiService.post('/admin/promotions', payload);
            closePromotionModal();
            loadPromotions();
        } catch (error) {
            promotionModalAlert.textContent = error.message;
            promotionModalAlert.className = 'alert alert-error';
            promotionModalAlert.style.display = 'block';
        }
    });

    async function loadPromotions() {
        const tbody = document.getElementById('promotionsTableBody');
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">Loading...</td></tr>';
        try {
            const data = await ApiService.get('/admin/promotions');
            tbody.innerHTML = '';
            if (!data.length) {
                tbody.innerHTML = '<tr><td colspan="7" class="text-center">No promotions found.</td></tr>';
                return;
            }
            data.forEach(p => {
                const tr = document.createElement('tr');
                const startDate = p.startDate ? p.startDate.split('T')[0] : '';
                const endDate = p.endDate ? p.endDate.split('T')[0] : '';
                const status = getStatus(p.startDate, p.endDate);
                const isUpcoming = status.label === 'Upcoming';
                const isActive = status.label === 'Active';
                tr.innerHTML = `
                    <td>${p.promotionId}</td>
                    <td><strong>${p.code}</strong></td>
                    <td>${p.discountPercentage}%</td>
                    <td>${startDate}</td>
                    <td>${endDate}</td>
                    <td><span style="color:${status.color}; font-weight:600;">● ${status.label}</span></td>
                    <td>
                        <div style="display:flex; gap:6px;">
                            ${isUpcoming ? '<button class="btn btn-warning btn-xs edit-promo-btn">Edit</button>' : ''}
                            ${!isActive ? '<button class="btn btn-danger btn-xs delete-promo-btn">Delete</button>' : ''}
                        </div>
                    </td>`;
                if (isUpcoming) {
                    tr.querySelector('.edit-promo-btn').onclick = () => editPromotion(p.promotionId, p.code, p.discountPercentage, p.startDate, p.endDate);
                }
                if (!isActive) {
                    tr.querySelector('.delete-promo-btn').onclick = () => deletePromotion(p.promotionId);
                }
                tbody.appendChild(tr);
            });
        } catch (error) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center text-error">Failed: ${error.message}</td></tr>`;
        }
    }

    window.editPromotion = (id, code, discountPercentage, startDate, endDate) => {
        document.getElementById('promotionModalId').value = id;
        document.getElementById('promotionModalCode').value = code;
        document.getElementById('promotionModalDiscount').value = discountPercentage;
        document.getElementById('promotionModalStart').value = startDate ? startDate.split('T')[0] : '';
        document.getElementById('promotionModalEnd').value = endDate ? endDate.split('T')[0] : '';
        openPromotionModal(true);
    };

    window.deletePromotion = async (id) => {
        if (!confirm(`Delete promotion #${id}?`)) return;
        try {
            await ApiService.delete(`/admin/promotions/${id}`);
            loadPromotions();
        } catch (error) { alert('Failed: ' + error.message); }
    };
});
