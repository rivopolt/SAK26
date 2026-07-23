<?php
/**
 * delete_file.php
 * Permanently deletes a file from MyFiles/uploads/. This is different
 * from "remove from map" in the frontend (which only hides the layer
 * for the current browser session) — this removes it from the server
 * so it's gone for everyone who opens the page afterwards.
 */

header('Content-Type: application/json; charset=utf-8');

$uploadDir = __DIR__ . '/../MyFiles/uploads/';

function fail($msg, $code = 400) {
    http_response_code($code);
    echo json_encode(['ok' => false, 'error' => $msg]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    fail('Only POST is allowed', 405);
}

$input = json_decode(file_get_contents('php://input'), true);
$filename = isset($input['filename']) ? basename($input['filename']) : '';

if ($filename === '') {
    fail('Missing "filename"');
}

// basename() above already strips any path traversal attempts (../ etc.)
$target = $uploadDir . $filename;

if (!file_exists($target)) {
    fail('File not found', 404);
}

if (!unlink($target)) {
    fail('Could not delete file (check folder permissions)', 500);
}

echo json_encode(['ok' => true]);
