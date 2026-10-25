<?php
declare(strict_types=1);

namespace Pipolune;

/** Product photos: re-encoded with GD to WebP so only real images end up in public_html/uploads. */
final class Uploads
{
    private const MAX_BYTES = 8 * 1024 * 1024;
    private const MAX_EDGE = 1600;

    public static function image(int $actorId): array
    {
        $file = $_FILES['file'] ?? null;
        if (!$file || $file['error'] !== UPLOAD_ERR_OK || $file['size'] > self::MAX_BYTES) {
            throw new ApiError(422, 'upload_failed', 'Upload a JPEG, PNG or WebP image up to 8 MB.');
        }
        $info = @getimagesize($file['tmp_name']);
        $source = match ($info['mime'] ?? '') {
            'image/jpeg' => @imagecreatefromjpeg($file['tmp_name']),
            'image/png' => @imagecreatefrompng($file['tmp_name']),
            'image/webp' => @imagecreatefromwebp($file['tmp_name']),
            default => false,
        };
        if (!$source) {
            throw new ApiError(422, 'upload_failed', 'Upload a JPEG, PNG or WebP image up to 8 MB.');
        }
        [$w, $h] = [imagesx($source), imagesy($source)];
        $scale = min(1, self::MAX_EDGE / max($w, $h));
        $image = imagescale($source, (int) round($w * $scale), (int) round($h * $scale));
        imagepalettetotruecolor($image);
        imagealphablending($image, true);
        imagesavealpha($image, true);

        $dir = dirname(__DIR__, 2) . '/uploads/products/' . gmdate('Y/m');
        if (!is_dir($dir) && !mkdir($dir, 0755, true)) {
            throw new \RuntimeException('Cannot create upload directory.');
        }
        $name = bin2hex(random_bytes(8)) . '.webp';
        imagewebp($image, "$dir/$name", 86);
        Audit::log($actorId, 'upload.image', 'file', $name);
        return ['url' => '/uploads/products/' . gmdate('Y/m') . "/$name", 'width' => imagesx($image), 'height' => imagesy($image)];
    }
}
