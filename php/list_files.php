<?php
/**
 * list_files.php
 * Returns a JSON array of filenames currently sitting in ../MyFiles/uploads/
 * (whether they arrived via the upload button or were dropped in directly
 * via FTP). The frontend uses this list to offer each file as a loadable
 * layer.
 */

header('Content-Type: application/json; charset=utf-8');

$uploadDir = __DIR__ . '/../MyFiles/uploads/';
$allowedExt = ['kml', 'kmz', 'zip'];

if (!is_dir($uploadDir)) {
    echo json_encode([]);
    exit;
}

$files = [];
foreach (scandir($uploadDir) as $entry) {
    if ($entry === '.' || $entry === '..') continue;
    $ext = strtolower(pathinfo($entry, PATHINFO_EXTENSION));
    if (in_array($ext, $allowedExt, true)) {
        $files[] = $entry;
    }
}

sort($files);
echo json_encode($files);
