const searchInput = document.querySelector('#searchInput');
const projectRows = [...document.querySelectorAll('#projectTable tr')];
const projectFilter = document.querySelector('#projectFilter');
const projectModal = document.querySelector('#projectModal');
const projectName = document.querySelector('#projectName');
const loginScreen = document.querySelector('#loginScreen');
const loginForm = document.querySelector('#loginForm');
const loginError = document.querySelector('#loginError');
const loginUsername = document.querySelector('#loginUsername');
const loginPassword = document.querySelector('#loginPassword');

const teamAccess = {
  'alex.morgan': 'orbit-42',
  'sam.okafor': 'neon-82',
  'jamie.lee': 'vector-64',
  'riley.kim': 'signal-57',
  'taylor.nguyen': 'pulse-36'
};

function unlockWorkspace() {
  loginScreen.classList.add('is-hidden');
  document.body.classList.remove('is-locked');
}

if (sessionStorage.getItem('northstar-authenticated') === 'true') unlockWorkspace();

loginForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const username = loginUsername.value.trim().toLowerCase();
  const isValid = teamAccess[username] === loginPassword.value;
  if (!isValid) {
    loginError.textContent = 'Access denied. Check your team credentials.';
    loginForm.classList.remove('shake');
    requestAnimationFrame(() => loginForm.classList.add('shake'));
    return;
  }
  sessionStorage.setItem('northstar-authenticated', 'true');
  loginError.textContent = '';
  unlockWorkspace();
});

document.querySelector('#togglePassword').addEventListener('click', (event) => {
  const button = event.currentTarget;
  const isPassword = loginPassword.type === 'password';
  loginPassword.type = isPassword ? 'text' : 'password';
  button.textContent = isPassword ? '◌' : '◉';
  button.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
});

document.querySelector('#logoutButton').addEventListener('click', () => {
  sessionStorage.removeItem('northstar-authenticated');
  loginScreen.classList.remove('is-hidden');
  document.body.classList.add('is-locked');
  loginForm.reset();
  loginUsername.focus();
});

function filterProjects() {
  const query = searchInput.value.trim().toLowerCase();
  const status = projectFilter.value;
  projectRows.forEach((row) => {
    const matchesText = row.textContent.toLowerCase().includes(query);
    const matchesStatus = status === 'all' || row.dataset.status === status;
    row.hidden = !(matchesText && matchesStatus);
  });
}

searchInput.addEventListener('input', filterProjects);
projectFilter.addEventListener('change', filterProjects);

document.querySelectorAll('.task-row input').forEach((checkbox) => {
  checkbox.addEventListener('change', () => {
    const remaining = document.querySelectorAll('.task-row input:not(:checked)').length;
    const taskSubtitle = document.querySelector('.task-heading p');
    taskSubtitle.textContent = `${remaining} task${remaining === 1 ? '' : 's'} need your attention`;
  });
});

document.querySelectorAll('.nav-item').forEach((item) => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach((navItem) => navItem.classList.remove('active'));
    item.classList.add('active');
    document.querySelector('#pageTitle').textContent = item.dataset.view;
    document.querySelector('.sidebar').classList.remove('open');
  });
});

document.querySelector('.mobile-menu').addEventListener('click', () => {
  document.querySelector('.sidebar').classList.toggle('open');
});

document.querySelector('#newProjectBtn').addEventListener('click', () => {
  projectModal.hidden = false;
  projectName.focus();
});

document.querySelector('#modalClose').addEventListener('click', () => {
  projectModal.hidden = true;
});

projectModal.addEventListener('click', (event) => {
  if (event.target === projectModal) projectModal.hidden = true;
});

document.querySelector('#projectForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const newRow = document.createElement('tr');
  newRow.dataset.status = 'on-track';
  newRow.innerHTML = `<td><span class="project-dot blue"></span><strong>${projectName.value}</strong></td><td><span class="avatar avatar-green small-avatar">AM</span> Alex Morgan</td><td><span class="table-progress"><i><b style="width:0%"></b></i>0%</span></td><td>Not set</td><td><span class="status-pill on-track">On track</span></td><td><button class="row-more" aria-label="More options">•••</button></td>`;
  document.querySelector('#projectTable').prepend(newRow);
  projectRows.push(newRow);
  projectModal.hidden = true;
  document.querySelector('#projectForm').reset();
  searchInput.value = '';
  projectFilter.value = 'all';
});
