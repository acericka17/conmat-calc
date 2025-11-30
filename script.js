// Main script for Concrete Calculator
// Implements per-element, per-PSI mix ratios and corrected unit conversions

document.addEventListener('DOMContentLoaded', () => {
  // Highlight the active navigation link in the header
  function setActiveNavLink() {
    try {
      const file = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
      const links = Array.from(document.querySelectorAll('header nav a'));
      // remove existing
      links.forEach(a => a.classList.remove('nav-active'));
      // try to find exact match first
      let matched = links.find(a => {
        const href = (a.getAttribute('href') || '').split('/').pop().toLowerCase();
        return href === file;
      });
      // fallback: index alias
      if (!matched && (file === '' || file === 'index.html')) {
        matched = links.find(a => (a.getAttribute('href') || '').split('/').pop().toLowerCase() === 'index.html');
      }
      if (matched) matched.classList.add('nav-active');
    } catch (e) {
      // ignore
    }
  }
  setActiveNavLink();
  // Tab functionality
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');
  tabButtons.forEach(btn => btn.addEventListener('click', () => {
    tabButtons.forEach(b => b.classList.remove('active'));
    tabContents.forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    const id = btn.getAttribute('data-tab');
    document.getElementById(id).classList.add('active');
  }));

  // Accordion
  document.querySelectorAll('.accordion-header').forEach(h => h.addEventListener('click', () => {
    const t = h.getAttribute('data-target');
    const c = document.getElementById(t);
    const i = h.querySelector('i');
    c.classList.toggle('active');
    i.classList.toggle('ri-arrow-down-s-line');
    i.classList.toggle('ri-arrow-up-s-line');
  }));

  // Range sliders
  const humidity = document.getElementById('humidity');
  const humidityValue = document.getElementById('humidity-value');
  const temperature = document.getElementById('temperature');
  const temperatureValue = document.getElementById('temperature-value');
  if (humidity && humidityValue) humidity.addEventListener('input', () => humidityValue.textContent = humidity.value + '%');
  if (temperature && temperatureValue) temperature.addEventListener('input', () => temperatureValue.textContent = temperature.value + '°C');

  // Calculation wiring
  const calculateBtn = document.getElementById('calculate-btn');
  const resultsSection = document.getElementById('results-section');
  const saveBtn = document.getElementById('save-calculation');

  // Default mix ratios (cement:sand:gravel parts) by element and PSI
  // These are example defaults; adjust per local practice or standards.
  const mixRatios = {
    slab: {
      '2500': [1, 3, 6],
      '3000': [1, 2.5, 5],
      '3500': [1, 2, 4],
      '4000': [1, 1.5, 2.8],
      '5000': [1, 1.2, 2.3]
    },
    beam: {
      '2500': [1, 3, 6],
      '3000': [1, 2.5, 5],
      '3500': [1, 2, 4],
      '4000': [1, 1.3, 3],
      '5000': [1, 1.2, 2.3]
    },
    column: {
      '2500': [1, 3, 6],
      '3000': [1, 2.5, 5],
      '3500': [1, 2, 4],
      '4000': [1, 1.5, 2.8],
      '5000': [1, 1.2, 2.3]
    },
    footing: {
      '2500': [1, 3, 6],
      '3000': [1, 2.5, 5],
      '3500': [1, 2, 4],
      '4000': [1, 1.5, 2.8],
      '5000': [1, 1.2, 2.3]
    }
  };

  // utility: convert input value to meters (value in given unit -> meters)
  function toMeters(value, unit) {
    value = Number(value) || 0;
    switch (unit) {
      case 'm': return value;
      case 'cm': return value / 100;
      case 'ft': return value * 0.3048;
      case 'in': return value * 0.0254;
      default: return value;
    }
  }

  // Estimate materials using mix ratio for the element and psi
  // volume is in cubic meters
  function estimateMaterials(volumeM3, element, psi) {
    // Accept psi as string/number; normalize
    const psiKey = String(psi);
    const elementKey = element.toLowerCase();
    const defaultRatio = [1, 2, 4];
    const ratios = (mixRatios[elementKey] && mixRatios[elementKey][psiKey]) || defaultRatio;

    // Sum of parts
    const partsSum = ratios.reduce((s, v) => s + v, 0);

    // Assume concrete density ~ 2400 kg/m3 -> total mass
    const concreteDensity = 2400; // kg per m3
    const totalMassKg = volumeM3 * concreteDensity; // kg of concrete required

    // mass distribution per part
    const cementMassKg = (ratios[0] / partsSum) * totalMassKg;
    const sandMassKg = (ratios[1] / partsSum) * totalMassKg;
    const gravelMassKg = (ratios[2] / partsSum) * totalMassKg;

    // Convert cement kg to 40 kg bags (configurable as needed)
    const bagKg = 40;
    const cementBags = Math.ceil(cementMassKg / bagKg);

    // Convert sand/gravel to cubic meters assuming densities
    // approximate bulk densities (loose): sand ~ 1600 kg/m3, gravel ~ 1500 kg/m3
    const sandDensity = 1600;
    const gravelDensity = 1500;
    const sandM3 = sandMassKg / sandDensity;
    const gravelM3 = gravelMassKg / gravelDensity;

    // Convert m3 to cu ft for display (1 m3 = 35.3147 cu ft)
    const sandCuFt = Math.ceil(sandM3 * 35.3147);
    const gravelCuFt = Math.ceil(gravelM3 * 35.3147);

    // Convert sand/gravel to bags (40 kg per bag, same as cement)
    const sandBags = Math.ceil(sandMassKg / bagKg);
    const gravelBags = Math.ceil(gravelMassKg / bagKg);

    // water estimate (liters) roughly 160 L per m3 * w/c factor ~ 0.5 -> 80 L/m3
    const waterLiters = Math.ceil(volumeM3 * 80);

    return {
      cementBags,
      cementKg: Math.round(cementMassKg),
      sandBags,
      sandKg: Math.round(sandMassKg),
      sandCuFt,
      sandM3: Number(sandM3.toFixed(3)),
      gravelBags,
      gravelKg: Math.round(gravelMassKg),
      gravelCuFt,
      gravelM3: Number(gravelM3.toFixed(3)),
      waterLiters
    };
  }

  function getActiveTabId() {
    const active = document.querySelector('.tab-content.active');
    return active ? active.id : 'slab';
  }

  // Determine unit family (metric vs imperial) for the active element.
  // Rule: if all three unit selects for the element are imperial (ft or in) => imperial
  // otherwise treat as metric.
  function detectUnitFamily(active) {
    try {
      let units = [];
      if (active === 'slab') {
        units = [
          document.getElementById('slab-length-unit').value,
          document.getElementById('slab-width-unit').value,
          document.getElementById('slab-thickness-unit').value,
        ];
      } else if (active === 'beam') {
        units = [
          document.getElementById('beam-length-unit').value,
          document.getElementById('beam-width-unit').value,
          document.getElementById('beam-height-unit').value,
        ];
      } else if (active === 'column') {
        units = [
          document.getElementById('column-height-unit').value,
          document.getElementById('column-width-unit').value,
          document.getElementById('column-depth-unit').value,
        ];
      } else if (active === 'footing') {
        units = [
          document.getElementById('footing-length-unit').value,
          document.getElementById('footing-width-unit').value,
          document.getElementById('footing-thickness-unit').value,
        ];
      }
      if (units.length === 0) return 'metric';
      const allImperial = units.every(u => u === 'ft' || u === 'in');
      return allImperial ? 'imperial' : 'metric';
    } catch (e) {
      return 'metric';
    }
  }

  function calculate() {
    const active = getActiveTabId();
    let volM3 = 0;

    if (active === 'slab') {
      const L = document.getElementById('slab-length').value;
      const W = document.getElementById('slab-width').value;
      const T = document.getElementById('slab-thickness').value;
      const Lu = document.getElementById('slab-length-unit').value;
      const Wu = document.getElementById('slab-width-unit').value;
      const Tu = document.getElementById('slab-thickness-unit').value;
      const l = toMeters(L, Lu);
      const w = toMeters(W, Wu);
      const t = toMeters(T, Tu);
      volM3 = l * w * t;
    } else if (active === 'beam') {
      const L = document.getElementById('beam-length').value;
      const W = document.getElementById('beam-width').value;
      const H = document.getElementById('beam-height').value;
      const Lu = document.getElementById('beam-length-unit').value;
      const Wu = document.getElementById('beam-width-unit').value;
      const Hu = document.getElementById('beam-height-unit').value;
      const l = toMeters(L, Lu);
      const w = toMeters(W, Wu);
      const h = toMeters(H, Hu);
      volM3 = l * w * h;
    } else if (active === 'column') {
      const H = document.getElementById('column-height').value;
      const W = document.getElementById('column-width').value;
      const D = document.getElementById('column-depth').value;
      const Hu = document.getElementById('column-height-unit').value;
      const Wu = document.getElementById('column-width-unit').value;
      const Du = document.getElementById('column-depth-unit').value;
      const h = toMeters(H, Hu);
      const w = toMeters(W, Wu);
      const d = toMeters(D, Du);
      volM3 = h * w * d;
    } else if (active === 'footing') {
      const L = document.getElementById('footing-length').value;
      const W = document.getElementById('footing-width').value;
      const T = document.getElementById('footing-thickness').value;
      const Lu = document.getElementById('footing-length-unit').value;
      const Wu = document.getElementById('footing-width-unit').value;
      const Tu = document.getElementById('footing-thickness-unit').value;
      const l = toMeters(L, Lu);
      const w = toMeters(W, Wu);
      const t = toMeters(T, Tu);
      volM3 = l * w * t;
    }

    const psiSelect = document.getElementById(`${active}-psi`);
    const psi = psiSelect ? psiSelect.value : '3000';

    if (volM3 <= 0) {
      alert('Please enter dimensions greater than zero.');
      return;
    }

    const materials = estimateMaterials(volM3, active, psi);

    // Prices
    const currency = document.getElementById('currency').value;
    const symbol = currency === 'PHP' ? '₱' : currency === 'USD' ? '$' : '€';
    const cementPrice = Number(document.getElementById('cement-price').value) || 0;
    const sandPrice = Number(document.getElementById('sand-price').value) || 0;
    const gravelPrice = Number(document.getElementById('gravel-price').value) || 0;
    const waterPrice = Number(document.getElementById('water-price')?.value) || 0;

    const cementCost = materials.cementBags * cementPrice;
    const sandCost = materials.sandBags * sandPrice;
    const gravelCost = materials.gravelBags * gravelPrice;

    // Adjust water demand based on humidity and temperature
    const humidityVal = Number(document.getElementById('humidity')?.value) || 50; // 20-90
    const tempVal = Number(document.getElementById('temperature')?.value) || 25; // 10-40

    // Humidity adjustment: higher humidity -> reduce water; lower humidity -> increase water
    // Map roughly: humidity 20 => +7.5% water, humidity 90 => -10% water
    const humidityAdjPercent = (50 - humidityVal) * 0.0025; // approx range -0.1..+0.075

    // Temperature adjustment: higher temp -> increase water (slump loss), lower temp -> slightly less
    // Map: 10°C => -5%, 40°C => +5%
    const tempAdjPercent = ((tempVal - 25) / 15) * 0.05;

    let totalAdj = humidityAdjPercent + tempAdjPercent;
    // clamp adjustments to reasonable bounds
    if (totalAdj > 0.15) totalAdj = 0.15;
    if (totalAdj < -0.15) totalAdj = -0.15;

    const waterLitersAdjusted = Math.max(1, Math.ceil(materials.waterLiters * (1 + totalAdj)));
    const waterCost = waterLitersAdjusted * waterPrice;

    let totalCost = cementCost + sandCost + gravelCost + waterCost;

    // display: use same unit family as the input units for the active element
    const family = detectUnitFamily(active);
    if (family === 'metric') {
      // show metric: bags for all, kg mass, m³ volume, L for water
      document.getElementById('cement-qty').textContent = `${materials.cementBags} bags (${materials.cementKg} kg)`;
      document.getElementById('sand-qty').textContent = `${materials.sandBags} bags (${materials.sandKg} kg) - ${materials.sandM3} m³`;
      document.getElementById('gravel-qty').textContent = `${materials.gravelBags} bags (${materials.gravelKg} kg) - ${materials.gravelM3} m³`;
      document.getElementById('water-qty').textContent = `${waterLitersAdjusted} L`;
    } else {
      // imperial: show bags for all, lb mass, cu ft volume, gallons for water
      const cementLb = Math.round(materials.cementKg * 2.20462);
      const sandLb = Math.round(materials.sandKg * 2.20462);
      const gravelLb = Math.round(materials.gravelKg * 2.20462);
      const waterGal = Math.ceil(waterLitersAdjusted / 3.78541);
      document.getElementById('cement-qty').textContent = `${materials.cementBags} bags (${cementLb} lb)`;
      document.getElementById('sand-qty').textContent = `${materials.sandBags} bags (${sandLb} lb) - ${materials.sandCuFt} cu ft`;
      document.getElementById('gravel-qty').textContent = `${materials.gravelBags} bags (${gravelLb} lb) - ${materials.gravelCuFt} cu ft`;
      document.getElementById('water-qty').textContent = `${waterGal} gallons (${waterLitersAdjusted} L)`;
    }

    document.getElementById('cement-cost').textContent = `${symbol}${cementCost.toFixed(2)}`;
    document.getElementById('sand-cost').textContent = `${symbol}${sandCost.toFixed(2)}`;
    document.getElementById('gravel-cost').textContent = `${symbol}${gravelCost.toFixed(2)}`;
    document.getElementById('water-cost').textContent = `${symbol}${waterCost.toFixed(2)}`;
    document.getElementById('total-cost').textContent = `${symbol}${totalCost.toFixed(2)}`;

    resultsSection.classList.remove('hidden');
  }

  calculateBtn.addEventListener('click', calculate);

  // Save calculation
  saveBtn.addEventListener('click', () => {
    const projectName = document.getElementById('project-name').value.trim();
    if (!projectName) { alert('Enter a project name'); return; }
    const saved = JSON.parse(localStorage.getItem('concreteCalculations') || '[]');
    // collect current inputs and prices to store full context
    const active = getActiveTabId();
    function readInput(id) { const el = document.getElementById(id); return el ? el.value : ''; }
    const item = {
      id: Date.now(),
      name: projectName,
      date: new Date().toLocaleString(),
      type: document.querySelector('.tab-button.active').textContent,
      // dimensions and units
      inputs: {
        slab: {
          length: readInput('slab-length'), lengthUnit: readInput('slab-length-unit'),
          width: readInput('slab-width'), widthUnit: readInput('slab-width-unit'),
          thickness: readInput('slab-thickness'), thicknessUnit: readInput('slab-thickness-unit'),
          psi: readInput('slab-psi')
        },
        beam: {
          length: readInput('beam-length'), lengthUnit: readInput('beam-length-unit'),
          width: readInput('beam-width'), widthUnit: readInput('beam-width-unit'),
          height: readInput('beam-height'), heightUnit: readInput('beam-height-unit'),
          psi: readInput('beam-psi')
        },
        column: {
          height: readInput('column-height'), heightUnit: readInput('column-height-unit'),
          width: readInput('column-width'), widthUnit: readInput('column-width-unit'),
          depth: readInput('column-depth'), depthUnit: readInput('column-depth-unit'),
          psi: readInput('column-psi')
        },
        footing: {
          length: readInput('footing-length'), lengthUnit: readInput('footing-length-unit'),
          width: readInput('footing-width'), widthUnit: readInput('footing-width-unit'),
          thickness: readInput('footing-thickness'), thicknessUnit: readInput('footing-thickness-unit'),
          psi: readInput('footing-psi')
        }
      },
      // displayed summaries
      cement: document.getElementById('cement-qty')?.textContent || '',
      sand: document.getElementById('sand-qty')?.textContent || '',
      gravel: document.getElementById('gravel-qty')?.textContent || '',
      water: document.getElementById('water-qty')?.textContent || '',
      total: document.getElementById('total-cost')?.textContent || '',
      // prices and environment
      prices: {
        cementPrice: Number(document.getElementById('cement-price')?.value) || 0,
        sandPrice: Number(document.getElementById('sand-price')?.value) || 0,
        gravelPrice: Number(document.getElementById('gravel-price')?.value) || 0,
        waterPrice: Number(document.getElementById('water-price')?.value) || 0,
        currency: document.getElementById('currency')?.value || 'PHP'
      },
      env: {
        humidity: Number(document.getElementById('humidity')?.value) || 50,
        temperature: Number(document.getElementById('temperature')?.value) || 25
      }
    };
    saved.unshift(item);
    localStorage.setItem('concreteCalculations', JSON.stringify(saved));
    document.getElementById('project-name').value = '';
    loadSavedCalculations();
    showToast('Saved');
  });

  function loadSavedCalculations() {
    const saved = JSON.parse(localStorage.getItem('concreteCalculations') || '[]');
    const container = document.getElementById('saved-calculations');
    if (!container) return;
    if (saved.length === 0) { container.innerHTML = '<p class="text-gray-500 text-sm">No saved calculations yet.</p>'; return; }
    container.innerHTML = saved.map(s => `
      <div class="calc-item flex items-start justify-between">
        <div class="flex-1 mr-4">
          <div class="flex justify-between items-start mb-2">
            <h4 class="font-medium text-sm">${s.name}</h4>
            <span class="text-xs text-gray-500">${s.date}</span>
          </div>
          <div class="text-xs text-gray-600 space-y-1 mb-2">
            <p>Type: ${s.type}</p>
            <p>Total: ${s.total}</p>
            <p class="text-xs text-gray-500">Prices: cement ${s.prices?.cementPrice || '-'}, sand ${s.prices?.sandPrice || '-'}, gravel ${s.prices?.gravelPrice || '-'}, water ${s.prices?.waterPrice || '-'}</p>
          </div>
          <button class="toggle-details text-sm text-gray-600" data-id="${s.id}">Show details</button>
          <div class="saved-details mt-2 hidden text-xs text-gray-700" id="details-${s.id}">
            <pre class="whitespace-pre-wrap">${JSON.stringify(s, null, 2)}</pre>
          </div>
        </div>
        <div class="flex items-center space-x-2">
          <button class="delete-saved text-red-600 hover:text-red-800" data-id="${s.id}" title="Delete saved calculation">
            <i class="ri-delete-bin-line ri-lg"></i>
          </button>
        </div>
      </div>
    `).join('');
  }

  // Delete single saved calculation (event delegation)
  const savedContainer = document.getElementById('saved-calculations');
  if (savedContainer) {
    savedContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.delete-saved');
      if (!btn) return;
      const id = Number(btn.getAttribute('data-id'));
      if (!id) return;
      let saved = JSON.parse(localStorage.getItem('concreteCalculations') || '[]');
      saved = saved.filter(s => s.id !== id);
      localStorage.setItem('concreteCalculations', JSON.stringify(saved));
      loadSavedCalculations();
      showToast('Deleted');
    });
  }

  // Toggle details and handle show/hide
  if (savedContainer) {
    savedContainer.addEventListener('click', (e) => {
      const t = e.target.closest('.toggle-details');
      if (!t) return;
      const id = t.getAttribute('data-id');
      const details = document.getElementById(`details-${id}`);
      if (!details) return;
      details.classList.toggle('hidden');
      t.textContent = details.classList.contains('hidden') ? 'Show details' : 'Hide details';
    });
  }

  document.getElementById('clear-history').addEventListener('click', () => {
    if (confirm('Clear all saved calculations?')) { localStorage.removeItem('concreteCalculations'); loadSavedCalculations(); }
  });

  loadSavedCalculations();

  // small toast helper
  function showToast(msg) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2000);
  }

})