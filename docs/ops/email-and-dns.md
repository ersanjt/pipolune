# Email and DNS

Hosting: cPanel, user `pipolune`, server `server.netinode.net` (`92.205.182.143`). DNS is managed in **Cloudflare** — DNS changes made in cPanel have no effect.

## Mailboxes

| Address | Purpose |
|---|---|
| info@pipolune.com | public contact (shown on the website) |
| zhanna@pipolune.com | client mailbox |

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
