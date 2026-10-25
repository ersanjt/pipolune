# Email and DNS

Hosting: cPanel, user `pipolune`, server `server.netinode.net` (`92.205.182.143`). DNS is managed in **Cloudflare** — DNS changes made in cPanel have no effect.

## Mailboxes

| Address | Purpose |
|---|---|
| info@pipolune.com | public contact, reply-to, and the address that receives new orders and enquiries |
| zhanna@pipolune.com | client mailbox |
| hello@pipolune.com | **create this** — transactional From (welcome, password, orders, bag reminder) and the SMTP login |
| news@pipolune.com | **create this** — From address for new-product letters only |

Until `hello@` and `news@` exist, the site keeps sending through the mailbox already set as `mail.from` in the server config. Create both in cPanel → Email Accounts (a modest quota is enough; they are not inboxes people should read). Passwords stay in `~/.pipolune/config.php` on the server, never in this repository.

## What the site sends

| Letter | When | Who |
|---|---|---|
| Welcome | account created | that person, with the confirm-email button |
| Confirm email | they ask for a new link | that person |
| Reset password | forgotten password | that person, if the account exists |
| Password changed | password was reset or changed | that person |
| Studio invite | a staff role is granted | that person |
| Order request | checkout | the customer, and a copy of the details to `mail.notify` |
| Order update | Studio notifies the customer of a status change | the customer |
| Bag reminder | a signed-in bag sits untouched for 24 hours | that account, once, until the bag changes |
| New product | the site is published and the product page is live | accounts, checkouts and newsletter leads who opted in |
| Enquiry received | someone writes from the site | that person, and the team |
| Newsletter | a newsletter signup | that person |

Languages follow the customer's locale (EN / TR / RU). Letters are HTML plus a plain-text version, in the woodland colours (milk `#f7f2e8`, forest `#203d2b`).

Bag reminders can only go to signed-in customers. A guest bag has no email address until checkout. New-product letters wait until a deploy, then about five minutes, so the product page exists before the link is sent. People who already had products on the site when this was turned on are not emailed about those older pieces.

Marketing letters include an unsubscribe link (`/{lang}/unsubscribe/`) and a one-click List-Unsubscribe header. Unsubscribing stops news only. Order and account letters still go out. The same switch lives on the account profile (`marketing_opt_in`).

## SMTP

The server config is `~/.pipolune/config.php` (outside `public_html`). Add the SMTP block after the two new mailboxes exist. If `mail.smtp.password` is empty, PHP uses local Exim (`mail()`), which is the right path while the site and the mailboxes share this cPanel account.

```php
'mail' => [
    'from' => 'hello@pipolune.com',
    'from_name' => 'Pipolune',
    'reply_to' => 'info@pipolune.com',
    'notify' => 'info@pipolune.com',
    'marketing_from' => 'news@pipolune.com',
    'marketing_from_name' => 'Pipolune',
    'smtp' => [
        'host' => 'server.netinode.net',
        'port' => 465,
        'encryption' => 'ssl', // or starttls on port 587
        'username' => 'hello@pipolune.com',
        'password' => '', // mailbox password
    ],
    // Optional. If omitted, product letters authenticate as mail.smtp and use marketing_from as From.
    // 'marketing_smtp' => [
    //     'host' => 'server.netinode.net',
    //     'port' => 465,
    //     'encryption' => 'ssl',
    //     'username' => 'news@pipolune.com',
    //     'password' => '',
    // ],
],
```

Use `server.netinode.net` and port 465. `mail.pipolune.com` does not have a certificate the sender can verify.

Test from the server, after the config is saved:

```bash
/opt/cpanel/ea-php82/root/usr/bin/php ~/public_html/api/lib/bin/mail-test.php you@example.com
```

Deploy installs a cron job every five minutes (`api/lib/bin/mail-cron.php`) which sends the queue and bag reminders. A failed letter is retried up to five times. Links inside queued letters are removed from the database after the letter is sent or finally fails.

Passwords are never stored in this repository.

## Mail client settings (SSL/TLS only)

| Setting | Value |
|---|---|
| Username | full address, e.g. `zhanna@pipolune.com` |
| Incoming server | `server.netinode.net` — IMAP 993 / POP3 995 |
| Outgoing server | `server.netinode.net` — SMTP 465 |
| Authentication | required (mailbox password) |
| Calendar (CalDAV) | `https://server.netinode.net:2080/calendars/<address>/calendar` |
| Contacts (CardDAV) | `https://server.netinode.net:2080/addressbooks/<address>/addressbook` |
| Webmail | `https://server.netinode.net:2096` |

Use `server.netinode.net`, not `mail.pipolune.com`: only the former has a valid certificate (Let's Encrypt). Do not use the non-SSL settings (port 2079).

## Target Cloudflare DNS records

| Type | Name | Content | Proxy | Notes |
|---|---|---|---|---|
| A | `@` | 92.205.182.143 | Proxied | website |
| A | `www` | 92.205.182.143 | Proxied | website |
| A | `mail` | 92.205.182.143 | DNS only | mail cannot be proxied |
| MX | `@` | mail.pipolune.com, priority 10 | DNS only | **name must be `@`, not `mail`** |
| TXT | `@` | `v=spf1 mx ip4:92.205.182.143 include:secureserver.net ~all` | DNS only | SPF |
| TXT | `default._domainkey` | DKIM key from cPanel → Email Deliverability | DNS only | DKIM |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:info@pipolune.com; fo=1` | DNS only | report address must be an existing mailbox |

Cloudflare's "origin IP partially exposed" warning is expected: mail and web share one shared-hosting IP, and mail records cannot be proxied.

Once the site serves a valid certificate (cPanel → SSL/TLS Status → Run AutoSSL), set Cloudflare SSL/TLS mode to **Full (strict)**; until then use **Full**.
