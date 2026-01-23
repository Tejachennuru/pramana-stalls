import { supabase, signInWithGoogle, signOut, getUser } from './supabase.js';
import { triggerGoldConfetti } from './confetti.js'; // Imported confetti

// State
let allStalls = [];
let currentUser = null;

// Mock Data (Fallback until DB is ready)
const MOCK_STALLS = [
    { id: 1, name: 'Stall F1', category: 'Food', base_price: 5000, description: 'Prime location near entrance.' },
    { id: 2, name: 'Stall F2', category: 'Food', base_price: 5000, description: 'Spacious corner stall.' },
    { id: 3, name: 'Stall A1', category: 'Accessories', base_price: 3000, description: 'High footfall area.' },
    { id: 4, name: 'Stall A2', category: 'Accessories', base_price: 3500, description: 'Near the stage.' },
    { id: 5, name: 'Stall F3', category: 'Food', base_price: 5500, description: 'Ideal for snacks/beverages.' },
];

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
        userName.textContent = currentUser.user_metadata.full_name || currentUser.email.split('@')[0];
    } else {
        authBtn.style.display = 'block';
        userProfile.style.display = 'none';
        authBtn.classList.remove('hidden');
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

    // TODO: Replace with real DB call
    // const { data, error } = await supabase.from('stalls').select('*');

    // Simulating delay for effect
    await new Promise(r => setTimeout(r, 800));

    allStalls = MOCK_STALLS; // Replace with 'data' later
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
        card.innerHTML = `
            <div class="stall-header">
                <h3 class="stall-title">${stall.name}</h3>
                <span class="stall-category">${stall.category}</span>
            </div>
            <div class="stall-body">
                <p class="stall-desc">${stall.description}</p>
                <div class="stall-price">
                    ₹${stall.base_price.toLocaleString()} <span>Base Price</span>
                </div>
            </div>
            <button class="btn btn-gold btn-block apply-btn" 
                data-id="${stall.id}" 
                data-name="${stall.name}" 
                data-category="${stall.category}"
                data-price="${stall.base_price}">
                Apply Auction
            </button>
        `;
        container.appendChild(card);
    });

    // Re-attach listeners to new buttons
    document.querySelectorAll('.apply-btn').forEach(btn => {
        btn.addEventListener('click', (e) => openAuctionModal(e.target.dataset));
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

    // Modal Closing
    document.querySelector('.close-modal').addEventListener('click', closeAuctionModal);

    // Auction Form
    document.getElementById('auction-form').addEventListener('submit', handleAuctionSubmit);

    // Success close
    document.getElementById('close-success').addEventListener('click', () => {
        document.getElementById('success-overlay').classList.add('hidden');
        closeAuctionModal();
    });
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
function openAuctionModal(data) {
    if (!currentUser) {
        alert('Please sign in first to apply for an auction.');
        signInWithGoogle();
        return;
    }

    const modal = document.getElementById('auction-modal');
    modal.dataset.stallId = data.id; // Store ID for submission
    document.getElementById('modal-stall-name').textContent = data.name;
    document.getElementById('modal-category').value = data.category;
    document.getElementById('modal-base-price').textContent = data.price;
    document.getElementById('bid-amount').min = data.price;

    // Reset Form
    document.getElementById('auction-form').reset();

    modal.classList.remove('hidden');
}

function closeAuctionModal() {
    document.getElementById('auction-modal').classList.add('hidden');
}

async function handleAuctionSubmit(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const bidAmount = parseInt(formData.get('amount'));
    const basePrice = parseInt(document.getElementById('modal-base-price').textContent);
    const category = document.getElementById('modal-category').value;

    if (bidAmount < basePrice) {
        alert(`Bid amount must be at least ₹${basePrice}`);
        return;
    }

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Submitting...';
    submitBtn.disabled = true;

    // Get Stall ID from modal dataset
    const modal = document.getElementById('auction-modal');
    const stallId = modal.dataset.stallId;

    try {
        // Call Edge Function to process bid secureley
        const { data, error } = await supabase.functions.invoke('submit-bid', {
            body: {
                stall_id: parseInt(stallId),
                user_id: currentUser.id,
                amount: bidAmount,
                full_name: formData.get('full_name'),
                phone: formData.get('phone'),
                gitam_mail: formData.get('gitam_mail'),
                personal_mail: formData.get('personal_mail')
            }
        })

        if (error) throw error;

        showSuccess(category);
        // Refresh bids immediately
        fetchUserBids();
    } catch (err) {
        console.error('Bid Error:', err);
        // Extract inner error message if available
        let msg = err.message || 'Unknown error';
        if (err.context && err.context.json) {
            const json = await err.context.json();
            msg = json.error || msg;
        }
        alert('Failed to submit bid: ' + msg);
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }

}

function showSuccess(category) {
    const overlay = document.getElementById('success-overlay');
    const fssaiNotice = document.getElementById('fssai-notice');

    // Trigger Confetti
    triggerGoldConfetti(); // Called here

    if (category === 'Food') {
        fssaiNotice.classList.remove('hidden');
    } else {
        fssaiNotice.classList.add('hidden');
    }

    overlay.classList.remove('hidden');
}
