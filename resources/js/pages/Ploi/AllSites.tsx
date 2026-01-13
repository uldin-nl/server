import AppLayout from '@/layouts/app-layout';
import { Link, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';

export type Site = {
    id: number;
    name: string;
    domain: string;
    server_id: number;
    server_name?: string;
    status: string;
};

type Server = {
    id: number;
    name: string;
};

type Props = {
    sites: Site[];
    servers: Server[];
    pagination: {
        current_page: number;
        total: number;
        per_page: number;
        last_page: number;
    };
    filters: {
        search: string;
    };
};

export default function AllSites({ sites, servers, pagination, filters }: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [selectedServer, setSelectedServer] = useState<number | null>(null);

    useEffect(() => {
        const timeout = setTimeout(() => {
            router.get(
                '/ploi/sites',
                { search, page: 1 },
                { preserveState: true, preserveScroll: true },
            );
        }, 300);

        return () => clearTimeout(timeout);
    }, [search]);

    const handlePageChange = (page: number) => {
        router.get(
            '/ploi/sites',
            { search, page: page },
            { preserveState: true, preserveScroll: true },
        );
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
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${colors[status] || 'bg-gray-100 text-gray-800'}`}
            >
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        );
    };

    return (
        <AppLayout>
            <div className="p-6">
                <h1 className="mb-6 text-2xl font-bold">Alle Sites</h1>

                {/* Nieuwe Site Toevoegen */}
                <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
                    <h3 className="mb-3 font-semibold text-blue-900">
                        Nieuwe Site Toevoegen
                    </h3>
                    <div className="flex gap-3">
                        <select
                            value={selectedServer ?? ''}
                            onChange={(e) =>
                                setSelectedServer(
                                    e.target.value
                                        ? Number(e.target.value)
                                        : null,
                                )
                            }
                            className="flex-1 rounded border p-2"
                        >
                            <option value="">Selecteer een server...</option>
                            {servers.map((server) => (
                                <option key={server.id} value={server.id}>
                                    {server.name}
                                </option>
                            ))}
                        </select>
                        <Link
                            href={
                                selectedServer
                                    ? `/ploi/servers/${selectedServer}/sites/create`
                                    : '#'
                            }
                            className={`rounded px-6 py-2 text-white ${
                                selectedServer
                                    ? 'bg-blue-600 hover:bg-blue-700'
                                    : 'cursor-not-allowed bg-gray-400'
                            }`}
                        >
                            Site Aanmaken
                        </Link>
                    </div>
                </div>

                {/* Zoekbalk */}
                <div className="mb-6">
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Zoek sites..."
                        className="w-full rounded-md border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
                    />
                </div>

                {/* Sites lijst */}
                {sites.length > 0 ? (
                    <ul className="space-y-3">
                        {sites.map((site) => (
                            <Link
                                key={site.id}
                                href={`/ploi/servers/${site.server_id}/sites/${site.id}`}
                            >
                                <li className="rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md">
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
                                            {site.server_name && (
                                                <div className="mt-2 text-sm text-gray-500">
                                                    Server: {site.server_name}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </li>
                            </Link>
                        ))}
                    </ul>
                ) : (
                    <div className="rounded-lg bg-gray-50 p-8 text-center text-gray-600">
                        Geen sites gevonden
                    </div>
                )}

                {/* Paginatie */}
                {pagination.last_page > 1 && (
                    <div className="mt-6 flex items-center justify-center gap-2">
                        <button
                            onClick={() =>
                                handlePageChange(
                                    Number(pagination.current_page) - 1,
                                )
                            }
                            disabled={pagination.current_page === 1}
                            className="rounded-md bg-gray-200 px-4 py-2 disabled:opacity-50"
                        >
                            Vorige
                        </button>

                        <span className="px-4">
                            Pagina {pagination.current_page} van{' '}
                            {pagination.last_page}
                        </span>

                        <button
                            onClick={() =>
                                handlePageChange(
                                    Number(pagination.current_page) + 1,
                                )
                            }
                            disabled={
                                pagination.current_page === pagination.last_page
                            }
                            className="rounded-md bg-gray-200 px-4 py-2 disabled:opacity-50"
                        >
                            Volgende
                        </button>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
