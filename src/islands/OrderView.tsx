import { useEffect, useState } from 'preact/hooks';
import { api } from '../lib/api';
import { shop } from '../i18n/shop';
import type { Locale } from '../i18n/ui';
import { Button, Notice, Spinner } from './ui';
import OrderDetail, { type Order } from './OrderDetail';

/** /{lang}/order/?n=…&t=… — confirmation after checkout and the guest link from emails. */
export default function OrderView({ lang }: { lang: Locale }) {
  const t = shop[lang];
  const params = new URLSearchParams(location.search);
  const number = params.get('n') ?? '';
  const isNew = params.get('new') === '1';
  const [order, setOrder] = useState<Order | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!number) {
      setFailed(true);
      return;
    }
    api<Order>(`/orders/${encodeURIComponent(number)}?t=${encodeURIComponent(params.get('t') ?? '')}`)
      .then(setOrder)
      .catch(() => setFailed(true));
  }, []);

  if (failed) return <Notice tone="error">{t.orderNotFound}</Notice>;
  if (!order) return <Spinner label={t.loading} />;

  return (
    <div class="stack-lg">
      {isNew && (
        <div class="confirmation card">
          <span class="confirmation__check" aria-hidden="true">
            ✓
          </span>
          <div>
            <h2 class="h-sub">
              {t.order} {order.number}
            </h2>
            <p>{t.requestExplain}</p>
            <Button href={`/${lang}/shop/`} arrow>
              {t.continueShopping}
            </Button>
          </div>
        </div>
      )}
      <OrderDetail lang={lang} order={order} />
    </div>
  );
}
