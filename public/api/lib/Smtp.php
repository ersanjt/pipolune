<?php
declare(strict_types=1);

namespace Pipolune;

/** Authenticated SMTP (implicit TLS on 465, or STARTTLS). Password never appears in errors. */
final class Smtp
{
    public static function send(array $smtp, string $from, string $to, string $message): void
    {
        $host = (string) $smtp['host'];
        $port = (int) ($smtp['port'] ?? 465);
        $encryption = (string) ($smtp['encryption'] ?? 'ssl');
        $remote = ($encryption === 'ssl' ? 'ssl' : 'tcp') . "://{$host}:{$port}";
        $context = stream_context_create([
            'ssl' => [
                'verify_peer' => true,
                'verify_peer_name' => true,
                'peer_name' => $host,
                'SNI_enabled' => true,
            ],
        ]);
        $fp = @stream_socket_client($remote, $errno, $errstr, 20, STREAM_CLIENT_CONNECT, $context);
        if (!$fp) {
            throw new \RuntimeException(self::redact("SMTP connection failed: $errstr ($errno)", $smtp));
        }
        stream_set_timeout($fp, 20);
        try {
            self::expect($fp, [220], $smtp);
            self::command($fp, 'EHLO pipolune.com', [250], $smtp);
            if ($encryption === 'starttls') {
                self::command($fp, 'STARTTLS', [220], $smtp);
                if (!stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
                    throw new \RuntimeException('SMTP STARTTLS failed.');
                }
                self::command($fp, 'EHLO pipolune.com', [250], $smtp);
            }
            self::command($fp, 'AUTH LOGIN', [334], $smtp);
            self::command($fp, base64_encode((string) $smtp['username']), [334], $smtp);
            self::command($fp, base64_encode((string) $smtp['password']), [235], $smtp);
            self::command($fp, "MAIL FROM:<$from>", [250], $smtp);
            self::command($fp, "RCPT TO:<$to>", [250, 251], $smtp);
            self::command($fp, 'DATA', [354], $smtp);
            $payload = preg_replace("/\r\n|\r|\n/", "\r\n", $message) ?? $message;
            $payload = preg_replace('/^\./m', '..', $payload) ?? $payload;
            fwrite($fp, $payload . "\r\n.\r\n");
            self::expect($fp, [250], $smtp);
            self::command($fp, 'QUIT', [221], $smtp);
        } finally {
            fclose($fp);
        }
    }

    private static function command($fp, string $command, array $ok, array $smtp): void
    {
        fwrite($fp, $command . "\r\n");
        self::expect($fp, $ok, $smtp);
    }

    /** Reads a full SMTP reply, including multi-line 250- continuations. */
    private static function expect($fp, array $ok, array $smtp): void
    {
        $data = '';
        while (($line = fgets($fp, 515)) !== false) {
            $data .= $line;
            if (isset($line[3]) && $line[3] === ' ') {
                break;
            }
        }
        if ($data === '') {
            throw new \RuntimeException('SMTP server closed the connection.');
        }
        $code = (int) substr($data, 0, 3);
        if (!in_array($code, $ok, true)) {
            throw new \RuntimeException(self::redact('SMTP ' . trim($data), $smtp));
        }
    }

    private static function redact(string $text, array $smtp): string
    {
        $password = (string) ($smtp['password'] ?? '');
        if ($password !== '') {
            $text = str_replace($password, '[redacted]', $text);
        }
        return mb_substr($text, 0, 220);
    }
}
