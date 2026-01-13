<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SiteAccessDetail extends Model
{
    protected $fillable = [
        'server_id',
        'site_id',
        'server_host',
        'server_ip',
        'ssh_user',
        'database_id',
        'db_name',
        'db_user',
        'db_password',
        'db_host',
        'db_port',
        'db_url',
    ];
}
