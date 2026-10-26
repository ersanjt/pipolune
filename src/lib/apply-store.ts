import { getSession } from './session';

/** Replace the baked shop address with the copy saved in Studio, when the API has one. */
export function watchStore(): void {
  getSession()
    .then((session) => {
      const store = session.settings.store;
      if (!store) return;
      const fields: Record<string, string> = {
        tradeName: store.tradeName,
        legalName: store.legalName,
        address: store.address,
        taxNumber: store.taxNumber,
        mersis: store.mersis,
        phone: store.phone,
        email: store.email,
      };
      document.querySelectorAll<HTMLElement>('[data-store-field]').forEach((el) => {
        const key = el.dataset.storeField ?? '';
        if (key === 'maps') {
          if (el instanceof HTMLAnchorElement && store.mapsUrl) el.href = store.mapsUrl;
          return;
        }
        const value = fields[key];
        if (value === undefined) return;
        el.textContent = key === 'address' && el.dataset.storeFormat === 'lines' ? store.lines.join('\n') : value;
        if (el instanceof HTMLAnchorElement) {
          if (key === 'phone' && store.phoneTel) el.href = `tel:${store.phoneTel}`;
          if (key === 'email' && store.email) el.href = `mailto:${store.email}`;
        }
        const wrap = el.closest('[data-store-wrap]');
        const label = wrap?.previousElementSibling;
        const show = value.trim() !== '';
        if (wrap instanceof HTMLElement) wrap.hidden = !show;
        if (label instanceof HTMLElement && label.dataset.storeLabel === key) label.hidden = !show;
      });
      const pending = document.querySelector<HTMLElement>('[data-store-pending]');
      if (!pending) return;
      const template = pending.dataset.template ?? '';
      const missing = ['legalName', 'address', 'taxNumber', 'mersis', 'phone']
        .filter((key) => !(fields[key] ?? '').trim())
        .map((key) => document.querySelector(`[data-store-label="${key}"]`)?.textContent?.trim() ?? '')
        .filter(Boolean);
      pending.hidden = missing.length === 0 || template === '';
      if (!pending.hidden) pending.textContent = template.replace('{items}', missing.join(', '));
    })
    .catch(() => {});
}
