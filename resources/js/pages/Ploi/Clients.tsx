import AppLayout from '@/layouts/app-layout';
import { Link, router } from '@inertiajs/react';
import { useState } from 'react';

type Client = {
    id: number;
    name: string;
    root: string;
    server_id: number;
    server_name: string;
    created_at: string;
};

type Server = {
    id: number;
    name: string;
};

type Props = {
    clients: Client[];
    servers: Server[];
};

export default function Clients({ clients, servers }: Props) {
    const [selectedServer, setSelectedServer] = useState<number | null>(null);
    const [newClientName, setNewClientName] = useState('');
    const [showCreateForm, setShowCreateForm] = useState(false);

    const handleCreateClient = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedServer || !newClientName) return;

        router.post(`/ploi/servers/${selectedServer}/system-users`, {
            name: newClientName,
        });

        setNewClientName('');
        setShowCreateForm(false);
    };

    return (
        <AppLayout>
            <div className="p-6">
                <h1 className="mb-6 text-2xl font-bold">Klanten</h1>

                {/* Nieuwe Klant Toevoegen */}
                <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4">
                    <h3 className="mb-3 font-semibold text-green-900">
                        Nieuwe Klant Toevoegen
                    </h3>

                    {!showCreateForm ? (
                        <button
                            onClick={() => setShowCreateForm(true)}
                            className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700"
                        >
                            Klant Aanmaken
                        </button>
                    ) : (
                        <form onSubmit={handleCreateClient} className="space-y-3">
                            <div>
                                <label className="mb-1 block text-sm font-medium">
                                    Server
                                </label>
                                <select
                                    value={selectedServer ?? ''}
                                    onChange={(e) =>
                                        setSelectedServer(
                                            e.target.value
                                                ? Number(e.target.value)
                                                : null,
                                        )
                                    }
                                    className="w-full rounded border p-2"
                                    required
                                >
                                    <option value="">
                                        Selecteer een server...
                                    </option>
                                    {servers.map((server) => (
                                        <option key={server.id} value={server.id}>
                                            {server.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium">
                                    Klant Naam
                                </label>
                                <input
                                    type="text"
                                    value={newClientName}
                                    onChange={(e) =>
                                        setNewClientName(e.target.value)
                                    }
                                    className="w-full rounded border p-2"
                                    placeholder="bijv. bedrijfsnaam"
                                    required
                                />
                                <p className="mt-1 text-sm text-gray-600">
                                    Gebruik alleen kleine letters, cijfers en
                                    streepjes
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    type="submit"
                                    className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700"
                                >
                                    Aanmaken
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowCreateForm(false);
                                        setNewClientName('');
                                        setSelectedServer(null);
                                    }}
                                    className="rounded border border-gray-300 px-4 py-2 hover:bg-gray-50"
                                >
                                    Annuleren
                                </button>
                            </div>
                        </form>
                    )}
                </div>

                {/* Klanten Lijst */}
                {clients.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {clients.map((client) => (
                            <Link
                                key={`${client.server_id}-${client.id}`}
                                href={`/ploi/servers/${client.server_id}/clients/${client.id}`}
                            >
                                <div className="rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md">
                                    <h3 className="mb-2 text-lg font-semibold">
                                        {client.name}
                                    </h3>
                                    <div className="space-y-1 text-sm text-gray-600">
                                        <p>Server: {client.server_name}</p>
                                        <p className="text-xs text-gray-400">
                                            Aangemaakt:{' '}
                                            {new Date(
                                                client.created_at,
                                            ).toLocaleDateString('nl-NL')}
                                        </p>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="rounded-lg bg-gray-50 p-8 text-center text-gray-600">
                        Geen klanten gevonden. Maak een nieuwe klant aan om te
                        beginnen.
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
