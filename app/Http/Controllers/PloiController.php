<?php

namespace App\Http\Controllers;

use App\Services\PloiService;
use Inertia\Inertia;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;

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

        return Inertia::render('Ploi/Servers', [
            'servers' => $servers['data'] ?? [],
        ]);
    }

    public function allSites(Request $request)
    {
        $servers = $this->ploi->getServers();
        $allSites = [];
        $currentPage = $request->get('page', 1);
        $search = $request->get('search', '');
        $totalSites = 0;

        foreach ($servers['data'] as $server) {
            $sites = $this->ploi->getSites($server['id'], $currentPage, $search);
            foreach ($sites['data'] ?? [] as $site) {
                $site['server_name'] = $server['name'] ?? 'Unknown';
                $allSites[] = $site;
            }
            $totalSites += $sites['meta']['total'] ?? 0;
        }

        return Inertia::render('Ploi/AllSites', [
            'sites' => $allSites,
            'servers' => $servers['data'] ?? [],
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

    public function clients()
    {
        $servers = $this->ploi->getServers();
        $allClients = [];

        foreach ($servers['data'] as $server) {
            $systemUsers = $this->ploi->getSystemUsers($server['id']);

            foreach ($systemUsers['data'] ?? [] as $user) {
                $user['server_id'] = $server['id'];
                $user['server_name'] = $server['name'];
                $allClients[] = $user;
            }
        }

        return Inertia::render('Ploi/Clients', [
            'clients' => $allClients,
            'servers' => $servers['data'] ?? [],
        ]);
    }

    public function clientDetail($serverId, $userId)
    {
        $systemUsers = $this->ploi->getSystemUsers($serverId);
        $client = collect($systemUsers['data'] ?? [])->firstWhere('id', $userId);

        if (!$client) {
            return redirect()->route('ploi.clients')->withErrors(['error' => 'Klant niet gevonden']);
        }

        $sites = $this->ploi->getSites($serverId);
        $clientSites = collect($sites['data'] ?? [])
            ->filter(fn($site) => ($site['system_user'] ?? '') === $client['name'])
            ->values()
            ->all();

        return Inertia::render('Ploi/ClientDetail', [
            'client' => array_merge($client, ['server_id' => $serverId]),
            'sites' => $clientSites,
            'serverId' => $serverId,
        ]);
    }

    public function createSystemUser(Request $request, $serverId)
    {
        $validated = $request->validate([
            'name' => 'required|string',
        ]);

        try {
            $response = $this->ploi->createSystemUser($serverId, [
                'name' => $validated['name'],
            ]);

            if (isset($response['error'])) {
                throw new \Exception($response['error']);
            }

            return redirect()->route('ploi.clients')->with('success', 'Klant succesvol aangemaakt!');
        } catch (\Exception $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
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
        $systemUsers = $this->ploi->getSystemUsers($serverId);

        return Inertia::render('Ploi/CreateSite', [
            'serverId' => $serverId,
            'systemUsers' => $systemUsers['data'] ?? []
        ]);
    }

    public function createSite(Request $request, $serverId)
    {
        $validated = $request->validate([
            'domain' => 'nullable|string',
            'web_directory' => 'required|string',
            'project_type' => 'required|string',
            'php_version' => 'required|string',
            'system_user' => 'required|string',
            'create_new_user' => 'boolean',
        ]);

        try {
            // Als er een nieuwe user aangemaakt moet worden
            if ($validated['create_new_user'] ?? false) {
                $userResponse = $this->ploi->createSystemUser($serverId, [
                    'name' => $validated['system_user'],
                ]);

                if (isset($userResponse['error'])) {
                    throw new \Exception('Fout bij aanmaken system user: ' . ($userResponse['error'] ?? 'Unknown error'));
                }
            }

            $domain = $validated['domain'] ?? strtolower(Str::random(8)) . '.uldin.cloud';
            $dbName = str_replace(['.uldin.cloud', '-'], ['', '_'], $domain);
            $dbPassword = Str::random(16);

            $siteResponse = $this->ploi->createSite($serverId, [
                'root_domain' => $domain,
                'web_directory' => $validated['web_directory'],
                'project_type' => $validated['project_type'],
                'php_version' => $validated['php_version'],
                'system_user' => $validated['system_user'],
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

            $siteDatabases = array_filter($allDatabases, function ($db) use ($siteId) {
                return isset($db['site_id']) && $db['site_id'] == $siteId;
            });

            $siteData['databases'] = array_values($siteDatabases);
        } catch (\Exception $e) {
            $siteData['databases'] = [];
        }

        $backupConfigurations = [];
        try {
            $backupConfigurations = $this->ploi->listBackupConfigurations()['data'] ?? [];
        } catch (\Exception $e) {
            $backupConfigurations = [];
        }

        return Inertia::render('Ploi/SiteDetails', [
            'site' => $siteData,
            'repositories' => $repositories,
            'backupConfigurations' => $backupConfigurations,
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

    public function installWordPress(Request $request, $serverId, $siteId)
    {
        try {
            $createDatabase = $request->input('create_database', false);
            $response = $this->ploi->installWordPress($serverId, $siteId, $createDatabase);

            if (isset($response['error'])) {
                throw new \Exception($response['error']);
            }

            return redirect()->back()->with('success', 'WordPress wordt geïnstalleerd!');
        } catch (\Exception $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    public function getWordPressUpdates(Request $request, $serverId, $siteId)
    {
        try {
            $site = $this->ploi->getSite($serverId, $siteId);
            $siteData = $site['data'] ?? [];
            $path = $this->resolveWpCliPath($serverId, $siteData);
            $pathArg = escapeshellarg($path);

            $coreUpdates = $this->runWpCliJson(
                $serverId,
                "core check-update --format=json --path={$pathArg} --skip-plugins --skip-themes"
            );
            $plugins = $this->runWpCliJson(
                $serverId,
                "plugin list --format=json --fields=name,version,status,update,update_version --path={$pathArg} --skip-plugins --skip-themes"
            );
            $themes = $this->runWpCliJson(
                $serverId,
                "theme list --format=json --fields=name,version,status,update,update_version --path={$pathArg} --skip-plugins --skip-themes"
            );

            return response()->json([
                'core' => $coreUpdates,
                'plugins' => $plugins,
                'themes' => $themes,
            ]);
        } catch (\Exception $e) {
            Log::error('WP updates check failed', [
                'server_id' => $serverId,
                'site_id' => $siteId,
                'message' => $e->getMessage(),
            ]);
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function runWordPressUpdates(Request $request, $serverId, $siteId)
    {
        $validated = $request->validate([
            'core' => 'boolean',
            'plugins' => 'array',
            'plugins.*' => 'string',
            'themes' => 'array',
            'themes.*' => 'string',
            'backup_configuration' => 'required|integer',
        ]);

        try {
            $site = $this->ploi->getSite($serverId, $siteId);
            $siteData = $site['data'] ?? [];
            $path = $this->resolveWpCliPath($serverId, $siteData);
            $pathArg = escapeshellarg($path);

            $this->runBackupForSite(
                (int) $validated['backup_configuration'],
                $serverId,
                $siteId,
                $path
            );

            $results = [];
            if (!empty($validated['core'])) {
                $results['core'] = $this->ploi->runWpCliCommand(
                    $serverId,
                    "core update --path={$pathArg} --skip-plugins --skip-themes"
                );
            }

            $plugins = $validated['plugins'] ?? [];
            if (!empty($plugins)) {
                $pluginList = implode(' ', array_map('escapeshellarg', $plugins));
                $results['plugins'] = $this->ploi->runWpCliCommand(
                    $serverId,
                    "plugin update {$pluginList} --path={$pathArg} --skip-plugins --skip-themes"
                );
            }

            $themes = $validated['themes'] ?? [];
            if (!empty($themes)) {
                $themeList = implode(' ', array_map('escapeshellarg', $themes));
                $results['themes'] = $this->ploi->runWpCliCommand(
                    $serverId,
                    "theme update {$themeList} --path={$pathArg} --skip-plugins --skip-themes"
                );
            }

            return response()->json([
                'results' => $results,
            ]);
        } catch (\Exception $e) {
            Log::error('WP updates run failed', [
                'server_id' => $serverId,
                'site_id' => $siteId,
                'message' => $e->getMessage(),
            ]);
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function deleteSite($serverId, $siteId)
    {
        try {
            $response = $this->ploi->deleteSite($serverId, $siteId);

            if (isset($response['error'])) {
                throw new \Exception($response['error']);
            }

            return redirect()->route('ploi.servers')->with('success', 'Site succesvol verwijderd!');
        } catch (\Exception $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    private function getWpCliPath(array $siteData): string
    {
        $systemUser = $siteData['system_user'] ?? 'ploi';
        $domain = $siteData['domain'] ?? $siteData['name'] ?? '';
        $projectRoot = $siteData['project_root'] ?? $siteData['web_directory'] ?? '/';

        if (!$domain) {
            throw new \Exception('Site domein ontbreekt voor WP-CLI path.');
        }

        if (!str_starts_with($projectRoot, '/')) {
            $projectRoot = '/' . $projectRoot;
        }

        $basePath = "/home/{$systemUser}/{$domain}";
        if ($projectRoot === '/') {
            return $basePath;
        }

        return rtrim($basePath, '/') . $projectRoot;
    }

    private function runWpCliJson($serverId, string $command)
    {
        $response = $this->ploi->runWpCliCommand($serverId, $command);

        if (isset($response['error'])) {
            throw new \Exception($response['error']);
        }

        $message = $response['message'] ?? '';
        if ($this->isWpCliErrorMessage($message)) {
            throw new \Exception($message);
        }
        $decoded = $this->decodeJsonMessage($message);

        return $decoded ?? $message;
    }

    private function decodeJsonMessage(string $message): ?array
    {
        $trimmed = trim($message);
        if ($trimmed === '') {
            return null;
        }

        $decoded = json_decode($trimmed, true);
        if (json_last_error() === JSON_ERROR_NONE) {
            return $decoded;
        }

        $jsonStart = strpbrk($trimmed, '[{');
        if ($jsonStart === false) {
            return null;
        }

        $decoded = json_decode($jsonStart, true);
        if (json_last_error() === JSON_ERROR_NONE) {
            return $decoded;
        }

        return null;
    }

    private function isWpCliErrorMessage(string $message): bool
    {
        return stripos($message, 'Error:') !== false;
    }

    private function resolveWpCliPath($serverId, array $siteData): string
    {
        $systemUser = $siteData['system_user'] ?? 'ploi';
        $domain = $siteData['domain'] ?? $siteData['name'] ?? '';
        $projectRoot = $siteData['project_root'] ?? $siteData['web_directory'] ?? '/';

        if (!$domain) {
            throw new \Exception('Site domein ontbreekt voor WP-CLI path.');
        }

        if (!str_starts_with($projectRoot, '/')) {
            $projectRoot = '/' . $projectRoot;
        }

        $basePath = "/home/{$systemUser}/{$domain}";
        $primaryPath = $projectRoot === '/'
            ? $basePath
            : rtrim($basePath, '/') . $projectRoot;

        $candidates = [
            $primaryPath,
            $basePath,
            rtrim($basePath, '/') . '/public',
            rtrim($basePath, '/') . '/public_html',
        ];

        $seen = [];
        foreach ($candidates as $candidate) {
            $candidate = rtrim($candidate, '/');
            if (isset($seen[$candidate]) || $candidate === '') {
                continue;
            }
            $seen[$candidate] = true;

            if ($this->wpCliIsInstalled($serverId, $candidate)) {
                return $candidate;
            }
        }

        throw new \Exception('Geen WordPress installatie gevonden voor WP-CLI path.');
    }

    private function wpCliIsInstalled($serverId, string $path): bool
    {
        $pathArg = escapeshellarg($path);
        $response = $this->ploi->runWpCliCommand(
            $serverId,
            "core is-installed --path={$pathArg} --skip-plugins --skip-themes"
        );

        if (isset($response['error'])) {
            return false;
        }

        $message = $response['message'] ?? '';
        if ($this->isWpCliErrorMessage($message)) {
            return false;
        }

        return ($response['status'] ?? 'ok') === 'ok';
    }

    private function runBackupForSite(int $backupConfigurationId, $serverId, $siteId, string $path): void
    {
        $backups = $this->ploi->listSiteFileBackups();
        $backupData = $backups['data'] ?? [];
        $backup = collect($backupData)->first(function ($item) use ($siteId, $serverId) {
            $matchesSite = isset($item['site_id']) && (int) $item['site_id'] === (int) $siteId;
            $matchesServer = !isset($item['server_id']) || (int) $item['server_id'] === (int) $serverId;
            return $matchesSite && $matchesServer;
        });

        if (!$backup) {
            $createResponse = $this->ploi->createSiteFileBackup([
                'backup_configuration' => $backupConfigurationId,
                'server' => (int) $serverId,
                'sites' => [(int) $siteId],
                'interval' => 0,
                'path' => [
                    (string) $siteId => $path,
                ],
            ]);

            if (isset($createResponse['error'])) {
                throw new \Exception($createResponse['error']);
            }

            $backup = $createResponse['data'] ?? null;
        }

        $backupId = $backup['id'] ?? null;
        if (!$backupId) {
            throw new \Exception('Backup ID niet gevonden.');
        }

        $runResponse = $this->ploi->runSiteFileBackup($backupId);
        if (isset($runResponse['error'])) {
            throw new \Exception($runResponse['error']);
        }
    }
}
