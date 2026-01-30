// ... (Existing Imports)
const ADMIN_EMAIL = 'tejachennuru05@gmail.com';

// State
let allStalls = [];
let currentUser = null;

// ... (Existing Code: DOMContentLoaded, updateAuthUI - MODIFY THIS)

function updateAuthUI() {
    const authBtn = document.getElementById('auth-btn');
    const userProfile = document.getElementById('user-profile');
    const userName = document.getElementById('user-name');
    const adminLink = document.getElementById('admin-link'); // Create this in HTML

    if (currentUser) {
        authBtn.style.display = 'none';
        userProfile.style.display = 'flex';
        userProfile.classList.remove('hidden');
        userName.textContent = currentUser.user_metadata.full_name || currentUser.email.split('@')[0];

        // Admin Check
        if (currentUser.email === ADMIN_EMAIL) {
            if (adminLink) adminLink.classList.remove('hidden');
            fetchAdminData(); // Pre-load or load on click
        } else {
            if (adminLink) adminLink.classList.add('hidden');
        }

    } else {
        authBtn.style.display = 'block';
        userProfile.style.display = 'none';
        if (adminLink) adminLink.classList.add('hidden');
    }
}

// ... (Existing Code: fetchUserBids, renderBids, etc.)

// --- ADMIN LOGIC ---
async function fetchAdminData() {
    const dashboard = document.getElementById('admin-dashboard'); // Need to create in HTML
    if (!dashboard) return;

    // Fetch Stalls and Bids
    const { data: stalls } = await supabase.from('stalls').select('*').order('id');
    const { data: bids } = await supabase.from('bids').select('*').order('amount', { ascending: false });

    renderAdminDashboard(stalls, bids);
}

function renderAdminDashboard(stalls, bids) {
    const list = document.getElementById('admin-stall-list');
    list.innerHTML = '';

    stalls.forEach(stall => {
        const stallBids = bids.filter(b => b.stall_id === stall.id);
        const winnerBid = stall.winner_bid_id ? bids.find(b => b.id === stall.winner_bid_id) : null;

        const item = document.createElement('div');
        item.className = 'admin-stall-item';
        // Add styling class in CSS
        item.style.background = 'rgba(255,255,255,0.05)';
        item.style.marginBottom = '1rem';
        item.style.padding = '1rem';
        item.style.borderRadius = '8px';

        let html = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h3 style="color:var(--color-gold)">${stall.name} <small>(${stall.category})</small></h3>
                <span>${winnerBid ? `<span style="color:#4CAF50">🏆 Won by: ${winnerBid.full_name}</span>` : '<span style="color:#aaa">Open</span>'}</span>
            </div>
            <p style="font-size:0.9rem; color:#888;">Base: ₹${stall.base_price} | Bids: ${stallBids.length}</p>
            
            <div class="admin-bids-list" style="margin-top:10px; display:none;">
                <table style="width:100%; font-size:0.9rem; color:#ccc;">
                    <thead><tr style="text-align:left; color:gray"><th>Bidder</th><th>Amount</th><th>Phone</th><th>Action</th></tr></thead>
                    <tbody>
        `;

        if (stallBids.length === 0) {
            html += `<tr><td colspan="4">No bids yet.</td></tr>`;
        } else {
            stallBids.forEach(bid => {
                const isWinner = stall.winner_bid_id === bid.id;
                html += `
                    <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
                        <td>${bid.full_name}<br><small>${bid.gitam_mail || bid.personal_mail}</small></td>
                        <td style="color:var(--color-gold); font-weight:bold;">₹${bid.amount}</td>
                        <td>${bid.phone}</td>
                        <td>
                            ${isWinner
                        ? '<span style="color:#4CAF50">Selected</span>'
                        : (!stall.winner_bid_id ? `<button class="btn-sm btn-gold select-winner-btn" data-stall="${stall.id}" data-bid="${bid.id}">Select</button>` : '-')
                    }
                        </td>
                    </tr>
                `;
            });
        }

        html += `   </tbody>
                </table>
            </div>
            <button class="btn-sm btn-outline toggle-bids-btn" style="margin-top:10px; font-size:0.8rem;">Show/Hide Bids</button>
        `;

        item.innerHTML = html;
        list.appendChild(item);
    });

    // Listeners
    document.querySelectorAll('.toggle-bids-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const list = e.target.previousElementSibling; // The div.admin-bids-list
            list.style.display = list.style.display === 'none' ? 'block' : 'none';
        });
    });

    document.querySelectorAll('.select-winner-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            if (confirm('Are you sure you want to select this winner? Emails will be triggered.')) {
                await selectWinner(e.target.dataset.stall, e.target.dataset.bid);
            }
        });
    });
}

async function selectWinner(stallId, bidId) {
    // 1. Update Database
    const { error } = await supabase
        .from('stalls')
        .update({ winner_bid_id: bidId })
        .eq('id', stallId);

    if (error) {
        alert('Error selecting winner: ' + error.message);
        return;
    }

    // 2. Trigger Edge Function for Emails
    alert('Winner Selected! Sending emails...');
    // Real implementation would invoke function
    try {
        await supabase.functions.invoke('notify-winner', {
            body: { stall_id: stallId, winner_bid_id: bidId }
        });
        fetchAdminData(); // Refresh UI
    } catch (e) {
        console.error("Email trigger failed", e);
        fetchAdminData();
    }
}


// --- RESTORED & NEW EVENT LISTENERS ---
function setupEventListeners() {
    // Sidebar Toggles
    const sidebar = document.getElementById('bids-sidebar');
    const myBidsBtn = document.getElementById('my-bids-btn');

    if (myBidsBtn) {
        myBidsBtn.addEventListener('click', () => {
            sidebar.classList.remove('hidden');
        });
    }

    const closeSidebarBtn = document.getElementById('close-sidebar');
    if (closeSidebarBtn) {
        closeSidebarBtn.addEventListener('click', () => {
            sidebar.classList.add('hidden');
        });
    }

    // Auth
    const authBtn = document.getElementById('auth-btn');
    if (authBtn) authBtn.addEventListener('click', signInWithGoogle);

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', signOut);

    // Search
    const searchInput = document.getElementById('stall-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            filterStalls(term, getCurrentCategory());
        });
    }

    // Filter
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            filterStalls(searchInput.value.toLowerCase(), e.target.dataset.category);
        });
    });

    // Modal Closing
    const closeModal = document.querySelector('.close-modal');
    if (closeModal) closeModal.addEventListener('click', closeAuctionModal);

    // Auction Form
    const auctionForm = document.getElementById('auction-form');
    if (auctionForm) auctionForm.addEventListener('submit', handleAuctionSubmit);

    // Success close
    const closeSuccess = document.getElementById('close-success');
    if (closeSuccess) {
        closeSuccess.addEventListener('click', () => {
            document.getElementById('success-overlay').classList.add('hidden');
            closeAuctionModal();
        });
    }

    // --- ADMIN TOGGLES ---
    const adminLink = document.getElementById('admin-link');
    if (adminLink) {
        adminLink.addEventListener('click', () => {
            const dashboard = document.getElementById('admin-dashboard');
            dashboard.classList.toggle('hidden');
            if (!dashboard.classList.contains('hidden')) {
                fetchAdminData();
            }
        });
    }

    const refreshAdmin = document.getElementById('refresh-admin-btn');
    if (refreshAdmin) {
        refreshAdmin.addEventListener('click', fetchAdminData);
    }

    const adminSearch = document.getElementById('admin-search');
    if (adminSearch) {
        adminSearch.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            document.querySelectorAll('.admin-stall-item').forEach(item => {
                const text = item.textContent.toLowerCase();
                item.style.display = text.includes(term) ? 'block' : 'none';
            });
        });
    }
}

function getCurrentCategory() {
    const activeBtn = document.querySelector('.filter-btn.active');
    return activeBtn ? activeBtn.dataset.category : 'all';
}

function filterStalls(searchTerm, category) {
    const filtered = allStalls.filter(stall => {
        const matchesSearch = stall.name.toLowerCase().includes(searchTerm);
        const matchesCategory = category === 'all' || stall.category === category;
        return matchesSearch && matchesCategory;
    });
    renderStalls(filtered);
}

function closeAuctionModal() {
    document.getElementById('auction-modal').classList.add('hidden');
}

// Modified openAuctionModal
function openAuctionModal(data) {
    if (!currentUser) {
        alert('Please sign in first to apply.');
        signInWithGoogle();
        return;
    }

    const modal = document.getElementById('auction-modal');
    modal.dataset.stallId = data.id;
    modal.dataset.category = data.category;
    modal.dataset.price = data.price;

    const modalTitle = modal.querySelector('h2');
    const bidGroup = document.querySelector('.highlight-group'); // Bid input container
    const bidInput = document.getElementById('bid-amount');
    const noteBox = document.querySelector('.note-box p');
    const submitBtn = document.querySelector('#auction-form button[type="submit"]');

    // UI Updates
    document.getElementById('modal-stall-name').innerHTML = `${data.name} <span style="font-size:0.8em; color:var(--text-muted)">(${data.size})</span>`;
    document.getElementById('modal-base-price').textContent = parseInt(data.price).toLocaleString();
    document.getElementById('modal-reg-fee').textContent = parseInt(data.regFee).toLocaleString();

    // Category Specific Logic
    let maxBid = 99999999;

    if (data.category === 'Category A') {
        // Registration Only for Cat A
        modalTitle.textContent = "Register Interest";
        bidGroup.style.display = 'none'; // Hide Bid Input
        bidInput.required = false;
        bidInput.value = data.price; // Default to base price so standard submission works

        noteBox.innerHTML = `<strong>Note:</strong> This is a <strong>Registration Only</strong>. Official bidding will happen offline later. Registration fee applies.`;
        submitBtn.textContent = "Confirm Registration";

        modal.dataset.isOfflineReg = "true";

    } else {
        // Category B & C: Online Bidding
        modalTitle.textContent = "Place Bid";
        bidGroup.style.display = 'block';
        bidInput.required = true;
        bidInput.value = '';

        if (data.category === 'Category B') maxBid = 60000;
        else if (data.category === 'Category C') maxBid = 29087;

        modal.dataset.maxBid = maxBid;
        bidInput.min = data.price;
        bidInput.max = maxBid;

        noteBox.innerHTML = `<strong>Note:</strong> This is an <strong>Online Bid</strong>. The highest valid bidder will be selected.`;
        submitBtn.textContent = "Place Bid";

        modal.dataset.isOfflineReg = "false";
    }

    // Auto-fill Name & Email (Read-only)
    const nameInput = document.querySelector('input[name="full_name"]');
    nameInput.value = currentUser.user_metadata.full_name || currentUser.email.split('@')[0];
    nameInput.readOnly = true;
    nameInput.style.opacity = '0.7';
    nameInput.style.cursor = 'not-allowed';

    modal.classList.remove('hidden');
}

// Update handleAuctionSubmit to handle hidden input
async function handleAuctionSubmit(e) {
    e.preventDefault();

    const modal = document.getElementById('auction-modal');
    const isOfflineReg = modal.dataset.isOfflineReg === "true";
    const maxBid = parseInt(modal.dataset.maxBid) || Infinity;

    const formData = new FormData(e.target);
    // If offline reg, use base price as dummy bid, else use input
    let bidAmount = isOfflineReg ? parseInt(modal.dataset.price) : parseInt(formData.get('amount'));
    const basePrice = parseInt(modal.dataset.price);

    if (!isOfflineReg) {
        if (bidAmount < basePrice) {
            alert(`Bid amount must be at least ₹${basePrice.toLocaleString()}`);
            return;
        }
        if (bidAmount > maxBid) {
            alert(`Please enter a true valid bid.`);
            return;
        }
    }

    // ... (rest of submission logic same, just passing bidAmount)

    // Copy Paste existing logic below but use 'bidAmount' variable
    // Email Validation
    const gitamMail = formData.get('gitam_mail');
    const personalMail = formData.get('personal_mail');

    if (!gitamMail && !personalMail) {
        alert('Please provide either Gitam Mail or Personal Mail.');
        return;
    }

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Processing...';
    submitBtn.disabled = true;

    const stallId = modal.dataset.stallId;
    const category = modal.dataset.category;

    try {
        const { data, error } = await supabase.functions.invoke('submit-bid', {
            body: {
                stall_id: parseInt(stallId),
                user_id: currentUser.id,
                amount: bidAmount,
                full_name: document.querySelector('input[name="full_name"]').value,
                phone: formData.get('phone'),
                gitam_mail: formData.get('gitam_mail'),
                personal_mail: formData.get('personal_mail')
            }
        })

        if (error) throw error;

        showSuccess(category, isOfflineReg); // Pass flag to change success msg
        fetchUserBids();
    } catch (err) {
        console.error('Bid Error:', err);
        alert('Failed: ' + (err.message || "Unknown error"));
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

function showSuccess(category, isOfflineReg) {
    const overlay = document.getElementById('success-overlay');
    const successTitle = overlay.querySelector('h2');
    const successDesc = overlay.querySelector('p');

    successTitle.textContent = isOfflineReg ? "Registration Successful!" : "Bid Placed Successfully!";

    if (isOfflineReg) {
        successDesc.innerHTML = "Bidding date & venue will be revealed soon.<br><strong>Offline Bidding</strong>";
    } else {
        successDesc.innerHTML = "Your bid has been recorded.<br><strong>Winners will be announced via email.</strong>";
    }

    overlay.classList.remove('hidden');
}

// ... (Export or End)
