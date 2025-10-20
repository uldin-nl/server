import { router } from '@inertiajs/react';
import { useState } from 'react';
export default function CreateSite({
    serverId,
}: {
    serverId: string | number;
}) {
    const [domain, setDomain] = useState('');
    const [phpVersion, setPhpVersion] = useState('8.3');
    const [projectType, setProjectType] = useState('laravel');
    const [rootDomain, setRootDomain] = useState('');
    const [webDirectory, setWebDirectory] = useState('/public');

    const handleSubmit = (e: { preventDefault: () => void }) => {
        e.preventDefault();
        router.post(`/ploi/servers/${serverId}/sites`, {
            domain,
            php_version: phpVersion,
            project_type: projectType,
            root_domain: rootDomain,
            web_directory: webDirectory,
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
            <h1 className="text-xl font-bold">Nieuwe Site</h1>

            <div>
                <label>Domain</label>
                <input
                    type="text"
                    placeholder="example.com"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    className="w-full border p-2"
                />
            </div>

            <div>
                <label>Web Directory</label>
                <input
                    type="text"
                    placeholder="/public"
                    value={webDirectory}
                    onChange={(e) => setWebDirectory(e.target.value)}
                    className="w-full border p-2"
                />
            </div>

            <select
                value={phpVersion}
                onChange={(e) => setPhpVersion(e.target.value)}
                className="w-full border p-2"
            >
                <option value="8.3">PHP 8.3</option>
                <option value="8.2">PHP 8.2</option>
            </select>

            <button
                type="submit"
                className="rounded bg-blue-600 px-4 py-2 text-white"
            >
                Create Site
            </button>
        </form>
    );
}
