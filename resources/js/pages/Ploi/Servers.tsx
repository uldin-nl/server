import AppLayout from '@/layouts/app-layout';
import { Link, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';

export type Server = {
    id: number;
    name: string;
    ip_address: string;
};

export type Site = {
    id: number;
    name: string;
    domain: string;
    server_id: number; // Voeg dit toe
};

type Props = {
    servers: Server[];
    sites: Site[];
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

export default function Servers({
    servers,
    sites,
    pagination,
    filters,
}: Props) {
    const [search, setSearch] = useState(filters.search || '');

    useEffect(() => {
        const timeout = setTimeout(() => {
            router.get(
                '/ploi/servers',
                { search, page: 1 },
                { preserveState: true, preserveScroll: true },
            );
        }, 300);

        return () => clearTimeout(timeout);
    }, [search]);

    const handlePageChange = (page: number) => {
        router.get(
            '/ploi/servers',
            { search, page: page },
            { preserveState: true, preserveScroll: true },
        );
    };

    return (
        <AppLayout>
            <div className="p-6">
                <h1 className="mb-4 text-2xl font-bold">Servers</h1>
                <ul className="space-y-2">
                    {servers.map((server) => (
                        <li
                            key={server.id}
                            className="rounded-md bg-gray-100 p-4"
                        >
                            <div>
                                <Link
                                    href={`/ploi/servers/${server.id}`}
                                    className="block"
                                >
                                    <div className="font-semibold">
                                        {server.name}
                                    </div>
                                    <div>{server.ip_address}</div>
                                </Link>

                                <Link
                                    href={`/servers/${server.id}/sites/create`}
                                    className="mt-4 block rounded-md bg-blue-500 p-4 text-center text-white hover:bg-blue-600"
                                >
                                    Nieuwe Site Toevoegen
                                </Link>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
            <div className="p-6">
                <h1 className="mb-4 text-2xl font-bold">Sites</h1>

                {/* Zoekbalk */}
                <div className="mb-4">
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Zoek sites..."
                        className="w-full rounded-md border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
                    />
                </div>

                {/* Sites lijst */}
                <ul className="space-y-2">
                    {sites.map((site) => (
                        <Link
                            key={site.id}
                            href={`/ploi/servers/${site.server_id}/sites/${site.id}`}
                        >
                            <li className="rounded-md bg-gray-100 p-4 hover:bg-gray-200">
                                <div className="font-semibold">{site.name}</div>
                                <div>{site.domain}</div>
                            </li>
                        </Link>
                    ))}
                </ul>

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
