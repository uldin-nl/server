<?php

namespace App\Http\Controllers;

use App\Services\PloiService;
use Inertia\Inertia;
use Illuminate\Http\Request; 
use Illuminate\Support\Str;

class PloiController extends Controller
{
    protected PloiService $ploi;

    public function __construct(PloiService $ploi)
    {
        $this->ploi = $ploi;
    }

    public function index(Request $request)
    {
        $servers = $this->ploi->getServers();
        $allSites = [];
        $currentPage = $request->get('page', 1);
        $search = $request->get('search', '');
        $totalSites = 0;

        foreach ($servers['data'] as $server) {
            $sites = $this->ploi->getSites($server['id'], $currentPage, $search);
            $allSites = array_merge($allSites, $sites['data'] ?? []);
            $totalSites += $sites['meta']['total'] ?? 0;
        }

        return Inertia::render('Ploi/Servers', [
            'servers' => $servers['data'] ?? [],
            'sites' => $allSites,
            'pagination' => [
                'current_page' => $currentPage,
                'total' => $totalSites,
                'per_page' => 15,
                'last_page' => ceil($totalSites / 15),
            ],
            'filters' => [
                'search' => $search,
            ],
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

    public function sites($serverId)
    {
        $sites = $this->ploi->getSites($serverId);

        return Inertia::render('Ploi/ServerSites', [
            'sites' => $sites['data'] ?? [],
            'serverId' => $serverId,
        ]);
    }

    public function createSiteForm($serverId)
    {
        return Inertia::render('Ploi/CreateSite', [
            'serverId' => $serverId
        ]);
    }

    public function createSite(Request $request, $serverId)
    {
        $validated = $request->validate([
            'domain' => 'nullable|string',
            'web_directory' => 'required|string',
            'project_type' => 'required|string',
            'php_version' => 'required|string',
        ]);

        try {
            $domain = $validated['domain'] ?? strtolower(Str::random(8)) . '.uldin.cloud';
            $dbName = str_replace(['.uldin.cloud', '-'], ['', '_'], $domain);
            $dbPassword = Str::random(16);

            $siteResponse = $this->ploi->createSite($serverId, [
                'root_domain' => $domain,
                'web_directory' => $validated['web_directory'],
                'project_type' => $validated['project_type'],
                'php_version' => $validated['php_version'],
            ]);

            if (isset($siteResponse['error'])) {
                throw new \Exception($siteResponse['error']);
            }

            $siteId = $siteResponse['data']['id'] ?? null;

            if (!$siteId) {
                throw new \Exception('Site ID niet gevonden in response');
            }

            $databaseResponse = $this->ploi->createDatabase($serverId, [
                'name' => $dbName,
                'user' => $dbName,
                'password' => $dbPassword,
                'description' => "Database voor {$domain}",
                'site_id' => $siteId,
            ]);

            return redirect()
                ->route('ploi.sites.show', ['serverId' => $serverId, 'siteId' => $siteId])
                ->with('success', "Site {$domain} succesvol aangemaakt met database!");

        } catch (\Exception $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    public function showSite($serverId, $siteId)
    {
        $site = $this->ploi->getSite($serverId, $siteId);
        $siteData = $site['data'] ?? [];
        $siteData['server_id'] = $serverId;
        
        $repositories = [];
        try {
            $repoResponse = $this->ploi->getRepositories('github');
            $repositories = $repoResponse['data']['repositories'] ?? [];
        } catch (\Exception $e) {
        }
        
        if (isset($siteData['has_repository']) && $siteData['has_repository'] === true) {
            try {
                $repoResponse = $this->ploi->getRepository($serverId, $siteId);
                
                if (isset($repoResponse['data']['repository'])) {
                    $repo = $repoResponse['data']['repository'];
                    $siteData['repository'] = ($repo['user'] ?? '') . '/' . ($repo['name'] ?? '');
                    $siteData['branch'] = $repo['branch'] ?? null;
                    $siteData['repository_provider'] = $repo['provider'] ?? null;
                }
            } catch (\Exception $e) {
            }
            
            try {
                $envResponse = $this->ploi->getEnvironment($serverId, $siteId);
                $siteData['env_content'] = $envResponse['data'] ?? '';
            } catch (\Exception $e) {
                $siteData['env_content'] = '';
            }
        } else {
            $siteData['repository'] = null;
            $siteData['branch'] = null;
            $siteData['env_content'] = '';
        }
        
        try {
            $certificatesResponse = $this->ploi->getCertificates($serverId, $siteId);
            $siteData['certificates'] = $certificatesResponse['data'] ?? [];
        } catch (\Exception $e) {
            $siteData['certificates'] = [];
        }
        
        try {
            $databasesResponse = $this->ploi->getDatabases($serverId);
            $allDatabases = $databasesResponse['data'] ?? [];
            
            $siteDatabases = array_filter($allDatabases, function($db) use ($siteId) {
                return isset($db['site_id']) && $db['site_id'] == $siteId;
            });
            
            $siteData['databases'] = array_values($siteDatabases);
        } catch (\Exception $e) {
            $siteData['databases'] = [];
        }
        
        return Inertia::render('Ploi/SiteDetails', [
            'site' => $siteData,
            'repositories' => $repositories
        ]);
    }

    public function connectRepository(Request $request, $serverId, $siteId)
    {
        $validated = $request->validate([
            'repository' => 'required|string',
            'branch' => 'required|string',
        ]);

        try {
            $repository = $validated['repository'];
            $provider = 'github';
            $name = $repository;

            // Als het een uldin-nl repository is, gebruik custom provider met token
            if (str_starts_with($repository, 'uldin-nl/')) {
                $provider = 'custom';
                $token = config('services.github.uldin_token');

                if ($token) {
                    $repoName = str_replace('uldin-nl/', '', $repository);
                    $name = "https://{$token}@github.com/uldin-nl/{$repoName}.git";
                }
            }

            $response = $this->ploi->connectGit($serverId, $siteId, [
                'provider' => $provider,
                'branch' => $validated['branch'],
                'name' => $name,
            ]);

            if (isset($response['error']) || isset($response['message'])) {
                throw new \Exception($response['message'] ?? $response['error'] ?? 'Unknown error');
            }

            return redirect()->route('ploi.sites.show', ['serverId' => $serverId, 'siteId' => $siteId])
                ->with('success', 'Repository succesvol gekoppeld!');
        } catch (\Exception $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    public function deploy($serverId, $siteId)
    {
        try {
            $response = $this->ploi->deploySite($serverId, $siteId);
            
            return redirect()->back()->with('success', 'Deployment gestart!');
        } catch (\Exception $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    public function connectGit(Request $request, $serverId, $siteId)
    {
        $validated = $request->validate([
            'provider' => 'required|string',
            'repository' => 'required|string',
            'branch' => 'required|string',
        ]);

        $response = $this->ploi->connectGit($serverId, $siteId, [
            'provider' => $validated['provider'],
            'branch' => $validated['branch'],
            'name' => $validated['repository'],
        ]);

        return response()->json($response);
    }

    public function showEnv($serverId, $siteId)
    {
        try {
            $response = $this->ploi->getEnvironment($serverId, $siteId);
            return response()->json($response);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function updateEnv(Request $request, $serverId, $siteId)
    {
        $validated = $request->validate([
            'content' => 'required|string',
        ]);

        try {
            $response = $this->ploi->updateEnvironment($serverId, $siteId, $validated['content']);

            if (isset($response['error'])) {
                throw new \Exception($response['error']);
            }
            
            return redirect()->back()->with('success', 'Environment bijgewerkt!');
        } catch (\Exception $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    public function updateDeployScript(Request $request, $serverId, $siteId)
    {
        $validated = $request->validate([
            'deploy_script' => 'required|string',
        ]);

        try {
            $response = $this->ploi->updateDeployScript($serverId, $siteId, $validated['deploy_script']);

            if (isset($response['error'])) {
                throw new \Exception($response['error']);
            }
            
            return redirect()->back()->with('success', 'Deploy script bijgewerkt!');
        } catch (\Exception $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    public function updateSite(Request $request, $serverId, $siteId)
    {
        $validated = $request->validate([
            'root_domain' => 'nullable|string|max:100',
            'web_directory' => 'nullable|string',
            'project_root' => 'nullable|string',
            'health_url' => 'nullable|url',
        ]);

        try {
            $data = array_filter($validated, fn($value) => $value !== null && $value !== '');

            $response = $this->ploi->updateSite($serverId, $siteId, $data);

            if (isset($response['error'])) {
                throw new \Exception($response['error']);
            }
            
            $message = $response['message'] ?? 'Site instellingen bijgewerkt!';
            
            return redirect()->back()->with('success', $message);
        } catch (\Exception $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    public function createCertificate(Request $request, $serverId, $siteId)
    {
        $validated = $request->validate([
            'type' => 'required|string|in:letsencrypt,custom',
            'certificate' => 'required|string',
            'private' => 'required_if:type,custom|string',
            'force' => 'nullable|boolean',
        ]);

        try {
            $response = $this->ploi->createCertificate($serverId, $siteId, $validated);
            
            if (isset($response['error'])) {
                throw new \Exception($response['error']);
            }
            
            return redirect()->back()->with('success', 'SSL certificaat wordt aangemaakt!');
        } catch (\Exception $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    public function deleteCertificate($serverId, $siteId, $certificateId)
    {
        try {
            $response = $this->ploi->deleteCertificate($serverId, $siteId, $certificateId);
            
            if (isset($response['error'])) {
                throw new \Exception($response['error']);
            }
            
            return redirect()->back()->with('success', 'SSL certificaat verwijderd!');
        } catch (\Exception $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }
}
