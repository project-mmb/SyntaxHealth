/**
 * Simulation page — Live demo: form → run simulation → show cards, charts, and what the data means
 */

(function () {
  'use strict';

  var chartInstances = [];

  function getNum(id, def) {
    var el = document.getElementById(id);
    if (!el) return def;
    var n = parseFloat(el.value, 10);
    return isNaN(n) ? def : n;
  }

  function computeBMI(weightKg, heightCm) {
    if (!heightCm) return 0;
    var heightM = heightCm / 100;
    return Math.round(weightKg / (heightM * heightM) * 10) / 10;
  }

  function getRiskLevel(value, lowMax, modMax) {
    if (value <= lowMax) return { level: 'Low', cls: 'risk-low' };
    if (value <= modMax) return { level: 'Moderate', cls: 'risk-moderate' };
    return { level: 'High', cls: 'risk-high' };
  }

  function runSimulation(inputs) {
    var bmi = computeBMI(inputs.weight, inputs.height);
    var cardioRisk = 20;
    if (inputs.bpSys > 140 || inputs.bpDia > 90) cardioRisk = 75;
    else if (inputs.bpSys > 130 || inputs.bpDia > 85) cardioRisk = 45;
    if (inputs.heartRate > 100) cardioRisk = Math.min(90, cardioRisk + 25);
    if (inputs.heartRate < 50 && inputs.heartRate > 0) cardioRisk = Math.min(80, cardioRisk + 15);

    var metabolicRisk = 25;
    if (inputs.glucose > 126) metabolicRisk = 80;
    else if (inputs.glucose > 100) metabolicRisk = 50;
    if (inputs.hba1c >= 6.5) metabolicRisk = Math.max(metabolicRisk, 70);
    else if (inputs.hba1c >= 5.7) metabolicRisk = Math.max(metabolicRisk, 45);
    if (bmi >= 30) metabolicRisk = Math.min(95, metabolicRisk + 20);
    else if (bmi >= 25) metabolicRisk = Math.min(90, metabolicRisk + 10);

    var otherRisk = 15;
    if (inputs.platelets < 150 || inputs.platelets > 400) otherRisk = 55;

    if (inputs.sex === 'pregnant') {
      cardioRisk = Math.min(95, cardioRisk + 15);
      otherRisk = Math.min(90, otherRisk + 10);
    }

    var overall = Math.round((cardioRisk + metabolicRisk + otherRisk) / 3);
    return {
      bmi: bmi,
      sex: inputs.sex,
      whatsWrong: inputs.whatsWrong || '',
      overall: getRiskLevel(overall, 33, 66),
      cardio: getRiskLevel(cardioRisk, 33, 66),
      metabolic: getRiskLevel(metabolicRisk, 33, 66),
      projection: overall < 40 ? 'Stable' : (overall < 65 ? 'Monitor' : 'Review recommended'),
      cardioScore: cardioRisk,
      metabolicScore: metabolicRisk,
      otherScore: otherRisk,
      inputs: inputs
    };
  }

  function getMeaningText(result) {
    var bmi = result.bmi;
    var lines = [];
    if (result.whatsWrong && result.whatsWrong.trim()) {
      lines.push('You described: &quot;' + result.whatsWrong.trim().replace(/</g, '&lt;').substring(0, 200) + (result.whatsWrong.length > 200 ? '…' : '') + '&quot;. This context is considered in the simulation.');
    }
    if (result.sex === 'pregnant') {
      lines.push('Maternal mode is on: the simulation includes pregnancy-related cardiovascular and physiological factors.');
    }
    lines.push('Based on the clinical details you entered, the digital twin has run a 7-day projection.');
    if (result.overall.level === 'Low') {
      lines.push('Your <strong>overall risk</strong> is low. Cardiovascular and metabolic markers are within or near target ranges.');
    } else if (result.overall.level === 'Moderate') {
      lines.push('Your <strong>overall risk</strong> is moderate. One or more systems (e.g. cardiovascular or metabolic) show values that warrant attention. The simulation suggests monitoring and possible lifestyle or care adjustments.');
    } else {
      lines.push('Your <strong>overall risk</strong> is elevated. The simulation flags cardiovascular and/or metabolic factors that may benefit from clinical review and intervention.');
    }
    if (bmi >= 25) {
      lines.push('Your <strong>BMI</strong> (' + bmi + ') is in the overweight or obese range; the model factors this into metabolic and cardiovascular risk.');
    }
    if (result.inputs.glucose > 100) {
      lines.push('Glucose and/or HbA1c are above optimal range; the projection assumes current diet and activity unless you change inputs.');
    }
    if (result.inputs.bpSys > 130 || result.inputs.bpDia > 85) {
      lines.push('Blood pressure is elevated in this scenario; the cardiovascular module projects stress on the system over the next 7 days.');
    }
    lines.push('This is a <strong>demonstration</strong> only. Always discuss your real health data and any concerns with your clinician.');
    return lines.map(function (line) { return '<p>' + line + '</p>'; }).join('');
  }

  function drawCharts(result) {
    var gridColor = 'rgba(255, 255, 255, 0.06)';
    var textColor = 'rgba(255, 255, 255, 0.8)';

    chartInstances.forEach(function (c) { if (c) c.destroy(); });
    chartInstances = [];

    var riskTrendCtx = document.getElementById('sim-chart-risk');
    if (riskTrendCtx) {
      var baseRisk = (result.cardioScore + result.metabolicScore + result.otherScore) / 3;
      var trendData = [baseRisk, baseRisk + 2, baseRisk + 1, baseRisk + 3, baseRisk + 2, baseRisk + 4, baseRisk + 3];
      chartInstances.push(new Chart(riskTrendCtx, {
        type: 'line',
        data: {
          labels: ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'],
          datasets: [{
            label: 'Risk index',
            data: trendData,
            borderColor: 'rgb(34, 211, 238)',
            backgroundColor: 'rgba(34, 211, 238, 0.1)',
            fill: true,
            tension: 0.3
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { color: gridColor }, ticks: { color: textColor } },
            y: { min: 0, max: 100, grid: { color: gridColor }, ticks: { color: textColor } }
          }
        }
      }));
    }

    var systemsCtx = document.getElementById('sim-chart-systems');
    if (systemsCtx) {
      chartInstances.push(new Chart(systemsCtx, {
        type: 'doughnut',
        data: {
          labels: ['Cardiovascular', 'Metabolic', 'Other'],
          datasets: [{
            data: [result.cardioScore, result.metabolicScore, result.otherScore],
            backgroundColor: ['rgba(37, 99, 235, 0.8)', 'rgba(74, 222, 128, 0.8)', 'rgba(148, 163, 184, 0.8)'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom', labels: { color: textColor } } }
        }
      }));
    }

    var glucoseCtx = document.getElementById('sim-chart-glucose');
    if (glucoseCtx) {
      var g = result.inputs.glucose;
      var proj = [g, g + 3, g + 1, g + 4, g + 2, g + 2, g + 3];
      chartInstances.push(new Chart(glucoseCtx, {
        type: 'line',
        data: {
          labels: ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'],
          datasets: [{
            label: 'Glucose (mg/dL)',
            data: proj,
            borderColor: 'rgb(74, 222, 128)',
            backgroundColor: 'rgba(74, 222, 128, 0.1)',
            fill: true,
            tension: 0.3
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { color: gridColor }, ticks: { color: textColor } },
            y: { min: 70, max: 140, grid: { color: gridColor }, ticks: { color: textColor } }
          }
        }
      }));
    }
  }

  function showResults(result) {
    var resultsEl = document.getElementById('sim-results');
    if (!resultsEl) return;

    var overallEl = document.getElementById('sim-card-overall');
    var cardioEl = document.getElementById('sim-card-cardio');
    var metabolicEl = document.getElementById('sim-card-metabolic');
    var projectionEl = document.getElementById('sim-card-projection');

    if (overallEl) {
      overallEl.textContent = result.overall.level;
      overallEl.className = 'sim-card-value ' + result.overall.cls;
    }
    if (cardioEl) {
      cardioEl.textContent = result.cardio.level;
      cardioEl.className = 'sim-card-value ' + result.cardio.cls;
    }
    if (metabolicEl) {
      metabolicEl.textContent = result.metabolic.level;
      metabolicEl.className = 'sim-card-value ' + result.metabolic.cls;
    }
    if (projectionEl) {
      projectionEl.textContent = result.projection;
      projectionEl.className = 'sim-card-value';
    }

    var meaningEl = document.getElementById('sim-meaning-content');
    if (meaningEl) meaningEl.innerHTML = getMeaningText(result);

    drawCharts(result);
    resultsEl.style.display = 'block';
    resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function handleSubmit(e) {
    e.preventDefault();
    var errEl = document.getElementById('sim-form-error');
    if (errEl) {
      errEl.style.display = 'none';
      errEl.textContent = '';
    }

    var age = getNum('sim-age', 35);
    var weight = getNum('sim-weight', 70);
    var height = getNum('sim-height', 170);
    var glucose = getNum('sim-glucose', 98);
    var platelets = getNum('sim-platelets', 245);
    var bpSys = getNum('sim-bp-sys', 122);
    var bpDia = getNum('sim-bp-dia', 78);
    var heartRate = getNum('sim-hr', 72);
    var hba1c = getNum('sim-hba1c', 5.4);
    var sexEl = document.getElementById('sim-sex');
    var sex = sexEl ? sexEl.value : 'female';
    var whatsWrongEl = document.getElementById('sim-whats-wrong');
    var whatsWrong = whatsWrongEl ? whatsWrongEl.value.trim() : '';

    if (height < 100 || height > 250) {
      if (errEl) { errEl.textContent = 'Please enter a valid height (100–250 cm).'; errEl.style.display = 'block'; }
      return;
    }
    if (weight < 20 || weight > 300) {
      if (errEl) { errEl.textContent = 'Please enter a valid weight (20–300 kg).'; errEl.style.display = 'block'; }
      return;
    }

    var inputs = {
      age: age,
      sex: sex,
      weight: weight,
      height: height,
      glucose: glucose,
      platelets: platelets,
      bpSys: bpSys,
      bpDia: bpDia,
      heartRate: heartRate,
      hba1c: hba1c,
      whatsWrong: whatsWrong
    };

    var result = runSimulation(inputs);
    showResults(result);
  }

  function init() {
    var form = document.getElementById('sim-form');
    if (form) form.addEventListener('submit', handleSubmit);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
