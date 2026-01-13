import AppLayout from '@/layouts/app-layout';
import { Link } from '@inertiajs/react';

export type Server = {
    id: number;
    name: string;
    ip_address: string;
};

type Props = {
    servers: Server[];
};

export default function Servers({ servers }: Props) {
    return (
        <AppLayout>
            <div className="p-6">
                <h1 className="mb-6 text-2xl font-bold">Servers</h1>
                <ul className="space-y-3">
                    {servers.map((server) => (
                        <li
                            key={server.id}
                            className="rounded-lg border border-gray-200 bg-white p-4"
                        >
                            <div>
                                <Link
                                    href={`/ploi/servers/${server.id}`}
                                    className="block hover:text-blue-600"
                                >
                                    <div className="text-lg font-semibold">
                                        {server.name}
                                    </div>
                                    <div className="text-gray-600">
                                        {server.ip_address}
                                    </div>
                                </Link>

                                <Link
                                    href={`/ploi/servers/${server.id}/sites/create`}
                                    className="mt-4 block rounded-md bg-blue-600 px-4 py-2 text-center text-white hover:bg-blue-700"
                                >
                                    Nieuwe Site Toevoegen
                                </Link>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </AppLayout>
    );
}
