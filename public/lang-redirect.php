<?php
declare(strict_types=1);

// "/" sends visitors to /en/, /tr/ or /ru/. Order: language picked in the switcher (pl_lang cookie),
// a Turkish/Russian browser language, the Cloudflare IP country, then English. Crawlers always get
// English so search engines index /en/ as the main version; hreflang points them to the others.

const LOCALES = ['en', 'tr', 'ru'];
const COUNTRY_LOCALE = ['TR' => 'tr', 'RU' => 'ru', 'BY' => 'ru', 'KZ' => 'ru', 'KG' => 'ru'];
const CRAWLERS = '/bot|crawl|spider|slurp|yandex|bingpreview|facebookexternalhit|embedly|whatsapp|telegram|lighthouse|headless/i';

function pick(): string
{
    if (preg_match(CRAWLERS, (string) ($_SERVER['HTTP_USER_AGENT'] ?? ''))) {
        return 'en';
    }
    $saved = $_COOKIE['pl_lang'] ?? '';
    if (in_array($saved, LOCALES, true)) {
        return $saved;
    }
    $accept = strtolower((string) ($_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? ''));
    if (preg_match('/^\s*(tr|ru)\b/', $accept, $m)) {
        return $m[1];
    }
    $country = strtoupper((string) ($_SERVER['HTTP_CF_IPCOUNTRY'] ?? ''));
    return COUNTRY_LOCALE[$country] ?? 'en';
}

$query = $_SERVER['QUERY_STRING'] ?? '';
header('Cache-Control: private, no-store');
header('Vary: Cookie, Accept-Language, CF-IPCountry, User-Agent');
header('Location: /' . pick() . '/' . ($query !== '' ? "?$query" : ''), true, 302);
