import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';

type Server = {
    id: number;
    name: string;
    ip_address?: string;
    status?: string;
    sites_count?: number;
    php_version?: string;
    mysql_version?: string;
};

type Site = {
    id: number;
    name?: string;
    domain?: string;
    status?: string;
    server_id?: number;
    server_name?: string;
    last_deploy_at?: string;
    created_at?: string;
};

type Props = {
    stats: {
        totalServers: number;
        activeServers: number;
        problemServers: number;
        problemSites: number;
        totalSites: number;
    };
    servers: Server[];
    recentSites: Site[];
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: dashboard().url,
    },
];

const formatDateTime = (value?: string) => {
    if (!value) {
        return 'N/A';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return 'N/A';
    }
    return date.toLocaleString('nl-NL');
};

const statusBadgeClass = (status?: string) => {
    const value = status?.toLowerCase();
    if (value === 'active') {
        return 'bg-green-100 text-green-800';
    }
    if (value === 'deploying') {
        return 'bg-blue-100 text-blue-800';
    }
    if (value === 'failed') {
        return 'bg-red-100 text-red-800';
    }
    if (value === 'pending') {
        return 'bg-yellow-100 text-yellow-800';
    }
    return 'bg-gray-100 text-gray-800';
};

export default function Dashboard({ stats, servers, recentSites }: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <div className="grid gap-4 md:grid-cols-4">
                    <div className="rounded-xl border border-gray-200 bg-white p-4">
                        <p className="text-sm text-gray-600">Servers</p>
                        <p className="text-2xl font-semibold">
                            {stats.totalServers}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                            Actief: {stats.activeServers}
                        </p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white p-4">
                        <p className="text-sm text-gray-600">Sites</p>
                        <p className="text-2xl font-semibold">
                            {stats.totalSites}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                            Over alle servers
                        </p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white p-4">
                        <p className="text-sm text-gray-600">
                            Sites met issues
                        </p>
                        <p className="text-2xl font-semibold">
                            {stats.problemSites}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                            Failed, error of pending
                        </p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white p-4">
                        <p className="text-sm text-gray-600">
                            Servers met issues
                        </p>
                        <p className="text-2xl font-semibold">
                            {stats.problemServers}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                            Status niet actief
                        </p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white p-4">
                        <p className="text-sm text-gray-600">Recent sites</p>
                        <p className="text-2xl font-semibold">
                            {recentSites.length}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                            Laatste updates
                        </p>
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                    <div className="rounded-xl border border-gray-200 bg-white p-4">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-lg font-semibold">
                                Servers overzicht
                            </h2>
                        </div>
                        {servers.length > 0 ? (
                            <div className="space-y-3">
                                {servers.map((server) => (
                                    <div
                                        key={server.id}
                                        className="rounded-lg border border-gray-100 bg-gray-50 p-3"
                                    >
                                        <div className="flex items-center justify-between gap-4">
                                            <div>
                                                <p className="font-semibold">
                                                    {server.name}
                                                </p>
                                                <p className="text-sm text-gray-600">
                                                    {server.ip_address ||
                                                        'Geen IP'}
                                                </p>
                                            </div>
                                            <span
                                                className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${statusBadgeClass(
                                                    server.status,
                                                )}`}
                                            >
                                                {server.status
                                                    ? server.status
                                                          .charAt(0)
                                                          .toUpperCase() +
                                                      server.status.slice(1)
                                                    : 'Onbekend'}
                                            </span>
                                        </div>
                                        <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-600">
                                            <div>
                                                Sites:{' '}
                                                {server.sites_count ?? 'N/A'}
                                            </div>
                                            <div>
                                                PHP:{' '}
                                                {server.php_version || 'N/A'}
                                            </div>
                                            <div>
                                                MySQL:{' '}
                                                {server.mysql_version || 'N/A'}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-600">
                                Geen servers gevonden.
                            </p>
                        )}
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white p-4">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-lg font-semibold">
                                Recente sites
                            </h2>
                        </div>
                        {recentSites.length > 0 ? (
                            <div className="space-y-3">
                                {recentSites.map((site) => (
                                    <div
                                        key={`${site.server_id}-${site.id}`}
                                        className="rounded-lg border border-gray-100 bg-gray-50 p-3"
                                    >
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="min-w-0">
                                                <p className="truncate font-semibold">
                                                    {site.name ||
                                                        site.domain ||
                                                        'Onbekende site'}
                                                </p>
                                                <p className="text-sm text-gray-600">
                                                    {site.server_name ||
                                                        'Onbekende server'}
                                                </p>
                                            </div>
                                            <span
                                                className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${statusBadgeClass(
                                                    site.status,
                                                )}`}
                                            >
                                                {site.status
                                                    ? site.status
                                                          .charAt(0)
                                                          .toUpperCase() +
                                                      site.status.slice(1)
                                                    : 'Onbekend'}
                                            </span>
                                        </div>
                                        <div className="mt-2 text-xs text-gray-600">
                                            Laatste deploy:{' '}
                                            {formatDateTime(
                                                site.last_deploy_at ||
                                                    site.created_at,
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-600">
                                Geen recente sites gevonden.
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
