import AppLayout from '@/layouts/app-layout';
import { router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';

type Certificate = {
    id: number;
    status: string;
    domain: string;
    type?: string;
    site_id: number;
    server_id: number;
    expires_at: string | null;
    created_at: string;
};

type Database = {
    id: number;
    type: string;
    name: string;
    server_id: number;
    site_id?: number;
    status: string;
    description?: string;
    created_at: string;
    user?: string;
    username?: string;
    password?: string;
    host?: string;
    port?: number;
};

type Repository = {
    label: string;
    name: string;
    created_at: string;
    provider_name?: string;
    provider_id?: number;
};

type BackupConfiguration = {
    id: number;
    label?: string;
    driver?: string;
};

type SiteBackup = {
    id: number;
    site_id?: number;
    server_id?: number;
    interval?: number;
    path?: string;
    status?: string;
    last_backup_at?: string;
    created_at?: string;
};

type DatabaseBackup = {
    id: number;
    server_id?: number;
    databases?: number[];
    interval?: number;
    status?: string;
    last_backup_at?: string;
    created_at?: string;
};

type WpPackage = {
    name: string;
    version?: string;
    status?: string;
    update?: string;
    update_version?: string;
};

type WpUpdates = {
    core: Array<{ version?: string; update?: string; package?: string }>;
    plugins: WpPackage[];
    themes: WpPackage[];
};

type Props = {
    site: {
        id: number;
        name: string;
        domain: string;
        server_id: number;
        status: string;
        repository?: string;
        branch?: string;
        deployed_at?: string;
        last_deploy_at?: string;
        env_content?: string;
        deploy_script?: string;
        has_repository?: boolean;
        web_directory?: string;
        project_type?: string;
        project_root?: string;
        php_version?: number;
        system_user?: string;
        health_url?: string;
        created_at?: string;
        certificates?: Certificate[];
        databases?: Database[];
    };
    server?: {
        id?: number;
        name?: string;
        host?: string;
        ip_address?: string;
        ip?: string;
    } | null;
    repositories: Repository[];
    backupConfigurations: BackupConfiguration[];
    siteBackups: SiteBackup[];
    databaseBackups: DatabaseBackup[];
};

const getCsrfToken = () => {
    const token = document
        .querySelector('meta[name="csrf-token"]')
        ?.getAttribute('content');
    return token ?? '';
};

const postJson = async <T,>(
    url: string,
    body: Record<string, unknown>,
): Promise<T> => {
    const response = await fetch(url, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': getCsrfToken(),
            'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
    }

    return response.json();
};

export default function SiteDetails({
    site,
    server,
    repositories = [],
    backupConfigurations = [],
    siteBackups = [],
    databaseBackups = [],
}: Props) {
    const { errors, flash } = usePage().props as any;
    const [repository, setRepository] = useState(site.repository || '');
    const [branch, setBranch] = useState(site.branch || 'main');
    const [envContent, setEnvContent] = useState(site.env_content || '');
    const [deployScript, setDeployScript] = useState(site.deploy_script || '');
    const [activeTab, setActiveTab] = useState<
        'deploy' | 'env' | 'script' | 'settings' | 'ssl' | 'wordpress' | 'access' | 'backups'
    >('deploy');
    const [showRepositoryForm, setShowRepositoryForm] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    // Settings form state
    const [rootDomain, setRootDomain] = useState(site.domain || '');
    const [webDirectory, setWebDirectory] = useState(
        site.web_directory || '/public',
    );
    const [projectRoot, setProjectRoot] = useState(site.project_root || '/');
    const [healthUrl, setHealthUrl] = useState(site.health_url || '');

    // SSL form state
    const [certificateType, setCertificateType] = useState<
        'letsencrypt' | 'custom'
    >('letsencrypt');
    const [certificateDomain, setCertificateDomain] = useState(
        site.domain || '',
    );
    const [certificateContent, setCertificateContent] = useState('');
    const [privateKey, setPrivateKey] = useState('');

    const [wpLoading, setWpLoading] = useState(false);
    const [wpUpdates, setWpUpdates] = useState<WpUpdates | null>(null);
    const [wpError, setWpError] = useState<string | null>(null);
    const [wpResult, setWpResult] = useState<string | null>(null);
    const [selectedCore, setSelectedCore] = useState(false);
    const [selectedPlugins, setSelectedPlugins] = useState<
        Record<string, boolean>
    >({});
    const [selectedThemes, setSelectedThemes] = useState<
        Record<string, boolean>
    >({});
    const [selectedBackupConfig, setSelectedBackupConfig] = useState<
        number | ''
    >(backupConfigurations[0]?.id ?? '');

    const [wpLoginLoading, setWpLoginLoading] = useState(false);
    const [wpLoginError, setWpLoginError] = useState<string | null>(null);

    // Backup form state
    const [showSiteBackupForm, setShowSiteBackupForm] = useState(false);
    const [showDbBackupForm, setShowDbBackupForm] = useState(false);
    const [newBackupConfig, setNewBackupConfig] = useState<number | ''>(
        backupConfigurations[0]?.id ?? '',
    );
    const [newBackupInterval, setNewBackupInterval] = useState<number>(0);
    const [newBackupPath, setNewBackupPath] = useState('/');
    const [selectedDbForBackup, setSelectedDbForBackup] = useState<number | ''>(
        site.databases?.[0]?.id ?? '',
    );
    const [backupLoading, setBackupLoading] = useState<number | null>(null);

    const serverIp = server?.ip_address || server?.ip || '';
    const serverHost = server?.host || server?.name || '';
    const sftpUser = site.system_user || 'ploi';

    const handleConnectRepository = (e: { preventDefault: () => void }) => {
        e.preventDefault();
        router.post(
            `/ploi/servers/${site.server_id}/sites/${site.id}/repository`,
            { repository, branch },
        );
    };

    const handleUpdateEnv = (e: { preventDefault: () => void }) => {
        e.preventDefault();
        router.post(`/ploi/servers/${site.server_id}/sites/${site.id}/env`, {
            content: envContent,
        });
    };

    const handleUpdateDeployScript = (e: { preventDefault: () => void }) => {
        e.preventDefault();
        router.post(
            `/ploi/servers/${site.server_id}/sites/${site.id}/deploy-script`,
            { deploy_script: deployScript },
        );
    };

    const handleUpdateSettings = (e: { preventDefault: () => void }) => {
        e.preventDefault();
        router.patch(`/ploi/servers/${site.server_id}/sites/${site.id}`, {
            root_domain: rootDomain,
            web_directory: webDirectory,
            project_root: projectRoot,
            health_url: healthUrl || null,
        });
    };

    const handleCreateCertificate = (e: { preventDefault: () => void }) => {
        e.preventDefault();

        const data: any = {
            type: certificateType,
            certificate:
                certificateType === 'letsencrypt'
                    ? certificateDomain
                    : certificateContent,
        };

        if (certificateType === 'custom') {
            data.private = privateKey;
        }

        router.post(
            `/ploi/servers/${site.server_id}/sites/${site.id}/certificates`,
            data,
        );
    };

    const handleCreateSiteBackup = (e: { preventDefault: () => void }) => {
        e.preventDefault();
        router.post(
            `/ploi/servers/${site.server_id}/sites/${site.id}/backups/site`,
            {
                backup_configuration: newBackupConfig,
                interval: newBackupInterval,
                path: newBackupPath,
            },
        );
        setShowSiteBackupForm(false);
    };

    const handleCreateDatabaseBackup = (e: { preventDefault: () => void }) => {
        e.preventDefault();
        router.post(
            `/ploi/servers/${site.server_id}/sites/${site.id}/backups/database`,
            {
                backup_configuration: newBackupConfig,
                interval: newBackupInterval,
                database_id: selectedDbForBackup,
            },
        );
        setShowDbBackupForm(false);
    };

    const handleRunSiteBackup = async (backupId: number) => {
        setBackupLoading(backupId);
        try {
            await postJson(
                `/ploi/servers/${site.server_id}/sites/${site.id}/backups/site/${backupId}/run`,
                {},
            );
            router.reload();
        } catch {
            // Error handled by postJson
        } finally {
            setBackupLoading(null);
        }
    };

    const handleRunDatabaseBackup = async (backupId: number) => {
        setBackupLoading(backupId);
        try {
            await postJson(
                `/ploi/servers/${site.server_id}/sites/${site.id}/backups/database/${backupId}/run`,
                {},
            );
            router.reload();
        } catch {
            // Error handled by postJson
        } finally {
            setBackupLoading(null);
        }
    };

    const handleDeleteSiteBackup = (backupId: number) => {
        if (confirm('Weet je zeker dat je deze backup configuratie wilt verwijderen?')) {
            router.delete(
                `/ploi/servers/${site.server_id}/sites/${site.id}/backups/site/${backupId}`,
            );
        }
    };

    const handleDeleteDatabaseBackup = (backupId: number) => {
        if (confirm('Weet je zeker dat je deze backup configuratie wilt verwijderen?')) {
            router.delete(
                `/ploi/servers/${site.server_id}/sites/${site.id}/backups/database/${backupId}`,
            );
        }
    };

    const getIntervalLabel = (interval: number) => {
        if (interval === 0) return 'Nightly';
        if (interval === 1440) return 'Dagelijks';
        if (interval === 720) return 'Elke 12 uur';
        if (interval === 480) return 'Elke 8 uur';
        if (interval === 240) return 'Elke 4 uur';
        if (interval === 120) return 'Elke 2 uur';
        if (interval === 60) return 'Elk uur';
        return `Elke ${interval} minuten`;
    };

    const handleFetchWpUpdates = async () => {
        setWpError(null);
        setWpResult(null);
        setWpLoading(true);
        try {
            const data = await postJson<WpUpdates>(
                `/ploi/servers/${site.server_id}/sites/${site.id}/wordpress/updates`,
                {},
            );

            const plugins: WpPackage[] = Array.isArray(data.plugins)
                ? data.plugins
                : [];
            const themes: WpPackage[] = Array.isArray(data.themes)
                ? data.themes
                : [];
            const core: WpUpdates['core'] = Array.isArray(data.core)
                ? data.core
                : [];

            const pluginSelections: Record<string, boolean> = {};
            plugins.forEach((plugin) => {
                const hasUpdate = plugin.update && plugin.update !== 'none';
                pluginSelections[plugin.name] = Boolean(hasUpdate);
            });

            const themeSelections: Record<string, boolean> = {};
            themes.forEach((theme) => {
                const hasUpdate = theme.update && theme.update !== 'none';
                themeSelections[theme.name] = Boolean(hasUpdate);
            });

            setSelectedCore(core.length > 0);
            setSelectedPlugins(pluginSelections);
            setSelectedThemes(themeSelections);
            setWpUpdates({ core, plugins, themes });
        } catch (error) {
            setWpError(
                error instanceof Error
                    ? error.message
                    : 'Update check mislukt',
            );
        } finally {
            setWpLoading(false);
        }
    };

    const handleRunWpUpdates = async () => {
        setWpError(null);
        setWpResult(null);

        if (!selectedBackupConfig) {
            setWpError('Selecteer eerst een backup configuratie.');
            return;
        }

        setWpLoading(true);
        try {
            const plugins = Object.entries(selectedPlugins)
                .filter(([, selected]) => selected)
                .map(([name]) => name);
            const themes = Object.entries(selectedThemes)
                .filter(([, selected]) => selected)
                .map(([name]) => name);

            const response = await postJson<{
                results?: Record<string, { message?: string; error?: string }>;
            }>(
                `/ploi/servers/${site.server_id}/sites/${site.id}/wordpress/updates/run`,
                {
                    core: selectedCore,
                    plugins,
                    themes,
                    backup_configuration: selectedBackupConfig,
                },
            );

            const resultLines: string[] = [];
            const results = response.results ?? {};
            Object.entries(results).forEach(([key, value]) => {
                if (!value) {
                    return;
                }
                const message = value.error ?? value.message ?? 'ok';
                resultLines.push(`${key}: ${message}`);
            });

            setWpResult(
                resultLines.length > 0
                    ? resultLines.join('\n')
                    : 'Updates gestart.',
            );
        } catch (error) {
            setWpError(
                error instanceof Error ? error.message : 'Update mislukt',
            );
        } finally {
            setWpLoading(false);
        }
    };

    const handleWpLogin = async () => {
        setWpLoginError(null);
        setWpLoginLoading(true);
        try {
            const data = await postJson<{ url: string; user: string }>(
                `/ploi/servers/${site.server_id}/sites/${site.id}/wordpress/login`,
                {},
            );
            if (data.url) {
                window.open(data.url, '_blank');
            }
        } catch (error) {
            setWpLoginError(
                error instanceof Error
                    ? error.message
                    : 'Login link genereren mislukt',
            );
        } finally {
            setWpLoginLoading(false);
        }
    };

    useEffect(() => {
        if (
            activeTab === 'wordpress' &&
            site.project_type === 'wordpress' &&
            !wpUpdates &&
            !wpLoading
        ) {
            handleFetchWpUpdates();
        }
    }, [activeTab, site.project_type, wpLoading, wpUpdates]);

    const handleDeleteCertificate = (certificateId: number) => {
        if (confirm('Weet je zeker dat je dit certificaat wilt verwijderen?')) {
            router.delete(
                `/ploi/servers/${site.server_id}/sites/${site.id}/certificates/${certificateId}`,
            );
        }
    };

    const handleDeploy = () => {
        if (confirm('Weet je zeker dat je wilt deployen?')) {
            router.post(
                `/ploi/servers/${site.server_id}/sites/${site.id}/deploy`,
            );
        }
    };

    const handleDeleteSite = () => {
        router.delete(`/ploi/servers/${site.server_id}/sites/${site.id}`);
        setShowDeleteModal(false);
    };

    const getStatusBadge = (status: string) => {
        const colors: Record<string, string> = {
            active: 'bg-green-100 text-green-800',
            deploying: 'bg-blue-100 text-blue-800',
            failed: 'bg-red-100 text-red-800',
            pending: 'bg-yellow-100 text-yellow-800',
            created: 'bg-blue-100 text-blue-800',
        };

        return (
            <span
                className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${colors[status] || 'bg-gray-100 text-gray-800'}`}
            >
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        );
    };

    return (
        <AppLayout>
            <div className="p-6">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="mb-2 text-2xl font-bold">{site.name}</h1>
                        <p className="text-gray-600">{site.domain}</p>
                    </div>
                    {getStatusBadge(site.status)}
                </div>

                {/* Success Message */}
                {flash?.success && (
                    <div className="mb-4 rounded-lg bg-green-50 p-4 text-green-800">
                        <strong>Success:</strong> {flash.success}
                    </div>
                )}

                {/* Error Message */}
                {errors.error && (
                    <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-800">
                        <strong>Error:</strong> {errors.error}
                    </div>
                )}

                {/* Site Info Card */}
                <div className="mb-6 grid grid-cols-1 gap-4 rounded-lg bg-gray-50 p-4 md:grid-cols-3">
                    <div>
                        <p className="text-sm text-gray-600">PHP Version</p>
                        <p className="font-semibold">{site.php_version}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">Project Type</p>
                        <p className="font-semibold">
                            {site.project_type || 'N/A'}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">System User</p>
                        <p className="font-semibold">
                            {site.system_user || 'ploi'}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">Web Directory</p>
                        <p className="font-semibold">{site.web_directory}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">Project Root</p>
                        <p className="font-semibold">{site.project_root}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">Created</p>
                        <p className="font-semibold">
                            {site.created_at
                                ? new Date(site.created_at).toLocaleDateString(
                                      'nl-NL',
                                  )
                                : 'N/A'}
                        </p>
                    </div>
                </div>

                {/* Database Info Card - Direct onder Site Info Card */}
                {site.databases && site.databases.length > 0 && (
                    <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
                        <h3 className="mb-3 font-semibold text-blue-900">
                            📊 Database Informatie
                        </h3>
                        <div className="space-y-3">
                            {site.databases.map((db) => (
                                <div
                                    key={db.id}
                                    className="rounded-lg bg-white p-3"
                                >
                                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                        <div>
                                            <p className="text-sm text-gray-600">
                                                Database Naam
                                            </p>
                                            <p className="font-mono font-semibold">
                                                {db.name}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">
                                                Type
                                            </p>
                                            <p className="font-semibold">
                                                {db.type}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">
                                                Status
                                            </p>
                                            {getStatusBadge(db.status)}
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">
                                                Aangemaakt
                                            </p>
                                            <p className="font-semibold">
                                                {new Date(
                                                    db.created_at,
                                                ).toLocaleDateString('nl-NL')}
                                            </p>
                                        </div>
                                        {db.description && (
                                            <div className="md:col-span-2">
                                                <p className="text-sm text-gray-600">
                                                    Beschrijving
                                                </p>
                                                <p className="text-sm">
                                                    {db.description}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Tabs */}
                <div className="mb-6 border-b">
                    <button
                        onClick={() => setActiveTab('deploy')}
                        className={`px-4 py-2 ${
                            activeTab === 'deploy'
                                ? 'border-b-2 border-blue-600 text-blue-600'
                                : 'text-gray-600'
                        }`}
                    >
                        Deployment
                    </button>
                    {site.has_repository && (
                        <>
                            <button
                                onClick={() => setActiveTab('script')}
                                className={`px-4 py-2 ${
                                    activeTab === 'script'
                                        ? 'border-b-2 border-blue-600 text-blue-600'
                                        : 'text-gray-600'
                                }`}
                            >
                                Deploy Script
                            </button>
                            <button
                                onClick={() => setActiveTab('env')}
                                className={`px-4 py-2 ${
                                    activeTab === 'env'
                                        ? 'border-b-2 border-blue-600 text-blue-600'
                                        : 'text-gray-600'
                                }`}
                            >
                                Environment
                            </button>
                        </>
                    )}
                    <button
                        onClick={() => setActiveTab('ssl')}
                        className={`px-4 py-2 ${
                            activeTab === 'ssl'
                                ? 'border-b-2 border-blue-600 text-blue-600'
                                : 'text-gray-600'
                        }`}
                    >
                        SSL Certificaten
                    </button>
                    <button
                        onClick={() => setActiveTab('access')}
                        className={`px-4 py-2 ${
                            activeTab === 'access'
                                ? 'border-b-2 border-blue-600 text-blue-600'
                                : 'text-gray-600'
                        }`}
                    >
                        Server Details
                    </button>
                    {site.project_type === 'wordpress' && (
                        <button
                            onClick={() => setActiveTab('wordpress')}
                            className={`px-4 py-2 ${
                                activeTab === 'wordpress'
                                    ? 'border-b-2 border-blue-600 text-blue-600'
                                    : 'text-gray-600'
                            }`}
                        >
                            WordPress
                        </button>
                    )}
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`px-4 py-2 ${
                            activeTab === 'settings'
                                ? 'border-b-2 border-blue-600 text-blue-600'
                                : 'text-gray-600'
                        }`}
                    >
                        Settings
                    </button>
                    <button
                        onClick={() => setActiveTab('backups')}
                        className={`px-4 py-2 ${
                            activeTab === 'backups'
                                ? 'border-b-2 border-blue-600 text-blue-600'
                                : 'text-gray-600'
                        }`}
                    >
                        Backups
                    </button>
                </div>

                {/* Server Details Tab */}
                {activeTab === 'access' && (
                    <div className="space-y-6">
                        <div className="rounded-lg border border-gray-200 bg-white p-4">
                            <h3 className="mb-4 text-lg font-semibold">
                                Server details
                            </h3>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div>
                                    <p className="text-sm text-gray-600">
                                        Primary SFTP/SSH User
                                    </p>
                                    <p className="font-semibold">
                                        {sftpUser}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">
                                        Host
                                    </p>
                                    <p className="font-semibold">
                                        {serverHost || 'N/A'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">IP</p>
                                    <p className="font-semibold">
                                        {serverIp || 'N/A'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">
                                        Username
                                    </p>
                                    <p className="font-semibold">
                                        {sftpUser}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">User</p>
                                    <p className="font-semibold">
                                        {sftpUser}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">
                                        SSH terminal commando
                                    </p>
                                    <p className="font-mono text-sm font-semibold">
                                        {serverIp
                                            ? `ssh ${sftpUser}@${serverIp}`
                                            : 'ssh user@ip'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-lg border border-gray-200 bg-white p-4">
                            <h3 className="mb-4 text-lg font-semibold">
                                Access database
                            </h3>
                            {site.databases && site.databases.length > 0 ? (
                                <div className="space-y-4">
                                    {site.databases.map((db) => {
                                        const dbUser =
                                            db.user ||
                                            db.username ||
                                            db.name ||
                                            'dbuser';
                                        const dbPassword =
                                            db.password || db.name || 'dbpassword';
                                        const dbHost =
                                            db.host || serverIp || 'host';
                                        const dbPort = db.port
                                            ? `:${db.port}`
                                            : '';
                                        const dbUrl = `mysql://${dbUser}:${dbPassword}@${dbHost}${dbPort}/${db.name}`;

                                        return (
                                            <div
                                                key={db.id}
                                                className="rounded-lg bg-gray-50 p-4"
                                            >
                                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                                    <div>
                                                        <p className="text-sm text-gray-600">
                                                            Database name
                                                        </p>
                                                        <p className="font-mono font-semibold">
                                                            {db.name}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm text-gray-600">
                                                            Username database
                                                        </p>
                                                        <p className="font-mono font-semibold">
                                                            {dbUser}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm text-gray-600">
                                                            Password database
                                                        </p>
                                                        <p className="font-mono font-semibold">
                                                            {dbPassword}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm text-gray-600">
                                                            Database url
                                                        </p>
                                                        <p className="break-all font-mono text-sm font-semibold">
                                                            {dbUrl}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-600">
                                    Geen databases gekoppeld aan deze site.
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* WordPress Tab */}
                {activeTab === 'wordpress' &&
                    site.project_type === 'wordpress' && (
                        <div className="space-y-6">
                            <div className="rounded-lg border border-gray-200 bg-white p-4">
                                <div className="flex flex-wrap items-center justify-between gap-4">
                                    <div>
                                        <h3 className="text-lg font-semibold">
                                            WordPress admin
                                        </h3>
                                        <p className="text-sm text-gray-600">
                                            Open het WordPress dashboard met
                                            automatische login.
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleWpLogin}
                                        disabled={wpLoginLoading}
                                        className="rounded bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:opacity-50"
                                    >
                                        {wpLoginLoading
                                            ? 'Bezig...'
                                            : 'Open wp-admin'}
                                    </button>
                                </div>
                                {wpLoginError && (
                                    <p className="mt-3 text-sm text-red-600">
                                        {wpLoginError}
                                    </p>
                                )}
                            </div>

                            <div className="rounded-lg border border-gray-200 bg-white p-4">
                                <div className="flex flex-wrap items-center justify-between gap-4">
                                    <div>
                                        <h3 className="text-lg font-semibold">
                                            WordPress updates
                                        </h3>
                                        <p className="text-sm text-gray-600">
                                            Check en update WordPress core,
                                            plugins en themes via WP-CLI.
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleFetchWpUpdates}
                                        disabled={wpLoading}
                                        className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        {wpLoading
                                            ? 'Bezig...'
                                            : 'Check updates'}
                                    </button>
                                </div>
                                {wpError && (
                                    <p className="mt-3 text-sm text-red-600">
                                        {wpError}
                                    </p>
                                )}
                                {wpResult && (
                                    <pre className="mt-3 whitespace-pre-wrap rounded bg-gray-50 p-3 text-sm text-gray-700">
                                        {wpResult}
                                    </pre>
                                )}
                            </div>

                            <div className="rounded-lg border border-gray-200 bg-white p-4">
                                <label className="mb-2 block text-sm font-medium">
                                    Backup configuratie (verplicht)
                                </label>
                                {backupConfigurations.length > 0 ? (
                                    <select
                                        value={selectedBackupConfig}
                                        onChange={(e) =>
                                            setSelectedBackupConfig(
                                                e.target.value
                                                    ? Number(e.target.value)
                                                    : '',
                                            )
                                        }
                                        className="w-full rounded border p-2"
                                    >
                                        {backupConfigurations.map((config) => (
                                            <option
                                                key={config.id}
                                                value={config.id}
                                            >
                                                {config.label ||
                                                    `Backup #${config.id}`}
                                                {config.driver
                                                    ? ` (${config.driver})`
                                                    : ''}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <p className="text-sm text-yellow-700">
                                        Geen backup configuraties gevonden in
                                        Ploi.
                                    </p>
                                )}
                            </div>

                            {wpUpdates && (
                                <div className="space-y-6">
                                    <div className="rounded-lg border border-gray-200 bg-white p-4">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-base font-semibold">
                                                WordPress core
                                            </h4>
                                            <label className="flex items-center gap-2 text-sm">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedCore}
                                                    onChange={(e) =>
                                                        setSelectedCore(
                                                            e.target.checked,
                                                        )
                                                    }
                                                    disabled={
                                                        wpUpdates.core.length ===
                                                        0
                                                    }
                                                />
                                                Update core
                                            </label>
                                        </div>
                                        {wpUpdates.core.length === 0 ? (
                                            <p className="mt-2 text-sm text-gray-600">
                                                Geen core updates beschikbaar.
                                            </p>
                                        ) : (
                                            <p className="mt-2 text-sm text-gray-600">
                                                {wpUpdates.core.length} update
                                                beschikbaar.
                                            </p>
                                        )}
                                    </div>

                                    <div className="rounded-lg border border-gray-200 bg-white p-4">
                                        <h4 className="text-base font-semibold">
                                            Plugins
                                        </h4>
                                        {wpUpdates.plugins.length === 0 ? (
                                            <p className="mt-2 text-sm text-gray-600">
                                                Geen plugins gevonden.
                                            </p>
                                        ) : (
                                            <div className="mt-3 space-y-2">
                                                {wpUpdates.plugins.map(
                                                    (plugin) => {
                                                        const hasUpdate =
                                                            plugin.update &&
                                                            plugin.update !==
                                                                'none';
                                                        return (
                                                            <label
                                                                key={
                                                                    plugin.name
                                                                }
                                                                className="flex items-center justify-between gap-4 rounded border p-2 text-sm"
                                                            >
                                                                <div className="min-w-0">
                                                                    <p className="font-medium">
                                                                        {
                                                                            plugin.name
                                                                        }
                                                                    </p>
                                                                    <p className="text-xs text-gray-600">
                                                                        {plugin.version ||
                                                                            '—'}
                                                                        {hasUpdate &&
                                                                            plugin.update_version
                                                                            ? ` → ${plugin.update_version}`
                                                                            : ''}
                                                                    </p>
                                                                </div>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={
                                                                        selectedPlugins[
                                                                            plugin
                                                                                .name
                                                                        ] || false
                                                                    }
                                                                    onChange={(
                                                                        e,
                                                                    ) =>
                                                                        setSelectedPlugins(
                                                                            (
                                                                                prev,
                                                                            ) => ({
                                                                                ...prev,
                                                                                [plugin.name]:
                                                                                    e
                                                                                        .target
                                                                                        .checked,
                                                                            }),
                                                                        )
                                                                    }
                                                                    disabled={
                                                                        !hasUpdate
                                                                    }
                                                                />
                                                            </label>
                                                        );
                                                    },
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="rounded-lg border border-gray-200 bg-white p-4">
                                        <h4 className="text-base font-semibold">
                                            Themes
                                        </h4>
                                        {wpUpdates.themes.length === 0 ? (
                                            <p className="mt-2 text-sm text-gray-600">
                                                Geen themes gevonden.
                                            </p>
                                        ) : (
                                            <div className="mt-3 space-y-2">
                                                {wpUpdates.themes.map(
                                                    (theme) => {
                                                        const hasUpdate =
                                                            theme.update &&
                                                            theme.update !==
                                                                'none';
                                                        return (
                                                            <label
                                                                key={theme.name}
                                                                className="flex items-center justify-between gap-4 rounded border p-2 text-sm"
                                                            >
                                                                <div className="min-w-0">
                                                                    <p className="font-medium">
                                                                        {
                                                                            theme.name
                                                                        }
                                                                    </p>
                                                                    <p className="text-xs text-gray-600">
                                                                        {theme.version ||
                                                                            '—'}
                                                                        {hasUpdate &&
                                                                            theme.update_version
                                                                            ? ` → ${theme.update_version}`
                                                                            : ''}
                                                                    </p>
                                                                </div>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={
                                                                        selectedThemes[
                                                                            theme
                                                                                .name
                                                                        ] || false
                                                                    }
                                                                    onChange={(
                                                                        e,
                                                                    ) =>
                                                                        setSelectedThemes(
                                                                            (
                                                                                prev,
                                                                            ) => ({
                                                                                ...prev,
                                                                                [theme.name]:
                                                                                    e
                                                                                        .target
                                                                                        .checked,
                                                                            }),
                                                                        )
                                                                    }
                                                                    disabled={
                                                                        !hasUpdate
                                                                    }
                                                                />
                                                            </label>
                                                        );
                                                    },
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex justify-end">
                                        <button
                                            onClick={handleRunWpUpdates}
                                            disabled={
                                                wpLoading ||
                                                !selectedBackupConfig
                                            }
                                            className="rounded bg-green-600 px-6 py-3 text-white hover:bg-green-700 disabled:opacity-50"
                                        >
                                            {wpLoading
                                                ? '⏳ Bezig...'
                                                : '🚀 Update geselecteerde items'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                {/* Deployment Tab */}
                {activeTab === 'deploy' && (
                    <div className="space-y-6">
                        {site.has_repository ? (
                            <div className="space-y-4">
                                <div className="rounded-lg bg-green-50 p-4">
                                    <h3 className="mb-2 font-semibold text-green-800">
                                        Repository Gekoppeld
                                    </h3>
                                    <p className="text-green-700">
                                        {site.repository} (branch: {site.branch}
                                        )
                                    </p>
                                    {site.last_deploy_at && (
                                        <p className="mt-2 text-sm text-green-600">
                                            Laatst gedeployed:{' '}
                                            {new Date(
                                                site.last_deploy_at,
                                            ).toLocaleString('nl-NL')}
                                        </p>
                                    )}
                                </div>
                                <button
                                    onClick={handleDeploy}
                                    disabled={site.status === 'deploying'}
                                    className="rounded bg-green-600 px-6 py-3 text-white hover:bg-green-700 disabled:opacity-50"
                                >
                                    {site.status === 'deploying'
                                        ? '⏳ Deploying...'
                                        : '🚀 Deploy Nu'}
                                </button>
                            </div>
                        ) : site.project_type === 'wordpress' ? (
                            <div className="space-y-4">
                                <div className="rounded-lg bg-blue-50 p-4">
                                    <h3 className="mb-2 font-semibold text-blue-800">
                                        WordPress Site Klaar voor Custom Installatie
                                    </h3>
                                    <p className="text-blue-700">
                                        Je WordPress site is aangemaakt. Voer je custom installatie uit via de server tool.
                                    </p>
                                    <p className="mt-2 text-sm text-blue-600">
                                        Site: {site.domain}
                                    </p>
                                </div>

                                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                                    <button
                                        onClick={() => setShowRepositoryForm(!showRepositoryForm)}
                                        className="flex w-full items-center justify-between text-left"
                                    >
                                        <span className="font-semibold">
                                            Optioneel: Repository Koppelen
                                        </span>
                                        <span className="text-gray-500">
                                            {showRepositoryForm ? '▼' : '▶'}
                                        </span>
                                    </button>
                                    <p className="mt-1 text-sm text-gray-600">
                                        Koppel een Git repository voor custom themes of plugins
                                    </p>
                                </div>

                                {showRepositoryForm && (
                                    <form
                                        onSubmit={handleConnectRepository}
                                        className="space-y-4 rounded-lg border border-gray-200 bg-white p-4"
                                    >
                                        <h3 className="font-semibold">
                                            GitHub Repository Koppelen
                                        </h3>

                                        <div>
                                            <label className="mb-1 block text-sm font-medium">
                                                Repository
                                            </label>

                                            {repositories.length > 0 ? (
                                                <>
                                                    <select
                                                        value={repository}
                                                        onChange={(e) =>
                                                            setRepository(
                                                                e.target.value,
                                                            )
                                                        }
                                                        className="w-full rounded border p-2"
                                                        required
                                                    >
                                                        <option value="">
                                                            Selecteer een repository...
                                                        </option>
                                                        {repositories.map((repo) => (
                                                            <option
                                                                key={`${repo.provider_id}-${repo.name}`}
                                                                value={repo.name}
                                                            >
                                                                {repo.label}{' '}
                                                                {repo.provider_name && (
                                                                    <span className="text-gray-500">
                                                                        (
                                                                        {
                                                                            repo.provider_name
                                                                        }
                                                                        )
                                                                    </span>
                                                                )}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <p className="mt-1 text-sm text-gray-500">
                                                        Of voer hieronder handmatig een
                                                        repository in
                                                    </p>
                                                    <input
                                                        type="text"
                                                        placeholder="username/repository"
                                                        value={repository}
                                                        onChange={(e) =>
                                                            setRepository(
                                                                e.target.value,
                                                            )
                                                        }
                                                        className="mt-2 w-full rounded border p-2"
                                                    />
                                                </>
                                            ) : (
                                                <>
                                                    <input
                                                        type="text"
                                                        placeholder="username/repository"
                                                        value={repository}
                                                        onChange={(e) =>
                                                            setRepository(
                                                                e.target.value,
                                                            )
                                                        }
                                                        className="w-full rounded border p-2"
                                                        required
                                                    />
                                                    <p className="mt-1 text-sm text-gray-500">
                                                        Formaat:
                                                        gebruikersnaam/repository-naam
                                                    </p>
                                                </>
                                            )}
                                        </div>

                                        <div>
                                            <label className="mb-1 block text-sm font-medium">
                                                Branch
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="main"
                                                value={branch}
                                                onChange={(e) =>
                                                    setBranch(e.target.value)
                                                }
                                                className="w-full rounded border p-2"
                                                required
                                            />
                                            <p className="mt-1 text-sm text-gray-500">
                                                Standaard branches: main, master,
                                                develop
                                            </p>
                                        </div>

                                        <button
                                            type="submit"
                                            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                                        >
                                            Koppel Repository
                                        </button>
                                    </form>
                                )}
                            </div>
                        ) : (
                            <form
                                onSubmit={handleConnectRepository}
                                className="space-y-4"
                            >
                                <h3 className="font-semibold">
                                    GitHub Repository Koppelen
                                </h3>

                                <div>
                                    <label className="mb-1 block text-sm font-medium">
                                        Repository
                                    </label>

                                    {repositories.length > 0 ? (
                                        <>
                                            <select
                                                value={repository}
                                                onChange={(e) =>
                                                    setRepository(
                                                        e.target.value,
                                                    )
                                                }
                                                className="w-full rounded border p-2"
                                                required
                                            >
                                                <option value="">
                                                    Selecteer een repository...
                                                </option>
                                                {repositories.map((repo) => (
                                                    <option
                                                        key={`${repo.provider_id}-${repo.name}`}
                                                        value={repo.name}
                                                    >
                                                        {repo.label}{' '}
                                                        {repo.provider_name && (
                                                            <span className="text-gray-500">
                                                                (
                                                                {
                                                                    repo.provider_name
                                                                }
                                                                )
                                                            </span>
                                                        )}
                                                    </option>
                                                ))}
                                            </select>
                                            <p className="mt-1 text-sm text-gray-500">
                                                Of voer hieronder handmatig een
                                                repository in
                                            </p>
                                            <input
                                                type="text"
                                                placeholder="username/repository"
                                                value={repository}
                                                onChange={(e) =>
                                                    setRepository(
                                                        e.target.value,
                                                    )
                                                }
                                                className="mt-2 w-full rounded border p-2"
                                            />
                                        </>
                                    ) : (
                                        <>
                                            <input
                                                type="text"
                                                placeholder="username/repository"
                                                value={repository}
                                                onChange={(e) =>
                                                    setRepository(
                                                        e.target.value,
                                                    )
                                                }
                                                className="w-full rounded border p-2"
                                                required
                                            />
                                            <p className="mt-1 text-sm text-gray-500">
                                                Formaat:
                                                gebruikersnaam/repository-naam
                                            </p>
                                        </>
                                    )}
                                </div>

                                <div>
                                    <label className="mb-1 block text-sm font-medium">
                                        Branch
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="main"
                                        value={branch}
                                        onChange={(e) =>
                                            setBranch(e.target.value)
                                        }
                                        className="w-full rounded border p-2"
                                        required
                                    />
                                    <p className="mt-1 text-sm text-gray-500">
                                        Standaard branches: main, master,
                                        develop
                                    </p>
                                </div>

                                <button
                                    type="submit"
                                    className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                                >
                                    Koppel Repository
                                </button>
                            </form>
                        )}
                    </div>
                )}

                {/* Deploy Script Tab */}
                {activeTab === 'script' && site.has_repository && (
                    <form
                        onSubmit={handleUpdateDeployScript}
                        className="space-y-4"
                    >
                        <div>
                            <label className="mb-1 block text-sm font-medium">
                                Deploy Script
                            </label>
                            <textarea
                                value={deployScript}
                                onChange={(e) =>
                                    setDeployScript(e.target.value)
                                }
                                placeholder="cd /home/ploi/example.com&#10;git pull origin main&#10;..."
                                className="h-96 w-full rounded border p-3 font-mono text-sm"
                            />
                            <p className="mt-2 text-sm text-gray-600">
                                Dit script wordt uitgevoerd bij elke deployment.
                            </p>
                        </div>
                        <button
                            type="submit"
                            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                        >
                            Opslaan
                        </button>
                    </form>
                )}

                {/* Environment Tab */}
                {activeTab === 'env' && site.has_repository && (
                    <form onSubmit={handleUpdateEnv} className="space-y-4">
                        <div>
                            <label className="mb-1 block text-sm font-medium">
                                .env Bestand
                            </label>
                            <textarea
                                value={envContent}
                                onChange={(e) => setEnvContent(e.target.value)}
                                placeholder="APP_NAME=Laravel&#10;APP_ENV=production&#10;APP_KEY=&#10;..."
                                className="h-96 w-full rounded border p-3 font-mono text-sm"
                            />
                        </div>
                        <button
                            type="submit"
                            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                        >
                            Opslaan
                        </button>
                    </form>
                )}

                {/* SSL Certificaten Tab */}
                {activeTab === 'ssl' && (
                    <div className="space-y-6">
                        {/* Bestaande certificaten */}
                        <div>
                            <h3 className="mb-4 text-lg font-semibold">
                                Bestaande Certificaten
                            </h3>
                            {site.certificates &&
                            site.certificates.length > 0 ? (
                                <div className="space-y-3">
                                    {site.certificates.map((cert) => (
                                        <div
                                            key={cert.id}
                                            className="flex items-center justify-between rounded-lg border p-4"
                                        >
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3">
                                                    <h4 className="font-semibold">
                                                        {cert.domain}
                                                    </h4>
                                                    {getStatusBadge(
                                                        cert.status,
                                                    )}
                                                </div>
                                                <div className="mt-2 text-sm text-gray-600">
                                                    {cert.type && (
                                                        <span className="mr-4">
                                                            Type: {cert.type}
                                                        </span>
                                                    )}
                                                    {cert.expires_at ? (
                                                        <span>
                                                            Verloopt:{' '}
                                                            {new Date(
                                                                cert.expires_at,
                                                            ).toLocaleDateString(
                                                                'nl-NL',
                                                            )}
                                                        </span>
                                                    ) : (
                                                        <span className="text-yellow-600">
                                                            Nog niet actief
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() =>
                                                    handleDeleteCertificate(
                                                        cert.id,
                                                    )
                                                }
                                                className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
                                            >
                                                Verwijderen
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-600">
                                    Geen SSL certificaten gevonden.
                                </p>
                            )}
                        </div>

                        {/* Nieuw certificaat */}
                        <div className="rounded-lg border-t pt-6">
                            <h3 className="mb-4 text-lg font-semibold">
                                Nieuw SSL Certificaat
                            </h3>
                            <form
                                onSubmit={handleCreateCertificate}
                                className="space-y-4"
                            >
                                <div>
                                    <label className="mb-2 block text-sm font-medium">
                                        Type
                                    </label>
                                    <div className="flex gap-4">
                                        <label className="flex items-center">
                                            <input
                                                type="radio"
                                                value="letsencrypt"
                                                checked={
                                                    certificateType ===
                                                    'letsencrypt'
                                                }
                                                onChange={(e) =>
                                                    setCertificateType(
                                                        e.target
                                                            .value as 'letsencrypt',
                                                    )
                                                }
                                                className="mr-2"
                                            />
                                            Let's Encrypt (Gratis)
                                        </label>
                                        <label className="flex items-center">
                                            <input
                                                type="radio"
                                                value="custom"
                                                checked={
                                                    certificateType === 'custom'
                                                }
                                                onChange={(e) =>
                                                    setCertificateType(
                                                        e.target
                                                            .value as 'custom',
                                                    )
                                                }
                                                className="mr-2"
                                            />
                                            Custom Certificaat
                                        </label>
                                    </div>
                                </div>

                                {certificateType === 'letsencrypt' ? (
                                    <div>
                                        <label className="mb-1 block text-sm font-medium">
                                            Domeinnaam
                                        </label>
                                        <input
                                            type="text"
                                            value={certificateDomain}
                                            onChange={(e) =>
                                                setCertificateDomain(
                                                    e.target.value,
                                                )
                                            }
                                            className="w-full rounded border p-2"
                                            placeholder="example.com"
                                            required
                                        />
                                        <p className="mt-1 text-sm text-gray-500">
                                            Voor wildcard:
                                            domain.com,*.domain.com
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        <div>
                                            <label className="mb-1 block text-sm font-medium">
                                                Certificaat
                                            </label>
                                            <textarea
                                                value={certificateContent}
                                                onChange={(e) =>
                                                    setCertificateContent(
                                                        e.target.value,
                                                    )
                                                }
                                                className="h-32 w-full rounded border p-3 font-mono text-sm"
                                                placeholder="-----BEGIN CERTIFICATE-----"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-sm font-medium">
                                                Private Key
                                            </label>
                                            <textarea
                                                value={privateKey}
                                                onChange={(e) =>
                                                    setPrivateKey(
                                                        e.target.value,
                                                    )
                                                }
                                                className="h-32 w-full rounded border p-3 font-mono text-sm"
                                                placeholder="-----BEGIN PRIVATE KEY-----"
                                                required
                                            />
                                        </div>
                                    </>
                                )}

                                <button
                                    type="submit"
                                    className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                                >
                                    Certificaat Aanmaken
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* Settings Tab */}
                {activeTab === 'settings' && (
                    <form onSubmit={handleUpdateSettings} className="space-y-4">
                        <div className="rounded-lg bg-yellow-50 p-4">
                            <p className="text-sm text-yellow-800">
                                ⚠️ Sommige wijzigingen worden op de achtergrond
                                verwerkt en zijn niet meteen zichtbaar.
                            </p>
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium">
                                Root Domain
                            </label>
                            <input
                                type="text"
                                value={rootDomain}
                                onChange={(e) => setRootDomain(e.target.value)}
                                className="w-full rounded border p-2"
                                placeholder="example.com"
                            />
                            <p className="mt-1 text-sm text-gray-500">
                                De hoofddomeinnaam van deze site. Wijzigingen
                                worden op de achtergrond verwerkt.
                            </p>
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium">
                                Web Directory
                            </label>
                            <input
                                type="text"
                                value={webDirectory}
                                onChange={(e) =>
                                    setWebDirectory(e.target.value)
                                }
                                className="w-full rounded border p-2"
                                placeholder="/public"
                            />
                            <p className="mt-1 text-sm text-gray-500">
                                De map waarin je publieke bestanden staan (bijv.
                                /public voor Laravel).
                            </p>
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium">
                                Project Root
                            </label>
                            <input
                                type="text"
                                value={projectRoot}
                                onChange={(e) => setProjectRoot(e.target.value)}
                                className="w-full rounded border p-2"
                                placeholder="/"
                            />
                            <p className="mt-1 text-sm text-gray-500">
                                De root directory van je project.
                            </p>
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium">
                                Health Check URL (optioneel)
                            </label>
                            <input
                                type="url"
                                value={healthUrl}
                                onChange={(e) => setHealthUrl(e.target.value)}
                                className="w-full rounded border p-2"
                                placeholder="https://example.com/health"
                            />
                            <p className="mt-1 text-sm text-gray-500">
                                URL die Ploi kan gebruiken om de gezondheid van
                                je site te controleren.
                            </p>
                        </div>

                        <button
                            type="submit"
                            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                        >
                            Instellingen Opslaan
                        </button>
                    </form>
                )}

                {/* Backups Tab */}
                {activeTab === 'backups' && (
                    <div className="space-y-6">
                        {/* Site File Backups */}
                        <div className="rounded-lg border bg-white p-6">
                            <div className="mb-4 flex items-center justify-between">
                                <h3 className="text-lg font-semibold">
                                    Site Backups
                                </h3>
                                <button
                                    onClick={() => setShowSiteBackupForm(!showSiteBackupForm)}
                                    className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                                >
                                    {showSiteBackupForm ? 'Annuleren' : 'Nieuwe Backup'}
                                </button>
                            </div>

                            {showSiteBackupForm && (
                                <form
                                    onSubmit={handleCreateSiteBackup}
                                    className="mb-4 rounded border bg-gray-50 p-4"
                                >
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                        <div>
                                            <label className="mb-1 block text-sm font-medium">
                                                Backup Configuratie
                                            </label>
                                            <select
                                                value={newBackupConfig}
                                                onChange={(e) =>
                                                    setNewBackupConfig(
                                                        Number(e.target.value),
                                                    )
                                                }
                                                className="w-full rounded border p-2"
                                                required
                                            >
                                                <option value="">Selecteer...</option>
                                                {backupConfigurations.map((config) => (
                                                    <option
                                                        key={config.id}
                                                        value={config.id}
                                                    >
                                                        {config.label || `Config ${config.id}`}{' '}
                                                        ({config.driver})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-sm font-medium">
                                                Interval
                                            </label>
                                            <select
                                                value={newBackupInterval}
                                                onChange={(e) =>
                                                    setNewBackupInterval(
                                                        Number(e.target.value),
                                                    )
                                                }
                                                className="w-full rounded border p-2"
                                            >
                                                <option value={0}>Nightly</option>
                                                <option value={60}>Elk uur</option>
                                                <option value={120}>Elke 2 uur</option>
                                                <option value={240}>Elke 4 uur</option>
                                                <option value={480}>Elke 8 uur</option>
                                                <option value={720}>Elke 12 uur</option>
                                                <option value={1440}>Dagelijks</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-sm font-medium">
                                                Pad
                                            </label>
                                            <input
                                                type="text"
                                                value={newBackupPath}
                                                onChange={(e) =>
                                                    setNewBackupPath(e.target.value)
                                                }
                                                className="w-full rounded border p-2"
                                                placeholder="/"
                                            />
                                        </div>
                                    </div>
                                    <button
                                        type="submit"
                                        className="mt-4 rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700"
                                    >
                                        Backup Configuratie Aanmaken
                                    </button>
                                </form>
                            )}

                            {siteBackups.length === 0 ? (
                                <p className="text-gray-500">
                                    Geen site backups geconfigureerd.
                                </p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-2">ID</th>
                                                <th className="px-4 py-2">Interval</th>
                                                <th className="px-4 py-2">Pad</th>
                                                <th className="px-4 py-2">
                                                    Laatste Backup
                                                </th>
                                                <th className="px-4 py-2">Acties</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {siteBackups.map((backup) => (
                                                <tr
                                                    key={backup.id}
                                                    className="border-t"
                                                >
                                                    <td className="px-4 py-2">
                                                        {backup.id}
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        {getIntervalLabel(
                                                            backup.interval ?? 0,
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        {backup.path || '/'}
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        {backup.last_backup_at || '-'}
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() =>
                                                                    handleRunSiteBackup(
                                                                        backup.id,
                                                                    )
                                                                }
                                                                disabled={
                                                                    backupLoading ===
                                                                    backup.id
                                                                }
                                                                className="rounded bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-700 disabled:opacity-50"
                                                            >
                                                                {backupLoading ===
                                                                backup.id
                                                                    ? 'Bezig...'
                                                                    : 'Nu Uitvoeren'}
                                                            </button>
                                                            <button
                                                                onClick={() =>
                                                                    handleDeleteSiteBackup(
                                                                        backup.id,
                                                                    )
                                                                }
                                                                className="rounded bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-700"
                                                            >
                                                                Verwijderen
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Database Backups */}
                        <div className="rounded-lg border bg-white p-6">
                            <div className="mb-4 flex items-center justify-between">
                                <h3 className="text-lg font-semibold">
                                    Database Backups
                                </h3>
                                {(site.databases?.length ?? 0) > 0 && (
                                    <button
                                        onClick={() =>
                                            setShowDbBackupForm(!showDbBackupForm)
                                        }
                                        className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                                    >
                                        {showDbBackupForm ? 'Annuleren' : 'Nieuwe Backup'}
                                    </button>
                                )}
                            </div>

                            {showDbBackupForm && (
                                <form
                                    onSubmit={handleCreateDatabaseBackup}
                                    className="mb-4 rounded border bg-gray-50 p-4"
                                >
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                        <div>
                                            <label className="mb-1 block text-sm font-medium">
                                                Backup Configuratie
                                            </label>
                                            <select
                                                value={newBackupConfig}
                                                onChange={(e) =>
                                                    setNewBackupConfig(
                                                        Number(e.target.value),
                                                    )
                                                }
                                                className="w-full rounded border p-2"
                                                required
                                            >
                                                <option value="">Selecteer...</option>
                                                {backupConfigurations.map((config) => (
                                                    <option
                                                        key={config.id}
                                                        value={config.id}
                                                    >
                                                        {config.label || `Config ${config.id}`}{' '}
                                                        ({config.driver})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-sm font-medium">
                                                Database
                                            </label>
                                            <select
                                                value={selectedDbForBackup}
                                                onChange={(e) =>
                                                    setSelectedDbForBackup(
                                                        Number(e.target.value),
                                                    )
                                                }
                                                className="w-full rounded border p-2"
                                                required
                                            >
                                                <option value="">Selecteer...</option>
                                                {site.databases?.map((db) => (
                                                    <option key={db.id} value={db.id}>
                                                        {db.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-sm font-medium">
                                                Interval
                                            </label>
                                            <select
                                                value={newBackupInterval}
                                                onChange={(e) =>
                                                    setNewBackupInterval(
                                                        Number(e.target.value),
                                                    )
                                                }
                                                className="w-full rounded border p-2"
                                            >
                                                <option value={0}>Nightly</option>
                                                <option value={60}>Elk uur</option>
                                                <option value={120}>Elke 2 uur</option>
                                                <option value={240}>Elke 4 uur</option>
                                                <option value={480}>Elke 8 uur</option>
                                                <option value={720}>Elke 12 uur</option>
                                                <option value={1440}>Dagelijks</option>
                                            </select>
                                        </div>
                                    </div>
                                    <button
                                        type="submit"
                                        className="mt-4 rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700"
                                    >
                                        Database Backup Aanmaken
                                    </button>
                                </form>
                            )}

                            {(site.databases?.length ?? 0) === 0 ? (
                                <p className="text-gray-500">
                                    Geen databases gekoppeld aan deze site.
                                </p>
                            ) : databaseBackups.length === 0 ? (
                                <p className="text-gray-500">
                                    Geen database backups geconfigureerd.
                                </p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-2">ID</th>
                                                <th className="px-4 py-2">Interval</th>
                                                <th className="px-4 py-2">
                                                    Laatste Backup
                                                </th>
                                                <th className="px-4 py-2">Acties</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {databaseBackups.map((backup) => (
                                                <tr
                                                    key={backup.id}
                                                    className="border-t"
                                                >
                                                    <td className="px-4 py-2">
                                                        {backup.id}
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        {getIntervalLabel(
                                                            backup.interval ?? 0,
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        {backup.last_backup_at || '-'}
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() =>
                                                                    handleRunDatabaseBackup(
                                                                        backup.id,
                                                                    )
                                                                }
                                                                disabled={
                                                                    backupLoading ===
                                                                    backup.id
                                                                }
                                                                className="rounded bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-700 disabled:opacity-50"
                                                            >
                                                                {backupLoading ===
                                                                backup.id
                                                                    ? 'Bezig...'
                                                                    : 'Nu Uitvoeren'}
                                                            </button>
                                                            <button
                                                                onClick={() =>
                                                                    handleDeleteDatabaseBackup(
                                                                        backup.id,
                                                                    )
                                                                }
                                                                className="rounded bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-700"
                                                            >
                                                                Verwijderen
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {backupConfigurations.length === 0 && (
                            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                                <p className="text-yellow-800">
                                    <strong>Let op:</strong> Je hebt nog geen backup
                                    configuraties ingesteld in je Ploi profiel. Ga naar{' '}
                                    <a
                                        href="https://ploi.io/profile/backup"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 underline"
                                    >
                                        Ploi Backup Settings
                                    </a>{' '}
                                    om een backup configuratie aan te maken.
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Danger Zone - alleen tonen in Settings tab */}
                {activeTab === 'settings' && (
                    <div className="mt-8 rounded-lg border-2 border-red-200 bg-red-50 p-6">
                        <h3 className="mb-2 text-lg font-semibold text-red-800">
                            Danger Zone
                        </h3>
                        <p className="mb-4 text-sm text-red-700">
                            Het verwijderen van een site kan niet ongedaan worden
                            gemaakt. Alle data, configuratie en bestanden worden
                            permanent verwijderd.
                        </p>
                        <button
                            type="button"
                            onClick={() => setShowDeleteModal(true)}
                            className="rounded bg-red-600 px-6 py-2 text-white hover:bg-red-700"
                        >
                            Site Verwijderen
                        </button>
                    </div>
                )}

                {/* Delete Confirmation Modal */}
                {showDeleteModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                        <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
                            <h3 className="mb-4 text-xl font-bold text-red-600">
                                Site Verwijderen
                            </h3>
                            <p className="mb-2 text-gray-700">
                                Weet je zeker dat je <strong>{site.domain}</strong>{' '}
                                wilt verwijderen?
                            </p>
                            <p className="mb-6 text-sm text-red-600">
                                Dit kan niet ongedaan worden gemaakt! Alle data,
                                configuratie en bestanden worden permanent
                                verwijderd.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={handleDeleteSite}
                                    className="flex-1 rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
                                >
                                    Ja, Verwijderen
                                </button>
                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    className="flex-1 rounded border border-gray-300 px-4 py-2 hover:bg-gray-50"
                                >
                                    Annuleren
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
