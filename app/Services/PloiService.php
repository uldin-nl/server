<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class PloiService
{
    protected string $apiUrl = 'https://ploi.io/api';
    protected string $apiToken;

    public function __construct()
    {
        $this->apiToken = config('services.ploi.token');
    }

    public function getServers()
    {
        return Http::withToken($this->apiToken)
            ->get("{$this->apiUrl}/servers")
            ->json();
    }

    public function getServer($serverId)
    {
        return Http::withToken($this->apiToken)
            ->get("{$this->apiUrl}/servers/{$serverId}")
            ->json();
    }

    public function getServerLogs($serverId)
    {
        return Http::withToken($this->apiToken)
            ->get("{$this->apiUrl}/servers/{$serverId}/logs")
            ->json();
    }

    public function getSites($serverId, $page = 1, $search = '')
    {
        $url = "{$this->apiUrl}/servers/{$serverId}/sites";
        
        $params = [
            'page' => $page,
            'per_page' => 15,
        ];

        if ($search) {
            $params['filter[search]'] = $search;
        }

        return Http::withToken($this->apiToken)
            ->get($url, $params)
            ->json();
    }

    public function getSite($serverId, $siteId)
    {
        return Http::withToken($this->apiToken)
            ->get("{$this->apiUrl}/servers/{$serverId}/sites/{$siteId}")
            ->json();
    }

    // Ophalen repository info van een site
    public function getRepository($serverId, $siteId)
    {
        return Http::withToken($this->apiToken)
            ->get("{$this->apiUrl}/servers/{$serverId}/sites/{$siteId}/repository")
            ->json();
    }

    public function createSite($serverId, array $data)
    {
        return Http::withToken($this->apiToken)
            ->post("{$this->apiUrl}/servers/{$serverId}/sites", $data)
            ->json();
    }

    // 🔹 Git koppelen aan site - AANGEPAST
    public function connectGit($serverId, $siteId, $data)
    {
        return Http::withToken($this->apiToken)
            ->post("{$this->apiUrl}/servers/{$serverId}/sites/{$siteId}/repository", [
                'provider' => $data['provider'],
                'branch' => $data['branch'],
                'name' => $data['name'], // 'name' in plaats van 'repository'
            ])
            ->json();
    }

    public function deploySite($serverId, $siteId)
    {
        return Http::withToken($this->apiToken)
            ->post("{$this->apiUrl}/servers/{$serverId}/sites/{$siteId}/deploy")
            ->json();
    }

    // 🔹 .env ophalen
    public function getEnvironment($serverId, $siteId)
    {
        return Http::withToken($this->apiToken)
            ->get("{$this->apiUrl}/servers/{$serverId}/sites/{$siteId}/env")
            ->json();
    }

    // 🔹 .env updaten
    public function updateEnvironment($serverId, $siteId, $content)
    {
        return Http::withToken($this->apiToken)
            ->patch("{$this->apiUrl}/servers/{$serverId}/sites/{$siteId}/env", [
                'content' => $content
            ])
            ->json();
    }

    public function getRepositories($serverId)
    {
        $response = Http::withToken($this->apiToken)
            ->get("{$this->apiUrl}/servers/{$serverId}/repositories");
        
        \Log::info('Ploi API Status: ' . $response->status());
        \Log::info('Ploi API Response: ' . $response->body());
        
        return $response->json();
    }

    public function installRepository($serverId, $siteId, $repositoryId, $branch = 'main')
    {
        return Http::withToken($this->apiToken)
            ->post("{$this->apiUrl}/servers/{$serverId}/sites/{$siteId}/repository", [
                'repository_id' => $repositoryId,
                'branch' => $branch,
            ])
            ->json();
    }

    public function updateDeployScript($serverId, $siteId, $script)
    {
        return Http::withToken($this->apiToken)
            ->patch("{$this->apiUrl}/servers/{$serverId}/sites/{$siteId}/deploy/script", [
                'deploy_script' => $script
            ])
            ->json();
    }
}
