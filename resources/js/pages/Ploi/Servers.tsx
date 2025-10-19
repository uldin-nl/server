import AppLayout from '@/layouts/app-layout';
import { Link } from '@inertiajs/react';

export type Server = {
    id: number;
    name: string;
    ip_address: string;
};

export type Site = {
    id: number;
    name: string;
    domain: string;
};

type Props = {
    servers: Server[];
    sites: Site[];
};

export default function Servers({ servers, sites }: Props) {
    return (
        <AppLayout>
            <div className="p-6">
                <h1 className="mb-4 text-2xl font-bold">Servers</h1>
                <ul className="space-y-2">
                    {servers.map((server) => (
                        <Link
                            key={server.id}
                            href={`/ploi/servers/${server.id}`}
                        >
                            <li className="rounded-md bg-gray-100 p-4">
                                <div className="font-semibold">
                                    {server.name}
                                </div>
                                <div>{server.ip_address}</div>
                            </li>
                        </Link>
                    ))}
                </ul>
            </div>
            <div className="p-6">
                <h1 className="mb-4 text-2xl font-bold">Sites</h1>
                <ul className="space-y-2">
                    {sites.map((site) => (
                        <li
                            key={site.id}
                            className="rounded-md bg-gray-100 p-4"
                        >
                            <div className="font-semibold">{site.name}</div>
                            <div>{site.domain}</div>
                        </li>
                    ))}
                </ul>
            </div>
        </AppLayout>
    );
}
