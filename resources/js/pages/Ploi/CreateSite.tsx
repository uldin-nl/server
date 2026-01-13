import AppLayout from '@/layouts/app-layout';
import { router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';

type SystemUser = {
    id: number;
    name: string;
};

export default function CreateSite({
    serverId,
    systemUsers,
}: {
    serverId: string | number;
    systemUsers: SystemUser[];
}) {
    const { url } = usePage();
    const urlParams = new URLSearchParams(url.split('?')[1] || '');
    const clientParam = urlParams.get('client');

    const [phpVersion, setPhpVersion] = useState('8.4');
    const [projectType, setProjectType] = useState('laravel');
    const [webDirectory, setWebDirectory] = useState('/public');
    const [systemUser, setSystemUser] = useState(clientParam || '');
    const [newUserName, setNewUserName] = useState('');
    const [createNewUser, setCreateNewUser] = useState(false);

    useEffect(() => {
        if (clientParam) {
            setSystemUser(clientParam);
            setCreateNewUser(false);
        }
    }, [clientParam]);

    const handleSubmit = (e: { preventDefault: () => void }) => {
        e.preventDefault();
        router.post(`/ploi/servers/${serverId}/sites`, {
            php_version: phpVersion,
            project_type: projectType,
            web_directory: webDirectory,
            system_user: createNewUser ? newUserName : systemUser,
            create_new_user: createNewUser,
        });
    };

    return (
        <AppLayout>
            <form onSubmit={handleSubmit} className="space-y-6 p-6">
                <div>
                    <h1 className="text-2xl font-bold">Nieuwe Site Aanmaken</h1>
                    <p className="mt-2 text-gray-600">
                        Er wordt automatisch een random subdomain
                        (*.uldin.cloud) en database aangemaakt
                    </p>
                </div>

                <div className="rounded-lg bg-blue-50 p-4">
                    <h3 className="font-semibold text-blue-800">
                        Wat gebeurt er?
                    </h3>
                    <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-blue-700">
                        <li>
                            Een random 8-karakter subdomain wordt gegenereerd
                            (bijv. abc12345.uldin.cloud)
                        </li>
                        <li>Een database met dezelfde naam wordt aangemaakt</li>
                        <li>
                            Een database gebruiker met dezelfde credentials
                            wordt aangemaakt
                        </li>
                        <li>
                            De database wordt automatisch gekoppeld aan de site
                        </li>
                    </ul>
                </div>

                <div>
                    <label className="mb-1 block text-sm font-medium">
                        PHP Versie
                    </label>
                    <select
                        value={phpVersion}
                        onChange={(e) => setPhpVersion(e.target.value)}
                        className="w-full rounded border p-2"
                    >
                        <option value="8.4">PHP 8.4</option>
                        <option value="8.3">PHP 8.3</option>
                        <option value="8.2">PHP 8.2</option>
                        <option value="8.1">PHP 8.1</option>
                    </select>
                </div>

                <div>
                    <label className="mb-1 block text-sm font-medium">
                        Project Type
                    </label>
                    <select
                        value={projectType}
                        onChange={(e) => setProjectType(e.target.value)}
                        className="w-full rounded border p-2"
                    >
                        <option value="laravel">Laravel</option>
                        <option value="wordpress">WordPress</option>
                        <option value="html">Static HTML</option>
                    </select>
                </div>

                <div>
                    <label className="mb-1 block text-sm font-medium">
                        Web Directory
                    </label>
                    <input
                        type="text"
                        value={webDirectory}
                        onChange={(e) => setWebDirectory(e.target.value)}
                        className="w-full rounded border p-2"
                        placeholder="/public"
                    />
                    <p className="mt-1 text-sm text-gray-500">
                        Voor Laravel: /public, voor WordPress: /
                    </p>
                </div>

                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <label className="mb-3 block text-sm font-medium">
                        System User
                    </label>

                    <div className="mb-4 space-y-2">
                        <label className="flex items-center gap-2">
                            <input
                                type="radio"
                                checked={!createNewUser}
                                onChange={() => setCreateNewUser(false)}
                                className="h-4 w-4"
                            />
                            <span>Bestaande user selecteren</span>
                        </label>
                        <label className="flex items-center gap-2">
                            <input
                                type="radio"
                                checked={createNewUser}
                                onChange={() => setCreateNewUser(true)}
                                className="h-4 w-4"
                            />
                            <span>Nieuwe user aanmaken</span>
                        </label>
                    </div>

                    {!createNewUser ? (
                        <div>
                            <select
                                value={systemUser}
                                onChange={(e) => setSystemUser(e.target.value)}
                                className="w-full rounded border p-2"
                                required
                            >
                                <option value="">Selecteer een user...</option>
                                {systemUsers.map((user) => (
                                    <option key={user.id} value={user.name}>
                                        {user.name}
                                    </option>
                                ))}
                            </select>
                            <p className="mt-1 text-sm text-gray-500">
                                Sites van dezelfde user worden gegroepeerd
                            </p>
                        </div>
                    ) : (
                        <div>
                            <input
                                type="text"
                                value={newUserName}
                                onChange={(e) => setNewUserName(e.target.value)}
                                className="w-full rounded border p-2"
                                placeholder="bijv. klant-naam"
                                required
                            />
                            <p className="mt-1 text-sm text-gray-500">
                                Nieuwe system user wordt automatisch aangemaakt
                            </p>
                        </div>
                    )}
                </div>

                <div className="flex gap-3">
                    <button
                        type="submit"
                        className="rounded bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
                    >
                        🚀 Site Aanmaken
                    </button>
                    <button
                        type="button"
                        onClick={() => window.history.back()}
                        className="rounded border px-6 py-2 hover:bg-gray-50"
                    >
                        Annuleren
                    </button>
                </div>
            </form>
        </AppLayout>
    );
}
