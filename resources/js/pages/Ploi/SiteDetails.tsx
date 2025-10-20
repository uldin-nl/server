import AppLayout from '@/layouts/app-layout';
import { router, usePage } from '@inertiajs/react';
import { useState } from 'react';

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
};

type Repository = {
    label: string;
    name: string;
    created_at: string;
    provider_name?: string;
    provider_id?: number;
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
    repositories: Repository[];
};

export default function SiteDetails({ site, repositories = [] }: Props) {
    const { errors, flash } = usePage().props as any;
    const [repository, setRepository] = useState(site.repository || '');
    const [branch, setBranch] = useState(site.branch || 'main');
    const [envContent, setEnvContent] = useState(site.env_content || '');
    const [deployScript, setDeployScript] = useState(site.deploy_script || '');
    const [activeTab, setActiveTab] = useState<
        'deploy' | 'env' | 'script' | 'settings' | 'ssl'
    >('deploy');

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
                        <div className="mt-3 rounded bg-yellow-50 p-3">
                            <p className="text-sm text-yellow-800">
                                💡 <strong>Tip:</strong> De database credentials
                                zijn hetzelfde als de database naam. Gebruik{' '}
                                <code className="rounded bg-yellow-100 px-1">
                                    {site.databases[0]?.name}
                                </code>{' '}
                                als database naam, gebruikersnaam én wachtwoord.
                            </p>
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
                        onClick={() => setActiveTab('settings')}
                        className={`px-4 py-2 ${
                            activeTab === 'settings'
                                ? 'border-b-2 border-blue-600 text-blue-600'
                                : 'text-gray-600'
                        }`}
                    >
                        Settings
                    </button>
                </div>

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
            </div>
        </AppLayout>
    );
}
