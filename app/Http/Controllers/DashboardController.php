<?php

namespace App\Http\Controllers;

use App\Services\PloiService;
use Inertia\Inertia;

class DashboardController extends Controller
{
    protected PloiService $ploi;

    public function __construct(PloiService $ploi)
    {
        $this->ploi = $ploi;
    }

    public function __invoke()
    {
        $serversResponse = $this->ploi->getServers();
        $servers = $serversResponse['data'] ?? [];

        $totalServers = count($servers);
        $activeServers = collect($servers)->filter(fn($server) => ($server['status'] ?? '') === 'active')->count();
        $problemServers = collect($servers)->filter(fn($server) => ($server['status'] ?? '') && ($server['status'] ?? '') !== 'active')->count();

        $allSites = [];
        $totalSites = 0;

        foreach ($servers as $server) {
            $sitesResponse = $this->ploi->getSites($server['id'], 1, '', 25);
            $sites = $sitesResponse['data'] ?? [];
            $totalSites += $sitesResponse['meta']['total'] ?? count($sites);

            foreach ($sites as $site) {
                $site['server_name'] = $server['name'] ?? 'Unknown';
                $allSites[] = $site;
            }
        }

        $problemSites = collect($allSites)->filter(function ($site) {
            $status = strtolower($site['status'] ?? '');
            return str_contains($status, 'fail')
                || str_contains($status, 'error')
                || $status === 'pending';
        })->count();

        usort($allSites, function ($a, $b) {
            $aDate = $a['last_deploy_at'] ?? $a['created_at'] ?? '';
            $bDate = $b['last_deploy_at'] ?? $b['created_at'] ?? '';
            return strcmp($bDate, $aDate);
        });

        $recentSites = array_slice($allSites, 0, 8);

        return Inertia::render('dashboard', [
            'stats' => [
                'totalServers' => $totalServers,
                'activeServers' => $activeServers,
                'problemServers' => $problemServers,
                'problemSites' => $problemSites,
                'totalSites' => $totalSites,
            ],
            'servers' => $servers,
            'recentSites' => $recentSites,
        ]);
    }
}
