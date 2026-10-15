const state = {
  token: null,
  telephone: null,
  account: null,
  services: [],
  prestations: [],
  transactions: [],
  selectedTransaction: null,
  selectedPrestation: null,
  view: 'dashboard',
};

const currency = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
const api = {
  bank: '/api/bank',
  service: '/api/service',
};

const elements = {
  authView: document.querySelector('#authView'),
  walletView: document.querySelector('#walletView'),
  loginForm: document.querySelector('#loginForm'),
  registerForm: document.querySelector('#registerForm'),
  logoutButton: document.querySelector('#logoutButton'),
  transactionDialog: document.querySelector('#transactionDialog'),
  orderDialog: document.querySelector('#orderDialog'),
  paymentDialog: document.querySelector('#paymentDialog'),
  toast: document.querySelector('#toast'),
};

function money(amount) {
  const value = Number(amount);
  return Number.isFinite(value) ? `${currency.format(value)} FCFA` : '— FCFA';
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

function errorText(error) {
  return error instanceof Error ? error.message : 'Une erreur inattendue est survenue.';
}

function setFormError(selector, message) {
  const element = document.querySelector(selector);
  element.textContent = message;
  element.hidden = !message;
}

let toastTimer;
function showToast(message, isError = false) {
  elements.toast.textContent = message;
  elements.toast.classList.toggle('is-error', isError);
  elements.toast.hidden = false;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => { elements.toast.hidden = true; }, 4500);
}

async function request(path, options = {}, authenticated = false) {
  const headers = new Headers(options.headers ?? {});
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (authenticated && state.token) {
    headers.set('Authorization', `Bearer ${state.token}`);
  }

  let response;
  try {
    response = await fetch(path, { ...options, headers });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('Impossible de joindre le serveur web local. Vérifiez que le serveur est démarré.');
    }
    throw error;
  }

  const raw = await response.text();
  let result = null;
  if (raw) {
    try {
      result = JSON.parse(raw);
    } catch {
      result = raw;
    }
  }
  if (!response.ok) {
    const message = typeof result === 'object' && result !== null
      ? result.message ?? result.error ?? result.detail
      : result;
    throw new Error(message || `La requête a échoué (HTTP ${response.status}).`);
  }
  return result;
}

function setAuthMode(registering) {
  elements.loginForm.hidden = registering;
  elements.registerForm.hidden = !registering;
  document.querySelector('#authTitle').textContent = registering ? 'Créez votre compte' : 'Connectez-vous';
  document.querySelector('#authSubtitle').textContent = registering
    ? 'Quelques informations pour ouvrir votre portefeuille.'
    : 'Retrouvez votre espace portefeuille.';
  document.querySelector('#switchPrompt').textContent = registering
    ? 'Vous avez déjà un compte ?'
    : 'Vous n’avez pas encore de compte ?';
  document.querySelector('#switchAuthButton').textContent = registering ? 'Se connecter' : 'Créer un compte';
  setFormError('#loginError', '');
  setFormError('#registerError', '');
}

function showAuth() {
  state.token = null;
  state.telephone = null;
  state.account = null;
  state.services = [];
  state.prestations = [];
  sessionStorage.removeItem('nikitin-session');
  elements.authView.hidden = false;
  elements.walletView.hidden = true;
  elements.logoutButton.hidden = true;
  setAuthMode(false);
}

function showWallet() {
  elements.authView.hidden = true;
  elements.walletView.hidden = false;
  elements.logoutButton.hidden = false;
  renderProfile();
}

function normalizePhone(phone) {
  return String(phone ?? '').replace(/\s/g, '');
}

function dateLabel(value) {
  if (!value) return 'Date non précisée';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

function renderProfile() {
  const account = state.account;
  const fullName = [account?.prenom, account?.nom].filter(Boolean).join(' ').trim();
  const name = fullName || 'Mon portefeuille';
  document.querySelector('#profileName').textContent = name;
  document.querySelector('#profilePhone').textContent = state.telephone ?? '';
  document.querySelector('#profileAvatar').textContent = name.charAt(0).toUpperCase();
  document.querySelector('#greetingName').textContent = fullName ? `, ${fullName.split(' ')[0]}` : '';
  document.querySelector('#todayLabel').textContent = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  }).format(new Date()).toUpperCase();
  document.querySelector('#cardHolder').textContent = name.toUpperCase();
  document.querySelector('#accountNumber').textContent = account?.numero || '—';
  document.querySelector('#balanceAmount').innerHTML = `${escapeHtml(money(account?.solde).replace(' FCFA', ''))} <span>FCFA</span>`;
  document.querySelector('#statBalance').textContent = money(account?.solde);

  const paid = state.prestations.filter((prestation) => prestation.statut === 'PAYEE');
  const pending = state.prestations.filter((prestation) => prestation.statut === 'EN_ATTENTE_PAIEMENT');
  const spent = paid.reduce((sum, prestation) => sum + Number(prestation.prix || 0), 0);
  document.querySelector('#statPaid').textContent = String(paid.length);
  document.querySelector('#statSpent').textContent = `${money(spent)} dépensés`;
  document.querySelector('#statPending').textContent = String(pending.length);
}

function renderTransactions() {
  const list = [...state.transactions].reverse();
  const markup = list.length
    ? list.map((transaction) => {
      const isDeposit = String(transaction.type).toUpperCase() === 'DEPOT';
      return `<article class="transaction-row">
        <span class="transaction-icon ${isDeposit ? '' : 'is-withdrawal'}" aria-hidden="true">${isDeposit ? '↗' : '↘'}</span>
        <span class="transaction-copy"><strong>${isDeposit ? 'Dépôt' : 'Retrait'}</strong><small>${escapeHtml(dateLabel(transaction.date))} · Nouveau solde : ${escapeHtml(money(transaction.nouveauSolde))}</small></span>
        <span class="transaction-amount ${isDeposit ? 'is-credit' : ''}">${isDeposit ? '+' : '−'}${escapeHtml(money(transaction.montant))}</span>
      </article>`;
    }).join('')
    : '<div class="empty-state"><span class="empty-icon">↗</span><strong>Aucune opération pour le moment</strong><p>Les opérations effectuées dans cette session apparaîtront ici.</p></div>';

  document.querySelector('#recentTransactions').innerHTML = markup;
  document.querySelector('#allTransactions').innerHTML = markup;
}

function renderServices(error = '') {
  const list = document.querySelector('#serviceList');
  document.querySelector('#serviceCount').textContent = state.services.length
    ? `${state.services.length} service${state.services.length > 1 ? 's' : ''}`
    : '';
  if (error) {
    list.innerHTML = `<div class="empty-state"><strong>Catalogue indisponible</strong><p>${escapeHtml(error)}</p></div>`;
    return;
  }
  if (!state.services.length) {
    list.innerHTML = '<div class="empty-state"><strong>Aucun service disponible</strong><p>Le catalogue ne contient pas encore de service.</p></div>';
    return;
  }
  list.innerHTML = state.services.map((service, index) => `
    <article class="service-card">
      <div class="service-card-top"><span class="service-icon" aria-hidden="true">${['◇', '⌘', '✳', '◈'][index % 4]}</span><span class="service-available">Disponible</span></div>
      <h3>${escapeHtml(service.nom || 'Service')}</h3>
      <p>Service n° ${escapeHtml(service.id)}</p>
    </article>`).join('');
  renderOrderServices();
}

function visiblePrestations() {
  const phone = normalizePhone(state.telephone);
  return state.prestations.filter((prestation) => normalizePhone(prestation.telephone) === phone);
}

function statusInfo(status) {
  if (status === 'PAYEE') return { label: 'Payée', className: 'is-paid' };
  if (status === 'ECHOUEE') return { label: 'Échouée', className: 'is-failed' };
  if (status === 'EN_ATTENTE_PAIEMENT') return { label: 'À payer', className: '' };
  return { label: 'En cours', className: '' };
}

function renderPrestations(error = '') {
  const list = document.querySelector('#prestationList');
  if (error) {
    list.innerHTML = `<div class="empty-state"><strong>Demandes indisponibles</strong><p>${escapeHtml(error)}</p></div>`;
    renderProfile();
    return;
  }
  const prestations = visiblePrestations();
  if (!prestations.length) {
    list.innerHTML = '<div class="empty-state"><strong>Aucune demande pour le moment</strong><p>Votre première demande de service apparaîtra ici.</p></div>';
    renderProfile();
    return;
  }
  list.innerHTML = prestations.map((prestation) => {
    const status = statusInfo(prestation.statut);
    const serviceNames = Array.isArray(prestation.services)
      ? prestation.services.map((service) => service.nom).filter(Boolean).join(', ')
      : '';
    const description = prestation.description || serviceNames || `Demande n° ${prestation.id}`;
    const canPay = prestation.statut === 'EN_ATTENTE_PAIEMENT';
    return `<article class="request-card">
      <div class="request-card-top">
        <div><h3>${escapeHtml(description)}</h3><p>${escapeHtml(serviceNames && prestation.description ? serviceNames : `Demande n° ${prestation.id}`)}</p></div>
        <span class="status-pill ${status.className}">${status.label}</span>
      </div>
      <div class="request-meta"><span>${escapeHtml(dateLabel(prestation.datedebut || prestation.dateDebut))} → ${escapeHtml(dateLabel(prestation.datefin || prestation.dateFin))}</span><strong>${escapeHtml(money(prestation.prix))}</strong></div>
      ${canPay ? `<div class="request-card-actions"><button class="button button-outline" type="button" data-pay-prestation="${escapeHtml(prestation.id)}">Régler maintenant <span aria-hidden="true">→</span></button></div>` : ''}
    </article>`;
  }).join('');
  renderProfile();
}

function renderOrderServices() {
  const options = document.querySelector('#orderServiceOptions');
  if (!state.services.length) {
    options.innerHTML = '<p class="form-hint">Aucun service n’est disponible pour le moment.</p>';
    return;
  }
  options.innerHTML = state.services.map((service) => `
    <label class="service-checkbox">
      <input type="checkbox" name="serviceIds" value="${escapeHtml(service.id)}">
      <span>${escapeHtml(service.nom)}</span>
    </label>`).join('');
}

async function loadAccount() {
  const account = await request(
    `${api.bank}/api/comptes/${encodeURIComponent(state.telephone)}`,
    {},
    true,
  );
  if (!account || typeof account !== 'object' || !account.numero ||
      account.solde === null || account.solde === undefined ||
      !Number.isFinite(Number(account.solde))) {
    throw new Error('La réponse du serveur pour le compte est invalide.');
  }
  state.account = account;
  renderProfile();
  return account;
}

async function loadLists() {
  const [servicesResult, prestationsResult] = await Promise.allSettled([
    request(`${api.service}/api/services`).then((result) => {
      if (!Array.isArray(result)) throw new Error('La réponse du catalogue est invalide.');
      return result;
    }),
    request(`${api.service}/api/prestations`).then((result) => {
      if (!Array.isArray(result)) throw new Error('La réponse des demandes est invalide.');
      return result;
    }),
  ]);
  if (servicesResult.status === 'fulfilled') {
    state.services = servicesResult.value;
    renderServices();
  } else {
    state.services = [];
    renderServices(errorText(servicesResult.reason));
    showToast(`Catalogue : ${errorText(servicesResult.reason)}`, true);
  }
  if (prestationsResult.status === 'fulfilled') {
    state.prestations = prestationsResult.value;
    renderPrestations();
  } else {
    state.prestations = [];
    renderPrestations(errorText(prestationsResult.reason));
    showToast(`Demandes : ${errorText(prestationsResult.reason)}`, true);
  }
}

async function enterWallet() {
  showWallet();
  renderTransactions();
  try {
    await loadAccount();
  } catch (error) {
    showToast(`Compte : ${errorText(error)}`, true);
    if (/401|403|unauthori|forbidden/i.test(errorText(error))) {
      showAuth();
      showToast('Votre session a expiré. Connectez-vous à nouveau.', true);
      return;
    }
  }
  await loadLists();
}

function setActiveView(view) {
  state.view = view;
  for (const button of document.querySelectorAll('[data-view]')) {
    const active = button.dataset.view === view;
    button.classList.toggle('is-active', active);
    if (active) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  }
  for (const page of document.querySelectorAll('.page-view')) {
    page.hidden = page.id !== `${view}Page`;
  }
  if (view === 'services') loadLists();
  if (view === 'activity') {
    renderTransactions();
    renderProfile();
  }
}

function setButtonBusy(button, busy, text) {
  if (!button.dataset.idleLabel) button.dataset.idleLabel = button.innerHTML;
  button.disabled = busy;
  button.innerHTML = busy ? `<span class="spinner" aria-hidden="true"></span>${escapeHtml(text)}` : button.dataset.idleLabel;
}

elements.loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setFormError('#loginError', '');
  const button = elements.loginForm.querySelector('[type="submit"]');
  setButtonBusy(button, true, 'Connexion…');
  try {
    const form = new FormData(elements.loginForm);
    const result = await request(`${api.bank}/api/auth/login`, {
      method: 'POST',
      body: JSON.stringify({
        username: String(form.get('telephone')).trim(),
        password: String(form.get('pin')),
      }),
    });
    if (!result?.token) throw new Error('Le serveur n’a pas retourné de jeton de session.');
    state.token = result.token;
    state.telephone = result.telephone || String(form.get('telephone')).trim();
    sessionStorage.setItem('nikitin-session', JSON.stringify({
      token: state.token,
      telephone: state.telephone,
    }));
    state.transactions = [];
    await enterWallet();
  } catch (error) {
    setFormError('#loginError', errorText(error));
  } finally {
    setButtonBusy(button, false);
  }
});

document.querySelector('#switchAuthButton').addEventListener('click', () => {
  setAuthMode(!elements.loginForm.hidden);
});

document.querySelectorAll('[data-demo-phone]').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelector('#loginPhone').value = button.dataset.demoPhone;
    document.querySelector('#loginPin').value = button.dataset.demoPin;
    setFormError('#loginError', '');
    document.querySelector('#loginPin').focus();
  });
});

document.querySelector('#sendOtpButton').addEventListener('click', async (event) => {
  const button = event.currentTarget;
  const telephone = document.querySelector('#registerPhone').value.trim();
  setFormError('#registerError', '');
  document.querySelector('#otpMessage').hidden = true;
  if (telephone.replace(/\D/g, '').length < 8) {
    setFormError('#registerError', 'Saisissez un numéro de téléphone valide.');
    return;
  }
  setButtonBusy(button, true, 'Envoi…');
  try {
    const result = await request(`${api.bank}/api/auth/otp/send`, {
      method: 'POST',
      body: JSON.stringify({ telephone }),
    });
    const message = result?.otp
      ? `Code de démonstration : ${result.otp}. Il est valable 5 minutes.`
      : (result?.message || 'Le code a été envoyé.');
    if (result?.otp) document.querySelector('#registerOtp').value = String(result.otp);
    const otpMessage = document.querySelector('#otpMessage');
    otpMessage.textContent = message;
    otpMessage.hidden = false;
  } catch (error) {
    setFormError('#registerError', errorText(error));
  } finally {
    setButtonBusy(button, false);
  }
});

elements.registerForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setFormError('#registerError', '');
  const button = elements.registerForm.querySelector('[type="submit"]');
  const form = new FormData(elements.registerForm);
  const telephone = String(form.get('telephone')).trim();
  const pin = String(form.get('pin'));
  if (!/^\d{4,6}$/.test(pin)) {
    setFormError('#registerError', 'Le code PIN doit contenir entre 4 et 6 chiffres.');
    return;
  }
  setButtonBusy(button, true, 'Création…');
  try {
    const result = await request(`${api.bank}/api/auth/register`, {
      method: 'POST',
      body: JSON.stringify({
        telephone,
        pin,
        otp: String(form.get('otp')).trim(),
        prenom: String(form.get('prenom')).trim(),
        nom: String(form.get('nom')).trim(),
        numPiece: String(form.get('numPiece')).trim(),
        adresse: String(form.get('adresse')).trim(),
        dateNaissance: form.get('dateNaissance'),
        solde: Number(form.get('solde')),
      }),
    });
    if (result?.token) {
      state.token = result.token;
      state.telephone = result.telephone || telephone;
      sessionStorage.setItem('nikitin-session', JSON.stringify({
        token: state.token,
        telephone: state.telephone,
      }));
      await enterWallet();
    } else {
      document.querySelector('#loginPhone').value = telephone;
      setAuthMode(false);
      showToast('Compte créé. Connectez-vous pour accéder à votre portefeuille.');
    }
  } catch (error) {
    setFormError('#registerError', errorText(error));
  } finally {
    setButtonBusy(button, false);
  }
});

elements.logoutButton.addEventListener('click', () => {
  showAuth();
  document.querySelector('#loginPin').value = '';
});

document.querySelectorAll('[data-view]').forEach((button) => {
  button.addEventListener('click', () => setActiveView(button.dataset.view));
});

document.querySelectorAll('[data-open-view]').forEach((button) => {
  button.addEventListener('click', () => setActiveView(button.dataset.openView));
});

document.querySelector('#refreshButton').addEventListener('click', async () => {
  const button = document.querySelector('#refreshButton');
  button.disabled = true;
  try {
    const account = await loadAccount();
    await loadLists();
    if (account) showToast('Votre portefeuille a été actualisé.');
  } catch (error) {
    showToast(errorText(error), true);
  } finally {
    button.disabled = false;
  }
});

document.querySelectorAll('[data-transaction]').forEach((button) => {
  button.addEventListener('click', () => {
    state.selectedTransaction = button.dataset.transaction;
    const isDeposit = state.selectedTransaction === 'DEPOT';
    document.querySelector('#transactionEyebrow').textContent = isDeposit ? 'AJOUTER DES FONDS' : 'RETIRER DES FONDS';
    document.querySelector('#transactionTitle').textContent = isDeposit ? 'Faire un dépôt' : 'Faire un retrait';
    document.querySelector('#transactionDescription').textContent = isDeposit
      ? 'Ajoutez des fonds à votre portefeuille. Aucun code PIN n’est requis.'
      : 'Votre code PIN est requis pour confirmer le retrait.';
    document.querySelector('#transactionAmount').min = isDeposit ? '100' : '1';
    document.querySelector('#transactionAmount').value = '';
    const pinInput = document.querySelector('#transactionPin');
    pinInput.value = '';
    pinInput.required = !isDeposit;
    document.querySelector('#pinField').hidden = isDeposit;
    document.querySelector('#transactionSubmitLabel').textContent = isDeposit ? 'Confirmer le dépôt' : 'Confirmer le retrait';
    setFormError('#transactionError', '');
    elements.transactionDialog.showModal();
  });
});

document.querySelector('#transactionForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  setFormError('#transactionError', '');
  const form = new FormData(event.currentTarget);
  const amount = Number(form.get('montant'));
  const isDeposit = state.selectedTransaction === 'DEPOT';
  if (!Number.isInteger(amount) || amount < (isDeposit ? 100 : 1)) {
    setFormError('#transactionError', isDeposit ? 'Le dépôt minimum est de 100 FCFA.' : 'Saisissez un montant valide.');
    return;
  }
  if (!state.account?.numero) {
    setFormError('#transactionError', 'Le numéro de compte est introuvable. Actualisez votre portefeuille.');
    return;
  }
  const button = event.currentTarget.querySelector('[type="submit"]');
  setButtonBusy(button, true, 'Traitement…');
  try {
    const transaction = await request(
      `${api.bank}/api/comptes/${encodeURIComponent(state.account.numero)}/transactions`,
      {
        method: 'POST',
        body: JSON.stringify({
          type: state.selectedTransaction,
          montant: amount,
          ...(isDeposit ? {} : { pin: String(form.get('pin')) }),
        }),
      },
      true,
    );
    state.account.solde = transaction.nouveauSolde;
    state.transactions.push(transaction);
    renderProfile();
    renderTransactions();
    elements.transactionDialog.close();
    showToast(`${isDeposit ? 'Dépôt' : 'Retrait'} effectué. Nouveau solde : ${money(transaction.nouveauSolde)}.`);
  } catch (error) {
    setFormError('#transactionError', errorText(error));
  } finally {
    setButtonBusy(button, false);
  }
});

document.querySelector('#newOrderButton').addEventListener('click', () => {
  const now = new Date();
  const start = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  document.querySelector('#orderStart').value = start.toISOString().slice(0, 16);
  document.querySelector('#orderEnd').value = end.toISOString().slice(0, 16);
  document.querySelector('#orderPin').value = '';
  setFormError('#orderError', '');
  renderOrderServices();
  elements.orderDialog.showModal();
});

elements.orderDialog.addEventListener('close', () => { document.querySelector('#orderForm').reset(); });

document.querySelector('#orderForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  setFormError('#orderError', '');
  const form = new FormData(event.currentTarget);
  const serviceIds = form.getAll('serviceIds').map(Number).filter(Number.isInteger);
  const start = String(form.get('dateDebut'));
  const end = String(form.get('dateFin'));
  if (!serviceIds.length) {
    setFormError('#orderError', 'Sélectionnez au moins un service.');
    return;
  }
  if (new Date(end) < new Date(start)) {
    setFormError('#orderError', 'La date de fin doit être postérieure à la date de début.');
    return;
  }
  const button = event.currentTarget.querySelector('[type="submit"]');
  setButtonBusy(button, true, 'Envoi…');
  try {
    const payload = {
      datedebut: start,
      datefin: end,
      description: String(form.get('description')).trim(),
      prix: Number(form.get('prix')),
      telephone: state.telephone,
      serviceIds,
    };
    const pin = String(form.get('pin')).trim();
    if (pin) payload.pin = pin;
    const result = await request(`${api.service}/api/prestations`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    state.prestations.unshift(result);
    renderPrestations();
    elements.orderDialog.close();
    showToast(pin ? 'Demande créée et paiement effectué.' : 'Votre demande a bien été enregistrée.');
  } catch (error) {
    setFormError('#orderError', errorText(error));
  } finally {
    setButtonBusy(button, false);
  }
});

document.querySelector('#prestationList').addEventListener('click', (event) => {
  const button = event.target.closest('[data-pay-prestation]');
  if (!button) return;
  state.selectedPrestation = visiblePrestations().find(
    (prestation) => String(prestation.id) === button.dataset.payPrestation,
  );
  if (!state.selectedPrestation) {
    showToast('Cette demande n’est plus disponible. Actualisez la liste.', true);
    return;
  }
  document.querySelector('#paymentDescription').textContent =
    `${state.selectedPrestation.description || `Demande n° ${state.selectedPrestation.id}`} · ${money(state.selectedPrestation.prix)}`;
  document.querySelector('#paymentPin').value = '';
  setFormError('#paymentError', '');
  elements.paymentDialog.showModal();
});

document.querySelector('#paymentForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  setFormError('#paymentError', '');
  if (!state.selectedPrestation) {
    setFormError('#paymentError', 'La demande à régler est introuvable.');
    return;
  }
  const button = event.currentTarget.querySelector('[type="submit"]');
  setButtonBusy(button, true, 'Paiement…');
  try {
    const result = await request(
      `${api.service}/api/prestations/${encodeURIComponent(state.selectedPrestation.id)}/paiement`,
      {
        method: 'POST',
        body: JSON.stringify({ pin: String(new FormData(event.currentTarget).get('pin')) }),
      },
    );
    state.prestations = state.prestations.map((prestation) =>
      prestation.id === result.id ? result : prestation);
    renderPrestations();
    elements.paymentDialog.close();
    await loadAccount();
    showToast('Paiement effectué avec succès.');
  } catch (error) {
    setFormError('#paymentError', errorText(error));
  } finally {
    setButtonBusy(button, false);
  }
});

document.querySelectorAll('[data-close-dialog]').forEach((button) => {
  button.addEventListener('click', () => button.closest('dialog').close());
});

for (const dialog of [elements.transactionDialog, elements.orderDialog, elements.paymentDialog]) {
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
}

document.querySelector('#registerBirthDate').max = new Date().toISOString().slice(0, 10);

const savedSession = sessionStorage.getItem('nikitin-session');
if (savedSession) {
  try {
    const session = JSON.parse(savedSession);
    if (session?.token && session?.telephone) {
      state.token = session.token;
      state.telephone = session.telephone;
      enterWallet();
    } else {
      showAuth();
    }
  } catch {
    showAuth();
  }
}
