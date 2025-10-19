<?php

namespace App\Http\Controllers;

use App\Services\PloiService;
use Inertia\Inertia;

class PloiController extends Controller
{
    protected PloiService $ploi;

    public function __construct(PloiService $ploi)
    {
        $this->ploi = $ploi;
    }

    public function index()
        {
            $servers = $this->ploi->getServers();
            $allSites = [];

            foreach ($servers['data'] as $server) {
                $sites = $this->ploi->getSites($server['id']);
                $allSites = array_merge($allSites, $sites['data'] ?? []);
            }

            return Inertia::render('Ploi/Servers', [
                'servers' => $servers['data'] ?? [],
                'sites' => $allSites,
            ]);
}

    public function show($id)
    {
        $server = $this->ploi->getServer($id);

        return Inertia::render('Ploi/ServerStatus', [
            'server' => $server['data'] ?? null,
            'logs' => $this->ploi->getServerLogs($id)['data'] ?? [],
        ]);
    }
}
