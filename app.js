const seedBooks = [
  { id: 'BK-001', title: 'Dog Man', author: 'Dav Pilkey', category: 'Fiction', status: 'available', added: '16 Sep 2026', cover: 'cover-green', year: 2016 },
  { id: 'BK-002', title: 'Diary of a Wimpy Kid', author: 'Jeff Kinney', category: 'Fiction', status: 'available', added: '16 Sep 2026', cover: 'cover-orange', year: 2007 },
  { id: 'BK-003', title: 'Harry Potter', author: 'J.K. Rowling', category: 'Fiction', status: 'available', added: '16 Sep 2026', cover: 'cover-blue', year: 1997 },
  { id: 'BK-004', title: 'Watch Your Whiskers, Stilton!', author: 'Elisabetta Dami', category: 'Fiction', status: 'available', added: '16 Sep 2026', cover: 'cover-purple', year: 2004 },
  { id: 'BK-005', title: 'Tom Gates', author: 'Liz Pichon', category: 'Fiction', status: 'available', added: '16 Sep 2026', cover: 'cover-orange', year: 2011 }
];

const activitySeed = [
  { type: 'borrow', icon: '↗', title: 'Maya Patel borrowed A Short History of Nearly Everything', meta: 'BK-002 · 15 Sep 2026', time: '9:42 am' },
  { type: 'return', icon: '↙', title: 'Noah Williams returned A Wrinkle in Time', meta: 'BK-004 · 15 Sep 2026', time: '9:17 am' },
  { type: 'add', icon: '+', title: 'The Secret Garden was added to the collection', meta: 'BK-001 · 12 Sep 2026', time: 'Yesterday' }
];

let books = JSON.parse(localStorage.getItem('podar-pearl-books') || 'null') || seedBooks;
let activities = JSON.parse(localStorage.getItem('podar-pearl-activities') || 'null') || activitySeed;
let loanHistory = JSON.parse(localStorage.getItem('podar-pearl-loan-history') || 'null') || [];
let currentFilter = 'all';
let scannerStream = null;
let scannerActive = false;
let pendingLoanBookId = null;
const accounts = { Shawn: 'Shawn@123', Danica: 'Danica@123' };
const legacyBorrowDates = { 'BK-002': '15 Sep 2026', 'BK-004': '12 Sep 2026', 'BK-006': '08 Sep 2026', 'BK-010': '06 Sep 2026' };
books = books.map(book => book.status === 'loaned' && !book.borrowed ? { ...book, borrowed: legacyBorrowDates[book.id] || '15 Sep 2026' } : book);
if (!loanHistory.length) loanHistory = books.filter(book => book.status === 'loaned' && book.borrower).map(book => ({ bookId: book.id, borrower: book.borrower, studentId: book.studentId, borrowed: book.borrowed, due: book.due, returned: false }));

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const save = () => { localStorage.setItem('podar-pearl-books', JSON.stringify(books)); localStorage.setItem('podar-pearl-activities', JSON.stringify(activities)); localStorage.setItem('podar-pearl-loan-history', JSON.stringify(loanHistory)); };
const titleCase = (value) => value.charAt(0).toUpperCase() + value.slice(1);
const showToast = (message) => { const toast = $('#toast'); toast.textContent = message; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2700); };
const getTomorrowLabel = () => { const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']; return `${tomorrow.getDate()} ${months[tomorrow.getMonth()]} ${tomorrow.getFullYear()}`; };
const dueTomorrow = () => books.filter(book => book.status === 'loaned' && book.due === getTomorrowLabel());

function updateStats() {
  const loaned = books.filter(book => book.status === 'loaned').length;
  $('#totalBooks').textContent = books.length;
  $('#availableBooks').textContent = books.length - loaned;
  $('#loanedBooks').textContent = loaned;
  $('#overdueBooks').textContent = Math.max(1, books.filter(book => book.status === 'overdue').length);
  $('#collectionNavCount').textContent = books.length;
  $('#allFilterCount').textContent = books.length;
  $('#activeLoanCount').textContent = `${loaned} active`;
  $('#alertCount').textContent = dueTomorrow().length;
}

function bookCell(book) { return `<div class="book-cell"><div class="book-cover ${book.cover}">${book.title.charAt(0)}</div><div><strong>${book.title}</strong><span>${book.author}</span></div></div>`; }
function statusCell(book) { return `<span class="status ${book.status}">${book.status === 'loaned' ? 'On loan' : book.status === 'overdue' ? 'Overdue' : 'Available'}</span>`; }
function bookRow(book, full = false) { return `<tr><td>${bookCell(book)}</td><td><span class="id-text">${book.id}</span></td><td><span class="category-text">${book.category}</span></td><td>${statusCell(book)}</td>${full ? `<td>${book.borrower ? `<span class="category-text">${book.borrower}</span>` : '<span class="category-text">—</span>'}</td>` : ''}<td><span class="category-text">${book.added}</span></td><td><button class="row-menu" data-lookup="${book.id}" aria-label="Open ${book.title}">•••</button></td></tr>`; }

function renderOverview() {
  updateStats();
  $('#activityList').innerHTML = activities.slice(0, 4).map(item => `<div class="activity-row"><div class="activity-dot ${item.type}">${item.icon}</div><div class="activity-copy"><strong>${item.title}</strong><span>${item.meta}</span></div><span class="activity-time">${item.time}</span></div>`).join('');
  const due = books.filter(book => book.status === 'loaned').slice(0, 3);
  $('#dueList').innerHTML = due.length ? due.map(book => `<div class="due-row"><div class="due-date"><strong>${book.due ? book.due.split(' ')[0] : '—'}</strong><span>${book.due ? book.due.split(' ')[1].slice(0, 3) : 'soon'}</span></div><div class="due-copy"><strong>${book.title}</strong><span>${book.borrower} · ${book.id}</span></div><span class="due-tag">${book.due === '16 Sep 2026' ? 'Tomorrow' : 'This week'}</span></div>`).join('') : '<p class="empty-state">No active loans at the moment.</p>';
  $('#collectionTable').innerHTML = books.slice(0, 5).map(book => bookRow(book)).join('');
}

function renderCollection() {
  const query = ($('#collectionSearch')?.value || '').toLowerCase();
  let visible = books.filter(book => `${book.title} ${book.author} ${book.id}`.toLowerCase().includes(query));
  if (currentFilter !== 'all') visible = visible.filter(book => currentFilter === 'available' ? book.status === 'available' : book.status === 'loaned');
  $('#fullCollectionTable').innerHTML = visible.map(book => bookRow(book, true)).join('') || '<tr><td colspan="7" class="empty-state">No books match that search.</td></tr>';
}

function renderLoans() {
  const loans = books.filter(book => book.status === 'loaned');
  $('#activeLoansList').innerHTML = loans.map(book => `<div class="loan-row"><div class="book-cover ${book.cover}">${book.title.charAt(0)}</div><div class="loan-copy"><strong>${book.title}</strong><span>${book.borrower} · Due ${book.due || 'soon'}</span></div><button class="return-button" data-return="${book.id}">Mark returned</button></div>`).join('') || '<p class="empty-state">No active loans.</p>';
}

function makeQr(element, book) {
  element.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&margin=4&data=${encodeURIComponent(`oakwell-library/book/${book.id}`)}" alt="QR code for ${book.id}">`;
  const image = element.querySelector('img');
  image.addEventListener('error', () => { element.textContent = book.id; });
}
function renderLabels() {
  $('#labelsGrid').innerHTML = books.slice(0, 8).map(book => `<div class="label-card"><div class="qr-code" data-qr="${book.id}"></div><strong>${book.title}</strong><span>${book.id}</span><div class="label-actions"><button data-print="${book.id}">Print label</button><button data-lookup="${book.id}">Open record</button></div></div>`).join('');
  books.slice(0, 8).forEach(book => makeQr($(`[data-qr="${book.id}"]`), book));
}
function renderStudents() {
  const borrowers = books.filter(book => book.borrower);
  const grouped = borrowers.reduce((map, book) => { map[book.studentId] ||= { name: book.borrower, books: [] }; map[book.studentId].books.push(book); return map; }, {});
  $('#studentsGrid').innerHTML = Object.entries(grouped).map(([id, student]) => `<article class="student-card"><div class="student-card-head"><div class="student-avatar">${student.name.split(' ').map(word => word[0]).join('')}</div><div><strong>${student.name}</strong><span>${id}</span></div></div><div class="student-card-foot"><span>Books on loan</span><b>${student.books.length}</b></div></article>`).join('') || '<p class="empty-state">No students have active loans.</p>';
}

function stopScanner() {
  scannerActive = false;
  if (scannerStream) scannerStream.getTracks().forEach(track => track.stop());
  scannerStream = null;
  $('#scannerVideo').srcObject = null;
}

function closeScanner() {
  stopScanner();
  $('#scannerModal').classList.add('hidden');
}

function handleScanValue(value) {
  const match = value.match(/BK-\d{3}/i);
  if (!match) return false;
  const bookId = match[0].toUpperCase();
  closeScanner();
  $('#lookupInput').value = bookId;
  showLookup(bookId);
  showToast(`Scanned ${bookId}.`);
  return true;
}

async function startScanner() {
  $('#scannerModal').classList.remove('hidden');
  $('#scannerLoading').classList.remove('hidden');
  $('#scannerStatus').classList.remove('error');
  $('#scannerStatus').textContent = 'The camera will only be used to read a book ID.';
  if (!navigator.mediaDevices?.getUserMedia) {
    $('#scannerLoading').textContent = 'Camera access is not available here.';
    $('#scannerStatus').textContent = 'Use a secure site (HTTPS or localhost) to enable camera scanning, or enter a Book ID instead.';
    $('#scannerStatus').classList.add('error');
    return;
  }
  if (!('BarcodeDetector' in window)) {
    $('#scannerLoading').textContent = 'QR detection is not supported in this browser.';
    $('#scannerStatus').textContent = 'Try the latest Chrome or Edge, or enter a Book ID instead.';
    $('#scannerStatus').classList.add('error');
    return;
  }
  try {
    scannerStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
    const video = $('#scannerVideo');
    video.srcObject = scannerStream;
    await video.play();
    $('#scannerLoading').classList.add('hidden');
    scannerActive = true;
    const detector = new BarcodeDetector({ formats: ['qr_code'] });
    const scanFrame = async () => {
      if (!scannerActive) return;
      try {
        const codes = await detector.detect(video);
        if (codes[0]?.rawValue && handleScanValue(codes[0].rawValue)) return;
      } catch (error) {
        $('#scannerStatus').textContent = 'Keep the QR label steady inside the frame.';
      }
      requestAnimationFrame(scanFrame);
    };
    requestAnimationFrame(scanFrame);
  } catch (error) {
    $('#scannerLoading').textContent = 'Camera access was not granted.';
    $('#scannerStatus').textContent = 'Allow camera permission in the browser, or enter a Book ID instead.';
    $('#scannerStatus').classList.add('error');
  }
}

function renderAudit() {
  const activeLoans = books.filter(book => book.status === 'loaned' && book.borrower);
  $('#auditLoanCount').textContent = `${activeLoans.length} active loans`;
  $('#auditTable').innerHTML = loanHistory.slice().reverse().map(entry => {
    const book = books.find(item => item.id === entry.bookId);
    if (!book) return '';
    const returned = entry.returned;
    return `<tr><td><strong>${entry.borrower}</strong></td><td><span class="id-text">${entry.studentId || '—'}</span></td><td>${bookCell(book)}</td><td><span class="category-text">${entry.borrowed || '—'}</span></td><td><span class="category-text">${returned ? `Returned ${entry.returnedOn || '—'}` : entry.due || '—'}</span></td><td>${returned ? '<span class="status returned">Returned</span>' : statusCell(book)}</td><td>${returned ? '' : `<button class="return-button" data-return="${book.id}">Return</button>`}</td></tr>`;
  }).join('') || '<tr><td colspan="7" class="empty-state">No loan history yet.</td></tr>';
}

function navigate(viewName) {
  $$('.nav-item').forEach(button => button.classList.toggle('active', button.dataset.view === viewName));
  $$('.view').forEach(view => view.classList.toggle('active', view.id === `${viewName}View`));
  $('#breadcrumbCurrent').textContent = titleCase(viewName);
  if (viewName === 'overview') renderOverview();
  if (viewName === 'collection') renderCollection();
  if (viewName === 'circulation') renderLoans();
  if (viewName === 'labels') renderLabels();
  if (viewName === 'audit') renderAudit();
  if (viewName === 'students') renderStudents();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openModal() { $('#bookModal').classList.remove('hidden'); setTimeout(() => $('[name="title"]').focus(), 50); }
function closeModal() { $('#bookModal').classList.add('hidden'); $('#bookForm').reset(); }
function showLookup(bookId) {
  const book = books.find(item => item.id.toLowerCase() === bookId.toLowerCase());
  const result = $('#lookupResult');
  result.classList.remove('hidden');
  if (!book) { result.innerHTML = '<strong>Book not found</strong><p class="category-text">Check the ID and try again.</p>'; return; }
  result.innerHTML = `<strong>${book.title}</strong><p class="category-text">${book.author} · ${book.id}</p><p>${book.status === 'available' ? '<span class="status available">Available in library</span> <button class="return-button" data-lend="' + book.id + '">Lend this book</button>' : '<span class="status loaned">With ' + book.borrower + '</span> <button class="return-button" data-return="' + book.id + '">Mark returned</button>'}</p>`;
}
function lendBook(bookId) {
  const book = books.find(item => item.id === bookId); if (!book) return;
  pendingLoanBookId = bookId;
  $('#loanBookTitle').textContent = book.title;
  $('#loanForm').reset();
  $('#loanBorrowed').value = getTomorrowLabel();
  $('#loanDue').value = '29 Sep 2026';
  $('#loanModal').classList.remove('hidden');
  $('#loanBorrower').focus();
}
function closeLoanModal() {
  pendingLoanBookId = null;
  $('#loanModal').classList.add('hidden');
  $('#loanForm').reset();
}
function completeLoan(data) {
  const book = books.find(item => item.id === pendingLoanBookId); if (!book) return;
  const { borrower, studentId, borrowed, returnDate } = data;
  book.status = 'loaned'; book.borrower = borrower; book.studentId = studentId; book.borrowed = borrowed; book.due = returnDate;
  loanHistory.push({ bookId: book.id, borrower, studentId, borrowed, due: returnDate, returned: false });
  activities.unshift({ type: 'borrow', icon: '↗', title: `${borrower} borrowed ${book.title}`, meta: `${book.id} · ${borrowed}`, time: 'Just now' }); save(); closeLoanModal(); renderOverview(); renderLoans(); renderAudit(); showLookup(book.id); showToast(`${book.title} is now on loan to ${borrower}.`);
}
function returnBook(bookId) { const book = books.find(item => item.id === bookId); if (!book) return; const borrower = book.borrower; const historyEntry = [...loanHistory].reverse().find(entry => entry.bookId === bookId && !entry.returned); if (historyEntry) { historyEntry.returned = true; historyEntry.returnedOn = '16 Sep 2026'; } book.status = 'available'; delete book.borrower; delete book.studentId; delete book.borrowed; delete book.due; activities.unshift({ type: 'return', icon: '↙', title: `${borrower || 'A student'} returned ${book.title}`, meta: `${book.id} · Today`, time: 'Just now' }); save(); renderOverview(); renderLoans(); renderCollection(); renderAudit(); showLookup(bookId); showToast(`${book.title} is back in the library.`); }

$$('.nav-item').forEach(button => button.addEventListener('click', () => navigate(button.dataset.view)));
$$('[data-view-link]').forEach(button => button.addEventListener('click', () => navigate(button.dataset.viewLink)));
$('#addBookButton').addEventListener('click', openModal); $('#collectionAddButton').addEventListener('click', openModal); $('#labelsAddButton').addEventListener('click', openModal);
$('#closeModal').addEventListener('click', closeModal); $('#cancelModal').addEventListener('click', closeModal); $('#bookModal').addEventListener('click', event => { if (event.target === $('#bookModal')) closeModal(); });
$('#bookForm').addEventListener('submit', event => { event.preventDefault(); const data = new FormData(event.target); const number = Math.max(...books.map(book => Number(book.id.slice(3))), 0) + 1; const book = { id: `BK-${String(number).padStart(3, '0')}`, title: data.get('title'), author: data.get('author'), category: data.get('category'), year: data.get('year'), status: 'available', added: '15 Sep 2026', cover: ['cover-green', 'cover-blue', 'cover-orange', 'cover-purple'][number % 4] }; books.unshift(book); activities.unshift({ type: 'add', icon: '+', title: `${book.title} was added to the collection`, meta: `${book.id} · Today`, time: 'Just now' }); save(); closeModal(); renderOverview(); showToast(`${book.title} was added. QR label ready to print.`); navigate('labels'); });
$('#closeLoanModal').addEventListener('click', closeLoanModal); $('#cancelLoan').addEventListener('click', closeLoanModal); $('#loanModal').addEventListener('click', event => { if (event.target === $('#loanModal')) closeLoanModal(); });
$('#loanForm').addEventListener('submit', event => { event.preventDefault(); const formData = new FormData(event.target); completeLoan({ borrower: formData.get('borrower').trim(), studentId: formData.get('studentId').trim(), borrowed: formData.get('borrowed').trim(), returnDate: formData.get('returnDate').trim() }); });
$('#collectionSearch').addEventListener('input', renderCollection); $$('.filter-pill').forEach(button => button.addEventListener('click', () => { currentFilter = button.dataset.filter; $$('.filter-pill').forEach(item => item.classList.toggle('active', item === button)); renderCollection(); }));
$('#lookupButton').addEventListener('click', () => showLookup($('#lookupInput').value.trim())); $('#lookupInput').addEventListener('keydown', event => { if (event.key === 'Enter') showLookup(event.target.value.trim()); });
$('#circulationScanButton').addEventListener('click', startScanner);
$('#closeScanner').addEventListener('click', closeScanner);
$('#useManualLookup').addEventListener('click', () => { closeScanner(); $('#lookupInput').focus(); });
$('#scannerModal').addEventListener('click', event => { if (event.target === $('#scannerModal')) closeScanner(); });
$('#printLabelsButton').addEventListener('click', () => { window.print(); });
$('.dismiss-alert').addEventListener('click', () => $('#alertStrip').remove());
$('#notificationButton').addEventListener('click', () => showToast(`${dueTomorrow().length} ${dueTomorrow().length === 1 ? 'book is' : 'books are'} due tomorrow.`));
$('#searchToggle').addEventListener('click', () => { navigate('collection'); $('#collectionSearch').focus(); });
$('.mobile-menu').addEventListener('click', () => $('.sidebar').classList.toggle('open'));
document.addEventListener('click', event => { const lookup = event.target.closest('[data-lookup]'); if (lookup) { navigate('circulation'); $('#lookupInput').value = lookup.dataset.lookup; showLookup(lookup.dataset.lookup); } const returnButton = event.target.closest('[data-return]'); if (returnButton) returnBook(returnButton.dataset.return); const lendButton = event.target.closest('[data-lend]'); if (lendButton) lendBook(lendButton.dataset.lend); const printButton = event.target.closest('[data-print]'); if (printButton) { navigate('labels'); showToast('Print dialog opened for this label.'); window.print(); } });

$('#loginForm').addEventListener('submit', event => { event.preventDefault(); const data = new FormData(event.target); if (accounts[data.get('username')] === data.get('password')) { sessionStorage.setItem('oakwell-user', data.get('username')); $('#loginScreen').classList.add('hidden'); $('#appUserName').textContent = data.get('username'); $('#greetingName').textContent = data.get('username'); } else $('#loginError').classList.add('visible'); });
if (sessionStorage.getItem('oakwell-user')) { $('#loginScreen').classList.add('hidden'); }
renderOverview();
