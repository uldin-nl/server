<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class PloiService
{
    protected string $baseUrl;
    protected string $token;

    public function __construct()
    {
        $this->baseUrl = config('services.ploi.url');
        $this->token = config('services.ploi.token');
    }

    protected function client()
    {
        return Http::withHeaders([
            'Authorization' => 'Bearer ' . $this->token,
            'Accept' => 'application/json',
        ])->baseUrl($this->baseUrl);
    }

    public function getServers()
    {
        return $this->client()->get('/servers')->json();
    }

    public function getServer($serverId)
    {
        return $this->client()->get("/servers/{$serverId}")->json();
    }

    public function getServerLogs($serverId)
    {
        return $this->client()->get("/servers/{$serverId}/logs")->json();
    }

    public function getSites($serverId)
    {
        return $this->client()->get("/servers/{$serverId}/sites")->json();
    }

    public function deploySite($serverId, $siteId)
    {
        return $this->client()->post("/servers/{$serverId}/sites/{$siteId}/deploy")->json();
    }

    // etc... je kunt hier alle endpoints toevoegen die je wilt gebruiken
}
