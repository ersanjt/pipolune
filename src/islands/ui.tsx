import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import { ApiError } from '../lib/api';
import { errorText } from '../i18n/shop';
import type { Locale } from '../i18n/ui';

export function Field(props: {
  label: string;
  name: string;
  value: string;
  onInput: (value: string) => void;
  error?: string;
  type?: 'text' | 'email' | 'password' | 'tel';
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  hint?: string;
  multiline?: boolean;
}) {
  const id = `f-${props.name}`;
  const describedBy = props.error ? `${id}-error` : props.hint ? `${id}-hint` : undefined;
  const common = {
    id,
    name: props.name,
    value: props.value,
    placeholder: props.placeholder,
    required: props.required,
    'aria-invalid': props.error ? true : undefined,
    'aria-describedby': describedBy,
    onInput: (e: Event) => props.onInput((e.currentTarget as HTMLInputElement | HTMLTextAreaElement).value),
  };
  return (
    <div class="field">
      <label for={id}>{props.label}</label>
      {props.multiline ? (
        <textarea {...common} rows={4} />
      ) : (
        <input {...common} type={(props.type ?? 'text') as 'text'} autoComplete={props.autoComplete} />
      )}
      {props.error ? (
        <p class="field__error" id={`${id}-error`}>
          {props.error}
        </p>
      ) : (
        props.hint && (
          <p class="field__hint" id={`${id}-hint`}>
            {props.hint}
          </p>
        )
      )}
    </div>
  );
}

export function PasswordField(props: Parameters<typeof Field>[0] & { showLabel: string; hideLabel: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <div class="password-field">
      <Field {...props} type={visible ? 'text' : 'password'} />
      <button type="button" class="password-field__toggle" aria-pressed={visible} onClick={() => setVisible(!visible)}>
        <span class="visually-hidden">{visible ? props.hideLabel : props.showLabel}</span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">
          <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
          <circle cx="12" cy="12" r="3" />
          {visible && <path d="M4 4l16 16" />}
        </svg>
      </button>
    </div>
  );
}

export function Checkbox(props: { label: ComponentChildren; checked: boolean; onChange: (v: boolean) => void; name: string; invalid?: boolean }) {
  return (
    <label class="checkbox">
      <input
        type="checkbox"
        name={props.name}
        checked={props.checked}
        aria-invalid={props.invalid || undefined}
        onChange={(e) => props.onChange(e.currentTarget.checked)}
      />
      <span>{props.label}</span>
    </label>
  );
}

export function Button(props: {
  children: ComponentChildren;
  type?: 'button' | 'submit';
  variant?: 'primary' | 'secondary' | 'link' | 'danger';
  busy?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  href?: string;
  arrow?: boolean;
  full?: boolean;
}) {
  const cls = `btn btn--${props.variant ?? 'primary'}${props.full ? ' btn--full' : ''}`;
  const content = (
    <>
      <span>{props.children}</span>
      {props.arrow && (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">
          <path d="M4 12h15" />
          <path d="M14 7l5 5-5 5" />
        </svg>
      )}
    </>
  );
  if (props.href) {
    return (
      <a class={cls} href={props.href}>
        {content}
      </a>
    );
  }
  return (
    <button class={cls} type={props.type ?? 'button'} disabled={props.disabled || props.busy} aria-busy={props.busy} onClick={props.onClick}>
      {content}
    </button>
  );
}

export function Notice(props: { tone?: 'info' | 'success' | 'error' | 'warning'; title?: string; children?: ComponentChildren }) {
  return (
    <div class={`notice notice--${props.tone ?? 'info'}`} role={props.tone === 'error' ? 'alert' : 'status'}>
      {props.title && <p class="notice__title">{props.title}</p>}
      {props.children && <div class="notice__body">{props.children}</div>}
    </div>
  );
}

export function Spinner({ label }: { label: string }) {
  return (
    <p class="loading" role="status">
      <span class="loading__dot" aria-hidden="true">
        ✦
      </span>{' '}
      {label}
    </p>
  );
}

/** Form state with server-side field errors mapped to translated messages. */
export function useForm<T extends Record<string, any>>(lang: Locale, initial: T) {
  const [values, setValues] = useState<T>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (key: keyof T) => (value: any) => setValues((v) => ({ ...v, [key]: value }));

  async function submit(action: () => Promise<void>, local: Record<string, string> = {}) {
    setFormError('');
    const localErrors = Object.fromEntries(Object.entries(local).map(([k, code]) => [k, errorText(lang, code)]));
    setErrors(localErrors);
    if (Object.keys(localErrors).length) return;
    setBusy(true);
    try {
      await action();
    } catch (e) {
      if (e instanceof ApiError && Object.keys(e.fields).length && e.code === 'validation_failed') {
        setErrors(Object.fromEntries(Object.entries(e.fields).map(([k, code]) => [k, errorText(lang, code)])));
      } else {
        setFormError(errorText(lang, e instanceof ApiError ? e.code : undefined));
      }
    } finally {
      setBusy(false);
    }
  }

  return { values, set, setValues, errors, formError, setFormError, busy, submit };
}
