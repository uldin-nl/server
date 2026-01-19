<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

class CreateUser extends Command
{
    protected $signature = 'user:create
                            {email? : The email address for the user}
                            {--name= : The name for the user}';

    protected $description = 'Create a new user with a random password';

    public function handle(): int
    {
        $email = $this->argument('email') ?? $this->ask('Email address');
        $name = $this->option('name') ?? $this->ask('Name', explode('@', $email)[0]);

        if (User::where('email', $email)->exists()) {
            $this->error("User with email {$email} already exists.");
            return Command::FAILURE;
        }

        $password = Str::random(16);

        $user = User::create([
            'name' => $name,
            'email' => $email,
            'password' => $password,
        ]);

        $this->info("User created successfully!");
        $this->table(
            ['ID', 'Name', 'Email', 'Password'],
            [[$user->id, $user->name, $user->email, $password]]
        );

        $this->warn("Save this password - it won't be shown again!");

        return Command::SUCCESS;
    }
}
