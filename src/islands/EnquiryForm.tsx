import { useState } from 'preact/hooks';
import { api } from '../lib/api';
import { shop } from '../i18n/shop';
import type { Locale } from '../i18n/ui';
import { Button, Field, Notice, useForm } from './ui';

/** Product or bag enquiry; stored as a CRM lead in Studio. */
export default function EnquiryForm(props: { lang: Locale; productId?: number | null; source: 'product' | 'bag' | 'contact'; defaultMessage?: string; email?: string }) {
  const t = shop[props.lang];
  const [sent, setSent] = useState(false);
  const form = useForm(props.lang, { email: props.email ?? '', name: '', message: props.defaultMessage ?? '' });

  if (sent) return <Notice tone="success">{t.enquirySent}</Notice>;

  return (
    <form
      class="stack"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        form.submit(async () => {
          await api('/leads', {
            method: 'POST',
            body: { ...form.values, productId: props.productId ?? null, source: props.source, locale: props.lang },
          });
          setSent(true);
        });
      }}
    >
      <Field label={t.email} name="enquiry-email" type="email" autoComplete="email" required value={form.values.email} onInput={form.set('email')} error={form.errors.email} placeholder={t.emailPlaceholder} />
      <Field label={t.name} name="enquiry-name" autoComplete="name" value={form.values.name} onInput={form.set('name')} error={form.errors.name} />
      <Field label={t.enquiryMessage} name="enquiry-message" multiline value={form.values.message} onInput={form.set('message')} error={form.errors.message} />
      {form.formError && <Notice tone="error">{form.formError}</Notice>}
      <Button type="submit" busy={form.busy} arrow>
        {t.send}
      </Button>
    </form>
  );
}
