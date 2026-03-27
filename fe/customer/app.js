document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('jwt_token');
    if (!token) { window.location.href = '../index.html'; return; }

    const sections = ['roomsSection', 'bookingsSection', 'profileSection', 'reviewsSection', 'requestsSection'];
    const navItems = document.querySelectorAll('.nav-item');
    let currentRoomId = null;
    let currentRoomPrice = 0;
    // ------------------- INITIALIZATION -------------------
    const today = new Date();
    const tmr = new Date(today);
    tmr.setDate(today.getDate() + 1);
    
    // YYYY-MM-DD
    const formatDate = d => d.toISOString().split('T')[0];
    
    document.getElementById('searchCheckIn').value = formatDate(today);
    document.getElementById('searchCheckOut').value = formatDate(tmr);

    // ------------------- NAVIGATION -------------------
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            const targetId = item.getAttribute('data-target');
            sections.forEach(sec => document.getElementById(sec).classList.add('hidden'));
            document.getElementById(targetId).classList.remove('hidden');
            if (targetId === 'bookingsSection') loadBookings();
            if (targetId === 'roomsSection') loadRooms();
            if (targetId === 'reviewsSection') loadReviews();
            if (targetId === 'requestsSection') loadSupportBookings();
        });
    });

    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('jwt_token');
        window.location.href = '../index.html';
    });

    document.getElementById('refreshBookingsBtn')?.addEventListener('click', loadBookings);

    await loadUserProfile();
    loadRooms();

    // ------------------- PROFILE -------------------
    async function loadUserProfile() {
        try {
            const up = await ApiService.get('/auth/me');
            const displayFullName = (up.fullName && up.fullName !== 'undefined') ? up.fullName : '';
            const displayEmail = up.email || '';
            const displayAvatar = up.avatar || 'https://via.placeholder.com/100';
            document.getElementById('userNameDisplay').textContent = `Welcome, ${displayFullName || 'User'}`;
            document.getElementById('profEmail').value = displayEmail;
            document.getElementById('profFullName').value = displayFullName;
            document.getElementById('profAvatar').value = displayAvatar !== 'https://via.placeholder.com/100' ? displayAvatar : '';
            document.getElementById('avatarDisplay').src = displayAvatar;
        } catch (error) { console.error('Failed to load profile:', error); }
    }

    document.getElementById('profileForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const alertBox = document.getElementById('profileAlert');
        try {
            await ApiService.put('/users/profile', {
                fullName: document.getElementById('profFullName').value,
                avatar: document.getElementById('profAvatar').value
            });
            alertBox.textContent = 'Profile updated!';
            alertBox.className = 'alert alert-success';
            alertBox.style.display = 'block';
            await loadUserProfile();
        } catch (error) {
            alertBox.textContent = error.message;
            alertBox.className = 'alert alert-error';
            alertBox.style.display = 'block';
        }
    });

    document.getElementById('passwordForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const newPass = document.getElementById('newPassword').value;
        const confPass = document.getElementById('confirmPassword').value;
        const alertBox = document.getElementById('passwordAlert');
        if (newPass !== confPass) {
            alertBox.textContent = 'New password and Confirm password do not match.';
            alertBox.className = 'alert alert-error';
            alertBox.style.display = 'block';
            return;
        }
        try {
            await ApiService.put('/users/change-password', {
                currentPassword: document.getElementById('currentPassword').value,
                newPassword: newPass
            });
            alertBox.textContent = 'Password changed successfully!';
            alertBox.className = 'alert alert-success';
            alertBox.style.display = 'block';
            document.getElementById('currentPassword').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmPassword').value = '';
        } catch (error) {
            alertBox.textContent = error.message;
            alertBox.className = 'alert alert-error';
            alertBox.style.display = 'block';
        }
    });

    // ------------------- ROOMS -------------------
    document.getElementById('searchRoomsBtn').addEventListener('click', () => {
        const checkIn = document.getElementById('searchCheckIn').value;
        const checkOut = document.getElementById('searchCheckOut').value;
        if (checkIn && checkOut) {
            loadRooms(`/rooms/search?checkIn=${checkIn}&checkOut=${checkOut}`);
        } else {
            loadRooms();
        }
    });

    document.getElementById('clearSearchBtn').addEventListener('click', () => {
        document.getElementById('searchCheckIn').value = '';
        document.getElementById('searchCheckOut').value = '';
        document.getElementById('searchRoomType').value = '';
        document.getElementById('searchMaxPrice').value = '';
        loadRooms();
    });

    async function loadRooms(endpoint = '/rooms') {
        const grid = document.getElementById('roomsGrid');
        grid.innerHTML = '<div class="glass-panel" style="padding:1.5rem;text-align:center;color:var(--text-muted);">Loading rooms...</div>';
        try {
            let data = await ApiService.get(endpoint);

            // Populate room type dropdown from real data (first load only)
            const sel = document.getElementById('searchRoomType');
            if (sel.options.length === 1) { // only the default "All Types" option
                const seen = new Set();
                data.forEach(r => {
                    if (r.roomType && !seen.has(r.roomType.roomTypeId)) {
                        seen.add(r.roomType.roomTypeId);
                        const opt = document.createElement('option');
                        opt.value = r.roomType.roomTypeId;
                        opt.textContent = r.roomType.name;
                        sel.appendChild(opt);
                    }
                });
            }

            // Client-side filters: room type and max price
            const typeFilter = document.getElementById('searchRoomType').value;
            const maxPrice = parseFloat(document.getElementById('searchMaxPrice').value);
            if (typeFilter) data = data.filter(r => r.roomType && r.roomType.roomTypeId == typeFilter);
            if (!isNaN(maxPrice) && maxPrice > 0) data = data.filter(r => r.price <= maxPrice);

            grid.innerHTML = '';
            if (!data.length) {
                grid.innerHTML = '<div class="glass-panel" style="padding:1.5rem;text-align:center;color:var(--text-muted);">No rooms found matching your criteria.</div>';
                return;
            }
            const statusColor = { Available: '#10B981', Occupied: '#EF4444', Maintenance: '#F59E0B' };
            data.forEach(r => {
                const color = statusColor[r.status] || '#94A3B8';
                const card = document.createElement('div');
                card.className = 'glass-panel';
                card.style.cssText = 'padding: 1.5rem; border-radius: 12px; display:flex; flex-direction:column; gap:0.5rem;';
                card.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <h4 style="margin:0;">Room ${r.roomNumber}</h4>
                        <span style="color:${color}; font-size:0.8rem; font-weight:600;">● ${r.status}</span>
                    </div>
                    <div style="color:var(--text-muted); font-size:0.85rem;">
                        🏷️ ${r.roomType ? r.roomType.name : 'Standard'}
                    </div>
                    <div style="font-size:1.25rem; font-weight:600; color:var(--primary-color);">
                        $${r.price}<span style="font-size:0.8rem;color:var(--text-muted);font-weight:400;">/night</span>
                    </div>
                    <button class="btn ${r.status === 'Available' ? 'btn-primary' : 'btn-secondary'}"
                        onclick="openRoomDetail(${r.roomId}, '${r.roomNumber}', ${r.price}, '${r.roomType ? r.roomType.name : 'Standard'}', '${r.status}')"
                        ${r.status !== 'Available' ? 'disabled' : ''}
                        style="margin-top:0.5rem;">
                        ${r.status === 'Available' ? '📅 View & Book' : r.status}
                    </button>`;
                grid.appendChild(card);
            });
        } catch (error) {
            grid.innerHTML = `<div class="glass-panel" style="padding:1.5rem;text-align:center;color:var(--danger-color);">Failed: ${error.message}</div>`;
        }
    }

    // ------------------- ROOM DETAIL MODAL -------------------
    const roomDetailModal = document.getElementById('roomDetailModal');
    document.getElementById('closeRoomDetail').addEventListener('click', () => roomDetailModal.classList.add('hidden'));
    document.getElementById('closeRoomDetailBtn').addEventListener('click', () => roomDetailModal.classList.add('hidden'));

    window.openRoomDetail = async (id, number, price, type, status) => {
        currentRoomId = id;
        currentRoomPrice = price;
        document.getElementById('roomDetailTitle').textContent = `Room ${number}`;
        
        let contentHtml = `
            <p><strong>🏷️ Type:</strong> ${type}</p>
            <p><strong>💰 Price:</strong> <span style="color:var(--primary-color);font-weight:600;">$${price}/night</span></p>
            <p><strong>📌 Status:</strong> ${status}</p>
            <hr style="margin: 1rem 0; border: none; border-top: 1px solid rgba(255,255,255,0.1);">
            <h4 style="margin-bottom:0.5rem;">Guest Reviews</h4>
            <div id="roomReviewsContainer" style="max-height: 200px; overflow-y: auto; font-size: 0.9rem; color: var(--text-muted);">
                <em>Loading reviews...</em>
            </div>
        `;
        document.getElementById('roomDetailContent').innerHTML = contentHtml;
        
        // Auto-fill dates from search inputs
        const searchCheckIn = document.getElementById('searchCheckIn').value;
        const searchCheckOut = document.getElementById('searchCheckOut').value;
        
        const bookIn = document.getElementById('bookCheckIn');
        const bookOut = document.getElementById('bookCheckOut');
        
        bookIn.value = searchCheckIn;
        bookOut.value = searchCheckOut;
        
        // Set min date to today to prevent past bookings
        const todayStr = formatDate(new Date());
        bookIn.min = todayStr;
        bookOut.min = todayStr;

        document.getElementById('bookingPricePreview').style.display = 'none';
        document.getElementById('bookingAlert').style.display = 'none';
        roomDetailModal.classList.remove('hidden');
        
        // Fetch reviews
        try {
            const reviews = await ApiService.get(`/reviews/room/${id}`);
            const revContainer = document.getElementById('roomReviewsContainer');
            if (!reviews || reviews.length === 0) {
                revContainer.innerHTML = '<em>No reviews yet.</em>';
            } else {
                let revHtml = '';
                reviews.forEach(r => {
                    const stars = '⭐'.repeat(r.rating);
                    const date = new Date(r.createdAt).toLocaleDateString('vi-VN');
                    revHtml += `
                        <div style="background: rgba(255,255,255,0.05); padding: 0.75rem; border-radius: 8px; margin-bottom: 0.5rem;">
                            <div style="display:flex; justify-content:space-between; margin-bottom:0.25rem;">
                                <strong>${r.customerName}</strong>
                                <span>${stars}</span>
                            </div>
                            <div style="margin-bottom:0.25rem;">${r.comment || '<em>No comment</em>'}</div>
                            <div style="font-size:0.8rem; opacity:0.7;">${date}</div>
                            ${r.staffReply ? `<div style="margin-top:0.5rem; padding-left:0.5rem; border-left: 2px solid var(--primary-color); color: var(--primary-color);"><strong>Staff:</strong> ${r.staffReply}</div>` : ''}
                        </div>
                    `;
                });
                revContainer.innerHTML = revHtml;
            }
        } catch(e) {
            document.getElementById('roomReviewsContainer').innerHTML = '<em class="text-error">Failed to load reviews.</em>';
        }
        
        updatePricePreview(); // Update preview if dates are pre-filled
    };

    // Price preview on date change
    ['bookCheckIn', 'bookCheckOut'].forEach(id => {
        document.getElementById(id).addEventListener('change', updatePricePreview);
    });

    function updatePricePreview() {
        const checkIn = new Date(document.getElementById('bookCheckIn').value);
        const checkOut = new Date(document.getElementById('bookCheckOut').value);
        if (isNaN(checkIn) || isNaN(checkOut) || checkOut <= checkIn) {
            document.getElementById('bookingPricePreview').style.display = 'none';
            return;
        }
        const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
        const total = (nights * currentRoomPrice).toFixed(2);
        document.getElementById('estTotal').textContent = `$${total} (${nights} nights)`;
        document.getElementById('bookingPricePreview').style.display = 'block';
    }

    document.getElementById('confirmBookBtn').addEventListener('click', async () => {
        const checkIn = document.getElementById('bookCheckIn').value;
        const checkOut = document.getElementById('bookCheckOut').value;
        const alertBox = document.getElementById('bookingAlert');
        
        if (!checkIn || !checkOut) {
            alertBox.textContent = 'Please select check-in and check-out dates.';
            alertBox.className = 'alert alert-error';
            alertBox.style.display = 'block';
            return;
        }
        
        const checkInDate = new Date(checkIn);
        const checkOutDate = new Date(checkOut);
        const today = new Date();
        today.setHours(0,0,0,0);
        checkInDate.setHours(0,0,0,0);
        
        if (checkInDate < today) {
            alertBox.textContent = 'Cannot book dates in the past.';
            alertBox.className = 'alert alert-error';
            alertBox.style.display = 'block';
            return;
        }
        
        if (checkOutDate <= checkInDate) {
            alertBox.textContent = 'Check-out must be after check-in.';
            alertBox.className = 'alert alert-error';
            alertBox.style.display = 'block';
            return;
        }
        
        const btn = document.getElementById('confirmBookBtn');
        btn.textContent = 'Booking...'; btn.disabled = true;
        try {
            await ApiService.post('/bookings', {
                roomId: currentRoomId,
                checkInDate: checkIn,
                checkOutDate: checkOut
            });
            roomDetailModal.classList.add('hidden');
            // Switch to bookings tab
            document.querySelector('[data-target="bookingsSection"]').click();
        } catch (error) {
            alertBox.textContent = 'Booking failed: ' + error.message;
            alertBox.className = 'alert alert-error';
            alertBox.style.display = 'block';
        } finally {
            btn.textContent = '✔ Confirm Booking'; btn.disabled = false;
        }
    });

    // ------------------- BOOKINGS -------------------
    async function loadBookings() {
        const tbody = document.getElementById('bookingsTableBody');
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">Loading...</td></tr>';
        try {
            const data = await ApiService.get('/bookings');
            tbody.innerHTML = '';
            if (!data.length) {
                tbody.innerHTML = '<tr><td colspan="7" class="text-center">You have no bookings yet.</td></tr>';
                return;
            }
            const statusColor = { Confirmed: '#10B981', Pending: '#F59E0B', Cancelled: '#EF4444', Completed: '#6366F1', Paid: '#10B981' };
            data.forEach(b => {
                const color = statusColor[b.status] || '#94A3B8';
                const checkIn = new Date(b.checkInDate).toLocaleDateString('vi-VN');
                const checkOut = new Date(b.checkOutDate).toLocaleDateString('vi-VN');
                const canCancel = b.status !== 'Cancelled' && b.status !== 'Completed' && b.status !== 'Paid' && b.status !== 'CheckedIn';
                const canReview = b.status === 'Completed' || b.status === 'Paid';
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>#${b.bookingId}</td>
                    <td>${b.roomNumber || (b.room ? b.room.roomNumber : b.roomId)}</td>
                    <td>${checkIn}</td>
                    <td>${checkOut}</td>
                    <td style="font-weight:600;">$${b.totalPrice}</td>
                    <td><span style="color:${color};font-weight:600;">● ${b.status}</span></td>
                    <td>
                        <div style="display:flex;gap:6px;">
                            <button class="btn btn-secondary btn-xs" onclick="viewBookingDetail(${b.bookingId}, '${b.status}')">Detail</button>
                            <button class="btn btn-secondary btn-xs" onclick="viewInvoice(${b.bookingId}, '${b.status}')">🧾 Invoice</button>
                            ${canCancel ? `<button class="btn btn-danger btn-xs" onclick="cancelBookingQuick(${b.bookingId})">Cancel</button>` : ''}
                            ${canReview ? `<button class="btn btn-primary btn-xs" onclick="openReviewModal(${b.bookingId})">⭐ Review</button>` : ''}
                        </div>
                    </td>`;
                tbody.appendChild(tr);
            });
        } catch (error) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center text-error">Failed: ${error.message}</td></tr>`;
        }
    }

    // ------------------- BOOKING DETAIL MODAL -------------------
    const bookingDetailModal = document.getElementById('bookingDetailModal');
    document.getElementById('closeBookingDetail').addEventListener('click', () => bookingDetailModal.classList.add('hidden'));
    document.getElementById('closeBookingDetailBtn').addEventListener('click', () => bookingDetailModal.classList.add('hidden'));

    window.viewBookingDetail = async (id, status) => {
        currentBookingId = id;
        document.getElementById('bookingDetailTitle').textContent = `Booking #${id}`;
        document.getElementById('bookingDetailContent').innerHTML = '<p style="color:var(--text-muted);">Loading...</p>';
        bookingDetailModal.classList.remove('hidden');

        try {
            const b = await ApiService.get(`/bookings/${id}`);
            const checkIn = new Date(b.checkInDate).toLocaleDateString('vi-VN');
            const checkOut = new Date(b.checkOutDate).toLocaleDateString('vi-VN');
            document.getElementById('bookingDetailContent').innerHTML = `
                <p><strong>Room:</strong> ${b.roomNumber || b.roomId}</p>
                <p><strong>Check-In:</strong> ${checkIn}</p>
                <p><strong>Check-Out:</strong> ${checkOut}</p>
                <p><strong>Total Price:</strong> <span style="color:var(--primary-color);font-weight:600;">$${b.totalPrice}</span></p>
                <p><strong>Status:</strong> ${b.status}</p>`;
        } catch (e) {
            document.getElementById('bookingDetailContent').innerHTML = '<p class="text-error">Could not load details.</p>';
        }

        // Show/hide cancel button
        const canCancel = status !== 'Cancelled' && status !== 'Completed' && status !== 'Paid' && status !== 'CheckedIn';
        document.getElementById('cancelBtnContainer').style.display = canCancel ? 'block' : 'none';

        // Load services dropdown
        try {
            const services = await ApiService.get('/services');
            const sel = document.getElementById('serviceSelect');
            sel.innerHTML = '<option value="">Select a service...</option>';
            services.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s.serviceId;
                opt.textContent = `${s.name} - $${s.price}`;
                sel.appendChild(opt);
            });
        } catch (e) { console.error('Could not load services'); }
    };

    document.getElementById('cancelBookingBtn').addEventListener('click', async () => {
        if (!currentBookingId) return;
        if (!confirm('Are you sure you want to cancel this booking?')) return;
        try {
            await ApiService.put(`/bookings/${currentBookingId}/cancel`, {});
            bookingDetailModal.classList.add('hidden');
            loadBookings();
        } catch (error) { alert('Failed to cancel: ' + error.message); }
    });

    window.cancelBookingQuick = async (id) => {
        if (!confirm(`Cancel booking #${id}?`)) return;
        try {
            await ApiService.put(`/bookings/${id}/cancel`, {});
            loadBookings();
        } catch (error) { alert('Failed: ' + error.message); }
    };

    document.getElementById('addServiceBtn').addEventListener('click', async () => {
        if (!currentBookingId) return;
        const serviceId = document.getElementById('serviceSelect').value;
        const qty = parseInt(document.getElementById('serviceQty').value) || 1;
        if (!serviceId) { alert('Please select a service.'); return; }
        try {
            const res = await ApiService.post(`/bookings/${currentBookingId}/services`, {
                serviceId: parseInt(serviceId),
                quantity: qty
            });
            alert('Service added! New total: $' + (res.totalPrice || ''));
        } catch (error) { alert('Failed to add service: ' + error.message); }
    });

    // ------------------- INVOICE MODAL -------------------
    const invoiceModal = document.getElementById('invoiceModal');
    document.getElementById('closeInvoiceModal').addEventListener('click', () => invoiceModal.classList.add('hidden'));

    let currentInvoiceTotal = 0;

    window.viewInvoice = async (bookingId, bookingStatus) => {
        currentBookingId = bookingId;
        document.getElementById('invoiceContent').innerHTML = '<p style="color:var(--text-muted);">Loading invoice...</p>';
        document.getElementById('promoResult').style.display = 'none';
        document.getElementById('promoCodeInput').value = '';
        invoiceModal.classList.remove('hidden');

        // Show/hide Pay button based on status
        const canPay = bookingStatus !== 'Paid' && bookingStatus !== 'Completed' && bookingStatus !== 'Cancelled';
        document.getElementById('openPaymentBtn').style.display = canPay ? 'block' : 'none';
        document.getElementById('applyPromoBtn').parentElement.parentElement.style.display = canPay ? 'block' : 'none';

        try {
            const inv = await ApiService.get(`/bookings/${bookingId}/invoice`);
            currentInvoiceTotal = inv.grandTotal;

            const checkIn = new Date(inv.checkInDate).toLocaleDateString('vi-VN');
            const checkOut = new Date(inv.checkOutDate).toLocaleDateString('vi-VN');

            // Build services rows
            let servicesHtml = '<p style="color:var(--text-muted); font-size:0.85rem;">No extra services</p>';
            if (inv.bookingServices && inv.bookingServices.length > 0) {
                servicesHtml = inv.bookingServices.map(s =>
                    `<p>• ${s.serviceName} × ${s.quantity} = <strong>$${(s.unitPrice * s.quantity).toFixed(2)}</strong></p>`
                ).join('');
            }

            document.getElementById('invoiceContent').innerHTML = `
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.25rem 1rem;">
                    <p><strong>Booking #</strong></p><p>${inv.bookingId}</p>
                    <p><strong>Customer</strong></p><p>${inv.customerName || 'N/A'}</p>
                    <p><strong>Room</strong></p><p>${inv.roomNumber}</p>
                    <p><strong>Check-In</strong></p><p>${checkIn}</p>
                    <p><strong>Check-Out</strong></p><p>${checkOut}</p>
                    <p><strong>Room Total</strong></p><p>$${inv.roomTotal}</p>
                    <p><strong>Services</strong></p><p>$${inv.servicesTotal}</p>
                </div>
                <div style="margin-top:0.75rem; padding-top:0.75rem; border-top:1px solid var(--surface-border);">
                    ${servicesHtml}
                </div>
                <div style="margin-top:0.75rem; font-size:1.15rem; font-weight:700; color:var(--primary-color);">
                    Grand Total: $${inv.grandTotal} &nbsp;
                    <span style="font-size:0.75rem; font-weight:400; color:var(--text-muted);">(Status: ${inv.status})</span>
                </div>`;
        } catch (error) {
            document.getElementById('invoiceContent').innerHTML = `<p class="text-error">Could not load invoice: ${error.message}</p>`;
        }
    };

    // Promo code validation
    document.getElementById('applyPromoBtn').addEventListener('click', async () => {
        const code = document.getElementById('promoCodeInput').value.trim();
        const promoDiv = document.getElementById('promoResult');
        if (!code) { promoDiv.textContent = 'Please enter a promo code.'; promoDiv.style.color = '#EF4444'; promoDiv.style.display = 'block'; return; }

        try {
            const result = await ApiService.post('/promotions/validate', {
                code,
                originalAmount: currentInvoiceTotal
            });
            promoDiv.innerHTML = `✅ Code <strong>${result.code}</strong> — ${result.discountPercentage}% off → Save <strong>$${result.discountAmount}</strong> → New Total: <strong style="color:var(--primary-color);">$${result.finalAmount}</strong>`;
            promoDiv.style.color = '#10B981';
            promoDiv.style.display = 'block';
            // Update payment amount preview
            currentInvoiceTotal = result.finalAmount;
        } catch (error) {
            promoDiv.textContent = '❌ ' + error.message;
            promoDiv.style.color = '#EF4444';
            promoDiv.style.display = 'block';
        }
    });

    // Open payment from invoice
    document.getElementById('openPaymentBtn').addEventListener('click', () => {
        document.getElementById('paymentAmount').textContent = `$${currentInvoiceTotal}`;
        document.getElementById('paymentAlert').style.display = 'none';
        document.getElementById('paymentModal').classList.remove('hidden');
    });

    document.getElementById('printInvoiceBtn').addEventListener('click', () => window.print());

    // ------------------- PAYMENT MODAL -------------------
    const paymentModal = document.getElementById('paymentModal');
    document.getElementById('closePaymentModal').addEventListener('click', () => paymentModal.classList.add('hidden'));
    document.getElementById('closePaymentBtn').addEventListener('click', () => paymentModal.classList.add('hidden'));

    document.getElementById('confirmPayBtn').addEventListener('click', async () => {
        const method = document.getElementById('paymentMethod').value;
        const alertBox = document.getElementById('paymentAlert');
        const btn = document.getElementById('confirmPayBtn');
        btn.textContent = 'Processing...'; btn.disabled = true;

        try {
            const result = await ApiService.post(`/bookings/${currentBookingId}/payment`, {
                paymentMethod: method
            });
            paymentModal.classList.add('hidden');
            invoiceModal.classList.add('hidden');
            await loadBookings();
            // Show success toast
            alertBox.textContent = '✅ Payment successful!';
            document.querySelector('[data-target="bookingsSection"]').click();
        } catch (error) {
            alertBox.textContent = '❌ Payment failed: ' + error.message;
            alertBox.className = 'alert alert-error';
            alertBox.style.display = 'block';
        } finally {
            btn.textContent = '✔ Confirm Payment'; btn.disabled = false;
        }
    });

    // ------------------- REVIEWS -------------------
    document.getElementById('refreshReviewsBtn')?.addEventListener('click', loadReviews);

    async function loadReviews() {
        const tbody = document.getElementById('reviewsTableBody');
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">Loading...</td></tr>';
        try {
            const reviews = await ApiService.get('/reviews');
            tbody.innerHTML = '';
            if (!reviews.length) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center">You have not submitted any reviews.</td></tr>';
                return;
            }
            reviews.forEach(r => {
                const date = new Date(r.createdAt).toLocaleDateString('vi-VN');
                const stars = '⭐'.repeat(r.rating);
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>#${r.bookingId}</td>
                    <td>${r.booking && r.booking.room ? r.booking.room.roomNumber : '?'}</td>
                    <td>${stars} (${r.rating}/5)</td>
                    <td>${r.comment || ''}</td>
                    <td>${date}</td>
                    <td>
                        <button class="btn btn-secondary btn-xs" onclick="editReview(${r.reviewId}, ${r.bookingId}, ${r.rating}, '${(r.comment || '').replace(/'/g, "\\'")}')">Edit</button>
                    </td>`;
                tbody.appendChild(tr);
            });
        } catch (error) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center text-error">Failed to load reviews.</td></tr>`;
        }
    }

    const reviewModal = document.getElementById('reviewModal');
    document.getElementById('closeReviewModal').addEventListener('click', () => reviewModal.classList.add('hidden'));

    window.openReviewModal = (bookingId) => {
        document.getElementById('reviewAlert').style.display = 'none';
        document.getElementById('reviewForm').reset();
        document.getElementById('reviewBookingId').value = bookingId;
        document.getElementById('editReviewId').value = '';
        document.getElementById('reviewModalTitle').textContent = `Leave a Review for Booking #${bookingId}`;
        reviewModal.classList.remove('hidden');
    };

    window.editReview = (reviewId, bookingId, rating, comment) => {
        document.getElementById('reviewAlert').style.display = 'none';
        document.getElementById('reviewBookingId').value = bookingId;
        document.getElementById('editReviewId').value = reviewId;
        document.getElementById('reviewRating').value = rating;
        document.getElementById('reviewComment').value = comment;
        document.getElementById('reviewModalTitle').textContent = `Edit Review`;
        reviewModal.classList.remove('hidden');
    };

    document.getElementById('reviewForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const bookingId = document.getElementById('reviewBookingId').value;
        const reviewId = document.getElementById('editReviewId').value;
        const rating = parseInt(document.getElementById('reviewRating').value);
        const comment = document.getElementById('reviewComment').value.trim();
        const alertBox = document.getElementById('reviewAlert');

        try {
            if (reviewId) { // Edit
                await ApiService.put(`/reviews/${reviewId}`, { rating, comment });
                alertBox.textContent = '✅ Review updated successfully!';
            } else { // Create
                await ApiService.post('/reviews', { bookingId: parseInt(bookingId), rating, comment });
                alertBox.textContent = '✅ Review submitted successfully!';
            }
            alertBox.className = 'alert alert-success';
            alertBox.style.display = 'block';
            setTimeout(() => {
                reviewModal.classList.add('hidden');
                if (document.getElementById('reviewsSection').classList.contains('hidden') === false) {
                    loadReviews();
                }
            }, 1000);
        } catch (error) {
            alertBox.textContent = '❌ ' + error.message;
            alertBox.className = 'alert alert-error';
            alertBox.style.display = 'block';
        }
    });

    // ------------------- SUPPORT REQUESTS -------------------
    async function loadSupportBookings() {
        const select = document.getElementById('requestBookingId');
        try {
            const bookings = await ApiService.get('/bookings');
            // Keep the default options
            select.innerHTML = '<option value="">-- None --</option>';
            bookings.forEach(b => {
                if (b.status === 'Completed' || b.status === 'Cancelled') return;
                const opt = document.createElement('option');
                opt.value = b.bookingId;
                opt.textContent = `Booking #${b.bookingId} - Room ${b.roomNumber || (b.room ? b.room.roomNumber : '?')}`;
                select.appendChild(opt);
            });
        } catch (error) {
            console.error('Failed to load bookings for support tab');
        }
    }

    document.getElementById('requestForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const bookingIdStr = document.getElementById('requestBookingId').value;
        const requestContent = document.getElementById('requestContent').value.trim();
        const alertBox = document.getElementById('requestAlert');

        try {
            const payload = { requestContent };
            if (bookingIdStr) {
                payload.bookingId = parseInt(bookingIdStr);
            }
            await ApiService.post('/requests', payload);
            alertBox.textContent = '✅ Your request has been sent successfully. We will contact you soon.';
            alertBox.className = 'alert alert-success';
            alertBox.style.display = 'block';
            document.getElementById('requestForm').reset();
            setTimeout(() => { alertBox.style.display = 'none'; }, 5000);
        } catch (error) {
            alertBox.textContent = '❌ Failed to submit request: ' + error.message;
            alertBox.className = 'alert alert-error';
            alertBox.style.display = 'block';
        }
    });
});

