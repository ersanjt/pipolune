import { useState } from 'preact/hooks';
import { api, ApiError } from '../../lib/api';
import { can, dateTime, ErrorNote, Loading, PageHead, Panel, STAFF_ROLES, useApi, type Ctx } from '../shared';
import { useSettings } from './Content';
import { currencies, currencySymbol, type Currency } from '../../lib/currency';
import { store as fallbackStore } from '../../lib/store';

export function PublishButton({ ctx }: { ctx: Ctx }) {
  const { t } = ctx;
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'missing' | 'error'>('idle');
  if (!can(ctx.me, 'publish')) return null;
  const note = { done: t.published, missing: t.publishMissing, error: t.error }[state as 'done' | 'missing' | 'error'];
  return (
    <span class="s-publish">
      <button
        type="button"
        class="s-btn s-btn--ghost"
        disabled={state === 'busy'}
        onClick={async () => {
          setState('busy');
          try {
            await api('/studio/publish', { method: 'POST' });
            setState('done');
          } catch (err) {
            setState(err instanceof ApiError && err.code === 'publish_not_configured' ? 'missing' : 'error');
          }
        }}
      >
        ✦ {state === 'busy' ? t.publishing : t.publish}
      </button>
      {note && <span class={state === 'done' ? 's-success' : 's-error'}>{note}</span>}
    </span>
  );
}

interface StaffMember {
  id: number;
  email: string;
  name: string;
  role: string;
  primary?: boolean;
  active: boolean;
  lastLoginAt: string | null;
}

export default function Settings({ ctx }: { ctx: Ctx }) {
  const { t } = ctx;
  const owner = can(ctx.me, 'settings.sales');
  const { data, error, patch, message } = useSettings(ctx);
  const [shipping, setShipping] = useState<Partial<Record<Currency, string>>>({});
  if (error) return <ErrorNote ctx={ctx} />;
  if (!data) return <Loading ctx={ctx} />;
  const s = data.settings;
  const shippingValue = (c: Currency) => shipping[c] ?? (s.shipping_standard?.[c] == null ? '' : String(s.shipping_standard[c]! / 100));

  return (
    <>
      <PageHead title={t.nav.settings}>
        <PublishButton ctx={ctx} />
      </PageHead>
      {message && <p class={message.ok ? 's-success' : 's-error'}>{message.text}</p>}

      <div class="s-grid s-grid--2">
        <Panel title={t.salesMode}>
          {!owner && <p class="s-muted">{t.ownerOnly}</p>}
          <fieldset class="s-choices s-fieldset" disabled={!owner}>
            {(['off', 'request', 'live'] as const).map((mode) => (
              <label class="s-choice">
                <input type="radio" name="sales_mode" checked={s.sales_mode === mode} disabled={mode === 'live' && !data.paymentProvider} onChange={() => patch({ sales_mode: mode })} />
                <span>
                  <strong>{t.salesModes[mode]}</strong>
                  <span class="s-muted">{t.salesModeHelp[mode]}</span>
                </span>
              </label>
            ))}
          </fieldset>
        </Panel>

        <Panel title={t.shipping}>
          <form
            class="s-stack"
            onSubmit={(e) => {
              e.preventDefault();
              const next = Object.fromEntries(currencies.map((c) => [c, shippingValue(c) === '' ? null : Math.round(Number(shippingValue(c)) * 100)]));
              patch({ shipping_standard: next as Record<Currency, number | null> });
              setShipping({});
            }}
          >
            <fieldset class="s-stack s-fieldset" disabled={!owner}>
              {currencies.map((c) => (
                <label>
                  {currencySymbol[c]} {c}
                  <input type="number" min="0" step="0.01" value={shippingValue(c)} onInput={(e) => setShipping({ ...shipping, [c]: e.currentTarget.value })} />
                </label>
              ))}
              <p class="s-muted">{t.shippingHelp}</p>
              <button class="s-btn" type="submit">
                {t.save}
              </button>
            </fieldset>
          </form>
        </Panel>
      </div>

      {can(ctx.me, 'settings.content') && <StorePanel ctx={ctx} saved={s.store} patch={patch} />}

      {can(ctx.me, 'staff') && <StaffPanel ctx={ctx} />}
    </>
  );
}

function StorePanel({
  ctx,
  saved,
  patch,
}: {
  ctx: Ctx;
  saved: SettingsResponseStore | undefined;
  patch: (values: { store: StoreForm }) => Promise<void> | void;
}) {
  const { t } = ctx;
  const initial = {
    tradeName: saved?.tradeName ?? fallbackStore.tradeName,
    legalName: saved?.legalName ?? '',
    phone: saved?.phone ?? fallbackStore.phone,
    email: saved?.email ?? fallbackStore.email,
    line1: saved?.line1 ?? fallbackStore.line1,
    line2: saved?.line2 ?? fallbackStore.line2,
    postalCode: saved?.postalCode ?? fallbackStore.postalCode,
    district: saved?.district ?? fallbackStore.district,
    city: saved?.city ?? fallbackStore.city,
    country: saved?.country ?? fallbackStore.country,
    taxNumber: saved?.taxNumber ?? '',
    mersis: saved?.mersis ?? '',
  };
  const [form, setForm] = useState(initial);
  const set = (key: keyof StoreForm, value: string) => setForm({ ...form, [key]: value });
  const fields: { key: keyof StoreForm; label: string; type?: string }[] = [
    { key: 'tradeName', label: t.storeTrade },
    { key: 'legalName', label: t.storeLegal },
    { key: 'phone', label: t.storePhone, type: 'tel' },
    { key: 'email', label: t.storeEmail, type: 'email' },
    { key: 'line1', label: t.storeLine1 },
    { key: 'line2', label: t.storeLine2 },
    { key: 'postalCode', label: t.storePostal },
    { key: 'district', label: t.storeDistrict },
    { key: 'city', label: t.storeCity },
    { key: 'country', label: t.storeCountry },
    { key: 'taxNumber', label: t.storeTax },
    { key: 'mersis', label: t.storeMersis },
  ];

  return (
    <Panel title={t.storeProfile}>
      <form
        class="s-stack"
        onSubmit={(e) => {
          e.preventDefault();
          patch({ store: form });
        }}
      >
        <div class="s-grid s-grid--2">
          {fields.map((field) => (
            <label>
              {field.label}
              <input
                type={field.type ?? 'text'}
                maxLength={190}
                value={form[field.key]}
                required={field.key === 'tradeName'}
                onInput={(e) => set(field.key, e.currentTarget.value)}
              />
            </label>
          ))}
        </div>
        <p class="s-muted">{t.storeHelp}</p>
        <button class="s-btn" type="submit">
          {t.save}
        </button>
      </form>
    </Panel>
  );
}

type StoreForm = {
  tradeName: string;
  legalName: string;
  phone: string;
  email: string;
  line1: string;
  line2: string;
  postalCode: string;
  district: string;
  city: string;
  country: string;
  taxNumber: string;
  mersis: string;
};
type SettingsResponseStore = StoreForm;

function StaffPanel({ ctx }: { ctx: Ctx }) {
  const { t, lang } = ctx;
  const { data, setData, error } = useApi<{ staff: StaffMember[] }>('/studio/staff');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('editor');
  const [inviteLang, setInviteLang] = useState<string>(lang);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<{ staff: StaffMember[] }>, ok: string) {
    setMessage(null);
    setBusy(true);
    try {
      setData(await fn());
      setMessage({ ok: true, text: ok });
    } catch (err) {
      setMessage({ ok: false, text: err instanceof ApiError && err.message ? err.message : t.error });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel title={t.staff}>
      {error ? (
        <ErrorNote ctx={ctx} />
      ) : !data ? (
        <Loading ctx={ctx} />
      ) : (
        <table class="s-table">
          <thead>
            <tr>
              <th>{t.email}</th>
              <th>{t.role}</th>
              <th>{t.lastLogin}</th>
            </tr>
          </thead>
          <tbody>
            {data.staff.map((m) => (
              <tr>
                <td>
                  {m.name || m.email}
                  {m.name && <div class="s-muted">{m.email}</div>}
                  {m.primary && <div class="s-muted">✦ {t.primaryOwner}</div>}
                </td>
                <td>
                  <select
                    value={m.role}
                    disabled={busy || m.id === ctx.me.id || m.primary}
                    aria-label={t.role}
                    onChange={(e) => run(() => api(`/studio/staff/${m.id}`, { method: 'PATCH', body: { role: e.currentTarget.value } }), t.saved)}
                  >
                    {Object.entries(t.roles).map(([k, v]) => (
                      <option value={k}>
                        {v}
                        {t.roleHelp[k] ? ` — ${t.roleHelp[k]}` : ''}
                      </option>
                    ))}
                  </select>
                </td>
                <td>{m.active ? dateTime(m.lastLoginAt, lang) : <span class="s-muted">{t.pendingInvite}</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <form
        class="s-invite"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => api('/studio/staff', { method: 'POST', body: { email, role, locale: inviteLang } }), t.pendingInvite).then(() => setEmail(''));
        }}
      >
        <input type="email" required placeholder={t.email} value={email} onInput={(e) => setEmail(e.currentTarget.value)} aria-label={t.email} />
        <select value={role} onChange={(e) => setRole(e.currentTarget.value)} aria-label={t.role}>
          {STAFF_ROLES.map((r) => (
            <option value={r}>{t.roles[r]}</option>
          ))}
        </select>
        <select value={inviteLang} onChange={(e) => setInviteLang(e.currentTarget.value)} aria-label="Language">
          {['en', 'tr', 'ru'].map((l) => (
            <option value={l}>{l.toUpperCase()}</option>
          ))}
        </select>
        <button class="s-btn" type="submit" disabled={busy}>
          {t.invite}
        </button>
      </form>
      <p class="s-muted">{t.inviteHelp}</p>
      {message && <p class={message.ok ? 's-success' : 's-error'}>{message.text}</p>}
      <h3 class="s-subhead">{t.rolesTitle}</h3>
      <dl class="s-roles">
        {STAFF_ROLES.map((r) => (
          <div>
            <dt>{t.roles[r]}</dt>
            <dd>{t.roleHelp[r]}</dd>
          </div>
        ))}
      </dl>
    </Panel>
  );
}
