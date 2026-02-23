// --- MULTI-STEP NAVIGATION LOGIC ---
function nextStep(stepNumber) {
    // Hide all steps
    document.querySelectorAll('.step-section').forEach(el => el.classList.remove('active'));
    // Show target step
    document.getElementById('step-' + stepNumber).classList.add('active');
    
    // Update top tracker
    document.querySelectorAll('.step-tab').forEach(el => el.classList.remove('active'));
    document.getElementById('tab-' + stepNumber).classList.add('active');
    
    // Scroll to top automatically
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goToPayment() {
    calculateTotal(); // Recalculate right before payment page
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
        // Clear inputs if they uncheck it
        document.querySelector('textarea[name="Project Description"]').value = "";
        document.querySelector('input[name="Project Link"]').value = "";
    }
    calculateTotal(); // Update bill to include/remove ₹500
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

// --- CALCULATIONS & QR LOGIC ---
function calculateTotal() {
    let total = 0;
    
    // Sum up components
    let allInputs = document.querySelectorAll("input[type='number']");
    allInputs.forEach(input => {
        total += (parseInt(input.value) || 0) * parseInt(input.dataset.price);
    });

    // Add 500 if project ready-made is checked
    if (document.getElementById("projectService").checked) {
        total += 500;
    }

    document.getElementById("total").innerText = "₹" + total;
    document.getElementById("hiddenTotal").value = "₹" + total;
    document.getElementById("paymentTotal").innerText = "₹" + total;

    // Generate dynamic QR
    let upiLink = `upi://pay?pa=assassingamer2468-2@oksbi&pn=CircuitCrafter&am=${total}`;
    document.getElementById("qr-image").src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiLink)}`;
}

// Initialize on load
window.onload = function() {
    calculateTotal();
}