<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\PloiController;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', function () {
        return Inertia::render('dashboard');
    })->name('dashboard');

    Route::get('/ploi/servers', [PloiController::class, 'index'])->name('ploi.servers');
    Route::get('/ploi/servers/{id}', [PloiController::class, 'show'])->name('ploi.server.show');
});


require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
