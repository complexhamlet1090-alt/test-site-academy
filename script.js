(() => {
  'use strict';

  const header = document.querySelector('[data-header]');
  const menuButton = document.querySelector('.menu-toggle');
  const navigation = document.querySelector('#site-nav');
  const desktopQuery = window.matchMedia('(min-width: 601px)');

  const setMenu = (open) => {
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    navigation.classList.toggle('is-open', open);
    document.body.classList.toggle('menu-open', open);
  };

  menuButton.addEventListener('click', () => {
    setMenu(menuButton.getAttribute('aria-expanded') !== 'true');
  });

  navigation.addEventListener('click', (event) => {
    if (event.target.closest('a')) setMenu(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
      setMenu(false);
      menuButton.focus();
    }
  });

  desktopQuery.addEventListener('change', (event) => {
    if (event.matches) setMenu(false);
  });

  const updateHeader = () => header.classList.toggle('is-sticky', window.scrollY > 120);
  window.addEventListener('scroll', updateHeader, { passive: true });
  updateHeader();

  const foundClues = new Set();
  const countOutput = document.querySelector('#clue-count');
  const result = document.querySelector('#practice-result');
  const resetButton = document.querySelector('#reset-practice');

  function selectClue(name) {
    const hotspot = document.querySelector(`.scam-hotspot[data-clue="${name}"]`);
    const item = document.querySelector(`[data-explanation="${name}"]`);
    const button = item.querySelector('button');
    const willOpen = !item.classList.contains('is-active');

    document.querySelectorAll('.clue-item').forEach((entry) => {
      entry.classList.remove('is-active');
      entry.querySelector('button').setAttribute('aria-expanded', 'false');
    });
    document.querySelectorAll('.scam-hotspot').forEach((entry) => entry.classList.remove('is-active'));

    if (willOpen) {
      item.classList.add('is-active');
      hotspot.classList.add('is-active');
      button.setAttribute('aria-expanded', 'true');
    }

    if (!foundClues.has(name)) {
      foundClues.add(name);
      item.classList.add('is-found');
      hotspot.classList.add('is-found');
      hotspot.setAttribute('aria-pressed', 'true');
      countOutput.value = String(foundClues.size);
    }

    if (foundClues.size === 3) {
      result.hidden = false;
      resetButton.hidden = false;
    }
  }

  document.querySelectorAll('[data-clue]').forEach((button) => {
    button.addEventListener('click', () => selectClue(button.dataset.clue));
  });
  document.querySelectorAll('[data-select-clue]').forEach((button) => {
    button.addEventListener('click', () => selectClue(button.dataset.selectClue));
  });

  resetButton.addEventListener('click', () => {
    foundClues.clear();
    countOutput.value = '0';
    result.hidden = true;
    resetButton.hidden = true;
    document.querySelectorAll('.clue-item').forEach((item) => {
      item.classList.remove('is-active', 'is-found');
      item.querySelector('button').setAttribute('aria-expanded', 'false');
    });
    document.querySelectorAll('.scam-hotspot').forEach((button) => {
      button.classList.remove('is-active', 'is-found');
      button.setAttribute('aria-pressed', 'false');
    });
    document.querySelector('.scam-hotspot').focus();
  });

  const form = document.querySelector('#signup-form');
  const success = document.querySelector('#form-success');
  const nameInput = document.querySelector('#name');
  const contactInput = document.querySelector('#contact');
  const consentInput = document.querySelector('#consent');

  function setError(input, errorId, message) {
    document.getElementById(errorId).textContent = message;
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
  }

  function validContact(value) {
    const contact = value.trim();
    const email = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    const phoneDigits = contact.replace(/\D/g, '');
    const phone = /^[+\d][\d\s()+-]{9,24}$/;
    return email.test(contact) || (phone.test(contact) && phoneDigits.length >= 10 && phoneDigits.length <= 15);
  }

  nameInput.addEventListener('input', () => {
    if (nameInput.value.trim().length >= 2) setError(nameInput, 'name-error', '');
  });
  contactInput.addEventListener('input', () => {
    if (validContact(contactInput.value)) setError(contactInput, 'contact-error', '');
  });
  consentInput.addEventListener('change', () => {
    if (consentInput.checked) setError(consentInput, 'consent-error', '');
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const nameValid = nameInput.value.trim().length >= 2;
    const contactValid = validContact(contactInput.value);
    const consentValid = consentInput.checked;

    setError(nameInput, 'name-error', nameValid ? '' : 'Введите имя — не менее двух букв.');
    setError(contactInput, 'contact-error', contactValid ? '' : 'Введите телефон или адрес электронной почты.');
    setError(consentInput, 'consent-error', consentValid ? '' : 'Подтвердите согласие, чтобы продолжить.');

    if (!nameValid || !contactValid || !consentValid) {
      const firstInvalid = !nameValid ? nameInput : !contactValid ? contactInput : consentInput;
      firstInvalid.focus();
      return;
    }

    form.hidden = true;
    success.hidden = false;
    success.focus();
    form.reset();
    [nameInput, contactInput, consentInput].forEach((input) => input.removeAttribute('aria-invalid'));
  });

  document.querySelector('#form-reset').addEventListener('click', () => {
    success.hidden = true;
    form.hidden = false;
    nameInput.focus();
  });

  document.querySelector('#current-year').textContent = String(new Date().getFullYear());
})();
