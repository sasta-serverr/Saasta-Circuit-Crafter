// --- SEARCH LOGIC ---
function filterComponents() {
    let input = document.getElementById('componentSearch').value.toLowerCase();
    let productCards = document.querySelectorAll('.product');
    let headings = document.querySelectorAll('h3');

    productCards.forEach(card => {
        let name = card.querySelector('.product-info span').innerText.toLowerCase();
        card.style.display = name.includes(input) ? "flex" : "none";
    });

    headings.forEach(h3 => {
        let nextEl = h3.nextElementSibling;
        let hasVisibleProduct = false;
        while (nextEl && nextEl.tagName !== 'H3' && !nextEl.classList.contains('main-btn')) {
            if (nextEl.classList.contains('product') && nextEl.style.display !== 'none') {
                hasVisibleProduct = true; break;
            }
            nextEl = nextEl.nextElementSibling;
        }
        h3.style.display = hasVisibleProduct || input === "" ? "block" : "none";
    });
}

// --- NAVIGATION LOGIC ---
function nextStep(stepNumber) {
    document.querySelectorAll('.step-section').forEach(el => el.classList.remove('active'));
    document.getElementById('step-' + stepNumber).classList.add('active');
    
    document.querySelectorAll('.step-tab').forEach(el => el.classList.remove('active'));
    document.getElementById('tab-' + stepNumber).classList.add('active');
    
    calculateTotal();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goToPayment() {
    calculateTotal(); 
    nextStep(3);
}

// --- DYNAMIC PROJECT FIELDS ---
function toggleProjectFields() {
    const isChecked = document.getElementById("projectService").checked;
    const detailsBox = document.getElementById("projectDetails");
    if (isChecked) {
        detailsBox.style.display = "block";
    } else {
        detailsBox.style.display = "none";
        document.querySelector('textarea[name="Project Description"]').value = "";
        document.querySelector('input[name="Project Link"]').value = "";
    }
    calculateTotal();
}

// --- DYNAMIC RESISTOR LOGIC ---
let resCount = 1;
function addResistorRow() {
    resCount++;
    const container = document.getElementById('resistor-container');
    const newRow = document.createElement('div');
    newRow.className = 'product resistor-row';
    newRow.innerHTML = `
        <img src="resistors.jpg" alt="Resistors">
        <div class="product-info"><span>Mixed Resistor Set</span><small>₹150</small></div>
        <div class="input-group">
            <input type="text" name="Resistor Value ${resCount}" placeholder="Value" style="width: 140px;">
            <input type="number" name="Resistor Qty ${resCount}" class="res-qty" min="0" value="0" data-price="150" onchange="calculateTotal()">
        </div>
    `;
    container.appendChild(newRow);
}

// --- BILL CALCULATION ---
function calculateTotal() {
    let total = 0;
    let allInputs = document.querySelectorAll("input[type='number']");
    allInputs.forEach(input => {
        total += (parseInt(input.value) || 0) * parseInt(input.dataset.price);
    });

    if (document.getElementById("projectService").checked) {
        total += 500;
    }

    document.getElementById("total").innerText = "₹" + total;
    document.getElementById("hiddenTotal").value = "₹" + total;
}

// --- RAZORPAY & BACKEND INTEGRATION ---
async function payWithRazorpay() {
    // 1. Gather Details
    let name = document.getElementById("cName").value.trim();
    let phone = document.getElementById("cPhone").value.trim();
    let email = document.getElementById("cEmail").value.trim();
    let pledgeYes = document.getElementById("pledgeYes").checked;
    let totalAmount = parseInt(document.getElementById("total").innerText.replace("₹", ""));

    // 2. Validate Everything
    if (totalAmount <= 0) { alert("Please select components from Step 1 first!"); nextStep(1); return; }
    if (!name || !phone || !email) { alert("Please fill out all Contact Details in Step 2!"); nextStep(2); return; }
    if (!pledgeYes) { alert("You must agree to the pledge before paying."); return; }

    try {
        // 3. Ask Node Backend for an Order ID
        const response = await fetch('https://circuit-crafter-server.onrender.com/create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: totalAmount })
        });
        
        if (!response.ok) throw new Error("Backend server is not running!");
        const order = await response.json();

        // 4. Configure Razorpay Popup
        var options = {
            "key": "rzp_test_SJjM5EzjnFRi7Z", // YOUR TEST KEY ID
            "amount": order.amount,
            "currency": "INR",
            "name": "Saasta Circuit Crafter",
            "description": "Electronic Components Order",
            "order_id": order.id, 
            "theme": { "color": "#0ea5e9" },
            "prefill": { "name": name, "email": email, "contact": phone },
            "handler": async function (rzp_response) {
                // 5. Success! Verify with Backend
                const verifyRes = await fetch('https://circuit-crafter-server.onrender.com/verify-payment', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        razorpay_order_id: rzp_response.razorpay_order_id,
                        razorpay_payment_id: rzp_response.razorpay_payment_id,
                        razorpay_signature: rzp_response.razorpay_signature,
                        customerDetails: { name, email, phone }
                    })
                });
                
                const verifyData = await verifyRes.json();
                
                // 6. IF VERIFIED, SHOW SUCCESS PAGE & SILENTLY EMAIL
                if(verifyData.success) {
                    
                    document.getElementById('razorpay_payment_id').value = rzp_response.razorpay_payment_id;
                    
                    // Secretly submit the form data to Formspree
                    const form = document.getElementById("orderForm");
                    const formData = new FormData(form);
                    
                    fetch(form.action, {
                        method: 'POST',
                        body: formData,
                        headers: { 'Accept': 'application/json' }
                    }).then(response => {
                        console.log("Formspree email sent successfully.");
                    }).catch(error => {
                        console.error("Formspree Error:", error);
                    });

                    // Hide payment section, show success section
                    document.querySelectorAll('.step-section').forEach(el => el.classList.remove('active'));
                    document.getElementById('step-success').classList.add('active');
                    
                    // Dim the navigation tabs
                    document.querySelectorAll('.step-tab').forEach(el => el.style.opacity = '0.3');
                    
                    window.scrollTo({ top: 0, behavior: 'smooth' });

                } else {
                    alert("Payment verification failed! Please contact support.");
                }
            }
        };
        
        var rzp = new Razorpay(options);
        rzp.on('payment.failed', function (res){
            alert("Payment Failed: " + res.error.description);
        });
        rzp.open();

    } catch (err) {
        alert("Server Error! Make sure your Node.js backend is running on localhost:3000.");
        console.error(err);
    }
}

window.onload = function() {
    calculateTotal(); 
}