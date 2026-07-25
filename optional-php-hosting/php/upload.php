<?php
/**
 * upload.php
 * Accepts a single file (KML / KMZ / SHP-zip) via multipart/form-data
 * (field name "file") and stores it in ../MyFiles/uploads/.
 *
 * This endpoint is open to anyone who has the link, matching the
 * "open access" requirement of the application. If you want to restrict
 * who can upload files, add an authentication check near the top of
 * this file before it goes into production.
 */

header('Content-Type: application/json; charset=utf-8');

$uploadDir = __DIR__ . '/../MyFiles/uploads/';
$allowedExt = ['kml', 'kmz', 'zip'];
$maxBytes = 50 * 1024 * 1024; // 50 MB safety cap, adjust as needed

function fail($msg, $code = 400) {
    http_response_code($code);
    echo json_encode(['ok' => false, 'error' => $msg]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    fail('Only POST is allowed', 405);
}

if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    fail('No valid file uploaded (field name must be "file")');
}

$file = $_FILES['file'];

if ($file['size'] > $maxBytes) {
    fail('File too large (limit is ' . ($maxBytes / 1024 / 1024) . ' MB)');
}

$origName = basename($file['name']);
$ext = strtolower(pathinfo($origName, PATHINFO_EXTENSION));

if (!in_array($ext, $allowedExt, true)) {
    fail('Unsupported file type: .' . $ext . ' (allowed: ' . implode(', ', $allowedExt) . ')');
}

// Sanitize filename: keep letters, numbers, dot, dash, underscore
$safeBase = preg_replace('/[^A-Za-z0-9._-]/', '_', pathinfo($origName, PATHINFO_FILENAME));
$safeName = $safeBase . '.' . $ext;

if (!is_dir($uploadDir)) {
    if (!mkdir($uploadDir, 0755, true)) {
        fail('Could not create upload directory on server', 500);
    }
}

// Avoid overwriting: append a counter if the name already exists
$target = $uploadDir . $safeName;
$counter = 1;
while (file_exists($target)) {
    $target = $uploadDir . $safeBase . '_' . $counter . '.' . $ext;
    $counter++;
}

if (!move_uploaded_file($file['tmp_name'], $target)) {
    fail('Failed to move uploaded file into place', 500);
}

echo json_encode([
    'ok' => true,
    'filename' => basename($target),
]);
