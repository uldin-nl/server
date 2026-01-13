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
    Route::get('/ploi/sites', [PloiController::class, 'allSites'])->name('ploi.sites');
    Route::get('/ploi/clients', [PloiController::class, 'clients'])->name('ploi.clients');
    Route::get('/ploi/servers/{serverId}/clients/{userId}', [PloiController::class, 'clientDetail'])->name('ploi.client.detail');
    Route::post('/ploi/servers/{serverId}/system-users', [PloiController::class, 'createSystemUser'])->name('ploi.system-users.create');
    Route::get('/ploi/servers/{id}', [PloiController::class, 'show'])->name('ploi.server.show');

    Route::prefix('ploi')->group(function () {
        Route::get('/servers/{serverId}/sites/create', [PloiController::class, 'createSiteForm'])->name('ploi.sites.create');
        Route::post('/servers/{serverId}/sites', [PloiController::class, 'createSite']);
        
        // Site detail
        Route::get('/servers/{serverId}/sites/{siteId}', [PloiController::class, 'showSite'])->name('ploi.sites.show');
        Route::delete('/servers/{serverId}/sites/{siteId}', [PloiController::class, 'deleteSite'])->name('ploi.sites.delete');

        // Repository koppelen
        Route::post('/servers/{serverId}/sites/{siteId}/repository', [PloiController::class, 'connectRepository']);

        // WordPress installatie
        Route::post('/servers/{serverId}/sites/{siteId}/wordpress', [PloiController::class, 'installWordPress']);

        // Deploy
        Route::post('/servers/{serverId}/sites/{siteId}/deploy', [PloiController::class, 'deploy']);
        
        // Deploy script updaten
        Route::post('/servers/{serverId}/sites/{siteId}/deploy-script', [PloiController::class, 'updateDeployScript']);
        
        // Environment
        Route::get('/servers/{serverId}/sites/{siteId}/env', [PloiController::class, 'showEnv']);
        Route::post('/servers/{serverId}/sites/{siteId}/env', [PloiController::class, 'updateEnv']);
        
        // SSL Certificaten
        Route::post('/servers/{serverId}/sites/{siteId}/certificates', [PloiController::class, 'createCertificate']);
        Route::delete('/servers/{serverId}/sites/{siteId}/certificates/{certificateId}', [PloiController::class, 'deleteCertificate']);
        
        // Oude git endpoint (voor backwards compatibility)
        Route::post('/servers/{serverId}/sites/{siteId}/git', [PloiController::class, 'connectGit']);
        
        // Site updaten
        Route::patch('/servers/{serverId}/sites/{siteId}', [PloiController::class, 'updateSite']);
    });
});

Route::middleware('auth')->group(function () {
    Route::resource('users', \App\Http\Controllers\UserController::class);
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
