import AppLayout from '@/layouts/app-layout';
import { Link } from '@inertiajs/react';

type Client = {
    id: number;
    name: string;
    root: string;
    server_id: number;
    created_at: string;
};

type Site = {
    id: number;
    name: string;
    domain: string;
    status: string;
    server_id: number;
};

type Props = {
    client: Client;
    sites: Site[];
    serverId: number;
};

export default function ClientDetail({ client, sites, serverId }: Props) {
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
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${colors[status] || 'bg-gray-100 text-gray-800'}`}
            >
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        );
    };

    return (
        <AppLayout>
            <div className="p-6">
                {/* Terug knop */}
                <Link
                    href="/ploi/clients"
                    className="mb-4 inline-flex items-center text-blue-600 hover:text-blue-800"
                >
                    ← Terug naar Klanten
                </Link>

                {/* Klant Info */}
                <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6">
                    <h1 className="mb-4 text-2xl font-bold">{client.name}</h1>
                    <div className="space-y-2 text-sm text-gray-600">
                        <p>
                            <strong>Home Directory:</strong> {client.root}
                        </p>
                        <p>
                            <strong>Aangemaakt:</strong>{' '}
                            {new Date(client.created_at).toLocaleDateString(
                                'nl-NL',
                                {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                },
                            )}
                        </p>
                    </div>
                </div>

                {/* Nieuwe Site Toevoegen */}
                <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
                    <h3 className="mb-3 font-semibold text-blue-900">
                        Nieuwe Site Toevoegen voor {client.name}
                    </h3>
                    <Link
                        href={`/ploi/servers/${serverId}/sites/create?client=${client.name}`}
                        className="inline-block rounded bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
                    >
                        Site Aanmaken
                    </Link>
                </div>

                {/* Sites Lijst */}
                <div>
                    <h2 className="mb-4 text-xl font-semibold">
                        Sites ({sites.length})
                    </h2>

                    {sites.length > 0 ? (
                        <div className="space-y-3">
                            {sites.map((site) => (
                                <Link
                                    key={site.id}
                                    href={`/ploi/servers/${site.server_id}/sites/${site.id}`}
                                >
                                    <div className="rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="mb-1 flex items-center gap-2">
                                                    <span className="text-lg font-semibold">
                                                        {site.name}
                                                    </span>
                                                    {getStatusBadge(site.status)}
                                                </div>
                                                <div className="text-gray-600">
                                                    {site.domain}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-lg bg-gray-50 p-8 text-center text-gray-600">
                            Deze klant heeft nog geen sites. Klik op "Site
                            Aanmaken" om te beginnen.
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
