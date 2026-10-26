import { useState } from 'preact/hooks';
import { api, ApiError } from '../../lib/api';
import { ErrorNote, Loading, PageHead, Panel, useApi, type Ctx } from '../shared';
import type { Currency } from '../../lib/currency';
import { PublishButton } from './Settings';

export interface SettingsResponse {
  settings: {
    sales_mode: string;
    season_mode: string;
    manual_season: string;
    homepage_mode: string;
    shipping_standard: Record<Currency, number | null>;
    catalog_preview: boolean;
    store?: {
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
  };
  season: { season: string; mode: string; night: boolean };
  paymentProvider?: string | null;
  publishConfigured?: boolean;
}

export function useSettings(ctx: Ctx) {
  const state = useApi<SettingsResponse>('/studio/settings');
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  async function patch(values: Partial<SettingsResponse['settings']>) {
    setMessage(null);
    try {
      const res = await api<SettingsResponse>('/studio/settings', { method: 'PATCH', body: values });
      state.setData({ ...state.data!, ...res });
      setMessage({ ok: true, text: ctx.t.saved });
    } catch (err) {
      const field = err instanceof ApiError ? Object.values(err.fields)[0] : '';
      setMessage({ ok: false, text: field === 'payment_provider_missing' ? ctx.t.salesModeHelp.live : err instanceof ApiError && err.message ? err.message : ctx.t.error });
    }
  }
  return { ...state, patch, message };
}

const SEASON_ART: Record<string, string> = {
  spring: '/images/home/season-spring.webp',
  summer: '/images/home/season-summer.webp',
  autumn: '/images/home/season-autumn.webp',
  winter: '/images/home/season-winter.webp',
};

/** Board 05 "Seasons & homepage": season source, pinned season and homepage mode. */
export default function Content({ ctx }: { ctx: Ctx }) {
  const { t } = ctx;
  const { data, error, patch, message } = useSettings(ctx);
  if (error) return <ErrorNote ctx={ctx} />;
  if (!data) return <Loading ctx={ctx} />;
  const s = data.settings;

  return (
    <>
      <PageHead title={t.nav.content} subtitle={t.publishHint}>
        <PublishButton ctx={ctx} />
      </PageHead>
      {message && <p class={message.ok ? 's-success' : 's-error'}>{message.text}</p>}

      <div class="s-grid s-grid--2">
        <Panel title={t.seasonSource}>
          <div class="s-choices">
            {(['auto', 'manual'] as const).map((mode) => (
              <label class="s-choice">
                <input type="radio" name="season_mode" checked={s.season_mode === mode} onChange={() => patch({ season_mode: mode })} />
                <span>
                  <strong>{mode === 'auto' ? t.seasonAuto : t.seasonManual}</strong>
                  <span class="s-muted">{mode === 'auto' ? t.seasonAutoHelp : t.seasonManualHelp}</span>
                </span>
              </label>
            ))}
          </div>
          <p>
            {t.currentSeason}: <strong>{t.seasons[data.season.season]}</strong> · {data.season.night ? t.night : t.day}
          </p>
        </Panel>

        <Panel title={t.homepage}>
          <div class="s-choices">
            {Object.entries(t.homepageModes).map(([mode, label]) => (
              <label class="s-choice">
                <input type="radio" name="homepage_mode" checked={s.homepage_mode === mode} onChange={() => patch({ homepage_mode: mode })} />
                <span>
                  <strong>{label}</strong>
                </span>
              </label>
            ))}
          </div>
          <label class="s-check">
            <input type="checkbox" checked={s.catalog_preview} onChange={(e) => patch({ catalog_preview: e.currentTarget.checked })} />
            {t.previewNote}
          </label>
        </Panel>
      </div>

      <Panel title={t.seasonManual}>
        <div class="s-seasons">
          {(['spring', 'summer', 'autumn', 'winter'] as const).map((season) => (
            <button
              type="button"
              class="s-season"
              aria-pressed={s.season_mode === 'manual' && s.manual_season === season}
              data-current={data.season.season === season}
              onClick={() => patch({ season_mode: 'manual', manual_season: season })}
            >
              <img src={SEASON_ART[season]} alt="" width="210" height="166" loading="lazy" />
              <span>{t.seasons[season]}</span>
            </button>
          ))}
        </div>
      </Panel>
    </>
  );
}
