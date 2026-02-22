/**
 * Clinical Dashboard — Doctor/nurse: accept patients, enter personal + clinical data for simulation
 */

(function () {
  'use strict';

  var PATIENT_DATA_KEY = 'syntaxHealth_patientData';

  function getPatientData() {
    var raw = localStorage.getItem(PATIENT_DATA_KEY);
    return raw ? JSON.parse(raw) : {};
  }

  function savePatientData(data) {
    localStorage.setItem(PATIENT_DATA_KEY, JSON.stringify(data));
  }

  function guardClinician() {
    if (typeof window.SyntaxAuth === 'undefined') return false;
    var user = window.SyntaxAuth.getCurrentUser();
    if (!user || user.role !== 'clinician') {
      window.location.href = 'login.html';
      return false;
    }
    return true;
  }

  function initUser() {
    if (typeof window.SyntaxAuth === 'undefined') return;
    var user = window.SyntaxAuth.getCurrentUser();
    var el = document.getElementById('clinical-user-name');
    if (el && user && user.name) el.textContent = user.name;
  }

  function renderPending() {
    var list = document.getElementById('clinical-pending-list');
    var emptyEl = document.getElementById('clinical-pending-empty');
    if (!list) return;

    var user = window.SyntaxAuth.getCurrentUser();
    if (!user) return;
    var requests = window.SyntaxAuth.getRequestsForClinician(user.id);
    var getUserById = window.SyntaxAuth.getUserById;
    if (!getUserById) return;

    var pending = [];
    for (var i = 0; i < requests.length; i++) {
      if (requests[i].status === 'pending') {
        var p = getUserById(requests[i].patientId);
        if (p) pending.push({ request: requests[i], patient: p });
      }
    }

    if (pending.length === 0) {
      if (emptyEl) emptyEl.style.display = 'block';
      return;
    }
    if (emptyEl) emptyEl.style.display = 'none';

    list.innerHTML = '';
    for (var j = 0; j < pending.length; j++) {
      var r = pending[j];
      var li = document.createElement('li');
      li.innerHTML = '<span class="clinical-request-name">' + escapeHtml(r.patient.name) + '</span>' +
        '<span class="clinical-request-email">' + escapeHtml(r.patient.email) + '</span>' +
        '<div class="clinical-request-actions">' +
        '<button type="button" class="clinical-btn-accept" data-request-id="' + escapeHtml(r.request.id) + '">Accept</button>' +
        '<button type="button" class="clinical-btn-reject" data-request-id="' + escapeHtml(r.request.id) + '">Reject</button>' +
        '</div>';
      list.appendChild(li);
    }

    list.querySelectorAll('.clinical-btn-accept').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = this.getAttribute('data-request-id');
        if (id && window.SyntaxAuth.acceptPatient(id)) {
          renderPending();
          renderPatients();
        }
      });
    });
    list.querySelectorAll('.clinical-btn-reject').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = this.getAttribute('data-request-id');
        if (id && window.SyntaxAuth.rejectPatient(id)) {
          renderPending();
        }
      });
    });
  }

  function escapeHtml(s) {
    if (!s) return '';
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function renderPatients() {
    var list = document.getElementById('clinical-patients-list');
    var emptyEl = document.getElementById('clinical-patients-empty');
    if (!list) return;

    var user = window.SyntaxAuth.getCurrentUser();
    if (!user) return;
    var patients = window.SyntaxAuth.getMyPatients(user.id);

    if (patients.length === 0) {
      if (emptyEl) emptyEl.style.display = 'block';
      list.innerHTML = '';
      if (emptyEl && list) list.appendChild(emptyEl);
      return;
    }
    if (emptyEl) emptyEl.style.display = 'none';

    list.innerHTML = '';
    for (var i = 0; i < patients.length; i++) {
      var p = patients[i];
      var li = document.createElement('li');
      li.innerHTML = '<span class="clinical-patient-name">' + escapeHtml(p.name) + '</span>' +
        '<span class="clinical-patient-email">' + escapeHtml(p.email) + '</span>' +
        '<button type="button" class="clinical-btn-enter" data-patient-id="' + escapeHtml(p.id) + '" data-patient-name="' + escapeHtml(p.name) + '">Enter data</button>';
      list.appendChild(li);
    }

    list.querySelectorAll('.clinical-btn-enter').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = this.getAttribute('data-patient-id');
        var name = this.getAttribute('data-patient-name');
        selectPatient(id, name);
      });
    });
  }

  function selectPatient(patientId, patientName) {
    var block = document.getElementById('clinical-data-block');
    var subtitle = document.getElementById('clinical-data-subtitle');
    var nameEl = document.getElementById('clinical-selected-name');
    var form = document.getElementById('clinical-patient-form');
    var idInput = document.getElementById('clinical-patient-id');
    if (!block || !idInput) return;

    idInput.value = patientId || '';
    if (nameEl) nameEl.textContent = patientName || '—';
    block.style.display = 'block';
    block.scrollIntoView({ behavior: 'smooth', block: 'start' });

    var data = getPatientData()[patientId];
    if (data) {
      setFormValues(form, data);
    } else {
      resetForm(form);
      var user = window.SyntaxAuth.getUserById(patientId);
      if (user) {
        var fullName = document.getElementById('cl-fullName');
        if (fullName) fullName.value = user.name || '';
      }
    }
  }

  function setFormValues(form, data) {
    var personal = data.personal || {};
    var clinical = data.clinical || {};
    setVal('cl-fullName', personal.fullName);
    setVal('cl-dob', personal.dob);
    setVal('cl-gender', personal.gender);
    setVal('cl-phone', personal.phone);
    setVal('cl-address', personal.address);
    setVal('cl-age', clinical.age);
    setVal('cl-weight', clinical.weight);
    setVal('cl-height', clinical.height);
    setVal('cl-glucose', clinical.glucose);
    setVal('cl-platelets', clinical.platelets);
    setVal('cl-bpSys', clinical.bpSys);
    setVal('cl-bpDia', clinical.bpDia);
    setVal('cl-hr', clinical.heartRate);
    setVal('cl-hba1c', clinical.hba1c);
    setVal('cl-notes', clinical.notes);
  }

  function setVal(id, val) {
    var el = document.getElementById(id);
    if (el && val !== undefined && val !== null) el.value = val;
  }

  function resetForm(form) {
    if (!form) return;
    var inputs = form.querySelectorAll('input, select, textarea');
    for (var i = 0; i < inputs.length; i++) {
      if (inputs[i].type === 'hidden') continue;
      inputs[i].value = '';
    }
  }

  function getFormData(form) {
    var patientId = document.getElementById('clinical-patient-id').value;
    if (!patientId) return null;
    return {
      personal: {
        fullName: form.querySelector('#cl-fullName').value.trim(),
        dob: form.querySelector('#cl-dob').value,
        gender: form.querySelector('#cl-gender').value,
        phone: form.querySelector('#cl-phone').value.trim(),
        address: form.querySelector('#cl-address').value.trim()
      },
      clinical: {
        age: form.querySelector('#cl-age').value ? parseInt(form.querySelector('#cl-age').value, 10) : null,
        weight: form.querySelector('#cl-weight').value ? parseFloat(form.querySelector('#cl-weight').value, 10) : null,
        height: form.querySelector('#cl-height').value ? parseFloat(form.querySelector('#cl-height').value, 10) : null,
        glucose: form.querySelector('#cl-glucose').value ? parseFloat(form.querySelector('#cl-glucose').value, 10) : null,
        platelets: form.querySelector('#cl-platelets').value ? parseFloat(form.querySelector('#cl-platelets').value, 10) : null,
        bpSys: form.querySelector('#cl-bpSys').value ? parseInt(form.querySelector('#cl-bpSys').value, 10) : null,
        bpDia: form.querySelector('#cl-bpDia').value ? parseInt(form.querySelector('#cl-bpDia').value, 10) : null,
        heartRate: form.querySelector('#cl-hr').value ? parseInt(form.querySelector('#cl-hr').value, 10) : null,
        hba1c: form.querySelector('#cl-hba1c').value ? parseFloat(form.querySelector('#cl-hba1c').value, 10) : null,
        notes: form.querySelector('#cl-notes').value.trim()
      }
    };
  }

  function handleFormSubmit(e) {
    e.preventDefault();
    var form = document.getElementById('clinical-patient-form');
    var msgEl = document.getElementById('clinical-form-message');
    if (!form || !msgEl) return;

    var patientId = document.getElementById('clinical-patient-id').value;
    if (!patientId) {
      msgEl.textContent = 'Please select a patient first.';
      msgEl.className = 'clinical-form-message error';
      msgEl.style.display = 'block';
      return;
    }

    var data = getFormData(form);
    if (!data) return;

    var all = getPatientData();
    all[patientId] = data;
    savePatientData(all);

    msgEl.textContent = 'Patient data saved.';
    msgEl.className = 'clinical-form-message success';
    msgEl.style.display = 'block';
    setTimeout(function () { msgEl.style.display = 'none'; }, 3000);
  }

  function initLogout() {
    var btn = document.getElementById('clinical-logout');
    if (btn && typeof window.SyntaxAuth !== 'undefined') {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        window.SyntaxAuth.logout();
        window.location.href = 'index.html';
      });
    }
  }

  function init() {
    if (!guardClinician()) return;
    initUser();
    renderPending();
    renderPatients();
    initLogout();

    var form = document.getElementById('clinical-patient-form');
    if (form) form.addEventListener('submit', handleFormSubmit);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
