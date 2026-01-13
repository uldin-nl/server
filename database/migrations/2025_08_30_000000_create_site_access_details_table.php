<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('site_access_details', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('server_id');
            $table->unsignedBigInteger('site_id')->unique();
            $table->string('server_host')->nullable();
            $table->string('server_ip')->nullable();
            $table->string('ssh_user')->nullable();
            $table->unsignedBigInteger('database_id')->nullable();
            $table->string('db_name')->nullable();
            $table->string('db_user')->nullable();
            $table->string('db_password')->nullable();
            $table->string('db_host')->nullable();
            $table->unsignedInteger('db_port')->nullable();
            $table->text('db_url')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('site_access_details');
    }
};
