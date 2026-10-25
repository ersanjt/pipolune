import { useState } from 'preact/hooks';
import { api, ApiError } from '../../lib/api';
import { can, dateTime, ErrorNote, Loading, PageHead, Panel, useApi, type Ctx } from '../shared';
import { useSettings } from './Content';

export function PublishButton({ ctx }: { ctx: Ctx }) {
  const { t } = ctx;
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'missing' | 'error'>('idle');
  if (!can.products(ctx.me)) return null;
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
  active: boolean;
  lastLoginAt: string | null;
}

export default function Settings({ ctx }: { ctx: Ctx }) {
  const { t } = ctx;
  const owner = can.owner(ctx.me);
  const { data, error, patch, message } = useSettings(ctx);
  const [shipping, setShipping] = useState<string | null>(null);
  if (error) return <ErrorNote ctx={ctx} />;
  if (!data) return <Loading ctx={ctx} />;
  const s = data.settings;
  const shippingValue = shipping ?? (s.shipping_standard_kurus === null ? '' : String(s.shipping_standard_kurus / 100));

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
              patch({ shipping_standard_kurus: shippingValue === '' ? null : Math.round(Number(shippingValue) * 100) });
              setShipping(null);
            }}
          >
            <fieldset class="s-stack s-fieldset" disabled={!owner}>
              <input type="number" min="0" step="0.01" value={shippingValue} onInput={(e) => setShipping(e.currentTarget.value)} aria-label={t.shipping} />
              <p class="s-muted">{t.shippingHelp}</p>
              <button class="s-btn" type="submit">
                {t.save}
              </button>
            </fieldset>
          </form>
        </Panel>
      </div>

      {owner && <StaffPanel ctx={ctx} />}
    </>
  );
}

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
                </td>
                <td>
                  <select
                    value={m.role}
                    disabled={busy || m.id === ctx.me.id}
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
          {['owner', 'editor', 'fulfilment'].map((r) => (
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
    </Panel>
  );
}
