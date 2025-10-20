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

    public function connectGit($serverId, $siteId, $data)
    {
        return Http::withToken($this->apiToken)
            ->post("{$this->apiUrl}/servers/{$serverId}/sites/{$siteId}/repository", [
                'provider' => $data['provider'],
                'branch' => $data['branch'],
                'name' => $data['name'],
            ])
            ->json();
    }

    public function deploySite($serverId, $siteId)
    {
        return Http::withToken($this->apiToken)
            ->post("{$this->apiUrl}/servers/{$serverId}/sites/{$siteId}/deploy")
            ->json();
    }

    public function getEnvironment($serverId, $siteId)
    {
        return Http::withToken($this->apiToken)
            ->get("{$this->apiUrl}/servers/{$serverId}/sites/{$siteId}/env")
            ->json();
    }

    public function updateEnvironment($serverId, $siteId, $content)
    {
        return Http::withToken($this->apiToken)
            ->patch("{$this->apiUrl}/servers/{$serverId}/sites/{$siteId}/env", [
                'content' => $content
            ])
            ->json();
    }

    public function getRepositories($provider = 'github')
    {
        $providers = Http::withToken($this->apiToken)
            ->get("{$this->apiUrl}/user/source-control")
            ->json();
        
        $githubProviders = collect($providers['data'] ?? [])
            ->filter(fn($p) => $p['provider'] === $provider);
        
        if ($githubProviders->isEmpty()) {
            return ['data' => ['repositories' => []]];
        }
        
        $allRepositories = [];
        
        foreach ($githubProviders as $githubProvider) {
            $response = Http::withToken($this->apiToken)
                ->get("{$this->apiUrl}/user/source-control/{$githubProvider['id']}/repositories")
                ->json();
            
            $repos = $response['data']['repositories'] ?? [];
            
            $repos = array_map(function($repo) use ($githubProvider) {
                $repo['provider_name'] = $githubProvider['name'];
                $repo['provider_id'] = $githubProvider['id'];
                return $repo;
            }, $repos);
            
            $allRepositories = array_merge($allRepositories, $repos);
        }
        
        usort($allRepositories, function($a, $b) {
            return strcmp($a['label'], $b['label']);
        });
        
        return [
            'data' => [
                'repositories' => $allRepositories
            ]
        ];
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
    
    public function updateSite($serverId, $siteId, array $data)
    {
        return Http::withToken($this->apiToken)
            ->patch("{$this->apiUrl}/servers/{$serverId}/sites/{$siteId}", $data)
            ->json();
    }

    public function getCertificates($serverId, $siteId)
    {
        return Http::withToken($this->apiToken)
            ->get("{$this->apiUrl}/servers/{$serverId}/sites/{$siteId}/certificates")
            ->json();
    }

    public function getCertificate($serverId, $siteId, $certificateId)
    {
        return Http::withToken($this->apiToken)
            ->get("{$this->apiUrl}/servers/{$serverId}/sites/{$siteId}/certificates/{$certificateId}")
            ->json();
    }

    public function createCertificate($serverId, $siteId, array $data)
    {
        return Http::withToken($this->apiToken)
            ->post("{$this->apiUrl}/servers/{$serverId}/sites/{$siteId}/certificates", $data)
            ->json();
    }

    public function deleteCertificate($serverId, $siteId, $certificateId)
    {
        return Http::withToken($this->apiToken)
            ->delete("{$this->apiUrl}/servers/{$serverId}/sites/{$siteId}/certificates/{$certificateId}")
            ->json();
    }

    public function createDatabase($serverId, array $data)
    {
        return Http::withToken($this->apiToken)
            ->post("{$this->apiUrl}/servers/{$serverId}/databases", $data)
            ->json();
    }

    public function getDatabase($serverId, $databaseId)
    {
        return Http::withToken($this->apiToken)
            ->get("{$this->apiUrl}/servers/{$serverId}/databases/{$databaseId}")
            ->json();
    }

    public function getDatabases($serverId)
    {
        return Http::withToken($this->apiToken)
            ->get("{$this->apiUrl}/servers/{$serverId}/databases")
            ->json();
    }

    public function createDatabaseUser($serverId, $databaseId, array $data)
    {
        return Http::withToken($this->apiToken)
            ->post("{$this->apiUrl}/servers/{$serverId}/databases/{$databaseId}/users", $data)
            ->json();
    }

    public function getDatabaseUser($serverId, $databaseId, $userId)
    {
        return Http::withToken($this->apiToken)
            ->get("{$this->apiUrl}/servers/{$serverId}/databases/{$databaseId}/users/{$userId}")
            ->json();
    }
}
