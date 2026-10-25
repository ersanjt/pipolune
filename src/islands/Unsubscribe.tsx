import { useState } from 'preact/hooks';
import { api } from '../lib/api';
import { shop } from '../i18n/shop';
import type { Locale } from '../i18n/ui';
import { Button, Notice } from './ui';

export default function Unsubscribe({ lang }: { lang: Locale }) {
  const t = shop[lang];
  const params = new URLSearchParams(location.search);
  const email = params.get('email') ?? '';
  const token = params.get('token') ?? '';
  const [state, setState] = useState<'ready' | 'busy' | 'done' | 'invalid'>(email && token ? 'ready' : 'invalid');

  async function confirm() {
    setState('busy');
    try {
      await api('/mail/unsubscribe', { method: 'POST', body: { email, token } });
      setState('done');
    } catch {
      setState('invalid');
    }
  }

  if (state === 'done') {
    return <Notice tone="success">{t.unsubDone}</Notice>;
  }
  if (state === 'invalid') {
    return <Notice tone="error">{t.unsubInvalid}</Notice>;
  }
  return (
    <Button onClick={confirm} busy={state === 'busy'}>
      {t.unsubButton}
    </Button>
  );
}
