<?php
/**
 * list_files.php
 * Returns the files currently sitting in ../MyFiles/uploads/ (whether they
 * arrived via the upload button or were dropped in directly via FTP).
 *
 * Always responds with valid JSON: {"ok": true, "files": [...]} on success,
 * or {"ok": false, "error": "..."} on failure. This matters because a bare
 * PHP warning printed before our JSON (e.g. from a failed scandir() call)
 * would otherwise corrupt the response and make it unparsable on the
 * client — which is exactly what shows up in the browser as "MyFiles not
 * readable". Suppressing stray warnings and always emitting a clean JSON
 * body, with a specific reason when something's wrong, fixes that.
 */

error_reporting(E_ALL);
ini_set('display_errors', '0'); // never let a stray warning leak into the JSON body

header('Content-Type: application/json; charset=utf-8');

function respond($data) {
    echo json_encode($data);
    exit;
}

$uploadDir = __DIR__ . '/../MyFiles/uploads/';
$allowedExt = ['kml', 'kmz', 'zip'];

if (!file_exists($uploadDir)) {
    respond([
        'ok' => false,
        'error' => "MyFiles/uploads kausta ei leitud serverist (oodatud asukoht: $uploadDir). " .
                   "Kontrolli, et kaust MyFiles/uploads on üles laetud samasse kohta, kus on php/ kaust."
    ]);
}

if (!is_dir($uploadDir)) {
    respond(['ok' => false, 'error' => 'MyFiles/uploads on olemas, aga ei ole kaust.']);
}

if (!is_readable($uploadDir)) {
    respond([
        'ok' => false,
        'error' => 'MyFiles/uploads kaust ei ole serverile loetav. Kontrolli kausta õigusi ' .
                   '(tavaliselt piisab chmod 755, vahel 775 — sõltub hostist).'
    ]);
}

$entries = @scandir($uploadDir);
if ($entries === false) {
    respond(['ok' => false, 'error' => 'Kausta sisu lugemine ebaõnnestus (scandir() ebaõnnestus).']);
}

$files = [];
foreach ($entries as $entry) {
    if ($entry === '.' || $entry === '..') continue;
    $fullPath = $uploadDir . $entry;
    if (!is_file($fullPath)) continue; // skip subfolders, symlinks, etc.
    $ext = strtolower(pathinfo($entry, PATHINFO_EXTENSION));
    if (in_array($ext, $allowedExt, true)) {
        $files[] = $entry;
    }
}

sort($files);
respond(['ok' => true, 'files' => $files]);
