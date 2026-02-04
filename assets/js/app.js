import { supabase, signInWithGoogle, signOut, getUser } from './supabase.js';
import { triggerGoldConfetti } from './confetti.js'; // Imported confetti

// State
const ADMIN_EMAILS = ['tejachennuru05@gmail.com', 'skmotaparthi@gmail.com', 'rkotha2@gitam.in', 'rkagula@gitam.in'];
let allStalls = [];
let currentUser = null;


document.addEventListener('DOMContentLoaded', async () => {
    // 1. Check Auth Status
    currentUser = await getUser();
    updateAuthUI();

    // 2. Load Stalls
    await fetchStalls();

    // 3. Load User Bids (if auth)
    if (currentUser) {
        await fetchUserBids();
    }

    // 4. Event Listeners
    setupEventListeners();
});

function updateAuthUI() {
    const authBtn = document.getElementById('auth-btn');
    const userProfile = document.getElementById('user-profile');
    const userName = document.getElementById('user-name');

    if (currentUser) {
        authBtn.style.display = 'none'; // Explicit Force Hide
        userProfile.style.display = 'flex'; // Explicit Force Show
        userProfile.classList.remove('hidden');
        let name = currentUser.user_metadata.full_name || currentUser.email.split('@')[0];
        if (name.length > 8) name = name.substring(0, 8);
        userName.textContent = name;

        // Admin Check
        if (ADMIN_EMAILS.includes(currentUser.email)) {
            let adminBtn = document.getElementById('admin-btn');
            if (!adminBtn) {
                adminBtn = document.createElement('button');
                adminBtn.id = 'admin-btn';
                adminBtn.className = 'btn btn-gold';
                adminBtn.textContent = 'Admin Panel';
                adminBtn.style.marginLeft = '10px';
                adminBtn.addEventListener('click', renderAdminDashboard);
                userProfile.insertBefore(adminBtn, document.getElementById('logout-btn'));
            }
        }
    } else {
        authBtn.style.display = 'block';
        userProfile.style.display = 'none';
        authBtn.classList.remove('hidden');
        const adminBtn = document.getElementById('admin-btn');
        if (adminBtn) adminBtn.remove();
    }
}

// Sidebar Logic
async function fetchUserBids() {
    // Fetch bids from Supabase
    const { data: bids, error } = await supabase
        .from('bids')
        .select(`
            amount,
            stall:stalls (name, category)
        `)
        .eq('user_id', currentUser.id);

    if (bids && bids.length > 0) {
        renderBids(bids);
        document.getElementById('my-bids-btn').style.display = 'inline-block';
    } else {
        document.getElementById('my-bids-btn').style.display = 'none';
    }
}

function renderBids(bids) {
    const container = document.getElementById('bids-list');
    container.innerHTML = '';

    bids.forEach(bid => {
        const item = document.createElement('div');
        item.className = 'bid-item';
        item.innerHTML = `
            <h4>${bid.stall.name}</h4>
            <p>${bid.stall.category}</p>
            <span class="bid-amount">Bid: ₹${bid.amount}</span>
        `;
        container.appendChild(item);
    });
}


async function fetchStalls() {
    const stallContainer = document.getElementById('stalls-grid');
    stallContainer.innerHTML = '<div class="loading-spinner">Loading...</div>';

    // Fetch real data from Supabase
    const { data: stalls, error } = await supabase
        .from('stalls')
        .select('*')
        .order('id', { ascending: true }); // Order by ID to keep consistent list

    if (error) {
        console.error('Error fetching stalls:', error);
        stallContainer.innerHTML = '<p class="error-msg">Failed to load stalls. Please try again later.</p>';
        return;
    }

    allStalls = stalls;
    renderStalls(allStalls);
}

function renderStalls(stalls) {
    const container = document.getElementById('stalls-grid');
    container.innerHTML = '';

    if (stalls.length === 0) {
        container.innerHTML = '<p class="no-results">No stalls found.</p>';
        return;
    }

    stalls.forEach(stall => {
        const card = document.createElement('div');
        card.className = 'stall-card';
        // Override Reg Fee for Cat A
        const regFee = stall.category === 'Category A' ? 2000 : stall.reg_fee;

        card.innerHTML = `
            <div class="stall-header">
                <h3 class="stall-title">${stall.name}</h3>
                <span class="stall-category">${stall.category}</span>
            </div>
            <div class="stall-body">
                <p class="stall-desc">${stall.description}</p>
                <div class="stall-details" style="font-size: 0.85rem; color: #888; margin-bottom: 0.5rem;">
                    Size: ${stall.size} | Reg Fee: ₹${regFee.toLocaleString()}
                </div>
                <div class="stall-price">
                    ₹${stall.base_price.toLocaleString()} <span>Base Price</span>
                </div>
            </div>
            <button class="btn btn-gold btn-block apply-btn" 
                data-id="${stall.id}" 
                data-name="${stall.name}" 
                data-category="${stall.category}"
                data-price="${stall.base_price}"
                data-reg-fee="${regFee}"
                data-size="${stall.size}">
                Register for Bidding
            </button>
        `;
        container.appendChild(card);
    });

}

function setupEventListeners() {
    // Sidebar Toggles
    const sidebar = document.getElementById('bids-sidebar');
    const myBidsBtn = document.getElementById('my-bids-btn');

    if (myBidsBtn) {
        myBidsBtn.addEventListener('click', () => {
            sidebar.classList.remove('hidden');
        });
    }

    document.getElementById('close-sidebar').addEventListener('click', () => {
        sidebar.classList.add('hidden');
    });

    // Auth
    document.getElementById('auth-btn').addEventListener('click', signInWithGoogle);
    document.getElementById('logout-btn').addEventListener('click', signOut);

    // Search
    document.getElementById('stall-search').addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        filterStalls(term, getCurrentCategory());
    });

    // Filter
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            filterStalls(document.getElementById('stall-search').value.toLowerCase(), e.target.dataset.category);
        });
    });

    // Event Delegation for Stalls Grid (Register Buttons)
    document.getElementById('stalls-grid').addEventListener('click', (e) => {
        const btn = e.target.closest('.apply-btn');
        if (btn) {
            openAuctionModal(btn.dataset);
        }
    });

    // Modal Closing
    document.querySelector('.close-modal').addEventListener('click', closeAuctionModal);

    // Auction Form
    document.getElementById('auction-form').addEventListener('submit', handleAuctionSubmit);

    // Success close
    document.getElementById('close-success').addEventListener('click', () => {
        document.getElementById('success-overlay').classList.add('hidden');
        closeAuctionModal();
    });

    // Rules & Regulations Logic
    const downloadBtn = document.getElementById('download-rules-btn');
    const rulesCheck = document.getElementById('rules-agree');
    const submitBtn = document.getElementById('submit-bid-btn');
    const rulesLabel = document.getElementById('rules-label');

    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            if (rulesCheck) {
                rulesCheck.disabled = false;
                rulesCheck.style.cursor = 'pointer';
                if (rulesLabel) {
                    rulesLabel.style.color = '#fff';
                    rulesLabel.style.cursor = 'pointer';
                }
            }
        });
    }

    if (rulesCheck) {
        rulesCheck.addEventListener('change', (e) => {
            if (submitBtn) {
                if (e.target.checked) {
                    submitBtn.disabled = false;
                    submitBtn.style.opacity = '1';
                    submitBtn.style.cursor = 'pointer';
                } else {
                    submitBtn.disabled = true;
                    submitBtn.style.opacity = '0.5';
                    submitBtn.style.cursor = 'not-allowed';
                }
            }
        });
    }
}

function getCurrentCategory() {
    return document.querySelector('.filter-btn.active').dataset.category;
}

function filterStalls(searchTerm, category) {
    const filtered = allStalls.filter(stall => {
        const matchesSearch = stall.name.toLowerCase().includes(searchTerm);
        const matchesCategory = category === 'all' || stall.category === category;
        return matchesSearch && matchesCategory;
    });
    renderStalls(filtered);
}

// Auction Logic
// Auction Logic
function openAuctionModal(data) {
    if (!currentUser) {
        alert('Please sign in first to apply for an auction.');
        signInWithGoogle();
        return;
    }

    const modal = document.getElementById('auction-modal');
    modal.dataset.stallId = data.id;
    modal.dataset.category = data.category;

    // UI Updates
    const isRegOnly = data.category === 'Category A' || data.category === 'Category B';
    document.getElementById('modal-stall-name').innerHTML = `${data.name} <span style="font-size:0.8em; color:var(--text-muted)">(${data.size})</span>`;

    // Hide base price for Reg Only (Cat A & B)
    if (isRegOnly) {
        document.querySelector('.base-price-hint').style.display = 'none';
    } else {
        document.querySelector('.base-price-hint').style.display = 'block';
        document.getElementById('modal-base-price').textContent = parseInt(data.price).toLocaleString();
    }

    document.getElementById('modal-reg-fee').textContent = parseInt(data.regFee).toLocaleString();

    // Set validation limits based on category
    let maxBid = 0;
    // MaxBid is irrelevant for Reg Only, but keeping logic clean
    if (data.category === 'Category A') maxBid = 999999;
    else if (data.category === 'Category B') maxBid = 999999;
    else if (data.category === 'Category C') maxBid = 29087;

    modal.dataset.maxBid = maxBid;

    // Input setup
    const bidInput = document.getElementById('bid-amount');
    const bidGroup = bidInput.closest('.form-group');

    if (isRegOnly) {
        // Category A & B: Registration Only
        bidGroup.style.display = 'none';
        bidInput.value = data.regFee; // Submit reg fee as amount
        bidInput.required = false;
        bidInput.removeAttribute('min');
        bidInput.removeAttribute('max');
        document.querySelector('.modal-header h2').textContent = "Register Interest (Offline Bidding)";
        document.querySelector('.note-box p').textContent = "This is a registration only. Bidding will be conducted offline.";
    } else {
        // Category C: Bidding
        bidGroup.style.display = 'block';
        bidInput.required = true;
        bidInput.min = data.price;
        bidInput.max = maxBid;
        bidInput.value = '';
        bidInput.placeholder = "Enter your max bid";
        document.querySelector('.modal-header h2').textContent = "Register for Bidding";
        document.querySelector('.note-box p').textContent = "The amount entered is your maximum intended bid.";
    }

    // Auto-fill Name & Email (Read-only)
    const nameInput = document.querySelector('input[name="full_name"]');
    nameInput.value = currentUser.user_metadata.full_name || currentUser.email.split('@')[0];
    nameInput.readOnly = true;
    nameInput.style.opacity = '0.7';
    nameInput.style.cursor = 'not-allowed';

    const emailInput = document.querySelector('input[name="user_email"]');
    emailInput.value = currentUser.email;

    // Reset Form (except we just set values, so careful re-resetting)
    // document.getElementById('auction-form').reset(); // Don't reset here, we just set values.

    // Reset Rules & Regulations
    const rulesCheck = document.getElementById('rules-agree');
    const rulesLabel = document.getElementById('rules-label');
    const submitBtn = document.getElementById('submit-bid-btn');

    if (rulesCheck) {
        rulesCheck.checked = false;
        rulesCheck.disabled = true;
        rulesCheck.style.cursor = 'not-allowed';
    }
    if (rulesLabel) {
        rulesLabel.style.color = '#888';
        rulesLabel.style.cursor = 'not-allowed';
    }
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.5';
        submitBtn.style.cursor = 'not-allowed';
    }

    modal.classList.remove('hidden');
}

function closeAuctionModal() {
    document.getElementById('auction-modal').classList.add('hidden');
}

async function handleAuctionSubmit(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const bidAmount = parseInt(formData.get('amount'));
    const basePrice = parseInt(document.getElementById('modal-base-price').textContent.replace(/,/g, ''));
    const modal = document.getElementById('auction-modal');
    const maxBid = parseInt(modal.dataset.maxBid);



    if (bidAmount > maxBid) {
        alert(`Please enter a true valid bid.`);
        return;
    }



    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Registering...';
    submitBtn.disabled = true;

    const stallId = modal.dataset.stallId;
    const category = modal.dataset.category;

    try {
        const { data, error } = await supabase.functions.invoke('submit-bid', {
            body: {
                stall_id: parseInt(stallId),
                user_id: currentUser.id,
                amount: bidAmount,
                full_name: document.querySelector('input[name="full_name"]').value, // Read only value
                phone: formData.get('phone'),
                personal_mail: currentUser.email // Send as personal_mail to match DB schema
            }
        })

        if (error) throw error;

        if (category === 'Category A') {
            window.location.href = "https://gevents.gitam.edu/registration/NzExNg..";
        } else if (category === 'Category B' || category === 'Category C') {
            window.location.href = "https://gevents.gitam.edu/registration/NzExNw..";
        }
    } catch (err) {
        console.error('Bid Error:', err);
        let msg = err.message || 'Unknown error';
        if (err.context && err.context.json) {
            const json = await err.context.json();
            msg = json.error || msg;
        }
        alert('Failed to register: ' + msg);
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }

}

function showSuccess(category) {
    const overlay = document.getElementById('success-overlay');

    // Hide old elements if any
    const fssaiNotice = document.getElementById('fssai-notice');
    if (fssaiNotice) fssaiNotice.classList.add('hidden');

    // Update Content
    const successTitle = overlay.querySelector('h2');
    const successDesc = overlay.querySelector('p');

    if (category === 'Category A' || category === 'Category B') {
        successTitle.textContent = "Registration Successful!";
        successDesc.innerHTML = "You have registered your interest.<br><strong>Offline Bidding</strong> details will be shared soon.";
    } else {
        successTitle.textContent = "Bid Placed Successfully!";
        successDesc.innerHTML = "Your bid has been recorded.<br>You will be notified via email if you are selected as the winner.";
        triggerGoldConfetti();
    }

    overlay.classList.remove('hidden');
}

// ADMIN DASHBOARD LOGIC
async function renderAdminDashboard() {
    const main = document.querySelector('main.main-content');
    main.innerHTML = '<div class="loading-spinner">Loading Admin Panel...</div>';

    // Fetch all Bids with Stall Info
    const { data: bids, error } = await supabase
        .from('bids')
        .select(`
            *,
            stall:stalls(*)
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error(error);
        main.innerHTML = `<p class="error-msg">Error loading bids: ${error.message}</p>`;
        return;
    }

    // Group by Stall
    const bidsByStall = {};
    bids.forEach(bid => {
        const stallId = bid.stall_id;
        if (!bidsByStall[stallId]) {
            bidsByStall[stallId] = {
                stall: bid.stall,
                bids: []
            };
        }
        bidsByStall[stallId].bids.push(bid);
    });

    // Render UI
    let html = `
        <div class="admin-dashboard" style="background: rgba(0,0,0,0.8); padding: 20px; border-radius: 10px; color: white;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px;">
                <h2 class="gold-text">Admin Dashboard</h2>
                <button class="btn btn-outline" onclick="location.reload()">Exit Admin</button>
            </div>
            
            <div class="admin-filters" style="margin-bottom: 20px;">
                <input type="text" id="admin-search" placeholder="Search Stalls or Bidders..." style="padding: 10px; width: 100%; border-radius: 5px; border: 1px solid #444; background: #222; color: white;">
            </div>

            <div id="admin-stalls-list">
    `;

    // Sort Stalls by ID
    const sortedStallIds = Object.keys(bidsByStall).sort((a, b) => a - b);

    if (sortedStallIds.length === 0) {
        html += '<p>No bids found.</p>';
    }

    sortedStallIds.forEach(stallId => {
        const group = bidsByStall[stallId];
        const stall = group.stall;

        // Check if there is a winner
        const winner = group.bids.find(b => b.is_winner);
        const winnerClass = winner ? 'has-winner' : '';
        const borderStyle = winner ? 'border: 1px solid var(--gold-primary); box-shadow: 0 0 10px rgba(255,215,0,0.1);' : 'border: 1px solid #444;';

        html += `
            <div class="admin-stall-card ${winnerClass}" style="margin-bottom: 30px; ${borderStyle} padding: 15px; border-radius: 8px; background: #1a1a1a;">
                <div class="stall-header" style="display: flex; justify-content: space-between; border-bottom: 1px solid #333; padding-bottom: 10px; margin-bottom: 10px;">
                    <h3 style="margin:0; color: var(--gold-primary);">${stall.name} <span style="font-size:0.8em; color:#888;">(${stall.category})</span></h3>
                    <span>${group.bids.length} Bids</span>
                </div>
                
                <table style="width: 100%; text-align: left; border-collapse: collapse;">
                    <thead>
                        <tr style="color: #888; border-bottom: 1px solid #333;">
                            <th style="padding: 8px;">Bidder</th>
                            <th style="padding: 8px;">Contact</th>
                            <th style="padding: 8px;">Amount</th>
                            <th style="padding: 8px;">Date</th>
                            <th style="padding: 8px;">Action</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        // Sort bids: Winners first, then amount descending
        group.bids.sort((a, b) => {
            if (a.is_winner && !b.is_winner) return -1;
            if (!a.is_winner && b.is_winner) return 1;
            return b.amount - a.amount;
        });

        group.bids.forEach(bid => {
            const isWin = bid.is_winner;
            const rowStyle = isWin ? 'background: rgba(255, 215, 0, 0.1); color: var(--gold-primary);' : '';
            const btnText = isWin ? 'Winner' : 'Select Winner';
            const btnClass = isWin ? 'btn-gold' : 'btn-outline';

            // Get best email
            const bidderEmail = bid.personal_mail || '';

            html += `
                <tr style="border-bottom: 1px solid #222; ${rowStyle}">
                    <td style="padding: 8px;">${bid.full_name}</td>
                    <td style="padding: 8px;">
                        ${bid.phone}<br>
                        <small style="color:#aaa;">${bidderEmail}</small>
                    </td>
                    <td style="padding: 8px;">₹${bid.amount}</td>
                    <td style="padding: 8px;">${new Date(bid.created_at).toLocaleDateString()}</td>
                    <td style="padding: 8px;">
                        <button class="btn ${btnClass} btn-sm admin-win-btn" 
                            data-bid-id="${bid.id}" 
                            data-stall-id="${stall.id}"
                            data-email="${bidderEmail}"
                            data-name="${bid.full_name}"
                            data-stall-name="${stall.name}"
                            data-amount="${bid.amount}"
                            ${isWin ? 'disabled' : ''}>
                            ${btnText}
                        </button>
                    </td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;
    });

    html += `</div></div>`;

    main.innerHTML = html;

    // Attach Listeners
    document.querySelectorAll('.admin-win-btn').forEach(btn => {
        if (!btn.disabled) {
            btn.addEventListener('click', (e) => confirmWinnerSelect(e.target.dataset));
        }
    });

    // Search Filter
    document.getElementById('admin-search').addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        document.querySelectorAll('.admin-stall-card').forEach(card => {
            const text = card.textContent.toLowerCase();
            card.style.display = text.includes(term) ? 'block' : 'none';
        });
    });
}

async function confirmWinnerSelect(data) {
    if (!confirm(`Select ${data.name} as winner for ${data.stallName}?\nThis will send a confirmation email.`)) return;

    const btn = document.querySelector(`button[data-bid-id="${data.bidId}"]`);
    if (btn) {
        btn.textContent = "Updating DB...";
        btn.disabled = true;
    }

    try {
        // 1. Update Database via Supabase
        const { data: result, error } = await supabase.functions.invoke('select-winner', {
            body: {
                bid_id: data.bidId,
                stall_id: data.stallId
            }
        });

        if (error) throw error;

        // 2. Send Email via EmailJS
        if (data.email) {
            btn.textContent = "Sending Email...";

            const templateParams = {
                to_name: data.name,

                // Pass email in multiple common fields to ensure it matches the Template Setting
                to_email: data.email,
                email: data.email,
                recipient: data.email,
                reply_to: data.email,

                stall_name: data.stallName,
                bid_amount: data.amount,
                admin_contact: "pramanatech.gitam@gmail.com"
            };

            console.log("Sending EmailJS with params:", templateParams); // Debug log

            try {
                await emailjs.send('service_2h5q5us', 'template_lw4yl14', templateParams);
                alert(`Winner Confirmed! Email sent to ${data.email}`);
            } catch (emailError) {
                console.error("EmailJS Failed:", emailError);
                // Keep the detailed alert to help user if it still fails
                alert(`Winner Saved to DB ✅\n\nBUT Email Failed ❌\nReason: ${emailError.text}\n\nThis is a TEMPLATE CONFIG issue in EmailJS Dashboard.\nThe 'To Email' field of your template is likely empty.\nGo to Dashboard -> Template -> Settings -> Set 'To Email' to {{to_email}}`);
            }
        } else {
            alert("Winner Confirmed in DB! (No email found for user)");
        }

        renderAdminDashboard(); // Refresh

    } catch (err) {
        console.error('Admin Error:', err);
        let msg = err.message || "Unknown error";
        if (err.context && err.context.json) {
            const j = await err.context.json();
            msg = j.error || msg;
        }

        alert('Failed: ' + msg);
        if (btn) {
            btn.textContent = "Select Winner";
            btn.disabled = false;
        }
    }
}
