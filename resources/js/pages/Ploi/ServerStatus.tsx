import AppLayout from '@/layouts/app-layout';
import { useState } from 'react';

export type Server = {
    id: number;
    name: string;
    ip_address: string;
    status?: string;
    sites_count?: number;
    php_version?: string;
    mysql_version?: string;
};

export type Log = {
    id: number;
    description: string;
    content: string;
    created_at: string;
};

type Props = {
    server: Server;
    logs: Log[];
};

export default function ServerDetail({ server, logs }: Props) {
    const [visibleLogs, setVisibleLogs] = useState<number[]>([]);

    const toggleLogVisibility = (logId: number) => {
        setVisibleLogs((prev) =>
            prev.includes(logId)
                ? prev.filter((id) => id !== logId)
                : [...prev, logId],
        );
    };

    return (
        <AppLayout>
            <div className="p-6">
                <h1 className="mb-4 text-2xl font-bold">Server Detail</h1>

                {/* Server Info Card */}
                <div className="rounded-md bg-gray-100 p-4 dark:bg-gray-800">
                    <div className="mb-2 text-lg font-semibold">
                        {server.status}
                    </div>
                    <div className="font-semibold">{server.name}</div>
                    <div>{server.ip_address}</div>
                    {server.sites_count !== undefined && (
                        <div className="mt-2">
                            Sites Count: {server.sites_count}
                        </div>
                    )}
                    {server.php_version && (
                        <div>PHP Version: {server.php_version}</div>
                    )}
                    {server.mysql_version && (
                        <div>MySQL Version: {server.mysql_version}</div>
                    )}
                </div>

                <div className="mt-6">
                    <h2 className="mb-4 text-xl font-bold">Server Logs</h2>
                    {logs.length > 0 ? (
                        <div className="space-y-2 transition-all duration-300 ease-in-out">
                            {logs.map((log) => (
                                <div
                                    key={log.id}
                                    className="rounded-md bg-gray-50 p-4 shadow-sm dark:bg-gray-800"
                                >
                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                        {new Date(
                                            log.created_at,
                                        ).toLocaleString()}
                                    </div>
                                    <div className="mt-1 text-gray-900 dark:text-gray-100">
                                        {log.description}
                                    </div>
                                    <div
                                        onClick={() =>
                                            toggleLogVisibility(log.id)
                                        }
                                        className="cursor-pointer text-blue-500 hover:text-blue-600"
                                    >
                                        {visibleLogs.includes(log.id)
                                            ? 'Hide log details'
                                            : 'Show log details'}
                                    </div>
                                    <div
                                        className={`mt-2 overflow-hidden whitespace-pre-wrap text-gray-700 transition-all duration-300 dark:text-gray-300 ${
                                            visibleLogs.includes(log.id)
                                                ? 'max-h-96 opacity-100'
                                                : 'max-h-0 opacity-0'
                                        }`}
                                    >
                                        {log.content}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-gray-500 dark:text-gray-400">
                            No logs available.
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
