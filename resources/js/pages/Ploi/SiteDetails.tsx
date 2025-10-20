import AppLayout from '@/layouts/app-layout';
import { router, usePage } from '@inertiajs/react';
import { useState } from 'react';

type Props = {
    site: {
        id: number;
        name: string;
        domain: string;
        server_id: number;
        repository?: string;
        branch?: string;
        deployed_at?: string;
        last_deploy_at?: string;
        env_content?: string;
        deploy_script?: string;
        has_repository?: boolean;
    };
};

export default function SiteDetails({ site }: Props) {
    const { errors, flash } = usePage().props as any;
    const [repository, setRepository] = useState(site.repository || '');
    const [branch, setBranch] = useState(site.branch || 'main');
    const [envContent, setEnvContent] = useState(site.env_content || '');
    const [deployScript, setDeployScript] = useState(site.deploy_script || '');
    const [activeTab, setActiveTab] = useState<'deploy' | 'env' | 'script'>('deploy');

    const handleConnectRepository = (e: { preventDefault: () => void }) => {
        e.preventDefault();
        router.post(
            `/ploi/servers/${site.server_id}/sites/${site.id}/repository`,
            {
                repository,
                branch,
            },
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
        router.post(`/ploi/servers/${site.server_id}/sites/${site.id}/deploy-script`, {
            deploy_script: deployScript,
        });
    };

    const handleDeploy = () => {
        if (confirm('Weet je zeker dat je wilt deployen?')) {
            router.post(
                `/ploi/servers/${site.server_id}/sites/${site.id}/deploy`,
            );
        }
    };

    return (
        <AppLayout>
            <div className="p-6">
                <h1 className="mb-4 text-2xl font-bold">{site.name}</h1>
                <p className="mb-6 text-gray-600">{site.domain}</p>

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
                                        {site.repository} (branch: {site.branch})
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
                                    className="rounded bg-green-600 px-6 py-3 text-white hover:bg-green-700"
                                >
                                    🚀 Deploy Nu
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
                                    <input
                                        type="text"
                                        placeholder="username/repository"
                                        value={repository}
                                        onChange={(e) =>
                                            setRepository(e.target.value)
                                        }
                                        className="w-full rounded border p-2"
                                        required
                                    />
                                    <p className="mt-1 text-sm text-gray-500">
                                        Formaat: gebruikersnaam/repository-naam
                                    </p>
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
                    <form onSubmit={handleUpdateDeployScript} className="space-y-4">
                        <div>
                            <label className="mb-1 block text-sm font-medium">
                                Deploy Script
                            </label>
                            <textarea
                                value={deployScript}
                                onChange={(e) => setDeployScript(e.target.value)}
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
            </div>
        </AppLayout>
    );
}
