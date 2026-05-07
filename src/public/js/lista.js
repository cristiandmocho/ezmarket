const detail = document.querySelector('.lista-detail');
if (!detail) throw new Error('lista.js loaded outside lista page');

const listId = detail.dataset.listId;

// ── Rename modal ─────────────────────────────────────────────────────────────

const renameBtn    = document.getElementById('btn-rename');
const renameDialog = document.getElementById('rename-dialog');
const renameForm   = document.getElementById('rename-form');
const renameInput  = document.getElementById('rename-input');
const renameCancel = document.getElementById('rename-cancel');

if (renameBtn && renameDialog) {
  renameBtn.addEventListener('click', () => {
    renameInput.value = renameBtn.dataset.renameName || '';
    renameDialog.showModal();
    renameInput.select();
  });

  renameCancel.addEventListener('click', () => renameDialog.close());

  renameForm.addEventListener('submit', async e => {
    e.preventDefault();
    const name = renameInput.value.trim();
    if (!name) return;

    const saveBtn = document.getElementById('rename-save');
    saveBtn.disabled = true;

    try {
      const res = await fetch(`/api/listas/${listId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error('server error');

      document.querySelector('.nav__title').textContent = name;
      renameBtn.dataset.renameName = name;
      renameDialog.close();
    } catch {
      // silent — dialog stays open so user can retry
    } finally {
      saveBtn.disabled = false;
    }
  });
}

detail.addEventListener('click', async e => {
  const btn = e.target.closest('.lista-item__step');
  if (!btn) return;

  const item   = btn.closest('.lista-item');
  const qtyEl  = item.querySelector('.lista-item__qty');
  const itemId = item.dataset.itemId;

  let qty = parseInt(qtyEl.textContent, 10);
  qty += btn.classList.contains('lista-item__step--plus') ? 1 : -1;
  qty = Math.max(0, qty);

  qtyEl.textContent = qty;

  if (qty === 0) item.classList.add('lista-item--removing');

  try {
    await fetch(`/api/listas/${listId}/items/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity: qty }),
    });
  } catch {
    // Revert on network failure
    qty += btn.classList.contains('lista-item__step--plus') ? -1 : 1;
    qtyEl.textContent = qty;
    item.classList.remove('lista-item--removing');
    return;
  }

  if (qty === 0) setTimeout(() => item.remove(), 300);
});
