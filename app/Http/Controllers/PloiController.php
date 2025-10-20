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

    // Toon formulier voor nieuwe site
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
            // Genereer random 8-karakter subdomain als geen domain is opgegeven
            $domain = $validated['domain'] ?? strtolower(Str::random(8)) . '.uldin.cloud';
            
            // Haal alleen de subdomain naam op (zonder .uldin.cloud)
            $dbName = str_replace('.uldin.cloud', '', $domain);
            // Vervang - met _ voor database naam (MySQL staat geen - toe)
            $dbName = str_replace('-', '_', $dbName);
            
            // Genereer veilig wachtwoord
            $dbPassword = Str::random(16);

            \Log::info('Creating site', [
                'domain' => $domain,
                'db_name' => $dbName,
                'server_id' => $serverId
            ]);

            // 1. Maak site aan
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

            \Log::info('Site created', ['site_id' => $siteId]);

            // 2. Maak database aan
            $databaseResponse = $this->ploi->createDatabase($serverId, [
                'name' => $dbName,
                'user' => $dbName,
                'password' => $dbPassword,
                'description' => "Database voor {$domain}",
                'site_id' => $siteId,
            ]);

            if (isset($databaseResponse['error'])) {
                \Log::error('Database creation failed', ['error' => $databaseResponse['error']]);
                // Site is al gemaakt, ga door
            } else {
                \Log::info('Database created', ['database' => $databaseResponse]);
            }

            return redirect()
                ->route('ploi.sites.show', ['serverId' => $serverId, 'siteId' => $siteId])
                ->with('success', "Site {$domain} succesvol aangemaakt met database!");

        } catch (\Exception $e) {
            \Log::error('Site creation failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    // Site detail pagina
    public function showSite($serverId, $siteId)
    {
        $site = $this->ploi->getSite($serverId, $siteId);
        $siteData = $site['data'] ?? [];
        
        // Voeg server_id toe
        $siteData['server_id'] = $serverId;
        
        // Als de site een repository heeft, haal deze op
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
                \Log::error('Failed to fetch repository', ['error' => $e->getMessage()]);
            }
            
            // Haal .env op
            try {
                $envResponse = $this->ploi->getEnvironment($serverId, $siteId);
                $siteData['env_content'] = $envResponse['data'] ?? '';
            } catch (\Exception $e) {
                \Log::error('Failed to fetch environment', ['error' => $e->getMessage()]);
                $siteData['env_content'] = '';
            }
        } else {
            $siteData['repository'] = null;
            $siteData['branch'] = null;
            $siteData['env_content'] = '';
        }
        
        // Haal SSL certificaten op
        try {
            $certificatesResponse = $this->ploi->getCertificates($serverId, $siteId);
            $siteData['certificates'] = $certificatesResponse['data'] ?? [];
        } catch (\Exception $e) {
            \Log::error('Failed to fetch certificates', ['error' => $e->getMessage()]);
            $siteData['certificates'] = [];
        }
        
        // Haal alle databases op en filter op site_id
        try {
            $databasesResponse = $this->ploi->getDatabases($serverId);
            $allDatabases = $databasesResponse['data'] ?? [];
            
            // Filter databases die gekoppeld zijn aan deze site
            $siteDatabases = array_filter($allDatabases, function($db) use ($siteId) {
                return isset($db['site_id']) && $db['site_id'] == $siteId;
            });
            
            $siteData['databases'] = array_values($siteDatabases);
            
            \Log::info('Databases found', [
                'site_id' => $siteId,
                'databases' => $siteData['databases']
            ]);
        } catch (\Exception $e) {
            \Log::error('Failed to fetch databases', ['error' => $e->getMessage()]);
            $siteData['databases'] = [];
        }
        
        return Inertia::render('Ploi/SiteDetails', [
            'site' => $siteData
        ]);
    }

    // Repository koppelen
    public function connectRepository(Request $request, $serverId, $siteId)
    {
        $validated = $request->validate([
            'repository' => 'required|string',
            'branch' => 'required|string',
        ]);

        try {
            $response = $this->ploi->connectGit($serverId, $siteId, [
                'provider' => 'github',
                'branch' => $validated['branch'],
                'name' => $validated['repository'],
            ]);

            if (isset($response['error']) || isset($response['message'])) {
                throw new \Exception($response['message'] ?? $response['error'] ?? 'Unknown error');
            }

            // Redirect naar dezelfde pagina zodat data opnieuw wordt geladen
            return redirect()->route('ploi.sites.show', ['serverId' => $serverId, 'siteId' => $siteId])
                ->with('success', 'Repository succesvol gekoppeld!');
        } catch (\Exception $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    // Deploy site
    public function deploy($serverId, $siteId)
    {
        try {
            $response = $this->ploi->deploySite($serverId, $siteId);
            
            return redirect()->back()->with('success', 'Deployment gestart!');
        } catch (\Exception $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    // Koppel een Git repo (oude methode, behouden voor backwards compatibility)
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
            'name' => $validated['repository'], // 'name' in plaats van 'repository'
        ]);

        return response()->json($response);
    }

    // Ophalen .env (voor API calls)
    public function showEnv($serverId, $siteId)
    {
        try {
            $response = $this->ploi->getEnvironment($serverId, $siteId);
            return response()->json($response);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    // Updaten .env
    public function updateEnv(Request $request, $serverId, $siteId)
    {
        $validated = $request->validate([
            'content' => 'required|string',
        ]);

        try {
            \Log::info('Updating environment', [
                'server_id' => $serverId,
                'site_id' => $siteId
            ]);

            $response = $this->ploi->updateEnvironment($serverId, $siteId, $validated['content']);
            
            \Log::info('Environment update response', ['response' => $response]);

            if (isset($response['error'])) {
                throw new \Exception($response['error']);
            }
            
            return redirect()->back()->with('success', 'Environment bijgewerkt!');
        } catch (\Exception $e) {
            \Log::error('Failed to update environment', [
                'error' => $e->getMessage()
            ]);
            
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    // Update deploy script
    public function updateDeployScript(Request $request, $serverId, $siteId)
    {
        $validated = $request->validate([
            'deploy_script' => 'required|string',
        ]);

        try {
            \Log::info('Updating deploy script', [
                'server_id' => $serverId,
                'site_id' => $siteId
            ]);

            $response = $this->ploi->updateDeployScript($serverId, $siteId, $validated['deploy_script']);
            
            \Log::info('Deploy script update response', ['response' => $response]);

            if (isset($response['error'])) {
                throw new \Exception($response['error']);
            }
            
            return redirect()->back()->with('success', 'Deploy script bijgewerkt!');
        } catch (\Exception $e) {
            \Log::error('Failed to update deploy script', [
                'error' => $e->getMessage()
            ]);
            
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    // Update site settings
    public function updateSite(Request $request, $serverId, $siteId)
    {
        $validated = $request->validate([
            'root_domain' => 'nullable|string|max:100',
            'web_directory' => 'nullable|string',
            'project_root' => 'nullable|string',
            'health_url' => 'nullable|url',
        ]);

        try {
            \Log::info('Updating site settings', [
                'server_id' => $serverId,
                'site_id' => $siteId,
                'data' => $validated
            ]);

            // Filter alleen ingevulde velden
            $data = array_filter($validated, fn($value) => $value !== null && $value !== '');

            $response = $this->ploi->updateSite($serverId, $siteId, $data);
            
            \Log::info('Site update response', ['response' => $response]);

            if (isset($response['error'])) {
                throw new \Exception($response['error']);
            }
            
            $message = $response['message'] ?? 'Site instellingen bijgewerkt!';
            
            return redirect()->back()->with('success', $message);
        } catch (\Exception $e) {
            \Log::error('Failed to update site', [
                'error' => $e->getMessage()
            ]);
            
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    // SSL Certificaten
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
