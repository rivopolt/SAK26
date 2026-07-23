<?php
/**
 * data_proxy.php
 *
 * Fetches a remote data file server-side and streams it back to the
 * browser. Used for two things:
 *   1. Google Sheets — Google's public gviz/tq CSV endpoint does not
 *      reliably send permissive CORS headers, which is what causes
 *      "Failed to fetch" in the browser when called directly.
 *   2. OneDrive / SharePoint — these generally do not allow direct
 *      cross-origin fetch() from arbitrary websites at all.
 *
 * By proxying both through our own domain, the browser only ever talks
 * to our server (same-origin), so CORS never applies.
 *
 * SECURITY: only a fixed whitelist of Google/Microsoft hosts is allowed
 * as a fetch target, so this endpoint can't be abused as an open proxy
 * / SSRF vector to arbitrary internal or external URLs.
 */

$allowedHostPatterns = [
    '/^docs\.google\.com$/i',
    '/^([a-z0-9-]+\.)?1drv\.ms$/i',
    '/^([a-z0-9-]+\.)?onedrive\.live\.com$/i',
    '/^([a-z0-9-]+\.)?[a-z0-9-]+-my\.sharepoint\.com$/i',
    '/^([a-z0-9-]+\.)?[a-z0-9-]+\.sharepoint\.com$/i',
    '/^api\.onedrive\.com$/i',
];

function fail($msg, $code = 400) {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok' => false, 'error' => $msg]);
    exit;
}

$url = isset($_GET['url']) ? trim($_GET['url']) : '';
if ($url === '') {
    fail('Missing "url" parameter');
}

$parts = parse_url($url);
if (!$parts || empty($parts['scheme']) || empty($parts['host']) || $parts['scheme'] !== 'https') {
    fail('URL must be a valid https:// link');
}

$hostAllowed = false;
foreach ($allowedHostPatterns as $pattern) {
    if (preg_match($pattern, $parts['host'])) {
        $hostAllowed = true;
        break;
    }
}
if (!$hostAllowed) {
    fail('Only Google Sheets / OneDrive / SharePoint hosts are allowed through this proxy (got: ' . $parts['host'] . ')', 403);
}

if (!function_exists('curl_init')) {
    fail('PHP cURL extension is not available on this server', 500);
}

$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL => $url,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_MAXREDIRS => 5,
    CURLOPT_TIMEOUT => 30,
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_HTTPHEADER => [
        'User-Agent: Mozilla/5.0 (compatible; Kaardirakendus/1.0)'
    ],
]);

$body = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
$err = curl_error($ch);
curl_close($ch);

if ($body === false) {
    fail('Fetch failed: ' . $err, 502);
}
if ($httpCode >= 400) {
    fail('Remote server returned HTTP ' . $httpCode, 502);
}

header('Content-Type: ' . ($contentType ?: 'application/octet-stream'));
header('Content-Length: ' . strlen($body));
echo $body;
